/* pac-synoptique-photo-card — synoptique photo Alfea Duo (calques lumineux + flux animés)
 * Généré par build_card.py — ne pas éditer FLOWS à la main (relancer build_flows.py + build_card.py)
 */
const VERSION = "2.2.2";
const FLOWS = __FLOWS__;
const DEFAULT_ENTITIES = {};  // tout est résolu depuis l'appareil PAC (ou surchargé par config.entities)
// ---------- résolution des entités depuis l'appareil PAC (intégration atlantic_alfea_controller) ----------
const PAC_PLATFORM = "atlantic_alfea_controller";
const DEVICE_MATCH = {  // clé : [domaine, suffixe de l'entity_id] parmi les entités de l'appareil choisi
  ext_temp: ["sensor", "_pac_t_exterieure"], comp: ["binary_sensor", "_comp_etat"], comp_mod: ["sensor", "_comp_modulation"],
  degivrage: ["binary_sensor", "_pac_degivrage_di6"], pac_etat: ["sensor", "_pac_etat"], mode: ["select", "_mode_global"],
  installation: ["sensor", "_installation_etat"], depart: ["sensor", "_pac_t_depart"], retour: ["sensor", "_pac_t_retour"],
  depart_cible: ["sensor", "_pac_t_depart_cible"], v3v: ["sensor", "_v3v_commande"],
  c1_climate: ["climate", "_c1_circuit_1"], c1_pump: ["binary_sensor", ["_c1_circulateur", "_pompe_primaire_qx1"]], c1_etat: ["sensor", "_c1_etat_actuel"],
  c2_climate: ["climate", "_c2_circuit_2"], c2_pump: ["binary_sensor", "_c2_circulateur"], c2_etat: ["sensor", "_c2_etat_actuel"],
  ecs_temp: ["sensor", "_ecs_t_ballon"], ecs_confort: ["sensor", "_ecs_t_confort"], ecs_heater: ["water_heater", "_eau_chaude_sanitaire"],
  ecs_pump: ["binary_sensor", "_ecs_pompe"], ecs_appoint: ["binary_sensor", "_ecs_appoint_electrique"], ecs_etat: ["sensor", "_ecs_etat"],
  ecs_cop: ["sensor", "_ecs_cop_session"], ecs_energie: ["sensor", "_ecs_energie_consommee"],
};
// départs circuit : paramètres BSB 8743 / 8773, cherchés dans toute l'installation (appareil BSB-LAN générique)
const GLOBAL_MATCH = {
  c1_flow: ["sensor", "_8743_flow_temp_actual_value_heat_circuit_1"],
  c2_flow: ["sensor", "_8773_flow_temp_actual_value_heat_circuit_2"],
};
function autoEntities(hass, device) {
  const out = {};
  if (!hass || !hass.entities) return out;
  const all = Object.values(hass.entities);
  const find = (ids, dom, suf) => [].concat(suf).map((s) => ids.find((id) => id.startsWith(dom + ".") && id.endsWith(s))).find(Boolean);
  if (device) {
    const ids = all.filter((e) => e.device_id === device).map((e) => e.entity_id);
    for (const [k, [dom, suf]] of Object.entries(DEVICE_MATCH)) { const hit = find(ids, dom, suf); if (hit) out[k] = hit; }
  }
  const allIds = all.map((e) => e.entity_id);
  for (const [k, [dom, suf]] of Object.entries(GLOBAL_MATCH)) { const hit = find(allIds, dom, suf); if (hit) out[k] = hit; }
  return out;
}
function resolveEntities(hass, config) {
  const custom = Object.fromEntries(Object.entries(config.entities || {}).filter(([, v]) => v));  // surcharge YAML (avancé)
  const r = { ...DEFAULT_ENTITIES, ...autoEntities(hass, config.device || findPacDevice(hass)), ...custom };
  // compteur d'énergie : config de la carte, sinon celui choisi dans les options de l'intégration
  // (publié dans l'attribut energy_entity des capteurs ECS)
  const fromIntegration = [r.ecs_cop, r.ecs_energie].map((id) => hass?.states?.[id]?.attributes?.energy_entity).find(Boolean);
  if (config.energy_entity) r.energy = config.energy_entity;
  else if (!custom.energy && fromIntegration) r.energy = fromIntegration;
  // puissance : uniquement l'entité choisie dans la carte (aucune déduction)
  if (config.power_entity) r.power = config.power_entity;
  return r;
}
function findPacDevice(hass) {
  const e = hass && hass.entities && Object.values(hass.entities).find((x) => x.platform === PAC_PLATFORM && x.device_id);
  return e ? e.device_id : undefined;
}

// clic sur un panneau : historique de ses entités (clés résolues ; absentes ignorées)
const PANEL_HISTORY = {
  comp: ["Unité extérieure", ["ext_temp", "comp_mod", "comp", "degivrage"]],
  pac_etat: ["PAC · Échangeurs", ["depart", "retour", "depart_cible", "power", "c1_pump", "pac_etat", "mode"]],
  c1_climate: [null, ["c1_climate", "c1_flow", "depart", "c1_pump", "c1_etat"]],
  c2_climate: [null, ["c2_climate", "c2_flow", "c2_pump", "c2_etat"]],
  ecs_heater: ["ECS · Ballon", ["ecs_temp", "ecs_confort", "ecs_heater", "ecs_pump", "ecs_appoint", "ecs_etat"]],
};
const HIST_HOURS = [6, 24, 48, 168];
const LAYERS = ["frigo", "ventilateur", "module", "c1", "c1_radiateur", "c2", "ecs_serpentin", "ecs_resistance"];
const RADIATOR = [1607, 599, 1852, 734]; // x0,y0,x1,y1 pixels image
const TANK = [920, 546, 1020, 792];   // intérieur de la cuve ECS x0,y0,x1,y1 (pixels image)
const HEATER = [975, 730, 790];       // tige de la résistance : x, haut, bas
const PUMPS = { pompe_primaire: [1018, 393, 15], pompe_c2: [1018, 447, 15] };  // circulateurs du module : x, y, rayon
// groupe extérieur double (deux blocs empilés) : hélices, décalage du logo, panneau remonté
const FANS_DOUBLE = [[303, 562, 96], [303, 784, 96]];
const LOGO_DOUBLE_SHIFT = [-2, -208];  // hors de l'arrondi du coin haut droit du bloc du haut
const LOGO_DOUBLE_SCALE = 0.85;        // panneau lisse plus étroit sur le bloc du haut : logo réduit
const EXT_DOUBLE_POS = [3, 9, 16];
const LOGO_BOX = [428, 688, 72];  // logo du groupe extérieur : x, y, largeur (pixels image), zone lisse en haut à droite
const NO_LOGO = "aucun";
const CUSTOM_LOGO = "personnalisé";  // choix « URL personnalisée » : logo_url
// logo effectif : entrée choisie dans `logos` (liste fournie par l'utilisateur), sinon logo_url / logo_box
function logoFor(c) {
  const list = Array.isArray(c.logos) ? c.logos.filter((l) => l && l.url) : [];
  const pick = c.logo && c.logo !== NO_LOGO ? list.find((l) => l.name === c.logo) : null;
  const dbl = c.outdoor_unit === "double";
  // groupe double : logo en haut à droite du bloc du haut (box_double si fourni, sinon box décalé)
  const place = (box, boxDouble) => {
    const b = Array.isArray(box) && box.length === 3 ? box : LOGO_BOX;
    if (!dbl) return b;
    if (Array.isArray(boxDouble) && boxDouble.length === 3) return boxDouble;
    return [b[0] + LOGO_DOUBLE_SHIFT[0], b[1] + LOGO_DOUBLE_SHIFT[1], Math.round(b[2] * LOGO_DOUBLE_SCALE)];
  };
  if (pick) return { url: pick.url, box: place(pick.box, pick.box_double) };
  // URL libre : choix « URL personnalisée », ou sans liste ni choix (anciennes configurations)
  const free = c.logo === CUSTOM_LOGO || (!list.length && (!c.logo || c.logo === NO_LOGO));
  return free && c.logo_url ? { url: c.logo_url, box: place(c.logo_box, c.logo_box_double) } : null;
}
const FAN = [310, 797, 106]; // centre x, y et rayon de l'helice du groupe exterieur (pixels image)
// zone paysage (jardin + ciel, hors maison et toit) : les effets météo y sont limités
const OUTDOOR = "0,0 575,0 575,95 700,235 700,935 640,950 640,1152 0,1152";
// condition HA -> [libellé, icône mdi, variante d'image (null = fond normal), effet animé]
const WX = {
  "clear-night": ["Nuit claire", "weather-night"], cloudy: ["Nuageux", "weather-cloudy"], exceptional: ["Exceptionnel", "alert-circle-outline"],
  fog: ["Brouillard", "weather-fog", "brouillard", "fog"], hail: ["Grêle", "weather-hail", "pluie", "rain"],
  lightning: ["Orage", "weather-lightning", "pluie", "storm"], "lightning-rainy": ["Orage", "weather-lightning-rainy", "pluie", "storm"],
  partlycloudy: ["Éclaircies", "weather-partly-cloudy"], pouring: ["Averses", "weather-pouring", "pluie", "pour"],
  rainy: ["Pluie", "weather-rainy", "pluie", "rain"], snowy: ["Neige", "weather-snowy", "neige", "snow"],
  "snowy-rainy": ["Pluie et neige", "weather-snowy-rainy", "neige", "sleet"], sunny: ["Ensoleillé", "weather-sunny"],
  windy: ["Venteux", "weather-windy", null, "wind"], "windy-variant": ["Venteux", "weather-windy-variant", null, "wind"],
};
const WIND_KMH = 30;  // au-delà : filets de vent dans le paysage, quelle que soit la condition
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }


