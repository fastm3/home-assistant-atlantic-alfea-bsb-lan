// Pas des boutons ± des consignes de la carte Programmes (jsdom) : 0,5 °C chauffage, 1 °C ECS, réglables
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-programmes-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jours = {}; for (const d of ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]) jours[d] = [{ debut: "06:00", fin: "22:00" }];
const S = (id, state, attributes) => ({ entity_id: id, state: String(state), attributes });

async function press(config, program, delta) {
  const card = w.document.createElement("pac-programmes-card");
  w.document.body.appendChild(card);
  card.setConfig({ type: "custom:pac-programmes-card", ...config });
  const calls = [];
  card.hass = {
    states: {
      "sensor.prog_c1": S("sensor.prog_c1", "Chargé", { parametre_lundi: "501", source: "BSB-LAN JSON /JQ", jours }),
      "sensor.prog_ecs": S("sensor.prog_ecs", "Chargé", { parametre_lundi: "561", source: "BSB-LAN JSON /JQ", jours }),
      "number.c1_confort_710": S("number.c1_confort_710", "19.5", { min: 5, max: 30 }),
      "number.ecs_confort_1610": S("number.ecs_confort_1610", "48", { min: 40, max: 65 }),
    },
    callService: async (d, s, data) => { calls.push([d, s, data]); },
  };
  card._selected = program; card._render();
  const target = program === "ecs" ? "number.ecs_confort_1610" : "number.c1_confort_710";
  card.shadowRoot.querySelector(`[data-sp="${target}"][data-delta${delta > 0 ? "" : "^='-'"}]${delta > 0 ? ":not([data-delta^='-'])" : ""}`).click();
  await sleep(700);
  return calls.map((c) => c[2].value);
}

(async () => {
  ok(JSON.stringify(await press({}, "chauffage_c1", 1)) === "[20]", "chauffage : + par défaut = 0,5 °C (19,5 -> 20)");
  ok(JSON.stringify(await press({}, "chauffage_c1", -1)) === "[19]", "chauffage : − par défaut = 0,5 °C (19,5 -> 19)");
  ok(JSON.stringify(await press({}, "ecs", 1)) === "[49]", "ECS : + par défaut = 1 °C (48 -> 49)");
  ok(JSON.stringify(await press({ setpoint_step: 0.2 }, "chauffage_c1", 1)) === "[19.7]", "setpoint_step: 0.2 -> 19,7");
  ok(JSON.stringify(await press({ dhw_setpoint_step: "2" }, "ecs", -1)) === "[46]", "dhw_setpoint_step: \"2\" -> 46");
  ok(JSON.stringify(await press({ setpoint_step: 9 }, "chauffage_c1", 1)) === "[20]", "valeur hors plage ignorée -> 0,5 °C");
  console.log("\nPas des consignes OK.");
  process.exit(0);
})();
