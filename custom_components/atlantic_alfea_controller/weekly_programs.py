"""Import and validated write of the PAC's native weekly TIMEPROG schedules.

BSB-LAN JSON /JQ queries do not consume any of the 40 MQTT log slots.
Writes (heating C1/C2 and DHW only) go through /JS one day at a time, each one
confirmed by a fresh /JQ readback; a mismatch restores the previous value.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
import re

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .bsb_http import get_client, valid_base_url

_LOGGER = logging.getLogger(__name__)
WEEKDAYS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
# Heating/ECS: Monday is the base. Depending on the BSB-LAN version / device
# parameter list, the following days are either consecutive (502-507) or decimal
# sub-parameters (501.1-501.6); the importer detects which one answers.
# Cooling: custom BSB-LAN parameters 11000-11006 / 11010-11016 are consecutive.
PROGRAMS = {
    "chauffage_c1": ("Chauffage C1", "mdi:calendar-clock", "501"),
    "chauffage_c2": ("Chauffage C2", "mdi:calendar-clock", "521"),
    "ecs": ("Eau chaude sanitaire", "mdi:calendar-clock", "561"),
    "rafraichissement_c1": ("Rafraîchissement C1", "mdi:snowflake-clock", "11000"),
    "rafraichissement_c2": ("Rafraîchissement C2", "mdi:snowflake-clock", "11010"),
}
_SLOT_RE = re.compile(r"(\d{2}:\d{2}|##:##)-(\d{2}:\d{2}|##:##)")


def parse_timeprog(value: str) -> list[dict[str, str]]:
    """Parse exactly three TIMEPROG slots; ##:##-##:## means unused."""
    slots = str(value).strip().split()
    if len(slots) != 3:
        raise ValueError(f"Trois plages TIMEPROG attendues : {value!r}")
    result: list[dict[str, str]] = []
    previous_end = -1
    for slot in slots:
        match = _SLOT_RE.fullmatch(slot)
        if match is None:
            raise ValueError(f"Plage TIMEPROG invalide : {slot!r}")
        start, end = match.groups()
        if start == end == "##:##":
            continue
        if "##:##" in (start, end):
            raise ValueError(f"Plage TIMEPROG partiellement vide : {slot!r}")
        def minutes(clock: str, *, is_end: bool = False) -> int:
            hour, minute = (int(part) for part in clock.split(":"))
            if minute > 59 or hour > 24 or (hour == 24 and (minute != 0 or not is_end)):
                raise ValueError(f"Heure TIMEPROG invalide : {clock!r}")
            return hour * 60 + minute
        start_min = minutes(start)
        end_min = minutes(end, is_end=True)
        if start_min >= end_min or start_min < previous_end:
            raise ValueError(f"Plages TIMEPROG chevauchantes ou inversées : {value!r}")
        previous_end = end_min
        result.append({"debut": start, "fin": end})
    return result


SCHEME_CONSECUTIVE = "consecutif"
SCHEME_DECIMAL = "decimal"


def parameter_for_day(key: str, base: str, index: int, scheme: str = SCHEME_CONSECUTIVE) -> str:
    """Return the exact BSB-LAN JSON parameter for a weekday (Monday = 0)."""
    if not 0 <= index < len(WEEKDAYS):
        raise ValueError(f"Jour invalide : {index}")
    if scheme == SCHEME_DECIMAL and index:
        return f"{base}.{index}"
    return str(int(base) + index)


def response_item(data, parameter: str):
    """Entry for ``parameter`` in a /JQ answer (keys may be written 502 or 502.0)."""
    if not isinstance(data, dict):
        return None
    if parameter in data:
        return data[parameter]
    try:
        wanted = float(parameter)
    except ValueError:
        return None
    for key, item in data.items():
        try:
            if float(key) == wanted:
                return item
        except (TypeError, ValueError):
            continue
    return None


def js_parameter(parameter: str):
    """/JS expects a number: 501 stays an int, 501.1 is sent as a float."""
    return float(parameter) if "." in parameter else int(parameter)


@dataclass
class ProgramSnapshot:
    """Last successful import and the most recent refresh status."""
    status: str = "Non chargé"
    updated: str | None = None
    error: str | None = None
    days: dict[str, list[dict[str, str]]] | None = None


