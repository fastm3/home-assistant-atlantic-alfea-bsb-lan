// pac-synoptique-photo-card : résolution automatique des entités (jsdom, aucun appel HA)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };

// installation fictive : appareil PAC "maison_pac", compteur d'énergie choisi dans les options de l'intégration
const D = "dev_pac", X = "maison_pac";
const reg = (entity_id, device_id, platform = "atlantic_alfea_controller") => ({ entity_id, device_id, platform });
const entities = Object.fromEntries([
  reg(`sensor.${X}_pac_t_exterieure`, D), reg(`binary_sensor.${X}_comp_etat`, D), reg(`sensor.${X}_comp_modulation`, D),
  reg(`climate.${X}_c1_circuit_1`, D), reg(`climate.${X}_c2_circuit_2`, D), reg(`sensor.${X}_ecs_t_ballon`, D),
  reg(`sensor.${X}_ecs_cop_session`, D), reg("sensor.phase_b_four_power", "dev_meter", "shelly"),
  reg("sensor.compteur_pac_energy", "dev_meter", "shelly"), reg("sensor.compteur_pac_power", "dev_meter", "shelly"),
].map((e) => [e.entity_id, e]));
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const states = {
  [`sensor.${X}_pac_t_exterieure`]: S(4.5), [`binary_sensor.${X}_comp_etat`]: S("on"), [`sensor.${X}_comp_modulation`]: S(40),
  [`climate.${X}_c1_circuit_1`]: S("heat", { current_temperature: 20.4, temperature: 21, nom_circuit: "Chambres" }),
  [`climate.${X}_c2_circuit_2`]: S("heat", { current_temperature: 19.8, temperature: 20, nom_circuit: "Séjour" }),
  [`sensor.${X}_ecs_t_ballon`]: S(47.5),
  [`sensor.${X}_ecs_cop_session`]: S(2.1, { energy_entity: "sensor.compteur_pac_energy" }),
  "sensor.compteur_pac_energy": S(1234.5, { unit_of_measurement: "kWh", device_class: "energy" }),
  "sensor.compteur_pac_power": S(812, { unit_of_measurement: "W", device_class: "power" }),
  "sensor.phase_b_four_power": S(68, { unit_of_measurement: "W", device_class: "power" }),  // autre voie du même compteur
};
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
card.setConfig({ type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
card.hass = { states, entities };
const $0 = (q) => card.shadowRoot.querySelector(q);
if (!$0("#p_power").textContent.includes("—")) { console.log("ECHEC : sans power_entity, aucune puissance ne doit être devinée :", $0("#p_power").textContent); process.exit(1); }
console.log("OK    sans entité puissance : « — » (aucune déduction depuis l'appareil du compteur)");
card.setConfig({ type: "custom:pac-synoptique-photo-card", power_entity: "sensor.compteur_pac_power", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
card.hass = { states, entities };
const $ = (q) => card.shadowRoot.querySelector(q);
const stub = w.customElements.get("pac-synoptique-photo-card").getStubConfig({ entities });
ok(stub.device === D && !("energy_entity" in stub), "configuration de départ : appareil PAC détecté, pas d'entité codée en dur");
ok($("#u_ext").textContent.includes("4,5"), "sans appareil configuré : PAC auto-détectée (T ext " + $("#u_ext").textContent + ")");
ok($("#x_en").textContent.includes("1"), "compteur d'énergie repris des options de l'intégration : " + $("#x_en").textContent);
ok($("#p_power").textContent.replace(/\s/g, "") === "812W", "puissance = entité choisie dans la carte : " + $("#p_power").textContent);
ok($("#k_c1 h3 span").textContent === "Chambres" && $("#k_c2 h3 span").textContent === "Séjour", "noms des circuits depuis l'intégration");
ok($("#baseImg").src.startsWith("/alfea-synoptique/pac_synoptique/"), "images servies par l'intégration : " + $("#baseImg").src);
card.setConfig({ type: "custom:pac-synoptique-photo-card", energy_entity: "sensor.autre", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
card.hass = { states: { ...states, "sensor.autre": S(9.9, { unit_of_measurement: "kWh" }) }, entities };
ok($("#x_en").textContent.includes("9,9"), "compteur de la carte prioritaire sur celui de l'intégration");
console.log("\nRésolution des entités OK.");
process.exit(0);
