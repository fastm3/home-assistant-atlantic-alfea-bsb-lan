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
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.util import dt as dt_util

from .bsb_http import entry_client
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
_REFRESH = timedelta(hours=6)
_RETRY = timedelta(minutes=2)   # lecture en échec (BSB-LAN occupé ou injoignable) : nouvel essai rapide
CONFIG_PARAMETERS: Final = (5710, 5711, 5715, 5716, 5731, 720, 1020, 741, 1041)
CIRCUITS: Final = {1: (5710, 5711, 720, 741), 2: (5715, 5716, 1020, 1041)}
# Loi d'eau complète (carte « Loi d'eau ») : lue avec la configuration, toutes les 6 h,
# pour ne pas dépendre du journal MQTT de BSB-LAN.
CURVE_FIELDS: Final = {
    "pente": (720, 1020), "decalage": (721, 1021), "bascule_ete_hiver": (730, 1030),
    "t_depart_min": (740, 1040), "t_depart_max": (741, 1041), "influence_ambiance": (750, 1050),
}
CURVE_PARAMETERS: Final = tuple(sorted({p for pair in CURVE_FIELDS.values() for p in pair} - set(CONFIG_PARAMETERS)))
# 1620 « libération ECS » : le programme horaire ECS (561…567) n'est suivi qu'en valeur 2 ou 4
ECS_RELEASE: Final = 1620
ECS_RELEASE_LABELS: Final = {
    0: "24 h/24 (programme ECS non utilisé)",
    1: "programmes des circuits de chauffage",
    2: "programme ECS",
    3: "heures creuses",
    4: "programme ECS ou heures creuses",
}
READ_PARAMETERS: Final = CONFIG_PARAMETERS + CURVE_PARAMETERS + (ECS_RELEASE,)

# Heating curve slopes: underfloor heating is flat, radiators are steep.
SLOPE_FLOOR_MAX: Final = 0.6
SLOPE_RADIATOR_MIN: Final = 0.8
# Used only when the slope is in between.
TMAX_FLOOR_MAX: Final = 40.0

FLOOR: Final = "plancher"
RADIATOR: Final = "radiateur"
NONE: Final = "aucun"
AUTO: Final = "auto"
# réglages de l'intégration (options) : corrigent la détection, repris par toutes les cartes
OPT_ECS: Final = "installation_ecs"              # auto / oui / non
OPT_EMITTERS: Final = "installation_emetteurs"   # auto / une des configurations dessinables
OPT_COOLING: Final = "installation_rafraichissement"  # auto / circuits équipés du rafraîchissement
COOLING_CHOICES: Final[dict[str, frozenset[int]]] = {
    "aucun": frozenset(), "c1": frozenset({1}), "c2": frozenset({2}), "c1_c2": frozenset({1, 2}),
}
COOLING_LABELS: Final[dict[str, str]] = {
    "aucun": "Sans rafraîchissement",
    "c1": "Rafraîchissement sur C1 seulement",
    "c2": "Rafraîchissement sur C2 seulement",
    "c1_c2": "Rafraîchissement sur C1 et C2",
}
# configurations que le synoptique sait dessiner (une zone radiateurs, une zone plancher)
COMBOS: Final[dict[str, tuple[str, str]]] = {
    "c1_radiateur_c2_plancher": (RADIATOR, FLOOR),
    "c1_plancher_c2_radiateur": (FLOOR, RADIATOR),
    "c1_radiateur": (RADIATOR, NONE),
    "c1_plancher": (FLOOR, NONE),
    "c2_radiateur": (NONE, RADIATOR),
    "c2_plancher": (NONE, FLOOR),
}
COMBO_LABELS: Final[dict[str, str]] = {
    "c1_radiateur_c2_plancher": "C1 radiateurs + C2 plancher chauffant",
    "c1_plancher_c2_radiateur": "C1 plancher chauffant + C2 radiateurs",
    "c1_radiateur": "C1 radiateurs seul",
    "c1_plancher": "C1 plancher chauffant seul",
    "c2_radiateur": "C2 radiateurs seul",
    "c2_plancher": "C2 plancher chauffant seul",
}


