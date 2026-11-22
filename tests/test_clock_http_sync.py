"""PAC clock synchronization: MQTT write, /S0!0= URL fallback, repeated read-back."""
import ast
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import re
import sys
import types
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"
CLOCK = ROOT / "clock.py"
HTTP = ROOT / "bsb_http.py"
NAMES = ("format_clock_value", "_async_wait_applied", "async_sync_pac_clock")


class HAError(Exception):
    pass


class FakeClock:
    """Shared fake time: sleeping advances 'now'."""

    def __init__(self, start):
        self.now = start

    async def sleep(self, seconds):
        self.now += timedelta(seconds=seconds)


def build(*, text_entity=True, client=True, mqtt_applies=True, url_applies=True,
          url_accepts=True, pac_start=datetime(2018, 1, 3, 1, 0, 0)):
    clock = FakeClock(datetime(2026, 11, 22, 18, 0, 0))
    state = SimpleNamespace(pac=pac_start, pac_set_at=clock.now, calls=[], remembered={})

    def pac_now():
        return state.pac + (clock.now - state.pac_set_at)

    async def set_value(_hass, entity_id, value):
        state.calls.append(("mqtt", value))
        if mqtt_applies:
            state.pac = datetime.strptime(value, "%d.%m.%Y_%H:%M:%S")
            state.pac_set_at = clock.now

    class Client:
        async def set_clock(self, value):
            state.calls.append(("url", value))
            if url_accepts and url_applies:
                state.pac = datetime.strptime(value, "%d.%m.%Y_%H:%M:%S")
                state.pac_set_at = clock.now
            return url_accepts

    client_obj = Client() if client else None

    async def read_back(_hass, _entry):
        return pac_now() if client else None

    asyncio_mod = types.ModuleType("asyncio")
    asyncio_mod.sleep = clock.sleep
    ns = {
        "HomeAssistant": object, "ConfigEntry": object, "datetime": datetime,
        "HomeAssistantError": HAError,
        "dt_util": SimpleNamespace(now=lambda: clock.now),
        "entry_client": lambda _h, _e: client_obj,
        "clock_source_id": lambda _h, _e: "text.bsb_clock" if text_entity else "sensor.bsb_clock",
        "_WRITABLE_DOMAINS": {"text"},
        "_async_set_value": set_value,
        "_async_read_back": read_back,
        "_remember": lambda _h, _e, **kw: state.remembered.update(kw),
        "_LOGGER": SimpleNamespace(warning=lambda *a, **k: None),
        "CLOCK_TOLERANCE_SECONDS": 20, "CLOCK_CONFIRM_SECONDS": 15, "CLOCK_CONFIRM_STEP_SECONDS": 2,
        "CLOCK_REFUSED_HINT": "HINT écran IHM",
    }
    tree = ast.parse(CLOCK.read_text(encoding="utf-8"))
    nodes = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in NAMES]
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(CLOCK), "exec"), ns)

    def run():
        # The function does `import asyncio` locally: serve the fake module meanwhile.
        # Every awaited object is a fake coroutine, so the coroutine is driven by hand.
        saved = sys.modules["asyncio"]
        sys.modules["asyncio"] = asyncio_mod
        coro = ns["async_sync_pac_clock"](None, SimpleNamespace())
        try:
            coro.send(None)
        except StopIteration as done:
            return done.value
        finally:
            sys.modules["asyncio"] = saved
        raise RuntimeError("la synchronisation a attendu un vrai événement")

    return run, state, ns


class ClockSyncTest(unittest.TestCase):
    def test_format(self):
        _run, _state, ns = build()
        self.assertEqual(ns["format_clock_value"](datetime(2026, 1, 2, 3, 4, 5)), "02.01.2026_03:04:05")

    def test_mqtt_applied_after_a_few_seconds(self):
        run, state, _ = build()
        run()
        self.assertEqual([m for m, _ in state.calls], ["mqtt"])
        self.assertEqual(state.remembered["resultat"], "appliqué (relu)")

    def test_mqtt_not_applied_falls_back_to_url(self):
        run, state, _ = build(mqtt_applies=False)
        run()
        self.assertEqual([m for m, _ in state.calls], ["mqtt", "url"])
        self.assertEqual(state.remembered["resultat"], "appliqué (relu)")
        self.assertIn("/S0!0=", state.remembered["methode"])

    def test_url_used_without_text_entity(self):
        run, state, _ = build(text_entity=False)
        run()
        self.assertEqual([m for m, _ in state.calls], ["url"])

    def test_url_refused_raises(self):
        run, state, _ = build(text_entity=False, url_accepts=False)
        with self.assertRaises(HAError):
            run()
        self.assertEqual(state.remembered["resultat"], "refusé par BSB-LAN")

    def test_not_applied_reports_time_read_on_pac(self):
        run, state, _ = build(mqtt_applies=False, url_applies=False)
        with self.assertRaises(HAError) as ctx:
            run()
        self.assertIn("2018", str(ctx.exception))
        self.assertIn("HINT", str(ctx.exception))
        self.assertEqual(state.remembered["resultat"], "non appliqué par le régulateur")

    def test_mqtt_only_without_http_is_unverified(self):
        run, state, _ = build(client=False)
        run()
        self.assertEqual(state.remembered["resultat"], "commande envoyée (non relue)")

    def test_no_json_write_for_the_clock(self):
        text = CLOCK.read_text(encoding="utf-8")
        self.assertNotIn("post_js", text)
        self.assertNotIn("5.1 ou plus", text)
        self.assertIn("écran de la PAC (IHM)", text)


class SetClockValidationTest(unittest.TestCase):
    def test_value_regex(self):
        source = HTTP.read_text(encoding="utf-8")
        pattern = re.search(r'CLOCK_VALUE_RE = re\.compile\(r"(.+)"\)', source).group(1)
        regex = re.compile(pattern)
        self.assertTrue(regex.fullmatch("22.11.2026_18:00:32"))
        for bad in ("22.11.2026 18:00:32", "22.11.2026_18:00:32&x=1", "../JI", ""):
            self.assertIsNone(regex.fullmatch(bad), bad)
        self.assertIn('"set failed" not in body.lower()', source)
        self.assertIn('f"/S0!0={value}"', source)


if __name__ == "__main__":
    unittest.main()
