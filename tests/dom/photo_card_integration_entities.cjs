// Carte sans réglage : météo, puissance et énergie reprises des options de l'intégration (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const X = "pac", S = (state, attributes = {}) => ({ state: String(state), attributes });
const base = { type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false };
const states = (attrs) => ({
  "sun.sun": S("above_horizon"),
  [`sensor.${X}_installation_configuration`]: S("C1 radiateur · C2 plancher · ECS", attrs),
  "weather.maison": S("snowy", { temperature: 1 }), "weather.autre": S("sunny", { temperature: 9 }),
  "sensor.pac_w": S("1234", { unit_of_measurement: "W", device_class: "power" }),
  "sensor.pac_kwh": S("100", { unit_of_measurement: "kWh", device_class: "energy" }),
  "sensor.autre_w": S("50", { unit_of_measurement: "W", device_class: "power" }),
});
const ents = (st) => Object.fromEntries(Object.keys(st).map((id) => [id, { entity_id: id, device_id: id.includes(X + "_") ? "d" : "o", platform: id.includes(X + "_") ? "atlantic_alfea_controller" : "x" }]));
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
const show = (cfg, attrs) => { const st = states(attrs); card.setConfig({ ...base, ...cfg }); card.hass = { states: st, entities: ents(st) }; card.hass = { states: st, entities: ents(st) }; return card; };

show({}, { entite_meteo: "weather.maison", entite_puissance: "sensor.pac_w", entite_energie: "sensor.pac_kwh" });
ok(card._e.weather === "weather.maison" && card._e.power === "sensor.pac_w" && card._e.energy === "sensor.pac_kwh", "carte sans réglage : entités de l'intégration reprises");
ok(card.shadowRoot.querySelector("#baseImg").src.includes("jour_neige"), "météo de l'intégration appliquée au décor (neige)");
ok(card.shadowRoot.querySelector("#x_pw").textContent.replace(/\s/g, "") === "1234W", "puissance de l'intégration affichée : " + card.shadowRoot.querySelector("#x_pw").textContent);
show({ weather_entity: "weather.autre", power_entity: "sensor.autre_w" }, { entite_meteo: "weather.maison", entite_puissance: "sensor.pac_w" });
ok(card._e.weather === "weather.autre" && card._e.power === "sensor.autre_w", "réglage de la carte prioritaire");
show({}, {});
ok(!card._e.weather && !card._e.power, "rien dans l'intégration ni la carte : pas de météo ni de puissance");
ok(card.shadowRoot.querySelector("#x_pwr").style.display === "none" && card.shadowRoot.querySelector("#x_enr").style.display === "none", "sans compteur : lignes Puissance / Énergie masquées");
show({}, { entite_puissance: "sensor.pac_w", entite_energie: "sensor.pac_kwh" });
ok(card.shadowRoot.querySelector("#x_pwr").style.display === "" && card.shadowRoot.querySelector("#x_enr").style.display === "", "avec compteur : lignes affichées");
console.log("\nEntités de l'intégration OK.");
process.exit(0);