def combo_of(e1: str | None, e2: str | None) -> str:
    """Clé de configuration dessinable, ou « non_representable »."""
    pair = (e1 or NONE, e2 or NONE)
    for key, value in COMBOS.items():
        if value == pair:
            return key
    return "non_representable"


def _number(data: dict, parameter: int) -> float | None:
    item = data.get(str(parameter))
    if not isinstance(item, dict) or str(item.get("error")) != "0":
        return None
    try:
        return float(str(item.get("value")).replace(",", "."))
    except (TypeError, ValueError):
        return None


HIGH: Final = "haute"
MEDIUM: Final = "moyenne"
UNKNOWN: Final = "inconnue"


def classify_emitter(cooling: float | None, slope: float | None, tmax: float | None) -> tuple[str | None, str, str]:
    """Guess the emitter of a heating circuit; return (type, reason, confidence)."""
    if cooling is not None and cooling != 0:
        return FLOOR, "rafraîchissement actif sur le circuit", HIGH
    if slope is not None:
        if slope <= SLOPE_FLOOR_MAX:
            return FLOOR, f"pente de loi d'eau faible ({slope:g})", HIGH
        if slope >= SLOPE_RADIATOR_MIN:
            return RADIATOR, f"pente de loi d'eau forte ({slope:g})", HIGH
    if tmax is not None:
        if tmax <= TMAX_FLOOR_MAX:
            return FLOOR, f"départ maximal bas ({tmax:g} °C)", MEDIUM
        return RADIATOR, f"départ maximal élevé ({tmax:g} °C)", MEDIUM
    return None, "réglages du circuit illisibles", UNKNOWN


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
            emitter, reason, confidence = None, "circuit désactivé (%s = 0)" % p_on, HIGH
        elif present is None:
            emitter, reason, confidence = None, "présence du circuit illisible (%s)" % p_on, UNKNOWN
        else:
            emitter, reason, confidence = classify_emitter(values[p_cool], values[p_slope], values[p_tmax])
        result[f"circuit_{n}_emetteur"] = emitter
        result[f"circuit_{n}_raison"] = reason
        result[f"circuit_{n}_confiance"] = confidence
        result[f"circuit_{n}_pente"] = values[p_slope]
        result[f"circuit_{n}_t_depart_max"] = values[p_tmax]
        result[f"circuit_{n}_rafraichissement"] = None if values[p_cool] is None else values[p_cool] != 0
    q3 = values[5731]
    result["ecs_presente"] = None if q3 is None else q3 != 0
    result["ecs_confiance"] = UNKNOWN if q3 is None else HIGH
    result["parametres"] = {str(p): v for p, v in values.items()}
    curves = {}
    for n in (1, 2):
        if result[f"circuit_{n}_present"] is False:
            continue
        curve = {field: _number(data, pair[n - 1]) for field, pair in CURVE_FIELDS.items()}
        if curve["pente"] is not None:
            curves[str(n)] = curve
    result["loi_d_eau"] = curves
    release = _number(data, ECS_RELEASE)
    code = None if release is None else int(release)
    result["ecs_liberation_code"] = code
    result["ecs_liberation"] = None if code is None else ECS_RELEASE_LABELS.get(code, f"valeur {code}")
    result["ecs_programme_utilise"] = None if code is None else code in (2, 4)
    # réponse brute du régulateur (nom, valeur, libellé) : à joindre pour corriger la détection
    brut = {}
    for p in READ_PARAMETERS:
        item = data.get(str(p))
        if isinstance(item, dict):
            brut[str(p)] = {k: item.get(k) for k in ("name", "value", "desc", "unit", "error")}
    result["brut"] = brut
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


def uncertain(layout: dict) -> list[str]:
    """Parts of the layout that were not detected with high confidence."""
    out = [f"circuit {n}" for n in (1, 2) if layout.get(f"circuit_{n}_confiance") != HIGH]
    if layout.get("ecs_confiance") != HIGH:
        out.append("ECS")
    return out


