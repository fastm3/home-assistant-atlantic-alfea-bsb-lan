"""Offline checks for the shared, serialized BSB-LAN HTTP client."""
import ast
from pathlib import Path
from urllib.parse import urlparse
import unittest

ROOT = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller"
SOURCE = (ROOT / "bsb_http.py").read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FUNC = next(n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "valid_base_url")
NS = {"urlparse": urlparse}
exec(compile(ast.Module(body=[FUNC], type_ignores=[]), "bsb_http", "exec"), NS)
valid = NS["valid_base_url"]


class BsbHttpTests(unittest.TestCase):
    def test_valid_base_url(self):
        self.assertTrue(valid("http://192.168.31.53"))
        for bad in ("", "ftp://x", "http://u:p@x", "http://x/?a=1", None):
            with self.subTest(bad=bad):
                self.assertFalse(valid(bad))

    def test_requests_are_serialized(self):
        self.assertIn("async with self._lock:", SOURCE)
        self.assertIn("_MIN_GAP_SECONDS", SOURCE)

    def test_no_module_bypasses_the_shared_client(self):
        for path in ROOT.glob("*.py"):
            if path.name == "bsb_http.py":
                continue
            text = path.read_text(encoding="utf-8")
            with self.subTest(module=path.name):
                self.assertNotIn("async_get_clientsession", text)

    def test_energy_split_ignores_rounded_pac_counters(self):
        sensor = (ROOT / "sensor.py").read_text(encoding="utf-8")
        start = sensor.index("class AlfeaEnergySplitSensor")
        body = sensor[start:sensor.index("_INSTALLATION_REQUIRED", start)]
        for parameter in ("3124", "3125", "3126", "energy_dhw", "energy_heating"):
            self.assertNotIn(f'"{parameter}"', body)
        self.assertIn("TOTAL_INCREASING", body)


if __name__ == "__main__":
    unittest.main()
