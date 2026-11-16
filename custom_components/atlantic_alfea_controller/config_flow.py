"""Config and options flows for Atlantic Alfea BSB-LAN."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import OptionsFlowWithReload
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.selector import NumberSelector, NumberSelectorConfig, NumberSelectorMode
from homeassistant.helpers.service_info.zeroconf import ZeroconfServiceInfo

from .installation_config import COMBO_LABELS, COOLING_LABELS, OPT_COOLING


def _cooling_selector() -> selector.SelectSelector:
    """Rafraîchissement : automatique (5711/5716) ou circuits équipés."""
    return selector.SelectSelector(selector.SelectSelectorConfig(
        mode=selector.SelectSelectorMode.DROPDOWN,
        options=[selector.SelectOptionDict(value="auto", label="Automatique (détection)"),
                 *[selector.SelectOptionDict(value=key, label=label) for key, label in COOLING_LABELS.items()]]))

from .const import (
    CONF_CIRCUIT_1_NAME,
    CONF_CIRCUIT_2_NAME,
    CONF_ENERGY_ENTITY,
    CONF_POWER_ENTITY,
    CONF_WEATHER_ENTITY,
    CONF_FLOW_GAP_DEGREES,
    CONF_FLOW_GAP_DURATION_MINUTES,
    CONF_FREQUENT_STARTS_PER_HOUR,
    CONF_SHORT_CYCLE_MINUTES,
    CONF_Q3_DIVERTER_CONFIRMED,
    DEFAULT_FLOW_GAP_DEGREES,
    DEFAULT_FLOW_GAP_DURATION_MINUTES,
    DEFAULT_FREQUENT_STARTS_PER_HOUR,
    DEFAULT_SHORT_CYCLE_MINUTES,
    DOMAIN,
)
from .discovery import DiscoveryResult, discover_candidates, discover_mapping
from .helpers import energy_entity
from .parameters import PARAMETER_SPECS, SPEC_BY_KEY, ParameterSpec

CONF_CONFIRM_MANUAL = "manual_configuration"
CONF_AUTOMATIC_DETECTION = "automatic_detection"


def _entity_selector(
    hass,
    spec: ParameterSpec,
    default: str | None = None,
) -> selector.EntitySelector:
    """Build a safe selector limited to the domains and BSB candidates."""
    candidates = discover_candidates(hass, spec)
    included: list[str] = []
    for entity_id in (default, *candidates):
        if entity_id and entity_id not in included:
            included.append(entity_id)

    config: dict[str, Any] = {
        "filter": [{"domain": list(spec.domains)}],
    }
    if included:
        # Explicitly including detected candidates also makes hidden/no-device
        # MQTT entities selectable in the Home Assistant entity picker.
        config["include_entities"] = included

    return selector.EntitySelector(config)


def _schema_for_keys(
    hass,
    keys: list[str],
    defaults: dict[str, str] | None = None,
    required_only: bool = False,
) -> vol.Schema:
    """Build an entity selector schema for selected mapping keys."""
    defaults = defaults or {}
    fields: dict[Any, Any] = {}
    for key in keys:
        spec = SPEC_BY_KEY[key]
        default = defaults.get(key)
        marker_factory = vol.Required if spec.required or required_only else vol.Optional
        marker = marker_factory(key, default=default) if default else marker_factory(key)
        fields[marker] = _entity_selector(hass, spec, default)
    return vol.Schema(fields)


def _missing_parameters(result: DiscoveryResult, required: bool) -> str:
    keys = result.missing_required if required else result.missing_optional
    return ", ".join(str(SPEC_BY_KEY[key].parameter) for key in keys) or "aucun"


def _clean_mapping(user_input: dict[str, Any]) -> dict[str, str]:
    """Keep only valid, non-empty entity associations."""
    return {
        key: str(value)
        for key, value in user_input.items()
        if key in SPEC_BY_KEY and value
    }


class AtlanticAlfeaConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 14

    def __init__(self) -> None:
        self._discovery: DiscoveryResult | None = None
        self._pending_data: dict[str, str] = {}
        self._reconfigure_entry = None
        self._zeroconf_url: str | None = None
        self._options: dict[str, Any] = {}
        self._detection = ""

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        """Create the options flow."""
        return AtlanticAlfeaOptionsFlow()

    async def async_step_zeroconf(self, discovery_info: ZeroconfServiceInfo):
        """Update the BSB-LAN JSON URL when the adapter is discovered."""
        host = str(discovery_info.ip_address or discovery_info.host)
        if ":" in host and not host.startswith("["):
            host = f"[{host}]"
        port = discovery_info.port or 80
        base_url = f"http://{host}" if port == 80 else f"http://{host}:{port}"

        entries = self.hass.config_entries.async_entries(DOMAIN)
        if not entries:
            # première installation : BSB-LAN trouvé sur le réseau, adresse pré-remplie
            await self.async_set_unique_id("atlantic_alfea_bsblan")
            self._abort_if_unique_id_configured()
            self._zeroconf_url = base_url
            self.context["title_placeholders"] = {"name": f"BSB-LAN ({host})"}
            return await self.async_step_user()
        if len(entries) > 1:
            return self.async_abort(reason="multiple_entries")

        entry = entries[0]
        current = str(entry.options.get("bsb_base_url", "")).rstrip("/")
        if current == base_url:
            return self.async_abort(reason="already_configured")

        return self.async_update_reload_and_abort(
            entry,
            options_updates={"bsb_base_url": base_url},
            reason="discovery_updated",
        )

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Set up a new entry using automatic discovery first."""
        await self.async_set_unique_id("atlantic_alfea_bsblan")
        self._abort_if_unique_id_configured()

        if self._discovery is None:
            self._discovery = discover_mapping(self.hass)
            self._pending_data = dict(self._discovery.mapping)

        if self._discovery.missing_required or any(
            SPEC_BY_KEY[key].required for key in self._discovery.unresolved
        ):
            return await self.async_step_manual_v125()

        if user_input is not None:
            if user_input.get(CONF_CONFIRM_MANUAL, False):
                return await self.async_step_mapping_v125()
            return await self.async_step_equipment()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Optional(CONF_CONFIRM_MANUAL, default=False): selector.BooleanSelector(),
                }
            ),
            description_placeholders={
                "found": str(self._discovery.found_count),
                "total": str(len(PARAMETER_SPECS)),
                "missing_optional": _missing_parameters(self._discovery, required=False),
            },
        )

    async def async_step_manual_v125(self, user_input: dict[str, Any] | None = None):
        """Ask only for required entities that could not be resolved safely."""
        assert self._discovery is not None
        unresolved_required = [
            spec.key
            for spec in PARAMETER_SPECS
            if spec.required and spec.key not in self._pending_data
        ]

        if user_input is not None:
            self._pending_data.update(_clean_mapping(user_input))
            return await self.async_step_equipment()

        defaults = {
            key: self._discovery.unresolved[key][0]
            for key in unresolved_required
            if self._discovery.unresolved.get(key)
        }
        return self.async_show_form(
            step_id="manual_v125",
            data_schema=_schema_for_keys(
                self.hass,
                unresolved_required,
                defaults,
                required_only=True,
            ),
            description_placeholders={
                "parameters": ", ".join(
                    str(SPEC_BY_KEY[key].parameter) for key in unresolved_required
                ),
            },
        )

    async def async_step_mapping_v125(self, user_input: dict[str, Any] | None = None):
        """Allow a complete mapping with detected values prefilled."""
        if user_input is not None:
            data = _clean_mapping(user_input)
            if self._reconfigure_entry is not None:
                return self.async_update_reload_and_abort(
                    self._reconfigure_entry,
                    data=data,
                )
            self._pending_data = data
            return await self.async_step_equipment()

        defaults = dict(self._pending_data)
        if self._reconfigure_entry is not None:
            defaults = dict(self._reconfigure_entry.data) | defaults
        return self.async_show_form(
            step_id="mapping_v125",
            data_schema=_schema_for_keys(
                self.hass,
                [spec.key for spec in PARAMETER_SPECS],
                defaults,
            ),
        )

    async def async_step_equipment(self, user_input: dict[str, Any] | None = None):
        """Première installation : adresse BSB-LAN, météo, puissance et énergie de la PAC (pré-remplies)."""
        from .onboarding import async_probe_bsb_lan, suggest_meter, suggest_weather
        from .regime_api import valid_base_url

        errors: dict[str, str] = {}
        if user_input is not None:
            address = str(user_input.get("bsb_base_url", "") or "").strip().rstrip("/")
            if address and not valid_base_url(address):
                errors["base"] = "invalid_url"
            else:
                self._options = {
                    "bsb_base_url": address,
                    CONF_WEATHER_ENTITY: user_input.get(CONF_WEATHER_ENTITY) or "",
                    CONF_POWER_ENTITY: user_input.get(CONF_POWER_ENTITY) or "",
                    CONF_ENERGY_ENTITY: user_input.get(CONF_ENERGY_ENTITY) or "",
                }
                self._detection = await self._async_detect(address)
                return await self.async_step_installation()

        url = self._zeroconf_url or await async_probe_bsb_lan(self.hass) or ""
        suggested = {
            "bsb_base_url": url,
            CONF_WEATHER_ENTITY: suggest_weather(self.hass),
            CONF_POWER_ENTITY: suggest_meter(self.hass, "power"),
            CONF_ENERGY_ENTITY: suggest_meter(self.hass, "energy"),
        }
        schema = vol.Schema({
            vol.Optional("bsb_base_url", description={"suggested_value": suggested["bsb_base_url"] or None}):
                selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.URL)),
            vol.Optional(CONF_WEATHER_ENTITY, description={"suggested_value": suggested[CONF_WEATHER_ENTITY]}):
                selector.EntitySelector(selector.EntitySelectorConfig(domain="weather")),
            vol.Optional(CONF_POWER_ENTITY, description={"suggested_value": suggested[CONF_POWER_ENTITY]}):
                selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor", device_class="power")),
            vol.Optional(CONF_ENERGY_ENTITY, description={"suggested_value": suggested[CONF_ENERGY_ENTITY]}):
                selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor", device_class="energy")),
        })
        found = [label for key, label in (("bsb_base_url", "adresse BSB-LAN"), (CONF_WEATHER_ENTITY, "météo"),
                                          (CONF_POWER_ENTITY, "puissance"), (CONF_ENERGY_ENTITY, "énergie"))
                 if suggested[key]]
        return self.async_show_form(
            step_id="equipment", data_schema=schema, errors=errors,
            description_placeholders={"found": ", ".join(found) or "rien (à compléter si disponible)"},
        )

    async def _async_detect(self, address: str) -> str:
        """Résumé de la configuration lue dans la PAC (circuits, émetteurs, ECS)."""
        if not address:
            return "non lue (adresse BSB-LAN absente) : choisissez la configuration ci-dessous si besoin"
        from .bsb_http import get_client
        from .installation_config import CONFIG_PARAMETERS, details, parse_installation, summary

        client = get_client(self.hass, address)
        try:
            layout = parse_installation(await client.get_jq(CONFIG_PARAMETERS, timeout=20)) if client else None
        except Exception as err:  # noqa: BLE001 - affiché tel quel à l'utilisateur
            return f"lecture impossible ({err.__class__.__name__}) : vérifiez l'adresse BSB-LAN"
        if not layout:
            return "réponse illisible du régulateur"
        return f"{summary(layout)} — {details(layout)}"

    async def async_step_installation(self, user_input: dict[str, Any] | None = None):
        """Première installation : configuration détectée, corrigeable (configurations dessinables seulement)."""
        if user_input is not None:
            options = {**self._options,
                       "installation_ecs": user_input.get("installation_ecs", "auto"),
                       "installation_emetteurs": user_input.get("installation_emetteurs", "auto"),
                       OPT_COOLING: user_input.get(OPT_COOLING, "auto")}
            return self.async_create_entry(title="Atlantic Alfea BSB-LAN", data=self._pending_data, options=options)
        schema = vol.Schema({
            vol.Required("installation_ecs", default="auto"): selector.SelectSelector(
                selector.SelectSelectorConfig(mode=selector.SelectSelectorMode.DROPDOWN, options=[
                    selector.SelectOptionDict(value="auto", label="Automatique (détection)"),
                    selector.SelectOptionDict(value="oui", label="Avec ballon d'eau chaude"),
                    selector.SelectOptionDict(value="non", label="Sans ballon d'eau chaude")])),
            vol.Required("installation_emetteurs", default="auto"): selector.SelectSelector(
                selector.SelectSelectorConfig(mode=selector.SelectSelectorMode.DROPDOWN, options=[
                    selector.SelectOptionDict(value="auto", label="Automatique (détection)"),
                    *[selector.SelectOptionDict(value=key, label=label) for key, label in COMBO_LABELS.items()]])),
            vol.Required(OPT_COOLING, default="auto"): _cooling_selector(),
        })
        return self.async_show_form(step_id="installation", data_schema=schema,
                                    description_placeholders={"detection": self._detection})

    async def async_step_manual_all(self, user_input: dict[str, Any] | None = None):
        """Compatibility alias for flows started by an earlier release."""
        return await self.async_step_mapping_v125(user_input)

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None):
        """Re-run automatic discovery or edit the complete mapping manually."""
        self._reconfigure_entry = self._get_reconfigure_entry()

        if user_input is None:
            return self.async_show_form(
                step_id="reconfigure",
                data_schema=vol.Schema(
                    {
                        vol.Required(
                            CONF_AUTOMATIC_DETECTION,
                            default=True,
                        ): selector.BooleanSelector(),
                    }
                ),
            )

        if not user_input[CONF_AUTOMATIC_DETECTION]:
            self._pending_data = dict(self._reconfigure_entry.data)
            return await self.async_step_mapping_v125()

        self._discovery = discover_mapping(self.hass, self._reconfigure_entry.data)
        self._pending_data = dict(self._reconfigure_entry.data)
        self._pending_data.update(self._discovery.mapping)

        unresolved_required = [
            spec.key
            for spec in PARAMETER_SPECS
            if spec.required and spec.key not in self._pending_data
        ]
        if unresolved_required:
            return await self.async_step_reconfigure_manual_v125()

        return self.async_update_reload_and_abort(
            self._reconfigure_entry,
            data=self._pending_data,
        )

    async def async_step_reconfigure_manual_v125(
        self,
        user_input: dict[str, Any] | None = None,
    ):
        """Resolve required fields missing during a reconfiguration."""
        assert self._discovery is not None
        assert self._reconfigure_entry is not None
        unresolved_required = [
            spec.key
            for spec in PARAMETER_SPECS
            if spec.required and spec.key not in self._pending_data
        ]

        if user_input is not None:
            self._pending_data.update(_clean_mapping(user_input))
            return self.async_update_reload_and_abort(
                self._reconfigure_entry,
                data=self._pending_data,
            )

        defaults = {
            key: self._discovery.unresolved[key][0]
            for key in unresolved_required
            if self._discovery.unresolved.get(key)
        }
        return self.async_show_form(
            step_id="reconfigure_manual_v125",
            data_schema=_schema_for_keys(
                self.hass,
                unresolved_required,
                defaults,
                required_only=True,
            ),
            description_placeholders={
                "parameters": ", ".join(
                    str(SPEC_BY_KEY[key].parameter) for key in unresolved_required
                ),
            },
        )


    async def async_step_manual(self, user_input: dict[str, Any] | None = None):
        """Resume an older flow that was waiting on the legacy manual step."""
        return await self.async_step_manual_v125(user_input)

    async def async_step_mapping(self, user_input: dict[str, Any] | None = None):
        """Resume an older flow that was waiting on the legacy mapping step."""
        return await self.async_step_mapping_v125(user_input)

    async def async_step_reconfigure_manual(
        self,
        user_input: dict[str, Any] | None = None,
    ):
        """Resume an older reconfiguration flow using the legacy step id."""
        return await self.async_step_reconfigure_manual_v125(user_input)