def details(layout: dict) -> str:
    """One line per element, for the log."""
    parts = []
    for n in (1, 2):
        parts.append(
            f"C{n}: {layout.get(f'circuit_{n}_emetteur') or 'absent'} ({layout.get(f'circuit_{n}_raison')}, "
            f"confiance {layout.get(f'circuit_{n}_confiance')} ; pente={layout.get(f'circuit_{n}_pente')}, "
            f"départ max={layout.get(f'circuit_{n}_t_depart_max')}, "
            f"rafraîchissement={layout.get(f'circuit_{n}_rafraichissement')})"
        )
    q3 = (layout.get("brut") or {}).get("5731") or {}
    ecs = layout.get("ecs_presente")
    parts.append(f"ECS: {'oui' if ecs else 'non' if ecs is False else '?'} (5731 = {q3.get('value')} {q3.get('desc') or ''})")
    return " | ".join(parts)


DIAGNOSTICS_HINT: Final = (
    "Si elle est fausse : Paramètres > Appareils et services > Atlantic Alfea BSB-LAN > ⋮ > "
    "Télécharger les diagnostics, puis joindre le fichier à un ticket GitHub (le type d'émetteur "
    "peut être corrigé dans la carte en attendant)."
)


def overrides(options) -> dict:
    """Réglages explicites de l'intégration (sans les valeurs « auto »)."""
    out = {}
    ecs = (options or {}).get(OPT_ECS, AUTO)
    if ecs in ("oui", "non"):
        out["ecs"] = ecs == "oui"
    combo = (options or {}).get(OPT_EMITTERS, AUTO)
    if combo in COMBOS:
        out[1], out[2] = COMBOS[combo]
    cooling = (options or {}).get(OPT_COOLING, AUTO)
    if cooling in COOLING_CHOICES:
        out["froid"] = COOLING_CHOICES[cooling]
    return out


def effective_layout(detected: dict | None, options) -> dict | None:
    """Détection corrigée par les réglages de l'intégration ; source de chaque valeur indiquée."""
    forced = overrides(options)
    if not detected and not forced:
        return None
    layout = dict(detected or {})
    for n in (1, 2):
        layout[f"circuit_{n}_emetteur_detecte"] = (detected or {}).get(f"circuit_{n}_emetteur")
        if n in forced:
            v = forced[n]
            layout[f"circuit_{n}_present"] = v != NONE
            layout[f"circuit_{n}_emetteur"] = None if v == NONE else v
            layout[f"circuit_{n}_source"] = "réglage de l'intégration"
        else:
            layout[f"circuit_{n}_source"] = "détection" if detected else "inconnue"
    layout["configuration"] = combo_of(layout.get("circuit_1_emetteur") if layout.get("circuit_1_present") is not False else None,
                                       layout.get("circuit_2_emetteur") if layout.get("circuit_2_present") is not False else None)
    layout["ecs_detectee"] = (detected or {}).get("ecs_presente")
    if "ecs" in forced:
        layout["ecs_presente"] = forced["ecs"]
        layout["ecs_source"] = "réglage de l'intégration"
    else:
        layout["ecs_source"] = "détection" if detected else "inconnue"
    # rafraîchissement par circuit (5711 / 5716), corrigeable ; jamais sur un circuit absent
    cooling = forced.get("froid")
    for n in (1, 2):
        key = f"circuit_{n}_rafraichissement"
        layout[f"{key}_detecte"] = (detected or {}).get(key)
        if cooling is not None:
            layout[key] = n in cooling and layout.get(f"circuit_{n}_present") is not False
            layout[f"{key}_source"] = "réglage de l'intégration"
        else:
            if layout.get(f"circuit_{n}_present") is False:
                layout[key] = False
            layout[f"{key}_source"] = "détection" if detected else "inconnue"
    layout["rafraichissement"] = sorted(cooling_circuits(layout))
    return layout


def cooling_circuits(layout: dict | None) -> set[int] | None:
    """Circuits that may cool; None while the installation is unknown (everything allowed).

    A circuit whose cooling could not be read stays allowed: only an explicit
    « no cooling » (5711/5716 = 0, absent circuit or integration setting) removes it.
    """
    if not layout:
        return None
    return {n for n in (1, 2)
            if layout.get(f"circuit_{n}_present") is not False
            and layout.get(f"circuit_{n}_rafraichissement") is not False}


