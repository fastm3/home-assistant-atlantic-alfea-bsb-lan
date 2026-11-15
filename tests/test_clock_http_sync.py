"""PAC clock synchronization through BSB-LAN /JS: refusal detection (status 0) and read-back."""
import ast
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller" / "clock.py"


def _load(name):
    tree = ast.parse(SRC.read_text(encoding="utf-8"))
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
    ns = {}
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SRC), "exec"), ns)
    return ns[name]


js_status = _load("js_status")


class ClockHttpSyncTest(unittest.TestCase):
    def test_status_values(self):
        self.assertEqual(js_status({"0": {"status": 1, "destination": 0}}), 1)
        self.assertEqual(js_status({"0": {"status": 0, "destination": 0}}), 0)   # régulateur qui refuse
        self.assertIsNone(js_status({}))
        self.assertIsNone(js_status("erreur"))
        self.assertIsNone(js_status({"0": {"status": "x"}}))

    def test_source_mentions_refusal_and_readback(self):
        text = SRC.read_text(encoding="utf-8")
        self.assertIn("refusé par le régulateur", text)
        self.assertIn("non appliqué par le régulateur", text)
        self.assertIn("_async_read_back", text)


if __name__ == "__main__":
    unittest.main()
