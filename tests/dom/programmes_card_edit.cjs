// Test simulé du mode édition de pac-programmes-card (jsdom) : aucun appel réel vers HA.
const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(fs.readFileSync(require("path").join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-programmes-card.js"), "utf8"));
const card = w.document.createElement("pac-programmes-card");
w.document.body.appendChild(card);
card.setConfig({ type: "custom:pac-programmes-card" });
const jours = {}; for (const d of ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]) jours[d] = [{ debut: "06:00", fin: "22:00" }];
const calls = [];
const hass = {
  services: { atlantic_alfea_controller: { set_weekly_program: {} } },
  states: {
    "sensor.prog_c1": { entity_id: "sensor.prog_c1", state: "Chargé", attributes: { parametre_lundi: "501", source: "BSB-LAN JSON /JQ", jours, nom_circuit: "Etage" } },
    "sensor.prog_c2": { entity_id: "sensor.prog_c2", state: "Chargé", attributes: { parametre_lundi: "521", source: "BSB-LAN JSON /JQ", jours, nom_circuit: "RDC" } },
    "sensor.prog_ecs": { entity_id: "sensor.prog_ecs", state: "Chargé", attributes: { parametre_lundi: "561", source: "BSB-LAN JSON /JQ", jours } },
  },
  callService: async (d, s, data) => { calls.push([d, s, JSON.parse(JSON.stringify(data))]); },
};
card.hass = hass;
const $ = (q) => card.shadowRoot.querySelector(q), $$ = (q) => [...card.shadowRoot.querySelectorAll(q)];
const commit = (i) => { i.dispatchEvent(new w.Event("input")); i.dispatchEvent(new w.Event("change")); i.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter" })); };
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };

ok($$(".tab").map(t => t.textContent.trim()).join(" | ").includes("Chauffage Etage"), "onglets nommés depuis l'intégration : " + $$(".tab").map(t => t.textContent.trim()).join(" | "));
ok(!!$(".edit-btn"), "bouton Modifier présent (service disponible, programme chargé)");
$(".edit-btn").click();
ok(!!$(".edit-tag") && $$("input[data-f]").length === 7 * 2, "mode édition : 7 jours, 2 champs chacun");
ok($('[data-act="review"]').disabled, "Enregistrer désactivé tant que rien n'a changé");

// lundi : 06:00-22:00 -> 06:00-08:00 + ajout 17:00-22:00
let inp = $('input[data-day="lundi"][data-f="fin"]'); inp.value = "8:00"; commit(inp);
ok($('input[data-day="lundi"][data-f="fin"]').value === "08:00", "saisie « 8:00 » normalisée en 08:00");
$('[data-add="lundi"]').click();
let fins = $$('input[data-day="lundi"][data-f="fin"]').map(i => i.value), debs = $$('input[data-day="lundi"][data-f="debut"]').map(i => i.value);
ok(debs.length === 2, "plage ajoutée au lundi : " + debs.map((d, i) => d + "-" + fins[i]).join(", "));
inp = $$('input[data-day="lundi"][data-f="debut"]')[1]; inp.value = "17:00"; commit(inp);
inp = $$('input[data-day="lundi"][data-f="fin"]')[1]; inp.value = "22:00"; commit(inp);

// validation : heure hors pas de 10 min sur mardi
inp = $('input[data-day="mardi"][data-f="debut"]'); inp.value = "06:05"; commit(inp);
ok(!!$(".day.invalid .row-err") && $('[data-act="review"]').disabled, "06:05 refusé (pas de 10 min) et Enregistrer bloqué : " + $(".row-err").textContent);
inp = $('input[data-day="mardi"][data-f="debut"]'); inp.value = "06:00"; commit(inp);
ok(!$(".day.invalid"), "erreur levée après correction");

// copier lundi -> coller Lun-Ven
$('[data-copy="lundi"]').click();
$('[data-paste-group="0"]').click();
// modele "Aucune plage" -> dimanche
$('[data-preset="2"]').click(); $('[data-paste-day="dimanche"]').click();
ok($$(".day.changed").length === 6, "6 jours modifiés (lundi édité, mardi→vendredi collés, dimanche vidé) : " + $$(".day.changed").length);
$('[data-act="review"]').click();
ok(!!$(".confirm") && $$(".confirm li").length === 6, "récapitulatif avant écriture : " + $$(".confirm li").map(l => l.textContent).join(" / "));
ok(calls.length === 0, "aucun appel avant confirmation");
$('[data-act="write"]').click();
setTimeout(() => {
  console.log("Appels envoyés :", JSON.stringify(calls));
  ok(calls.length === 2, "écriture regroupée par jours identiques : 2 appels");
  const g1 = calls.find(c => c[2].days.length > 1), g2 = calls.find(c => c[2].days.includes("dimanche"));
  ok(g1 && g1[2].program === "chauffage_c1" && JSON.stringify(g1[2].days) === '["lundi","mardi","mercredi","jeudi","vendredi"]'
     && JSON.stringify(g1[2].slots) === '[{"debut":"06:00","fin":"08:00"},{"debut":"17:00","fin":"22:00"}]', "groupe Lun–Ven correct");
  ok(g2 && JSON.stringify(g2[2].slots) === "[]", "dimanche sans plage");
  ok(!$(".edit-tag"), "sortie du mode édition après succès");
  // HA n'a pas encore transmis le nouvel état (le faux hass garde l'ancien programme)
  card.hass = { ...hass };
  ok($(".days .ranges").textContent.includes("06:00–08:00") && !!$(".pending"),
     "après écriture, la carte affiche le programme écrit en attendant HA : " + $(".days .ranges").textContent.trim());
  console.log("\nTous les contrôles sont passés.");
}, 100);
