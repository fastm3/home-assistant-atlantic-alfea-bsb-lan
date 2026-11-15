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
from .installation_config import CONFIG_PARAMETERS, installation_layout, parse_installation, summary

TO_REDACT = {"bsb_base_url", "password", "passkey", "username", "token"}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict:
    integration = await async_get_integration(hass, DOMAIN)
    client = entry_client(hass, entry)
    if client is None:
        fresh = "adresse HTTP de BSB-LAN non configurée : pas de détection (réglages de la carte seulement)"
    else:
        try:
            fresh = parse_installation(await client.get_jq(CONFIG_PARAMETERS, timeout=20)) or "réponse illisible"
        except Exception as err:  # noqa: BLE001 - rapporté en texte dans les diagnostics
            fresh = f"lecture impossible : {err!r}"
    stored = installation_layout(hass, entry)
    try:
        from .bsb_logging import log_report
        from .polling import json_polled

        journal = log_report(hass, entry, set(json_polled(hass, entry)))
    except Exception as err:  # noqa: BLE001
        journal = f"indisponible : {err!r}"
    return {
        "version_integration": str(integration.version),
        "installation": {
            "resume": summary(stored),
            "detection_en_memoire": stored,
            "lecture_a_la_demande": fresh,
        },
        "journal_bsb_lan": journal,
        "entites_sources": async_redact_data(dict(entry.data), TO_REDACT),
        "options": async_redact_data(dict(entry.options), TO_REDACT),
    }
