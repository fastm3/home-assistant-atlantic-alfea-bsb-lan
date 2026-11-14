"""BSB-LAN logging configuration awareness (read-only).

BSB-LAN has a single logging interval for up to 40 parameters. At startup and
every few hours the integration reads ``/JI`` to learn which parameters are
already published on MQTT by that log list, and how often. The integration
then only polls (``BSB-LAN/poll`` or JSON) what the log does not already cover
at the required rate, so the BSB bus never reads the same value twice.

Nothing is ever written to BSB-LAN by this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
import logging
from typing import Final

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .bsb_http import entry_client
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
_REFRESH = timedelta(hours=6)
LOGGING_MODE_MQTT: Final = 4  # bit of /JI "loggingmode"
MAX_LOG_SLOTS: Final = 40

# Target refresh period (s) for every parameter the integration reads.
# Parameters missing on an installation are simply skipped by the planner
# (see ``planned_parameters``).
FAST: Final = 60
MEDIUM: Final = 300
SLOW: Final = 900
HOURLY: Final = 3600

POLL_TARGETS: Final[dict[int, int]] = {
    # States and outputs (drive the synoptic and the climate entities).
    8000: FAST, 8001: FAST, 8003: FAST, 8006: FAST, 8400: FAST,
    8820: FAST, 8821: FAST, 8760: FAST, 9031: FAST,
    # Circuit modes: also re-polled immediately after each write.
    700: FAST, 1000: FAST, 901: FAST, 1201: FAST, 1600: FAST,
    # Measurements.
    8410: FAST, 8412: FAST, 8413: FAST, 8700: FAST,
    8740: FAST, 8741: FAST, 8743: FAST,
    8770: FAST, 8771: FAST, 8773: FAST, 8830: FAST,
    # Slower diagnostics.
    8411: MEDIUM, 8744: MEDIUM, 8774: MEDIUM, 8703: MEDIUM, 8772: MEDIUM,
    701: MEDIUM, 1001: MEDIUM, 8004: MEDIUM, 8025: MEDIUM, 10062: MEDIUM,
    # Setpoints and counters: changed from HA (re-polled after the write) or rarely.
    710: SLOW, 712: SLOW, 902: SLOW, 903: SLOW,
    1010: SLOW, 1012: SLOW, 1202: SLOW, 1203: SLOW,
    1610: SLOW, 1612: SLOW, 3113: SLOW, 8450: SLOW, 8451: SLOW, 7073: SLOW,
    # Installation constants.
    2842: HOURLY, 2843: HOURLY, 7072: HOURLY, 5731: HOURLY,
}

# Always polled whatever the mapping says (MQTT listeners without entities).
ALWAYS_PLANNED: Final = frozenset({8760, 9031, 8743, 8773})

# Recommended BSB-LAN log list: everything the integration wants every minute.
RECOMMENDED_LOG_INTERVAL: Final = 60
RECOMMENDED_LOG: Final[tuple[int, ...]] = tuple(
    sorted(p for p, period in POLL_TARGETS.items() if period == FAST)
)

# Previous fixed MQTT poll lists, used only while /JI is unknown.
LEGACY_TARGETS: Final[dict[int, int]] = {
    8411: MEDIUM, 3113: SLOW, 8450: SLOW, 8451: SLOW,
    8741: FAST, 8771: FAST, 8830: FAST,
}


@dataclass(frozen=True)
class LogConfig:
    """BSB-LAN log configuration as read from /JI."""

    mqtt: bool
    interval: int
    parameters: frozenset[int]
    read_at: str = ""
    slots_used: int = 0
    raw_mode: int = 0
    extra: dict = field(default_factory=dict)

    def covers(self, parameter: int, max_period: int) -> bool:
        """True when MQTT logging already publishes it at least that often."""
        return (
            self.mqtt
            and self.interval > 0
            and self.interval <= max_period
            and parameter in self.parameters
        )


def parse_log_config(data: object) -> LogConfig | None:
    """Decode the logging part of a BSB-LAN /JI response (None if unusable)."""
    if not isinstance(data, dict):
        return None
    try:
        mode = int(data.get("loggingmode"))
        interval = int(data.get("loginterval"))
    except (TypeError, ValueError):
        return None
    logged = data.get("logged")
    if not isinstance(logged, list):
        return None
    parameters: set[int] = set()
    for item in logged:
        if not isinstance(item, dict):
            continue
        try:
            parameter = int(float(item.get("parameter")))
            destination = int(item.get("destination", -1))
        except (TypeError, ValueError):
            continue
        # -1 = default destination (the PAC); other bus devices are not ours.
        if parameter > 0 and destination in (-1, 0):
            parameters.add(parameter)
    return LogConfig(
        mqtt=bool(mode & LOGGING_MODE_MQTT),
        interval=interval,
        parameters=frozenset(parameters),
        read_at=dt_util.now().isoformat(timespec="seconds"),
        slots_used=len(logged),
        raw_mode=mode,
    )


def log_config(hass: HomeAssistant, entry: ConfigEntry) -> LogConfig | None:
    return hass.data.get(DOMAIN, {}).get("bsb_log", {}).get(entry.entry_id)


def is_covered(hass: HomeAssistant, entry: ConfigEntry, parameter: int, max_period: int) -> bool:
    config = log_config(hass, entry)
    return config is not None and config.covers(parameter, max_period)


def mapped_parameters(entry: ConfigEntry) -> set[int]:
    """BSB parameters that have a source entity on this installation."""
    from .parameters import SPEC_BY_KEY

    found = {spec.parameter for key, spec in SPEC_BY_KEY.items() if entry.data.get(key)}
    return found | set(ALWAYS_PLANNED)


def planned_parameters(
    hass: HomeAssistant, entry: ConfigEntry, json_polled: set[int] | frozenset[int] = frozenset()
) -> dict[int, int]:
    """Parameters the integration must poll itself, with their period (s)."""
    config = log_config(hass, entry)
    if config is None:
        return {p: s for p, s in LEGACY_TARGETS.items() if p not in json_polled}
    used = mapped_parameters(entry)
    return {
        parameter: period
        for parameter, period in POLL_TARGETS.items()
        if parameter in used
        and parameter not in json_polled
        and not config.covers(parameter, period)
    }


def log_report(hass: HomeAssistant, entry: ConfigEntry, json_polled: set[int]) -> dict:
    """Human readable comparison between the BSB-LAN log and our needs."""
    config = log_config(hass, entry)
    used = mapped_parameters(entry)
    if config is None:
        return {"lu": False, "liste_recommandee": list(RECOMMENDED_LOG),
                "intervalle_recommande_s": RECOMMENDED_LOG_INTERVAL}
    planned = planned_parameters(hass, entry, json_polled)
    fast_needed = [p for p in RECOMMENDED_LOG if p in used]
    return {
        "lu": True,
        "lu_le": config.read_at,
        "mqtt_actif": config.mqtt,
        "intervalle_s": config.interval,
        "emplacements_utilises": f"{config.slots_used}/{MAX_LOG_SLOTS}",
        "parametres_journalises": sorted(config.parameters),
        "couverts_par_journal": sorted(
            p for p in used if p in POLL_TARGETS and config.covers(p, POLL_TARGETS[p])
        ),
        "lus_en_json": sorted(json_polled),
        "interroges_par_integration": {str(p): s for p, s in sorted(planned.items())},
        "lectures_bus_par_minute": round(
            (len(config.parameters) * 60 / config.interval if config.mqtt and config.interval else 0)
            + sum(60 / s for s in planned.values())
            + len(json_polled), 1),
        "journalises_inutiles": sorted(p for p in config.parameters if p not in POLL_TARGETS),
        "recommandes_manquants": [p for p in fast_needed if p not in config.parameters],
        "liste_recommandee": fast_needed,
        "intervalle_recommande_s": RECOMMENDED_LOG_INTERVAL,
    }


async def async_start_log_watch(hass: HomeAssistant, entry: ConfigEntry):
    """Read /JI now and every 6 h; return an unload callback."""
    store = hass.data.setdefault(DOMAIN, {}).setdefault("bsb_log", {})
    client = entry_client(hass, entry)
    if client is None:
        store.pop(entry.entry_id, None)
        return lambda: None

    async def refresh() -> None:
        try:
            config = parse_log_config(await client.get_path("/JI", timeout=15))
        except Exception as err:  # noqa: BLE001 - keep the previous knowledge
            _LOGGER.warning("Lecture configuration BSB-LAN /JI impossible : %r", err)
            return
        if config is None:
            _LOGGER.warning("Réponse /JI BSB-LAN sans configuration de journalisation exploitable")
            return
        previous = store.get(entry.entry_id)
        store[entry.entry_id] = config
        if previous is None or previous.parameters != config.parameters or previous.interval != config.interval:
            _LOGGER.info(
                "Journal BSB-LAN : MQTT=%s, %s s, %s paramètres",
                config.mqtt, config.interval, len(config.parameters),
            )
        async_dispatcher_send(hass, f"{DOMAIN}_bsb_log_{entry.entry_id}")

    # Do not delay Home Assistant startup: until /JI is known the planner keeps
    # the previous fixed poll lists.
    first = hass.async_create_task(refresh())

    @callback
    def on_interval(_now) -> None:
        hass.async_create_task(refresh())

    unsubscribe = async_track_time_interval(hass, on_interval, _REFRESH)

    def stop() -> None:
        unsubscribe()
        first.cancel()
        store.pop(entry.entry_id, None)

    return stop
