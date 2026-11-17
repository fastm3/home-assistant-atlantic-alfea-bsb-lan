"""Automatic entity discovery for Atlantic Alfea BSB-LAN."""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Final, Mapping

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .parameters import (
    GROUP_COMMANDS,
    PARAMETER_SPECS,
    SPEC_BY_PARAMETER,
    ParameterSpec,
)

_INVALID_STATES: Final = {"unknown", "unavailable", "none", "---", ""}
_BSB_MARKERS: Final = ("bsb_lan", "bsblan", "bsb-lan", "bsb lan")


@dataclass(slots=True)
class DiscoveryResult:
    """Result of a complete entity discovery pass."""

    mapping: dict[str, str]
    unresolved: dict[str, list[str]]
    missing_required: list[str]
    missing_optional: list[str]
    # stored sources that are not BSB-LAN entities (to be forgotten)
    stale: list[str] = field(default_factory=list)

    @property
    def found_count(self) -> int:
        """Return the number of automatically associated parameters."""
        return len(self.mapping)


@dataclass(frozen=True, slots=True)
class _Candidate:
    entity_id: str
    score: int
    exact_id_match: bool
    exact_name_match: bool


def _matches_parameter(entity_id: str, friendly_name: str, parameter: int) -> tuple[bool, bool]:
    """Return exact entity-id and friendly-name matches for a parameter."""
    object_id = entity_id.split(".", 1)[-1]
    # Decimal sub-parameters (BSB-LAN 5.1 publishes e.g. « 1001.1 - Temporarily warmer »,
    # object id « …_1001_1_temporarily_warmer ») are other parameters: never match them.
    id_match = re.search(rf"(?:^|_){parameter}(?:_(?!\d+(?:_|$))|$)", object_id) is not None
    name_match = re.search(rf"(?<![\d.]){parameter}(?!\d)(?!\.\d)", friendly_name) is not None
    return id_match, name_match


def _has_bsb_marker(hass: HomeAssistant, entity_id: str, friendly_name: str, platform: str) -> bool:
    """Return whether an entity visibly comes from BSB-LAN.

    Matching the parameter number alone is not enough: « sensor.prise_output_0_… »
    (a Shelly plug) would otherwise be taken for BSB parameter 0.
    """
    if platform in {"bsblan", "bsb_lan"}:
        return True
    text = f"{entity_id} {friendly_name}".lower()
    if any(marker in text for marker in _BSB_MARKERS):
        return True
    registry_entry = er.async_get(hass).async_get(entity_id)
    if registry_entry is not None and registry_entry.device_id:
        device = dr.async_get(hass).async_get(registry_entry.device_id)
        if device is not None:
            device_text = " ".join(
                str(v) for v in (device.name, device.name_by_user, device.manufacturer, device.model) if v
            ).lower()
            if any(marker in device_text for marker in _BSB_MARKERS):
                return True
    return False


def is_foreign_mapping(hass: HomeAssistant, spec: ParameterSpec, entity_id: str | None) -> bool:
    """Return whether a stored source was picked by number but is not a BSB-LAN entity.

    Such a mapping comes from an older, too permissive discovery.  A source chosen by
    hand without the parameter number in its id (template sensor…) is kept.
    """
    if not entity_id:
        return False
    state = hass.states.get(entity_id)
    if state is None:
        return False
    friendly_name = str(state.attributes.get("friendly_name", ""))
    id_match, _ = _matches_parameter(entity_id, friendly_name, spec.parameter)
    if not id_match:
        return False
    registry_entry = er.async_get(hass).async_get(entity_id)
    platform = registry_entry.platform if registry_entry is not None else ""
    return not _has_bsb_marker(hass, entity_id, friendly_name, platform)


def _domain_priority(spec: ParameterSpec, domain: str) -> int:
    """Prefer domains in the order declared by the parameter specification."""
    try:
        index = spec.domains.index(domain)
    except ValueError:
        return -1
    return len(spec.domains) - index


