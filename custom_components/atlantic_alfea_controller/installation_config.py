"""Installation layout detected from the BSB configuration (read-only).

At startup and every 6 h the integration reads, with one BSB-LAN ``/JQ``
request, the configuration parameters that describe the hydraulic layout:

* 5710 / 5715: heating circuit 1 / 2 present;
* 5711 / 5716: cooling on circuit 1 / 2;
* 5731: DHW actuating device Q3 (0 = no DHW);
* 720 / 1020: heating curve slope of circuit 1 / 2;
* 741 / 1041: flow temperature maximum of circuit 1 / 2.

The regulator does not know the emitter type of a circuit. It is guessed from
those settings (cooling only works with underfloor emitters here, underfloor
curves are flat), published as attributes of the « Installation -
Configuration » sensor, and the synoptic card can override it.

Nothing is ever written to BSB-LAN by this module.
"""

from __future__ import annotations

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
CONFIG_PARAMETERS: Final = (5710, 5711, 5715, 5716, 5731, 720, 1020, 741, 1041)
CIRCUITS: Final = {1: (5710, 5711, 720, 741), 2: (5715, 5716, 1020, 1041)}

# Heating curve slopes: underfloor heating is flat, radiators are steep.
SLOPE_FLOOR_MAX: Final = 0.6
SLOPE_RADIATOR_MIN: Final = 0.8
# Used only when the slope is in between.
TMAX_FLOOR_MAX: Final = 40.0

FLOOR: Final = "plancher"
RADIATOR: Final = "radiateur"


def _number(data: dict, parameter: int) -> float | None:
    item = data.get(str(parameter))
    if not isinstance(item, dict) or str(item.get("error")) != "0":
        return None
    try:
        return float(str(item.get("value")).replace(",", "."))
    except (TypeError, ValueError):
        return None


def classify_emitter(cooling: float | None, slope: float | None, tmax: float | None) -> tuple[str | None, str]:
    """Guess the emitter of a heating circuit; return (type, reason)."""
    if cooling is not None and cooling != 0:
        return FLOOR, "rafraîchissement actif sur le circuit"
    if slope is not None:
        if slope <= SLOPE_FLOOR_MAX:
            return FLOOR, f"pente de loi d'eau faible ({slope:g})"
        if slope >= SLOPE_RADIATOR_MIN:
            return RADIATOR, f"pente de loi d'eau forte ({slope:g})"
    if tmax is not None:
        if tmax <= TMAX_FLOOR_MAX:
            return FLOOR, f"départ maximal bas ({tmax:g} °C)"
        return RADIATOR, f"départ maximal élevé ({tmax:g} °C)"
    return None, "réglages du circuit illisibles"


def parse_installation(data: object) -> dict | None:
    """Decode a /JQ response into the installation layout (None if unusable)."""
    if not isinstance(data, dict):
        return None
    values = {p: _number(data, p) for p in CONFIG_PARAMETERS}
    if all(v is None for v in values.values()):
        return None
    result: dict = {}
    for n, (p_on, p_cool, p_slope, p_tmax) in CIRCUITS.items():
        present = values[p_on]
        result[f"circuit_{n}_present"] = None if present is None else present != 0
        if present == 0:
            emitter, reason = None, "circuit désactivé (%s = 0)" % p_on
        else:
            emitter, reason = classify_emitter(values[p_cool], values[p_slope], values[p_tmax])
        result[f"circuit_{n}_emetteur"] = emitter
        result[f"circuit_{n}_raison"] = reason
        result[f"circuit_{n}_pente"] = values[p_slope]
        result[f"circuit_{n}_t_depart_max"] = values[p_tmax]
        result[f"circuit_{n}_rafraichissement"] = None if values[p_cool] is None else values[p_cool] != 0
    q3 = values[5731]
    result["ecs_presente"] = None if q3 is None else q3 != 0
    result["parametres"] = {str(p): v for p, v in values.items()}
    result["lu_le"] = dt_util.now().isoformat(timespec="seconds")
    return result


def summary(layout: dict | None) -> str:
    """Short state text, e.g. « C1 radiateur · C2 plancher · ECS »."""
    if not layout:
        return "Non lue"
    parts = []
    for n in (1, 2):
        if layout.get(f"circuit_{n}_present") is False:
            continue
        parts.append(f"C{n} {layout.get(f'circuit_{n}_emetteur') or '?'}")
    if layout.get("ecs_presente"):
        parts.append("ECS")
    elif layout.get("ecs_presente") is False:
        parts.append("sans ECS")
    return " · ".join(parts) or "Aucun circuit"


def installation_layout(hass: HomeAssistant, entry: ConfigEntry) -> dict | None:
    return hass.data.get(DOMAIN, {}).get("installation_config", {}).get(entry.entry_id)


async def async_start_installation_watch(hass: HomeAssistant, entry: ConfigEntry):
    """Read the layout now and every 6 h; return an unload callback."""
    store = hass.data.setdefault(DOMAIN, {}).setdefault("installation_config", {})
    client = entry_client(hass, entry)
    if client is None:
        store.pop(entry.entry_id, None)
        return lambda: None

    async def refresh() -> None:
        try:
            layout = parse_installation(await client.get_jq(CONFIG_PARAMETERS, timeout=20))
        except Exception as err:  # noqa: BLE001 - keep the previous knowledge
            _LOGGER.warning("Lecture de la configuration de l'installation impossible : %r", err)
            return
        if layout is None:
            _LOGGER.warning("Configuration de l'installation illisible (paramètres %s)", CONFIG_PARAMETERS)
            return
        previous = store.get(entry.entry_id)
        store[entry.entry_id] = layout
        if previous is None or summary(previous) != summary(layout):
            _LOGGER.info("Configuration de l'installation : %s", summary(layout))
        async_dispatcher_send(hass, f"{DOMAIN}_installation_{entry.entry_id}")

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
