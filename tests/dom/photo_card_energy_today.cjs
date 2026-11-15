// Panneau PAC : énergie du jour (statistiques HA, suivi en direct), total en infobulle (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const tick = () => new Promise((r) => setTimeout(r, 0));
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const states = (kwh) => ({ "sensor.compteur": S(kwh, { unit_of_measurement: "kWh", device_class: "energy" }) });
let calls = [];
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
card.setConfig({ type: "custom:pac-synoptique-photo-card", energy_entity: "sensor.compteur", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
const hass = (kwh, ws) => ({ states: states(kwh), entities: {}, callWS: ws });
const $ = (q) => card.shadowRoot.querySelector(q);

(async () => {
  card.hass = hass(1511.5, async (m) => { calls.push(m); return { change: 12.3 }; });
  await tick(); await tick();
  ok(calls.length === 1 && calls[0].type === "recorder/statistic_during_period" && calls[0].calendar.period === "day" && calls[0].types[0] === "change", "statistique « change » du jour demandée");
  ok($("#x_enk").textContent === "Énergie du jour" && $("#x_en").textContent === "12,3 kWh", "énergie du jour affichée : " + $("#x_en").textContent);
  ok($("#x_en").title.replace(/\s/g, "").includes("1511,5kWh"), "total en infobulle : " + $("#x_en").title);
  card.hass = hass(1512.0, async (m) => { calls.push(m); return { change: 99 }; });
  await tick();
  ok($("#x_en").textContent === "12,8 kWh" && calls.length === 1, "suivi en direct sans nouvelle requête : " + $("#x_en").textContent);
  // statistiques indisponibles : total du compteur
  const card2 = w.document.createElement("pac-synoptique-photo-card"); w.document.body.appendChild(card2);
  card2.setConfig({ type: "custom:pac-synoptique-photo-card", energy_entity: "sensor.compteur", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
  card2.hass = hass(1511.5, async () => { throw new Error("no stats"); });
  await tick(); await tick(); card2.hass = hass(1511.5, async () => { throw new Error("no stats"); });
  const $2 = (q) => card2.shadowRoot.querySelector(q);
  ok($2("#x_enk").textContent === "Énergie" && $2("#x_en").textContent.startsWith("1"), "sans statistiques : total du compteur (" + $2("#x_en").textContent + ")");
  console.log("\nÉnergie du jour OK.");
  process.exit(0);
})();
