"""Offline tests: BSB-LAN log awareness (/JI) and the adaptive poll planner."""
import ast
import importlib.util
from pathlib import Path
import sys
import types
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1] / "custom_components/atlantic_alfea_controller"
PKG = "alfea_test_pkg"


def _stub(name, **attrs):
    module = types.ModuleType(name)
    module.__dict__.update(attrs)
    sys.modules[name] = module
    return module


def _load(name):
    spec = importlib.util.spec_from_file_location(f"{PKG}.{name}", ROOT / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[f"{PKG}.{name}"] = module
    spec.loader.exec_module(module)
    return module


for mod in ("homeassistant", "homeassistant.helpers", "homeassistant.util"):
    _stub(mod)
_stub("homeassistant.config_entries", ConfigEntry=object)
_stub("homeassistant.core", HomeAssistant=object, callback=lambda f: f)
_stub("homeassistant.helpers.dispatcher", async_dispatcher_send=lambda *a: None)
_stub("homeassistant.helpers.event", async_track_time_interval=lambda *a: (lambda: None),
      async_call_later=lambda *a: (lambda: None))
_stub("homeassistant.util.dt", now=lambda: SimpleNamespace(isoformat=lambda **k: "2026-11-14T09:00:00"))
sys.modules["homeassistant.util"].dt = sys.modules["homeassistant.util.dt"]
_stub("homeassistant.components")
_stub("homeassistant.components.mqtt", async_publish=None)
pkg = _stub(PKG)
pkg.__path__ = [str(ROOT)]
_stub(f"{PKG}.bsb_http", entry_client=lambda *a: None)
const = _load("const")
_load("parameters")
logging_mod = _load("bsb_logging")
polling = _load("polling")

# Real /JI answer of the installation (2026-11-14, BSB-LAN 5.0.49).
REAL_JI = {
    "loggingmode": 4, "loginterval": 30,
    "logged": [{"parameter": p, "destination": -1} for p in (
        700, 710, 712, 901, 902, 1000, 1010, 1012, 1201, 1202, 1212, 1600, 1610, 1612,
        3113, 4761, 5061, 5070, 5072, 8000, 8001, 8003, 8006, 8400, 8410, 8411, 8412,
        8413, 8499, 8700, 8703, 8704, 8730, 8735, 8740, 8741, 8743, 8744, 8820, 8821)],
}


def entry_with_all_sources():
    from_specs = {spec.key: f"sensor.x_{spec.parameter}"
                  for spec in sys.modules[f"{PKG}.parameters"].PARAMETER_SPECS}
    return SimpleNamespace(entry_id="e1", data=from_specs, options={})


def hass_with(config):
    store = {} if config is None else {"e1": config}
    return SimpleNamespace(data={const.DOMAIN: {"bsb_log": store}})


class BsbLoggingTests(unittest.TestCase):
    def test_parse_real_ji(self):
        config = logging_mod.parse_log_config(REAL_JI)
        self.assertTrue(config.mqtt)
        self.assertEqual(config.interval, 30)
        self.assertEqual(len(config.parameters), 40)
        self.assertIn(8740, config.parameters)
        self.assertNotIn(8770, config.parameters)

    def test_parse_rejects_garbage(self):
        for data in (None, {}, {"loggingmode": "x", "loginterval": 30, "logged": []},
                     {"loggingmode": 4, "loginterval": 30}):
            self.assertIsNone(logging_mod.parse_log_config(data))

    def test_other_bus_device_is_not_ours(self):
        config = logging_mod.parse_log_config(
            {"loggingmode": 4, "loginterval": 60, "logged": [{"parameter": 8740, "destination": 3}]})
        self.assertNotIn(8740, config.parameters)

    def test_coverage_respects_interval_and_mqtt(self):
        config = logging_mod.parse_log_config(REAL_JI)
        self.assertTrue(config.covers(8740, 60))
        self.assertFalse(config.covers(8770, 60))
        slow = logging_mod.parse_log_config({**REAL_JI, "loginterval": 600})
        self.assertFalse(slow.covers(8740, 60))   # 10 min log is too slow for a 60 s target
        self.assertTrue(slow.covers(3113, 900))
        sd_only = logging_mod.parse_log_config({**REAL_JI, "loggingmode": 1})
        self.assertFalse(sd_only.covers(8740, 60))

    def test_planner_skips_logged_and_json_parameters(self):
        config = logging_mod.parse_log_config(REAL_JI)
        plan = logging_mod.planned_parameters(hass_with(config), entry_with_all_sources(),
                                              frozenset({8770, 8830}))
        for logged in (8740, 8741, 8411, 3113, 700, 1000, 8821):
            self.assertNotIn(logged, plan, logged)
        for json_read in (8770, 8830):
            self.assertNotIn(json_read, plan)
        # Not in the log and not JSON-read: the integration polls them itself.
        self.assertEqual(plan[8771], logging_mod.FAST)
        self.assertEqual(plan[8760], logging_mod.FAST)
        self.assertEqual(plan[8772], logging_mod.MEDIUM)

    def test_planner_falls_back_to_legacy_lists_without_ji(self):
        plan = logging_mod.planned_parameters(hass_with(None), entry_with_all_sources(), frozenset())
        self.assertEqual(plan, logging_mod.LEGACY_TARGETS)

    def test_recommended_log_fits_and_is_fast(self):
        self.assertLessEqual(len(logging_mod.RECOMMENDED_LOG), logging_mod.MAX_LOG_SLOTS)
        for parameter in (8740, 8770, 8830, 8000, 8003, 700, 1000):
            self.assertIn(parameter, logging_mod.RECOMMENDED_LOG)
        self.assertNotIn(1610, logging_mod.RECOMMENDED_LOG)  # setpoints: slow poll

    def test_report_with_recommended_log_needs_no_fast_poll(self):
        config = logging_mod.parse_log_config({
            "loggingmode": 4, "loginterval": logging_mod.RECOMMENDED_LOG_INTERVAL,
            "logged": [{"parameter": p, "destination": -1} for p in logging_mod.RECOMMENDED_LOG]})
        hass, entry = hass_with(config), entry_with_all_sources()
        plan = logging_mod.planned_parameters(hass, entry, frozenset())
        self.assertFalse([p for p, s in plan.items() if s == logging_mod.FAST])
        report = logging_mod.log_report(hass, entry, set())
        self.assertEqual(report["recommandes_manquants"], [])

    def test_due_parameters(self):
        plan = {8771: 60, 3113: 900}
        self.assertEqual(set(polling.due_parameters(plan, {}, 1000.0)), {8771, 3113})
        last = {8771: 1000.0, 3113: 1000.0}
        self.assertEqual(polling.due_parameters(plan, last, 1030.0), ())
        self.assertEqual(polling.due_parameters(plan, last, 1056.0), (8771,))


if __name__ == "__main__":
    unittest.main()
