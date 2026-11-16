"""Read-only native cooling weekly schedule mapping tests (no HA runtime needed)."""
from __future__ import annotations

import ast
from pathlib import Path
import re
import unittest

SOURCE = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "atlantic_alfea_controller"
    / "weekly_programs.py"
)
TEXT = SOURCE.read_text(encoding="utf-8")
TREE = ast.parse(TEXT)


def load_literal(name):
    for node in TREE.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == name
            for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"{name} absent")


def load_function(name, extra=None):
    node = next(
        n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == name
    )
    scope = dict(extra or {})
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), scope)
    return scope[name]


PROGRAMS = load_literal("PROGRAMS")
WEEKDAYS = load_literal("WEEKDAYS")
SCHEMES = {"SCHEME_CONSECUTIVE": load_literal("SCHEME_CONSECUTIVE"), "SCHEME_DECIMAL": load_literal("SCHEME_DECIMAL")}
parameter_for_day = load_function("parameter_for_day", {"WEEKDAYS": WEEKDAYS, **SCHEMES})
response_item = load_function("response_item")
js_parameter = load_function("js_parameter")
parse_timeprog = load_function(
    "parse_timeprog",
    {"_SLOT_RE": re.compile(r"(\d{2}:\d{2}|##:##)-(\d{2}:\d{2}|##:##)")},
)


class TestCoolingWeeklyPrograms(unittest.TestCase):
    def test_cooling_has_fourteen_consecutive_parameters(self):
        for key, first in (
            ("rafraichissement_c1", 11000),
            ("rafraichissement_c2", 11010),
        ):
            self.assertEqual(PROGRAMS[key][2], str(first))
            self.assertEqual(
                [parameter_for_day(key, str(first), day) for day in range(7)],
                [str(first + day) for day in range(7)],
            )

    def test_heating_and_dhw_use_consecutive_parameters(self):
        for key, first in (
            ("chauffage_c1", "501"),
            ("chauffage_c2", "521"),
            ("ecs", "561"),
        ):
            self.assertEqual(
                [parameter_for_day(key, first, day) for day in range(7)],
                [str(int(first) + day) for day in range(7)],
            )

    def test_heating_decimal_numbering(self):
        """BSB-LAN numbering 501, 501.1 ... 501.6 (other versions / device lists)."""
        self.assertEqual(
            [parameter_for_day("chauffage_c2", "521", day, "decimal") for day in range(7)],
            ["521"] + [f"521.{day}" for day in range(1, 7)],
        )
        self.assertEqual(js_parameter("501.3"), 501.3)
        self.assertEqual(js_parameter("502"), 502)

    def test_response_item_key_forms(self):
        item = {"error": 0}
        self.assertIs(response_item({"502": item}, "502"), item)
        self.assertIs(response_item({"502.0": item}, "502"), item)
        self.assertIs(response_item({"501.1": item}, "501.1"), item)
        self.assertIsNone(response_item({"501": item}, "502"))
        self.assertIsNone(response_item(None, "502"))

    def test_cooling_failure_is_optional(self):
        self.assertIn('snapshot.status = "Non disponible"', TEXT)
        self.assertIn('key.startswith("rafraichissement_")', TEXT)

    def test_reject_invalid_day(self):
        for day in (-1, 7):
            with self.assertRaises(ValueError):
                parameter_for_day("rafraichissement_c1", "11000", day)

    def test_real_cooling_values_and_inactive_slots(self):
        self.assertEqual(
            parse_timeprog("10:30-20:30 ##:##-##:## ##:##-##:##"),
            [{"debut": "10:30", "fin": "20:30"}],
        )
        self.assertEqual(
            parse_timeprog("11:30-21:30 ##:##-##:## ##:##-##:##"),
            [{"debut": "11:30", "fin": "21:30"}],
        )

    def test_no_write_calls_in_importer(self):
        """L'import (classe WeeklyProgramImporter) ne fait que lire ; l'écriture (2.0.0) est isolée."""
        self.assertIn("client.get_jq(parameter", TEXT)
        self.assertNotIn("session.post(", TEXT)
        importer = next(n for n in TREE.body if isinstance(n, ast.ClassDef) and n.name == "WeeklyProgramImporter")
        self.assertNotIn("post_js(", ast.get_source_segment(TEXT, importer))
        writers = [n.name for n in TREE.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                   and "post_js(" in (ast.get_source_segment(TEXT, n) or "")]
        self.assertEqual(writers, ["_post_with_ack"])

    def test_cooling_programs_are_not_writable(self):
        writable = load_literal("WRITABLE_PROGRAMS")
        self.assertEqual(set(writable), {"chauffage_c1", "chauffage_c2", "ecs"})


if __name__ == "__main__":
    unittest.main()
