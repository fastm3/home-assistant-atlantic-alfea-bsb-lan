"""Installation layout detection from the BSB configuration (5710/5715/5731/720/1020/741/1041)."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller"


def _load():
    # minimal Home Assistant stubs: only pure functions are exercised
    for name in ("homeassistant", "homeassistant.config_entries", "homeassistant.core", "homeassistant.helpers",
                 "homeassistant.helpers.dispatcher", "homeassistant.helpers.event", "homeassistant.util"):
        sys.modules.setdefault(name, types.ModuleType(name))
    sys.modules["homeassistant.config_entries"].ConfigEntry = object
    core = sys.modules["homeassistant.core"]; core.HomeAssistant = object; core.callback = lambda f: f
    sys.modules["homeassistant.helpers.dispatcher"].async_dispatcher_send = lambda *a: None
    sys.modules["homeassistant.helpers.event"].async_track_time_interval = lambda *a: None
    import datetime
    dtm = types.ModuleType("homeassistant.util.dt"); dtm.now = lambda: datetime.datetime(2026, 11, 15, 21, 0)
    sys.modules["homeassistant.util.dt"] = dtm; sys.modules["homeassistant.util"].dt = dtm
    pkg = types.ModuleType("aac"); pkg.__path__ = [str(ROOT)]; sys.modules["aac"] = pkg
    for sub, attrs in (("bsb_http", {"entry_client": lambda *a: None}), ("const", {"DOMAIN": "atlantic_alfea_controller"})):
        m = types.ModuleType(f"aac.{sub}"); m.__dict__.update(attrs); sys.modules[f"aac.{sub}"] = m
    spec = importlib.util.spec_from_file_location("aac.installation_config", ROOT / "installation_config.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod


ic = _load()


def jq(**values):
    return {str(p): {"error": 0, "value": str(v)} for p, v in values.items()}


def answer(p5710=1, p5711=0, p5715=1, p5716=2, p5731=2, p720=1.0, p1020=0.4, p741=45, p1041=50):
    return {str(k): {"error": 0, "value": str(v)} for k, v in
            {5710: p5710, 5711: p5711, 5715: p5715, 5716: p5716, 5731: p5731, 720: p720, 1020: p1020, 741: p741, 1041: p1041}.items()}


class InstallationConfigTest(unittest.TestCase):
    def test_reference_installation(self):
        # Alfea Duo of the author: C1 radiators (slope 1.0, 45 °C), C2 floor (slope 0.4, 50 °C, cooling)
        layout = ic.parse_installation(answer())
        self.assertEqual(layout["circuit_1_emetteur"], "radiateur")
        self.assertEqual(layout["circuit_2_emetteur"], "plancher")
        self.assertTrue(layout["ecs_presente"])
        self.assertEqual(ic.summary(layout), "C1 radiateur · C2 plancher · ECS")
        self.assertEqual(ic.uncertain(layout), [])
        self.assertEqual(layout["brut"]["5731"]["value"], "2")
        self.assertIn("C2: plancher (rafraîchissement actif", ic.details(layout))

    def test_heating_curve_read_with_configuration(self):
        data = answer()
        data.update(jq(**{"721": 1.5, "730": 17, "740": 20, "750": 50, "1021": 0, "1030": 18, "1040": 15}))
        data["1050"] = {"error": 7, "value": ""}            # paramètre absent du régulateur
        layout = ic.parse_installation(data)
        self.assertEqual(layout["loi_d_eau"]["1"], {"pente": 1.0, "decalage": 1.5, "bascule_ete_hiver": 17.0,
                                                    "t_depart_min": 20.0, "t_depart_max": 45.0, "influence_ambiance": 50.0})
        self.assertIsNone(layout["loi_d_eau"]["2"]["influence_ambiance"])
        self.assertEqual(layout["brut"]["721"]["value"], "1.5")
        for p in (721, 1021, 730, 1030, 740, 1040, 750, 1050):
            self.assertIn(p, ic.READ_PARAMETERS)
        self.assertEqual(len(set(ic.READ_PARAMETERS)), len(ic.READ_PARAMETERS))

    def test_heating_curve_skips_disabled_circuit(self):
        layout = ic.parse_installation(answer(p5715=0))
        self.assertEqual(list(layout["loi_d_eau"]), ["1"])

    def test_cooling_detected_per_circuit(self):
        layout = ic.effective_layout(ic.parse_installation(answer()), {})   # 5711 = 0, 5716 = 2
        self.assertFalse(layout["circuit_1_rafraichissement"])
        self.assertTrue(layout["circuit_2_rafraichissement"])
        self.assertEqual(layout["circuit_2_rafraichissement_source"], "détection")
        self.assertEqual(ic.cooling_circuits(layout), {2})
        self.assertEqual(layout["rafraichissement"], [2])

    def test_cooling_setting_overrides_detection(self):
        detected = ic.parse_installation(answer())
        for choice, expected in (("aucun", set()), ("c1", {1}), ("c1_c2", {1, 2}), ("auto", {2})):
            layout = ic.effective_layout(detected, {ic.OPT_COOLING: choice})
            self.assertEqual(ic.cooling_circuits(layout), expected, choice)
        layout = ic.effective_layout(detected, {ic.OPT_COOLING: "c1"})
        self.assertEqual(layout["circuit_1_rafraichissement_source"], "réglage de l'intégration")
        self.assertTrue(layout["circuit_2_rafraichissement_detecte"])

    def test_no_cooling_on_absent_circuit(self):
        detected = ic.parse_installation(answer(p5715=0))
        self.assertEqual(ic.cooling_circuits(ic.effective_layout(detected, {})), set())
        # forcé « C1 et C2 » mais C2 absent (émetteurs : C1 seul)
        forced = {ic.OPT_COOLING: "c1_c2", ic.OPT_EMITTERS: "c1_radiateur"}
        self.assertEqual(ic.cooling_circuits(ic.effective_layout(detected, forced)), {1})

    def test_unknown_installation_allows_everything(self):
        self.assertIsNone(ic.cooling_circuits(None))
        self.assertIsNone(ic.cooling_circuits(ic.effective_layout(None, {})))
        unreadable = answer()
        del unreadable["5711"]                            # rafraîchissement C1 illisible
        self.assertEqual(ic.cooling_circuits(ic.effective_layout(ic.parse_installation(unreadable), {})), {1, 2})

    def test_cooling_means_floor_even_with_high_tmax(self):
        self.assertEqual(ic.classify_emitter(2, 1.2, 55)[0], "plancher")

    def test_slope_then_tmax(self):
        self.assertEqual(ic.classify_emitter(0, 0.3, 55)[::2], ("plancher", "haute"))
        self.assertEqual(ic.classify_emitter(0, 1.1, 35)[::2], ("radiateur", "haute"))
        self.assertEqual(ic.classify_emitter(0, 0.7, 38)[::2], ("plancher", "moyenne"))
        self.assertEqual(ic.classify_emitter(0, 0.7, 55)[::2], ("radiateur", "moyenne"))
        self.assertEqual(ic.classify_emitter(None, None, None)[::2], (None, "inconnue"))

    def test_uncertain_parts_are_reported(self):
        layout = ic.parse_installation(answer(p5716=0, p1020=0.7, p1041=38))
        self.assertEqual(layout["circuit_2_confiance"], "moyenne")
        self.assertEqual(ic.uncertain(layout), ["circuit 2"])

    def test_single_circuit_without_dhw(self):
        layout = ic.parse_installation(answer(p5715=0, p5716=0, p5731=0, p720=0.35))
        self.assertFalse(layout["circuit_2_present"])
        self.assertIsNone(layout["circuit_2_emetteur"])
        self.assertFalse(layout["ecs_presente"])
        self.assertEqual(ic.summary(layout), "C1 plancher · sans ECS")

    def test_errors_are_unknown(self):
        data = answer(); data["5731"] = {"error": 7, "value": "---"}
        layout = ic.parse_installation(data)
        self.assertIsNone(layout["ecs_presente"])
        self.assertIn("ECS", ic.uncertain(layout))
        self.assertIsNone(ic.parse_installation({}))
        self.assertIsNone(ic.parse_installation("x"))


class InstallationOverridesTest(unittest.TestCase):
    def test_integration_settings_override_detection(self):
        detected = ic.parse_installation(answer())
        eff = ic.effective_layout(detected, {"installation_emetteurs": "c1_plancher", "installation_ecs": "non"})
        self.assertEqual((eff["circuit_1_emetteur"], eff["circuit_2_present"], eff["ecs_presente"]), ("plancher", False, False))
        self.assertEqual(eff["circuit_1_source"], "réglage de l'intégration")
        self.assertEqual(eff["circuit_1_emetteur_detecte"], "radiateur")
        self.assertEqual(eff["configuration"], "c1_plancher")
        self.assertEqual(ic.summary(eff), "C1 plancher · sans ECS")

    def test_auto_keeps_detection(self):
        detected = ic.parse_installation(answer())
        eff = ic.effective_layout(detected, {"installation_emetteurs": "auto", "installation_ecs": "auto"})
        self.assertEqual(eff["configuration"], "c1_radiateur_c2_plancher")
        self.assertEqual(eff["circuit_2_source"], "détection")

    def test_only_drawable_combos(self):
        self.assertEqual(ic.combo_of("plancher", "plancher"), "non_representable")
        self.assertEqual(ic.combo_of("radiateur", None), "c1_radiateur")
        self.assertNotIn("c1_radiateur_c2_radiateur", ic.COMBOS)
        self.assertEqual(ic.overrides({"installation_emetteurs": "nimporte"}), {})

    def test_settings_without_detection(self):
        eff = ic.effective_layout(None, {"installation_emetteurs": "c2_plancher"})
        self.assertEqual((eff["circuit_1_present"], eff["circuit_2_emetteur"]), (False, "plancher"))
        self.assertIsNone(ic.effective_layout(None, {}))


if __name__ == "__main__":
    unittest.main()
