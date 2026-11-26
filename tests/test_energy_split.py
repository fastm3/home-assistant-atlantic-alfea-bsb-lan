"""ECS / C1+C2 attribution of the global energy meter."""

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"
_spec = importlib.util.spec_from_file_location("energy_split", ROOT / "energy_split.py")
split = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(split)


class EnergySplitTest(unittest.TestCase):
    def test_dhw_charge_goes_to_ecs(self):
        label = split.classify(dhw_code=96, pac_code=46, compressor_on=True, power_w=2500)
        self.assertEqual(label, split.ECS_CHARGE)
        self.assertTrue(split.is_ecs(label))

    def test_overrun_after_charge_goes_to_ecs(self):
        self.assertTrue(split.is_ecs(split.classify(17, 17, False, 84)))

    def test_resistance_without_pac_request_goes_to_ecs(self):
        # 26/11 09:23-10:01: 1.7 kW, compressor off, 8003=99, 8006=51
        label = split.classify(dhw_code=99, pac_code=51, compressor_on=False, power_w=1715)
        self.assertEqual(label, split.ECS_RESISTANCE)

    def test_heater_state_goes_to_ecs(self):
        self.assertEqual(split.classify(99, 51, False, 1700, heater_on=True), split.ECS_HEATER)

    def test_standby_goes_to_circuits(self):
        self.assertFalse(split.is_ecs(split.classify(99, 51, False, 9.5)))

    def test_heating_with_compressor_goes_to_circuits(self):
        self.assertFalse(split.is_ecs(split.classify(99, 46, True, 2000)))

    def test_backup_heater_during_heating_request_goes_to_circuits(self):
        # electric flow backup: compressor may be off, but the PAC has a request
        self.assertFalse(split.is_ecs(split.classify(99, 49, False, 4000)))

    def test_unknown_power_keeps_previous_behaviour(self):
        self.assertFalse(split.is_ecs(split.classify(99, 51, False, None)))
        self.assertFalse(split.is_ecs(split.classify(None, None, None, None)))


if __name__ == "__main__":
    unittest.main()
