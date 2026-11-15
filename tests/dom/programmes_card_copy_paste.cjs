const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(require("path").join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-programmes-card.js"), "utf8"));
const card = w.document.createElement("pac-programmes-card");
w.document.body.appendChild(card);
card.setConfig({});
const jours = { lundi: [{ debut: "06:00", fin: "08:00" }, { debut: "17:00", fin: "22:00" }], mardi: [{ debut: "10:00", fin: "17:30" }],
  mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: [] };
card.hass = { services: { atlantic_alfea_controller: { set_weekly_program: {} } }, callService: async () => {},
  states: { "sensor.p": { entity_id: "sensor.p", state: "Chargé", attributes: { parametre_lundi: "501", source: "BSB-LAN JSON /JQ", jours } } } };
const $ = (q) => card.shadowRoot.querySelector(q);
const txt = (d) => [...card.shadowRoot.querySelectorAll(`input[data-day="${d}"]`)].map(i => i.value).join(" ");
$(".edit-btn").click();
// cas 1 : copier lundi, coller mardi (clics successifs)
$('[data-copy="lundi"]').click();
console.log("bouton Coller sur mardi présent :", !!$('[data-paste-day="mardi"]'));
$('[data-paste-day="mardi"]').click();
console.log("cas 1 mardi après coller :", txt("mardi"));
// cas 2 : modifier un champ puis cliquer directement sur Copier (le champ perd le focus => 'change' avant le clic)
const inp = $('input[data-day="mercredi"]') || null;
const f = $('input[data-day="lundi"][data-f="fin"]');
f.focus(); f.value = "09:00";
const btn = $('[data-copy="lundi"]');
// séquence navigateur réelle : mousedown sur le bouton -> blur/change sur le champ -> mouseup -> click
btn.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true }));
f.dispatchEvent(new w.Event("change", { bubbles: true }));
const still = card.shadowRoot.contains(btn);
console.log("cas 2 : le bouton Copier existe encore après le 'change' :", still, "(si false, le clic est perdu)");

// suite cas 2 : le clic aboutit et copie bien la valeur saisie (09:00), puis coller sur jeudi
btn.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
btn.click();
$('[data-paste-day="jeudi"]').click();
console.log("cas 2 jeudi après copier (avec saisie 09:00) + coller :", txt("jeudi"));
if (txt("jeudi") !== "06:00 09:00 17:00 22:00") { console.log("ECHEC cas 2"); process.exit(1); }
console.log("cas 2 OK");
