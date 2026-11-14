"""Single read-only 60 s BSB-LAN JSON poll.

One /JQ request reads the room temperatures C1/C2, the DHW temperature
(8740, 8770, 8830) and the DHW electric heater state (8821), except those the
BSB-LAN MQTT log already publishes at least every minute. Results feed the
caches read by ``temperatures_json.temperature_value`` and
``ecs_heater_json.heater_state``.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval

from .bsb_http import entry_client
from .bsb_logging import FAST, is_covered
from .const import DOMAIN
from .ecs_heater_json import HEATER_PARAMETER, parse_heater_response
from .temperatures_json import _TEMPERATURES, parse_temperatures_response

_LOGGER = logging.getLogger(__name__)
_INTERVAL = timedelta(seconds=60)
POLL_PARAMETERS = (*_TEMPERATURES, HEATER_PARAMETER)


async def async_start_json_polling(hass: HomeAssistant, entry: ConfigEntry):
    """Start the combined read-only poll; return an unload callback."""
    client = entry_client(hass, entry)
    if client is None:
        return lambda: None

    data = hass.data.setdefault(DOMAIN, {})
    temperatures = data.setdefault("temperatures_json", {})
    heater = data.setdefault("ecs_heater_json", {})
    polled = data.setdefault("json_polled", {})
    temperatures[entry.entry_id] = {}
    heater[entry.entry_id] = None
    polled[entry.entry_id] = frozenset(POLL_PARAMETERS)
    running = asyncio.Lock()
    active = True

    async def refresh() -> None:
        if not active or running.locked():
            return
        async with running:
            wanted = tuple(p for p in POLL_PARAMETERS if not is_covered(hass, entry, p, FAST))
            polled[entry.entry_id] = frozenset(wanted)
            payload: dict = {}
            if wanted:
                try:
                    payload = await client.get_jq(wanted)
                except Exception as err:  # noqa: BLE001 - keep previous entities usable
                    _LOGGER.warning("Lecture JSON BSB-LAN %s impossible : %r", wanted, err)
            if not active:
                return
            temperatures[entry.entry_id] = parse_temperatures_response(payload)
            heater[entry.entry_id] = parse_heater_response(payload)
            async_dispatcher_send(hass, f"{DOMAIN}_temperatures_{entry.entry_id}")
            async_dispatcher_send(hass, f"{DOMAIN}_ecs_heater_{entry.entry_id}")
            monitor = entry.runtime_data
            if monitor is not None:
                await monitor.async_update()

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
        temperatures.pop(entry.entry_id, None)
        heater.pop(entry.entry_id, None)
        polled.pop(entry.entry_id, None)

    return stop
