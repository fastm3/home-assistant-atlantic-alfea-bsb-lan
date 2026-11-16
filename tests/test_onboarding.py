"""First installation suggestions: PAC power/energy meter and weather entity (pure scoring)."""
import importlib.util
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller" / "onboarding.py"
spec = importlib.util.spec_from_file_location("onboarding", SRC)
ob = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ob)


class OnboardingTest(unittest.TestCase):
    def test_author_meter_is_found(self):
        power = [("sensor.phase_a_diff_pac_power", "Diff PAC Power"), ("sensor.linky_puissance", "Linky"),
                 ("sensor.deye_battery_power", "Batterie"), ("sensor.shelly_garage_power", "Garage")]
        self.assertEqual(ob.best_meter(power), "sensor.phase_a_diff_pac_power")

    def test_bsb_lan_own_sensors_are_ignored(self):
        energy = [("sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_energie_consommee", "ECS - Énergie"),
                  ("sensor.compteur_pompe_a_chaleur_energy", "Compteur pompe à chaleur")]
        self.assertEqual(ob.best_meter(energy), "sensor.compteur_pompe_a_chaleur_energy")

    def test_unclear_gives_nothing(self):
        self.assertIsNone(ob.best_meter([("sensor.prise_salon_power", "Prise salon")]))
        self.assertIsNone(ob.best_meter([("sensor.pac_a_power", "PAC A"), ("sensor.pac_b_power", "PAC B")]))
        self.assertIsNone(ob.best_meter([]))
        self.assertEqual(ob.meter_score("sensor.space_heater_power", "Space"), 0)   # « pac » isolé seulement

    def test_weather(self):
        self.assertEqual(ob.best_weather([("weather.zz", ""), ("weather.forecast_home", "Forecast Home")]), "weather.forecast_home")
        self.assertEqual(ob.best_weather([("weather.sept_freres", "Sept Frères"), ("weather.inoues1", "Inoues")]), "weather.inoues1")
        self.assertIsNone(ob.best_weather([]))


if __name__ == "__main__":
    unittest.main()