def _candidate_score(
    hass: HomeAssistant,
    entity_id: str,
    friendly_name: str,
    spec: ParameterSpec,
) -> _Candidate | None:
    """Score a possible BSB-LAN source entity."""
    id_match, name_match = _matches_parameter(entity_id, friendly_name, spec.parameter)
    if not id_match and not name_match:
        return None

    domain = entity_id.split(".", 1)[0]
    if domain == DOMAIN:
        return None

    domain_priority = _domain_priority(spec, domain)
    if domain_priority < 0:
        return None

    registry = er.async_get(hass)
    registry_entry = registry.async_get(entity_id)
    platform = registry_entry.platform if registry_entry is not None else ""
    if platform == DOMAIN:
        return None
    if not _has_bsb_marker(hass, entity_id, friendly_name, platform):
        return None

    object_id = entity_id.split(".", 1)[-1].lower()
    friendly_lower = friendly_name.lower()
    score = domain_priority * 25

    if platform == "mqtt":
        score += 1000
    elif platform in {"bsblan", "bsb_lan"}:
        score += 500

    if "bsb_lan" in object_id or "bsblan" in object_id:
        score += 400
    elif "bsb-lan" in friendly_lower or "bsb lan" in friendly_lower:
        score += 250

    if id_match:
        score += 300
    if name_match:
        score += 150

    state = hass.states.get(entity_id)
    if state is not None and str(state.state).strip().lower() not in _INVALID_STATES:
        score += 20
        age = max(0.0, (dt_util.utcnow() - state.last_updated).total_seconds())
        if age <= 300:
            score += 60
        elif age <= 3600:
            score += 40
        elif age <= 86400:
            score += 15

    return _Candidate(entity_id, score, id_match, name_match)


def _scored_candidates(hass: HomeAssistant, spec: ParameterSpec) -> list[_Candidate]:
    """Return scored candidates for one BSB parameter."""
    candidates: list[_Candidate] = []
    for state in hass.states.async_all():
        friendly_name = str(state.attributes.get("friendly_name", ""))
        candidate = _candidate_score(hass, state.entity_id, friendly_name, spec)
        if candidate is not None:
            candidates.append(candidate)

    candidates.sort(key=lambda candidate: (-candidate.score, candidate.entity_id))
    return candidates


def discover_candidates(hass: HomeAssistant, spec: ParameterSpec) -> list[str]:
    """Return candidate entity IDs, best candidate first."""
    return [candidate.entity_id for candidate in _scored_candidates(hass, spec)]


def discover_parameter_entity(
    hass: HomeAssistant,
    parameter: int,
    current_entity: str | None = None,
) -> str | None:
    """Find the safest entity for one BSB parameter."""
    spec = SPEC_BY_PARAMETER.get(parameter)
    if spec is None:
        spec = ParameterSpec(
            str(parameter),
            parameter,
            False,
            ("sensor", "binary_sensor", "select", "text", "number"),
            "measurements",
        )

    if current_entity and hass.states.get(current_entity) is not None:
        current_domain = current_entity.split(".", 1)[0]
        if (
            current_domain in spec.domains
            and spec.group == GROUP_COMMANDS
            and not is_foreign_mapping(hass, spec, current_entity)
        ):
            # Writable mappings remain pinned once validated so an automatic
            # refresh can never redirect a command to another entity.
            return current_entity

    candidates = _scored_candidates(hass, spec)
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0].entity_id

    first, second = candidates[0], candidates[1]
    if first.score > second.score:
        return first.entity_id

    # Read-only states and diagnostics are safe to associate when the tied
    # candidates both match the exact BSB number. Writable command parameters
    # remain unresolved in a tie to prevent writing to the wrong entity.
    if (
        spec.group != GROUP_COMMANDS
        and first.exact_id_match
        and second.exact_id_match
        and first.entity_id.split(".", 1)[0] == spec.domains[0]
    ):
        return first.entity_id

    return None


def discover_mapping(
    hass: HomeAssistant,
    current: Mapping[str, str] | None = None,
) -> DiscoveryResult:
    """Discover all supported BSB-LAN source entities."""
    current = current or {}
    mapping: dict[str, str] = {}
    unresolved: dict[str, list[str]] = {}
    missing_required: list[str] = []
    missing_optional: list[str] = []
    stale: list[str] = []

    for spec in PARAMETER_SPECS:
        current_entity = current.get(spec.key)
        if is_foreign_mapping(hass, spec, current_entity):
            stale.append(spec.key)
            current_entity = None
        selected = discover_parameter_entity(
            hass,
            spec.parameter,
            current_entity=current_entity,
        )
        if selected is not None:
            mapping[spec.key] = selected
            continue

        candidates = discover_candidates(hass, spec)
        if candidates:
            unresolved[spec.key] = candidates
        elif spec.required:
            missing_required.append(spec.key)
        else:
            missing_optional.append(spec.key)

    return DiscoveryResult(mapping, unresolved, missing_required, missing_optional, stale)
