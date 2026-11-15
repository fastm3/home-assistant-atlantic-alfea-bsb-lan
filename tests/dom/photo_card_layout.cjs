// Variantes d'installation : sans ECS, radiateurs seuls, plancher seul (détection + réglage) (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(`customElements.define("ha-form", class extends HTMLElement {});`);
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const tick = () => new Promise((r) => setTimeout(r, 0));
const X = "pac", S = (state, attributes = {}) => ({ state: String(state), attributes });
const full = {
  "sun.sun": S("above_horizon"),
  [`binary_sensor.${X}_comp_etat`]: S("on"), [`binary_sensor.${X}_c1_circulateur`]: S("on"), [`binary_sensor.${X}_c2_circulateur`]: S("on"),
  [`climate.${X}_c1_circuit_1`]: S("heat", { nom_circuit: "Étage" }), [`climate.${X}_c2_circuit_2`]: S("heat", { nom_circuit: "RDC" }),
  [`sensor.${X}_c1_etat_actuel`]: S("Confort"), [`sensor.${X}_c2_etat_actuel`]: S("Confort"),
  [`sensor.${X}_ecs_t_ballon`]: S("48"), [`binary_sensor.${X}_ecs_pompe`]: S("off"), [`sensor.${X}_v3v_commande`]: S("Chauffage"),
};
const ents = (st) => Object.fromEntries(Object.keys(st).map((id) => [id, { entity_id: id, device_id: "d", platform: id.includes(X + "_") ? "atlantic_alfea_controller" : "x" }]));
const base = { type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false };
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
const show = (cfg, states = full) => { card.setConfig({ ...base, ...cfg }); card.hass = { states, entities: ents(states) }; return (q) => card.shadowRoot.querySelector(q); };
const patches = () => [...card.shadowRoot.querySelectorAll("img.patch")].map((i) => i.dataset.patch).sort().join(",");
const on = ($, l) => $(`img.layer.${l}`).classList.contains("on");
const shown = ($, id) => $(id).style.display !== "none";

(async () => {
  let $ = show({});
  ok(patches() === "" && shown($, "#k_c1") && shown($, "#k_c2") && shown($, "#k_ecs"), "installation complète : aucune rustine, tous les panneaux");
  ok($("img.layer.frigo").src.includes("/calque_frigo.webp") && $('path[data-flow="frigo_liquide"]').getAttribute("d").startsWith("M882"), "calque et flux frigo d'origine");

  $ = show({ ecs: "non" });
  ok(patches() === "sans_ecs" && !shown($, "#k_ecs") && !$(".tankfx"), "sans ECS : rustine du ballon, panneau et effets du ballon retirés");
  ok($("img.layer.frigo").src.includes("/calque_frigo_sans_ecs.webp") && $('path[data-flow="frigo_liquide"]').getAttribute("d").startsWith("M915"), "sans ECS : tuyaux frigo redessinés (calque + flux)");
  ok($("img.patch").src.includes("/jour/patch_sans_ecs.webp"), "rustine du décor courant (jour)");

  $ = show({ emitters: "c1_radiateur" });
  ok(patches() === "sans_plancher" && shown($, "#k_c1") && !shown($, "#k_c2"), "radiateurs seuls : plancher remplacé, panneau RDC masqué");
  ok(on($, "c1") && !on($, "c2") && !card.shadowRoot.querySelector('.pump[data-layer="pompe_c2"]').classList.contains("on"), "radiateurs seuls : circuit 1 animé, plancher et circulateur C2 éteints");

  $ = show({ emitters: "c1_plancher" });
  ok(patches() === "sans_radiateur" && !shown($, "#k_c1") && shown($, "#k_c2"), "plancher seul sur C1 : radiateur effacé, panneau au plancher");
  ok($("#k_c2 h3").textContent.includes("Circuit 1") && $("#k_c2 h3").textContent.includes("Étage") && $("#k_c2").dataset.more === "c1_climate", "panneau du plancher relié au circuit 1 (titre, historique)");
  ok(on($, "c2") && !on($, "c1") && !on($, "c1_radiateur"), "plancher animé par le circuit 1, radiateur éteint");

  $ = show({ emitters: "c1_plancher_c2_radiateur" });
  ok(patches() === "" && $("#k_c1 h3").textContent.includes("Circuit 2") && $("#k_c2 h3").textContent.includes("Circuit 1"), "C1 plancher + C2 radiateurs : zones inversées");

  // détection par l'intégration (« Installation - Configuration »)
  const det = { ...full, [`sensor.${X}_installation_configuration`]: S("C1 plancher · sans ECS",
    { circuit_1_present: true, circuit_1_emetteur: "plancher", circuit_2_present: false, ecs_presente: false, lu_le: "2026-11-15T21:00:00" }) };
  $ = show({}, det);
  ok(patches() === "sans_ecs,sans_radiateur" && $("#k_c2 h3").textContent.includes("Circuit 1"), "détection : plancher seul sur C1, sans ECS");
  $ = show({ ecs: "oui", emitters: "c1_radiateur_c2_plancher" }, det);
  ok(patches() === "" && shown($, "#k_ecs"), "réglage de la carte prioritaire sur la détection");

  // éditeur : section Installation avec la valeur détectée
  const ed = w.document.createElement("pac-synoptique-photo-card-editor");
  w.document.body.appendChild(ed);
  ed.setConfig({ type: "custom:pac-synoptique-photo-card" }); ed.hass = { states: det, entities: ents(det) };
  await tick(); await tick();
  const sec = ed.querySelector("ha-form").schema.find((s) => s.title === "Installation").schema;
  const auto = (name) => JSON.stringify(sec).match(new RegExp(`"name":"${name}".*?"label":"(Automatique[^"]*)"`))[1];
  ok(auto("ecs").includes("sans ballon") && auto("emitters").includes("C1 plancher chauffant seul"),
    `éditeur : valeurs détectées affichées (${auto("ecs")} | ${auto("emitters")})`);
  const opts = sec.find((s) => s.name === "emitters").selector.select.options.map((o) => o.value);
  ok(opts.length === 7 && !opts.some((v) => /radiateur.*radiateur|plancher.*plancher/.test(v)), "éditeur : seules les configurations dessinables sont proposées (" + opts.join(", ") + ")");
  // détection non dessinable (deux planchers) : signalée, affichage par défaut
  const two = { ...full, [`sensor.${X}_installation_configuration`]: S("C1 plancher · C2 plancher · ECS",
    { circuit_1_emetteur: "plancher", circuit_2_emetteur: "plancher", ecs_presente: true, lu_le: "x" }) };
  ed.setConfig({ type: "custom:pac-synoptique-photo-card" }); ed.hass = { states: two, entities: ents(two) };
  await tick(); await tick();
  const sec2 = ed.querySelector("ha-form").schema.find((s) => s.title === "Installation").schema;
  ok(JSON.stringify(sec2).includes("non dessinable"), "éditeur : configuration détectée non dessinable signalée");
  $ = show({}, two);
  ok(patches() === "" && $("#k_c1 h3").textContent.includes("Circuit 1") && $("#k_c2 h3").textContent.includes("Circuit 2"), "deux planchers détectés : affichage par défaut (C1, C2) [" + patches() + "|" + $("#k_c1 h3").textContent + "|" + $("#k_c2 h3").textContent + "]");
  console.log("\nVariantes d'installation OK.");
  process.exit(0);
})();
