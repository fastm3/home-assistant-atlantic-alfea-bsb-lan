// Libération ECS (1620) : pastille du panneau de commande et note de la carte Programmes (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const www = path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www");
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const S = (state, attributes = {}) => ({ state: String(state), attributes });
const cfg = (code) => S("x", { friendly_name: "Atlantic Alfea BSB-LAN Installation - Configuration", ecs_liberation_code: code,
  ecs_liberation: { 0: "24 h/24 (programme ECS non utilisé)", 2: "programme ECS" }[code] });

// --- carte synoptique (moteur des onglets)
{
  const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.eval(fs.readFileSync(path.join(www, "pac-synoptique-photo-card.js"), "utf8"));
  const show = (code) => {
    const tabs = w.document.createElement("pac-photo-tabs");
    w.document.body.appendChild(tabs);
    tabs.setConfig({ show_controls: true, show_diagnostics: false, show_graphs: false, show_curve: false });
    const states = { "number.ecs_1610": S("48", { friendly_name: "Atlantic Alféa BSB-LAN ECS - Consigne confort (1610)" }) };
    if (code !== undefined) states["sensor.cfg"] = cfg(code);
    tabs.hass = { states, themes: {} };
    return tabs.shadowRoot.querySelector(".controls")?.textContent || "";
  };
  ok(show(0).includes("Programme ECS non utilisé"), "panneau : 1620 = 24 h/24 -> « Programme ECS non utilisé »");
  ok(show(2).includes("Programme ECS actif"), "panneau : 1620 = programme ECS -> « Programme ECS actif »");
  ok(!show(undefined).includes("Programme ECS"), "panneau : libération inconnue -> rien d'affiché");
}

// --- carte Programmes
{
  const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.eval(fs.readFileSync(path.join(www, "pac-programmes-card.js"), "utf8"));
  const jours = {}; for (const d of ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]) jours[d] = [{ debut: "06:00", fin: "22:00" }];
  const show = (code) => {
    const card = w.document.createElement("pac-programmes-card");
    w.document.body.appendChild(card);
    card.setConfig({ type: "custom:pac-programmes-card" });
    card.hass = { states: {
      "sensor.prog_ecs": { entity_id: "sensor.prog_ecs", ...S("Chargé", { parametre_lundi: "561", source: "BSB-LAN JSON /JQ", jours }) },
      "sensor.prog_c1": { entity_id: "sensor.prog_c1", ...S("Chargé", { parametre_lundi: "501", source: "BSB-LAN JSON /JQ", jours }) },
      "sensor.cfg": { entity_id: "sensor.cfg", ...cfg(code) },
    } };
    card._selected = "ecs"; card._render();
    const ecs = card.shadowRoot.textContent;
    card._selected = "chauffage_c1"; card._render();
    return [ecs, card.shadowRoot.textContent];
  };
  let [ecs, c1] = show(0);
  ok(ecs.includes("Programme ECS non utilisé par la PAC") && ecs.includes("24 h/24"), "Programmes : onglet ECS signale le programme non utilisé");
  ok(!c1.includes("Programme ECS non utilisé"), "Programmes : rien sur l'onglet Chauffage");
  [ecs] = show(2);
  ok(!ecs.includes("non utilisé"), "Programmes : 1620 = programme ECS -> pas d'avertissement");
}
console.log("\nLibération ECS OK.");
process.exit(0);
