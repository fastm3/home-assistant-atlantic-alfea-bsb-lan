"""Unit tests for the internal ECS session COP formula (no HA runtime needed)."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

SOURCE = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "atlantic_alfea_controller"
    / "ecs_cop.py"
)
SPEC = importlib.util.spec_from_file_location("ecs_cop", SOURCE)
assert SPEC and SPEC.loader
ECS_COP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ECS_COP)


class EcsCopFormulaTests(unittest.TestCase):
    def test_existing_session_example(self) -> None:
        result = ECS_COP.compute_ecs_cop(1459.6571, 1460.9473, 50.8, 55.2, 190)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["cop"], 0.75)
        self.assertEqual(result["delta_t"], 4.4)
        self.assertEqual(result["e_elec_kwh"], 1.29)
        self.assertAlmostEqual(result["e_therm_kwh"], 0.9723, places=4)

    def test_volume_is_configurable(self) -> None:
        result = ECS_COP.compute_ecs_cop(100.0, 101.0, 50.0, 55.0, 200)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertAlmostEqual(result["e_therm_kwh"], 1.163, places=4)
        self.assertEqual(result["cop"], 1.16)

    def test_invalid_sessions_are_rejected(self) -> None:
        self.assertIsNone(ECS_COP.compute_ecs_cop(0, 1, 50, 55, 190))
        self.assertIsNone(ECS_COP.compute_ecs_cop(10, 10, 50, 55, 190))
        self.assertIsNone(ECS_COP.compute_ecs_cop(10, 11, 55, 55, 190))
        self.assertIsNone(ECS_COP.compute_ecs_cop(None, 11, 50, 55, 190))
        self.assertIsNone(ECS_COP.compute_ecs_cop(10, 11, 50, 55, 0))


if __name__ == "__main__":
    unittest.main()
