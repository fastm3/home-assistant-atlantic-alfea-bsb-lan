"""Thermostat setpoint: native override only when offset/duration entities are writable."""
import ast
import asyncio
import unittest
from pathlib import Path
from types import SimpleNamespace

SOURCE = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller" / "climate.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
cls = next(n for n in TREE.body if isinstance(n, ast.ClassDef) and n.name == "AlfeaCircuitClimate")
methods = [n for n in cls.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
           and n.name in ("async_set_temperature", "_native_override_writable")]


class HAError(Exception):
    pass


PARAM = {2: {"override_offset": ("override_offset_c2", 10993), "override_duration": ("override_duration_c2", 10992),
             "effective_setpoint": 8771}}
namespace = {"HomeAssistantError": HAError, "MODE_OFF": "off", "MODE_HEAT": "heat", "MODE_COOL": "cool",
             "_PARAM": PARAM, "state_float": lambda hass, eid: 20.0, "round_temperature_step": lambda v, s: v,
             "TEMPERATURE_STEP": 0.5}
exec(compile(ast.Module(body=methods, type_ignores=[]), str(SOURCE), "exec"), namespace)


class Circuit:
    def __init__(self, entities):
        self._circuit = 2
        self.entities = entities
        self.hass = SimpleNamespace(states=SimpleNamespace(get=lambda eid: object() if eid in entities.values() else None))
        self.calls = []
        self._pending_base_temperature = None

    _native_override_writable = namespace["_native_override_writable"]
    async_set_temperature = namespace["async_set_temperature"]

    def _mode(self): return "heat"
    def _circuit_in_protection(self, mode): return False
    def _override_state(self): return False, 1, "…"          # 1001 lisible, pas de dérogation
    def _source(self, key, parameter=None): return self.entities.get(key)

    async def _async_write_programmed_setpoint(self, temperature):
        self.calls.append(("consigne", temperature))


class SetpointPathTest(unittest.TestCase):
    def test_without_offset_entities_writes_comfort_setpoint(self):
        circuit = Circuit({})                                   # BSB-LAN sans 10990-10993
        asyncio.run(circuit.async_set_temperature(temperature=21.0))
        self.assertEqual(circuit.calls, [("consigne", 21.0)])

    def test_read_only_offset_falls_back(self):
        circuit = Circuit({"override_offset_c2": "sensor.ecart", "override_duration_c2": "number.duree"})
        self.assertFalse(circuit._native_override_writable())

    def test_writable_entities_enable_native_override(self):
        circuit = Circuit({"override_offset_c2": "number.ecart", "override_duration_c2": "number.duree"})
        self.assertTrue(circuit._native_override_writable())


if __name__ == "__main__":
    unittest.main()
