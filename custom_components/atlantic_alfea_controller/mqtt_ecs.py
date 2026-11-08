"""MQTT discovery for the writable BSB-LAN entities owned by the integration.

The integration stays MQTT-based: it publishes retained discovery configs so
Home Assistant creates the ECS entities (1600/1610/1612) and the circuit
setpoints (710/712/1010/1012/1202/1203 + select 1201).  BSB-LAN remains the
MQTT source of truth; these definitions no longer need to live in the user's
``bsb-lan.yaml``.
"""

from __future__ import annotations

import json
import logging

from homeassistant.components.mqtt import async_publish
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

_DISCOVERY_PREFIX = "homeassistant"
_ECS_NODE = "atlantic_alfea_ecs"
_CIRCUIT_NODE = "atlantic_alfea_circuits"
_COMMAND_TOPIC = "BSB-LAN"
_AVAILABILITY_TOPIC = "BSB-LAN/status"


def _device(entry: ConfigEntry) -> dict:
    return {
        "identifiers": [f"{DOMAIN}_{entry.entry_id}"],
        "name": "Atlantic Alféa BSB-LAN",
        "manufacturer": "Atlantic",
        "model": "Alféa Extensa Duo",
    }


def _mode_config(entry: ConfigEntry) -> dict:
    return {
        "name": "ECS - Mode (1600)",
        "unique_id": f"{entry.entry_id}_ecs_mode_1600",
        "object_id": "ecs_mode_1600",
        "state_topic": "BSB-LAN/0/13/1600/status",
        "command_topic": _COMMAND_TOPIC,
        "command_template": "S1600={{ value.split(' ')[0] }}",
        "value_template": "{{ {'0 - Arrêt':'0 - Off','1 - Marche':'1 - On','2 - Eco':'2 - Eco'}.get(value, value) }}",
        "options": ["0 - Off", "1 - On", "2 - Eco"],
        "availability_topic": _AVAILABILITY_TOPIC,
        "payload_available": "online",
        "payload_not_available": "offline",
        "device": _device(entry),
    }


def _number_config(
    entry: ConfigEntry,
    parameter: int,
    name: str,
    key: str,
    minimum: float,
    maximum: float = 65,
    step: float = 1,
    category: int = 13,
    prefix: str = "ecs",
) -> dict:
    return {
        "name": name,
        "unique_id": f"{entry.entry_id}_{prefix}_{key}_{parameter}",
        "object_id": f"{prefix}_{key}_{parameter}",
        "state_topic": f"BSB-LAN/0/{category}/{parameter}/status",
        "command_topic": _COMMAND_TOPIC,
        "command_template": f"S{parameter}={{{{ value }}}}",
        "min": minimum,
        "max": maximum,
        "step": step,
        "mode": "box",
        "unit_of_measurement": "°C",
        "device_class": "temperature",
        "availability_topic": _AVAILABILITY_TOPIC,
        "payload_available": "online",
        "payload_not_available": "offline",
        "device": _device(entry),
    }


def _mode_1201_config(entry: ConfigEntry) -> dict:
    return {
        "name": "C2 - Mode rafraîchissement (1201)",
        "unique_id": f"{entry.entry_id}_circuit_c2_mode_1201",
        "object_id": "circuit_c2_mode_1201",
        "state_topic": "BSB-LAN/0/11/1201/status",
        "command_topic": _COMMAND_TOPIC,
        "value_template": (
            "{% set mapping = {'0':'Protection','1':'Automatique','2':'Réduit','3':'Confort'} %}"
            "{{ mapping.get(value.split()[0], value) }}"
        ),
        "command_template": (
            "{% set mapping = {'Protection':'0','Automatique':'1','Réduit':'2','Confort':'3'} %}"
            "S1201={{ mapping[value] }}"
        ),
        "options": ["Protection", "Automatique", "Réduit", "Confort"],
        "availability_topic": _AVAILABILITY_TOPIC,
        "payload_available": "online",
        "payload_not_available": "offline",
        "device": _device(entry),
    }


_CIRCUIT_NUMBERS = {
    "c1_confort_710": (710, "C1 - Consigne confort (710)", 8, 5, 30),
    "c1_reduit_712": (712, "C1 - Consigne réduite (712)", 8, 5, 30),
    "c2_confort_1010": (1010, "C2 - Consigne confort (1010)", 10, 5, 30),
    "c2_reduit_1012": (1012, "C2 - Consigne réduite (1012)", 10, 5, 30),
    "c2_froid_confort_1202": (1202, "C2 - Consigne rafraîchissement confort (1202)", 11, 18, 28),
    "c2_froid_reduit_1203": (1203, "C2 - Consigne rafraîchissement réduite (1203)", 11, 18, 28),
}


async def async_setup_ecs_discovery(hass: HomeAssistant, entry: ConfigEntry):
    """Publish retained MQTT discovery configs and return the cleanup callback."""
    topics: dict[str, str] = {
        f"{_DISCOVERY_PREFIX}/select/{_ECS_NODE}/ecs_mode_1600/config": "mode",
        f"{_DISCOVERY_PREFIX}/number/{_ECS_NODE}/ecs_confort_1610/config": "comfort",
        f"{_DISCOVERY_PREFIX}/number/{_ECS_NODE}/ecs_reduit_1612/config": "reduced",
    }
    payloads: dict[str, dict] = {
        "mode": _mode_config(entry),
        "comfort": _number_config(entry, 1610, "ECS - Consigne confort (1610)", "confort", 40),
        "reduced": _number_config(entry, 1612, "ECS - Consigne réduite (1612)", "reduit", 5),
        "mode_1201": _mode_1201_config(entry),
    }
    topics[f"{_DISCOVERY_PREFIX}/select/{_CIRCUIT_NODE}/circuit_c2_mode_1201/config"] = "mode_1201"
    for key, (parameter, name, category, minimum, maximum) in _CIRCUIT_NUMBERS.items():
        topics[f"{_DISCOVERY_PREFIX}/number/{_CIRCUIT_NODE}/{key}/config"] = key
        payloads[key] = _number_config(
            entry,
            parameter,
            name,
            key,
            minimum,
            maximum=maximum,
            step=0.1,
            category=category,
            prefix="circuit",
        )

    published: list[str] = []
    for topic, key in topics.items():
        try:
            await async_publish(
                hass,
                topic,
                json.dumps(payloads[key], ensure_ascii=False),
                qos=1,
                retain=True,
            )
            published.append(topic)
        except Exception:
            _LOGGER.exception("Publication MQTT discovery impossible pour %s", key)

    async def _async_cleanup() -> None:
        for topic in published:
            try:
                await async_publish(hass, topic, "", qos=1, retain=True)
            except Exception:
                _LOGGER.debug("Nettoyage MQTT discovery impossible pour %s", topic)

    def _cleanup() -> None:
        hass.async_create_task(_async_cleanup())

    return _cleanup
