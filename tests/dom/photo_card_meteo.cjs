// Test simulé météo de pac-synoptique-photo-card (jsdom), aucun appel HA
const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.CSSStyleSheet.prototype.replaceSync = w.CSSStyleSheet.prototype.replaceSync || function () {};
w.eval(fs.readFileSync(require("path").join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const states = {
  "sun.sun": { state: "above_horizon", attributes: {} },
  "weather.mf": { state: "rainy", attributes: { temperature: 9.4, temperature_unit: "°C", humidity: 95, wind_speed: 28.8, wind_speed_unit: "km/h" } },
};
const mk = (cfg) => { const c = w.document.createElement("pac-synoptique-photo-card"); w.document.body.appendChild(c);
  c.setConfig({ type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false, ...cfg });
  c.hass = { states: { ...states }, entities: {} }; return c; };
const $ = (c, q) => c.shadowRoot.querySelector(q), $$ = (c, q) => c.shadowRoot.querySelectorAll(q);

let c = mk({});
ok($(c, "#wx").hidden, "sans entité météo : pas de widget");
ok($(c, "#baseImg").src.includes("/jour/base.webp"), "sans entité météo : fond jour normal " + $(c, "#baseImg").src);
ok($$(c, "#wxfx *").length === 0, "sans entité météo : aucun effet");

c = mk({ weather_entity: "weather.mf" });
ok(!$(c, "#wx").hidden && $(c, "#wx_t").textContent === "9,4°C" && $(c, "#wx_l").textContent === "Pluie", "widget : " + $(c, "#wx").textContent.replace(/\s+/g, " "));
ok($(c, "#wx_d").textContent === "Vent 29 km/h · 95 %", "détail : " + $(c, "#wx_d").textContent);
ok($(c, "#wx_i").getAttribute("icon") === "mdi:weather-rainy", "icône pluie");
ok($(c, "#baseImg").src.includes("/jour_pluie/base.webp") && $(c, "#hazeImg").getAttribute("href").includes("jour_pluie"), "fond synchronisé jour_pluie");
ok($(c, "img.layer.c1").src.includes("/jour/calque_c1"), "calques gardés depuis jour/");
ok($$(c, "#wxfx .drop").length === 110 && $$(c, "#wxfx .gust").length === 0, "pluie animée (110 gouttes), vent < 30 km/h : pas de rafales");

// vent fort + neige + nuit
c.hass = { states: { ...states, "sun.sun": { state: "below_horizon" }, "weather.mf": { state: "snowy", attributes: { temperature: -1, wind_speed: 12, wind_speed_unit: "m/s" } } }, entities: {} };
ok($(c, "#baseImg").src.includes("/nuit_neige/"), "nuit + neige -> nuit_neige");
ok($$(c, "#wxfx .flake").length === 130 && $$(c, "#wxfx .gust").length === 9, "neige + vent 43 km/h -> flocons + rafales");
ok($(c, "#wx_d").textContent.startsWith("Vent 43 km/h"), "conversion m/s -> km/h : " + $(c, "#wx_d").textContent);

// brouillard, options désactivées
c = mk({ weather_entity: "weather.mf", weather_sync: false, weather_anim: false, show_weather: false });
c.hass = { states: { ...states, "weather.mf": { state: "fog", attributes: {} } }, entities: {} };
ok($(c, "#wx").hidden && $(c, "#baseImg").src.includes("/jour/base") && $$(c, "#wxfx *").length === 0, "options off : ni widget, ni fond météo, ni effets");

c = mk({ weather_entity: "weather.mf" });
c.hass = { states: { ...states, "weather.mf": { state: "fog", attributes: {} } }, entities: {} };
ok($(c, "#baseImg").src.includes("/jour_brouillard/") && $$(c, "#wxfx .mist").length === 5, "brouillard : fond + 5 nappes de brume");
c.hass = { states: { ...states, "weather.mf": { state: "windy", attributes: { wind_speed: 50 } } }, entities: {} };
ok($(c, "#baseImg").src.includes("/jour/base") && $$(c, "#wxfx .gust").length === 9, "venteux : fond normal + rafales");
c.hass = { states: { ...states, "weather.mf": { state: "lightning-rainy", attributes: {} } }, entities: {} };
ok($$(c, "#wxfx .flash").length === 1 && $$(c, "#wxfx .drop").length === 190, "orage : averse + éclairs");

// debug : forçage
c = mk({ weather_entity: "weather.mf", debug: true });
const sel = $(c, "#dbg_wx"); ok(!!sel && sel.options.length === 16, "debug : sélecteur météo (" + sel.options.length + " choix)");
sel.value = "snowy"; sel.dispatchEvent(new w.Event("change"));
ok($(c, "#baseImg").src.includes("/jour_neige/") && $(c, "#wx_l").textContent === "Neige", "debug : forçage neige");
sel.value = "clear-night"; sel.dispatchEvent(new w.Event("change"));
ok($(c, "#baseImg").src.includes("/nuit/base") && $(c, "img.layer.c1").src.includes("/nuit/"), "debug : nuit claire -> décor nuit (soleil réel levé)");
sel.value = "sunny"; sel.dispatchEvent(new w.Event("change"));
const ssel = $(c, "#dbg_sun"); ssel.value = "nuit"; ssel.dispatchEvent(new w.Event("change"));
ok($(c, "#baseImg").src.includes("/nuit/base"), "debug : Moment=Nuit prioritaire sur Ensoleillé");
sel.value = "snowy"; sel.dispatchEvent(new w.Event("change"));
ok($(c, "#baseImg").src.includes("/nuit_neige/"), "debug : Moment=Nuit + neige -> nuit_neige");
ssel.value = ""; ssel.dispatchEvent(new w.Event("change"));
ok($(c, "#baseImg").src.includes("/jour_neige/"), "debug : Moment=réel -> retour au soleil réel");
console.log("\nTous les contrôles météo sont passés.");
process.exit(0);
