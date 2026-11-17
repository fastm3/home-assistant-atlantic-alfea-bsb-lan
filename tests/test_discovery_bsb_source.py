"""Discovery only keeps BSB-LAN entities: a Shelly « …_output_0_… » is not BSB parameter 0."""
import importlib.util
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"
REGISTRY: dict = {}
DEVICES: dict = {}


def _load():
    for name in ("homeassistant", "homeassistant.core", "homeassistant.helpers",
                 "homeassistant.helpers.entity_registry", "homeassistant.helpers.device_registry",
                 "homeassistant.util", "homeassistant.util.dt"):
        sys.modules.setdefault(name, types.ModuleType(name))
    sys.modules["homeassistant.core"].HomeAssistant = object
    er = types.ModuleType("homeassistant.helpers.entity_registry")
    er.async_get = lambda hass: types.SimpleNamespace(async_get=REGISTRY.get)
    dr = types.ModuleType("homeassistant.helpers.device_registry")
    dr.async_get = lambda hass: types.SimpleNamespace(async_get=DEVICES.get)
    helpers = sys.modules["homeassistant.helpers"]
    helpers.entity_registry, helpers.device_registry = er, dr
    sys.modules["homeassistant.helpers.entity_registry"] = er
    sys.modules["homeassistant.helpers.device_registry"] = dr
    dt = types.ModuleType("homeassistant.util.dt"); dt.utcnow = lambda: datetime.now(timezone.utc)
    sys.modules["homeassistant.util"].dt = dt; sys.modules["homeassistant.util.dt"] = dt
    pkg = types.ModuleType("aac_disc"); pkg.__path__ = [str(ROOT)]; sys.modules["aac_disc"] = pkg
    for mod_name in ("const", "parameters", "discovery"):
        spec = importlib.util.spec_from_file_location(f"aac_disc.{mod_name}", ROOT / f"{mod_name}.py")
        mod = importlib.util.module_from_spec(spec); sys.modules[f"aac_disc.{mod_name}"] = mod
        spec.loader.exec_module(mod)
    return mod


d = _load()


class _States:
    def __init__(self, states): self._s = states
    def get(self, entity_id): return self._s.get(entity_id)
    def async_all(self): return list(self._s.values())


def _state(entity_id, value, name):
    return types.SimpleNamespace(entity_id=entity_id, state=value, attributes={"friendly_name": name},
                                 last_updated=datetime.now(timezone.utc))


SHELLY = "sensor.shellypstripg4_acebe6ec1f4c_output_0_facteur_de_puissance"
BSB_CLOCK = "text.bsb_lan_00_00_date_et_heure_0_date_et_heure"


class BsbSourceTest(unittest.TestCase):
    def setUp(self):
        REGISTRY.clear(); DEVICES.clear()
        REGISTRY[SHELLY] = types.SimpleNamespace(platform="shelly", device_id="dev_shelly")
        DEVICES["dev_shelly"] = types.SimpleNamespace(name="Shelly Power Strip", name_by_user=None,
                                                      manufacturer="Shelly", model="PStripG4")

    def hass(self, *extra):
        states = {SHELLY: _state(SHELLY, "0.95", "Prise Output 0 Facteur de puissance")}
        for s in extra: states[s.entity_id] = s
        return types.SimpleNamespace(states=_States(states))

    def test_shelly_is_not_parameter_0(self):
        self.assertIsNone(d.discover_parameter_entity(self.hass(), 0))

    def test_stored_shelly_mapping_is_forgotten(self):
        result = d.discover_mapping(self.hass(), {"clock_datetime": SHELLY})
        self.assertIn("clock_datetime", result.stale)
        self.assertNotIn("clock_datetime", result.mapping)

    def test_bsb_clock_replaces_it(self):
        REGISTRY[BSB_CLOCK] = types.SimpleNamespace(platform="mqtt", device_id=None)
        hass = self.hass(_state(BSB_CLOCK, "17.11.2026 00:20:00", "BSB-LAN 00-00 Date et heure - 0 - Date et heure"))
        self.assertEqual(d.discover_parameter_entity(hass, 0, current_entity=SHELLY), BSB_CLOCK)

    def test_bsb_device_name_is_enough(self):
        renamed = "sensor.chaufferie_8006_etat_pompe_a_chaleur"
        REGISTRY[renamed] = types.SimpleNamespace(platform="mqtt", device_id="dev_bsb")
        DEVICES["dev_bsb"] = types.SimpleNamespace(name="BSB-LAN", name_by_user="Chaufferie", manufacturer="bsb-lan.de", model=None)
        self.assertEqual(d.discover_parameter_entity(self.hass(_state(renamed, "Compresseur 1 en marche", "Chaufferie 8006")), 8006), renamed)

    def test_hand_picked_template_is_kept(self):
        REGISTRY["sensor.horloge_pac"] = types.SimpleNamespace(platform="template", device_id=None)
        hass = self.hass(_state("sensor.horloge_pac", "17.11.2026 00:20:00", "Horloge PAC"))
        self.assertFalse(d.is_foreign_mapping(hass, d.SPEC_BY_PARAMETER[0], "sensor.horloge_pac"))
        self.assertEqual(d.discover_mapping(hass, {"clock_datetime": "sensor.horloge_pac"}).stale, [])


if __name__ == "__main__":
    unittest.main()
