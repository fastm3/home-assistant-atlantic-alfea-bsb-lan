"""Diagnostics : résumé /JI de BSB-LAN (version), sans MAC ni numéro de série."""
import ast
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "custom_components" / "atlantic_alfea_controller" / "diagnostics.py"
node = next(n for n in ast.parse(SOURCE.read_text(encoding="utf-8")).body
            if isinstance(n, ast.FunctionDef) and n.name == "bsb_lan_info")
scope: dict = {}
exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), scope)
info = scope["bsb_lan_info"]

JI = {"name": "BSB-LAN", "version": "5.1.42-20261110010249", "hardware": "ESP32", "freeram": 172776,
      "uptime": 55043107, "MAC": "24:0A:C4:00:00:00", "bus": "BSB", "buswritable": 1, "busaddr": 66, "busdest": 0,
      "busdevices": [{"dev_id": 0, "dev_fam": 211, "dev_var": 127, "dev_serial": 4026, "dev_oc": 394037,
                      "dev_name": "RVS21.831F/127"}], "loggingmode": 4, "loginterval": 60}


class DiagBsbLanTest(unittest.TestCase):
    def test_summary(self):
        r = info(JI)
        self.assertEqual(r["version"], "5.1.42-20261110010249")
        self.assertEqual(r["bus_ecriture"], 1)
        self.assertEqual(r["regulateurs"], [{"dev_name": "RVS21.831F/127", "dev_fam": 211, "dev_var": 127}])
        self.assertEqual(r["en_marche_depuis_h"], 15.3)

    def test_no_private_identifiers(self):
        text = repr(info(JI))
        self.assertNotIn("24:0A", text)
        self.assertNotIn("4026", text)

    def test_unreadable(self):
        self.assertEqual(info({}), {"lu": False})
        self.assertEqual(info(None), {"lu": False})


if __name__ == "__main__":
    unittest.main()
