// Groupe extérieur double : décors *_double, deux hélices, calque des deux ventilateurs, logo et panneau déplacés (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const base = { type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false,
  logo_url: "/local/logo.png" };
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
const DAY = { "sun.sun": { state: "above_horizon", attributes: {} } };
const show = (cfg, states = DAY) => { card.setConfig({ ...base, ...cfg }); card.hass = { states, entities: {} }; return (q) => card.shadowRoot.querySelector(q); };

let $ = show({});
ok(card.shadowRoot.querySelectorAll(".fanRot").length === 1 && $("#baseImg").src.includes("/jour/base.webp"), "simple : une hélice, décor normal");
ok($("img.layer.ventilateur").src.includes("/calque_ventilateur.webp"), "simple : calque d'un ventilateur");
const topSimple = parseFloat($("img.logo").style.top), extSimple = $("#k_ext").style.getPropertyValue("--y");

$ = show({ outdoor_unit: "double" });
ok(card.shadowRoot.querySelectorAll(".fanRot").length === 2, "double : deux hélices");
ok($("#baseImg").src.includes("/jour_double/base.webp"), "double : décor jour_double");
ok($("img.layer.ventilateur").src.includes("/calque_ventilateur_double.webp"), "double : calque des deux ventilateurs");
ok(parseFloat($("img.logo").style.top) < topSimple - 15, "double : logo remonté sur le bloc du haut (" + $("img.logo").style.top + ")");
ok($("#k_ext").style.getPropertyValue("--y") !== extSimple, "double : panneau Unité extérieure déplacé (" + $("#k_ext").style.getPropertyValue("--y") + ")");

$ = show({ outdoor_unit: "double", weather_entity: "weather.t" }, { "sun.sun": { state: "below_horizon", attributes: {} }, "weather.t": { state: "snowy", attributes: {} } });
ok($("#baseImg").src.includes("/nuit_neige_double/base.webp"), "double + nuit + neige : nuit_neige_double");

$ = show({ outdoor_unit: "double", logo_url: "", logo: "X", logos: [{ name: "X", url: "/local/x.svg", box: [424, 694, 80], box_double: [430, 470, 70] }] });
ok(Math.abs(parseFloat($("img.logo").style.top) - 470 / 1152 * 100) < 0.01, "double : box_double prioritaire");
console.log("\nGroupe double OK.");
process.exit(0);
