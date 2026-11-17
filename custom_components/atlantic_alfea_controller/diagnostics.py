"""Diagnostics de l'intégration (Paramètres > Appareils et services > ⋮ > Télécharger les diagnostics).

Centrés sur ce qu'il faut pour corriger une détection fausse de l'installation : paramètres
de configuration bruts du régulateur (relus à la demande), détection retenue avec la raison
et la confiance de chaque choix, couverture du journal BSB-LAN, entités sources associées.
Rien n'est jamais écrit dans BSB-LAN.
"""

from __future__ import annotations

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .bsb_http import entry_client
from .const import DOMAIN
from .installation_config import READ_PARAMETERS, installation_layout, overrides, parse_installation, summary

TO_REDACT = {"bsb_base_url", "password", "passkey", "username", "token"}


def bsb_lan_info(ji: dict) -> dict:
    """Résumé de /JI : version et bus, sans MAC ni numéro de série."""
    if not isinstance(ji, dict) or not ji:
        return {"lu": False}
    uptime_ms = ji.get("uptime")
    info = {
        "lu": True,
        "version": ji.get("version"),
        "materiel": ji.get("hardware"),
        "bus": ji.get("bus"),
        "bus_ecriture": ji.get("buswritable"),
        "adresse_bus": ji.get("busaddr"),
        "destination_bus": ji.get("busdest"),
        "regulateurs": [
            {k: dev.get(k) for k in ("dev_name", "dev_fam", "dev_var")}
            for dev in ji.get("busdevices") or [] if isinstance(dev, dict)
        ],
        "mode_journalisation": ji.get("loggingmode"),
        "intervalle_journal_s": ji.get("loginterval"),
        "ram_libre_octets": ji.get("freeram"),
        "en_marche_depuis_h": round(uptime_ms / 3_600_000, 1) if isinstance(uptime_ms, (int, float)) else None,
    }
    return info


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict:
    integration = await async_get_integration(hass, DOMAIN)
    client = entry_client(hass, entry)
    if client is None:
        fresh = "adresse HTTP de BSB-LAN non configurée : pas de détection (réglages de la carte seulement)"
        bsb_lan = {"lu": False, "raison": "adresse HTTP de BSB-LAN non configurée"}
    else:
        try:
            bsb_lan = bsb_lan_info(await client.get_path("/JI", timeout=15))
        except Exception as err:  # noqa: BLE001
            bsb_lan = {"lu": False, "raison": f"lecture /JI impossible : {err!r}"}
        try:
            fresh = parse_installation(await client.get_jq(READ_PARAMETERS, timeout=30)) or "réponse illisible"
        except Exception as err:  # noqa: BLE001 - rapporté en texte dans les diagnostics
            fresh = f"lecture impossible : {err!r}"
    stored = installation_layout(hass, entry, effective=False)
    effective = installation_layout(hass, entry)
    try:
        from .bsb_logging import log_report
        from .polling import json_polled

        journal = log_report(hass, entry, set(json_polled(hass, entry)))
    except Exception as err:  # noqa: BLE001
        journal = f"indisponible : {err!r}"
    return {
        "version_integration": str(integration.version),
        "bsb_lan": bsb_lan,
        "installation": {
            "resume": summary(effective),
            "reglages_integration": overrides(entry.options),
            "configuration_effective": effective,
            "detection_en_memoire": stored,
            "lecture_a_la_demande": fresh,
        },
        "journal_bsb_lan": journal,
        "entites_sources": async_redact_data(dict(entry.data), TO_REDACT),
        "options": async_redact_data(dict(entry.options), TO_REDACT),
    }
