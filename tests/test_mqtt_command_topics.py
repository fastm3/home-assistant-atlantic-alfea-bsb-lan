"""MQTT commands use the BSB-LAN ≥ 5.0 topic form (the legacy « BSB-LAN » + « S<p>=v » is dropped by 5.1)."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"


def _load():
    for name in ("homeassistant", "homeassistant.components", "homeassistant.components.mqtt",
                 "homeassistant.config_entries", "homeassistant.core"):
        sys.modules.setdefault(name, types.ModuleType(name))
    sys.modules["homeassistant.components.mqtt"].async_publish = lambda *a, **k: None
    sys.modules["homeassistant.config_entries"].ConfigEntry = object
    sys.modules["homeassistant.core"].HomeAssistant = object
    pkg = types.ModuleType("aac_mqtt"); pkg.__path__ = [str(ROOT)]; sys.modules["aac_mqtt"] = pkg
    const = types.ModuleType("aac_mqtt.const"); const.DOMAIN = "atlantic_alfea_controller"; sys.modules["aac_mqtt.const"] = const
    spec = importlib.util.spec_from_file_location("aac_mqtt.mqtt_ecs", ROOT / "mqtt_ecs.py")
    mod = importlib.util.module_from_spec(spec); sys.modules["aac_mqtt.mqtt_ecs"] = mod; spec.loader.exec_module(mod)
    return mod


m = _load()
ENTRY = types.SimpleNamespace(entry_id="e")


class CommandTopicTest(unittest.TestCase):
    def test_numbers(self):
        cfg = m._number_config(ENTRY, 1010, "C2", "c2_confort_1010", 5, maximum=30, step=0.1, category=10, prefix="circuit")
        self.assertEqual(cfg["command_topic"], "BSB-LAN/0/10/1010/set")
        self.assertEqual(cfg["command_template"], "{{ value }}")
        self.assertEqual(cfg["state_topic"], "BSB-LAN/0/10/1010/status")

    def test_selects(self):
        mode = m._mode_config(ENTRY)
        self.assertEqual(mode["command_topic"], "BSB-LAN/0/13/1600/set")
        self.assertNotIn("S1600", mode["command_template"])
        cool = m._mode_1201_config(ENTRY)
        self.assertEqual(cool["command_topic"], "BSB-LAN/0/11/1201/set")
        self.assertNotIn("S1201", cool["command_template"])

    def test_no_legacy_topic_anywhere(self):
        for f in ROOT.glob("*.py"):
            text = f.read_text(encoding="utf-8")
            self.assertNotIn('"BSB-LAN",', text.replace('"source_saison": "BSB-LAN",', ""), f.name)


if __name__ == "__main__":
    unittest.main()