class WeeklyProgramImporter:
    """Import five validated schedules only when the user presses Refresh."""

    def __init__(self, hass: HomeAssistant, entry_id: str, base_url: str) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.base_url = base_url.strip().rstrip("/")
        self.snapshots = {key: ProgramSnapshot() for key in PROGRAMS}
        self.schemes: dict[str, str] = {}
        self._lock = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return valid_base_url(self.base_url)

    def _notify(self) -> None:
        async_dispatcher_send(self.hass, f"{DOMAIN}_weekly_programs_{self.entry_id}")

    async def _read_day(self, client, parameter: str) -> list[dict[str, str]]:
        data = await client.get_jq(parameter, timeout=10)
        item = response_item(data, parameter)
        if not isinstance(item, dict) or str(item.get("error")) != "0":
            raise ValueError(f"Réponse BSB-LAN invalide pour {parameter}: {item!r}")
        if item.get("dataType_name") not in (None, "TIMEPROG"):
            raise ValueError(f"Type inattendu pour {parameter}: {item.get('dataType_name')}")
        value = item.get("value")
        if not isinstance(value, str):
            raise ValueError(f"Plages horaires absentes pour {parameter}")
        return parse_timeprog(value)

    async def _detect_scheme(self, client, key: str, base: str) -> str:
        """Find how this PAC numbers Tuesday-Sunday (cached per program)."""
        if key in self.schemes:
            return self.schemes[key]
        if key.startswith("rafraichissement_"):
            return SCHEME_CONSECUTIVE
        errors = []
        for scheme in (SCHEME_CONSECUTIVE, SCHEME_DECIMAL):
            try:
                await self._read_day(client, parameter_for_day(key, base, 1, scheme))
            except (ValueError, asyncio.TimeoutError, OSError) as err:
                errors.append(str(err))
                continue
            self.schemes[key] = scheme
            _LOGGER.debug("Programme %s : numérotation %s", key, scheme)
            return scheme
        raise ValueError(" ; ".join(errors))

    async def _day_parameter(self, client, key: str, base: str, index: int) -> str:
        if index == 0:
            return base
        return parameter_for_day(key, base, index, await self._detect_scheme(client, key, base))

    def _record_error(self, key, snapshot, err, errors) -> None:
        """Record a failure; cooling schedules are optional on some PACs."""
        if key.startswith("rafraichissement_"):
            snapshot.status = "Non disponible"
            snapshot.error = None
            snapshot.days = {}
            _LOGGER.info("Programme %s non disponible sur cette PAC : %s", key, err)
            return
        snapshot.status = "Erreur"
        snapshot.error = str(err)
        errors[key] = str(err)
        _LOGGER.warning("Import programme %s impossible : %s", key, err)

    async def async_refresh_all(self) -> dict[str, str]:
        """Read 35 days sequentially; commit each weekly program atomically."""
        if not self.configured:
            raise ValueError("Configurer l'adresse BSB-LAN JSON dans les options.")
        errors: dict[str, str] = {}
        async with self._lock:
            client = get_client(self.hass, self.base_url)
            for key, (_name, _icon, base) in PROGRAMS.items():
                snapshot = self.snapshots[key]
                days: dict[str, list[dict[str, str]]] = {}
                try:
                    for index, weekday in enumerate(WEEKDAYS):
                        parameter = await self._day_parameter(client, key, base, index)
                        days[weekday] = await self._read_day(client, parameter)
                except (ValueError, asyncio.TimeoutError, OSError) as err:
                    self._record_error(key, snapshot, err, errors)
                except Exception as err:
                    # aiohttp client errors are surfaced to HA, not silently ignored.
                    self._record_error(key, snapshot, err, errors)
                else:
                    snapshot.days = days
                    snapshot.updated = dt_util.now().isoformat(timespec="seconds")
                    snapshot.status = "Chargé"
                    snapshot.error = None
                self._notify()
        return errors


# ---------------------------------------------------------------------------
# Écriture des programmes (service set_weekly_program)
# ---------------------------------------------------------------------------
WRITABLE_PROGRAMS = ("chauffage_c1", "chauffage_c2", "ecs")
_CLOCK_RE = re.compile(r"^([01]\d|2[0-4]):([0-5]\d)$")
TIMEPROG_STEP_MINUTES = 10


def _clock_minutes(clock: str, *, is_end: bool) -> int:
    match = _CLOCK_RE.fullmatch(str(clock).strip())
    if match is None:
        raise ValueError(f"Heure invalide (HH:MM attendu) : {clock!r}")
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour == 24 and (minute != 0 or not is_end):
        raise ValueError(f"24:00 n'est autorisé qu'en fin de plage : {clock!r}")
    if minute % TIMEPROG_STEP_MINUTES:
        raise ValueError(f"Pas de {TIMEPROG_STEP_MINUTES} min requis : {clock!r}")
    return hour * 60 + minute