class AtlanticAlfeaOptionsFlow(OptionsFlowWithReload):
    """Configure diagnostic alert thresholds."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            from .regime_api import valid_base_url
            address = user_input.get("bsb_base_url", "").strip()
            if address and not valid_base_url(address):
                return self.async_show_form(step_id="init", errors={"base": "invalid_url"})
            # Keep an explicit empty value: it means "no global meter".
            user_input[CONF_ENERGY_ENTITY] = user_input.get(CONF_ENERGY_ENTITY) or ""
            user_input[CONF_WEATHER_ENTITY] = user_input.get(CONF_WEATHER_ENTITY) or ""
            user_input[CONF_POWER_ENTITY] = user_input.get(CONF_POWER_ENTITY) or ""
            return self.async_create_entry(data=user_input)

        schema = vol.Schema(
            {
                vol.Optional(CONF_CIRCUIT_1_NAME, default=self.config_entry.options.get(CONF_CIRCUIT_1_NAME, "Circuit 1")): selector.TextSelector(),
                vol.Optional(CONF_CIRCUIT_2_NAME, default=self.config_entry.options.get(CONF_CIRCUIT_2_NAME, "Circuit 2")): selector.TextSelector(),
                vol.Optional("bsb_base_url", default=self.config_entry.options.get("bsb_base_url", "")): selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.URL)),
                # installation (détection automatique corrigeable) : reprise par toutes les cartes
                vol.Required("installation_ecs", default=self.config_entry.options.get("installation_ecs", "auto")): selector.SelectSelector(
                    selector.SelectSelectorConfig(mode=selector.SelectSelectorMode.DROPDOWN, options=[
                        selector.SelectOptionDict(value="auto", label="Automatique (détection)"),
                        selector.SelectOptionDict(value="oui", label="Avec ballon d'eau chaude"),
                        selector.SelectOptionDict(value="non", label="Sans ballon d'eau chaude")])),
                vol.Required("installation_emetteurs", default=self.config_entry.options.get("installation_emetteurs", "auto")): selector.SelectSelector(
                    selector.SelectSelectorConfig(mode=selector.SelectSelectorMode.DROPDOWN, options=[
                        selector.SelectOptionDict(value="auto", label="Automatique (détection)"),
                        *[selector.SelectOptionDict(value=key, label=label) for key, label in COMBO_LABELS.items()]])),
                vol.Required(OPT_COOLING, default=self.config_entry.options.get(OPT_COOLING, "auto")): _cooling_selector(),
                vol.Optional(
                    CONF_WEATHER_ENTITY,
                    description={"suggested_value": self.config_entry.options.get(CONF_WEATHER_ENTITY) or None},
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="weather")),
                vol.Optional(
                    CONF_POWER_ENTITY,
                    description={"suggested_value": self.config_entry.options.get(CONF_POWER_ENTITY) or None},
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor", device_class="power")),
                vol.Optional(
                    CONF_ENERGY_ENTITY,
                    description={"suggested_value": energy_entity(self.hass, self.config_entry) or None},
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain="sensor", device_class="energy")
                ),
                vol.Required(
                    CONF_Q3_DIVERTER_CONFIRMED,
                    default=self.config_entry.options.get(CONF_Q3_DIVERTER_CONFIRMED, False),
                ): selector.BooleanSelector(),
                vol.Required(
                    CONF_SHORT_CYCLE_MINUTES,
                    default=self.config_entry.options.get(
                        CONF_SHORT_CYCLE_MINUTES,
                        DEFAULT_SHORT_CYCLE_MINUTES,
                    ),
                ): NumberSelector(
                    NumberSelectorConfig(min=1, max=30, step=0.5, mode=NumberSelectorMode.BOX)
                ),
                vol.Required(
                    CONF_FREQUENT_STARTS_PER_HOUR,
                    default=self.config_entry.options.get(
                        CONF_FREQUENT_STARTS_PER_HOUR,
                        DEFAULT_FREQUENT_STARTS_PER_HOUR,
                    ),
                ): NumberSelector(
                    NumberSelectorConfig(min=2, max=20, step=1, mode=NumberSelectorMode.BOX)
                ),
                vol.Required(
                    CONF_FLOW_GAP_DEGREES,
                    default=self.config_entry.options.get(
                        CONF_FLOW_GAP_DEGREES,
                        DEFAULT_FLOW_GAP_DEGREES,
                    ),
                ): NumberSelector(
                    NumberSelectorConfig(min=0.5, max=15, step=0.5, mode=NumberSelectorMode.BOX)
                ),
                vol.Required(
                    CONF_FLOW_GAP_DURATION_MINUTES,
                    default=self.config_entry.options.get(
                        CONF_FLOW_GAP_DURATION_MINUTES,
                        DEFAULT_FLOW_GAP_DURATION_MINUTES,
                    ),
                ): NumberSelector(
                    NumberSelectorConfig(min=1, max=120, step=1, mode=NumberSelectorMode.BOX)
                ),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
