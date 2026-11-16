// Pas des boutons ± dans les commandes de la carte synoptique (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const deltas = (cfg) => {
  const tabs = w.document.createElement("pac-photo-tabs");
  w.document.body.appendChild(tabs);
  tabs.setConfig({ show_controls: true, show_diagnostics: false, show_graphs: false, show_curve: false, ...cfg });
  tabs.hass = { states: { "number.ecs_1610": S("48", { friendly_name: "Atlantic Alféa BSB-LAN ECS - Consigne confort (1610)" }) }, themes: {} };
  const r = tabs.shadowRoot;
  return {
    circuit: [...r.querySelectorAll('[data-pac-action="temp"][data-circuit="1"]')].map((b) => b.dataset.delta).join(" "),
    ecs: [...r.querySelectorAll('[data-pac-action="ecs"]')].map((b) => b.dataset.delta).join(" "),
  };
};
let d = deltas({});
ok(d.circuit === "-0.5 0.5" && d.ecs === "-1 1", `par défaut : circuits ±0,5, ECS ±1 (${d.circuit} | ${d.ecs})`);
d = deltas({ setpoint_step: "0.2", dhw_setpoint_step: 0.5 });
ok(d.circuit === "-0.2 0.2" && d.ecs === "-0.5 0.5", `réglé : circuits ±0,2, ECS ±0,5 (${d.circuit} | ${d.ecs})`);
d = deltas({ setpoint_step: "abc" });
ok(d.circuit === "-0.5 0.5", "valeur invalide -> 0,5");
console.log("\nPas des commandes OK.");
process.exit(0);