def normalize_slots(slots) -> list[dict[str, str]]:
    """Validate up to three ordered, non-overlapping slots; return canonical form."""
    if not isinstance(slots, (list, tuple)):
        raise ValueError("Liste de plages attendue")
    if len(slots) > 3:
        raise ValueError("Trois plages au maximum par jour (limite du régulateur)")
    result: list[dict[str, str]] = []
    previous_end = -1
    for slot in slots:
        if not isinstance(slot, dict):
            raise ValueError(f"Plage invalide : {slot!r}")
        start = str(slot.get("debut", "")).strip()
        end = str(slot.get("fin", "")).strip()
        start_min = _clock_minutes(start, is_end=False)
        end_min = _clock_minutes(end, is_end=True)
        if start_min >= end_min:
            raise ValueError(f"Plage inversée ou vide : {start}-{end}")
        if start_min < previous_end:
            raise ValueError(f"Plages chevauchantes ou non ordonnées : {start}-{end}")
        previous_end = end_min
        result.append({"debut": f"{start_min // 60:02d}:{start_min % 60:02d}",
                       "fin": f"{end_min // 60:02d}:{end_min % 60:02d}"})
    return result


def format_timeprog_write(slots: list[dict[str, str]]) -> str:
    """BSB-LAN write syntax: plages séparées par « _ », plages libres en xx:xx-xx:xx."""
    parts = [f"{slot['debut']}-{slot['fin']}" for slot in slots]
    parts += ["xx:xx-xx:xx"] * (3 - len(parts))
    return "_".join(parts)


async def _post_with_ack(client, parameter: str, value: str) -> None:
    payload = {"parameter": js_parameter(parameter), "value": value, "type": 1, "destination": 0}
    result = outcome = None
    for attempt in range(3):
        await asyncio.sleep(0.25 if attempt == 0 else 0.6)
        result = await client.post_js(payload)
        outcome = response_item(result, str(parameter))
        if isinstance(outcome, dict) and outcome.get("status") == 1:
            return
    raise ValueError(f"BSB-LAN n'a pas acquitté l'écriture de {parameter} : {result!r}")


async def async_write_program_days(importer: "WeeklyProgramImporter", key: str,
                                   days: dict[str, list[dict[str, str]]]) -> dict[str, str]:
    """Write several days of one program; stop at the first unconfirmed write."""
    if key not in WRITABLE_PROGRAMS:
        raise ValueError(f"Programme non modifiable : {key}")
    if not importer.configured:
        raise ValueError("Configurer l'adresse BSB-LAN JSON dans les options.")
    for day in days:
        if day not in WEEKDAYS:
            raise ValueError(f"Jour invalide : {day!r}")
    wanted = {day: normalize_slots(slots) for day, slots in days.items()}
    _name, _icon, base = PROGRAMS[key]
    results: dict[str, str] = {}
    async with importer._lock:
        client = get_client(importer.hass, importer.base_url)
        snapshot = importer.snapshots[key]
        for day, slots in wanted.items():
            parameter = await importer._day_parameter(client, key, base, WEEKDAYS.index(day))
            before = await importer._read_day(client, parameter)
            if before == slots:
                results[day] = "inchangé"
                continue
            await _post_with_ack(client, parameter, format_timeprog_write(slots))
            confirmed = None
            for _ in range(5):
                await asyncio.sleep(0.5)
                confirmed = await importer._read_day(client, parameter)
                if confirmed == slots:
                    break
            if confirmed != slots:
                # Relecture différente : on tente de remettre la valeur d'origine.
                try:
                    await _post_with_ack(client, parameter, format_timeprog_write(before))
                    restored = await importer._read_day(client, parameter)
                except Exception as err:  # noqa: BLE001 - rapporté à l'utilisateur
                    restored = f"échec : {err}"
                _LOGGER.error("Programme %s %s : relu %s au lieu de %s (restauration : %s)",
                              key, day, confirmed, slots, restored)
                raise ValueError(
                    f"{day} : écriture non confirmée (relu {confirmed}, attendu {slots}) ; "
                    f"valeur d'origine restaurée : {restored}. Jours déjà écrits : {results}"
                )
            results[day] = "écrit et vérifié"
            if snapshot.days is not None:
                # Nouveau dict (pas de modification en place) : sinon HA compare l'ancien et le
                # nouvel état comme identiques et n'envoie pas la mise à jour à l'interface.
                snapshot.days = {**snapshot.days, day: [dict(slot) for slot in slots]}
                snapshot.updated = dt_util.now().isoformat(timespec="seconds")
            importer._notify()
    return results
