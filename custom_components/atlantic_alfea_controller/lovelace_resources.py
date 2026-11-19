"""Ressources Lovelace des cartes livrées par l'intégration, tenues à jour automatiquement.

Les cartes sont servies par l'intégration (/alfea-synoptique/…). Le Marketplace met les
fichiers à jour, mais pas l'adresse de la ressource : sans changement de « ?v= », les
navigateurs gardent l'ancienne carte en cache. Au démarrage, l'intégration :

- met « ?v=<version de l'intégration> » sur les ressources de ses cartes (mode stockage) ;
- crée celles qui manquent (première installation) ;
- en mode YAML, ne touche à rien et l'écrit dans le journal.

Seules les ressources dont l'adresse commence par /alfea-synoptique/<carte>.js sont
concernées ; aucune autre ressource ni aucun tableau de bord n'est modifié.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

CARD_PATHS = (
    "/alfea-synoptique/pac-synoptique-photo-card.js",
    "/alfea-synoptique/pac-programmes-card.js",
)


def _base(url: str) -> str:
    return str(url or "").split("?", 1)[0]


def plan_resources(items: list[dict[str, Any]], version: str) -> list[tuple[str, str | None, str]]:
    """Return the actions to apply: ("update", id, url) or ("create", None, url)."""
    actions: list[tuple[str, str | None, str]] = []
    for path in CARD_PATHS:
        wanted = f"{path}?v={version}"
        matches = [item for item in items if _base(item.get("url", "")) == path]
        if not matches:
            actions.append(("create", None, wanted))
            continue
        for item in matches:
            if item.get("url") != wanted or item.get("type", "module") != "module":
                actions.append(("update", item.get("id"), wanted))
    return actions


def _resource_collection(hass: HomeAssistant):
    data = hass.data.get("lovelace")
    if data is None:
        return None, None
    resources = getattr(data, "resources", None)
    mode = getattr(data, "resource_mode", None)
    if resources is None and isinstance(data, dict):
        resources = data.get("resources")
        mode = data.get("resource_mode", mode)
    return resources, mode


async def async_sync_card_resources(hass: HomeAssistant, version: str) -> list[tuple[str, str | None, str]]:
    """Create or re-version the card resources; never raises."""
    try:
        resources, mode = _resource_collection(hass)
        if resources is None:
            _LOGGER.debug("Ressources Lovelace indisponibles : rien à mettre à jour")
            return []
        if mode == "yaml" or not hasattr(resources, "async_create_item"):
            _LOGGER.info(
                "Ressources Lovelace en mode YAML : mettre à jour à la main %s",
                ", ".join(f"{p}?v={version}" for p in CARD_PATHS),
            )
            return []
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        actions = plan_resources(list(resources.async_items()), version)
        for action, item_id, url in actions:
            data = {"res_type": "module", "url": url}
            if action == "create":
                await resources.async_create_item(data)
                _LOGGER.info("Ressource Lovelace ajoutée : %s", url)
            else:
                await resources.async_update_item(item_id, data)
                _LOGGER.info("Ressource Lovelace mise à jour : %s", url)
        return actions
    except Exception:  # noqa: BLE001 - ne jamais bloquer le démarrage de l'intégration
        _LOGGER.warning("Mise à jour des ressources Lovelace impossible", exc_info=True)
        return []
