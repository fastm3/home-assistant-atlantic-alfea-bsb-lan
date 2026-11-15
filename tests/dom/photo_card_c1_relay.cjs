// C1 (circuit direct) : le relais QX1 qui suit la charge ECS ne doit pas animer l'étage (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const D = "d", X = "pac", S = (state, attributes = {}) => ({ state: String(state), attributes });
const base = {
  [`binary_sensor.${X}_comp_etat`]: S("on"), [`binary_sensor.${X}_c1_circulateur`]: S("on"),
  [`binary_sensor.${X}_c2_circulateur`]: S("on"), [`binary_sensor.${X}_ecs_pompe`]: S("on"),
  [`climate.${X}_c1_circuit_1`]: S("off"), [`climate.${X}_c2_circuit_2`]: S("heat"), [`sensor.${X}_v3v_commande`]: S("ECS"),
};
const entities = Object.fromEntries(Object.keys(base).map((id) => [id, { entity_id: id, device_id: D, platform: "atlantic_alfea_controller" }]));
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
card.setConfig({ type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
const $ = (q) => card.shadowRoot.querySelector(q);
const on = (layer) => $(`img.layer.${layer}`).classList.contains("on");
const set = (patch) => { card.hass = { states: { ...base, ...patch }, entities }; };

set({});
ok(!on("c1") && !on("c1_radiateur") && !$("#k_c1").classList.contains("active"), "charge ECS + étage en protection : étage non animé malgré QX1");
ok($("#c1_chips").textContent.includes("Pompe PAC (charge ECS)"), "puce explicite : " + $("#c1_chips").textContent);
ok(on("c2") && on("ecs_serpentin"), "C2 (pompe réelle) et serpentin ECS animés");
set({ [`climate.${X}_c1_circuit_1`]: S("heat") });
ok(!on("c1"), "étage en chauffe mais V3V sur l'ECS : pas de flux vers les radiateurs");
set({ [`climate.${X}_c1_circuit_1`]: S("heat"), [`binary_sensor.${X}_ecs_pompe`]: S("off"), [`sensor.${X}_v3v_commande`]: S("Chauffage") });
ok(on("c1") && on("c1_radiateur") && $("#c1_chips").textContent.includes("Circulateur en marche"), "étage en chauffe, V3V sur le chauffage : étage animé");
console.log("\nCircuit 1 / relais QX1 OK.");
process.exit(0);
