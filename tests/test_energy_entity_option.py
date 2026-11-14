"""Global energy meter selection: option, then config data, then legacy default if it exists."""
import ast
from pathlib import Path
import sys
import types
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller"
TREE = ast.parse((ROOT / "helpers.py").read_text(encoding="utf-8"))
FUNC = next(n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "energy_entity")
LEGACY = "sensor.phase_a_diff_pac_energy"

pkg = types.ModuleType("energy_pkg")
pkg.__path__ = []
sys.modules["energy_pkg"] = pkg
sys.modules["energy_pkg.const"] = types.SimpleNamespace(
    CONF_ENERGY_ENTITY="ecs_cop_energy_entity", LEGACY_ENERGY_ENTITY=LEGACY)
NS = {"__name__": "energy_pkg.helpers", "__package__": "energy_pkg",
      "HomeAssistant": object, "ConfigEntry": object}
exec(compile(ast.Module(body=[FUNC], type_ignores=[]), "helpers", "exec"), NS)
energy_entity = NS["energy_entity"]


def hass(*existing):
    return SimpleNamespace(states=SimpleNamespace(get=lambda eid: object() if eid in existing else None))


def entry(options=None, data=None):
    return SimpleNamespace(options=options or {}, data=data or {})


class EnergyEntityTests(unittest.TestCase):
    def test_option_wins(self):
        self.assertEqual(energy_entity(hass(LEGACY), entry({"ecs_cop_energy_entity": "sensor.m"})), "sensor.m")

    def test_empty_option_disables_even_with_legacy(self):
        self.assertEqual(energy_entity(hass(LEGACY), entry({"ecs_cop_energy_entity": ""})), "")

    def test_config_data_used_without_option(self):
        self.assertEqual(energy_entity(hass(), entry(data={"ecs_cop_energy_entity": "sensor.d"})), "sensor.d")

    def test_legacy_only_when_it_exists(self):
        self.assertEqual(energy_entity(hass(LEGACY), entry()), LEGACY)
        self.assertEqual(energy_entity(hass(), entry()), "")


if __name__ == "__main__":
    unittest.main()
