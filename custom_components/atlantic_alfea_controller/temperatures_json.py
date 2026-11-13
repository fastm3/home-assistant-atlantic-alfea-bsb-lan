"""Read-only periodic refresh of room and DHW temperatures via BSB-LAN JSON.

The MQTT publication of 8770 can remain frozen at its startup value on some
BSB-LAN configurations.  These three temperatures are also used by the climate
entities and the monitoring cards, so refresh them directly from the JSON API.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval

from .const import DOMAIN
from .regime_api import valid_base_url

_LOGGER = logging.getLogger(__name__)
_INTERVAL = timedelta(seconds=60)
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


async def async_start_temperature_polling(hass: HomeAssistant, entry: ConfigEntry):
    """Start read-only polling; return an unload callback."""
    url = str(entry.options.get("bsb_base_url", "")).strip()
    if not valid_base_url(url):
        return lambda: None

    base = url.rstrip("/")
    cache = hass.data.setdefault(DOMAIN, {}).setdefault("temperatures_json", {})
    cache[entry.entry_id] = {}
    session = async_get_clientsession(hass)
    lock = asyncio.Lock()
    active = True

    async def refresh() -> None:
        if not active or lock.locked():
            return
        async with lock:
            values: dict[int, float] = {}
            try:
                async with asyncio.timeout(8):
                    async with session.get(
                        f"{base}/JQ={','.join(str(p) for p in _TEMPERATURES)}"
                    ) as response:
                        response.raise_for_status()
                        data = await response.json(content_type=None)
                values = parse_temperatures_response(data)
            except Exception as err:
                _LOGGER.warning("Lecture JSON BSB-LAN températures impossible : %s", err)
            if not active:
                return
            cache[entry.entry_id] = values
            async_dispatcher_send(hass, f"{DOMAIN}_temperatures_{entry.entry_id}")

    @callback
    def on_interval(_now) -> None:
        hass.async_create_task(refresh())

    unsubscribe = async_track_time_interval(hass, on_interval, _INTERVAL)
    first_task = hass.async_create_task(refresh())

    def stop() -> None:
        nonlocal active
        active = False
        unsubscribe()
        first_task.cancel()
        cache.pop(entry.entry_id, None)

    return stop
