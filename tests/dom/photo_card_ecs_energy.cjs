// Panneau ECS : énergie de la charge en cours / COP et énergie de la dernière charge (pas le cumul) (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const X = "pac", S = (state, attributes = {}) => ({ state: String(state), attributes });
const sessions = [{ cop: 1.14, e_elec_kwh: 0.949 }, { cop: 1.57, e_elec_kwh: 0.662 }];
const mk = (cop) => ({ [`sensor.${X}_ecs_cop_session`]: cop, [`sensor.${X}_ecs_energie_consommee`]: S("7.3271", { unit_of_measurement: "kWh" }) });
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
card.setConfig({ type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false });
const show = (states) => { const ent = Object.fromEntries(Object.keys(states).map((id) => [id, { entity_id: id, device_id: "d", platform: "atlantic_alfea_controller" }]));
  card.hass = { states, entities: ent }; const $ = (q) => card.shadowRoot.querySelector(q); return [$("#e_enk").textContent + " " + $("#e_en").textContent, $("#e_copk").textContent + " " + $("#e_cop").textContent]; };

let [k, v] = show(mk(S("1.57", { session_active: true, conso_session_kwh: 0.947, sessions })));
ok(k === "Charge en cours 0,95 kWh" && v === "COP charge préc. 1,57", `charge en cours : ${k} | ${v}`);
ok(!(k + v).includes("7,3"), "le cumul ECS n'est pas affiché");
[k, v] = show(mk(S("1.57", { session_active: false, sessions })));
ok(k === "Dernière charge 0,66 kWh" && v === "COP 1,57", `hors charge : ${k} | ${v}`);
[k, v] = show(mk(S("1.4", {})));
ok(k === "Dernière charge —" && v === "COP 1,40", `sans historique de charges : ${k} | ${v}`);
console.log("\nÉnergie ECS OK.");
process.exit(0);
