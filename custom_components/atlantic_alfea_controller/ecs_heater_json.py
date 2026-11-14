"""Read-only ECS electric heater status (8821) via BSB-LAN JSON.

The value is refreshed by the combined ``json_poller`` request.
"""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .bsb_http import valid_base_url
from .const import DOMAIN

HEATER_PARAMETER = 8821


def parse_heater_response(data: object) -> bool | None:
    """Accept only a successful 8821 ONOFF response with value 0 or 1."""
    item = data.get("8821") if isinstance(data, dict) else None
    if not isinstance(item, dict):
        return None
    if str(item.get("error")) != "0" or item.get("dataType_name") != "ONOFF":
        return None
    value = str(item.get("value", "")).strip()
    if value not in ("0", "1"):
        return None
    return value == "1"


def heater_state(hass: HomeAssistant, entry: ConfigEntry) -> bool | None:
    """Return the JSON state when 8821 is JSON-polled, else the MQTT source.

    8821 is not JSON-polled when the BSB-LAN MQTT log already publishes it.
    """
    data = hass.data.get(DOMAIN, {})
    if json_enabled(entry) and HEATER_PARAMETER in data.get("json_polled", {}).get(entry.entry_id, ()):
        return data.get("ecs_heater_json", {}).get(entry.entry_id)
    from .helpers import source_entity, state_is_on
    return state_is_on(hass, source_entity(hass, entry, "dhw_electric_heater", 8821))


def json_enabled(entry: ConfigEntry) -> bool:
    return valid_base_url(str(entry.options.get("bsb_base_url", "")).strip())
