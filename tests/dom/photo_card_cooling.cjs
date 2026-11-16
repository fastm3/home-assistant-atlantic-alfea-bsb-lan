// Rafraîchissement selon l'installation : bouton « Refroidissement » et diagnostics froid (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const CFG = "sensor.chaufferie_atlantic_alfea_bsb_lan_installation_configuration";
const cfg = (c1, c2) => S("x", { friendly_name: "Atlantic Alfea BSB-LAN Installation - Configuration", circuit_1_rafraichissement: c1, circuit_2_rafraichissement: c2 });
const show = (states) => {
  const tabs = w.document.createElement("pac-photo-tabs");
  w.document.body.appendChild(tabs);
  tabs.setConfig({ show_controls: true, show_diagnostics: true, show_graphs: false, show_curve: false });
  tabs.hass = { states: { "select.pac_mode_global": S("Chauffage", { friendly_name: "Atlantic Alfea BSB-LAN Mode global", options: ["Off", "Chauffage", "Refroidissement"] }), ...states }, themes: {} };
  return tabs.shadowRoot;
};
const coolBtn = (root) => !!root.querySelector('[data-pac-action="global"][data-value="Refroidissement"]');
const diag = (root) => root.textContent;

let root = show({});
ok(coolBtn(root), "installation inconnue : bouton Refroidissement présent");
ok(diag(root).includes("C1 — Rafraîchissement Confort") && diag(root).includes("C2 — Rafraîchissement Confort"), "installation inconnue : diagnostics froid des deux circuits");

root = show({ [CFG]: cfg(false, true) });
ok(coolBtn(root), "C2 seul en froid : bouton Refroidissement présent");
ok(!diag(root).includes("C1 — Rafraîchissement Confort") && diag(root).includes("C2 — Rafraîchissement Confort"), "C2 seul en froid : diagnostics froid du C1 masqués");
ok(diag(root).includes("C1 — Chauffage Confort"), "diagnostics chauffage du C1 conservés");

root = show({ [CFG]: cfg(false, false) });
ok(!coolBtn(root), "sans rafraîchissement : bouton Refroidissement masqué");
ok(!diag(root).includes("Rafraîchissement Confort"), "sans rafraîchissement : aucun diagnostic froid");
console.log("\nRafraîchissement selon l'installation OK.");
process.exit(0);
