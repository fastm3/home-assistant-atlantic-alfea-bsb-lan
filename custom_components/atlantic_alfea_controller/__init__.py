"""Atlantic Alfea BSB-LAN integration."""

from __future__ import annotations

from pathlib import Path
import asyncio
import logging

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.mqtt import async_subscribe
from homeassistant.const import EVENT_COMPONENT_LOADED
from homeassistant.helpers.event import async_call_later, async_track_time_change
from homeassistant.helpers.start import async_at_started
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .json_poller import async_start_json_polling
from .fault_history_json import async_start_fault_history
from .clock import async_start_clock_polling
from .const import DOMAIN, PLATFORMS
from .discovery import discover_mapping
from .runtime import AlfeaRuntimeMonitor
from .polling import async_start_data_polling
from .bsb_logging import async_start_log_watch
from .mqtt_ecs import async_setup_ecs_discovery
from .weekly_programs import (
    WEEKDAYS,
    WRITABLE_PROGRAMS,
    WeeklyProgramImporter,
    async_write_program_days,
)
import voluptuous as vol
from homeassistant.core import ServiceCall, ServiceResponse, SupportsResponse
import homeassistant.helpers.config_validation as cv

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Expose the bundled Lovelace cards through Home Assistant HTTP.

    - pac-synoptique-photo-card.js + its images (pac_synoptique/<jeu>/*.webp);
      it replaces the former pac-synoptique-card (retired in 2.0.0).
    - pac-programmes-card.js.

    The integration ships its static assets in HACS.  This registers only
    GET endpoints; it never modifies dashboards, resources, or PAC commands.
    """
    www = Path(__file__).resolve().parent / "www"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                "/alfea-synoptique/pac-synoptique-photo-card.js",
                str(www / "pac-synoptique-photo-card.js"),
                False,
            ),
            # images versionnées par ?v= dans la carte : cache navigateur autorisé
            StaticPathConfig("/alfea-synoptique/pac_synoptique", str(www / "pac_synoptique"), True),
            StaticPathConfig(
                "/alfea-synoptique/pac-programmes-card.js",
                str(Path(__file__).resolve().parent / "www" / "pac-programmes-card.js"),
                False,
            ),
        ]
    )

    slot_schema = vol.Schema({vol.Required("debut"): cv.string, vol.Required("fin"): cv.string})
    schema = vol.Schema({
        vol.Required("program"): vol.In(WRITABLE_PROGRAMS),
        vol.Required("days"): vol.All(cv.ensure_list, [vol.In(list(WEEKDAYS))]),
        vol.Required("slots"): vol.All(cv.ensure_list, [slot_schema], vol.Length(max=3)),
        vol.Optional("config_entry_id"): cv.string,
    })

    async def _set_weekly_program(call: ServiceCall) -> ServiceResponse:
        importers = hass.data.get(DOMAIN, {}).get("weekly_programs", {})
        entry_id = call.data.get("config_entry_id") or (next(iter(importers)) if len(importers) == 1 else None)
        importer = importers.get(entry_id) if entry_id else None
        if importer is None:
            raise HomeAssistantError("Intégration introuvable (préciser config_entry_id si plusieurs).")
        days = {day: call.data["slots"] for day in call.data["days"]}
        try:
            results = await async_write_program_days(importer, call.data["program"], days)
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err
        return {"program": call.data["program"], "results": results}

    hass.services.async_register(
        DOMAIN, "set_weekly_program", _set_weekly_program, schema=schema,
        supports_response=SupportsResponse.OPTIONAL,
    )
    return True


def _remove_obsolete_energy_entities(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove annual/history snapshots that were previously exposed as live energy."""
    registry = er.async_get(hass)
    for key in ("energy_heating", "energy_dhw", "energy_cooling"):
        unique_id = f"{entry.entry_id}_{key}"
        entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
        if entity_id is not None:
            registry.async_remove(entity_id)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate earlier entries and enrich them through automatic discovery."""
    data = dict(entry.data)
    # V1.2 now uses the single full date/time parameter 0.
    for legacy_key in ("clock_time", "clock_day_month", "clock_year", "compressor_min_run_enforcement", "compressor_power", "energy_heating", "energy_dhw", "energy_cooling"):
        data.pop(legacy_key, None)
    discovered = discover_mapping(hass, data)
    data.update(discovered.mapping)
    replacements = {
        "number.temp_consigne_confort_etage": "number.atlantic_alfea_bsb_lan_c1_consigne_confort_710",
        "number.temp_consigne_confort_rdc": "number.atlantic_alfea_bsb_lan_c2_consigne_confort_1010",
        "number.esp_bsblan_consigne_confort_refroidissement_etage": "number.atlantic_alfea_bsb_lan_c2_consigne_rafraichissement_confort_1202",
        "select.esp_bsblan_c2_mode_rafraichissement_1201": "select.atlantic_alfea_bsb_lan_c2_mode_rafraichissement_1201",
    }
    for key, value in list(data.items()):
        replacement = replacements.get(value)
        if replacement and hass.states.get(replacement) is not None:
            data[key] = replacement

    _remove_obsolete_energy_entities(hass, entry)
    if entry.version < 14 or data != dict(entry.data) or entry.title != "Atlantic Alfea BSB-LAN":
        hass.config_entries.async_update_entry(
            entry,
            title="Atlantic Alfea BSB-LAN",
            data=data,
            version=14,
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Atlantic Alfea BSB-LAN from a config entry."""
    data = dict(entry.data)
    for legacy_key in ("clock_time", "clock_day_month", "clock_year", "compressor_min_run_enforcement", "compressor_power", "energy_heating", "energy_dhw", "energy_cooling"):
        data.pop(legacy_key, None)
    discovered = discover_mapping(hass, data)
    data.update(discovered.mapping)
    _remove_obsolete_energy_entities(hass, entry)
    if data != dict(entry.data) or entry.title != "Atlantic Alfea BSB-LAN":
        hass.config_entries.async_update_entry(
            entry,
            title="Atlantic Alfea BSB-LAN",
            data=data,
        )

    # Listen to BSB-LAN's read-only MQTT pump status messages, even if no HA
    # MQTT-discovery sensor exists for these newly logged parameters.
    feedback = hass.data.setdefault(DOMAIN, {}).setdefault("pump_feedback", {})
    feedback[entry.entry_id] = {}
    def _clear_pump_feedback() -> None:
        feedback.pop(entry.entry_id, None)

    entry.async_on_unload(_clear_pump_feedback)

    pump_handlers = []
    for circuit, parameter in ((1, 9031), (2, 8760)):
        def _handle_pump(message, *, _circuit=circuit):
            payload = message.payload
            if isinstance(payload, bytes):
                payload = payload.decode("utf-8", errors="replace")
            payload = str(payload).strip().lower()
            if payload in ("1", "on", "true", "activé") or payload.startswith("1 -"):
                on = True
            elif payload in ("0", "off", "false", "désactivé") or payload.startswith("0 -"):
                on = False
            else:
                return
            # MQTT callbacks can run off the HA event-loop thread. Schedule
            # both the cache update and dispatcher signal onto the HA loop.
            @callback
            def _notify_on_loop() -> None:
                current = feedback.get(entry.entry_id)
                if current is None:
                    return  # Integration unloaded between callback and dispatch.
                current[_circuit] = on
                async_dispatcher_send(hass, f"{DOMAIN}_pump_feedback_{entry.entry_id}")

            hass.add_job(_notify_on_loop)

        pump_handlers.append((f"BSB-LAN/+/+/{parameter}/status", _handle_pump))

    # Q3 command (8820): like pump feedback, this can be published on MQTT
    # without creating a Home Assistant entity via MQTT discovery.
    v3v_feedback = hass.data.setdefault(DOMAIN, {}).setdefault("v3v_feedback", {})
    v3v_feedback[entry.entry_id] = None
    entry.async_on_unload(lambda: v3v_feedback.pop(entry.entry_id, None))

    def _handle_v3v(message) -> None:
        payload = message.payload
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8", errors="replace")
        value = str(payload).strip().lower()
        if value in ("1", "on", "true", "activé") or value.startswith("1 -"):
            commanded_ecs = True
        elif value in ("0", "off", "false", "désactivé") or value.startswith("0 -"):
            commanded_ecs = False
        else:
            return

        @callback
        def _notify_on_loop() -> None:
            if entry.entry_id not in v3v_feedback:
                return
            v3v_feedback[entry.entry_id] = commanded_ecs
            async_dispatcher_send(hass, f"{DOMAIN}_v3v_feedback_{entry.entry_id}")

        hass.add_job(_notify_on_loop)

    # MQTT peut ne pas être prêt lors du démarrage de HA. L'abonnement
    # n'est pas une condition pour charger l'intégration ni les programmes.
    # Réessayer quand le composant MQTT termine son initialisation.
    mqtt_topics = [
        *pump_handlers,
        ("BSB-LAN/+/+/8820/status", _handle_v3v),
    ]
    mqtt_lock = asyncio.Lock()
    mqtt_subscribed = False
    mqtt_unsubscribers = []

    async def _subscribe_feedback() -> None:
        nonlocal mqtt_subscribed
        async with mqtt_lock:
            if mqtt_subscribed or "mqtt" not in hass.data:
                return
            subscriptions = []
            try:
                for topic, handler in mqtt_topics:
                    subscriptions.append(
                        await async_subscribe(hass, topic, handler, qos=0)
                    )
            except HomeAssistantError as err:
                for unsubscribe in subscriptions:
                    unsubscribe()
                _LOGGER.warning(
                    "Abonnements MQTT BSB-LAN reportés : %s", err
                )
                return
            mqtt_unsubscribers.extend(subscriptions)
            mqtt_subscribed = True

    def _mqtt_component_loaded(event) -> None:
        if event.data.get("component") == "mqtt":
            hass.async_create_task(_subscribe_feedback())

    unsubscribe_event = hass.bus.async_listen(
        EVENT_COMPONENT_LOADED, _mqtt_component_loaded
    )
    entry.async_on_unload(unsubscribe_event)

    def _clear_mqtt_subscriptions() -> None:
        for unsubscribe in mqtt_unsubscribers:
            unsubscribe()
        mqtt_unsubscribers.clear()

    entry.async_on_unload(_clear_mqtt_subscriptions)
    await _subscribe_feedback()

    # Import des programmes, indépendant des 40 publications MQTT : automatiquement une
    # minute après le démarrage de HA, puis chaque jour à 04:00, et à la demande (bouton).
    programs = hass.data.setdefault(DOMAIN, {}).setdefault("weekly_programs", {})
    importer = WeeklyProgramImporter(
        hass, entry.entry_id, entry.options.get("bsb_base_url", "")
    )
    programs[entry.entry_id] = importer
    def _clear_weekly_programs() -> None:
        programs.pop(entry.entry_id, None)

    entry.async_on_unload(_clear_weekly_programs)

    async def _auto_import_programs(reason: str) -> None:
        if not importer.configured:
            return
        try:
            errors = await importer.async_refresh_all()
        except Exception as err:  # noqa: BLE001 - BSB-LAN injoignable : non bloquant
            _LOGGER.warning("Import automatique des programmes (%s) impossible : %s", reason, err)
            return
        if errors:
            _LOGGER.warning("Import automatique des programmes (%s) partiel : %s", reason, errors)
        else:
            _LOGGER.debug("Programmes natifs importés (%s)", reason)

    @callback
    def _startup_import(_now) -> None:
        hass.async_create_task(_auto_import_programs("démarrage"))

    @callback
    def _daily_import(_now) -> None:
        hass.async_create_task(_auto_import_programs("quotidien"))

    @callback
    def _schedule_startup_import(_hass) -> None:
        entry.async_on_unload(async_call_later(hass, 60, _startup_import))

    # Une minute après la fin du démarrage de HA (ou après le chargement si HA tourne déjà).
    entry.async_on_unload(async_at_started(hass, _schedule_startup_import))
    entry.async_on_unload(async_track_time_change(hass, _daily_import, hour=4, minute=0, second=0))

    monitor = AlfeaRuntimeMonitor(hass, entry)
    entry.runtime_data = monitor
    await monitor.async_start()
    entry.async_on_unload(async_start_clock_polling(hass))
    entry.async_on_unload(await async_start_log_watch(hass, entry))
    entry.async_on_unload(async_start_data_polling(hass, entry))
    entry.async_on_unload(await async_setup_ecs_discovery(hass, entry))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(await async_start_json_polling(hass, entry))
    entry.async_on_unload(await async_start_fault_history(hass, entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded and isinstance(entry.runtime_data, AlfeaRuntimeMonitor):
        await entry.runtime_data.async_stop()
    return unloaded
