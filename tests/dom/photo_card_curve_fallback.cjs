// Loi d'eau : capteurs MQTT 720/1020 absents -> valeurs lues par l'intégration (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const CFG = "sensor.chaufferie_atlantic_alfea_bsb_lan_installation_configuration";
const loi = { "1": { pente: 1.2, decalage: 1.5, t_depart_min: 20, t_depart_max: 48, influence_ambiance: 50, bascule_ete_hiver: 17 },
              "2": { pente: 0.4, decalage: 0, t_depart_min: 15, t_depart_max: 40, influence_ambiance: null, bascule_ete_hiver: 18 } };
let tabs;
const show = (states) => {
  tabs = w.document.createElement("pac-photo-tabs");
  w.document.body.appendChild(tabs);
  tabs.setConfig({ show_curve: true, show_diagnostics: false, show_graphs: false });
  tabs.hass = { states, themes: {} };
  tabs.shadowRoot.querySelector('details[data-panel="curve"]').open = true;
  return tabs.shadowRoot.querySelector(".curve-panel");
};

let panel = show({ [CFG]: S("C1 radiateur · C2 plancher", { friendly_name: "Chaufferie Atlantic Alfea BSB-LAN Installation - Configuration", loi_d_eau: loi }) });
ok(panel.querySelectorAll("polyline").length === 2, "deux courbes tracées depuis l'intégration");
const rows = [...panel.querySelectorAll(".curve-table-row")].map((r) => r.textContent.replace(/\s/g, ""));
ok(rows[0].startsWith("C11,201,5°C20,0°C48,0°C50%17,0°C"), "tableau C1 depuis l'intégration : " + rows[0]);
ok(rows[1].includes("0,40") && rows[1].includes("—"), "C2 : influence non lue -> « — » : " + rows[1]);

panel = show({
  [CFG]: S("x", { friendly_name: "Chaufferie Atlantic Alfea BSB-LAN Installation - Configuration", loi_d_eau: loi }),
  "sensor.bsb_lan_720": S("0.9", { friendly_name: "BSB-LAN 00-08 Heating circuit 1 - 720 - Heating curve slope" }),
});
ok([...panel.querySelectorAll(".curve-table-row")][0].textContent.replace(/\s/g, "").startsWith("C10,90"), "capteur MQTT prioritaire sur l'intégration");

panel = show({});
ok(panel.textContent.includes("Loi d’eau indisponible") && panel.textContent.includes("adresse HTTP"), "rien nulle part : message explicite");
console.log("\nRepli loi d'eau OK.");
process.exit(0);
