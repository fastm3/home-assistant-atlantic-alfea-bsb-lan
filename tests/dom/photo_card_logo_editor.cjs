// Éditeur visuel : section « Logo du groupe extérieur » (menu, URL personnalisée, liste éditable) (jsdom)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.eval(`customElements.define("ha-form", class extends HTMLElement {});`);  // ha-form simulé : schéma et données lus tels quels
w.eval(fs.readFileSync(path.join(__dirname, "..", "..", "custom_components", "atlantic_alfea_controller", "www", "pac-synoptique-photo-card.js"), "utf8"));
const ok = (c, m) => { if (!c) { console.log("ECHEC :", m); process.exit(1); } console.log("OK   ", m); };
const tick = () => new Promise((r) => setTimeout(r, 0));
const logos = [{ name: "A", url: "/local/a.svg", box: [424, 694, 80], box_double: [1, 2, 3] }, { name: "B", url: "/local/b.jpg" }];

(async () => {
  const ed = w.document.createElement("pac-synoptique-photo-card-editor");
  w.document.body.appendChild(ed);
  let out = null;
  ed.addEventListener("config-changed", (e) => { out = e.detail.config; });
  const open = async (cfg) => { ed.setConfig({ type: "custom:pac-synoptique-photo-card", ...cfg }); ed.hass = { states: {}, entities: {} }; await tick(); await tick(); return ed.querySelector("ha-form"); };
  const section = (form) => form.schema.find((s) => s.title === "Logo du groupe extérieur").schema;
  const names = (form) => section(form).map((s) => s.name);
  const opts = (form) => section(form)[0].selector.select.options.map((o) => o.value);
  const send = (form, data) => form.dispatchEvent(new w.CustomEvent("value-changed", { detail: { value: data } }));

  let f = await open({});
  ok(names(f).join() === "logo,logos" && opts(f).join() === "aucun,personnalisé", "sans liste : menu Aucun / URL personnalisée, pas de champ URL, liste éditable");
  ok(!f.schema.find((s) => s.title === "Avancé").schema.some((s) => s.name === "logo_url"), "le champ URL n'est plus dans « Avancé »");

  f = await open({ logo_url: "/local/x.png" });
  ok(f.data.logo === "personnalisé" && names(f).includes("logo_url"), "ancienne config (logo_url seul) : « URL personnalisée » sélectionné, champ URL affiché");

  f = await open({ logos, logo: "A" });
  ok(opts(f).join() === "aucun,A,B,personnalisé", "avec liste : Aucun, A, B, URL personnalisée");
  ok(f.data.logos[0].x === 424 && f.data.logos[0].largeur === 80 && f.data.logos[1].x === undefined, "lignes de la liste : box -> x / y / largeur");

  send(f, { ...f.data, logos: [...f.data.logos, { name: "C", url: "/local/c.png", x: 410, y: 660, largeur: 90 }] });
  ok(out.logos.length === 3 && JSON.stringify(out.logos[2].box) === "[410,660,90]" && JSON.stringify(out.logos[0].box_double) === "[1,2,3]" && !out.logos[1].box, "ajout dans la liste : box recomposé, box_double conservé");

  send(f, { ...f.data, logo: "aucun", logo_url: "/local/x.png" });
  ok(!("logo_url" in out) && !("logo" in out), "« Aucun » : logo et URL libre retirés");
  send(f, { ...f.data, logo: "personnalisé", logo_url: "/local/x.png" });
  ok(out.logo === "personnalisé" && out.logo_url === "/local/x.png", "« URL personnalisée » : URL conservée");

  // rendu de la carte avec le choix « URL personnalisée » malgré une liste
  const card = w.document.createElement("pac-synoptique-photo-card");
  w.document.body.appendChild(card);
  card.setConfig({ type: "custom:pac-synoptique-photo-card", show_alarms: false, show_diagnostics: false, show_graphs: false, show_curve: false, logos, logo: "personnalisé", logo_url: "/local/x.png" });
  card.hass = { states: {}, entities: {} };
  ok(card.shadowRoot.querySelector("img.logo")?.getAttribute("src") === "/local/x.png", "carte : URL personnalisée affichée même avec une liste");
  console.log("\nÉditeur du logo OK.");
  process.exit(0);
})();
