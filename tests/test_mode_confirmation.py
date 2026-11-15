"""Offline test of the 700/901/1000/1201 write confirmation (30 s, MQTT re-poll, HTTP /JS fallback)."""
import ast
import asyncio
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller/helpers.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
NODES = [n for n in TREE.body if (
    isinstance(n, ast.AsyncFunctionDef) and n.name in (
        "async_write_circuit_mode_confirmed", "_async_http_mode_fallback", "_async_refresh_after_mode")
) or (isinstance(n, ast.Assign) and any(getattr(t, "id", "") in (
    "CIRCUIT_MODE_PARAMETERS", "MODE_CONFIRM_TIMEOUT_SECONDS", "MODE_HTTP_FALLBACK_SECONDS", "_BSB_STATUS_RE",
    "MODE_FOLLOWUP_PARAMETERS", "MODE_FOLLOWUP_DELAYS") for t in n.targets))]
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

    # client HTTP BSB-LAN factice : enregistre les /JS et applique la valeur si accepté
    class Client:
        async def post_js(self, payload):
            hass.js.append(payload)
            if hass.js_raises:
                raise OSError("BSB-LAN injoignable")
            if hass.js_status == 1:
                hass.values[hass.entity] = hass.target
            return {str(payload["parameter"]): {"status": hass.js_status, "destination": 0}}

    bsb_http = ModuleType("pkg.bsb_http")
    bsb_http.entry_client = lambda _hass, _entry: Client() if hass.http_configured else None
    sys.modules["pkg.bsb_http"] = bsb_http

    async def select(_hass, entity_id, option):
        hass.writes.append((entity_id, option))

    import logging, re
    ns = {
        "__name__": "pkg.helpers", "__package__": "pkg", "re": re,
        "_LOGGER": logging.getLogger("test_mode_confirmation"),
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


def make_hass(confirm_on_poll, http_configured=False, js_status=1, js_raises=False, mqtt_ok_at=None):
    hass = SimpleNamespace(values={"select.c2": PROTECTION}, writes=[], polls=[], js=[], tasks=[],
                           confirm_on_poll=confirm_on_poll, entity="select.c2",
                           target="1 - Automatique", http_configured=http_configured,
                           js_status=js_status, js_raises=js_raises)
    def create_task(coro):  # tâches de fond : gardées si le test les exécute, sinon fermées
        if getattr(hass, "keep_tasks", False):
            hass.tasks.append(coro)
        else:
            hass.tasks.append(coro.__qualname__)
            coro.close()
    hass.async_create_task = create_task
    return hass


ENTRY = SimpleNamespace(data={"heat_mode_c2": "select.c2"})


class ModeConfirmationTests(unittest.TestCase):
    def test_slow_feedback_is_confirmed_after_repoll(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=True)
        func = build(clock, hass)
        self.assertTrue(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.polls, [(1000,)])
        self.assertGreater(clock.now, 10.0 - 6.5)  # waited past the first re-poll

    def test_mqtt_ignored_http_fallback_confirms(self):
        """Cas réel du 2026-11-15 : MQTT publié mais jamais appliqué, /JS accepté (status 1)."""
        clock, hass = Clock(), make_hass(confirm_on_poll=False, http_configured=True)
        func = build(clock, hass)
        with self.assertLogs("test_mode_confirmation", "INFO") as logs:
            self.assertTrue(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.js, [{"parameter": 1000, "value": "1", "type": 1, "destination": 0}])
        self.assertGreaterEqual(clock.now, 10.0)
        self.assertLess(clock.now, 12.0)
        text = "\n".join(logs.output)
        self.assertIn("renvoi par HTTP /JS", text)
        self.assertIn("accepté par le régulateur", text)

    def test_http_fallback_refused_times_out_with_logs(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False, http_configured=True, js_status=0)
        func = build(clock, hass)
        with self.assertLogs("test_mode_confirmation", "WARNING") as logs:
            self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(len(hass.js), 1)  # un seul renvoi
        self.assertIn("refusé par le régulateur", "\n".join(logs.output))
        self.assertIn("MQTT puis HTTP", "\n".join(logs.output))

    def test_http_unreachable_is_logged(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False, http_configured=True, js_raises=True)
        func = build(clock, hass)
        with self.assertLogs("test_mode_confirmation", "WARNING") as logs:
            self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertIn("renvoi HTTP /JS en échec", "\n".join(logs.output))

    def test_no_http_address_logs_and_keeps_mqtt_only(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False, http_configured=False)
        func = build(clock, hass)
        with self.assertLogs("test_mode_confirmation", "WARNING") as logs:
            self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.js, [])
        self.assertIn("adresse BSB-LAN non configurée", "\n".join(logs.output))
        self.assertIn("(MQTT seul)", "\n".join(logs.output))

    def test_fast_mqtt_confirmation_never_uses_http(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=True, http_configured=True)
        func = build(clock, hass)
        self.assertTrue(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.js, [])
        self.assertLess(clock.now, 10.0)

    def test_confirmed_mode_refreshes_setpoint_and_status(self):
        """Après Auto sur C2, 8771 (consigne effective) et 8001 (état) sont relus tout de suite."""
        clock, hass = Clock(), make_hass(confirm_on_poll=True)
        hass.keep_tasks = True
        func = build(clock, hass)

        async def scenario():
            self.assertTrue(await func(hass, ENTRY, "select.c2", "1 - Automatique"))
            self.assertEqual(len(hass.tasks), 1)  # la commande n'attend pas la relance
            before = clock.now
            await hass.tasks[0]
            return clock.now - before

        waited = asyncio.run(scenario())
        self.assertEqual(hass.polls[-2:], [(8771, 8001), (8771, 8001)])
        self.assertAlmostEqual(waited, 8.0)

    def test_unconfirmed_mode_does_not_refresh(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False)
        func = build(clock, hass)
        self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertEqual(hass.tasks, [])

    def test_no_feedback_times_out_after_30s(self):
        clock, hass = Clock(), make_hass(confirm_on_poll=False)
        func = build(clock, hass)
        self.assertFalse(asyncio.run(func(hass, ENTRY, "select.c2", "1 - Automatique")))
        self.assertGreaterEqual(clock.now, 30.0)
        self.assertGreaterEqual(len(hass.polls), 3)
        self.assertEqual(hass.writes, [("select.c2", "1 - Automatique")])


if __name__ == "__main__":
    unittest.main()