// ---------- éditeur visuel ----------
const DEFAULTS = { title: "Alfea Duo", subtitle: "Pompe à chaleur Air/Eau", circuit_1_name: "", circuit_2_name: "",
  image_path: "/alfea-synoptique/pac_synoptique/", image_set: "auto", debug: false,
  weather_entity: "", show_weather: true, weather_sync: true, weather_anim: true, logo_url: "", logo: NO_LOGO, outdoor_unit: "simple", panel_click: "history", history_hours: 24,
  show_controls: false, show_alarms: true, show_diagnostics: true, show_graphs: true, show_curve: true };
const EDITOR_SCHEMA = [
  { name: "device", selector: { device: { integration: PAC_PLATFORM } } },
  { type: "grid", name: "", schema: [
      { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
      { name: "energy_entity", selector: { entity: { domain: "sensor", device_class: "energy" } } }] },
  { type: "grid", name: "", schema: [{ name: "title", selector: { text: {} } }, { name: "subtitle", selector: { text: {} } }] },
  { type: "grid", name: "", schema: [{ name: "circuit_1_name", selector: { text: {} } }, { name: "circuit_2_name", selector: { text: {} } }] },
  { name: "image_set", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique (soleil)" }, { value: "jour", label: "Jour" }, { value: "nuit", label: "Nuit" }] } } },
  { name: "outdoor_unit", selector: { select: { mode: "dropdown", options: [{ value: "simple", label: "Simple (1 ventilateur)" }, { value: "double", label: "Double (2 blocs, 2 ventilateurs)" }] } } },
  { type: "expandable", name: "", flatten: true, title: "Logo du groupe extérieur", icon: "mdi:image-outline", schema: [] },
  { type: "expandable", name: "", flatten: true, title: "Météo", icon: "mdi:weather-partly-snowy-rainy", schema: [
      { name: "weather_entity", selector: { entity: { domain: "weather" } } },
      { type: "grid", name: "", schema: [
        { name: "show_weather", selector: { boolean: {} } }, { name: "weather_sync", selector: { boolean: {} } },
        { name: "weather_anim", selector: { boolean: {} } }] }] },
  { type: "expandable", name: "", flatten: true, title: "Onglets sous l'image", icon: "mdi:tab", schema: [
      { type: "grid", name: "", schema: [
        { name: "show_alarms", selector: { boolean: {} } }, { name: "show_diagnostics", selector: { boolean: {} } },
        { name: "show_graphs", selector: { boolean: {} } }, { name: "show_curve", selector: { boolean: {} } },
        { name: "show_controls", selector: { boolean: {} } }] }] },
  { type: "expandable", name: "", flatten: true, title: "Avancé", icon: "mdi:tune", schema: [
      { name: "debug", selector: { boolean: {} } },
      { type: "grid", name: "", schema: [
        { name: "panel_click", selector: { select: { mode: "dropdown", options: [{ value: "history", label: "Historique des entités du panneau" }, { value: "more-info", label: "Fiche de l'entité principale" }] } } },
        { name: "history_hours", selector: { select: { mode: "dropdown", options: HIST_HOURS.map((h) => ({ value: h, label: h < 48 ? `${h} h` : `${h / 24} jours` })) } } }] },
      { name: "image_path", selector: { text: {} } },
      { name: "positions", selector: { object: {} } }] },
];
const LABELS = {
  device: "Appareil PAC (Atlantic Alfea BSB-LAN)",
  power_entity: "Puissance électrique PAC (W)",
  energy_entity: "Énergie électrique PAC (kWh ; vide = compteur des options de l'intégration)",
  title: "Titre", subtitle: "Sous-titre", circuit_1_name: "Nom du circuit 1 (vide = nom défini dans l'intégration)", circuit_2_name: "Nom du circuit 2 (vide = nom défini dans l'intégration)",
  outdoor_unit: "Groupe extérieur",
  logo: "Logo affiché",
  logo_url: "URL de l'image (ex. /local/pac_logos/mon_logo.svg ; un fond blanc disparaît)",
  logos: "Logos proposés dans le menu",
  image_set: "Jeu d'images", debug: "Boutons de test (debug)", image_path: "Chemin des images",
  show_alarms: "Alarmes et surveillance", show_diagnostics: "Diagnostics et capteurs", show_graphs: "Graphes",
  show_curve: "Loi d'eau", show_controls: "Commandes (mode, consignes)",
  panel_click: "Clic sur un panneau", history_hours: "Durée de l'historique",
  weather_entity: "Entité météo (optionnelle)", show_weather: "Afficher la météo dans le paysage",
  weather_sync: "Fond synchronisé (neige, pluie, brouillard)", weather_anim: "Animations météo (pluie, neige, vent…)",
  positions: "Positions des panneaux [x %, y %, largeur %] (ext, pac, c1, c2, ecs)",
};

class PacSynoptiquePhotoCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  async _ensureForm() {
    if (customElements.get("ha-form")) return;
    try { const h = await window.loadCardHelpers?.(); const c = await h?.createCardElement({ type: "entities", entities: [] }); await c?.constructor?.getConfigElement?.(); } catch (e) { /* ignore */ }
  }
  async _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      await this._ensureForm();
      if (this._form) return;
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] ?? s.title ?? s.name;
      this._form.addEventListener("value-changed", (ev) => {
        const v = { ...ev.detail.value };
        for (const [k, d] of Object.entries(DEFAULTS)) if (v[k] === d || v[k] === "" || v[k] === undefined) delete v[k];
        if (!v.device) delete v.device;
        if (!v.energy_entity) delete v.energy_entity;
        if (!v.power_entity) delete v.power_entity;
        if (v.positions && !Object.keys(v.positions).length) delete v.positions;
        if (v.logo !== CUSTOM_LOGO) delete v.logo_url;  // l'URL libre ne sert qu'au choix « URL personnalisée »
        if (Array.isArray(v.logos)) {  // lignes de l'éditeur (x, y, largeur) -> box ; box_double conservé
          const old = Array.isArray(this._config.logos) ? this._config.logos : [];
          v.logos = v.logos.filter((l) => l && (l.name || l.url)).map((l) => {
            const prev = old.find((o) => o && o.name === l.name) || {};
            const e = { name: String(l.name || "").trim(), url: String(l.url || "").trim() };
            if ([l.x, l.y, l.largeur].every((n) => Number.isFinite(+n) && n !== "" && n != null)) e.box = [+l.x, +l.y, +l.largeur];
            if (prev.box_double) e.box_double = prev.box_double;
            return e;
          });
          if (!v.logos.length) delete v.logos;
        }
        this._config = { type: this._config.type, ...v };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const all = Array.isArray(this._config.logos) ? this._config.logos.filter((l) => l) : [];
    const logos = all.filter((l) => l.name && l.url);
    // logo affiché : « URL personnalisée » si une URL libre est réglée sans choix explicite (anciennes configurations)
    let logo = this._config.logo || NO_LOGO;
    if (logo === NO_LOGO && this._config.logo_url && !logos.length) logo = CUSTOM_LOGO;
    const num = (label) => ({ label, selector: { number: { mode: "box", min: 0, max: 2048, step: 1 } } });
    const logoSection = [
      { name: "logo", selector: { select: { mode: "dropdown", options: [{ value: NO_LOGO, label: "Aucun" },
        ...logos.map((l) => ({ value: l.name, label: l.name })), { value: CUSTOM_LOGO, label: "URL personnalisée…" }] } } },
      ...(logo === CUSTOM_LOGO ? [{ name: "logo_url", selector: { text: {} } }] : []),
      { name: "logos", selector: { object: { multiple: true, label_field: "name", description_field: "url", fields: {
        name: { label: "Nom (affiché dans le menu)", required: true, selector: { text: {} } },
        url: { label: "URL de l'image (ex. /local/pac_logos/logo.svg)", required: true, selector: { text: {} } },
        x: num("Position x (pixels de l'image, facultatif)"), y: num("Position y (facultatif)"), largeur: num("Largeur (facultatif)") } } } },
    ];
    this._form.schema = EDITOR_SCHEMA.map((s) => s.title === "Logo du groupe extérieur" ? { ...s, schema: logoSection } : s);
    this._form.data = { ...DEFAULTS, ...this._config, logo,
      logos: all.map((l) => ({ name: l.name || "", url: l.url || "", ...(Array.isArray(l.box) && l.box.length === 3 ? { x: l.box[0], y: l.box[1], largeur: l.box[2] } : {}) })) };
  }
}
if (!customElements.get("pac-synoptique-photo-card-editor")) customElements.define("pac-synoptique-photo-card-editor", PacSynoptiquePhotoCardEditor);

class PacSynoptiquePhotoCard extends HTMLElement {
  static getConfigElement() { return document.createElement("pac-synoptique-photo-card-editor"); }
  static getStubConfig(hass) { const device = findPacDevice(hass); return device ? { device } : {}; }
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._e = resolveEntities(this._hass, this._config);
    this._built = false;
    if (this._hass) { this._build(); this._update(); }
  }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: "full", rows: "auto" }; }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first || this._entReg !== hass.entities) { this._entReg = hass.entities; this._e = resolveEntities(hass, this._config); }
    const names = this._cname(1) + "|" + this._cname(2);
    if (this._built && names !== this._namesSig) this._built = false;  // un nom a change dans l'integration
    if (!this._built) { this._namesSig = names; this._build(); }
    this._update();
  }

  // ---------- helpers ----------
  _s(key) { const id = this._e[key]; return id && this._hass.states[id]; }
  _v(key) { const s = this._s(key); return s ? s.state : undefined; }
  _on(key) { return this._v(key) === "on"; }
  _num(key, d = 1, unit = "°C") {
    const v = parseFloat(this._v(key));
    return isNaN(v) ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })}${unit ? " " + unit : ""}`;
  }
  _attr(key, a, d = 1, unit = "°C") {
    const s = this._s(key); const v = s ? parseFloat(s.attributes[a]) : NaN;
    return isNaN(v) ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} ${unit}`;
  }
  _more(key) {
    const entityId = this._e[key]; if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
  }
  _histEntities(key) {
    const ids = (PANEL_HISTORY[key]?.[1] || [key]).filter((k) => !(k === "depart" && key === "c1_climate" && this._e.c1_flow))
      .map((k) => this._e[k]).filter((id) => id && this._hass.states[id]);
    return [...new Set(ids)];
  }
  async _history(key) {
    const box = this._root.getElementById("hist"), body = this._root.getElementById("hist_body");
    const entities = this._histEntities(key); if (!entities.length) return this._more(key);
    this._histKey = key;
    const hours = this._histHours || +this._config.history_hours || 24;
    const name = PANEL_HISTORY[key]?.[0] || (key === "c1_climate" ? `Circuit 1 · ${this._cname(1)}` : key === "c2_climate" ? `Circuit 2 · ${this._cname(2)}` : key);
    this._root.getElementById("hist_t").textContent = name;
    box.querySelectorAll("[data-h]").forEach((b) => b.classList.toggle("on", +b.dataset.h === hours));
    box.hidden = false;
    if (!this._onKey) { this._onKey = (e) => { if (e.key === "Escape") this._closeHistory(); }; window.addEventListener("keydown", this._onKey); }
    const conf = { type: "history-graph", entities, hours_to_show: hours };
    let el;
    try { const h = await window.loadCardHelpers?.(); el = h ? await h.createCardElement(conf) : null; } catch (e) { el = null; }
    if (!el) { el = document.createElement("hui-history-graph-card"); el.setConfig?.(conf); }
    el.hass = this._hass;
    body.replaceChildren(el);
    this._hist = el;
  }
  _closeHistory() {
    this._root.getElementById("hist").hidden = true;
    this._root.getElementById("hist_body").replaceChildren();
    this._hist = null; this._histKey = null; this._histHours = null;
    if (this._onKey) { window.removeEventListener("keydown", this._onKey); this._onKey = null; }
  }
  // nom du circuit : config de la carte > option de l'integration (attribut nom_circuit du thermostat) > « Circuit N »
  _cname(n) {
    const own = String(this._config[`circuit_${n}_name`] || "").trim();
    if (own) return own;
    const st = this._hass && this._hass.states[this._e[`c${n}_climate`]];
    return (st && st.attributes && st.attributes.nom_circuit) || `Circuit ${n}`;
  }
  // jeu d'images : « auto » suit sun.sun (nuit sous l'horizon), sinon valeur fixe
  _imgSet() {
    if (this._sunForce) return this._sunForce;                 // debug : moment forcé
    if (this._wxForce === "clear-night") return "nuit";        // debug : la condition implique le moment
    if (this._wxForce === "sunny") return "jour";
    const s = this._config.image_set;
    if (s && s !== "auto") return s;
    const sun = this._hass && this._hass.states["sun.sun"];
    return sun && sun.state === "above_horizon" ? "jour" : "nuit";
  }
  // météo : condition (ou forçage debug), variante d'image, effet animé, vent en km/h
  _wx() {
    const c = this._config, s = c.weather_entity && this._hass && this._hass.states[c.weather_entity];
    const cond = this._wxForce || (s && s.state);
    const info = WX[cond];
    const a = (s && s.attributes) || {};
    let wind = parseFloat(a.wind_speed); const u = String(a.wind_speed_unit || "km/h").toLowerCase();
    if (!isNaN(wind)) wind *= u === "m/s" ? 3.6 : u === "mph" ? 1.609 : (u === "kn" || u === "kt") ? 1.852 : 1;
    if (this._wxForce) wind = /wind/.test(cond) ? 55 : /storm|lightning|pouring/.test(cond) ? 40 : 10;
    const variant = (c.weather_sync && info && info[2]) || null;
    let fx = (c.weather_anim && info && info[3]) || null;
    const windy = !!c.weather_anim && (fx === "wind" || wind >= WIND_KMH);
    if (fx === "wind") fx = null;
    return { s, cond, info, attrs: a, wind: isNaN(wind) ? null : wind, variant, fx, windy };
  }
  _img(name, variant) {
    const set = this._imgSet(), dbl = this._config.outdoor_unit === "double";
    let dir = name === "base" && variant ? `${set}_${variant}` : set;
    if (dbl && name === "base") dir += "_double";
    const file = dbl && name === "calque_ventilateur" ? "calque_ventilateur_double" : name;
    return `${this._config.image_path}${dir}/${file}.webp?v=${VERSION}`;
  }
  _fans() { return this._config.outdoor_unit === "double" ? FANS_DOUBLE : [FAN]; }
  // fond + calques selon jour/nuit et météo, sans reconstruire la carte
  _applyImages(wx) {
    const sig = this._imgSet() + "|" + (wx.variant || "");
    if (sig === this._imgSig) return;
    this._imgSig = sig;
    const r = this._root, base = this._img("base", wx.variant);
    const bi = r.getElementById("baseImg"); if (bi) bi.src = base;
    const hz = r.getElementById("hazeImg"); if (hz) hz.setAttribute("href", base);
    r.querySelectorAll("img.layer").forEach((el) => { el.src = this._img("calque_" + el.dataset.layer); });
  }
  // effets animés limités au paysage (pluie, neige, brume, orage, vent)
  _applyWxFx(wx) {
    const k = Math.max(0, Math.min(1, ((wx.wind || 0) - 15) / 55));
    const sig = `${wx.fx}|${wx.windy}|${Math.round(k * 4)}`;
    if (sig === this._fxSig) return;
    this._fxSig = sig;
    const svg = this._root.getElementById("wxfx"); if (!svg) return;
    const R = rng(1234), parts = [];
    const slant = -(30 + k * 220);  // décalage horizontal de la chute (vent)
    const rain = (n, w) => { for (let i = 0; i < n; i++) {
      const x = R() * 900 - 100, len = 22 + R() * 26, d = 0.55 + R() * 0.35;
      parts.push(`<line class="drop" x1="${x.toFixed(0)}" y1="0" x2="${(x + slant * len / 1250).toFixed(1)}" y2="${len.toFixed(0)}" style="--d:${d.toFixed(2)}s;--dl:${(-R() * d).toFixed(2)}s;--dx:${slant.toFixed(0)}px;stroke-width:${w}"/>`);
    } };
    const snow = (n) => { for (let i = 0; i < n; i++) {
      const x = R() * 900 - 100, r = 1.6 + R() * 3.2, d = 7 + R() * 8, sw = 2.5 + R() * 3;
      parts.push(`<g class="flake" style="--d:${d.toFixed(1)}s;--dl:${(-R() * d).toFixed(1)}s;--dx:${(slant * 0.6).toFixed(0)}px"><circle cx="${x.toFixed(0)}" cy="0" r="${r.toFixed(1)}" style="--sw:${sw.toFixed(1)}s;--sdl:${(-R() * sw).toFixed(1)}s"/></g>`);
    } };
    if (wx.fx === "rain") rain(110, 1.6);
    if (wx.fx === "pour" || wx.fx === "storm") rain(190, 2);
    if (wx.fx === "sleet") { rain(60, 1.4); snow(60); }
    if (wx.fx === "snow") snow(130);
    if (wx.fx === "fog") for (let i = 0; i < 5; i++) {
      const cy = 380 + i * 120 + R() * 60, d = 40 + R() * 40;
      parts.push(`<ellipse class="mist" cx="${(150 + R() * 400).toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(380 + R() * 250).toFixed(0)}" ry="${(55 + R() * 40).toFixed(0)}" style="--d:${d.toFixed(0)}s;--dl:${(-R() * d).toFixed(0)}s"/>`);
    }
    if (wx.fx === "storm") parts.push(`<rect class="flash" x="0" y="0" width="720" height="1152"/>`);
    if (wx.windy) for (let i = 0; i < 9; i++) {
      const y = 180 + i * 85 + R() * 50, amp = 10 + R() * 18, d = (3.2 - k * 1.8) * (0.8 + R() * 0.4);
      parts.push(`<path class="gust" d="M-40,${y.toFixed(0)} C160,${(y - amp).toFixed(0)} 360,${(y + amp).toFixed(0)} 760,${(y - amp / 2).toFixed(0)}" style="--d:${d.toFixed(2)}s;--dl:${(-R() * d).toFixed(2)}s;stroke-width:${(2 + R() * 2.5).toFixed(1)}"/>`);
    }
    if (!parts.length) { svg.innerHTML = ""; return; }
    svg.innerHTML = `<defs><clipPath id="outClip"><polygon points="${OUTDOOR}"/></clipPath>
        <filter id="mistBlur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="28"/></filter>
        <linearGradient id="gustGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <g clip-path="url(#outClip)">${parts.join("")}</g>`;
  }
  // widget météo discret dans le ciel
  _applyWxBadge(wx) {
    const el = this._root.getElementById("wx"); if (!el) return;
    const show = !!(this._config.show_weather && (wx.s || this._wxForce) && wx.cond);
    el.hidden = !show; if (!show) return;
    const a = wx.attrs, t = parseFloat(a.temperature), hum = parseFloat(a.humidity);
    const info = wx.info || [wx.cond, "weather-cloudy"];
    this._root.getElementById("wx_i").setAttribute("icon", "mdi:" + info[1]);
    this._root.getElementById("wx_t").textContent = isNaN(t) ? "" : `${t.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${a.temperature_unit || "°C"}`;
    this._root.getElementById("wx_l").textContent = info[0];
    const det = [];
    if (wx.wind !== null) det.push(`Vent ${Math.round(wx.wind)} km/h`);
    if (!isNaN(hum)) det.push(`${Math.round(hum)} %`);
    this._root.getElementById("wx_d").textContent = det.join(" · ");
  }

  // ---------- build ----------
  _build() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    const c = this._config, wx0 = this._wx();
    this._imgSig = this._fxSig = null;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const flows = Object.entries(FLOWS.flows).map(([k, f]) =>
      `<path class="flow" data-layer="${f.layer}" data-flow="${k}" d="${f.d}" style="--c:${f.color}"/>`).join("");
    // effet chaleur au-dessus du radiateur C1 : air qui ondule (distorsion) + voile chaud + effluves
    // qui montent ; intensité selon la température de départ (--hk, réglée dans _update)
    const [rx0, ry0, rx1, ry1] = RADIATOR, hz = 330, rw = rx1 - rx0, HR = rng(31);
    const ribbons = Array.from({ length: 9 }, (_, i) => {
      const x = rx0 + rw * (0.08 + 0.84 * (i + HR() * 0.6) / 9), a = 10 + HR() * 12, s = HR() < 0.5 ? 1 : -1, d = 3.6 + HR() * 2.2;
      return `<path class="rib" d="M${x.toFixed(0)},${ry0 - 12} C${(x - s * a).toFixed(0)},${ry0 - 55} ${(x + s * a).toFixed(0)},${ry0 - 105} ${x.toFixed(0)},${ry0 - 150} S${(x - s * a * 0.8).toFixed(0)},${ry0 - 215} ${(x + s * 4).toFixed(0)},${ry0 - 250}"
        style="--d:${d.toFixed(2)}s;--dl:${(-HR() * d).toFixed(2)}s;stroke-width:${(8 + HR() * 6).toFixed(1)}"/>`;
    }).join("");
    // ventilateur du groupe exterieur : pales qui tournent (vitesse = modulation) + filets de vent
    const fanParts = this._fans().map(([fx, fy, fr], i) => {
      const blade = `M0,0 C${0.22 * fr},${-0.2 * fr} ${0.68 * fr},${-0.42 * fr} ${0.9 * fr},${-0.1 * fr} C${0.74 * fr},${0.16 * fr} ${0.36 * fr},${0.14 * fr} 0,0 Z`;
      const blades = [0, 120, 240].map((a) => `<path d="${blade}" transform="rotate(${a})"/>`).join("");
      const winds = Array.from({ length: 7 }, (_, k) => {
        const y0 = fy - fr * 0.62 + k * fr * 0.21, j = (k % 2 ? 1 : -1) * fr * 0.12, x0 = fx - fr * 0.15;
        return `<path class="windl" d="M${x0},${y0} C${fx - fr * 1.2},${y0 + j} ${fx - fr * 2.2},${y0 - j} ${fx - fr * 3.4},${y0 + fr * 0.18 + k * 4}" style="stroke-width:${3 + (k % 3) * 1.5}"/>`;
      }).join("");
      return { clip: `<clipPath id="fanClip${i}"><circle cx="${fx}" cy="${fy}" r="${fr * 0.93}"/></clipPath>`,
        body: `<g clip-path="url(#fanClip${i})" style="mix-blend-mode:screen">
        <g class="fanRot" data-cx="${fx}" data-cy="${fy}" fill="rgba(190,200,215,.3)" transform="translate(${fx} ${fy}) rotate(0)">${blades}</g>
        <circle class="fanBlurDisk" cx="${fx}" cy="${fy}" r="${fr * 0.9}" fill="url(#fanBlur)" opacity="0"/>
      </g>`, winds };
    });
    const fan = `<defs>
        ${fanParts.map((p) => p.clip).join("")}
        <radialGradient id="fanBlur"><stop offset=".18" stop-color="#c8d2dc" stop-opacity="0"/><stop offset=".3" stop-color="#c8d2dc" stop-opacity=".22"/>
          <stop offset=".85" stop-color="#c8d2dc" stop-opacity=".16"/><stop offset="1" stop-color="#c8d2dc" stop-opacity="0"/></radialGradient>
        <linearGradient id="windGrad" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#cfe8ff" stop-opacity="0"/>
          <stop offset=".25" stop-color="#cfe8ff" stop-opacity=".85"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></linearGradient>
        <filter id="windBlur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
      </defs>
      ${fanParts.map((p) => p.body).join("")}
      <g id="wind" opacity="0" filter="url(#windBlur)">${fanParts.map((p) => p.winds).join("")}</g>`;
    const heat = `<defs>
        <filter id="haze" x="${rx0 - 50}" y="${ry0 - hz}" width="${rw + 100}" height="${hz + 10}" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="n">
            <animate attributeName="baseFrequency" dur="1.6s" values="0.012 0.050;0.016 0.068;0.012 0.050" repeatCount="indefinite"/></feTurbulence>
          <feDisplacementMap id="hazeDisp" in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
        <radialGradient id="hazeGrad" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <mask id="hazeMask" maskUnits="userSpaceOnUse"><rect x="${rx0 - 40}" y="${ry0 - hz}" width="${rw + 80}" height="${hz - 30}" fill="url(#hazeGrad)"/></mask>
        <linearGradient id="veilGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a50" stop-opacity=".42"/><stop offset=".55" stop-color="#ffb070" stop-opacity=".16"/><stop offset="1" stop-color="#ffc090" stop-opacity="0"/></linearGradient>
        <linearGradient id="ribGrad" gradientUnits="userSpaceOnUse" x1="0" y1="${ry0}" x2="0" y2="${ry0 - 255}">
          <stop offset="0" stop-color="#ff8a3a" stop-opacity=".85"/><stop offset=".45" stop-color="#ffa85e" stop-opacity=".5"/><stop offset="1" stop-color="#ffd0a0" stop-opacity="0"/></linearGradient>
        <filter id="ribBlur" x="-60%" y="-10%" width="220%" height="120%"><feGaussianBlur stdDeviation="3.2"/></filter>
        <radialGradient id="veilFade" cx=".5" cy=".78" r=".55" fx=".5" fy=".85"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <mask id="veilMask" maskUnits="userSpaceOnUse"><rect x="${rx0 - 70}" y="${ry0 - hz}" width="${rw + 140}" height="${hz - 8}" fill="url(#veilFade)"/></mask>
      </defs>
      <g class="heat" data-layer="c1_radiateur">
        <image id="hazeImg" href="${this._img("base", wx0.variant)}" x="0" y="0" width="${FLOWS.width}" height="${FLOWS.height}" preserveAspectRatio="none" filter="url(#haze)" mask="url(#hazeMask)"/>
        <rect class="veil" x="${rx0 - 70}" y="${ry0 - hz}" width="${rw + 140}" height="${hz - 8}" fill="url(#veilGrad)" mask="url(#veilMask)"/>
        ${ribbons}
      </g>`;
    // eau du ballon : teinte qui se stratifie + panaches de convection (serpentin) / foyer + bulles (résistance)
    const [tx0, ty0, tx1, ty1] = TANK, tw = tx1 - tx0, th = ty1 - ty0, [hx, hy0, hy1] = HEATER, TR = rng(77);
    const bub = (n, x0, w, y0, y1, cls, dmin, dvar) => Array.from({ length: n }, () => {
      const x = x0 + TR() * w, y = y0 + TR() * (y1 - y0), d = dmin + TR() * dvar;
      return `<circle class="bub ${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + TR() * 1.6).toFixed(1)}" style="--d:${d.toFixed(2)}s;--dl:${(-TR() * d).toFixed(2)}s;--rise:${(ty0 + 8 - y).toFixed(0)}px;--wob:${((TR() - 0.5) * 10).toFixed(1)}px"/>`;
    }).join("");
    const plumes = Array.from({ length: 5 }, (_, i) => {
      const x = tx0 + tw * (0.2 + 0.15 * i), y = ty0 + th * (0.68 + TR() * 0.12), d = 5 + TR() * 3;
      return `<ellipse class="plume" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(12 + TR() * 8).toFixed(0)}" ry="${(26 + TR() * 14).toFixed(0)}" style="--d:${d.toFixed(1)}s;--dl:${(-TR() * d).toFixed(1)}s;--rise:${(ty0 + th * 0.12 - y).toFixed(0)}px"/>`;
    }).join("");
    const tank = `<defs>
        <clipPath id="tankClip"><rect x="${tx0}" y="${ty0}" width="${tw}" height="${th}" rx="14"/></clipPath>
        <linearGradient id="waterHot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff6a1f" stop-opacity=".62"/><stop offset=".45" stop-color="#ff8a32" stop-opacity=".42"/>
          <stop offset=".8" stop-color="#ffa050" stop-opacity=".16"/><stop offset="1" stop-color="#ffb060" stop-opacity=".05"/></linearGradient>
        <radialGradient id="heaterGlow" gradientUnits="userSpaceOnUse" cx="${hx}" cy="${hy0 + (hy1 - hy0) * 0.6}" r="62">
          <stop offset="0" stop-color="#ff2a00" stop-opacity="1"/><stop offset=".22" stop-color="#ff4a0c" stop-opacity=".85"/><stop offset=".55" stop-color="#ff6a18" stop-opacity=".35"/>
          <stop offset="1" stop-color="#ff7a20" stop-opacity="0"/></radialGradient>
        <filter id="plumeBlur" x="-80%" y="-50%" width="260%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      ${Object.entries(PUMPS).map(([k, [px, py, pr]]) => `<g class="pump" data-layer="${k}">
        <circle class="pring" cx="${px}" cy="${py}" r="${pr + 3}"/>
        <circle class="prot" cx="${px}" cy="${py}" r="${pr - 4}"/></g>`).join("")}
      <g clip-path="url(#tankClip)">
        <g class="water" data-layer="ecs_eau">
          <rect class="wfill" x="${tx0}" y="${ty0}" width="${tw}" height="${th}" fill="url(#waterHot)"/>
          ${plumes}${bub(14, tx0 + 12, tw - 24, ty0 + th * 0.25, ty0 + th * 0.8, "", 3.5, 3)}
        </g>
        <g class="heater" data-layer="ecs_resistance">
          <rect class="hglow" x="${tx0}" y="${hy0 - 70}" width="${tw}" height="${hy1 - hy0 + 120}" fill="url(#heaterGlow)"/>
          ${bub(22, hx - 7, 14, hy0, hy1, "hot", 1.6, 1.6)}
        </g>
      </g>`;
    // position des panneaux [x%, y%, largeur%] sur l'image, surchargeable par config.positions
    const P_ = { ext: c.outdoor_unit === "double" ? EXT_DOUBLE_POS : [3, 32, 16], pac: [29.8, 26, 12.6], c1: [79.5, 12.5, 16], ecs: [52.6, 49, 12.8], c2: [51, 74.5, 15], ...(c.positions || {}) };
    root.innerHTML = `
<style>
  :host { display:block; --glass: rgba(14,18,26,.62); --line: rgba(255,255,255,.12); --txt:#f3f5f8; --mut:#9aa4b2;
          --hot:#ff5a2a; --cold:#3aa0ff; --ok:#3ddc84; --warn:#ffb020; }
  ha-card { overflow:hidden; background:#0b0e13; color:var(--txt); font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
  .top { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .top .t { font-size:20px; font-weight:600; } .top .st { color:var(--mut); font-size:15px; }
  .top .sp { flex:1 }
  .pill { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:13px; font-weight:600;
          background:rgba(255,255,255,.07); border:1px solid var(--line); cursor:pointer; white-space:nowrap; }
  .pill.ok { color:var(--ok); } .pill.warn { color:var(--warn); } .pill.hot { color:#ffb08a; border-color:rgba(255,90,42,.5); }
  .dot { width:8px; height:8px; border-radius:50%; background:currentColor; }
  .stage { position:relative; container-type:inline-size; background:#000; }
  .pic { position:relative; aspect-ratio:${FLOWS.width}/${FLOWS.height}; }
  .pic img { position:absolute; inset:0; width:100%; height:100%; display:block; user-select:none; pointer-events:none; }
  .layer { mix-blend-mode:plus-lighter; opacity:0; transition:opacity 1.2s ease; }
  .layer.on { opacity:1; }
  .layer.ecs_serpentin.on, .layer.ecs_resistance.on, .layer.c2.on { animation:breath 3.2s ease-in-out infinite; }
  .layer.c1_radiateur.on { animation:breath 4.5s ease-in-out infinite; }
  .heat { opacity:0; transition:opacity 1.5s ease; } .heat.on { opacity:1; }
  .veil { opacity:0; } .heat.on .veil { animation:veil 4s ease-in-out infinite; }
  @keyframes veil { 0%,100% { opacity:calc(.3 + .5 * var(--hk, 1)) } 50% { opacity:calc(.4 + .6 * var(--hk, 1)) } }
  .rib { fill:none; stroke:url(#ribGrad); stroke-linecap:round; filter:url(#ribBlur); opacity:0; mix-blend-mode:normal;
         transform-box:fill-box; transform-origin:50% 100%; }
  .heat.on .rib { animation:rib var(--d) ease-in-out var(--dl) infinite; }
  @keyframes rib { 0% { opacity:0; transform:translateY(30px) scaleX(.5) }
                   22% { opacity:calc(.35 + .65 * var(--hk, 1)) } 70% { opacity:calc(.2 + .45 * var(--hk, 1)) }
                   100% { opacity:0; transform:translateY(-110px) scaleX(1.9) } }
  @keyframes wisp { 0% { opacity:0; transform:translateY(0) } 25% { opacity:.55 } 100% { opacity:0; transform:translateY(-70px) } }
  .layer.ventilateur.defrost { filter:saturate(0) brightness(1.6); }
  @keyframes breath { 0%,100% { opacity:.65 } 50% { opacity:1 } }
  svg.fx { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .flow { fill:none; stroke:var(--c); stroke-width:5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:3 26;
          filter:drop-shadow(0 0 4px var(--c)); opacity:0; transition:opacity .8s; animation:flow var(--speed,1.4s) linear infinite; }
  .flow.on { opacity:.95; }
  @keyframes flow { to { stroke-dashoffset:-29 } }
  .pulse { fill:url(#pg); opacity:0; transition:opacity .8s; }
  .pulse.on { animation:pulse 2.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:.05 } 50% { opacity:.35 } }
  /* panneaux en surimpression, positionnes pres de leur element (coords en % de l'image) */
  .ov { position:absolute; inset:0; pointer-events:none; }
  .card { position:absolute; left:var(--x); top:var(--y); width:var(--w); box-sizing:border-box; pointer-events:auto; cursor:pointer;
          background:linear-gradient(160deg, rgba(22,28,40,.62), rgba(8,11,18,.48));
          backdrop-filter:blur(10px) saturate(1.35); -webkit-backdrop-filter:blur(10px) saturate(1.35);
          border:1px solid rgba(255,255,255,.14); border-top:2px solid var(--accent); border-radius:1cqw;
          padding:.75cqw .95cqw .8cqw; font-size:.9cqw; line-height:1.25; box-shadow:0 .7cqw 2.2cqw rgba(0,0,0,.4);
          transition:background .3s, box-shadow .6s, border-color .6s; }
  .card:hover { background:linear-gradient(160deg, rgba(26,33,48,.8), rgba(10,13,22,.7)); }
  .card.active { box-shadow:0 .7cqw 2.2cqw rgba(0,0,0,.4), 0 0 1.4cqw -.2cqw var(--accent); }
  .card h3 { margin:0 0 .45cqw; font-size:.7cqw; letter-spacing:.09em; text-transform:uppercase; color:var(--mut); font-weight:600;
             display:flex; align-items:center; gap:.4cqw; }
  .card h3 i { width:.5cqw; height:.5cqw; border-radius:50%; background:rgba(255,255,255,.25); flex:none; transition:background .6s, box-shadow .6s; }
  .card.active h3 i { background:var(--accent); box-shadow:0 0 .6cqw var(--accent); }
  .card h3 span { color:var(--txt); }
  .row { display:flex; justify-content:space-between; gap:.5cqw; padding:.12cqw 0; }
  .row .k { color:var(--mut); } .row .v { font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .big { font-size:1.9cqw; font-weight:600; margin:.05cqw 0 .3cqw; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
  .pair { display:flex; gap:.9cqw; margin:.05cqw 0 .3cqw; } .pair div { flex:1; }
  .pair b { display:block; font-size:1.45cqw; font-weight:600; font-variant-numeric:tabular-nums; }
  .pair small { color:var(--mut); font-size:.68cqw; }
  .h { color:#ff9a76 } .c { color:#7cc0ff }
  .chips { display:flex; flex-wrap:wrap; gap:.3cqw; margin-top:.45cqw; }
  .chip { font-size:.68cqw; padding:.15cqw .5cqw; border-radius:999px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); white-space:nowrap;
          max-width:100%; overflow:hidden; text-overflow:ellipsis; box-sizing:border-box; }
  .chip.on { color:var(--ok); border-color:rgba(61,220,132,.45); } .chip.hot { color:#ffb08a; border-color:rgba(255,90,42,.5); }
  /* ecran etroit : les panneaux repassent sous l'image */
  @container (max-width: 860px) {
    .ov { position:static; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; padding:12px; }
    .card { position:static; width:auto; font-size:14px; padding:12px 14px; border-radius:14px; background:#151a22; }
    .card h3 { font-size:12px; margin-bottom:8px; gap:6px; } .card h3 i { width:8px; height:8px; }
    .big { font-size:26px; } .pair b { font-size:20px; } .pair small { font-size:11px; }
    .chips { gap:6px; margin-top:8px; } .chip { font-size:12px; padding:3px 8px; }
  }
  .tabs:empty { display:none; } .tabs { padding:0 4px 4px; }
  .hist { position:fixed; inset:0; z-index:9; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; padding:16px; }
  .hist[hidden] { display:none; }
  .histbox { width:min(900px, 100%); max-height:calc(100% - 32px); overflow:auto; background:var(--card-background-color, #1c1f26);
    border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,.5); }
  .histbox header { display:flex; align-items:center; gap:8px; padding:12px 12px 4px 18px; position:sticky; top:0; background:inherit; z-index:1; }
  .histbox header b { flex:1; font-size:17px; color:var(--primary-text-color, #fff); }
  .hh { display:flex; gap:4px; }
  .hh button, .histbox .ic { background:transparent; color:var(--secondary-text-color, #aaa); border:1px solid var(--divider-color, #444);
    border-radius:8px; padding:3px 8px; cursor:pointer; font:inherit; font-size:12px; }
  .hh button.on { background:var(--primary-color, #03a9f4); border-color:transparent; color:#fff; }
  .histbox .ic { border:0; padding:4px; display:flex; }
  #hist_body { padding:0 4px 8px; }
  #hist_body > * { --ha-card-box-shadow:none; --ha-card-border-width:0; }
  .dbg { display:flex; flex-wrap:wrap; gap:6px; padding:0 12px 12px; }
  .dbg button { background:#222a36; color:var(--txt); border:1px solid var(--line); border-radius:8px; padding:4px 8px; cursor:pointer; }
  .dbg button.on { background:#2d6a4f; }
  .dbg label { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--mut); }
  .pic img.logo { inset:auto; height:auto; mix-blend-mode:multiply; opacity:.92; }
  /* circulateurs du module : anneau + roue qui tourne */
  .pump { opacity:0; transition:opacity 1s ease; } .pump.on { opacity:1; }
  .pring { fill:none; stroke:#5fd0ff; stroke-width:3; filter:drop-shadow(0 0 4px #5fd0ff); }
  .prot { fill:none; stroke:#d8f2ff; stroke-width:3.5; stroke-dasharray:7 5; transform-box:fill-box; transform-origin:center; }
  .pump.on .prot { animation:pspin .9s linear infinite; }
  @keyframes pspin { to { transform:rotate(360deg) } }
  /* eau du ballon ECS */
  .tankfx { mix-blend-mode:screen; }
  .water, .heater { opacity:0; transition:opacity 1.6s ease; }
  .water.on { opacity:var(--wheat, .85); } .heater.on { opacity:1; }
  .water.on .wfill { animation:wbreath 6s ease-in-out infinite; }
  @keyframes wbreath { 0%,100% { opacity:.8 } 50% { opacity:1 } }
  .plume { fill:#ff8a3a; opacity:0; filter:url(#plumeBlur); transform-box:fill-box; transform-origin:center; }
  .water.on .plume { animation:plume var(--d) ease-in-out var(--dl) infinite; }
  @keyframes plume { 0% { transform:translateY(0) scale(.7,.8); opacity:0 } 30% { opacity:.55 } 100% { transform:translateY(var(--rise)) scale(1.4,1.2); opacity:0 } }
  .bub { fill:rgba(255,226,190,.75); opacity:0; }
  .bub.hot { fill:rgba(255,236,200,.95); }
  .on > .bub { animation:rise var(--d) linear var(--dl) infinite; }
  @keyframes rise { 0% { transform:translate(0,0); opacity:0 } 12% { opacity:.9 } 85% { opacity:.6 } 100% { transform:translate(var(--wob),var(--rise)); opacity:0 } }
  .heater.on .hglow { animation:hpulse 1.8s ease-in-out infinite; }
  @keyframes hpulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }
  /* météo : widget discret dans le ciel + effets limités au paysage */
  .wx { position:absolute; left:1.4%; top:2.4%; display:flex; align-items:center; gap:.55cqw; padding:.4cqw .85cqw .4cqw .55cqw;
        border-radius:.8cqw; background:rgba(10,14,20,.26); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        border:1px solid rgba(255,255,255,.14); color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.55); cursor:pointer;
        font-size:clamp(10px,.8cqw,15px); line-height:1.25; transition:background .3s; }
  .wx:hover { background:rgba(10,14,20,.5); } .wx[hidden] { display:none; }
  .wx ha-icon { --mdc-icon-size:clamp(18px,1.9cqw,34px); }
  .wx b { font-size:1.35em; font-weight:600; margin-right:.35em; font-variant-numeric:tabular-nums; } .wx span { opacity:.92; }
  .wx small { display:block; opacity:.72; font-size:.86em; }
  .drop { stroke:rgba(215,228,245,.55); stroke-linecap:round; animation:fall var(--d) linear var(--dl) infinite; }
  @keyframes fall { from { transform:translate(0,-80px) } to { transform:translate(var(--dx),1200px) } }
  .flake { animation:fall var(--d) linear var(--dl) infinite; }
  .flake circle { fill:rgba(255,255,255,.9); animation:sway var(--sw) ease-in-out var(--sdl) infinite alternate; }
  @keyframes sway { from { transform:translateX(-14px) } to { transform:translateX(14px) } }
  .mist { fill:rgba(235,240,245,.22); filter:url(#mistBlur); animation:drift var(--d) ease-in-out var(--dl) infinite alternate; }
  @keyframes drift { from { transform:translateX(-90px) } to { transform:translateX(90px) } }
  .flash { fill:#eef3ff; opacity:0; animation:flash 9s linear infinite; }
  @keyframes flash { 0%,61%,63.5%,65%,100% { opacity:0 } 62% { opacity:.5 } 64% { opacity:.32 } }
  .gust { fill:none; stroke:url(#gustGrad); stroke-linecap:round; stroke-dasharray:140 900; animation:gust var(--d) linear var(--dl) infinite; }
  @keyframes gust { from { stroke-dashoffset:1040 } to { stroke-dashoffset:0 } }
  @media (prefers-reduced-motion: reduce) { .wxfx { display:none; } }
  .windl { fill:none; stroke:url(#windGrad); stroke-linecap:round; stroke-dasharray:70 150; }
</style>
<ha-card>
  <div class="top">
    <span class="t">${c.title}</span><span class="st">${c.subtitle}</span><span class="sp"></span>
    <span class="pill" id="p_status"><span class="dot"></span><span></span></span>
    <span class="pill" id="p_mode"></span>
    <span class="pill" id="p_power"></span>
  </div>
  <div class="stage">
   <div class="pic">
    <img id="baseImg" src="${this._img("base", wx0.variant)}" alt="">
    ${LAYERS.map((l) => `<img class="layer ${l}" data-layer="${l}" src="${this._img("calque_" + l)}" alt="">`).join("")}
    <svg class="fx" viewBox="0 0 ${FLOWS.width} ${FLOWS.height}" preserveAspectRatio="none">${fan}${heat}${flows}</svg>
    ${logoFor(c) ? (() => { const lg = logoFor(c), [lx, ly, lw] = lg.box;  // image HTML : haut calé, hauteur selon le format du logo
      return `<img class="logo" alt="" src="${String(lg.url).replace(/"/g, "&quot;")}" style="left:${(lx / FLOWS.width * 100).toFixed(3)}%;top:${(ly / FLOWS.height * 100).toFixed(3)}%;width:${(lw / FLOWS.width * 100).toFixed(3)}%">`; })() : ""}
    <svg class="fx tankfx" viewBox="0 0 ${FLOWS.width} ${FLOWS.height}" preserveAspectRatio="none">${tank}</svg>
    <svg class="fx wxfx" id="wxfx" viewBox="0 0 ${FLOWS.width} ${FLOWS.height}" preserveAspectRatio="none"></svg>
    <div class="wx" id="wx" hidden><ha-icon id="wx_i"></ha-icon><div><b id="wx_t"></b><span id="wx_l"></span><small id="wx_d"></small></div></div>
   </div>
   <div class="ov">
    <div class="card" id="k_ext" data-more="comp" style="--x:${P_.ext[0]}%;--y:${P_.ext[1]}%;--w:${P_.ext[2]}%;--accent:#5fd0ff">
      <h3><i></i>Unité extérieure</h3>
      <div class="big" id="u_ext"></div>
      <div class="row"><span class="k">Compresseur</span><span class="v" id="u_comp"></span></div>
      <div class="row"><span class="k">Modulation</span><span class="v" id="u_mod"></span></div>
      <div class="chips" id="u_chips"></div></div>
    <div class="card" id="k_pac" data-more="pac_etat" style="--x:${P_.pac[0]}%;--y:${P_.pac[1]}%;--w:${P_.pac[2]}%;--accent:#ff8a4c">
      <h3><i></i>PAC · Échangeurs</h3>
      <div class="pair"><div><small>Départ</small><b class="h" id="x_dep"></b></div><div><small>Retour</small><b class="c" id="x_ret"></b></div></div>
      <div class="row"><span class="k">Consigne départ</span><span class="v" id="x_cons"></span></div>
      <div class="row"><span class="k">ΔT</span><span class="v" id="x_dt"></span></div>
      <div class="row"><span class="k">Puissance élec.</span><span class="v" id="x_pw"></span></div>
      <div class="row"><span class="k">Énergie</span><span class="v" id="x_en"></span></div>
      <div class="chips" id="x_chips"></div></div>
    <div class="card" id="k_c1" data-more="c1_climate" style="--x:${P_.c1[0]}%;--y:${P_.c1[1]}%;--w:${P_.c1[2]}%;--accent:#ff5a2a">
      <h3><i></i>Circuit 1 · <span>${this._cname(1)}</span></h3>
      <div class="pair"><div><small>Ambiance</small><b id="c1_t"></b></div><div><small>Consigne</small><b id="c1_c"></b></div></div>
      <div class="row" id="c1_fr"><span class="k" id="c1_fk">Départ circuit</span><span class="v h" id="c1_f"></span></div>
      <div class="chips" id="c1_chips"></div></div>
    <div class="card" id="k_c2" data-more="c2_climate" style="--x:${P_.c2[0]}%;--y:${P_.c2[1]}%;--w:${P_.c2[2]}%;--accent:#ff5a2a">
      <h3><i></i>Circuit 2 · <span>${this._cname(2)}</span></h3>
      <div class="pair"><div><small>Ambiance</small><b id="c2_t"></b></div><div><small>Consigne</small><b id="c2_c"></b></div></div>
      <div class="row" id="c2_fr"><span class="k">Départ circuit</span><span class="v h" id="c2_f"></span></div>
      <div class="chips" id="c2_chips"></div></div>
    <div class="card" id="k_ecs" data-more="ecs_heater" style="--x:${P_.ecs[0]}%;--y:${P_.ecs[1]}%;--w:${P_.ecs[2]}%;--accent:#ffb347">
      <h3><i></i>ECS · Ballon</h3>
      <div class="big" id="e_t"></div>
      <div class="row"><span class="k">Confort</span><span class="v" id="e_conf"></span></div>
      <div class="row"><span class="k">Actuelle</span><span class="v" id="e_cur"></span></div>
      <div class="row"><span class="k">COP · kWh</span><span class="v" id="e_cop"></span></div>
      <div class="chips" id="e_chips"></div></div>
   </div>
  </div>
  <div class="tabs" id="tabs"></div>
  <div class="hist" id="hist" hidden><div class="histbox" role="dialog" aria-modal="true">
    <header><b id="hist_t"></b><span class="hh">${HIST_HOURS.map((h) => `<button data-h="${h}">${h < 48 ? h + " h" : h / 24 + " j"}</button>`).join("")}</span>
      <button class="ic" data-act="more" title="Fiche de l'entité"><ha-icon icon="mdi:information-outline"></ha-icon></button>
      <button class="ic" data-act="close" title="Fermer"><ha-icon icon="mdi:close"></ha-icon></button></header>
    <div id="hist_body"></div></div></div>
  ${c.debug ? `<div class="dbg">${LAYERS.map((l) => `<button data-force="${l}">${l}</button>`).join("")}<button data-force="defrost">dégivrage</button><label>Météo <select id="dbg_wx"><option value="">réelle</option>${Object.entries(WX).map(([k, v]) => `<option value="${k}">${v[0]} (${k})</option>`).join("")}</select></label><label>Moment <select id="dbg_sun"><option value="">réel</option><option value="jour">Jour</option><option value="nuit">Nuit</option></select></label><label>Modulation <input type="range" id="dbg_mod" min="-1" max="100" value="-1"><span id="dbg_mod_v">réelle</span></label></div>` : ""}
