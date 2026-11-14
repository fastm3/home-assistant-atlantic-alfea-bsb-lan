"""Periodic read-only BSB-LAN refresh requests (``BSB-LAN/poll``).

Each parameter the integration reads has a target period (see
``bsb_logging.POLL_TARGETS``). A parameter is only polled here when the
BSB-LAN MQTT log list does not already publish it often enough and when the
JSON poller does not already read it, so the bus never reads a value twice.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import timedelta
import logging
import time

from homeassistant.components.mqtt import async_publish
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_time_interval

from .const import BSB_REFRESH_INITIAL_DELAY_SECONDS, CLOCK_POLL_TOPIC, DOMAIN

_LOGGER = logging.getLogger(__name__)
_TICK = timedelta(seconds=30)
_EARLY_SECONDS = 5  # a parameter due within the next few seconds is polled now


async def async_poll_parameters(hass: HomeAssistant, parameters: tuple[int, ...]) -> None:
    """Ask BSB-LAN to republish selected read-only parameters through MQTT."""
    for parameter in parameters:
        try:
            await async_publish(
                hass,
                CLOCK_POLL_TOPIC,
                str(parameter),
                qos=0,
                retain=False,
            )
        except Exception:  # MQTT availability must never break the integration.
            _LOGGER.exception("Impossible de demander le poll BSB-LAN du paramètre %s", parameter)
        # Avoid sending a burst of bus requests at exactly the same instant.
        await asyncio.sleep(0.15)


def json_polled(hass: HomeAssistant, entry: ConfigEntry) -> frozenset[int]:
    """Parameters currently read by the JSON poller for this entry."""
    return frozenset(hass.data.get(DOMAIN, {}).get("json_polled", {}).get(entry.entry_id, ()))


def due_parameters(
    plan: dict[int, int], last: dict[int, float], now: float
) -> tuple[int, ...]:
    """Parameters whose period has elapsed (never polled ones first)."""
    due = [p for p, period in plan.items() if now - last.get(p, float("-inf")) >= period - _EARLY_SECONDS]
    return tuple(sorted(due, key=lambda p: last.get(p, float("-inf"))))


def async_start_data_polling(hass: HomeAssistant, entry: ConfigEntry) -> Callable[[], None]:
    """Poll what the BSB-LAN log does not cover, each at its own period."""
    from .bsb_logging import planned_parameters

    last: dict[int, float] = {}
    running = asyncio.Lock()

    async def _run() -> None:
        if running.locked():
            return
        async with running:
            plan = planned_parameters(hass, entry, json_polled(hass, entry))
            hass.data.setdefault(DOMAIN, {}).setdefault("poll_plan", {})[entry.entry_id] = plan
            now = time.monotonic()
            due = due_parameters(plan, last, now)
            for parameter in due:
                last[parameter] = now
            if due:
                await async_poll_parameters(hass, due)

    @callback
    def _tick(_now) -> None:
        hass.async_create_task(_run())

    unsubs: list[Callable[[], None]] = [
        async_call_later(hass, BSB_REFRESH_INITIAL_DELAY_SECONDS, _tick),
        async_track_time_interval(hass, _tick, _TICK),
    ]

    @callback
    def _unsubscribe() -> None:
        for unsub in unsubs:
            unsub()
        hass.data.get(DOMAIN, {}).get("poll_plan", {}).pop(entry.entry_id, None)

    return _unsubscribe
