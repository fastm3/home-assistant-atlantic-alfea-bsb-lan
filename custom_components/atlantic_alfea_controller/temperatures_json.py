"""Room and DHW temperatures read directly from the BSB-LAN JSON API.

The MQTT publication of 8770 can remain frozen at its startup value on some
BSB-LAN configurations.  These three temperatures are also used by the climate
entities and the monitoring cards, so they are refreshed by ``json_poller``.
"""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_TEMPERATURES = (8740, 8770, 8830)


def parse_temperatures_response(data: object) -> dict[int, float]:
    """Extract only successful TEMP values from a BSB-LAN JSON response."""
    values: dict[int, float] = {}
    if not isinstance(data, dict):
        return values
    for parameter in _TEMPERATURES:
        item = data.get(str(parameter))
        if not isinstance(item, dict):
            continue
        if str(item.get("error")) != "0" or item.get("dataType_name") != "TEMP":
            continue
        try:
            values[parameter] = float(str(item["value"]).replace(",", "."))
        except (KeyError, TypeError, ValueError):
            continue
    return values


def temperature_value(
    hass: HomeAssistant, entry: ConfigEntry, parameter: int
) -> float | None:
    """Return the latest JSON temperature for one parameter, if available."""
    return (
        hass.data.get(DOMAIN, {})
        .get("temperatures_json", {})
        .get(entry.entry_id, {})
        .get(parameter)
    )
