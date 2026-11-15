// Logo du groupe extérieur : choix dans la liste `logos`, logo_url de secours, « aucun » (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const base = { type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false };
const logos = [{ name: "A", url: "/local/a.svg" }, { name: "B", url: "/local/b.jpg", box: [414, 658, 102] }];
const card = w.document.createElement("pac-synoptique-photo-card");
w.document.body.appendChild(card);
const show = (cfg) => { card.setConfig({ ...base, ...cfg }); card.hass = { states: {}, entities: {} }; return card.shadowRoot.querySelector("img.logo"); };

ok(!show({}), "sans réglage : aucun logo");
let img = show({ logo_url: "/local/x.png" });
ok(img && img.getAttribute("src") === "/local/x.png" && Math.abs(parseFloat(img.style.width) - 3.516) < 0.01, "logo_url seul : position par défaut (" + (img && img.style.width) + ")");
img = show({ logos, logo: "B" });
ok(img && img.getAttribute("src") === "/local/b.jpg" && Math.abs(parseFloat(img.style.left) - 20.215) < 0.01 && Math.abs(parseFloat(img.style.width) - 4.98) < 0.01, "choix « B » : URL et zone propres au logo (" + (img && [img.getAttribute("src"), img.style.left, img.style.width].join(" ")) + ")");
img = show({ logos, logo: "A", logo_url: "/local/x.png" });
ok(img && img.getAttribute("src") === "/local/a.svg", "le choix dans la liste l'emporte sur logo_url");
ok(!show({ logos, logo: "aucun", logo_url: "/local/x.png" }), "« aucun » avec une liste : pas de logo");
ok(!show({ logos, logo: "inconnu" }), "nom absent de la liste : pas de logo");
console.log("\nLogo OK.");
process.exit(0);
