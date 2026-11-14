"""Offline test of the 700/901/1000/1201 write confirmation (30 s + MQTT re-poll)."""
import ast
import asyncio
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller/helpers.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
NODES = [n for n in TREE.body if (
    isinstance(n, ast.AsyncFunctionDef) and n.name == "async_write_circuit_mode_confirmed"
) or (isinstance(n, ast.Assign) and any(getattr(t, "id", "") in (
    "CIRCUIT_MODE_PARAMETERS", "MODE_CONFIRM_TIMEOUT_SECONDS") for t in n.targets))]
PROTECTION = "0 - Mode protection"


class Clock:
    def __init__(self):
        self.now = 0.0

    def monotonic(self):
        return self.now

    async def sleep(self, seconds):
        self.now += seconds


def build(clock, hass):
    polling = ModuleType("pkg.polling")

    async def poll(_hass, parameters):
        hass.polls.append(parameters)
        if hass.confirm_on_poll:
            hass.values[hass.entity] = hass.target

    polling.async_poll_parameters = poll
    sys.modules["pkg.polling"] = polling

    async def select(_hass, entity_id, option):
        hass.writes.append((entity_id, option))

    ns = {
        "__name__": "pkg.helpers", "__package__": "pkg",
        "HomeAssistant": object, "ConfigEntry": object,
        "asyncio": SimpleNamespace(sleep=clock.sleep), "time": clock,
        "BSB_PROTECTION": PROTECTION, "MODE_CONFIRM_TIMEOUT_SECONDS": 30.0,
        "async_select_option": select,
        "state_value": lambda _h, eid: hass.values.get(eid),
        "is_protection": lambda v: str(v).startswith("0"),
    }
    sys.modules.setdefault("pkg", ModuleType("pkg"))
    exec(compile(ast.Module(body=NODES, type_ignores=[]), str(SOURCE), "exec"), ns)
    return ns["async_write_circuit_mode_confirmed"]


def make_hass(confirm_on_poll):
    return SimpleNamespace(values={"select.c2": PROTECTION}, writes=[], polls=[],
                           confirm_on_poll=confirm_on_poll, entity="select.c2",
                           target="1 - Automatique")


ENTRY = SimpleNamespace(data={"heat_mode_c2": "select.c2"})


class ModeConfirmationTests(unittest.TestCase):
    def test_slow_feedback_is_confirmed_after_repoll(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=True)
        func = build(clock, hass)
        self.assertTrue(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.polls, [(1000,)])
        self.assertGreater(clock.now, 10.0 - 6.5)  # waited past the first re-poll

    def test_no_feedback_times_out_after_30s(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False)
        func = build(clock, hass)
        self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertGreaterEqual(clock.now, 30.0)
        self.assertGreaterEqual(len(hass.polls), 3)
        self.assertEqual(hass.writes, [("select.c2", "1 - Automatique")])


if __name__ == "__main__":
    unittest.main()