</ha-card>`;
    root.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () =>
      c.panel_click === "more-info" ? this._more(el.dataset.more) : this._history(el.dataset.more)));
    root.getElementById("hist").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-h]"), a = ev.target.closest("[data-act]");
      if (b) { this._histHours = +b.dataset.h; this._history(this._histKey); }
      else if (a?.dataset.act === "close" || ev.target.id === "hist") this._closeHistory();
      else if (a?.dataset.act === "more") { const k = this._histKey; this._closeHistory(); this._more(k); }
    });
    this._force = {};
    root.querySelectorAll("[data-force]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.force; this._force[k] = !this._force[k]; b.classList.toggle("on", this._force[k]); this._update();
    }));
    const modIn = root.getElementById("dbg_mod");
    if (modIn) modIn.addEventListener("input", () => { this._modOverride = +modIn.value < 0 ? undefined : +modIn.value;
      root.getElementById("dbg_mod_v").textContent = this._modOverride === undefined ? "réelle" : this._modOverride + " %"; this._update(); });
    const ssel = root.getElementById("dbg_sun");
    if (ssel) { ssel.value = this._sunForce || ""; ssel.addEventListener("change", () => { this._sunForce = ssel.value || undefined; this._update(); }); }
    const wsel = root.getElementById("dbg_wx");
    if (wsel) { wsel.value = this._wxForce || ""; wsel.addEventListener("change", () => { this._wxForce = wsel.value || undefined; this._update(); }); }
    root.getElementById("wx").addEventListener("click", () => {
      const id = c.weather_entity; if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })); });
    this._root = root; this._built = true;
    this._mountTabs();
    this._startFan();
  }


  // ---------- animation ventilateur / vent (requestAnimationFrame, vitesse lissee) ----------
  connectedCallback() { if (this._built) this._startFan(); }
  disconnectedCallback() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; if (this._onKey) this._closeHistory(); }
  _startFan() {
    if (this._raf || !this._root) return;
    this._fanAngle = this._fanAngle || 0; this._fanSpeed = this._fanSpeed || 0; this._windOff = this._windOff || 0;
    let last = performance.now();
    const rots = [...this._root.querySelectorAll(".fanRot")], blurs = [...this._root.querySelectorAll(".fanBlurDisk")];
    const wind = this._root.getElementById("wind");
    const lines = [...this._root.querySelectorAll(".windl")];
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const target = this._fanTarget || 0;
      this._fanSpeed += (target - this._fanSpeed) * Math.min(1, dt * (target > this._fanSpeed ? 0.9 : 0.6));
      if (this._fanSpeed < 0.5 && target === 0) this._fanSpeed = 0;
      this._fanAngle = (this._fanAngle + this._fanSpeed * dt) % 360;
      const k = Math.min(1, this._fanSpeed / 1300);
      rots.forEach((rot, i) => {  // deux hélices : légèrement décalées pour ne pas tourner « en miroir »
        rot.setAttribute("transform", `translate(${rot.dataset.cx} ${rot.dataset.cy}) rotate(${((this._fanAngle + i * 37) % 360).toFixed(1)})`);
        rot.setAttribute("fill", `rgba(190,200,215,${(0.3 * (1 - 0.75 * k)).toFixed(3)})`);
      });
      blurs.forEach((b) => b.setAttribute("opacity", (k * 0.9).toFixed(3)));
      this._windOff -= this._fanSpeed * dt * 0.35;
      wind.setAttribute("opacity", Math.min(0.85, this._fanSpeed / 500).toFixed(3));
      lines.forEach((l, i) => l.style.strokeDashoffset = (this._windOff * (1 + (i % 3) * 0.18)).toFixed(1));
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  // ---------- update ----------
  // ---------- onglets : moteur embarque (ex pac-synoptique-card), schema masque ----------
  _mountTabs() {
    const c = this._config, box = this._root.getElementById("tabs");
    this._tabs = null;
    if (!box) return;
    box.innerHTML = "";
    const any = c.show_alarms || c.show_diagnostics || c.show_graphs || c.show_curve || c.show_controls;
    if (!any) return;
    const el = document.createElement("pac-photo-tabs");
    try {
      el.setConfig({
        type: "custom:pac-photo-tabs", theme_mode: "dark",
        circuit_1_name: this._cname(1), circuit_2_name: this._cname(2),
        power_entity: this._e.power, energy_entity: this._e.energy,
        show_controls: !!c.show_controls, show_diagnostics: !!c.show_diagnostics, show_graphs: !!c.show_graphs,
        show_curve: !!c.show_curve, show_simulation: !!c.show_controls,
      });
    } catch (e) { console.warn("pac-synoptique-photo-card: onglets indisponibles", e); return; }
    const css = new CSSStyleSheet();
    css.replaceSync(`.schematic{display:none!important}
      ha-card{background:transparent!important;box-shadow:none!important;border:0!important}
      .wrap{padding-top:0!important}
      ${c.show_alarms ? "" : 'details[data-panel="alarms"]{display:none!important}'}`);
    if (el.shadowRoot) el.shadowRoot.adoptedStyleSheets = [...el.shadowRoot.adoptedStyleSheets, css];
    box.appendChild(el);
    this._tabs = el;
  }

  _update() {
    if (!this._root || !this._hass) return;
    if (this._tabs) this._tabs.hass = this._hass;
    if (this._hist) this._hist.hass = this._hass;
    const r = this._root, $ = (id) => r.getElementById(id), f = this._force || {};
    const wx = this._wx(); this._applyImages(wx); this._applyWxFx(wx); this._applyWxBadge(wx);
    const comp = this._on("comp");
    const v3v = (this._v("v3v") || "").toLowerCase();
    const ecsMode = /ecs|eau|sanit|dhw/.test(v3v) || this._on("ecs_pump");
    const defrost = this._on("degivrage") || f.defrost;
    // C1 = circuit direct : son « circulateur » est souvent un relais partagé (QX1) qui suit aussi la
    // charge ECS. Il ne compte que si le circuit est en service et que la V3V n'est pas sur l'ECS.
    const c1Off = this._v("c1_climate") === "off";
    const c1Active = this._on("c1_pump") && !c1Off && !ecsMode;
    // post-circulation (BSB « Overrun active ») : compresseur arrêté, la pompe tourne encore quelques minutes
    // pour évacuer la chaleur ; sur C1 (circuit direct) l'eau passe bien dans les radiateurs
    const OVERRUN = /overrun|post.?circ|nachlauf|marche à vide/i;
    const overrun = (n) => OVERRUN.test(this._v(`${n}_etat`) || "");
    const c1Overrun = this._on("c1_pump") && !ecsMode && !c1Active && overrun("c1");
    const st = {
      frigo: comp || defrost, ventilateur: comp || defrost, module: comp || this._on("c1_pump"),
      c1: c1Active || c1Overrun, c1_radiateur: c1Active, c2: this._on("c2_pump"),
      pompe_primaire: this._on("c1_pump"), pompe_c2: this._on("c2_pump"),
      ecs_serpentin: ecsMode, ecs_resistance: this._on("ecs_appoint"),
    };
    for (const k of LAYERS) if (f[k]) st[k] = true;
    if (f.c1) st.c1_radiateur = true;
    st.ecs_eau = st.ecs_serpentin || st.ecs_resistance;  // l'eau chauffe par le serpentin (PAC) ou par l'appoint
    const tB = parseFloat(this._v("ecs_temp"));
    r.querySelector(".water")?.style.setProperty("--wheat", isNaN(tB) ? ".85" : Math.max(0.45, Math.min(1, (tB - 20) / 35)).toFixed(2));
    r.querySelectorAll("[data-layer]").forEach((el) => el.classList.toggle("on", !!st[el.dataset.layer]));
    let tDep = parseFloat(this._v("c1_flow")); if (isNaN(tDep)) tDep = parseFloat(this._v("depart"));
    let hk = isNaN(tDep) ? 0.7 : Math.max(0.3, Math.min(1, (tDep - 25) / 22));  // 30 °C discret -> 47 °C plein
    if (f.c1 || f.c1_radiateur) hk = Math.max(hk, 0.85);  // forçage debug : visible même PAC arrêtée (départ froid)
    r.querySelector(".heat")?.style.setProperty("--hk", hk.toFixed(2));
    r.getElementById("hazeDisp")?.setAttribute("scale", (6 + 16 * hk).toFixed(1));
    const vent = r.querySelector(".layer.ventilateur"); if (vent) vent.classList.toggle("defrost", !!defrost);
    // vitesse des flux selon la modulation compresseur
    // cible de vitesse de l'helice (degres/s) : arret si compresseur arrete ou degivrage
    const modReal = parseFloat(this._v("comp_mod"));
    const m = this._modOverride ?? (isNaN(modReal) ? 0 : modReal);
    const spinning = (comp || f.ventilateur || this._modOverride !== undefined) && !defrost;
    this._fanTarget = spinning ? 90 + Math.max(0, Math.min(100, m)) / 100 * 1500 : 0;
    const mod = this._modOverride ?? modReal; const speed = isNaN(mod) || mod <= 0 ? 1.6 : Math.max(0.5, 1.6 - mod / 100);
    r.querySelectorAll(".flow").forEach((p) => p.style.setProperty("--speed", `${speed.toFixed(2)}s`));

    // entête
    const inst = this._v("installation"); const ps = $("p_status");
    ps.className = "pill " + (inst === "OK" ? "ok" : "warn");
    ps.lastElementChild.textContent = inst === "OK" ? "Fonctionnement normal" : (inst || "État inconnu");
    $("p_mode").textContent = this._v("mode") || "—";
    $("p_mode").className = "pill" + (/chauff/i.test(this._v("mode") || "") ? " hot" : "");
    const pw = parseFloat(this._v("power"));
    $("p_power").textContent = isNaN(pw) ? "— W" : `${Math.round(pw).toLocaleString("fr-FR")} W`;

    // panneaux : halo d'accent quand l'element est actif
    $("k_ext").classList.toggle("active", !!(st.frigo || st.ventilateur));
    $("k_pac").classList.toggle("active", !!st.module);
    $("k_c1").classList.toggle("active", !!st.c1);
    $("k_c2").classList.toggle("active", !!st.c2);
    $("k_ecs").classList.toggle("active", !!(st.ecs_serpentin || st.ecs_resistance));
    $("u_ext").textContent = this._num("ext_temp");
    $("u_comp").textContent = comp ? "En marche" : "À l'arrêt";
    $("u_mod").textContent = this._num("comp_mod", 0, "%");
    $("u_chips").innerHTML = (defrost ? `<span class="chip hot">Dégivrage</span>` : "") + (comp ? `<span class="chip on">Compresseur ON</span>` : `<span class="chip">Compresseur OFF</span>`);
    const dep = parseFloat(this._v("depart")), ret = parseFloat(this._v("retour"));
    $("x_dep").textContent = this._num("depart"); $("x_ret").textContent = this._num("retour");
    $("x_cons").textContent = this._num("depart_cible");
    $("x_dt").textContent = isNaN(dep) || isNaN(ret) ? "—" : `${(dep - ret).toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} °C`;
    const prim = this._v("c1_pump") === undefined ? "" : `<span class="chip ${this._on("c1_pump") ? "on" : ""}" title="Relais QX1 : circuit direct C1 ou charge ECS selon la V3V">Pompe primaire ${this._on("c1_pump") ? "ON" : "OFF"}${this._on("c1_pump") ? (ecsMode ? " · ECS" : OVERRUN.test(this._v("pac_etat") || "") || c1Overrun ? " · post-circulation" : " · chauffage") : ""}</span>`;
    $("x_chips").innerHTML = `<span class="chip ${/chauff/i.test(this._v("mode") || "") ? "hot" : ""}">${this._v("mode") || "—"}</span><span class="chip">${this._v("pac_etat") || "—"}</span>${prim}`;
    $("x_pw").textContent = isNaN(pw) ? "—" : `${Math.round(pw).toLocaleString("fr-FR")} W`;
    $("x_en").textContent = this._num("energy", 1, this._s("energy")?.attributes?.unit_of_measurement || "kWh");
    for (const n of ["c1", "c2"]) {
      $(`${n}_t`).textContent = this._attr(`${n}_climate`, "current_temperature");
      $(`${n}_c`).textContent = this._attr(`${n}_climate`, "temperature");
      const fl = parseFloat(this._v(`${n}_flow`));
      // C1 = circuit direct sans sonde propre : sans valeur 8743, son départ est celui de la PAC
      const direct = n === "c1" && isNaN(fl) && !isNaN(parseFloat(this._v("depart")));
      $(`${n}_fr`).style.display = isNaN(fl) && !direct ? "none" : "";
      $(`${n}_f`).textContent = direct ? this._num("depart") : this._num(`${n}_flow`);
      if (n === "c1") $("c1_fk").textContent = direct ? "Départ (= départ PAC)" : "Départ circuit";
      const cl = this._v(`${n}_climate`);
      const pumpRaw = this._on(`${n}_pump`), pumpActive = n === "c1" ? c1Active : pumpRaw;
      const pumpChip = pumpRaw && !ecsMode && overrun(n) && !(n === "c1" && c1Active)
        ? `<span class="chip on" title="Compresseur arrêté : la pompe tourne encore quelques minutes pour évacuer la chaleur">Post-circulation</span>`
        : pumpActive ? `<span class="chip on">Circulateur en marche</span>`
        : pumpRaw ? `<span class="chip" title="Pompe primaire active mais circuit ${ecsMode ? "court-circuité par la charge ECS" : "à l'arrêt"}">Pompe primaire${ecsMode ? " (charge ECS)" : ""}</span>`
        : `<span class="chip">Circulateur arrêté</span>`;
      $(`${n}_chips`).innerHTML = `<span class="chip ${cl === "heat" ? "hot" : ""}">${cl === "heat" ? "Chauffe" : cl === "off" ? "OFF" : (cl || "—")}</span>` +
        `<span class="chip">${this._v(`${n}_etat`) || "—"}</span>` + pumpChip;
    }
    $("e_t").textContent = this._num("ecs_temp");
    $("e_conf").textContent = this._num("ecs_confort");
    $("e_cur").textContent = this._attr("ecs_heater", "temperature");
    $("e_cop").textContent = `${this._num("ecs_cop", 2, "")} · ${this._num("ecs_energie", 2, "kWh")}`;
    $("k_ecs").title = this._v("ecs_etat") || "";
    $("e_chips").innerHTML =
      `<span class="chip ${this._on("ecs_pump") ? "on" : ""}">Pompe ${this._on("ecs_pump") ? "ON" : "OFF"}</span>` +
      `<span class="chip ${this._on("ecs_appoint") ? "hot" : ""}">Appoint ${this._on("ecs_appoint") ? "ON" : "OFF"}</span>`;
  }
}
if (!customElements.get("pac-synoptique-photo-card")) customElements.define("pac-synoptique-photo-card", PacSynoptiquePhotoCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "pac-synoptique-photo-card", name: "PAC Synoptique Photo", description: "Synoptique photoréaliste Alfea Duo avec calques animés", preview: false, documentationURL: "" });
console.info(`%c PAC-SYNOPTIQUE-PHOTO %c ${VERSION} `, "background:#ff5a2a;color:#fff", "background:#222;color:#fff");
