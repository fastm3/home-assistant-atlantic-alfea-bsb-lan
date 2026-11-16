"""BSB parameter matching must ignore decimal sub-parameters (BSB-LAN 5.1: 701.1, 1001.2…)."""
import ast
import re
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller" / "discovery.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
node = next(n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "_matches_parameter")
scope = {"re": re}
exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), scope)
match = scope["_matches_parameter"]


class SubParameterTest(unittest.TestCase):
    def test_main_parameter_matches(self):
        self.assertEqual(match("select.bsb_lan_00_10_heating_circuit_2_1001_warmer_cooler",
                               "BSB-LAN 00-10 Heating circuit 2 - 1001 - Warmer / Cooler", 1001), (True, True))
        self.assertEqual(match("select.bsb_lan_00_08_heating_circuit_1_701_warmer_cooler",
                               "BSB-LAN 00-08 Heating circuit 1 - 701 - Warmer / Cooler", 701), (True, True))

    def test_decimal_subparameters_do_not_match(self):
        for entity, name, parameter in (
            ("select.bsb_lan_00_10_heating_circuit_2_1001_1_temporarily_warmer",
             "BSB-LAN 00-10 Heating circuit 2 - 1001.1 - Temporarily warmer", 1001),
            ("sensor.bsb_lan_00_08_heating_circuit_1_701_2_temporarily_cooler",
             "BSB-LAN 00-08 Heating circuit 1 - 701.2 - Temporarily cooler", 701),
        ):
            self.assertEqual(match(entity, name, parameter), (False, False), entity)

    def test_names_starting_with_digits_still_match(self):
        self.assertEqual(match("sensor.bsb_lan_00_09_cooling_circuit_1_908_flow_setpoint_at_outside_temp_25degc_cc1",
                               "BSB-LAN 00-09 Cooling circuit 1 - 908 - Flow setpoint at outside temp 25°C CC1", 908),
                         (True, True))
        self.assertEqual(match("sensor.bsb_lan_8700_24h_average", "8700 24h average", 8700), (True, True))
        self.assertEqual(match("sensor.bsb_lan_00_31_diagnostics_producer_8700_outside_temp", "x - 8700.", 8700), (True, True))

    def test_other_numbers_do_not_match(self):
        self.assertEqual(match("sensor.bsb_lan_10019_dhw_push", "BSB-LAN 00-33 User defined - 10019 - DHW push", 1001),
                         (False, False))


if __name__ == "__main__":
    unittest.main()
