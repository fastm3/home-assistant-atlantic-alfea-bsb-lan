"""Suggestions for the first installation (BSB-LAN address, weather, PAC power and energy meters).

Pure scoring functions work on plain tuples so they can be tested without Home Assistant;
the ``suggest_*`` helpers read the state machine. Nothing is ever written anywhere.
"""

from __future__ import annotations

import re
from typing import Final, Iterable

# mots qui désignent la ligne électrique de la PAC dans un identifiant ou un nom d'entité
PAC_WORDS: Final = ("pac", "pompe_a_chaleur", "pompe a chaleur", "pompe à chaleur", "heat_pump", "heatpump",
                    "heat pump", "alfea", "atlantic", "chauffage", "chaudiere", "chaudière")
NOT_PAC_WORDS: Final = ("ecs_", "c1_c2", "atlantic_alfea_bsb_lan", "bsb_lan", "solaire", "solar", "pv", "batterie",
                        "battery", "grid", "reseau", "linky", "maison", "house", "total", "voiture", "ev_")
WEATHER_HOME_WORDS: Final = ("home", "maison", "domicile", "forecast_home")
BSB_LAN_HOSTS: Final = ("http://bsb-lan.local", "http://bsb-lan")


def _word_hit(text: str, word: str) -> bool:
    if word == "pac":   # éviter « space », « capacity »…
        return re.search(r"(^|[^a-z])pac([^a-z]|$)", text) is not None
    return word in text


def meter_score(entity_id: str, name: str) -> int:
    """Higher = more likely the electrical meter of the whole heat-pump line."""
    text = f"{entity_id} {name}".lower()
    if any(w in text for w in NOT_PAC_WORDS):
        return 0
    return sum(3 if w in ("pac", "pompe_a_chaleur", "pompe à chaleur", "heat_pump", "heatpump") else 1
               for w in PAC_WORDS if _word_hit(text, w))


def best_meter(candidates: Iterable[tuple[str, str]]) -> str | None:
    """The single best-scored candidate (entity_id, name), or None when unclear (tie or no hint)."""
    scored = sorted(((meter_score(e, n), e) for e, n in candidates), reverse=True)
    if not scored or scored[0][0] == 0:
        return None
    if len(scored) > 1 and scored[1][0] == scored[0][0]:
        return None
    return scored[0][1]


def best_weather(candidates: Iterable[tuple[str, str]]) -> str | None:
    """Weather entity: one named « home/maison » first, else the first one (sorted)."""
    items = sorted(candidates)
    if not items:
        return None
    for entity_id, name in items:
        text = f"{entity_id} {name}".lower()
        if any(w in text for w in WEATHER_HOME_WORDS):
            return entity_id
    return items[0][0]


def _states(hass, domain: str):
    return [s for s in hass.states.async_all(domain) if s.state not in ("unavailable", "unknown")]


def suggest_weather(hass) -> str | None:
    return best_weather((s.entity_id, str(s.attributes.get("friendly_name", ""))) for s in _states(hass, "weather"))


def suggest_meter(hass, kind: str) -> str | None:
    """kind = "power" (W/kW) or "energy" (kWh/Wh/MWh, cumulative)."""
    units = {"power": ("W", "kW"), "energy": ("kWh", "Wh", "MWh")}[kind]
    out = []
    for s in _states(hass, "sensor"):
        a = s.attributes
        if a.get("device_class") != kind or a.get("unit_of_measurement") not in units:
            continue
        if kind == "energy" and a.get("state_class") not in ("total", "total_increasing"):
            continue
        out.append((s.entity_id, str(a.get("friendly_name", ""))))
    return best_meter(out)


async def async_probe_bsb_lan(hass, urls: Iterable[str] = BSB_LAN_HOSTS) -> str | None:
    """First address answering the BSB-LAN /JV endpoint (short timeout), else None."""
    from .bsb_http import get_client

    for url in urls:
        client = get_client(hass, url)
        if client is None:
            continue
        try:
            data = await client.get_path("/JV", timeout=3)
        except Exception:  # noqa: BLE001 - absent host, timeout, other device
            continue
        if isinstance(data, dict) and data.get("api_version"):
            return url
    return None
