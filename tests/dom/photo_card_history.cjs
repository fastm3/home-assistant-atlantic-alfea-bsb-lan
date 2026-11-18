// Clic sur un panneau : popup d'historique (carte history-graph de HA) avec les entités du panneau (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const tick = () => new Promise((r) => setTimeout(r, 0));

// carte history-graph simulée (loadCardHelpers de HA)
let made = [];
w.loadCardHelpers = async () => ({ createCardElement: async (conf) => { const el = w.document.createElement("div"); el.className = "fake-hist"; el.conf = conf; made.push(el); return el; } });

const X = "pac", S = (state, attributes = {}) => ({ state, attributes });
const states = {
  [`sensor.${X}_pac_t_exterieure`]: S("6.5"), [`binary_sensor.${X}_comp_etat`]: S("on"), [`sensor.${X}_comp_modulation`]: S("40"),
  [`binary_sensor.${X}_pac_degivrage_di6`]: S("off"), [`sensor.${X}_pac_t_depart`]: S("35"), [`sensor.${X}_pac_t_retour`]: S("30"),
  [`climate.${X}_c1_circuit_1`]: S("heat", { current_temperature: 20, temperature: 21, nom_circuit: "Étage" }),
  [`binary_sensor.${X}_c1_circulateur`]: S("on"), [`sensor.${X}_c1_etat_actuel`]: S("Confort"),
  [`sensor.${X}_ecs_t_ballon`]: S("48"), [`water_heater.${X}_eau_chaude_sanitaire`]: S("eco", { temperature: 52 }),
  "sensor.compteur_power": S("800", { device_class: "power" }),
};
const entities = Object.fromEntries(Object.keys(states).map((id) => [id, { entity_id: id, device_id: id.includes(X + "_") ? "d" : "o", platform: id.includes(X + "_") ? "atlantic_alfea_controller" : "x" }]));
const base = { type: "custom:pac-synoptique-photo-card", device: "d", power_entity: "sensor.compteur_power",
  show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false };

(async () => {
  const card = w.document.createElement("pac-synoptique-photo-card");
  w.document.body.appendChild(card);
  let moreInfo = null;
  card.addEventListener("hass-more-info", (e) => { moreInfo = e.detail.entityId; });
  card.setConfig(base); card.hass = { states, entities };
  const $ = (q) => card.shadowRoot.querySelector(q);
  ok($("#hist").hidden, "popup fermé au départ");

  $("#k_ext").click(); await tick(); await tick();
  ok(!$("#hist").hidden && $("#hist_t").textContent === "Unité extérieure", "clic Unité extérieure : popup ouvert, titré");
  const c = made.at(-1).conf;
  ok(c.type === "history-graph" && c.hours_to_show === 24, "carte history-graph, 24 h par défaut");
  ok(JSON.stringify(c.entities.map((e) => e.entity)) === JSON.stringify([`sensor.${X}_pac_t_exterieure`, `sensor.${X}_comp_modulation`, `binary_sensor.${X}_comp_etat`, `binary_sensor.${X}_pac_degivrage_di6`]),
    "entités du panneau, absentes ignorées : " + c.entities.map((e) => e.entity).join(", "));
  ok(made.at(-1).hass && $("#hist_body").firstChild === made.at(-1), "carte insérée et alimentée (hass)");

  $('#hist [data-h="48"]').click(); await tick(); await tick();
  ok(made.at(-1).conf.hours_to_show === 48 && $('#hist [data-h="48"]').classList.contains("on"), "bouton 48 h : historique rechargé");
  $('#hist [data-h="1"]').click(); await tick(); await tick();
  ok(made.at(-1).conf.hours_to_show === 1 && $('#hist [data-h="1"]').textContent === "1 h", "bouton 1 h : historique rechargé");

  $('#hist [data-act="close"]').click();
  ok($("#hist").hidden && !$("#hist_body").firstChild, "fermeture (bouton)");

  $("#k_pac").click(); await tick(); await tick();
  ok(made.at(-1).conf.entities.some((e) => e.entity === "sensor.compteur_power") && made.at(-1).conf.hours_to_show === 24, "panneau PAC : puissance incluse, durée revenue à 24 h");
  w.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  ok($("#hist").hidden, "fermeture (Échap)");

  $("#k_c1").click(); await tick(); await tick();
  ok($("#hist_t").textContent === "Circuit 1 · Étage" && made.at(-1).conf.entities[0].entity === `climate.${X}_c1_circuit_1` && made.at(-1).conf.entities.some((e) => e.entity === `sensor.${X}_pac_t_depart`),
    "circuit 1 : nom du circuit, thermostat + départ PAC (circuit direct sans sonde 8743)");
  $('#hist [data-act="more"]').click();
  ok($("#hist").hidden && moreInfo === `climate.${X}_c1_circuit_1`, "bouton fiche : ferme le popup, ouvre la fiche du thermostat");

  $("#hist").hidden = true; moreInfo = null;
  card.setConfig({ ...base, panel_click: "more-info", history_hours: 168 }); card.hass = { states, entities };
  $("#k_ecs").click(); await tick();
  ok(moreInfo === `water_heater.${X}_eau_chaude_sanitaire` && $("#hist").hidden, "panel_click: more-info : fiche directe, pas de popup");
  card.setConfig({ ...base, history_hours: 168 }); card.hass = { states, entities };
  $("#k_ecs").click(); await tick(); await tick();
  ok(made.at(-1).conf.hours_to_show === 168, "history_hours: 168 (7 jours)");
  console.log("\nHistorique des panneaux OK.");
  process.exit(0);
})();
