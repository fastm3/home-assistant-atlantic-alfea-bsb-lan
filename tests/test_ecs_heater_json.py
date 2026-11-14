"""Contract tests for read-only ECS 8821 parsing, without HA installation."""

import ast
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller/ecs_heater_json.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
PARSER = next(n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "parse_heater_response")
NAMESPACE = {}
exec(compile(ast.Module(body=[PARSER], type_ignores=[]), str(SOURCE), "exec"), NAMESPACE)
parse = NAMESPACE["parse_heater_response"]


class TestEcs8821Json(unittest.TestCase):
    def test_disabled_matches_real_response(self):
        self.assertIs(parse({"8821": {"error": 0, "dataType_name": "ONOFF", "value": "0"}}), False)

    def test_enabled(self):
        self.assertIs(parse({"8821": {"error": 0, "dataType_name": "ONOFF", "value": "1"}}), True)

    def test_invalid_and_error_unavailable(self):
        for data in ({}, None, {"8821": {"error": 1, "dataType_name": "ONOFF", "value": "1"}},
                     {"8821": {"error": 0, "dataType_name": "ONOFF", "value": "2"}},
                     {"8821": {"error": 0, "dataType_name": "OTHER", "value": "1"}}):
            with self.subTest(data=data):
                self.assertIsNone(parse(data))

    def test_polling_never_writes_to_bsb(self):
        source = SOURCE.read_text(encoding="utf-8")
        poller = (SOURCE.parent / "json_poller.py").read_text(encoding="utf-8")
        self.assertIn("HEATER_PARAMETER = 8821", source)
        self.assertIn("HEATER_PARAMETER", poller)
        self.assertIn("client.get_jq(wanted)", poller)
        self.assertIn("is_covered(hass, entry, p, FAST)", poller)
        for text in (source, poller):
            self.assertNotIn("/JS", text)
            self.assertNotIn("post_js(", text)


if __name__ == "__main__":
    unittest.main()
