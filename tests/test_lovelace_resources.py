"""Ressources Lovelace des cartes : création si absentes, ?v= à la version de l'intégration."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"
for name in ("homeassistant", "homeassistant.core"):
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["homeassistant.core"].HomeAssistant = object
spec = importlib.util.spec_from_file_location("aac_res", ROOT / "lovelace_resources.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

PHOTO = "/alfea-synoptique/pac-synoptique-photo-card.js"
PROG = "/alfea-synoptique/pac-programmes-card.js"


class PlanTest(unittest.TestCase):
    def test_bump_existing(self):
        items = [{"id": "a", "type": "module", "url": PHOTO + "?v=2.5.4"},
                 {"id": "b", "type": "module", "url": PROG + "?v=2.5.4"},
                 {"id": "c", "type": "module", "url": "/local/community/other.js?v=1"}]
        self.assertEqual(m.plan_resources(items, "2.5.9"),
                         [("update", "a", PHOTO + "?v=2.5.9"), ("update", "b", PROG + "?v=2.5.9")])

    def test_up_to_date_does_nothing(self):
        items = [{"id": "a", "type": "module", "url": PHOTO + "?v=2.5.9"},
                 {"id": "b", "type": "module", "url": PROG + "?v=2.5.9"}]
        self.assertEqual(m.plan_resources(items, "2.5.9"), [])

    def test_create_missing(self):
        self.assertEqual(m.plan_resources([{"id": "a", "type": "module", "url": PHOTO}], "2.5.9"),
                         [("update", "a", PHOTO + "?v=2.5.9"), ("create", None, PROG + "?v=2.5.9")])

    def test_other_resources_untouched(self):
        items = [{"id": "x", "type": "module", "url": "/local/pac-photo-preview.js?v=2.5.8e"},
                 {"id": "a", "type": "module", "url": PHOTO + "?v=2.5.9"},
                 {"id": "b", "type": "module", "url": PROG + "?v=2.5.9"}]
        self.assertEqual(m.plan_resources(items, "2.5.9"), [])


class _Coll:
    def __init__(self, items): self.items, self.loaded, self.calls = items, True, []
    def async_items(self): return self.items
    async def async_create_item(self, data): self.calls.append(("create", data))
    async def async_update_item(self, item_id, data): self.calls.append(("update", item_id, data))


class SyncTest(unittest.IsolatedAsyncioTestCase):
    async def test_storage_mode(self):
        coll = _Coll([{"id": "a", "type": "module", "url": PHOTO + "?v=1"}])
        hass = types.SimpleNamespace(data={"lovelace": types.SimpleNamespace(resources=coll, resource_mode="storage")})
        await m.async_sync_card_resources(hass, "2.5.9")
        self.assertEqual(coll.calls, [("update", "a", {"res_type": "module", "url": PHOTO + "?v=2.5.9"}),
                                      ("create", {"res_type": "module", "url": PROG + "?v=2.5.9"})])

    async def test_yaml_mode_untouched(self):
        coll = _Coll([])
        hass = types.SimpleNamespace(data={"lovelace": types.SimpleNamespace(resources=coll, resource_mode="yaml")})
        self.assertEqual(await m.async_sync_card_resources(hass, "2.5.9"), [])
        self.assertEqual(coll.calls, [])

    async def test_no_lovelace(self):
        self.assertEqual(await m.async_sync_card_resources(types.SimpleNamespace(data={}), "2.5.9"), [])


if __name__ == "__main__":
    unittest.main()
