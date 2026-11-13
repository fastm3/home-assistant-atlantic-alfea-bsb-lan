"""Offline structural checks for the direct room/DHW temperature refresh."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller"


class TemperatureRefreshTests(unittest.TestCase):
    def test_poll_reads_the_three_temperatures_from_json(self):
        source = (ROOT / "temperatures_json.py").read_text(encoding="utf-8")
        ast.parse(source)
        self.assertIn("_TEMPERATURES = (8740, 8770, 8830)", source)
        self.assertIn("/JQ=", source)
        self.assertIn("parse_temperatures_response", source)
        self.assertIn("_temperatures_", source)

    def test_proxy_sensor_prefers_the_direct_value(self):
        source = (ROOT / "sensor.py").read_text(encoding="utf-8")
        self.assertIn('"room_temp_c2": 8770', source)
        self.assertIn("temperature_value(self.hass", source)
        self.assertIn("_temperatures_{self._entry.entry_id}", source)

    def test_setup_starts_temperature_polling(self):
        source = (ROOT / "__init__.py").read_text(encoding="utf-8")
        self.assertIn("async_start_temperature_polling", source)


if __name__ == "__main__":
    unittest.main()