def cooling_allowed(hass: HomeAssistant, entry: ConfigEntry) -> set[int] | None:
    return cooling_circuits(installation_layout(hass, entry))


COOLING_REFUSED: Final = (
    "Pas de rafraîchissement sur le circuit {circuit} (paramètre {parameter} de la PAC ou "
    "réglage « Installation — rafraîchissement » de l'intégration)."
)


@callback
def async_sync_cooling_visibility(hass: HomeAssistant, entry: ConfigEntry, entity_id: str | None,
                                  circuit: int) -> None:
    """Hide (registry, hidden_by=integration) a cooling-only entity of a circuit without cooling.

    Only entities hidden by the integration are shown again; a user choice is never changed.
    Nothing is done while the installation is unknown.
    """
    allowed = cooling_allowed(hass, entry)
    if allowed is None or not entity_id:
        return
    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    current = registry.async_get(entity_id)
    if current is None:
        return
    hide = circuit not in allowed
    if hide and current.hidden_by is None:
        registry.async_update_entity(entity_id, hidden_by=er.RegistryEntryHider.INTEGRATION)
    elif not hide and current.hidden_by == er.RegistryEntryHider.INTEGRATION:
        registry.async_update_entity(entity_id, hidden_by=None)


def installation_signal(entry: ConfigEntry) -> str:
    return f"{DOMAIN}_installation_{entry.entry_id}"


def installation_layout(hass: HomeAssistant, entry: ConfigEntry, effective: bool = True) -> dict | None:
    detected = hass.data.get(DOMAIN, {}).get("installation_config", {}).get(entry.entry_id)
    return effective_layout(detected, entry.options) if effective else detected


async def async_start_installation_watch(hass: HomeAssistant, entry: ConfigEntry):
    """Read the layout now and every 6 h; return an unload callback."""
    store = hass.data.setdefault(DOMAIN, {}).setdefault("installation_config", {})
    client = entry_client(hass, entry)
    if client is None:
        store.pop(entry.entry_id, None)
        return lambda: None

    retry_cancel = None

    def schedule_retry() -> None:
        nonlocal retry_cancel
        if retry_cancel is None:
            retry_cancel = async_call_later(hass, _RETRY, on_retry)

    @callback
    def on_retry(_now) -> None:
        nonlocal retry_cancel
        retry_cancel = None
        hass.async_create_task(refresh())

    async def refresh() -> None:
        try:
            layout = parse_installation(await client.get_jq(READ_PARAMETERS, timeout=30))
        except Exception as err:  # noqa: BLE001 - keep the previous knowledge
            _LOGGER.warning("Lecture de la configuration de l'installation impossible : %r", err)
            schedule_retry()
            return
        if layout is None:
            _LOGGER.warning("Configuration de l'installation illisible (paramètres %s)", CONFIG_PARAMETERS)
            schedule_retry()
            return
        previous = store.get(entry.entry_id)
        store[entry.entry_id] = layout
        if previous is None or summary(previous) != summary(layout):
            _LOGGER.info("Configuration de l'installation : %s — %s", summary(layout), details(layout))
            forced = overrides(entry.options)
            doubt = [d for d in uncertain(layout)
                     if not (d == "ECS" and "ecs" in forced) and not (d.startswith("circuit ") and int(d[-1]) in forced)]
            if doubt:
                _LOGGER.warning(
                    "Détection de l'installation incertaine pour %s : %s. %s",
                    ", ".join(doubt), details(layout), DIAGNOSTICS_HINT,
                )
        async_dispatcher_send(hass, f"{DOMAIN}_installation_{entry.entry_id}")

    first = hass.async_create_task(refresh())

    @callback
    def on_interval(_now) -> None:
        hass.async_create_task(refresh())

    unsubscribe = async_track_time_interval(hass, on_interval, _REFRESH)

    def stop() -> None:
        unsubscribe()
        first.cancel()
        if retry_cancel is not None:
            retry_cancel()
        store.pop(entry.entry_id, None)

    return stop
