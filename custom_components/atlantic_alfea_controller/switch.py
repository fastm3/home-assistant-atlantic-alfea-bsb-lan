"""Simulated temporary setpoint overrides for Atlantic Alfea BSB-LAN."""

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .helpers import (
    async_set_numeric_entity,
    source_entity,
    state_float,
    state_value,
    status_uses_reduced_setpoint,
)

_SETPOINT = {1: ("heat_setpoint_c1", 710), 2: ("heat_setpoint_c2", 1010)}
_REDUCED_SETPOINT = {1: ("heat_reduced_setpoint_c1", 712), 2: ("heat_reduced_setpoint_c2", 1012)}
_STATUS = {1: ("heat_state_c1", 8000), 2: ("heat_state_c2", 8001)}
_DURATION = {1: ("override_duration_c1", 10990), 2: ("override_duration_c2", 10992)}
_DEFAULT_DURATION_HOURS = 2.0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the simulated override switches."""
    async_add_entities(
        [AlfeaSimulationOverrideSwitch(hass, entry, 1), AlfeaSimulationOverrideSwitch(hass, entry, 2)]
    )


class AlfeaSimulationOverrideSwitch(SwitchEntity):
    """Temporarily change a circuit setpoint and restore it later.

    BSB-LAN exposes the native override direction but reports it as read-only
    on some controllers.  This switch implements the same user-facing behaviour
    in Home Assistant: capture the programmed comfort setpoint when enabled,
    leave the climate/card free to change it, then write the original value back
    after the configured duration.
    """

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_icon = "mdi:timer-sync-outline"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, circuit: int) -> None:
        self.hass = hass
        self._entry = entry
        self._circuit = circuit
        self._attr_name = f"C{circuit} - Simulation dérogation"
        self._attr_unique_id = f"{entry.entry_id}_simulation_override_c{circuit}"
        self._attr_is_on = False
        self._original: float | None = None
        self._original_entity: str | None = None
        self._restore_at: datetime | None = None
        self._unsub = None
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Atlantic Alfea BSB-LAN",
            manufacturer="Atlantic",
            model="Alfea via BSB-LAN",
        )

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "consigne_originale": self._original,
            "duree_heures": self._duration_hours(),
            "restauration": self._restore_at.isoformat() if self._restore_at else None,
        }

    def _setpoint_entity(self) -> str | None:
        key, parameter = _STATUS[self._circuit]
        status = state_value(self.hass, source_entity(self.hass, self._entry, key, parameter))
        if status_uses_reduced_setpoint(status):
            key, parameter = _REDUCED_SETPOINT[self._circuit]
        else:
            key, parameter = _SETPOINT[self._circuit]
        return source_entity(self.hass, self._entry, key, parameter)

    def _duration_entity(self) -> str | None:
        key, parameter = _DURATION[self._circuit]
        return source_entity(self.hass, self._entry, key, parameter)

    def _duration_hours(self) -> float:
        entity = self._duration_entity()
        value = state_float(self.hass, entity) if entity else None
        return value if value and value > 0 else _DEFAULT_DURATION_HOURS

    async def async_turn_on(self, **kwargs) -> None:
        entity = self._setpoint_entity()
        value = state_float(self.hass, entity) if entity else None
        if entity is None or value is None:
            raise HomeAssistantError("Consigne confort indisponible : simulation impossible")
        self._original = value
        self._original_entity = entity
        self._restore_at = dt_util.utcnow() + timedelta(hours=self._duration_hours())
        if self._unsub:
            self._unsub()
        self._unsub = async_track_point_in_time(self.hass, self._restore, self._restore_at)
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        await self._restore()

    async def _restore(self, now: datetime | None = None) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None
        original = self._original
        entity = self._original_entity
        self._original = None
        self._original_entity = None
        self._restore_at = None
        if original is not None and entity:
                try:
                    await async_set_numeric_entity(self.hass, entity, original)
                except Exception:  # noqa: BLE001 - keep the switch usable
                    pass
        self._attr_is_on = False
        self.async_write_ha_state()

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None
