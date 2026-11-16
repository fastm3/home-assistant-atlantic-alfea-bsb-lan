/* Moteur des onglets (alarmes, diagnostics, graphes, loi d'eau, commandes) — repris de pac-synoptique-card v2.11.0
 * (atlantic_alfea_controller 1.5.27), embarque sous le tag interne pac-photo-tabs. */
/**
 * PAC Synoptique v2.11.0 (intégration V1.5.27) — Atlantic Alféa Extensa Duo / BSB-LAN
 * Home Assistant Lovelace custom card (sans dependance) • supervision + commandes
 * Inclus dans atlantic_alfea_controller 1.5.27
 * Commandes optionnelles via les entités Climate/Select de l'intégration.
 */
(() => {
'use strict';
const TAG = 'pac-photo-tabs';
const EDITOR_TAG = 'pac-photo-tabs-editor';

// Noms définis par le code de l'intégration et non par une capture Lovelace.
// Les entités de diagnostic peuvent être absentes ou désactivées dans HA.
const FIELDS = {
  globalMode:      ['select','Mode global'],
  pacState:        ['sensor','PAC - État'],
  outdoor:         ['sensor','PAC - T. extérieure'],
  compressor:      ['binary_sensor','COMP - État'],
  modulation:      ['sensor','COMP - Modulation'],
  defrost:         ['binary_sensor','PAC - Dégivrage DI6'],
  flow:            ['sensor','PAC - T. départ'],
  returnTemp:      ['sensor','PAC - T. retour'],
  targetFlow:      ['sensor','PAC - T. départ cible'],
  flowGap:         ['sensor','PAC - Écart départ / consigne'],
  energy:          ['sensor','PAC - Énergie totale'],
  circuit1:        ['climate','C1 - Circuit 1'],
  circuit2:        ['climate','C2 - Circuit 2'],
  circuit1State:   ['sensor','C1 - État actuel'],
  circuit2State:   ['sensor','C2 - État actuel'],
  pump1:           ['binary_sensor','Pompe primaire (QX1)'],
  pump2:           ['binary_sensor','C2 - Circulateur'],
  program1:        ['sensor','C1 - Programme actif'],
  program2:        ['sensor','C2 - Programme actif'],
  regime1:         ['sensor','C1 - Régime temporaire'],
  regime2:         ['sensor','C2 - Régime temporaire'],
  override1:       ['binary_sensor','C1 - Dérogation'],
  override2:       ['binary_sensor','C2 - Dérogation'],
  sim1:            ['switch','C1 - Simulation dérogation'],
  sim2:            ['switch','C2 - Simulation dérogation'],
  simDuration1:    ['number','C1 - Durée dérogation'],
  simDuration2:    ['number','C2 - Durée dérogation'],
  heatState1:      ['sensor','8000 - Status heating circuit 1'],
  heatState2:      ['sensor','8001 - Status heating circuit 2'],
  flowTempC1:      ['sensor','8743 - Flow temp actual value heat circuit 1'],
  flowTempC2:      ['sensor','8773 - Flow temp actual value heat circuit 2'],
  coolState1:      ['sensor','8004 - Status cooling circuit 1'],
  coolState2:      ['sensor','8025 - Status cooling circuit 2'],
  heatFlowTarget1: ['sensor','C1 - Chauffage T. départ cible'],
  heatFlowTarget2: ['sensor','C2 - Chauffage T. départ cible'],
  heatComfort1:    ['sensor','C1 - Chauffage Cons. Conf'],
  heatEco1:        ['sensor','C1 - Chauffage Cons. Éco'],
  coolComfort1:    ['sensor','C1 - Rafraîch. Cons. Conf'],
  coolEco1:        ['sensor','C1 - Rafraîch. Cons. Éco'],
  heatComfort2:    ['sensor','C2 - Chauffage Cons. Conf'],
  heatEco2:        ['sensor','C2 - Chauffage Cons. Éco'],
  coolComfort2:    ['sensor','C2 - Rafraîch. Cons. Conf'],
  coolEco2:        ['sensor','C2 - Rafraîch. Cons. Éco'],
  ecsHeater:       ['water_heater','Eau chaude sanitaire'],
  ecsProduction:   ['sensor','ECS - Production'],
  ecsState:        ['sensor','ECS - État'],
  ecsTemp:         ['sensor','ECS - T. ballon'],
  ecsComfort:      ['sensor','ECS - T. Confort'],
  ecsEco:          ['sensor','ECS - T. Éco'],
  ecsCopSession:   ['sensor','ECS - COP session'],
  ecsForceCycle:   ['button','Forçage cycle ECS'],
  ecsComfortSetpoint: ['number','ECS - Consigne confort (1610)'],
  ecsEcoSetpoint:     ['number','ECS - Consigne réduite (1612)'],
  heatSetpointC1:  ['number','C1 - Chauffage T. Conf'],
  heatSetpointC2:  ['number','C2 - Chauffage T. Conf'],
  heatReducedSetpointC1: ['number','C1 - Consigne réduite (712)'],
  heatReducedSetpointC2: ['number','C2 - Consigne réduite (1012)'],
  coolSetpointC1:  ['number','C1 - Rafraîch. T. Conf'],
  coolSetpointC2:  ['number','C2 - Rafraîch. T. Conf'],
  coolReducedSetpointC1: ['number','C1 - Consigne rafraîchissement réduite (903)'],
  coolReducedSetpointC2: ['number','C2 - Consigne rafraîchissement réduite (1203)'],
  curveSlope1:  ['sensor','720 - Heating curve slope'],
  curveOffset1: ['sensor','721 - Heating curve parallel displacement'],
  curveMin1:    ['sensor','740 - Flow temp min limitation'],
  curveMax1:    ['sensor','741 - Flow temp max limitation'],
  curveGain1:   ['sensor','750 - Room temp gain factor'],
  curveWinter1: ['sensor','730 - Summer/winter changeover temp'],
  curveSlope2:  ['sensor','1020 - Heating curve slope'],
  curveOffset2: ['sensor','1021 - Heating curve parallel displacement'],
  curveMin2:    ['sensor','1040 - Flow temp min limitation'],
  curveMax2:    ['sensor','1041 - Flow temp max limitation'],
  curveGain2:   ['sensor','1050 - Room temp gain factor'],
  curveWinter2: ['sensor','1030 - Summer/winter changeover temp'],
  roomTemp1: ['sensor','Room temperature actual value 1'],
  roomTemp2: ['sensor','Room temperature actual value 2'],
  ecsPump:         ['binary_sensor','ECS - Pompe'],
  ecsElectric:     ['binary_sensor','ECS - Appoint électrique'],
  compressorHours: ['sensor','COMP - Heures de fonctionnement'],
  compressorStarts:['sensor','COMP - Nombre de démarrages'],
  minimumRun:      ['sensor','COMP - Temps de marche minimum'],
  minimumOff:      ['sensor','COMP - Temps d’arrêt minimum'],
  startsMaxRate:   ['sensor','COMP - Seuil de démarrages régulateur'],
  startsActualRate:['sensor','COMP - Démarrages régulateur'],
  cycleAverage:    ['sensor','COMP - Durée moyenne historique d’un cycle'],
  cycleLast:       ['sensor','COMP - Durée du dernier cycle'],
  stopLast:        ['sensor','COMP - Durée du dernier arrêt'],
  startsToday:     ['sensor','COMP - Démarrages aujourd’hui'],
  startsLastHour:  ['sensor','COMP - Démarrages sur la dernière heure'],
  shortCycles6h:   ['sensor','COMP - Cycles courts sur 6 heures'],
  clockTime:       ['sensor','Horloge PAC - Date et heure'],
  clockOffset:     ['sensor','Horloge PAC - Décalage'],
  alarmCycles:     ['binary_sensor','Alarme - COMP  Cycles courts répétés'],
  alarmRestart:    ['binary_sensor','Alarme - COMP  Redémarrages trop rapprochés'],
  alarmStarts:     ['binary_sensor','Alarme - COMP  Démarrages fréquents'],
  alarmGap:        ['binary_sensor','Alarme - PAC - Écart de température anormal'],
  alarmSummary:    ['binary_sensor','Alarme - COMP  Synthèse'],
  alarmClock:      ['binary_sensor','Alarme - Horloge PAC désynchronisée']
};
const ALERTS = [
  ['alarmCycles','Cycles courts répétés'],
  ['alarmRestart','Redémarrages trop rapprochés'],
  ['alarmStarts','Démarrages fréquents'],
  ['alarmGap','Écart départ / consigne anormal'],
  ['alarmClock','Horloge PAC désynchronisée']
];
// Attributs de contexte déjà fournis par les capteurs d'alarmes de l'intégration.
// Lecture seule et facultatifs : ne rien afficher si l'attribut est absent.
const ALERT_CONTEXT = {
  alarmCycles: [
    ['Dernier cycle', 'dernier_cycle_minutes', 'min'],
    ['Seuil cycle court', 'seuil_cycle_minutes', 'min'],
    ['Cycles courts sur 1 h', 'cycles_courts_derniere_heure', ''],
    ['Cycles courts sur 6 h', 'cycles_courts_6_heures', ''],
    ['Règle de déclenchement', 'regle_alerte', '']
  ],
  alarmRestart: [
    ['Dernier arrêt', 'dernier_arret_minutes', 'min'],
    ['Arrêt minimum', 'temps_arret_minimum_minutes', 'min'],
    ['Redémarrages rapprochés sur 1 h', 'redemarrages_rapproches_derniere_heure', ''],
    ['Règle de déclenchement', 'regle_alerte', '']
  ],
  alarmStarts: [
    ['Démarrages dernière heure', 'demarrages_derniere_heure', ''],
    ['Seuil par heure', 'seuil_par_heure', '']
  ],
  alarmGap: [
    ['Écart mesuré', 'ecart_actuel_degC', '°C'],
    ['Seuil écart', 'seuil_ecart_degC', '°C'],
    ['Temporisation', 'temporisation_minutes', 'min']
  ],
  alarmClock: [
    ['Décalage', 'decalage_secondes', 's'],
    ['Seuil', 'seuil_secondes', 's']
  ],
  alarmSummary: [
    ['Supervision complète', 'supervision_complete', '']
  ]
};
// Mapping natif validé sur RVS21.831F : 10112/10122, 1 = Réduit (Éco), 2 = Confort.
// Le programme ne prouve pas qu'un circuit est en chauffe. Ne pas confondre avec hvac_action.
const programmedRegime = raw => {
  if (isMissing(raw)) return null;
  const n=norm(raw);
  const m=/^([0-9]+)(?:\s|$)/.exec(String(raw).trim());
  if (m?.[1]==='1') return 'Éco';
  if (m?.[1]==='2') return 'Confort';
  if (n.includes('allure confort')) return 'Confort';
  if (n.includes('allure reduit') || n.includes('allure eco')) return 'Éco';
  return null;
};
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const html = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const isMissing = value => value === undefined || value === null || ['','unknown','unavailable','none','null'].includes(String(value).trim().toLowerCase());
const decimal = new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const integer = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const nvalue = value => {
  if (isMissing(value)) return null;
  const result = Number(String(value).replace(',','.'));
  return Number.isFinite(result) ? result : null;
};
const temp = value => {const n=nvalue(value);return n===null?'—':`${decimal.format(n)} °C`;};
const formatted = (value,unit='',decimals=1) => {
  const n=nvalue(value);
  if (n===null) return '—';
  return `${decimals===0?integer.format(n):decimal.format(n)}${unit?' '+unit:''}`;
};
const bool = state => !state || isMissing(state.state) ? null : state.state==='on'?true:state.state==='off'?false:null;
const clean = (value,max=80) => {
  if(isMissing(value)) return '—';
  const text=String(value);
  return text.length>max?text.slice(0,max-1)+'…':text;
};
const entry = (caption,value) => `<div class="datum"><span>${html(caption)}</span><strong>${html(value)}</strong></div>`;
const chip = (text,tone='dim') => `<span class="chip ${tone}">${html(text)}</span>`;
const icon = (name) => {
  const icons = {
    fan:'<circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="5"/><path d="M24 19c-3-6-7-13-1-15 8-3 13 8 6 17 M29 24c7-1 15 0 14 6-1 9-13 10-17 0 M22 29c-3 7-9 13-14 8-7-7 1-16 11-15"/>',
    therm:'<path d="M28 28V9a5 5 0 0 0-10 0v19a10 10 0 1 0 10 0Z"/><path d="M23 16v21"/>',
    radiant:'<rect x="8" y="22" width="32" height="15" rx="4"/><path d="M12 27h24M12 32h24M15 17c-3-4 3-5 0-9M24 17c-3-4 3-5 0-9M33 17c-3-4 3-5 0-9"/>',
    water:'<path d="M24 4C16 15 10 22 10 29a14 14 0 0 0 28 0C38 22 32 14 24 4Z"/><path d="M17 32c1 4 4 6 8 6"/>',
    snow:'<path d="M24 4v40M4 24h40M10 10l28 28M38 10 10 38M18 10l6 6 6-6M18 38l6-6 6 6M10 18l6 6-6 6M38 18l-6 6 6 6"/>',
    heat:'<path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5"/><circle cx="24" cy="24" r="10"/>',
    alert:'<path d="M24 5 3 42h42L24 5Z"/><path d="M24 17v12M24 35v1"/>',
    bolt:'<path d="m28 4-16 23h12l-4 17 17-24H25l3-16Z"/>',
    pause:'<rect x="11" y="10" width="9" height="28" rx="2"/><rect x="28" y="10" width="9" height="28" rx="2"/>',
    clock:'<circle cx="24" cy="24" r="19"/><path d="M24 12v13l8 5"/>'
  };
  return `<svg class="symbol" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.therm}</svg>`;
};

class PacSynoptiqueCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._ids=null;
    this._lastSignature='';
    this._lastDiscovery=0;
    this._resolvedThemeMode=null;
    this._lastThemeName=null;
    this._pendingTemp={};
    this._tempTimers={};
    this._tempBusy={};
    this._tempDesired={};
    this._sliderEditing=false;
    this._editor=null;
    this._history=null;
    this._historyGroup=null;
    this._historyOpen=false;
    this._activity=null;
    this._activityLoading=false;
    this._activityLast=0;
    this._graphs=null;
    this._graphsLoading=false;
    this._graphsLast=0;
    this._ecsForceUntil=0;
    this._ecsForceTimer=null;
    this._simCountdownTimer=null;
    this._regimePending=null;
    this._regimeError=null;
    this._curveHelp=false;
    this._onKeyDown=event=>this._handleKeyDown(event);
    this._keyboardBound=false;
    if(typeof this.shadowRoot?.addEventListener==='function'){
      this.shadowRoot.addEventListener('click', event=>this._onClick(event));
      this.shadowRoot.addEventListener('input', event=>this._onInput(event));
      this.shadowRoot.addEventListener('change', event=>this._onChange(event));
    }
  }
  connectedCallback(){
    if(!this._keyboardBound && typeof document!=='undefined' && typeof document.addEventListener==='function'){
      document.addEventListener('keydown',this._onKeyDown);
      this._keyboardBound=true;
    }
    if(!this._simCountdownTimer && typeof setInterval==='function'){
      this._simCountdownTimer=setInterval(()=>this._updateSimCountdowns(),30000);
    }
  }
  disconnectedCallback(){
    if(this._simCountdownTimer && typeof clearInterval==='function'){
      clearInterval(this._simCountdownTimer);
      this._simCountdownTimer=null;
    }
    for(const key of Object.keys(this._tempTimers||{})){
      if(this._tempTimers[key] && typeof clearTimeout==='function') clearTimeout(this._tempTimers[key]);
    }
    if(this._keyboardBound && typeof document!=='undefined' && typeof document.removeEventListener==='function'){
      document.removeEventListener('keydown',this._onKeyDown);
      this._keyboardBound=false;
    }
  }
  static getStubConfig() {return {theme_mode:'auto',layout_orientation:'auto',show_diagnostics:true,show_controls:true,circuit_1_name:'RDC',circuit_2_name:'Étage'};}
  static getConfigElement() {return document.createElement(EDITOR_TAG);}
  setConfig(config) {
    if(!config || typeof config!=='object') throw new Error('Configuration de la carte absente');
    if(config.entities && (typeof config.entities!=='object' || Array.isArray(config.entities))) throw new Error('entities doit être un objet de correspondance');
    if(config.show_links != null && typeof config.show_links !== 'boolean') throw new Error('show_links doit être un booléen');
    if(config.animate_flows != null && typeof config.animate_flows !== 'boolean') throw new Error('animate_flows doit être un booléen');
    if(config.show_pump_badges != null && typeof config.show_pump_badges !== 'boolean') throw new Error('show_pump_badges doit être un booléen');
    if(config.layout_style != null && !['classic','clean','aerien'].includes(config.layout_style)) {
      throw new Error('layout_style doit être classic, clean ou aerien');
    }
    if(config.layout_orientation != null && !['auto','landscape','portrait'].includes(config.layout_orientation)) {
      throw new Error('layout_orientation doit être auto, landscape ou portrait');
    }
    if(config.theme_mode != null && !['auto','light','dark'].includes(config.theme_mode)) {
      throw new Error('theme_mode doit être auto, light ou dark');
    }
    if(config.show_controls != null && typeof config.show_controls !== 'boolean') throw new Error('show_controls doit être un booléen');
    if(config.show_simulation != null && typeof config.show_simulation !== 'boolean') throw new Error('show_simulation doit être un booléen');
    if(config.show_graphs != null && typeof config.show_graphs !== 'boolean') throw new Error('show_graphs doit être un booléen');
    if(config.show_curve != null && typeof config.show_curve !== 'boolean') throw new Error('show_curve doit être un booléen');
    if(config.power_entity != null && typeof config.power_entity !== 'string') throw new Error('power_entity doit être un entity_id');
    if(config.energy_entity != null && typeof config.energy_entity !== 'string') throw new Error('energy_entity doit être un entity_id');
    if(config.ecs_eco_delta != null && (!Number.isFinite(Number(config.ecs_eco_delta)) || Number(config.ecs_eco_delta) < 0 || Number(config.ecs_eco_delta) > 15)) throw new Error('ecs_eco_delta doit être un nombre entre 0 et 15');
    for(const key of ['circuit_1_name','circuit_2_name']) {
      if(config[key] != null && typeof config[key] !== 'string') throw new Error(key+' doit être une chaîne');
    }
    this._config={title:'Atlantic Alféa Extensa Duo',show_diagnostics:true,show_controls:true,ecs_eco_delta:3,circuit_1_name:'RDC',circuit_2_name:'Étage',power_entity:'',theme_mode:'auto',layout_orientation:'auto',layout_style:'classic',...config};
    this._ids=null;
    this._lastSignature='';
    if(this._hass) this.hass=this._hass;
  }
  getCardSize(){return this._config?.show_diagnostics?9:7;}
  getGridOptions(){return {columns:"full",rows:"auto"};}
  set hass(hass) {
    this._hass=hass;
    if(!this._config) return;
    // Ne pas reconstruire le DOM pendant qu'un slider ou un graphique est manipulé.
    if(this._sliderEditing || this._historyOpen) return;
    // La palette suit automatiquement le thème HA, même sans changement des capteurs.
    const selected = this._config.theme_mode || 'auto';
    const actual = typeof hass.themes?.darkMode === 'boolean'
      ? (hass.themes.darkMode ? 'dark' : 'light')
      : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const rendered = selected === 'auto' ? actual : selected;
    const changed = this._resolvedThemeMode !== rendered || this._lastThemeName !== hass.themes?.theme;
    this._resolvedThemeMode = rendered;
    this._lastThemeName = hass.themes?.theme;
    this.dataset.pacTheme = selected === 'auto' ? 'auto' : selected;
    this.dataset.pacScheme = rendered;
    this.dataset.layoutStyle = ['classic','clean','aerien'].includes(this._config.layout_style) ? this._config.layout_style : 'classic';
    this.dataset.orientation = this._config.layout_orientation || 'auto';
    this.dataset.showLinks = this._config.show_links === false ? 'false' : 'true';
    this.dataset.animateFlows = this._config.animate_flows === false ? 'false' : 'true';
    // Recensement des entités au démarrage et toutes les 30 s pour prendre en compte les capteurs activés.
    if(!this._ids || Date.now()-this._lastDiscovery>30000) {
      this._ids=this._discover();this._lastDiscovery=Date.now();
    }
    const signature=JSON.stringify(Object.entries(this._ids).map(([key,id])=> {
      const st=id?hass.states[id]:null;
      return [key,id,st?.state,st?.attributes?.hvac_action,st?.attributes?.current_temperature,
        st?.attributes?.temperature,st?.attributes?.production,st?.attributes?.regime_consigne,
        st?.attributes?.phase_apprentissage,st?.attributes?.pompe_ecs,st?.attributes?.appoint_electrique];
    }).concat([['power_entity',this._config.power_entity,hass.states[this._config.power_entity]?.state]]));  // tuile « Puissance PAC » à jour
    if(changed||signature!==this._lastSignature){this._lastSignature=signature;this._render();}
  }
  _discover(){
    const states=this._hass?.states||{};
    const items=Object.entries(states).map(([id,st])=>({
      id, domain:id.split('.')[0], friendly:norm(st.attributes?.friendly_name), tail:norm(id.split('.')[1]||''),
      fromAlfea:/atlantic|alfea|bsb/.test(norm(id+' '+(st.attributes?.friendly_name||'')))
    }));
    const found={};
    for(const [key,[domain,label]] of Object.entries(FIELDS)){
      const override=this._config?.entities?.[key];
      if(typeof override==='string' && override.trim()) {found[key]=override.trim();continue;}
      const target=norm(label);
      let max=0, winner=null;
      for(const it of items){
        if(it.domain!==domain) continue;
        let score=0;
        if(it.friendly===target) score=110;
        else if(it.friendly.endsWith(' '+target)) score=100;
        else if(it.tail===target) score=85;
        else if(it.tail.endsWith(' '+target)) score=75;
        if(score && it.fromAlfea) score+=5;
        if(score>max){max=score;winner=it.id;}
      }
      found[key]=winner;
    }
    return found;
  }
  _s(key){return this._ids?.[key] ? this._hass?.states[this._ids[key]] : null;}
  _v(key){const st=this._s(key);return st&&!isMissing(st.state)?st.state:null;}
  _a(key,attr){const st=this._s(key);return st ? st.attributes?.[attr] : null;}
  _b(key){return bool(this._s(key));}
  _resolveMode(){
    const raw=norm(this._v('globalMode'));
    const c1=this._v('circuit1');
    const c2=this._v('circuit2');
    if(raw.includes('refroid')) return 'cool';
    if(raw.includes('chauff')) return 'heat';
    if(raw==='off'||raw==='arret') return 'off';
    if(c1==='cool'||c2==='cool') return 'cool';
    if(c1==='heat'||c2==='heat') return 'heat';
    if(c1==='off'&&c2==='off') return 'off';
    return 'unknown';
  }
  _nativePreset(st, off){
    if(off) return {label:'OFF',tone:'dim'};
    const raw=st?.attributes?.preset_mode;
    if(isMissing(raw)) return {label:'Régime indisponible',tone:'dim'};
    const value=norm(String(raw));
    if(value==='auto') return {label:'AUTO',tone:'positive'};
    if(value==='eco' || value==='reduit') return {label:'ECO forcé',tone:'warning'};
    if(value==='confort' || value==='comfort') return {label:'Confort forcé',tone:'warning'};
    return {label:'Régime indisponible',tone:'dim'};
  }
  // Régime effectif quand l'intégration le donne « indéterminé » : préréglage, puis programme natif BSB
  // (501 = circuit 1, 521 = circuit 2), puis comparaison consigne effective / confort / réduite.
  _deducedRegime(i, st){
    const raw=String(st?.attributes?.regime_consigne||'');
    if(raw && !/ind[ée]termin|unknown|inconnu/i.test(raw)) return raw;
    const preset=String(st?.attributes?.preset_mode||'');
    if(/confort|comfort/i.test(preset)) return 'Confort';
    if(/eco|r[ée]duit|reduced/i.test(preset)) return 'Réduit';
    const param=i===1?'501':'521';
    const prog=Object.values(this._hass?.states||{}).find(s=>String(s?.attributes?.parametre_lundi)===param && s.attributes.jours && Object.keys(s.attributes.jours).length);
    if(prog){
      const days=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      const now=new Date(); const hm=now.getHours()*60+now.getMinutes();
      const toMin=t=>{const [h,m]=String(t).split(':').map(Number); return h*60+(m||0);};
      const slots=prog.attributes.jours[days[now.getDay()]]||[];
      const inComfort=slots.some(p=>{const a=toMin(p.debut), b=toMin(p.fin)===0?1440:toMin(p.fin); return hm>=a && hm<b;});
      return inComfort?'Confort (programme)':'Réduit (programme)';
    }
    const eff=Number(st?.attributes?.consigne_effective), red=Number(st?.attributes?.consigne_reduite), conf=Number(st?.attributes?.consigne_confort);
    if(Number.isFinite(eff) && Number.isFinite(red) && Number.isFinite(conf) && red!==conf){
      if(eff===red) return 'Réduit (déduit)';
      if(eff===conf) return 'Confort (déduit)';
    }
    return raw;
  }
  _circuit(i){
    const key=`circuit${i}`;
    const st=this._s(key);
    const mode=this._v(key);
    const action=st?.attributes?.hvac_action;
    const isHeating=action==='heating';
    const isCooling=action==='cooling';
    const active=isHeating||isCooling;
    const off=mode==='off'||action==='off';
    const pump=this._b(`pump${i}`);
    const pumpActive=pump===true && !off;
    const flow=nvalue(this._v('flow'));
    const targetFlow=nvalue(this._v(`heatFlowTarget${i}`)) ?? nvalue(this._v('targetFlow'));
    const flowBelowTarget=flow!==null && targetFlow!==null && flow < targetFlow - 0.1;
    const regulationText=`Demande circulation par régulation${flowBelowTarget?` · départ ${temp(flow)} < cible ${temp(targetFlow)}`:''}`;
    const actionText=isHeating?'Chauffe actuellement':isCooling?'Rafraîchit actuellement':off?'Arrêt':
      pumpActive?regulationText:(isMissing(mode)?'État indisponible':'En attente');
    const season=this._resolveMode()==='cool'?'cool':'heat';
    const deduced=this._deducedRegime(i,st);
    const regime=String(deduced||this._v(`circuit${i}State`)||'');
    const native=this._v(`circuit${i}State`);
    const dhwPriority=/dhw priority|ecs priority/i.test(String(native||''));
    const reduced=/r[ée]duit|reduced|eco/i.test(regime);
    const setpointKey=`${season}${reduced?'Reduced':''}SetpointC${i}`;
    const setpointEntity=this._ids?.[setpointKey];
    const pending=setpointEntity?this._pendingTemp[setpointEntity]:undefined;
    const programmed=Number.isFinite(pending)?pending:this._v(setpointKey);
    return {
      number:i, key, mode, action, active, off, isHeating, isCooling, actionText, pumpActive, flowBelowTarget,
      nativePreset:this._nativePreset(st,off),
      presetMode:st?.attributes?.preset_mode,
      current:st?.attributes?.current_temperature,target:st?.attributes?.temperature,
      targetDisplay:Number.isFinite(pending)?pending:st?.attributes?.temperature,
      programmed, season, setpointKey, reduced,
      regime:deduced, native:this._v(`circuit${i}State`),
      program:this._v(`program${i}`), pump:this._b(`pump${i}`),
      flowTemp:this._v(`flowTempC${i}`), dhwPriority,
      override:this._b(`override${i}`),
      targetFlow:this._v(`heatFlowTarget${i}`)
    };
  }
  _ecsWaterHeater(){
    const configured=this._config?.ecs_mode_entity;
    if(configured && this._hass?.states?.[configured]) return configured;
    const atlantic=Object.values(this._hass?.states||{}).find(state=>
      state.entity_id?.startsWith('water_heater.') &&
      (state.entity_id.includes('atlantic_alfea') ||
       String(state.attributes?.friendly_name||'').includes('Atlantic Alfea'))
    );
    return atlantic?.entity_id || 'water_heater.bsb_lan';
  }
  _ecs(){
    const production=this._v('ecsProduction')||this._a('ecsHeater','production');
    const p=norm(production);
    const pump=this._b('ecsPump')??(typeof this._a('ecsHeater','pompe_ecs')==='boolean'?this._a('ecsHeater','pompe_ecs'):null);
    const electric=this._b('ecsElectric')??(typeof this._a('ecsHeater','appoint_electrique')==='boolean'?this._a('ecsHeater','appoint_electrique'):null);
    const viaPac=(p.includes('chauffe par pac')||p.includes('pac appoint electrique')) && pump!==false && this._b('compressor')!==false;
    const withElectric=electric===true||p==='appoint electrique'||p.includes('pac appoint electrique');
    const tempBallon=this._v('ecsTemp') ?? this._a('ecsHeater','current_temperature');
    const comfortSetpoint=this._pendingEcs?String(this._pendingEcs.comfort):this._v('ecsComfortSetpoint');
    const ecsModeEntity=this._ecsWaterHeater();
    const waterHeater=this._hass?.states[ecsModeEntity];
    // 8831 peut valoir 5 °C lorsque l'ECS est hors service : le water_heater
    // expose la consigne réellement affichée par la PAC.
    const currentSetpoint=waterHeater?.attributes?.temperature ?? comfortSetpoint;
    const ecoSetpoint=this._pendingEcs?String(this._pendingEcs.eco):this._v('ecsEcoSetpoint');
    const target=comfortSetpoint ?? this._a('ecsHeater','temperature');
    return {production:clean(production||this._v('ecsState')||'Indisponible',56),
      viaPac,withElectric,pump,electric,tempBallon,target,comfortSetpoint,currentSetpoint,ecoSetpoint};
  }
  _pipe(tone='idle',vertical=false){
    return `<div class="pipe ${vertical?'vertical':''} ${tone}"><span class="pipe-light"></span></div>`;
  }
  _label(key){return FIELDS[key]?.[1] || key;}
  _circuitName(i){
    const raw=this._config?.[`circuit_${i}_name`];
    const value=typeof raw==='string'?raw.trim():'';
    return value || (i===1?'RDC':'Étage');
  }
  async _onClick(event){
    const path=typeof event.composedPath==='function'?event.composedPath():[];
    const target=path.find(node=>node && node.dataset && node.dataset.pacAction) ||
      (event.target?.dataset?.pacAction?event.target:null);
    if(!target) return;
    event.stopPropagation();
    const action=target.dataset.pacAction;
    const circuit=Number(target.dataset.circuit||0);
    try{
      if(action==='global'){
        const entity=this._ids?.globalMode;
        const option=target.dataset.value;
        if(!entity || !['Off','Chauffage','Refroidissement'].includes(option)) return;
        await this._hass.callService('select','select_option',{entity_id:entity,option});
        return;
      }
      if(action==='hvac'){
        const entity=this._ids?.[`circuit${circuit}`];
        if(!entity) return;
        let hvac=target.dataset.value;
        if(hvac==='auto'){
          const season=this._resolveMode();
          if(season!=='heat' && season!=='cool') return;
          hvac=season;
        }
        if(!['off','heat','cool'].includes(hvac)) return;
        await this._hass.callService('climate','set_hvac_mode',{entity_id:entity,hvac_mode:hvac});
        return;
      }
      if(action==='regime'){
        const entity=this._ids?.[`circuit${circuit}`];
        if(!entity) return;
        const value=target.dataset.value;
        if(!['Auto','Confort','Réduit'].includes(value)) return;
        const pending={circuit,value};
        this._regimePending=pending;
        this._regimeError=null;
        this._render();
        try{
          if(this._hass.states?.[entity]?.state==='off'){
            await this._hass.callService('climate','set_hvac_mode',{entity_id:entity,hvac_mode:'heat'});
            await new Promise(resolve=>setTimeout(resolve,700));
          }
          await this._hass.callService('climate','set_preset_mode',{entity_id:entity,preset_mode:value==='Réduit'?'ECO':value});
        }catch(err){
          this._regimeError={circuit,message:String(err?.message||err)};
        }finally{
          if(this._regimePending===pending) this._regimePending=null;
          this._render();
        }
        return;
      }
      if(action==='sim-toggle'){
        const entity=this._ids?.[`sim${Number(target.dataset.circuit||0)}`];
        if(entity) this._hass.callService('switch', target.checked?'turn_on':'turn_off', {entity_id:entity});
        return;
      }
      if(action==='temp'){
        const mode=this._resolveMode();
        const season=mode==='cool'?'cool':'heat';
        const setpointKey=this._circuit(circuit).setpointKey||`${season}SetpointC${circuit}`;
        const entity=this._ids?.[setpointKey];
        if(!entity) return;
        const current=this._num(this._v(setpointKey));
        if(current===null) return;
        const base=Number.isFinite(this._pendingTemp[entity])?this._pendingTemp[entity]:current;
        const delta=Number(target.dataset.delta);
        const next=season==='cool'?Math.max(7,Math.min(30,base+delta)):Math.max(7,Math.min(35,base+delta));
        this._pendingTemp[entity]=next;
        this._render();
        this._queueTempWrite(`circuit${circuit}`,()=>this._setCircuitTarget(circuit,next));
        return;
      }
      if(action==='ecs'){
        const current=this._num(this._v('ecsComfortSetpoint'));
        const base=Number.isFinite(this._pendingEcs?.comfort)?this._pendingEcs.comfort:current;
        if(base===null) return;
        const delta=Number(target.dataset.delta);
        const ecoDelta=Math.max(0,Math.min(15,Number(this._config?.ecs_eco_delta ?? 3)));
        const comfortValue=Math.round(Math.max(40,Math.min(65,base+delta)));
        const ecoValue=Math.round(Math.max(5,Math.min(65,comfortValue-ecoDelta)));
        this._pendingEcs={comfort:comfortValue,eco:ecoValue};
        this._render();
        this._queueTempWrite('ecs',()=>this._setEcs(comfortValue));
        return;
      }
      if(action==='ecs-force-cycle'){
        const entity=this._ids?.ecsForceCycle;
        if(!entity || !this._hass?.states[entity]) return;
        this._ecsForceUntil=Date.now()+10000;
        if(this._ecsForceTimer) clearTimeout(this._ecsForceTimer);
        this._ecsForceTimer=setTimeout(()=>{
          this._ecsForceUntil=0;
          this._ecsForceTimer=null;
          this._render();
        },10000);
        this._render();
        await this._hass.callService('button','press',{entity_id:entity});
        return;
      }
      if(action==='ecs-mode'){
        const entity=this._ecsWaterHeater();
        const value=target.dataset.value;
        if(!this._hass?.states[entity] || !['off','on'].includes(value)) return;
        const modes=this._hass.states[entity].attributes?.operation_list || [];
        const offMode=modes.find(mode=>/arr[êe]t|off/i.test(String(mode)));
        const onMode=modes.find(mode=>!/arr[êe]t|off|eco/i.test(String(mode))) ||
          modes.find(mode=>!/arr[êe]t|off/i.test(String(mode)));
        const operationMode=value==='off'?offMode:onMode;
        if(!operationMode) return;
        await this._hass.callService('water_heater','set_operation_mode',{entity_id:entity,operation_mode:operationMode});
        this._render();
        return;
      }
      if(action==='edit'){
        this._openEditor(target.dataset.target,Number(target.dataset.circuit||0));
        return;
      }
      if(action==='history'){
        this._openHistory(target.dataset.entity,target.dataset.label);
        return;
      }
      if(action==='history-group'){
        this._openHistoryGroup();
        return;
      }
      if(action==='close-history'){
        this._closeHistory();
        return;
      }
      if(action==='curve-help'){
        this._curveHelp=true;
        this._render();
        return;
      }
      if(action==='close-curve-help'){
        this._curveHelp=false;
        this._render();
        return;
      }
      if(action==='close-editor'){
        this._editor=null;
        this._sliderEditing=false;
        this._render();
      }
    }catch(err){
      if(typeof console!=='undefined') console.warn('PAC Synoptique: commande refusée',err);
    }
  }
  _num(value){
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)?n:null;
  }
  _queueTempWrite(key,job){
    this._tempDesired[key]=job;
    if(this._tempTimers[key] && typeof clearTimeout==='function') clearTimeout(this._tempTimers[key]);
    if(typeof setTimeout!=='function'){ this._flushTempWrite(key); return; }
    this._tempTimers[key]=setTimeout(()=>{ this._tempTimers[key]=null; this._flushTempWrite(key); },600);
  }
  async _flushTempWrite(key){
    if(this._tempBusy[key]) return;
    const job=this._tempDesired[key];
    if(!job) return;
    this._tempBusy[key]=true;
    this._tempDesired[key]=null;
    try{ await job(); }
    finally{
      this._tempBusy[key]=false;
      if(this._tempDesired[key]) await this._flushTempWrite(key);
    }
  }
  async _setEcs(value){
    const comfort=this._ids?.ecsComfortSetpoint;
    const eco=this._ids?.ecsEcoSetpoint;
    if(!comfort || !eco) return;
    const delta=Math.max(0,Math.min(15,Number(this._config?.ecs_eco_delta ?? 3)));
    const comfortValue=Math.round(Math.max(40,Math.min(65,value)));
    const ecoValue=Math.round(Math.max(5,Math.min(65,comfortValue-delta)));
    this._pendingEcs={comfort:comfortValue,eco:ecoValue};
    if(typeof setTimeout==='function') setTimeout(()=>{this._pendingEcs=null;if(!this._sliderEditing)this._render();},15000);
    await this._hass.callService('number','set_value',{entity_id:comfort,value:comfortValue});
    await this._hass.callService('number','set_value',{entity_id:eco,value:ecoValue});
  }
  async _setCircuitTarget(circuit,value){
    const mode=this._resolveMode();
    const season=mode==='cool'?'cool':'heat';
    const key=this._circuit(circuit).setpointKey||`${season}SetpointC${circuit}`;
    const entity=this._ids?.[key];
    if(!entity) return;
    const clamped=season==='cool'?Math.max(7,Math.min(30,value)):Math.max(7,Math.min(35,value));
    const rounded=Math.round(clamped*2)/2;
    this._pendingTemp[entity]=rounded;
    if(typeof setTimeout==='function') setTimeout(()=>{delete this._pendingTemp[entity];if(!this._sliderEditing)this._render();},60000);
    await this._hass.callService('number','set_value',{entity_id:entity,value:rounded});
  }
  _modalTarget(event){
    const path=typeof event.composedPath==='function'?event.composedPath():[];
    return path.find(node=>node && node.dataset && node.dataset.pacAction==='modal-slide');
  }
  _openEditor(target,circuit){
    const isEcs=target==='ecs';
    const season=this._resolveMode()==='cool'?'cool':'heat';
    const value=isEcs?this._num(this._v('ecsComfortSetpoint')):this._num(this._v(this._circuit(circuit).setpointKey||`${season}SetpointC${circuit}`));
    if(value===null) return;
    this._editor={target,circuit,value,
      min:isEcs?40:7,
      max:isEcs?65:(season==='cool'?30:35),
      step:isEcs?1:0.5,
      label:isEcs?'ECS':this._circuitName(circuit)};
    this._sliderEditing=true;
    this._render();
  }
  _editorHtml(){
    const e=this._editor;
    if(!e) return '';
    return `<div class="ctl-modal" data-pac-action="close-editor">
      <div class="ctl-modal-panel" data-pac-action="modal-panel" role="dialog" aria-modal="true" aria-label="Consigne ${html(e.label)}">
        <div class="ctl-modal-head"><span>Consigne · ${html(e.label)}</span><button type="button" class="ctl-modal-close" data-pac-action="close-editor" aria-label="Fermer">×</button></div>
        <div class="ctl-modal-value" data-modal-value>${html(temp(e.value))}</div>
        <input type="range" min="${e.min}" max="${e.max}" step="${e.step}" value="${e.value}" data-pac-action="modal-slide" data-target="${e.target}" data-circuit="${e.circuit||0}" aria-label="Consigne ${html(e.label)}">
        <div class="ctl-modal-actions"><button type="button" class="ctl-btn" data-pac-action="close-editor">Fermer</button></div>
      </div>
    </div>`;
  }
  _onInput(event){
    const target=this._modalTarget(event);
    if(!target || !this._editor) return;
    this._editor.value=Number(target.value);
    const label=this.shadowRoot.querySelector('[data-modal-value]');
    if(label) label.textContent=temp(target.value);
  }
  async _onChange(event){
    const sim=event.target?.closest?.('[data-pac-action="sim-duration"]');
    if(sim){
      const value=Number(sim.value);
      const entity=this._ids?.[`simDuration${Number(sim.dataset.circuit||0)}`];
      if(entity && Number.isFinite(value)) await this._hass.callService('number','set_value',{entity_id:entity,value});
      return;
    }
    const target=this._modalTarget(event);
    if(!target || !this._editor) return;
    const value=Number(target.value);
    if(!Number.isFinite(value)) return;
    this._editor.value=value;
    try{
      if(this._editor.target==='ecs') await this._setEcs(value);
      else await this._setCircuitTarget(this._editor.circuit,value);
    }catch(err){
      if(typeof console!=='undefined') console.warn('PAC Synoptique: commande refusée',err);
    }
  }
  _tempLink(value,entity,label,group=false){
    const text=html(temp(value));
    if(!entity) return `<strong>${text}</strong>`;
    return `<strong class="temp-link" data-pac-action="${group?'history-group':'history'}" data-entity="${html(entity)}" data-label="${html(label)}" title="Historique sur 3 h">${text}</strong>`;
  }
  _roomTempEntity(i){return this._ids?.[`roomTemp${i}`];}
  _openHistory(entity,label){
    if(!entity) return;
    this._editor=null;
    this._sliderEditing=false;
    this._history={entity,label:label||entity,loading:true,points:[],error:null};
    this._historyGroup=null;
    this._historyOpen=true;
    this._render();
    this._loadHistory();
  }
  _openHistoryGroup(){
    const entries=[
      ['flow','Départ PAC'],
      ['returnTemp','Retour PAC'],
      ['targetFlow','Consigne départ']
    ].map(([key,name])=>({entity:this._ids?.[key],name})).filter(item=>Boolean(item.entity));
    if(!entries.length) return;
    this._editor=null;
    this._sliderEditing=false;
    this._history=null;
    this._historyGroup={entries};
    this._historyOpen=true;
    this._render();
  }
  async _mountHistoryGroup(){
    const group=this._historyGroup;
    const host=this.shadowRoot?.querySelector?.('#pac-history-group-card');
    if(!group || !host || typeof window==='undefined' || typeof window.loadCardHelpers!=='function') return;
    try{
      const helpers=await window.loadCardHelpers();
      if(this._historyGroup!==group || !this.isConnected) return;
      const card=helpers.createCardElement({
        type:'history-graph',
        entities:group.entries.map(item=>({entity:item.entity,name:item.name})),
        hours_to_show:24,
        refresh_interval:0
      });
      card.hass=this._hass;
      host.replaceChildren(card);
    }catch(err){
      host.textContent='Historique indisponible : '+String(err?.message||err);
    }
  }
  async _loadHistory(){
    const current=this._history;
    if(!current) return;
    const entity=current.entity;
    try{
      const points=await this._historyPoints(entity);
      if(this._history?.entity!==entity) return;
      this._history={entity,label:current.label,loading:false,points,error:null};
    }catch(err){
      if(this._history?.entity!==entity) return;
      this._history={entity,label:current.label,loading:false,points:[],error:'Historique indisponible : '+String(err?.message||err)};
    }
    this._render();
  }
  async _historyPoints(entity){
    const end=Date.now();
    const start=end-3*3600*1000;
    const cleanRows=rows=>rows.map(row=>{
      const raw=row.mean!==null && row.mean!==undefined ? row.mean : (row.state??row.s);
      return {
        t:new Date(row.last_changed||row.last_updated||row.lc||row.lu||row.start).getTime(),
        v:raw===null||raw===undefined?NaN:Number(raw)
      };
    }).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v));
    let history=[];
    try{
      const url=`history/period/${new Date(start).toISOString()}?filter_entity_id=${encodeURIComponent(entity)}&minimal_response`;
      const data=await this._hass.callApi('GET',url);
      history=cleanRows(Array.isArray(data)&&Array.isArray(data[0])?data[0]:[]);
    }catch(_err){ /* historique indisponible : on tentera les statistiques */ }
    let stats=[];
    if(typeof this._hass.callWS==='function'){
      try{
        const result=await this._hass.callWS({
          type:'recorder/statistics_during_period',
          start_time:new Date(start).toISOString(),
          end_time:new Date(end).toISOString(),
          statistic_ids:[entity],
          period:'5minute',
          types:['mean','state']
        });
        stats=cleanRows(result?.[entity]||[]);
      }catch(_err){ /* pas de statistiques pour cette entité */ }
    }
    const best=stats.length>=history.length?stats:history;
    const current=this._hass.states?.[entity];
    const value=current && !isMissing(current.state)?Number(current.state):NaN;
    if(Number.isFinite(value)) best.push({t:end,v:value});
    best.sort((a,b)=>a.t-b.t);
    const dedup=[];
    for(const point of best){
      if(dedup.length && point.t-dedup[dedup.length-1].t<1000) dedup[dedup.length-1]=point;
      else dedup.push(point);
    }
    return dedup;
  }
  _closeHistory(){
    this._history=null;
    this._historyGroup=null;
    this._historyOpen=false;
    this._render();
  }
  _handleKeyDown(event){
    if(event.key!=='Escape') return;
    if(this._historyOpen){ this._closeHistory(); event.stopPropagation(); return; }
    if(this._curveHelp){ this._curveHelp=false; this._render(); event.stopPropagation(); return; }
    if(this._editor){ this._editor=null; this._sliderEditing=false; this._render(); event.stopPropagation(); }
  }
  _ensureActivity(){
    if(this._activityLoading || Date.now()-this._activityLast<60000) return;
    const states=Object.keys(this._hass?.states||{});
    const raw=nativeId=>states.find(id=>id.startsWith('sensor.bsb_lan_') && id.includes(`_${nativeId}_`));
    const native=[raw('8006'),raw('8003'),raw('8000'),raw('8001')].filter(Boolean);
    const entities=native.length?native:['pacState','circuit1State','circuit2State','ecsState']
      .map(key=>this._ids?.[key]).filter(Boolean);
    if(!entities.length) return;
    this._activityLoading=true;
    this._activityLast=Date.now();
    this._loadActivity(entities);
  }
  async _loadActivity(entities){
    try{
      const start=encodeURIComponent(new Date(Date.now()-6*3600e3).toISOString());
      const batches=await Promise.all(entities.map(async entity=>{
        try{
          const rows=await this._hass.callApi('GET',`logbook/${start}?entity=${encodeURIComponent(entity)}`);
          return Array.isArray(rows)?rows:[];
        }catch(_err){
          return [];
        }
      }));
      const interesting=batches.flat()
        .filter(row=>{
          const text=String(row.message||row.state||'').toLowerCase();
          return !/no request|unknown|unavailable|indisponible|^none$/.test(text);
        })
        .sort((a,b)=>new Date(b.when||0)-new Date(a.when||0));
      const unique=[];
      for(const row of interesting){
        const key=`${row.entity_id||''}|${row.message||row.state||''}`;
        if(unique.length && unique[unique.length-1].key===key) continue;
        unique.push({...row,key});
      }
      this._activity=unique.slice(0,8);
    }catch(_err){
      this._activity=[];
    }
    this._activityLoading=false;
    this._render();
  }
  _energySplitIds(){
    const states=this._hass?.states||{};
    const find=(configured,suffix)=>{
      if(configured && states[configured]) return configured;
      return Object.keys(states).find(id=>id.startsWith('sensor.') && id.endsWith(suffix))||null;
    };
    return {
      circuits:find(this._config?.energy_circuits_entity,'_c1_c2_energie_consommee'),
      ecs:find(this._config?.energy_ecs_entity,'_ecs_energie_consommee')
    };
  }
  _ensureGraphs(){
    if(this._graphsLoading || Date.now()-this._graphsLast<300000) return;
    const ids=this._energySplitIds();
    if(!ids.circuits && !ids.ecs){
      this._graphs={error:'Capteurs « C1+C2 / ECS - Énergie consommée » introuvables (intégration ≥ 1.5.42).'};
      return;
    }
    this._graphsLoading=true;
    this._graphsLast=Date.now();
    this._loadGraphs(ids);
  }
  async _loadGraphs(ids){
    try{
      if(typeof this._hass.callWS!=='function') throw new Error('statistiques indisponibles');
      const statIds=[ids.circuits,ids.ecs].filter(Boolean);
      const now=new Date();
      const today=new Date(now); today.setHours(0,0,0,0);
      const weekStart=new Date(today); weekStart.setDate(weekStart.getDate()-6);
      const query=(start,period)=>this._hass.callWS({
        type:'recorder/statistics_during_period',
        start_time:start.toISOString(),end_time:now.toISOString(),
        statistic_ids:statIds,period,types:['change']
      });
      const [daily,hourly]=await Promise.all([query(weekStart,'day'),query(today,'hour')]);
      const dayKey=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      const fill=(result,buckets,keyOf)=>{
        for(const [series,id] of [['circuits',ids.circuits],['ecs',ids.ecs]]){
          for(const row of (id&&result?.[id])||[]){
            const start=new Date(row.start);
            const value=Number(row.change);
            const bucket=buckets.get(keyOf(start));
            if(bucket && Number.isFinite(value)) bucket[series]+=Math.max(0,value);
          }
        }
      };
      const days=new Map();
      for(let i=0;i<7;i++){
        const d=new Date(weekStart); d.setDate(d.getDate()+i);
        days.set(dayKey(d),{start:d,circuits:0,ecs:0,current:i===6});
      }
      fill(daily,days,dayKey);
      const hours=new Map();
      for(let h=0;h<24;h++){
        const d=new Date(today); d.setHours(h);
        hours.set(h,{start:d,circuits:0,ecs:0,current:h===now.getHours(),future:h>now.getHours()});
      }
      fill(hourly,hours,d=>dayKey(d)===dayKey(today)?d.getHours():-1);
      this._graphs={ids,days:[...days.values()],hours:[...hours.values()],updated:now};
    }catch(err){
      this._graphs={error:'Statistiques indisponibles : '+String(err?.message||err)};
    }
    this._graphsLoading=false;
    this._render();
  }
  _energyChartHtml(title,subtitle,rows,kind){
    const fmt=(v,d=1)=>v.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
    const sum=key=>rows.reduce((t,r)=>t+r[key],0);
    const circuits=sum('circuits'), ecs=sum('ecs'), total=circuits+ecs;
    const maximum=Math.max(0.001,...rows.map(r=>r.circuits+r.ecs));
    const digits=kind==='hour'?2:1;
    const bars=rows.map((r,index)=>{
      const t=r.circuits+r.ecs;
      const label=kind==='hour'
        ? (index%3===0?`${String(r.start.getHours()).padStart(2,'0')}h`:'')
        : r.start.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','');
      const sub=kind==='hour'?'':r.start.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
      const when=kind==='hour'
        ? `${String(r.start.getHours()).padStart(2,'0')}:00–${String(r.start.getHours()+1).padStart(2,'0')}:00`
        : r.start.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
      const tip=`${when}\nC1+C2 : ${fmt(r.circuits,3)} kWh\nECS : ${fmt(r.ecs,3)} kWh\nTotal : ${fmt(t,3)} kWh`;
      const value=kind==='day' && t>0?`<strong>${fmt(t,digits)}</strong>`:'<strong></strong>';
      const cls=['eg-col',r.current?'is-now':'',r.future?'is-future':''].filter(Boolean).join(' ');
      return `<div class="${cls}" title="${html(tip)}">${value}<div class="eg-track">`+
        `<div class="eg-seg eg-ecs" style="height:${(r.ecs/maximum*100).toFixed(2)}%"></div>`+
        `<div class="eg-seg eg-circ" style="height:${(r.circuits/maximum*100).toFixed(2)}%"></div>`+
        `</div><span>${html(label)}${sub?`<small>${html(sub)}</small>`:''}</span></div>`;
    }).join('');
    const share=total>0?Math.round(ecs/total*100):0;
    return `<section class="eg-card eg-${kind}">
      <header class="eg-head">
        <div><span class="eg-title">${html(title)}</span><small>${html(subtitle)}</small></div>
        <div class="eg-total"><b>${fmt(total,digits)}</b><small>kWh</small></div>
      </header>
      <div class="eg-legend">
        <span><i class="eg-dot eg-circ"></i>C1+C2 <b>${fmt(circuits,digits)}</b></span>
        <span><i class="eg-dot eg-ecs"></i>ECS <b>${fmt(ecs,digits)}</b></span>
        <span class="eg-share"><span class="eg-share-bar"><span style="width:${100-share}%"></span></span>${100-share}% / ${share}%</span>
      </div>
      <div class="eg-plot"><div class="eg-grid" style="--n:${rows.length}">${bars}</div></div>
    </section>`;
  }
  _graphsHtml(){
    const graph=this._graphs;
    if(graph===null) return '<div class="graph-note">Chargement des consommations…</div>';
    if(graph.error) return `<div class="graph-note">${html(graph.error)}</div>`;
    const now=graph.updated.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    return `<div class="eg-wrap">
      ${this._energyChartHtml('Consommation quotidienne','7 derniers jours',graph.days,'day')}
      ${this._energyChartHtml('Aujourd’hui heure par heure',`mise à jour ${now}`,graph.hours,'hour')}
      <p class="eg-note">Compteur global réparti par l’intégration : ECS pendant une charge ECS (8003), sinon C1+C2.</p>
    </div>`;
  }
  _curveHtml(){
    const read=circuit=>{
      const slope=nvalue(this._v(`curveSlope${circuit}`));
      if(slope===null) return null;
      const offset=nvalue(this._v(`curveOffset${circuit}`))??0;
      const min=nvalue(this._v(`curveMin${circuit}`))??15;
      const max=nvalue(this._v(`curveMax${circuit}`))??65;
      const gain=nvalue(this._v(`curveGain${circuit}`));
      return {circuit,slope,offset,min,max,gain};
    };
    const curves=[read(1),read(2)].filter(Boolean);
    if(!curves.length) return '<div class="graph-note">Loi d’eau indisponible : paramètres 720/1020 non publiés.</div>';
    const W=420,H=220,left=36,right=12,top=12,bottom=28;
    const plotW=W-left-right,plotH=H-top-bottom;
    const x=t=>left+(t+10)/30*plotW;
    const y=v=>top+(65-v)/50*plotH;
    const ticksX=[-10,0,10,20];
    const ticksY=[15,25,35,45,55,65];
    const grid=[...ticksX.map(t=>`<line x1="${x(t)}" y1="${top}" x2="${x(t)}" y2="${top+plotH}" class="curve-grid"/><text x="${x(t)}" y="${H-8}" class="curve-axis" text-anchor="middle">${t}</text>`),
      ...ticksY.map(v=>`<line x1="${left}" y1="${y(v)}" x2="${left+plotW}" y2="${y(v)}" class="curve-grid"/><text x="${left-5}" y="${y(v)+3}" class="curve-axis" text-anchor="end">${v}</text>`)].join('');
    const paths=curves.map(curve=>{
      const color=curve.circuit===1?'var(--red)':'var(--blue)';
      const points=[];
      for(let t=-10;t<=20;t+=1){
        const value=Math.max(curve.min,Math.min(curve.max,20+curve.slope*(20-t)+curve.offset));
        points.push(`${x(t).toFixed(1)},${y(value).toFixed(1)}`);
      }
      return `<line x1="${left}" y1="${y(curve.max)}" x2="${left+plotW}" y2="${y(curve.max)}" stroke="${color}" stroke-width="1" stroke-dasharray="5 5" opacity=".35"/><line x1="${left}" y1="${y(curve.min)}" x2="${left+plotW}" y2="${y(curve.min)}" stroke="${color}" stroke-width="1" stroke-dasharray="2 4" opacity=".35"/><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
    }).join('');
    const value=(key,digits,unit='')=>{
      const raw=nvalue(this._v(key));
      return raw===null?'—':html(raw.toFixed(digits).replace('.',','))+(unit?`<small>${unit}</small>`:'');
    };
    const row=(circuit,slope,offset,minimum,maximum,gain,winter)=>`<div class="curve-table-row"><strong><i class="c${circuit}"></i>C${circuit}</strong><span>${value(slope,2)}</span><span>${value(offset,1,' °C')}</span><span>${value(minimum,1,' °C')}</span><span>${value(maximum,1,' °C')}</span><span>${value(gain,0,' %')}</span><span>${value(winter,1,' °C')}</span></div>`;
    const table=`<div class="curve-table-wrap"><div class="curve-table">
      <div class="curve-table-head"><span>Circuit</span><span>Pente</span><span>Décalage</span><span>Min</span><span>Max</span><span>Influence</span><span>Bascule</span></div>
      ${row(1,'curveSlope1','curveOffset1','curveMin1','curveMax1','curveGain1','curveWinter1')}
      ${row(2,'curveSlope2','curveOffset2','curveMin2','curveMax2','curveGain2','curveWinter2')}
    </div></div>`;
    return `<div class="curve-head"><span>Loi d’eau · T. départ selon T. extérieure</span><span class="curve-head-actions"><small>lecture seule</small><button type="button" class="curve-info" data-pac-action="curve-help" aria-label="Aide sur la loi d’eau" title="Aide et réglages">i</button></span></div><svg class="curve-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Loi d’eau C1 et C2"><text x="${left}" y="${top-2}" class="curve-axis">T. départ °C</text>${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${top+plotH}" class="curve-axis-line"/><line x1="${left}" y1="${top+plotH}" x2="${left+plotW}" y2="${top+plotH}" class="curve-axis-line"/>${paths}<text x="${left+plotW}" y="${H-8}" class="curve-axis" text-anchor="end">T. ext. °C</text></svg>${table}<div class="curve-note">Reconstruction à partir de la pente et du décalage BSB ; l’influence ambiante et les limites du régulateur s’appliquent ensuite. ECS : pas de loi d’eau, consignes 1610/1612.</div>`;
  }
  _curveHelpHtml(){
    return `<div class="ctl-modal" data-pac-action="close-curve-help">
      <div class="ctl-modal-panel curve-help-panel" data-pac-action="modal-panel" role="dialog" aria-modal="true" aria-label="Aide loi d’eau">
        <div class="ctl-modal-head"><span>Optimiser la loi d’eau</span><button type="button" class="ctl-modal-close" data-pac-action="close-curve-help" aria-label="Fermer">×</button></div>
        <div class="curve-help-body">
          <p>Le paramètre le plus important est la <strong>pente de la loi d’eau</strong> :</p>
          <ul><li><strong>C1 radiateurs :</strong> 720</li><li><strong>C2 plancher :</strong> 1020</li></ul>
          <p>C’est elle qui détermine la température de départ selon la température extérieure. Une pente trop élevée fait circuler de l’eau plus chaude que nécessaire :</p>
          <ul><li>baisse du COP de la PAC ;</li><li>consommation plus élevée ;</li><li>dépassements de consigne.</li></ul>
          <h5>Ordre d’optimisation</h5>
          <ol>
            <li><strong>Pente :</strong> baisser par paliers de 0,1, puis attendre 24–48 h.</li>
            <li><strong>Décalage parallèle (721/1021) :</strong> ajustement fin de −0,5 °C si le confort reste bon.</li>
            <li><strong>Influence ambiante (750/1050) :</strong> à réduire seulement si elle fait trop monter le départ.</li>
            <li><strong>Bascule été/hiver (730/1030) :</strong> éventuellement 17 °C au lieu de 18 pour chauffer moins en mi-saison.</li>
            <li><strong>Limite max (741/1041) :</strong> paramètre de sécurité, pas d’économie directe.</li>
          </ol>
          <h5>Pour une chauffe plus rapide</h5>
          <p>Augmenter le <strong>décalage parallèle</strong> 721/1021 de +1 à +2 °C, ou forcer le preset <strong>Confort</strong>. Pour un plancher chauffant, anticiper de 2 à 4 h : l’inertie de la dalle reste le facteur principal.</p>
          <p class="curve-help-warning">Ces paramètres sont en lecture seule via BSB-LAN : les modifier sur le régulateur de la PAC. Toute hausse réduit le COP et peut provoquer une surchauffe.</p>
        </div>
        <div class="ctl-modal-actions"><button type="button" class="ctl-btn" data-pac-action="close-curve-help">Fermer</button></div>
      </div>
    </div>`;
  }
  _activityHtml(){    const rows=this._activity;
    const dayLabel=when=>{
      const date=when?new Date(when):new Date();
      const today=new Date();
      const same=date.toDateString()===today.toDateString();
      const text=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(date);
      return same?`Aujourd’hui · ${text}`:text;
    };
    if(rows===null){
      return `<div class="activity"><div class="activity-date">${html(dayLabel())}</div><div class="activity-empty">Chargement…</div></div>`;
    }
    if(!rows.length){
      return `<div class="activity"><div class="activity-date">${html(dayLabel())}</div><div class="activity-empty">Aucune activité sur 6 h</div></div>`;
    }
    const items=rows.map((row,index)=>{
      const when=row.when?new Date(row.when):null;
      const time=when&&!Number.isNaN(when.getTime())
        ? when.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
        : '—';
      const entityId=String(row.entity_id||'');
      const rawLabel=entityId.includes('_8006_')?'État PAC':entityId.includes('_8003_')?'État ECS':entityId.includes('_8000_')?'C1 - État':entityId.includes('_8001_')?'C2 - État':'';
      const label=rawLabel||clean(row.name||row.entity_id||'PAC',42);
      const text=clean(row.message||row.state||'—',150);
      return `<div class="activity-row"><span class="activity-dot${index===0?' first':''}"></span><div class="activity-body"><div class="activity-line"><strong class="activity-name">${html(label)}</strong><span class="activity-message">${html(text)}</span></div><div class="activity-meta"><span>${html(time)}</span><span class="activity-chevron">›</span></div></div></div>`;
    }).join('');
    return `<div class="activity"><div class="activity-date">${html(dayLabel(rows[0]?.when))}</div><div class="activity-list">${items}</div></div>`;
  }
  _historyHtml(){
    const h=this._history;
    if(!h) return '';
    const body=h.loading?'<div class="hist-note">Chargement de l’historique…</div>':
      h.error?`<div class="hist-note error">${html(h.error)}</div>`:
      h.points.length<2?'<div class="hist-note">Pas assez de points sur les 3 dernières heures.</div>':
      this._historySvg(h);
    const legend=h.points.length>=2?`<div class="hist-legend">
      <span>Min <b>${html(temp(Math.min(...h.points.map(p=>p.v))))}</b></span>
      <span>Max <b>${html(temp(Math.max(...h.points.map(p=>p.v))))}</b></span>
      <span>Actuel <b>${html(temp(h.points[h.points.length-1].v))}</b></span></div>`:'';
    return `<div class="ctl-modal" data-pac-action="close-history">
      <div class="ctl-modal-panel" data-pac-action="modal-panel" role="dialog" aria-modal="true" aria-label="Historique ${html(h.label)}">
        <div class="ctl-modal-head"><span>${html(h.label)} · 3 h</span><button type="button" class="ctl-modal-close" data-pac-action="close-history" aria-label="Fermer">×</button></div>
        ${body}${legend}
        <div class="ctl-modal-actions"><button type="button" class="ctl-btn" data-pac-action="close-history">Fermer</button></div>
      </div></div>`;
  }
  _historyGroupHtml(){
    return `<div class="ctl-modal" data-pac-action="close-history">
      <div class="ctl-modal-panel history-panel" data-pac-action="modal-panel" role="dialog" aria-modal="true" aria-label="Historique PAC">
        <div class="ctl-modal-head"><span>Historique PAC · 24 h</span><button type="button" class="ctl-modal-close" data-pac-action="close-history" aria-label="Fermer">×</button></div>
        <div id="pac-history-group-card" class="history-standard"></div>
        <div class="ctl-modal-actions"><button type="button" class="ctl-btn" data-pac-action="close-history">Fermer</button></div>
      </div></div>`;
  }
  _historySvg(h){
    const points=h.points;
    const w=320,hgt=160,pad=14,top=10,bottom=18;
    const t0=points[0].t,t1=points[points.length-1].t;
    const values=points.map(p=>p.v);
    let min=Math.min(...values),max=Math.max(...values);
    if(max-min<0.5){const mid=(max+min)/2;min=mid-0.5;max=mid+0.5;}
    const x=t=>pad+((t-t0)/(t1-t0||1))*(w-2*pad);
    const y=v=>hgt-bottom-((v-min)/(max-min))*(hgt-top-bottom);
    const path=points.map((p,i)=>`${i?'L':'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const area=`${path} L${x(t1).toFixed(1)} ${hgt-bottom} L${x(t0).toFixed(1)} ${hgt-bottom} Z`;
    const time=t=>new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(t));
    const grid=[0,.5,1].map(f=>{
      const yy=top+(hgt-top-bottom)*f;
      const vv=max-(max-min)*f;
      return `<line class="hist-grid" x1="${pad}" x2="${w-pad}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="hist-axis" x="${pad}" y="${(yy-3).toFixed(1)}">${decimal.format(vv)}</text>`;
    }).join('');
    return `<svg class="hist-svg" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Historique ${html(h.label)} sur 3 heures">
      ${grid}
      <path d="${area}" fill="var(--blue)" opacity=".12"></path>
      <path d="${path}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
      <text class="hist-axis" x="${pad}" y="${hgt-4}">${time(t0)}</text>
      <text class="hist-axis" x="${w-pad}" y="${hgt-4}" text-anchor="end">${time(t1)}</text>
    </svg>`;
  }
  _simRemaining(until){
    const deadline=until?Date.parse(until):NaN;
    if(!Number.isFinite(deadline)) return 'durée inconnue';
    const minutes=Math.max(0,Math.ceil((deadline-Date.now())/60000));
    if(minutes<=0) return 'terminé';
    if(minutes<60) return `${minutes} min restantes`;
    const hours=Math.floor(minutes/60);
    const rest=minutes%60;
    return `${hours} h ${String(rest).padStart(2,'0')} restantes`;
  }
  _updateSimCountdowns(){
    this.shadowRoot?.querySelectorAll?.('[data-sim-until]').forEach(el=>{
      el.textContent=this._simRemaining(el.dataset.simUntil);
    });
  }
  _controlsHtml(mode,c1,c2,ecs){
    const season=mode==='heat'?'Chauffage':mode==='cool'?'Refroidissement':'Off';
    const globalBtn=(label,tone='')=>{
      const active=season===label;
      return `<button type="button" class="ctl-btn ${tone}${active?' active':''}" data-pac-action="global" data-value="${label}">${html(label)}</button>`;
    };
    const circuit=(c,i)=>{
      const name=this._circuitName(i);
      const auto=mode==='heat'||mode==='cool';
      const offActive=c.mode==='off';
      const preset=String(c.presetMode||'');
      const regimeText=String(c.regime||c.native||'');
      const regimeMode=/confort/i.test(regimeText)||/comfort/i.test(regimeText)?'Confort':/r[ée]duit|reduced/i.test(regimeText)?'Réduit':'';
      const selectorMode=/confort/i.test(preset)?'Confort':/eco|r[ée]duit|reduced/i.test(preset)?'Réduit':'Auto';
      const modeLabel=selectorMode==='Auto'&&regimeMode?`Auto · ${regimeMode}`:regimeMode||selectorMode;
      const regimePending=this._regimePending?.circuit===i?this._regimePending.value:null;
      const regimeBusy=!!regimePending;
      const shownMode=regimeBusy?`${regimePending}…`:modeLabel;
      const regimeError=this._regimeError?.circuit===i?this._regimeError.message:'';
      const autoActive=auto && !offActive;
      const overrideActive=c.override===true;
      const tempEnabled=auto && !overrideActive;
      const plusEnabled=mode==='heat' && !overrideActive;
      const tempTitle=overrideActive?'Dérogation native active : annule-la avant une nouvelle consigne':
        tempEnabled?'':'Choisir d’abord Chauffage ou Refroidissement';
      const plusTitle=overrideActive?tempTitle:mode==='cool'?
        'En rafraîchissement, seule une consigne plus froide est acceptée':tempTitle;
      const simEntity=this._ids?.[`sim${i}`];
      const simState=simEntity?this._hass?.states?.[simEntity]:null;
      const simActive=simState?.state==='on';
      const simUntil=simState?.attributes?.restauration;
      const simOriginal=simState?.attributes?.consigne_originale;
      const simDuration=this._v(`simDuration${i}`);
      const simControl=(this._config.show_simulation!==false && simEntity)?`<div class="ctl-sim${simActive?' active':''}">
        <label><input type="checkbox" data-pac-action="sim-toggle" data-circuit="${i}" ${simActive?'checked':''}> Simulation dérogation</label>
        <span class="ctl-sim-hours"><input type="number" min="1" max="24" step="1" value="${html(simDuration ?? '2')}" data-pac-action="sim-duration" data-circuit="${i}" aria-label="Durée simulation dérogation ${html(name)}" ${simActive?'disabled':''}> h</span>
        ${simActive?`<span class="sim-live"><b>Active</b><span data-sim-until="${html(simUntil || '')}">${html(this._simRemaining(simUntil))}</span></span>`:''}
      </div>${simActive?`<div class="sim-values">Consigne <strong>${html(temp(c.programmed ?? c.target))}</strong><span>retour à ${simOriginal!=null?html(temp(simOriginal)):'—'}</span></div>`:''}`:'';
      return `<div class="ctl-group"><span class="ctl-label">${html(name)}${offActive?'':`<span class="ctl-mode${regimeBusy?' pending':''}">${html(shownMode)}</span>`}</span><div class="ctl-buttons">
        <button type="button" class="ctl-btn${offActive?' active':''}" data-pac-action="hvac" data-circuit="${i}" data-value="off">Off</button>
        <button type="button" class="ctl-btn${!offActive&&(regimePending||selectorMode)==='Auto'?' active':''}" data-pac-action="regime" data-circuit="${i}" data-value="Auto"${auto&&!regimeBusy?'':' disabled title="Choisir d’abord Chauffage ou Refroidissement"'}>Auto</button>
        <button type="button" class="ctl-btn${!offActive&&(regimePending||selectorMode)==='Confort'?' active':''}" data-pac-action="regime" data-circuit="${i}" data-value="Confort"${auto&&!regimeBusy?'':' disabled title="Choisir d’abord Chauffage ou Refroidissement"'}>Confort</button>
        <button type="button" class="ctl-btn${!offActive&&(regimePending||selectorMode)==='Réduit'?' active':''}" data-pac-action="regime" data-circuit="${i}" data-value="Réduit"${auto&&!regimeBusy?'':' disabled title="Choisir d’abord Chauffage ou Refroidissement"'}>Réduit</button>
        <span class="ctl-temp"><button type="button" data-pac-action="temp" data-circuit="${i}" data-delta="-0.5" aria-label="Baisser la consigne ${html(name)}"${tempEnabled?'':' disabled title="'+html(tempTitle)+'"'}>−</button><strong>${html(temp(c.programmed ?? c.target))}</strong><button type="button" data-pac-action="temp" data-circuit="${i}" data-delta="0.5" aria-label="Augmenter la consigne ${html(name)}"${plusEnabled?'':' disabled title="'+html(plusTitle)+'"'}>+</button></span>
      </div>${simControl}${regimeError?`<div class="ctl-error">${html(regimeError)}</div>`:''}</div>`;
    };
    const ecsModeEntity=this._ecsWaterHeater();
    const ecsModeState=this._hass?.states[ecsModeEntity];
    const ecsMode=ecsModeState?.state;
    const ecsModeOff=!ecsMode || /arr[êe]t|off/i.test(String(ecsMode));
    const ecsModeButtons=ecsModeState?`<button type="button" class="ctl-btn${ecsModeOff?' active':''}" data-pac-action="ecs-mode" data-value="off">Off</button><button type="button" class="ctl-btn${!ecsModeOff?' active':''}" data-pac-action="ecs-mode" data-value="on">On</button>`:'';
    const ecsForceActive=Date.now()<this._ecsForceUntil;
    const ecsForceButton=this._ids?.ecsForceCycle?`<button type="button" class="ctl-btn${ecsForceActive?' active':''}" data-pac-action="ecs-force-cycle" title="Forcer un cycle ECS pendant 10 secondes">${ecsForceActive?'⚡ Forçage actif':'⚡ Forçage'}</button>`:'';
    const ecsGroup=ecs?.comfortSetpoint?`<div class="ctl-group"><span class="ctl-label">ECS · Ballon</span><div class="ctl-buttons">
      ${ecsModeButtons}${ecsForceButton}
      <span class="ctl-temp"><button type="button" data-pac-action="ecs" data-delta="-1" aria-label="Baisser la consigne ECS">−</button><strong>${html(temp(ecs.comfortSetpoint))}</strong><button type="button" data-pac-action="ecs" data-delta="1" aria-label="Augmenter la consigne ECS">+</button></span>
      ${ecs.ecoSetpoint?chip('Éco '+temp(ecs.ecoSetpoint),'dim'):''}
    </div></div>`:'';
    const powerEntity=typeof this._config.power_entity==='string'?this._config.power_entity.trim():'';
    const powerState=powerEntity?this._hass?.states[powerEntity]:null;
    const powerRaw=powerState&&!isMissing(powerState.state)?Number(String(powerState.state).replace(',','.')):NaN;
    const powerUnit=powerState?.attributes?.unit_of_measurement||'W';
    const powerText=Number.isFinite(powerRaw)
      ? new Intl.NumberFormat('fr-FR',{maximumFractionDigits:powerUnit==='kW'?2:0}).format(powerRaw)+' '+powerUnit
      : '—';
    const powerChip=powerEntity?`<div class="ctl-power" title="${html(powerState?.attributes?.friendly_name||powerEntity)}"><span>⚡ Puissance PAC</span><strong>${html(powerText)}</strong></div>`:'';
    return `<section class="controls" aria-label="Commandes PAC">
      <div class="ctl-group"><span class="ctl-label">Mode PAC</span><div class="ctl-buttons">${globalBtn('Off')}${globalBtn('Chauffage','heat')}${globalBtn('Refroidissement','cool')}</div></div>
      ${circuit(c1,1)}${circuit(c2,2)}${ecsGroup}${powerChip}
    </section>`;
  }
  _detailRow(label,key,unit='',decimals=1){
    const st=this._s(key);
    const raw=this._v(key);
    const value=(['compressorStarts','startsToday','startsLastHour','shortCycles6h','cycleAverage','cycleLast','stopLast','minimumRun','minimumOff','startsActualRate','startsMaxRate','compressorHours'].includes(key) && nvalue(raw)!==null) ? formatted(raw,unit,0) : unit ? formatted(raw,unit,decimals) : (key.startsWith('alarm') || ['compressor','defrost','ecsPump','ecsElectric','override1','override2','pump1','pump2'].includes(key)) ? (raw==='on'?(['pump1','pump2'].includes(key)?'En marche':'Actif'):raw==='off'?(['pump1','pump2'].includes(key)?'Arrêté':'Inactif'):clean(raw)) : clean(raw);
    const linked = key==='outdoor' && this._ids?.outdoor
      ? this._tempLink(raw,this._ids.outdoor,label)
      : `<strong class="${!st||raw==null?'na':''}">${html(value)}</strong>`;
    return `<div class="detail-row"><span>${html(label)}</span>${linked}</div>`;
  }
  _diagGroup(title,body){return `<section class="diag-group"><h4>${html(title)}</h4>${body}</section>`;}
  _render(){
    // États de déploiement persistants malgré le rafraîchissement des entités HA.
    const prevAlarms=this.shadowRoot.querySelector('details[data-panel="alarms"]')?.open ?? false;
    const prevDetails=this.shadowRoot.querySelector('details[data-panel="diagnostics"]')?.open ?? false;
    const prevGraphs=this.shadowRoot.querySelector('details[data-panel="graphs"]')?.open ?? false;
    const prevCurve=this.shadowRoot.querySelector('details[data-panel="curve"]')?.open ?? false;
    const mode=this._resolveMode();
    this.dataset.flow=mode==='cool'?'cool':mode==='heat'?'heat':'off';
    const compressor=this._b('compressor');
    const c1=this._circuit(1),c2=this._circuit(2),ecs=this._ecs();
    this._ensureActivity();
    this._ensureGraphs();
    const defrost=this._b('defrost');
    // La liaison frigorifique extérieur/intérieur ne doit s'animer que si le
    // compresseur tourne réellement. Les circulateurs gardent leur propre débit.
    const exchangerRunning=compressor===true && defrost!==true;
    // Vitesse proportionnelle à la modulation : 0 % = arrêt, 100 % = rotation rapide.
    const fanPct=Math.max(0,Math.min(100,nvalue(this._v('modulation'))??0));
    const fanDuration=fanPct>0?Math.max(0.6,Math.min(12,60/fanPct)):0;
    const flowDuration=(1.55-Math.min(100,Math.max(0,fanPct))/100*0.75).toFixed(2);
    // Côté gauche = échangeur froid, côté droit = échangeur chaud (inversés en froid).
    const inlinkTone=mode==='cool'?'heat':'cool';
    const outlinkTone=mode==='cool'?'cool':'heat';
    // BSB-LAN ne fournit pas la position absolue de la vanne 3/4 voies.
    // On bloque au moins l'animation quand le circuit est en priorité ECS.
    const c1Flow=c1.active||(c1.pump===true&&!c1.off&&!c1.dhwPriority);
    const c2Flow=c2.active||(c2.pump===true&&!c2.off&&!c2.dhwPriority);
    const ecsFlow=ecs.viaPac;
    const outlinkActive=c1Flow||c2Flow||ecsFlow;
    const fanAnimated=compressor===true && defrost!==true && fanPct>0;
    const modeText=mode==='heat'?'Mode chauffage':mode==='cool'?'Mode rafraîchissement':mode==='off'?'Mode arrêt':'Mode inconnu';
    const compressorText=compressor===true?'En marche':compressor===false?'À l’arrêt':'État inconnu';
    const compressionTone=compressor===true?'active':compressor===false?'idle':'unknown';
    const branchTone=x=>x.isHeating?'heat':x.isCooling?'cool':'idle';
    const alertActive=ALERTS.filter(([key])=>this._b(key)===true);
    const summary=this._b('alarmSummary');
    const summaryLearning=this._a('alarmSummary','phase_apprentissage')===true;
    if(alertActive.length===0 && summary===true) alertActive.push(['alarmSummary','Alerte compresseur (synthèse)']);
    const alertCoverage=ALERTS.filter(([key])=>this._b(key)!==null).length;
    const alertUnknown=ALERTS.length-alertCoverage;
    const alertDescription=alertActive.length ?
      `<div class="alert-stack">${alertActive.map(([key,name])=>{
        const context=(ALERT_CONTEXT[key]||[]).flatMap(([caption,attribute,unit])=>{
          const val=this._a(key,attribute);
          if(isMissing(val)) return [];
          const rendered=typeof val==='boolean'?(val?'Oui':'Non'):
            typeof val==='number'?`${decimal.format(val)}${unit?' '+unit:''}`:String(val);
          return [`<div class="alarm-fact"><span>${html(caption)}</span><strong>${html(rendered)}</strong></div>`];
        });
        return `<div class="alert-item"><div class="alert-line"><span class="alert-mark">!</span><span>${html(name)}</span></div>
          ${context.length?`<div class="alarm-context">${context.join('')}</div>`:''}</div>`;
      }).join('')}</div>` :
      `<div class="alert-clear">${icon('heat')}<div><strong>${alertCoverage || summary!==null ?'Aucune alarme active remontée':'Surveillance indisponible'}</strong><span>${alertCoverage || summary!==null ?'Aucun défaut signalé par les capteurs disponibles':'Aucun capteur d’alarme identifié'}</span></div></div>`;
    const alertsMeta=[
      `${alertCoverage}/${ALERTS.length} alertes individuelles disponibles`,
      summaryLearning?'Supervision compresseur en apprentissage':null,
      alertUnknown?'Alertes non disponibles : état non vérifié':null
    ].filter(Boolean).join(' · ');
    const statesCount=Object.values(this._ids||{}).filter(id=>!!id && !!this._hass?.states[id]).length;
    const activeCount=(c1.active?1:0)+(c2.active?1:0)+(ecs.viaPac?1:0);
    const ecsText=ecs.viaPac ? 'Chauffe par PAC' : ecs.withElectric?'Appoint électrique' :
      norm(ecs.production).includes('demande')?'Demande en attente':
      norm(ecs.production)==='inactive'?'En attente':'État non confirmé';
    const ecsTone=ecs.viaPac?'heat':ecs.withElectric?'electric':'idle';
    const ecsCopState=this._s('ecsCopSession');
    const ecsCopAttr=ecsCopState?.attributes||{};
    const ecsCopValue=nvalue(ecsCopState?.state);
    const ecsCopText=ecsCopValue!==null?ecsCopValue.toFixed(2).replace('.',','):'—';
    const ecsCopDuration=ecsCopAttr.duree_session_min!=null?String(Math.round(Number(ecsCopAttr.duree_session_min))):'—';
    const ecsCopStartTemp=ecsCopAttr.t_depart_reel!=null?temp(ecsCopAttr.t_depart_reel):'—';
    const ecsCopEndTemp=ecsCopAttr.t_fin!=null?temp(ecsCopAttr.t_fin):'—';
    const ecsCopEnergy=Number(ecsCopAttr.conso_session_kwh ?? ecsCopAttr.e_elec_kwh);
    const ecsCopEnergyText=Number.isFinite(ecsCopEnergy)?ecsCopEnergy.toLocaleString('fr-FR',{minimumFractionDigits:3,maximumFractionDigits:3})+' kWh':'— kWh';
    const ecsCopStartDate=ecsCopAttr.debut_session?new Date(ecsCopAttr.debut_session):null;
    const ecsCopStartTime=ecsCopStartDate&&!Number.isNaN(ecsCopStartDate.getTime())
      ?ecsCopStartDate.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
    const ecsSessionActive=ecsCopAttr.session_active===true;
    const ecsSessionHtml=ecsCopState&&(ecsCopValue!==null||ecsCopAttr.duree_session_min!=null)
      ?(ecsSessionActive
        ?`<div class="ecs-session active" title="Session ECS en cours">
          <span>⏱️ Session en cours <strong>${html(ecsCopDuration)} min</strong></span>
          <span>🌡️ <strong>${html(ecsCopStartTemp)} → ${html(ecsCopEndTemp)}</strong></span>
          <span>⚡ <strong>${html(ecsCopEnergyText)}</strong></span>
          <span>🕒 <strong>${html(ecsCopStartTime)}</strong></span>
        </div>`
        :`<div class="ecs-session" title="Dernière session ECS">
          <span>📊 COP <strong>${html(ecsCopText)}</strong></span>
          <span>⏱️ <strong>${html(ecsCopDuration)} min</strong></span>
          <span>🌡️ <strong>${html(ecsCopStartTemp)} → ${html(ecsCopEndTemp)}</strong></span>
          <span>⚡ <strong>${html(ecsCopEnergyText)}</strong></span>
          <span>🕒 <strong>${html(ecsCopStartTime)}</strong></span>
        </div>`)
      :'';
    const ecsSessions=Array.isArray(ecsCopAttr.sessions)?ecsCopAttr.sessions.slice().reverse():[];
    const ecsHistoryRow=s=>{
      const start=s?.debut?new Date(s.debut):null;
      const date=start&&!Number.isNaN(start.getTime())
        ?start.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+start.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
        :'—';
      const cop=Number.isFinite(Number(s?.cop))?Number(s.cop).toFixed(2).replace('.',','):'—';
      const duration=s?.duree_min!=null?String(Math.round(Number(s.duree_min))):'—';
      const t1=s?.t_depart!=null?temp(s.t_depart):'—';
      const t2=s?.t_fin!=null?temp(s.t_fin):'—';
      const energy=Number.isFinite(Number(s?.e_elec_kwh))?Number(s.e_elec_kwh).toLocaleString('fr-FR',{minimumFractionDigits:3,maximumFractionDigits:3}):'—';
      return `<div class="ecs-history-row"><span class="eh-date">${html(date)}</span><strong>📊 ${html(cop)}</strong><span>⏱️ ${html(duration)} min</span><span>🌡️ ${html(t1)} → ${html(t2)}</span><span>⚡ ${html(energy)} kWh</span></div>`;
    };
    const ecsHistoryHtml=ecsSessions.length?`<details class="activity session-history" open>
      <summary class="activity-date">Historique · ${ecsSessions.length} session${ecsSessions.length!==1?'s':''}</summary>
      <div class="activity-list session-list">${ecsSessions.map(ecsHistoryRow).join('')}</div>
    </details>`:'';
    const gauge=nvalue(this._v('modulation'));
    const pacDelta= nvalue(this._v('flow'))!==null && nvalue(this._v('returnTemp'))!==null ?
      `${decimal.format(nvalue(this._v('flow'))-nvalue(this._v('returnTemp')))} °C` : '—';
    // Les pastilles affichent exclusivement l'état BSB natif remonté par l'entité.
    // Les programmes horaires et attributs interprétés restent dans les diagnostics.
    const circHtml=c => `<section class="output-card ${branchTone(c)} regime-${c.mode==='heat'?'heat':c.mode==='cool'?'cool':'idle'}" aria-label="Circuit ${c.number} ${html(this._circuitName(c.number))}">
      <div class="out-top"><div class="out-ico">${icon(c.isCooling || (c.mode==='cool' && !c.isHeating)?'snow':'radiant')}</div>
        <div class="out-head"><div class="out-title">Circuit ${c.number} <span>· ${html(this._circuitName(c.number))}</span></div>
          <div class="out-status">${html(c.actionText)}</div></div>
        <span class="state-dot ${branchTone(c)}"></span></div>
      <div class="out-values"><div><span>Température ambiante</span>${this._tempLink(c.current,this._roomTempEntity(c.number),'Température ambiante C'+c.number)}</div>
        <div><span>Consigne ${c.season==='cool'?'rafraîch.':'chauffage'}</span><strong class="editable" data-pac-action="edit" data-target="circuit" data-circuit="${c.number}" title="Cliquer pour modifier">${html(temp(c.programmed ?? c.target))}</strong></div></div>
      <div class="out-foot">${chip(c.nativePreset?.label ?? (c.off?'OFF':'Régime indisponible'),c.nativePreset?.tone ?? 'dim')}
        ${chip(c.native??'État BSB-LAN indisponible','dim')}
        ${c.targetDisplay!=null?chip('Eff. '+temp(c.targetDisplay),'dim'):''}
        ${c.flowTemp!=null?chip('Départ circuit '+temp(c.flowTemp),'dim'):''}
        ${this._config.show_pump_badges!==false && c.pump!==null?chip(c.pump?(c.off?'Post-circulation':'Circulateur actif'):'Circulateur arrêté',c.pump&&!c.off?'positive':'dim'):''}
        ${c.override===true?chip('Dérogation active','warning'):''}</div>
    </section>`;
    const alarmsClass=alertActive.length?'alerted':'quiet';
    const diagComp=this._diagGroup('Compresseur / fonctionnement',[
      ['État','compressor',''],['Modulation','modulation','%'],['Heures de fonctionnement','compressorHours','h'],
      ['Nombre de démarrages','compressorStarts',''],['Démarrages aujourd’hui','startsToday',''],
      ['Démarrages sur la dernière heure','startsLastHour',''],['Durée moyenne historique d’un cycle','cycleAverage','min'],
      ['Durée du dernier cycle','cycleLast','min'],['Durée du dernier arrêt','stopLast','min'],
      ['Cycles courts sur 6 heures','shortCycles6h',''],['Temps de marche minimum régulateur','minimumRun','min'],
      ['Temps d’arrêt minimum régulateur','minimumOff','min'],
      ['Démarrages régulateur','startsActualRate','dém./h'],['Seuil démarrages régulateur','startsMaxRate','dém./h']
    ].map(([name,key,unit])=>this._detailRow(name,key,unit,0)).join(''));
    const diagPac=this._diagGroup('PAC / circuit hydraulique commun',[
      ['État général','pacState',''],['Température extérieure','outdoor','°C'],
      ['Énergie électrique totale cumulée','energy','kWh'],['Dégivrage DI6','defrost',''],
      ['Horloge PAC','clockTime','']
    ].map(([name,key,unit])=>this._detailRow(name,key,unit,unit==='kWh'?0:1)).join(''));
    const diagCircs=this._diagGroup('Circuits 1 & 2 / programmation',[
      ...[1,2].flatMap(i=>[
        [`C${i} — État actuel`,`circuit${i}State`,''],[`C${i} — Circulateur`,`pump${i}`,''],[`C${i} — Programme actif`,`program${i}`,''],
        [`C${i} — Régime temporaire`,`regime${i}`,''],[`C${i} — Dérogation`,`override${i}`,''],
        [`C${i} — État chauffage`,`heatState${i}`,''],[`C${i} — État rafraîchissement`,`coolState${i}`,''],
        [`C${i} — Départ cible chauffage (non mesuré)`,`heatFlowTarget${i}`,'°C'],
        [`C${i} — Chauffage Confort`,`heatComfort${i}`,'°C'],[`C${i} — Chauffage Éco`,`heatEco${i}`,'°C'],
        [`C${i} — Rafraîchissement Confort`,`coolComfort${i}`,'°C'],[`C${i} — Rafraîchissement Éco`,`coolEco${i}`,'°C']
      ])
    ].map(([name,key,unit])=>this._detailRow(name,key,unit)).join(''));
    const diagActivity=`<section class="diag-group diag-activity-panel"><h4>Activité</h4>${this._activityHtml()}${ecsHistoryHtml}</section>`;
    this.shadowRoot.innerHTML=`<style>
      /* En auto, les palettes proviennent des variables du thème Home Assistant. */
      :host {display:block;
        --bg:var(--ha-card-background, var(--card-background-color, #fff));
        --text:var(--primary-text-color, #212c38);--sub:var(--secondary-text-color,#63768b);
        --line:var(--divider-color,#bac9d4);
        --surface:color-mix(in srgb,var(--bg) 91%,var(--text) 9%);
        --surface2:color-mix(in srgb,var(--bg) 95%,var(--text) 5%);
        --panel-line:color-mix(in srgb,var(--line) 75%,var(--text) 25%);
        --soft:color-mix(in srgb,var(--bg) 86%,var(--text) 14%);
        --soft2:color-mix(in srgb,var(--bg) 80%,var(--text) 20%);
        --chip-bg:color-mix(in srgb,var(--bg) 82%,var(--text) 18%);
        --chip-fg:var(--text);--blue:#087db8;--red:#d86542;--green:#07886c;--amber:#ae650d;
        --chip-heat-bg:#fff1e9;--chip-heat-fg:#aa4b1e;--chip-heat-line:#d6a187;
        --chip-cool-bg:#e5f3fb;--chip-cool-fg:#12648b;--chip-cool-line:#7db4d1;
        --chip-warn-bg:#fff3df;--chip-warn-fg:#925e15;--chip-warn-line:#ddb477;
        --chip-good-bg:#e3f5ef;--chip-good-fg:#11684f;--chip-good-line:#81b9a8;
        --warn-panel:#fff2e8;--warn-text:#99431e;--warn-line:#d99872;
        --clear-text:#0b7a5e;--muted:#8ca0b3;
        --fan-bg:#dae6ee;--fan-edge:#91aab9;--fan-inset:#dae6ee;--fan-stroke:#769ab3;
        --pipe:#9eb0be;--icon:#437495;--tank-shadow:#64758a;--summary-chevron:#477e9c}
      :host([data-pac-scheme="dark"]){color-scheme:dark}
      :host([data-pac-scheme="light"]){color-scheme:light}
      /* Option dark : palette d'origine, sans altérer la disposition graphique. */
      :host([data-pac-theme="dark"]){color-scheme:dark;
        --bg:#121b26;--surface:#1a2837;--surface2:#172331;--line:#314355;
        --text:#ecf2f8;--sub:#9fb3c6;--panel-line:#31495d;--soft:#243646;
        --soft2:#314256;--chip-bg:#27384a;--chip-fg:#bfd0dc;
        --blue:#56beff;--red:#ff9c70;--green:#57d7ae;--amber:#ffc16b;
        --chip-heat-bg:#3a2a29;--chip-heat-fg:#ffb692;--chip-heat-line:#9b5940;
        --chip-cool-bg:#1d374b;--chip-cool-fg:#8bd7ff;--chip-cool-line:#2d7296;
        --chip-warn-bg:#3b3023;--chip-warn-fg:#ffd2a3;--chip-warn-line:#94703e;
        --chip-good-bg:#1e3835;--chip-good-fg:#a6efdb;--chip-good-line:#366f62;
        --warn-panel:#382924;--warn-text:#ffd8b8;--warn-line:#bd794f;--clear-text:#a1e4cf;
        --muted:#71899b;--fan-bg:#243646;--fan-edge:#6d8699;
        --fan-inset:#243646;--fan-stroke:#79b8d6;--pipe:#3b4d5c;
        --icon:#a2c4dc;--tank-shadow:#192737;--summary-chevron:#8bb8d0}
      /* Option light : palette claire, même si l'interface HA est sombre. */
      :host([data-pac-theme="light"]){color-scheme:light;
        --bg:#fff;--text:#213448;--sub:#627588;--line:#cfdae4;--surface:#f3f7fa;
        --surface2:#f9fbfd;--panel-line:#bdd0de;--soft:#e2ecf3;--soft2:#d2e2ed;
        --chip-bg:#e7eef5;--chip-fg:#365168}
      ha-card {display:block;container-type:inline-size;overflow:hidden;background:var(--bg);border:1px solid var(--line);border-radius:var(--ha-card-border-radius,22px);
        color:var(--text);font-family:var(--primary-font-family,Roboto,Arial,sans-serif)}
      *{box-sizing:border-box} .wrap{position:relative;padding:22px 22px 18px}
      .header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:17px;
        border-bottom:1px solid var(--line)}
      .eyebrow{font-size:10px;letter-spacing:2px;color:#77a9c9;font-weight:800;text-transform:uppercase}
      h2{margin:6px 0 2px;font-size:clamp(19px,2vw,27px);font-weight:730;letter-spacing:-.35px}
      .sub{color:var(--sub);font-size:12px;line-height:1.5}
      .header-right{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;max-width:380px}
      .chip{display:inline-flex;align-items:center;gap:5px;border-radius:99px;background:var(--chip-bg);
        color:var(--chip-fg);border:1px solid var(--panel-line);padding:4px 9px;font-size:11px;font-weight:600;line-height:1.3}
      .chip.heat{color:var(--chip-heat-fg);border-color:var(--chip-heat-line);background:var(--chip-heat-bg)}
      .chip.cool{color:var(--chip-cool-fg);border-color:var(--chip-cool-line);background:var(--chip-cool-bg)}
      .chip.warning{color:var(--chip-warn-fg);border-color:var(--chip-warn-line);background:var(--chip-warn-bg)}
      .chip.positive{color:var(--chip-good-fg);border-color:var(--chip-good-line);background:var(--chip-good-bg)}
      /* V2.3.1 : identité graphique d'origine inchangée. Distribution géométrique calculée
         depuis la grille V2.3.0 (0.80fr / 52px / 1fr / 84px / 1.88fr) :
         le module PAC perd 44px, récupérés par le raccordement droit (84 -> 128px).
         La largeur du bloc COMP et celle des trois sorties restent inchangées. */
      .schematic{display:grid;grid-template-columns:
          minmax(175px,calc(21.7391304% - 29.565px))
          52px
          minmax(220px,calc(27.1739130% - 80.957px))
          128px
          minmax(350px,calc(51.0869565% - 69.478px));
        grid-template-rows:repeat(3,minmax(130px,auto));gap:12px 0;align-items:stretch;margin:4px 0 20px;min-width:0}
      .machine{grid-column:1;grid-row:1/4;align-self:stretch}
      .inlink{grid-column:2;grid-row:1/4;align-self:stretch}
      .pac{grid-column:3;grid-row:1/4;align-self:stretch}
      .outlink{grid-column:4;grid-row:1/4;align-self:stretch}
      .outs{grid-column:5;grid-row:1/4;display:grid;grid-template-rows:repeat(3,minmax(130px,auto));gap:12px}
      .machine,.pac,.output-card{background:linear-gradient(165deg,var(--surface),var(--surface2));border-radius:17px;border:1px solid var(--panel-line)}
      .machine,.pac{padding:18px 16px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden;min-height:435px}
      .mini-head{text-transform:uppercase;letter-spacing:1.15px;color:var(--sub);font-size:11px;font-weight:800}
      .machine .machine-art{display:flex;justify-content:center;align-items:center;min-height:138px;flex:1}
      .fan-shell{width:min(100%,185px);aspect-ratio:1.16/1;background:var(--fan-bg);border:1px solid var(--fan-edge);border-radius:13px;
        display:flex;align-items:center;justify-content:center;position:relative;box-shadow:inset 0 0 0 6px var(--fan-inset)}
      .fan-shell:after{content:'';position:absolute;right:8px;top:10px;bottom:10px;width:8px;border-radius:3px;
        background:repeating-linear-gradient(to bottom,#6f899f 0 3px,transparent 3px 8px)}
      .fan-svg{width:76%;height:82%;color:var(--fan-stroke);overflow:visible}
      .fan-svg .blades{transform-box:view-box;transform-origin:60px 60px}
      /* Illustration du ventilateur synchronisée à l'état compresseur (8400). */
      .fan-shell.running .blades{animation:spin var(--fan-duration,5s) linear infinite;will-change:transform}
      .fan-shell.running{border-color:var(--green);box-shadow:0 0 0 1px var(--green), inset 0 0 0 6px var(--fan-inset)}
      @keyframes spin{to{transform:rotate(360deg)}}
      .big-value{font-variant-numeric:tabular-nums;font-size:clamp(23px,2.8vw,35px);font-weight:760;line-height:1.12}
      .field-title{font-size:11px;color:var(--sub);margin-bottom:6px}
      .machine-stat{padding-top:11px;border-top:1px solid var(--line)}
      .mod-bar{background:var(--soft2);height:7px;border-radius:10px;overflow:hidden;margin:8px 0 0}
      .mod-bar>i{display:block;height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,#61b1d7,#56d6b1)}
      .pac-art{flex:1;min-height:102px;display:flex;align-items:center;gap:12px;margin:4px 0}
      .exchanger{display:flex;justify-content:space-evenly;align-items:center;gap:14px;width:100%}
      .exch-col{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--blue)}
      .exch-col.hot{color:var(--red)}
      .exch-col svg{width:76px;max-width:100%;height:94px;fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;
        filter:drop-shadow(0 0 3px currentColor);opacity:.9;transform-origin:center;
        transition:opacity .25s ease,filter .25s ease,transform .25s ease}
      /* Pas d'activité confirmée : échangeurs visibles, sans animation. */
      .exchanger.standby .exch-col svg{opacity:.78;filter:drop-shadow(0 0 5px currentColor);transform:none}
      /* Pulsation nettement visible : opacité + halo + léger grossissement. */
      .exchanger.running .exch-col svg{animation:exchangerPulse var(--flow-duration,1.15s) ease-in-out infinite;will-change:transform,opacity,filter}
      @keyframes exchangerPulse {
        0%,100%{opacity:.58;transform:scale(.96);filter:drop-shadow(0 0 2px currentColor)}
        50%{opacity:1;transform:scale(1.07);filter:drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor)}
      }
      .exch-flow{fill:none;stroke:color-mix(in srgb,currentColor 35%,#fff);stroke-width:2.2;stroke-linecap:round;
        stroke-dasharray:13 15;opacity:0;pointer-events:none}
      .exchanger.running .exch-flow{opacity:.95;animation:flow var(--flow-duration,1.15s) linear infinite}
      :host([data-flow="cool"]) .linksvg path.live,
      :host([data-flow="cool"]) .exch-flow{animation-direction:reverse}
      .exch-caption{font-size:10px;color:var(--sub);white-space:nowrap;text-align:center;line-height:1.25}
      .exch-caption small{display:block;font-size:9px;color:var(--muted);font-weight:500}
      .pac-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;border-top:1px solid var(--line);padding-top:13px}
      .pac-metrics>div span{display:block;color:var(--sub);font-size:11px}.pac-metrics>div strong{display:block;font-size:17px;margin-top:5px;font-variant-numeric:tabular-nums}
      .pac-bottom{margin-top:8px;font-size:11px;color:var(--sub);line-height:1.5}
      .linksvg{width:100%;height:100%;display:block;overflow:visible}
      .vertical-link{display:none}
      .linksvg path.track{stroke:var(--pipe);stroke-width:9;fill:none;stroke-linejoin:round;stroke-linecap:round}
      .linksvg.has-flow path.track{stroke:var(--flow-color,var(--pipe))!important;opacity:.5;animation:linkTrackPulse var(--flow-duration,1.15s) ease-in-out infinite}
      .linksvg path.live{stroke:color-mix(in srgb,var(--flow-color,var(--red)) 22%,#fff);stroke-width:4.5;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:13 15;opacity:1;filter:drop-shadow(0 0 4px var(--flow-color,transparent));
        animation:flow var(--flow-duration,1.15s) linear infinite,linkPulse var(--flow-duration,1.15s) ease-in-out infinite}
      .linksvg path.live.heat{--flow-color:var(--red)}
      .linksvg path.live.cool{--flow-color:var(--blue)}
      .linksvg path.live.electric{--flow-color:var(--amber)}
      .linksvg path.live.active{--flow-color:var(--blue)}
      @keyframes linkPulse{0%,100%{opacity:.55;stroke-width:3.6}50%{opacity:1;stroke-width:5.4}}
      @keyframes linkTrackPulse{0%,100%{opacity:.30}50%{opacity:.62}}
      @keyframes flow {to{stroke-dashoffset:-28}}
      .output-card{padding:15px 15px 12px;display:flex;flex-direction:column;justify-content:center;gap:10px;min-height:130px;position:relative;border-left:3px solid var(--panel-line)}
      .output-card.heat{--flow-color:var(--red);border-left-color:var(--red)}
      .output-card.cool{--flow-color:var(--blue);border-left-color:var(--blue)}
      .output-card.electric{--flow-color:var(--amber);border-left-color:var(--amber)}
      /* La petite barre de branchement animée est supprimée pour tous les
         émetteurs (C1, C2, ECS) : elle figurait au-dessus du tuyau principal
         et laissait croire à une circulation alors que le circuit était idle. */
      .output-card:after{display:none!important;content:none!important;animation:none!important}
      .out-top{display:flex;align-items:center;gap:11px}
      .out-ico{flex:0 0 36px;width:36px;height:36px;color:var(--icon);display:grid;place-items:center}
      .symbol{width:29px;height:29px;display:block}
      .out-head{flex:1;min-width:0}
      .out-title{font-size:14px;font-weight:750}.out-title span{color:var(--sub);font-weight:500}
      .out-status{font-size:11px;color:var(--sub);margin-top:4px}
      .state-dot{width:9px;height:9px;border-radius:50%;background:var(--pipe);flex:0 0 9px}
      .state-dot.heat{background:var(--red);box-shadow:0 0 12px var(--red)}
      .state-dot.cool{background:var(--blue);box-shadow:0 0 12px var(--blue)}
      .out-values{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}
      .out-values.ecs-values{grid-template-columns:repeat(3,minmax(0,1fr))}
      .out-values>div span{color:var(--sub);display:block;font-size:10px}
      .out-values>div strong{display:block;margin-top:3px;font-size:20px;font-weight:750;font-variant-numeric:tabular-nums}
      .out-foot{display:flex;gap:6px;flex-wrap:wrap}.out-foot .chip{font-size:10px;padding:3px 8px}
      .ecs-session{display:flex;flex-wrap:wrap;gap:5px 12px;border-top:1px solid var(--line);padding-top:8px;margin-top:2px;font-size:10px;color:var(--sub)}
      .ecs-session span{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}
      .ecs-session strong{font-size:12px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums}
      .ecs-session.active strong{color:var(--warning-color,#ff9800)}
      .ecs-history{margin-top:5px;border-top:1px dashed var(--line);padding-top:5px}
      .ecs-history>summary{cursor:pointer;list-style:none;font-size:10px;color:var(--sub);font-weight:700;display:flex;align-items:center;gap:5px}
      .ecs-history>summary::-webkit-details-marker{display:none}
      .ecs-history>summary:before{content:'▸';transition:transform .15s;color:var(--muted)}
      .ecs-history[open]>summary:before{transform:rotate(90deg)}
      .ecs-history-list{display:grid;gap:2px;margin-top:5px}
      .ecs-history-row{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:10px;color:var(--sub);padding:3px 0;border-bottom:1px solid var(--line)}
      .ecs-history-row:last-child{border-bottom:0}
      .ecs-history-row strong{color:var(--text);font-weight:700}
      .ecs-history-row .eh-date{color:var(--muted)}
      .tank-mini{position:relative;overflow:hidden;width:28px;height:39px;border-radius:9px;border:2px solid #88aec5;
        background:linear-gradient(0deg,#377bc7,#935cbd 48%,#ff8f6a);background-size:100% 180%;box-shadow:inset 0 0 6px var(--tank-shadow)}
      .tank-mini:after{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;
        background-image:radial-gradient(circle at 25% 60%,rgba(255,255,255,.8) 0 1.5px,transparent 2.5px),radial-gradient(circle at 70% 80%,rgba(255,255,255,.6) 0 1px,transparent 2px),radial-gradient(circle at 45% 30%,rgba(255,255,255,.45) 0 1px,transparent 2px);
        background-size:16px 16px,20px 20px,14px 14px}
      .output-card.heat .tank-mini,.output-card.electric .tank-mini{animation:tankHeat 2.4s linear infinite}
      .output-card.heat .tank-mini:after,.output-card.electric .tank-mini:after{opacity:.8;animation:tankBubbles 2.2s linear infinite}
      @keyframes tankHeat{to{background-position:0 -70%}}
      @keyframes tankBubbles{from{transform:translateY(10px)}to{transform:translateY(-34px)}}
      .section{border-top:1px solid var(--line);padding:18px 2px 10px}
      .section-title{display:flex;justify-content:space-between;gap:15px;align-items:center;margin:0 0 12px}
      .section-title h3{font-size:15px;margin:0;font-weight:700}
      .alerts{border:1px solid var(--panel-line);border-radius:14px;background:var(--surface);padding:13px 15px}
      .alerts.alerted{border-color:var(--warn-line);background:var(--warn-panel)}
      .alert-clear{display:flex;align-items:center;gap:12px;color:var(--clear-text)}
      .alert-clear .symbol{flex:0 0 26px}.alert-clear div{display:flex;flex-direction:column;gap:4px}
      .alert-clear strong{font-size:13px}.alert-clear span{font-size:11px;color:var(--sub)}
      .alert-stack{display:grid;gap:12px}.alert-line{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:650;color:var(--warn-text)}
      .alarm-context{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:5px 15px;padding:7px 0 1px 31px}
      .alarm-fact{font-size:11px;display:flex;justify-content:space-between;gap:8px}.alarm-fact span{color:var(--sub)}.alarm-fact strong{text-align:right;font-weight:650}
      .alert-mark{background:#b75b42;color:white;width:21px;height:21px;border-radius:50%;display:grid;place-items:center}
      .alert-meta{color:var(--sub);font-size:10px;margin-top:9px;line-height:1.6}
      details{margin-top:15px;border-top:1px solid var(--line);padding-top:14px}
      details.alarm-details{padding:14px 2px 0;margin-top:0}
      .alarm-details>summary .chip{margin-left:auto;white-space:nowrap}
      .alarm-details>.alerts{margin-top:13px}
      .pac-head-status{display:flex;gap:6px;flex-wrap:wrap}
      details>summary{cursor:pointer;list-style:none;font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;user-select:none}
      details>summary::-webkit-details-marker{display:none}
      details>summary:before{content:'▸';color:var(--summary-chevron);transition:transform .15s}details[open]>summary:before{transform:rotate(90deg)}
      .details-note{color:var(--sub);font-size:11px;margin:11px 0 13px;line-height:1.5}
      .diag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .activity{margin:0 0 14px;padding:2px 0 4px}
      .activity-date{padding:2px 0 10px;font-size:15px;font-weight:600}
      .activity-list{position:relative;display:grid;padding-left:2px}
      .activity-list::before{content:'';position:absolute;left:8px;top:10px;bottom:10px;width:2px;background:var(--divider-color)}
      .activity-row{position:relative;display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--divider-color)}
      .activity-row:first-child{border-top:0}
      .activity-dot{width:12px;height:12px;margin-top:5px;border-radius:50%;background:var(--disabled-text-color);box-shadow:0 0 0 3px var(--card-background-color);z-index:1}
      .activity-dot.first{background:#26a69a}
      .activity-body{min-width:0}
      .activity-line{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .activity-name{flex:0 0 32%;font-size:12px;font-weight:600}
      .activity-message{flex:1;font-size:12px;line-height:1.35;text-align:right;overflow-wrap:anywhere}
      .activity-meta{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:3px;font-size:11px;opacity:.65}
      .activity-chevron{font-size:18px;line-height:.8}
      .activity-empty{padding:9px 0;font-size:11px;opacity:.65}
      .diag-activity{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start;margin:0 0 14px}
      .diag-activity>.activity{min-width:0;margin:0}
      .diag-activity>.activity:only-child{grid-column:1/-1}
      .session-history>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px}
      .session-history>summary::-webkit-details-marker{display:none}
      .session-history>summary:before{content:'▸';font-size:11px;opacity:.65;transition:transform .15s}
      .session-history[open]>summary:before{transform:rotate(90deg)}
      .session-list{padding-top:2px}
      .session-history .ecs-history-row{display:flex;flex-wrap:wrap;gap:3px 9px;padding:7px 0;border-top:1px solid var(--divider-color);font-size:11px;color:var(--secondary-text-color)}
      .session-history .ecs-history-row:first-child{border-top:0}
      .session-history .ecs-history-row strong{color:var(--primary-text-color);font-weight:600}
      .session-history .ecs-history-row .eh-date{color:var(--secondary-text-color);opacity:.75}
      .diag-group{min-width:0;background:var(--surface);padding:13px;border-radius:12px;border:1px solid var(--panel-line)}
      .diag-group h4{margin:0 0 10px;font-size:12px;color:var(--text)}
      .diag-activity-panel .activity{margin:0}
      .diag-activity-panel .session-history{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
      .graph-panel{margin-top:8px;padding:0;background:none;border:0}
      .eg-wrap{display:grid;gap:10px}
      .eg-card{--eg-circ:#ff7a3d;--eg-circ2:#ffb347;--eg-ecs:#2f8cff;--eg-ecs2:#5fd0ff;
        padding:13px 14px 10px;border-radius:14px;border:1px solid var(--panel-line);
        background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--eg-circ) 9%,transparent),transparent 60%),
          radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--eg-ecs) 9%,transparent),transparent 60%),
          linear-gradient(165deg,var(--surface),var(--surface2))}
      .eg-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
      .eg-head>div:first-child{display:grid;gap:2px}
      .eg-title{font-size:13px;font-weight:700;letter-spacing:.01em}
      .eg-head small{font-size:11px;color:var(--sub)}
      .eg-total{display:flex;align-items:baseline;gap:3px;white-space:nowrap}
      .eg-total b{font-size:22px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;
        background:linear-gradient(90deg,var(--eg-circ),var(--eg-ecs));-webkit-background-clip:text;background-clip:text;color:transparent}
      .eg-total small{font-size:11px;color:var(--sub)}
      .eg-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:9px 0 4px;font-size:11px;color:var(--sub)}
      .eg-legend b{color:var(--text);font-weight:700;font-variant-numeric:tabular-nums;margin-left:3px}
      .eg-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:-1px}
      .eg-dot.eg-circ{background:linear-gradient(180deg,var(--eg-circ2),var(--eg-circ))}
      .eg-dot.eg-ecs{background:linear-gradient(180deg,var(--eg-ecs2),var(--eg-ecs))}
      .eg-share{display:inline-flex;align-items:center;gap:6px;margin-left:auto}
      .eg-share-bar{display:inline-block;width:54px;height:6px;border-radius:3px;overflow:hidden;background:linear-gradient(90deg,var(--eg-ecs2),var(--eg-ecs))}
      .eg-share-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--eg-circ),var(--eg-circ2))}
      .eg-plot{position:relative;margin-top:6px;padding-top:4px;
        background:repeating-linear-gradient(to top,transparent 0,transparent calc(25% - 1px),color-mix(in srgb,var(--panel-line) 55%,transparent) calc(25% - 1px),color-mix(in srgb,var(--panel-line) 55%,transparent) 25%) 0 0/100% calc(100% - 30px) no-repeat}
      .eg-grid{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px;align-items:end;height:170px}
      .eg-hour .eg-grid{gap:3px;height:140px}
      .eg-col{display:grid;grid-template-rows:14px 1fr 30px;gap:3px;height:100%;min-width:0;text-align:center;cursor:default}
      .eg-col>strong{font-size:10px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;align-self:end}
      .eg-track{display:flex;flex-direction:column-reverse;justify-content:flex-start;height:100%;border-radius:7px 7px 3px 3px;overflow:hidden;
        background:color-mix(in srgb,var(--text) 4%,transparent);transition:transform .15s ease}
      .eg-seg{width:100%;flex:none;transition:height .6s cubic-bezier(.2,.8,.2,1)}
      .eg-seg.eg-circ{background:linear-gradient(180deg,var(--eg-circ2),var(--eg-circ))}
      .eg-seg.eg-ecs{background:linear-gradient(180deg,var(--eg-ecs2),var(--eg-ecs))}
      .eg-track .eg-seg:last-child{border-radius:6px 6px 0 0}
      .eg-col:hover .eg-track{transform:scaleY(1.02);box-shadow:0 0 0 1px color-mix(in srgb,var(--text) 18%,transparent)}
      .eg-col.is-now .eg-track{box-shadow:0 0 0 1.5px color-mix(in srgb,var(--eg-circ) 70%,var(--eg-ecs)),0 6px 16px -6px color-mix(in srgb,var(--eg-circ) 55%,transparent)}
      .eg-col.is-future .eg-track{background:repeating-linear-gradient(135deg,transparent 0 3px,color-mix(in srgb,var(--text) 5%,transparent) 3px 6px)}
      .eg-col>span{display:grid;gap:1px;font-size:10px;color:var(--sub);line-height:1.15;text-transform:capitalize;white-space:nowrap}
      .eg-col.is-now>span{color:var(--text);font-weight:700}
      .eg-col small{font-size:9px;opacity:.7}
      .eg-note{margin:0;font-size:10.5px;color:var(--sub);opacity:.85}
      .graph-note{padding:12px 0;font-size:12px;opacity:.7}
      .curve-panel{margin-top:8px;padding:12px 13px 8px;background:var(--surface);border:1px solid var(--panel-line);border-radius:12px}
      .curve-head{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:600}
      .curve-head small{font-weight:400;opacity:.65}
      .curve-head-actions{display:inline-flex;align-items:center;gap:8px}
      .curve-info{width:22px;height:22px;border-radius:50%;border:1px solid var(--panel-line);background:var(--soft);color:var(--text);font:700 12px/1 var(--primary-font-family,sans-serif);cursor:pointer;display:inline-grid;place-items:center;padding:0}
      .curve-info:hover{border-color:var(--blue);color:var(--blue)}
      .curve-help-panel{width:min(520px,100%);max-height:min(82vh,680px)}
      .curve-help-body{overflow:auto;font-size:12px;line-height:1.5;padding-right:4px}
      .curve-help-body p{margin:0 0 8px}
      .curve-help-body ul,.curve-help-body ol{margin:0 0 10px;padding-left:20px;display:grid;gap:4px}
      .curve-help-body h5{margin:12px 0 6px;font-size:12px}
      .curve-help-warning{margin-top:10px!important;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--amber) 12%,transparent);color:var(--warn-text);font-size:11px}
      .curve-svg{width:100%;height:auto;display:block;margin-top:8px}
      .curve-grid{stroke:var(--line);stroke-width:.7;opacity:.55}
      .curve-axis{fill:var(--sub);font-size:9px}
      .curve-axis-line{stroke:var(--line);stroke-width:1}
      .curve-legend{display:flex;flex-wrap:wrap;gap:5px 16px;font-size:11px;color:var(--sub);margin-top:4px}
      .curve-legend span{display:inline-flex;align-items:center;gap:6px}
      .curve-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}
      .curve-table-wrap{margin-top:8px;overflow-x:auto}
      .curve-table{display:grid;min-width:590px;border-top:1px solid var(--divider-color)}
      .curve-table-head,.curve-table-row{display:grid;grid-template-columns:52px repeat(6,minmax(72px,1fr));gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--divider-color);font-size:11px}
      .curve-table-head{font-weight:600;color:var(--sub)}
      .curve-table-head span:not(:first-child){text-align:right}
      .curve-table-row>strong{display:inline-flex;align-items:center;gap:5px;font-weight:700}
      .curve-table-row>strong i{width:8px;height:8px;border-radius:50%;display:inline-block}
      .curve-table-row>strong i.c1{background:var(--red)}
      .curve-table-row>strong i.c2{background:var(--blue)}
      .curve-table-row>span{text-align:right;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
      .curve-table-row small{font-weight:400;color:var(--sub);margin-left:1px}
      .curve-note{font-size:10px;color:var(--sub);opacity:.8;line-height:1.35;margin-top:6px}
      .detail-row{border-bottom:1px solid var(--line);display:flex;align-items:baseline;gap:10px;justify-content:space-between;padding:6px 0;font-size:11px}
      .detail-row:last-child{border:0}.detail-row span{color:var(--sub);min-width:0}.detail-row strong{text-align:right;font-weight:700;max-width:58%;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
      .detail-row strong.na{color:var(--muted)}
      /* Width is measured in the actual Lovelace card, not screen pixels. */
      @container (max-width:1100px){
        .wrap{padding:16px}
        .schematic{grid-template-columns:minmax(128px,.85fr) 24px minmax(175px,1fr) 34px minmax(220px,1.6fr);gap:8px 0}
        .machine,.pac{padding:12px 10px;min-width:0}
        .out-values>div strong{font-size:16px}
        .out-title{font-size:12px}
        .output-card{padding:10px;min-width:0}
        .fan-shell{width:min(100%,130px)}
        .pac-metrics>div strong{font-size:14px}
        .big-value{font-size:24px}
      }
      /* Vertical layout only when the horizontal composition is no longer legible. */
      @container (max-width:680px){
        .schematic{display:flex;flex-direction:column;gap:0}
        .machine,.pac{min-height:unset;width:100%}
        .machine{display:grid;grid-template-columns:100px minmax(0,1fr);gap:7px 13px;align-items:center}
        .machine .mini-head{grid-column:1/3}
        .machine .machine-art{min-height:100px;grid-row:2/5}
        .machine .fan-shell{width:94px}
        .machine .machine-stat{padding-top:5px}
        .pac-art{min-height:85px}
        .inlink,.outlink{display:block;flex:0 0 56px;height:56px;align-self:stretch;overflow:hidden}
        .inlink .horizontal-link,.outlink .horizontal-link{display:none}
        .inlink .vertical-link,.outlink .vertical-link{display:block;height:100%;width:100%;overflow:hidden}
        .outs{display:flex;flex-direction:column;gap:10px;position:relative;padding-left:22px;margin-top:0}
        .outs:before{content:'';position:absolute;left:9px;top:0;bottom:55px;width:7px;border-radius:4px;background:var(--pipe)}
        .output-card{min-height:115px;position:relative;overflow:visible}
        .output-card:before{content:'';position:absolute;left:-23px;top:50%;width:23px;height:7px;margin-top:-3px;background:var(--pipe)}

        .diag-grid{grid-template-columns:1fr}
        .out-values{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @container (max-width:400px){
        .machine{grid-template-columns:80px minmax(0,1fr)}
        .machine .fan-shell{width:76px}
        .pac-metrics{gap:8px}
        .out-values{grid-template-columns:1fr 1fr}
        .out-values>div strong{font-size:16px}
      }

      /* Présentation épurée facultative : aucune liaison hydraulique illustrative.
         Les trois usages restent séparés ; leurs repères reflètent le mode réel. */
      :host([data-layout-style="clean"]) .schematic {
        grid-template-columns:minmax(0,.95fr) 24px minmax(0,1.12fr) 38px minmax(0,1.5fr);
        grid-template-rows:repeat(3,minmax(130px,auto));
        column-gap:14px;row-gap:12px;
      }
      :host([data-layout-style="clean"]) .machine {grid-column:1;grid-row:1/4}
      :host([data-layout-style="clean"]) .inlink {grid-column:2;grid-row:1/4}
      :host([data-layout-style="clean"]) .pac {grid-column:3;grid-row:1/4}
      :host([data-layout-style="clean"]) .outlink {grid-column:4;grid-row:1/4}
      :host([data-layout-style="clean"]) .outs {grid-column:5;grid-row:1/4;gap:12px;padding:0;margin:0}
      /* Liaison graphique horizontale : équilibre entre finesse et lisibilité. */
      :host([data-layout-style="clean"]) .linksvg path.track {stroke-width:5;opacity:.65}
      :host([data-layout-style="clean"]) .linksvg path.live {stroke-width:3}
      :host([data-layout-style="clean"][data-show-links="false"]) .inlink,
      :host([data-layout-style="clean"][data-show-links="false"]) .outlink {visibility:hidden}
      :host([data-animate-flows="false"]) .linksvg.has-flow path.track,
      :host([data-animate-flows="false"]) .linksvg path.live {animation:none!important;stroke-dasharray:none}
      :host([data-animate-flows="false"]) .exchanger.running .exch-flow,
      :host([data-animate-flows="false"]) .exchanger.running .exch-col svg,
      :host([data-animate-flows="false"]) .fan-shell.running .blades {animation:none!important}
      :host([data-layout-style="clean"]) .outs:before,
      :host([data-layout-style="clean"]) .output-card:before,
      :host([data-layout-style="clean"]) .output-card:after {display:none!important;content:none!important}
      :host([data-layout-style="clean"]) .output-card {
        border-left:3px solid var(--panel-line);
        overflow:hidden;
        transition:border-color .25s ease,box-shadow .25s ease;
      }
      :host([data-layout-style="clean"]) .output-card.regime-heat {
        border-left-color:color-mix(in srgb,var(--red) 45%,var(--panel-line));
      }
      :host([data-layout-style="clean"]) .output-card.regime-cool {
        border-left-color:color-mix(in srgb,var(--blue) 45%,var(--panel-line));
      }
      :host([data-layout-style="clean"]) .output-card.heat {
        border-left-color:var(--red);
        box-shadow:inset 3px 0 0 color-mix(in srgb,var(--red) 35%,transparent);
      }
      :host([data-layout-style="clean"]) .output-card.cool {
        border-left-color:var(--blue);
        box-shadow:inset 3px 0 0 color-mix(in srgb,var(--blue) 35%,transparent);
      }
      :host([data-layout-style="clean"]) .output-card.electric {border-left-color:var(--amber)}
      :host([data-layout-style="clean"]) .output-card[aria-label="Eau chaude sanitaire"]:not(.electric) {
        border-left-color:color-mix(in srgb,#9276cf 48%,var(--panel-line));
      }
      :host([data-layout-style="clean"]) .output-card.regime-heat .out-ico {color:var(--red)}
      :host([data-layout-style="clean"]) .output-card.regime-cool .out-ico {color:var(--blue)}
      @container (max-width:900px) {
        :host([data-layout-style="clean"]) .schematic {
          display:flex;flex-direction:column;gap:12px;
        }
        :host([data-layout-style="clean"]) .inlink,
        :host([data-layout-style="clean"]) .outlink {display:none!important}
        :host([data-layout-style="clean"]) .machine,
        :host([data-layout-style="clean"]) .pac {min-height:unset;width:100%}
        :host([data-layout-style="clean"]) .outs {
          display:flex;flex-direction:column;gap:10px;margin:0;padding:0;width:100%;
        }
        :host([data-layout-style="clean"]) .output-card {min-height:116px}
      }

      /* V2.8 : plus compact sans supprimer d'informations ni changer les entités. */
      .wrap{padding:14px 16px 14px}
      .schematic{margin:0 0 12px;grid-template-rows:repeat(3,minmax(108px,auto));row-gap:9px}
      :host([data-layout-style="clean"]) .schematic{
        grid-template-rows:repeat(3,minmax(108px,auto));row-gap:9px}
      .machine,.pac{min-height:354px;padding:13px 14px;gap:9px}
      .machine .machine-art{min-height:104px}
      .fan-shell{width:min(100%,154px)}
      .big-value{font-size:clamp(22px,2.5vw,31px)}
      .machine-stat{padding-top:7px}
      .pac-art{min-height:93px;margin:1px 0}
      .exch-col svg{width:65px;height:78px}
      .exchanger{gap:9px}
      .pac-metrics{gap:8px 11px;padding-top:10px}
      .pac-bottom{margin-top:3px}
      .outs{grid-template-rows:repeat(3,minmax(108px,auto));gap:9px}
      .output-card{min-height:108px;padding:11px 13px 10px;gap:7px}
      .out-top{gap:8px}.out-ico{width:32px;flex-basis:32px;height:32px}
      .out-values>div strong{font-size:18px}
      .section{padding-top:13px}
      details{margin-top:12px;padding-top:12px}
      details.alarm-details{padding-top:10px}
      .diag-group{padding:11px}
      .diag-grid{gap:9px}
      /* Orientations : aucun fichier image, uniquement HTML/CSS et SVG incorporé. */
      :host([data-orientation="landscape"]) .wrap{overflow-x:auto;overscroll-behavior-x:contain}
      :host([data-orientation="landscape"]) .schematic,
      :host([data-orientation="landscape"][data-layout-style="clean"]) .schematic{
        display:grid;grid-template-columns:minmax(160px,.85fr) 32px minmax(190px,1fr) 62px minmax(280px,1.7fr);
        grid-template-rows:repeat(3,minmax(108px,auto));min-width:830px;row-gap:9px;column-gap:0}
      :host([data-orientation="landscape"]) .machine{grid-column:1;grid-row:1/4;display:flex}
      :host([data-orientation="landscape"]) .inlink{grid-column:2;grid-row:1/4;display:block!important;height:auto;flex:auto}
      :host([data-orientation="landscape"]) .pac{grid-column:3;grid-row:1/4;display:flex}
      :host([data-orientation="landscape"]) .outlink{grid-column:4;grid-row:1/4;display:block!important;height:auto;flex:auto}
      :host([data-orientation="landscape"]) .outs{grid-column:5;grid-row:1/4;display:grid;
        grid-template-rows:repeat(3,minmax(108px,auto));gap:9px;padding:0;margin:0}
      :host([data-orientation="landscape"]) .horizontal-link{display:block}
      :host([data-orientation="landscape"]) .vertical-link{display:none}
      :host([data-orientation="landscape"]) .outs:before,
      :host([data-orientation="landscape"]) .output-card:before,
      :host([data-orientation="landscape"]) .output-card:after{display:none!important}
      :host([data-orientation="landscape"][data-show-links="false"]) .inlink,
      :host([data-orientation="landscape"][data-show-links="false"]) .outlink{visibility:hidden}
      :host([data-orientation="landscape"]) .output-card{overflow:hidden}
      /* Portrait manuel, indépendamment de la largeur du dashboard. */
:host([data-orientation="portrait"]) .schematic{display:flex;flex-direction:column;gap:0;min-width:0;grid-template-columns:none;grid-template-rows:none}
:host([data-orientation="portrait"]) .machine, :host([data-orientation="portrait"]) .pac{min-height:0;width:100%;padding:12px 13px}
:host([data-orientation="portrait"]) .machine{display:grid;grid-template-columns:92px minmax(0,1fr);align-items:center;gap:5px 12px}
:host([data-orientation="portrait"]) .machine .mini-head{grid-column:1/-1}
:host([data-orientation="portrait"]) .machine .machine-art{grid-column:1;grid-row:2/5;min-height:90px;align-self:stretch}
:host([data-orientation="portrait"]) .machine .fan-shell{width:82px}
:host([data-orientation="portrait"]) .machine .machine-stat{padding-top:5px}
:host([data-orientation="portrait"]) .big-value{font-size:clamp(20px,5.2vw,27px)}
:host([data-orientation="portrait"]) .pac-art{min-height:85px;margin:1px 0}
:host([data-orientation="portrait"]) .exch-col svg{height:66px;width:54px}
:host([data-orientation="portrait"]) .pac-metrics{gap:6px 10px;padding-top:9px}
:host([data-orientation="portrait"]) .pac-bottom{font-size:10px}
:host([data-orientation="portrait"]) .inlink, :host([data-orientation="portrait"]) .outlink{display:block;grid-column:auto;grid-row:auto;flex:0 0 38px;height:38px;width:100%;align-self:stretch;overflow:hidden}
:host([data-orientation="portrait"]) .horizontal-link{display:none}
:host([data-orientation="portrait"]) .vertical-link{display:block;width:100%;height:100%;overflow:hidden}
:host([data-orientation="portrait"]) .outs{display:flex;flex-direction:column;grid-column:auto;grid-row:auto;gap:8px;padding-left:20px;margin:0;position:relative;min-width:0}
:host([data-orientation="portrait"]) .outs:before{content:'';display:block;position:absolute;left:8px;top:0;bottom:50px;width:5px;border-radius:4px;background:var(--pipe)}
:host([data-orientation="portrait"]) .output-card{position:relative;min-height:105px;padding:10px 12px;overflow:visible}
:host([data-orientation="portrait"]) .output-card:before{content:'';display:block;position:absolute;left:-21px;top:50%;width:21px;height:5px;margin-top:-2px;background:var(--pipe)}
      :host([data-orientation="portrait"]) .output-card.heat:after, :host([data-orientation="portrait"]) .output-card.cool:after, :host([data-orientation="portrait"]) .output-card.electric:after{content:'';display:block;position:absolute;left:-21px;top:50%;width:21px;height:3px;margin-top:-1px}
:host([data-orientation="portrait"]) .diag-grid{grid-template-columns:1fr}
:host([data-orientation="portrait"]) .diag-activity{grid-template-columns:1fr}
:host([data-orientation="portrait"]) .out-values{grid-template-columns:repeat(2,minmax(0,1fr))}
:host([data-orientation="portrait"]) .output-card .out-values strong{font-size:17px}
:host([data-orientation="portrait"]) .wrap{overflow-x:visible}
:host([data-orientation="portrait"]) .schematic .outs .output-card{width:100%}
:host([data-orientation="portrait"]) .machine .machine-art .fan-shell{max-width:90px}
      /* Auto : suit la largeur réelle de la carte, utile sur mobile/tablette. */
      @container (max-width:800px){
:host([data-orientation="auto"]) .schematic{display:flex;flex-direction:column;gap:0;min-width:0;grid-template-columns:none;grid-template-rows:none}
:host([data-orientation="auto"]) .machine, :host([data-orientation="auto"]) .pac{min-height:0;width:100%;padding:12px 13px}
:host([data-orientation="auto"]) .machine{display:grid;grid-template-columns:92px minmax(0,1fr);align-items:center;gap:5px 12px}
:host([data-orientation="auto"]) .machine .mini-head{grid-column:1/-1}
:host([data-orientation="auto"]) .machine .machine-art{grid-column:1;grid-row:2/5;min-height:90px;align-self:stretch}
:host([data-orientation="auto"]) .machine .fan-shell{width:82px}
:host([data-orientation="auto"]) .machine .machine-stat{padding-top:5px}
:host([data-orientation="auto"]) .big-value{font-size:clamp(20px,5.2vw,27px)}
:host([data-orientation="auto"]) .pac-art{min-height:85px;margin:1px 0}
:host([data-orientation="auto"]) .exch-col svg{height:66px;width:54px}
:host([data-orientation="auto"]) .pac-metrics{gap:6px 10px;padding-top:9px}
:host([data-orientation="auto"]) .pac-bottom{font-size:10px}
:host([data-orientation="auto"]) .inlink, :host([data-orientation="auto"]) .outlink{display:block;grid-column:auto;grid-row:auto;flex:0 0 38px;height:38px;width:100%;align-self:stretch;overflow:hidden}
:host([data-orientation="auto"]) .horizontal-link{display:none}
:host([data-orientation="auto"]) .vertical-link{display:block;width:100%;height:100%;overflow:hidden}
:host([data-orientation="auto"]) .outs{display:flex;flex-direction:column;grid-column:auto;grid-row:auto;gap:8px;padding-left:20px;margin:0;position:relative;min-width:0}
:host([data-orientation="auto"]) .outs:before{content:'';display:block;position:absolute;left:8px;top:0;bottom:50px;width:5px;border-radius:4px;background:var(--pipe)}
:host([data-orientation="auto"]) .output-card{position:relative;min-height:105px;padding:10px 12px;overflow:visible}
:host([data-orientation="auto"]) .output-card:before{content:'';display:block;position:absolute;left:-21px;top:50%;width:21px;height:5px;margin-top:-2px;background:var(--pipe)}
      :host([data-orientation="auto"]) .output-card.heat:after, :host([data-orientation="auto"]) .output-card.cool:after, :host([data-orientation="auto"]) .output-card.electric:after{content:'';display:block;position:absolute;left:-21px;top:50%;width:21px;height:3px;margin-top:-1px}
:host([data-orientation="auto"]) .diag-grid{grid-template-columns:1fr}
:host([data-orientation="auto"]) .diag-activity{grid-template-columns:1fr}
:host([data-orientation="auto"]) .out-values{grid-template-columns:repeat(2,minmax(0,1fr))}
:host([data-orientation="auto"]) .output-card .out-values strong{font-size:17px}
:host([data-orientation="auto"]) .wrap{overflow-x:visible}
:host([data-orientation="auto"]) .schematic .outs .output-card{width:100%}
:host([data-orientation="auto"]) .machine .machine-art .fan-shell{max-width:90px}
      }
      /* Clean : ne pas montrer une tuyauterie trompeuse en portrait. */
      :host([data-orientation="portrait"][data-layout-style="clean"]) .outs:before,
      :host([data-orientation="portrait"][data-layout-style="clean"]) .output-card:before,
      :host([data-orientation="portrait"][data-layout-style="clean"]) .output-card:after{display:none!important}
      @container (max-width:800px){
        :host([data-orientation="auto"][data-layout-style="clean"]) .outs:before,
        :host([data-orientation="auto"][data-layout-style="clean"]) .output-card:before,
        :host([data-orientation="auto"][data-layout-style="clean"]) .output-card:after{display:none!important}
      }
      :host([data-orientation="portrait"][data-show-links="false"]) .inlink,
      :host([data-orientation="portrait"][data-show-links="false"]) .outlink{visibility:hidden}
      @container (max-width:800px){
        :host([data-orientation="auto"][data-show-links="false"]) .inlink,
        :host([data-orientation="auto"][data-show-links="false"]) .outlink{visibility:hidden}
      }
      :host([data-animate-flows="false"]) .output-card:after,
      :host([data-animate-flows="false"]) .tank-mini,
      :host([data-animate-flows="false"]) .tank-mini:after{animation:none!important}
      @media(prefers-reduced-motion:reduce){.output-card:after,.tank-mini,.tank-mini:after{animation:none!important}}
      @media(prefers-reduced-motion:reduce){.linksvg.has-flow path.track,.linksvg path.live,.fan-shell.running .blades,.exchanger.running .exch-col svg,.exchanger.running .exch-flow{animation:none!important}}

      /* V2.8.2 : portrait mobile sans faux collecteur latéral. Des traits courts
         relient COMP → PAC → groupe de sorties, sans branches traversantes.
         Les cartes conservent leur bordure d'état et leur largeur complète. */
      :host([data-orientation="portrait"]) .outs{
        padding-left:0!important;gap:10px;margin:0;min-width:0}
      :host([data-orientation="portrait"]) .outs:before,
      :host([data-orientation="portrait"]) .output-card:before,
      :host([data-orientation="portrait"]) .output-card:after{display:none!important;content:none!important}
      :host([data-orientation="portrait"]) .output-card{
        width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;min-width:0}
      :host([data-orientation="portrait"]) .inlink,
      :host([data-orientation="portrait"]) .outlink{
        flex-basis:25px;height:25px;min-height:25px}
      @container (max-width:800px){
        :host([data-orientation="auto"]) .outs{
          padding-left:0!important;gap:10px;margin:0;min-width:0}
        :host([data-orientation="auto"]) .outs:before,
        :host([data-orientation="auto"]) .output-card:before,
        :host([data-orientation="auto"]) .output-card:after{
          display:none!important;content:none!important}
        :host([data-orientation="auto"]) .output-card{
          width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;min-width:0}
        :host([data-orientation="auto"]) .inlink,
        :host([data-orientation="auto"]) .outlink{
          flex-basis:25px;height:25px;min-height:25px}
      }

      /* V2.9.0 — style Aérien : fidèle aux dernières maquettes.
         Aucune image/photo, ni donnée supplémentaire ; tous les badges
         natifs et les diagnostics de V1.5.21 restent inchangés. */
      .fan-aerien,.exch-col svg.exch-aerien{display:none}
      :host([data-layout-style="aerien"]){
        --aerien-border:color-mix(in srgb,var(--line) 58%,transparent);
        --aerien-panel:color-mix(in srgb,var(--bg) 96%,var(--blue) 4%);
        --aerien-inner:color-mix(in srgb,var(--bg) 92%,var(--blue) 8%);
        --aerien-tube:color-mix(in srgb,var(--pipe) 74%,var(--bg) 26%);
      }
      :host([data-layout-style="aerien"]) ha-card{
        background:var(--bg);border:0;box-shadow:none}
      :host([data-layout-style="aerien"]) .wrap{padding:12px 14px 14px}
      :host([data-layout-style="aerien"]) .schematic{
        grid-template-columns:minmax(166px,1.06fr) 33px minmax(205px,.94fr) 55px minmax(330px,1.52fr);
        grid-template-rows:repeat(3,minmax(122px,auto));gap:10px 0}
      :host([data-layout-style="aerien"]) .machine,
      :host([data-layout-style="aerien"]) .pac,
      :host([data-layout-style="aerien"]) .output-card{
        background:var(--aerien-panel);border:1px solid var(--aerien-border);
        border-radius:21px;box-shadow:0 3px 13px color-mix(in srgb,var(--text) 5%,transparent)}
      :host([data-layout-style="aerien"]) .machine,
      :host([data-layout-style="aerien"]) .pac{
        min-height:385px;padding:17px 16px;gap:11px}
      :host([data-layout-style="aerien"]) .mini-head{
        text-transform:none;letter-spacing:0;color:var(--text);
        font-size:clamp(13px,1.2vw,17px);font-weight:740;line-height:1.35}
      :host([data-layout-style="aerien"]) .machine .machine-art{
        flex:1;min-height:135px;padding:8px 0}
      :host([data-layout-style="aerien"]) .fan-shell{
        width:min(100%,185px);aspect-ratio:1.125/1;
        border:none;border-radius:0;background:transparent;
        box-shadow:none;overflow:visible}
      :host([data-layout-style="aerien"]) .fan-shell:after{content:none}
      :host([data-layout-style="aerien"]) .fan-shell.running{
        border:0;box-shadow:none}
      :host([data-layout-style="aerien"]) .fan-svg:not(.fan-aerien){display:none}
      :host([data-layout-style="aerien"]) .fan-svg.fan-aerien{
        display:block;width:100%;height:100%;color:var(--fan-stroke);overflow:visible}
      :host([data-layout-style="aerien"]) .fan-aerien .unit-case{
        fill:var(--aerien-inner);stroke:var(--fan-edge);stroke-width:2}
      :host([data-layout-style="aerien"]) .fan-aerien .fan-ring{
        fill:none;stroke:var(--fan-stroke);stroke-width:2.2}
      :host([data-layout-style="aerien"]) .fan-aerien .fan-inner{
        fill:color-mix(in srgb,var(--fan-bg) 70%,var(--bg) 30%);stroke:var(--fan-edge);stroke-width:1}
      :host([data-layout-style="aerien"]) .fan-aerien .fan-hub{
        fill:var(--bg);stroke:var(--fan-stroke);stroke-width:2}
      :host([data-layout-style="aerien"]) .fan-aerien .unit-feet{
        fill:none;stroke:var(--fan-edge);stroke-width:3;stroke-linejoin:round}
      :host([data-layout-style="aerien"]) .fan-aerien .blades{
        transform-box:view-box;transform-origin:90px 77px}
      :host([data-layout-style="aerien"]) .machine-stat{
        padding-top:9px;border-top:1px solid var(--aerien-border)}
      :host([data-layout-style="aerien"]) .mod-bar{
        height:9px;background:var(--soft2)}
      :host([data-layout-style="aerien"]) .mod-bar>i{
        background:linear-gradient(90deg,#23bfb0,#36d5a6);
        transition:width .6s ease-out}
      :host([data-layout-style="aerien"]) .pac-art{min-height:130px;gap:8px}
      :host([data-layout-style="aerien"]) .exchanger{gap:12px}
      :host([data-layout-style="aerien"]) .exch-col svg:not(.exch-aerien){display:none}
      :host([data-layout-style="aerien"]) .exch-col svg.exch-aerien{
        display:block;width:69px;max-width:100%;height:92px;
        fill:none;stroke:currentColor;stroke-width:4.5;
        filter:none;opacity:.94}
      :host([data-layout-style="aerien"]) .exch-col .exch-aerien .exch-frame{
        fill:var(--aerien-inner);stroke:currentColor;
        stroke-width:1.8;stroke-opacity:.62}
      :host([data-layout-style="aerien"]) .exch-col .exch-aerien .exch-tube{
        fill:none;stroke:currentColor;stroke-width:4.7;
        stroke-linejoin:round;stroke-linecap:round}
      :host([data-layout-style="aerien"]) .exch-caption{font-size:11px}
      :host([data-layout-style="aerien"]) .pac-metrics{
        border:1px solid var(--aerien-border);border-radius:13px;
        background:var(--aerien-inner);padding:12px;gap:11px}
      :host([data-layout-style="aerien"]) .pac-bottom{
        font-size:10px;line-height:1.35}
      :host([data-layout-style="aerien"]) .outs{
        grid-template-rows:repeat(3,minmax(122px,auto));gap:10px}
      :host([data-layout-style="aerien"]) .output-card{
        min-height:122px;padding:12px 14px;gap:8px;border-left:1px solid var(--aerien-border)}
      :host([data-layout-style="aerien"]) .out-title{
        font-size:14px;font-weight:730}
      :host([data-layout-style="aerien"]) .out-values>div strong{font-size:19px}
      :host([data-layout-style="aerien"]) .out-foot .chip{
        border:0;background:var(--aerien-inner);
        font-size:10px;max-width:100%;white-space:normal;overflow-wrap:anywhere}
      :host([data-layout-style="aerien"]) .state-dot.heat,
      :host([data-layout-style="aerien"]) .state-dot.cool{
        box-shadow:none;animation:aerienSignal 2.8s ease-in-out infinite}
      :host([data-layout-style="aerien"]) .state-dot.electric{
        background:var(--amber);animation:aerienSignal 2.8s ease-in-out infinite}
      @keyframes aerienSignal{
        0%,100%{opacity:1}50%{opacity:.52}
      }
      :host([data-layout-style="aerien"]) .linksvg path.track{
        stroke:var(--aerien-tube);stroke-width:5;opacity:.8}
      :host([data-layout-style="aerien"]) .linksvg path.live{
        stroke-width:2.5}
      :host([data-layout-style="aerien"]) details{
        border:1px solid var(--aerien-border);border-radius:15px;
        padding:12px 15px;margin-top:9px;background:var(--aerien-panel)}
      :host([data-layout-style="aerien"]) details.alarm-details{
        padding:12px 15px}
      :host([data-layout-style="aerien"]) .diag-group,
      :host([data-layout-style="aerien"]) .alerts{
        background:var(--aerien-inner);border-color:var(--aerien-border)}
      /* Paysage imposé : conserver une largeur suffisante pour les trois badges. */
      :host([data-layout-style="aerien"][data-orientation="landscape"]) .schematic{
        display:grid;grid-template-columns:minmax(175px,1.06fr) 32px minmax(210px,.94fr) 58px minmax(360px,1.52fr);
        min-width:900px;grid-template-rows:repeat(3,minmax(122px,auto))}
      /* Auto : les largeurs sont déterminées par la largeur du conteneur Lovelace. */
      @container (min-width:801px) and (max-width:1100px){
        :host([data-layout-style="aerien"][data-orientation="auto"]) .schematic{
          grid-template-columns:minmax(130px,.9fr) 22px minmax(165px,1fr) 28px minmax(240px,1.5fr)}
        :host([data-layout-style="aerien"]) .machine,
        :host([data-layout-style="aerien"]) .pac{padding:12px 10px}
      }
      /* Portrait forcé ou automatique : aucun faux collecteur sur les cartes. */
      :host([data-layout-style="aerien"][data-orientation="portrait"]) .schematic{
        display:flex;flex-direction:column;gap:0;min-width:0}
      :host([data-layout-style="aerien"][data-orientation="portrait"]) .machine,
      :host([data-layout-style="aerien"][data-orientation="portrait"]) .pac{
        min-height:0;padding:13px}
      :host([data-layout-style="aerien"][data-orientation="portrait"]) .outs{
        display:flex;flex-direction:column;gap:10px;padding:0;margin:0}
      :host([data-layout-style="aerien"][data-orientation="portrait"]) .output-card{
        min-height:106px;overflow:hidden}
      @container (max-width:800px){
        :host([data-layout-style="aerien"][data-orientation="auto"]) .schematic{
          display:flex;flex-direction:column;gap:0;min-width:0}
        :host([data-layout-style="aerien"][data-orientation="auto"]) .machine,
        :host([data-layout-style="aerien"][data-orientation="auto"]) .pac{
          min-height:0;padding:13px}
        :host([data-layout-style="aerien"][data-orientation="auto"]) .outs{
          display:flex;flex-direction:column;gap:10px;padding:0;margin:0}
        :host([data-layout-style="aerien"][data-orientation="auto"]) .output-card{
          min-height:106px;overflow:hidden}
      }
      :host([data-layout-style="aerien"]) .output-card:before,
      :host([data-layout-style="aerien"]) .output-card:after,
      :host([data-layout-style="aerien"]) .outs:before{
        content:none!important;display:none!important}
      :host([data-animate-flows="false"]) .state-dot.heat,
      :host([data-animate-flows="false"]) .state-dot.cool,
      :host([data-animate-flows="false"]) .state-dot.electric{
        animation:none!important}
      @media(prefers-reduced-motion:reduce){
        :host([data-layout-style="aerien"]) .state-dot,
        :host([data-layout-style="aerien"]) .mod-bar>i{animation:none!important;transition:none!important}
      }
      /* Commandes optionnelles (Climate/Select de l'intégration). */
      .controls{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-start;
        border-top:1px solid var(--line);padding:14px 2px 2px;margin:0 0 4px}
      .ctl-group{display:flex;flex-direction:column;gap:7px}
      .ctl-label{font-size:10px;letter-spacing:.7px;text-transform:uppercase;
        color:var(--sub);font-weight:800}
      .ctl-mode{margin-left:7px;padding:2px 6px;border-radius:20px;background:var(--soft);color:var(--blue);font-size:9px;letter-spacing:.3px;text-transform:none}
      .ctl-mode.pending{color:var(--amber);animation:pulse-soft 1.2s ease-in-out infinite}
      .ctl-error{font-size:10px;color:var(--red);line-height:1.3;max-width:360px}
      @keyframes pulse-soft{50%{opacity:.45}}
      .ctl-power{display:flex;flex-direction:column;gap:4px;margin-left:auto;padding:7px 11px;
        border:1px solid var(--panel-line);border-radius:10px;background:var(--surface)}
      .ctl-power span{font-size:10px;letter-spacing:.7px;text-transform:uppercase;
        color:var(--sub);font-weight:800}
      .ctl-power strong{font-size:18px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
      .ctl-buttons{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .ctl-btn{font:inherit;font-size:12px;font-weight:650;padding:7px 11px;
        border-radius:9px;border:1px solid var(--panel-line);background:var(--surface);
        color:var(--text);cursor:pointer;line-height:1;
        transition:border-color .15s,background .15s}
      .ctl-btn:hover:not(:disabled){border-color:var(--blue)}
      .ctl-btn.active{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue);
        background:var(--chip-bg)}
      .ctl-btn.heat.active{border-color:var(--red);box-shadow:inset 0 0 0 1px var(--red)}
      .ctl-btn.cool.active{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}
      .ctl-btn:disabled{opacity:.42;cursor:not-allowed}
      .ctl-temp{display:inline-flex;align-items:center;gap:1px;margin-left:4px;
        background:var(--surface);border:1px solid var(--panel-line);border-radius:9px;padding:2px}
      .ctl-temp button{border:0;background:transparent;color:var(--text);font:inherit;
        font-size:16px;font-weight:700;width:28px;height:28px;border-radius:7px;cursor:pointer}
      .ctl-temp button:hover{background:var(--soft)}
      .ctl-temp strong{min-width:58px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums}
      .ctl-sim{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--sub)}
      .ctl-sim label{display:inline-flex;align-items:center;gap:5px;cursor:pointer}
      .ctl-sim input[type=checkbox]{accent-color:var(--blue);cursor:pointer}
      .ctl-sim-hours{display:inline-flex;align-items:center;gap:3px}
      .ctl-sim-hours input{width:44px;padding:3px 4px;border:1px solid var(--panel-line);border-radius:6px;background:var(--soft);color:var(--text);font:inherit;text-align:right}
      .ctl-sim-hours input:disabled{opacity:.55}
      .ctl-sim.active{color:var(--text)}
      .sim-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--green)}
      .sim-live b{font-size:10px;letter-spacing:.5px;text-transform:uppercase}
      .sim-values{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--sub);margin-top:-2px}
      .sim-values strong{color:var(--text);font-size:13px;font-variant-numeric:tabular-nums}
      .sim-values span{white-space:nowrap}
      .editable{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
      .editable:hover{color:var(--blue)}
      .temp-link{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
      .temp-link:hover{color:var(--blue)}
      .hist-svg{width:100%;height:auto;display:block;margin:2px 0}
      .hist-grid{stroke:var(--line);stroke-width:.6;opacity:.7}
      .hist-axis{fill:var(--sub);font-size:9px;font-variant-numeric:tabular-nums}
      .hist-legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;
        font-size:11px;color:var(--sub)}
      .hist-legend b{color:var(--text);font-variant-numeric:tabular-nums}
      .hist-note{color:var(--sub);font-size:12px;text-align:center;padding:14px 6px;line-height:1.4}
      .hist-note.error{color:var(--warn-text)}
      .ctl-modal{position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:16px;
        background:rgba(8,14,20,.45)}
      .ctl-modal-panel{width:min(360px,100%);background:var(--bg);color:var(--text);
        border:1px solid var(--panel-line);border-radius:16px;padding:16px;
        box-shadow:0 18px 50px rgba(0,0,0,.28);display:grid;gap:12px}
      .history-panel{width:min(760px,100%)}
      .history-standard{height:min(55vh,420px);min-height:320px;overflow:hidden}
      .history-standard>*{height:100%}
      .ctl-modal-head{display:flex;justify-content:space-between;align-items:center;
        font-size:13px;font-weight:750;gap:10px}
      .ctl-modal-close{border:0;background:transparent;color:var(--sub);font-size:24px;line-height:1;cursor:pointer}
      .ctl-modal-value{font-size:28px;font-weight:760;text-align:center;font-variant-numeric:tabular-nums}
      .ctl-modal input[type=range]{width:100%;accent-color:var(--blue);cursor:pointer}
      .ctl-modal-actions{display:flex;justify-content:flex-end}
      @media(prefers-reduced-motion:reduce){.ctl-btn{transition:none}}
    </style>
    <ha-card><div class="wrap" style="--flow-duration:${flowDuration}s">
      <!-- Bandeau supprimé ; mode saisonnier présenté dans le module PAC. -->
      <div class="schematic" aria-label="Unité extérieure compresseur, module PAC et trois usages ${html(this._circuitName(1))}, ${html(this._circuitName(2))}, ECS">
        <section class="machine"><div class="mini-head">Unité extérieure / COMP</div>
          <div class="machine-art"><div class="fan-shell ${fanAnimated?'running':''}" style="--fan-duration:${fanDuration}s" aria-hidden="true"><svg class="fan-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="51" stroke="var(--fan-stroke)" stroke-width="2" fill="var(--soft)"/>
            <g class="blades" fill="var(--fan-stroke)" stroke="var(--panel-line)" stroke-width="1.2">
              <ellipse cx="60" cy="35" rx="14" ry="27"/>
              <ellipse cx="60" cy="35" rx="14" ry="27" transform="rotate(90 60 60)"/>
              <ellipse cx="60" cy="35" rx="14" ry="27" transform="rotate(180 60 60)"/>
              <ellipse cx="60" cy="35" rx="14" ry="27" transform="rotate(270 60 60)"/>
            </g><circle cx="60" cy="60" r="11" fill="var(--soft2)" stroke="var(--fan-stroke)" stroke-width="2"/></svg>
            <svg class="fan-svg fan-aerien" viewBox="0 0 180 160" role="presentation" aria-hidden="true">
              <rect class="unit-case" x="24" y="12" width="132" height="133" rx="12"/>
              <circle class="fan-ring" cx="90" cy="77" r="53"/>
              <circle class="fan-inner" cx="90" cy="77" r="48"/>
              <g class="blades" fill="var(--fan-stroke)">
                <path d="M90 77 C77 59 73 36 88 31 C108 27 111 52 90 77Z"/>
                <path d="M90 77 C77 59 73 36 88 31 C108 27 111 52 90 77Z" transform="rotate(90 90 77)"/>
                <path d="M90 77 C77 59 73 36 88 31 C108 27 111 52 90 77Z" transform="rotate(180 90 77)"/>
                <path d="M90 77 C77 59 73 36 88 31 C108 27 111 52 90 77Z" transform="rotate(270 90 77)"/>
              </g>
              <circle class="fan-hub" cx="90" cy="77" r="9"/>
              <path class="unit-feet" d="M37 145V150H55V145 M126 145V150H144V145"/>
            </svg></div></div>
          <div><div class="field-title">Air extérieur</div><div class="big-value">${this._tempLink(this._v('outdoor'),this._ids?.outdoor,'Air extérieur')}</div></div>
          <div class="machine-stat"><div class="field-title">Compresseur</div><div>${chip(compressorText,compressionTone==='active'?'positive':'dim')}</div></div>
          <div class="machine-stat"><div class="field-title">Modulation du compresseur</div><div class="big-value">${html(formatted(gauge,'%'))}</div>
            <div class="mod-bar"><i style="width:${gauge!==null?Math.max(0,Math.min(100,gauge)):0}%"></i></div></div>
          ${defrost===true?`<div>${chip('Dégivrage actif','cool')}</div>`:''}
        </section>
        <div class="inlink" aria-hidden="true"><svg class="linksvg horizontal-link${exchangerRunning?' has-flow '+inlinkTone:''}" style="--flow-color:${inlinkTone==='cool'?'var(--blue)':'var(--red)'}" viewBox="0 0 100 440" preserveAspectRatio="none"><path class="track" d="M0 220 H100"/>
          ${exchangerRunning?`<path class="live ${inlinkTone}" d="M0 220 H100"/>`:''}</svg><svg class="linksvg vertical-link${exchangerRunning?' has-flow '+inlinkTone:''}" style="--flow-color:${inlinkTone==='cool'?'var(--blue)':'var(--red)'}" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="track" d="M50 0 V100"/>${exchangerRunning?`<path class="live ${inlinkTone}" d="M50 0 V100"/>`:''}</svg></div>
        <section class="pac"><div class="mini-head">PAC · Échangeurs</div>
          <div class="pac-head-status">${chip(modeText,mode==='heat'?'heat':mode==='cool'?'cool':'dim')}
          ${chip(clean(this._v('pacState')||'État PAC indisponible',36),compressor===true?'positive':'dim')}</div>
          <div class="pac-art"><div class="exchanger ${exchangerRunning?'running':'standby'}" aria-label="Représentation symbolique des échanges thermiques, animation lorsque le compresseur fonctionne">
            <div class="exch-col ${mode==='cool'?'hot':''}"><svg viewBox="0 0 78 100" aria-hidden="true"><path d="M5 6H64Q74 6 74 16V22Q74 31 64 31H15Q5 31 5 41V46Q5 54 15 54H64Q74 54 74 64V69Q74 77 64 77H15Q5 77 5 88V95"/><path class="exch-flow" d="M5 6H64Q74 6 74 16V22Q74 31 64 31H15Q5 31 5 41V46Q5 54 15 54H64Q74 54 74 64V69Q74 77 64 77H15Q5 77 5 88V95"/></svg><svg class="exch-aerien" viewBox="0 0 78 100" aria-hidden="true">
              <rect class="exch-frame" x="7" y="4" width="64" height="92" rx="10"/>
              <path class="exch-tube" d="M17 20H56Q63 20 63 27Q63 34 56 34H24Q16 34 16 42Q16 49 24 49H55Q63 49 63 57Q63 64 55 64H24Q16 64 16 72Q16 79 24 79H61"/><path class="exch-flow" d="M17 20H56Q63 20 63 27Q63 34 56 34H24Q16 34 16 42Q16 49 24 49H55Q63 49 63 57Q63 64 55 64H24Q16 64 16 72Q16 79 24 79H61"/>
            </svg><span class="exch-caption">Échangeur air<small>(extérieur)</small></span></div>
            <div class="exch-col ${mode==='cool'?'':'hot'}"><svg viewBox="0 0 78 100" aria-hidden="true"><path d="M5 6H64Q74 6 74 16V22Q74 31 64 31H15Q5 31 5 41V46Q5 54 15 54H64Q74 54 74 64V69Q74 77 64 77H15Q5 77 5 88V95"/><path class="exch-flow" d="M5 6H64Q74 6 74 16V22Q74 31 64 31H15Q5 31 5 41V46Q5 54 15 54H64Q74 54 74 64V69Q74 77 64 77H15Q5 77 5 88V95"/></svg><svg class="exch-aerien" viewBox="0 0 78 100" aria-hidden="true">
              <rect class="exch-frame" x="7" y="4" width="64" height="92" rx="10"/>
              <path class="exch-tube" d="M17 20H56Q63 20 63 27Q63 34 56 34H24Q16 34 16 42Q16 49 24 49H55Q63 49 63 57Q63 64 55 64H24Q16 64 16 72Q16 79 24 79H61"/><path class="exch-flow" d="M17 20H56Q63 20 63 27Q63 34 56 34H24Q16 34 16 42Q16 49 24 49H55Q63 49 63 57Q63 64 55 64H24Q16 64 16 72Q16 79 24 79H61"/>
            </svg><span class="exch-caption">Échangeur eau<small>(intérieur)</small></span></div>
          </div></div>
          <div class="pac-metrics">
            <div><span>Départ PAC</span>${this._tempLink(this._v('flow'),this._ids?.flow,'Départ PAC',true)}</div>
            <div><span>Retour PAC</span>${this._tempLink(this._v('returnTemp'),this._ids?.returnTemp,'Retour PAC',true)}</div>
            <div><span>Consigne départ</span>${this._tempLink(this._v('targetFlow'),this._ids?.targetFlow,'Consigne départ',true)}</div>
            <div><span>ΔT départ − retour</span><strong>${html(pacDelta)}</strong></div>
          </div><div class="pac-bottom">Températures communes aux circuits · pas de mesure séparée ${html(this._circuitName(1))} / ${html(this._circuitName(2))}</div>
        </section>
        <div class="outlink" aria-hidden="true"><svg class="linksvg horizontal-link${outlinkActive?' has-flow '+outlinkTone:''}" style="--flow-color:${outlinkTone==='cool'?'var(--blue)':'var(--red)'}" viewBox="0 0 100 440" preserveAspectRatio="none">
          <path class="track" d="M0 220H33V72H100 M33 220H100 M33 220V368H100"/>
          ${c1Flow?`<path class="live ${c1.active?branchTone(c1):outlinkTone}" d="M0 220H33V72H100"/>`:''}
          ${c2Flow?`<path class="live ${c2.active?branchTone(c2):outlinkTone}" d="M0 220H33H100"/>`:''}
          ${ecsFlow?`<path class="live ${ecs.viaPac?'heat':outlinkTone}" d="M0 220H33V368H100"/>`:''}</svg><svg class="linksvg vertical-link${outlinkActive?' has-flow '+outlinkTone:''}" style="--flow-color:${outlinkTone==='cool'?'var(--blue)':'var(--red)'}" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="track" d="M50 0 V100"/>${outlinkActive?`<path class="live ${outlinkTone}" d="M50 0 V100"/>`:''}</svg></div>
        <div class="outs">${circHtml(c1)}${circHtml(c2)}
          <section class="output-card ${ecsTone}" aria-label="Eau chaude sanitaire">
            <div class="out-top"><div class="tank-mini" aria-hidden="true"></div><div class="out-head">
              <div class="out-title">ECS <span>· Ballon</span></div><div class="out-status">${html(ecsText)}</div></div>
              <span class="state-dot ${ecsTone}"></span></div>
            <div class="out-values ecs-values"><div><span>Température ballon</span>${this._tempLink(ecs.tempBallon,this._ids?.ecsTemp,'Température ballon ECS')}</div>
              <div><span>Consigne confort</span><strong class="editable" data-pac-action="edit" data-target="ecs" title="Cliquer pour modifier">${html(temp(ecs.target))}</strong></div>
              <div><span>Consigne actuelle</span><strong>${html(temp(ecs.currentSetpoint))}</strong></div></div>
            ${ecsSessionHtml}
            <div class="out-foot">${chip(ecs.pump===true?'Pompe active':ecs.pump===false?'Pompe arrêtée':'Pompe inconnue',ecs.pump===true?'positive':'dim')}
              ${ecs.ecoSetpoint?chip('Éco '+temp(ecs.ecoSetpoint),'dim'):''}
              ${ecs.withElectric?chip('Appoint électrique actif','warning'):''}</div>
          </section>
        </div>
      </div>
      ${this._config.show_controls!==false?this._controlsHtml(mode,c1,c2,ecs):''}
      <details data-panel="alarms" class="alarm-details" ${prevAlarms?'open':''}>
        <summary><span>Alarmes et surveillance</span>
          ${chip(`${alertActive.length} alarme${alertActive.length!==1?'s':''} active${alertActive.length!==1?'s':''}`,alertActive.length?'warning':'dim')}</summary>
        <div class="alerts ${alarmsClass}">${alertDescription}<div class="alert-meta">${html(alertsMeta)}</div></div>
      </details>
      ${this._config.show_diagnostics!==false?`<details data-panel="diagnostics" ${prevDetails?'open':''}>
        <summary>Diagnostics et capteurs complémentaires · ${statesCount} entités reconnues</summary>
        <p class="details-note">Lecture seule. « — » signifie : entité absente, désactivée, inconnue ou non publiée par BSB-LAN. Les températures de départ cibles des circuits ne sont pas des mesures.</p>
        <div class="diag-grid">${diagComp}${diagPac}${diagCircs}${diagActivity}</div>
      </details>`:''}
      ${this._config.show_graphs!==false?`<details data-panel="graphs" class="alarm-details" ${prevGraphs?'open':''}>
        <summary><span>Consommation énergétique</span></summary>
        <div class="graph-panel">${this._graphsHtml()}</div>
      </details>`:''}
      ${this._config.show_curve!==false?`<details data-panel="curve" class="alarm-details" ${prevCurve?'open':''}>
        <summary><span>Loi d’eau</span></summary>
        <div class="curve-panel">${this._curveHtml()}</div>
      </details>`:''}
      ${this._editor?this._editorHtml():''}
      ${this._history?this._historyHtml():''}
      ${this._historyGroup?this._historyGroupHtml():''}
      ${this._curveHelp?this._curveHelpHtml():''}

    </div></ha-card>`;
    this._updateSimCountdowns();
    if(this._historyGroup) this._mountHistoryGroup();
  }
}
/**
 * Éditeur visuel natif Lovelace. Aucune commande BSB-LAN : cet élément ne
 * manipule que la configuration locale du rendu du synoptique.
 */
class PacSynoptiqueCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.shadowRoot.addEventListener('change', event => {
      if (!this._config) return;
      const element=event.target;
      if (element?.id==='pac-theme-choice') {
        const theme=element.value;
        if (['auto','light','dark'].includes(theme)) this._changed('theme_mode',theme);
      } else if (element?.id==='pac-orientation-choice') {
        if (['auto','landscape','portrait'].includes(element.value)) this._changed('layout_orientation',element.value);
      } else if (element?.id==='pac-layout-choice') {
        this._changed('layout_style',element.value);
      } else if (element?.id==='pac-show-links') {
        this._changed('show_links',Boolean(element.checked));
      } else if (element?.id==='pac-animate-flows') {
        this._changed('animate_flows',Boolean(element.checked));
      } else if (element?.id==='pac-show-pump-badges') {
        this._changed('show_pump_badges',Boolean(element.checked));
      } else if (element?.id==='pac-show-diagnostics') {
        this._changed('show_diagnostics',Boolean(element.checked));
      } else if (element?.id==='pac-show-controls') {
        this._changed('show_controls',Boolean(element.checked));
      } else if (element?.id==='pac-show-simulation') {
        this._changed('show_simulation',Boolean(element.checked));
      } else if (element?.id==='pac-show-graphs') {
        this._changed('show_graphs',Boolean(element.checked));
      } else if (element?.id==='pac-show-curve') {
        this._changed('show_curve',Boolean(element.checked));
      } else if (element?.id==='pac-circuit-1-name') {
        this._changed('circuit_1_name',element.value);
      } else if (element?.id==='pac-circuit-2-name') {
        this._changed('circuit_2_name',element.value);
      } else if (element?.id==='pac-ecs-delta') {
        const value=Number(element.value);
        if(Number.isFinite(value) && value>=0 && value<=15) this._changed('ecs_eco_delta',value);
      }
    });
    this.shadowRoot.addEventListener('value-changed', event => {
      if (!this._config) return;
      const element=event.target;
      if (element?.id==='pac-power-entity-picker') {
        this._changed('power_entity',String(event.detail?.value??'').trim());
      } else if (element?.id==='pac-energy-entity-picker') {
        this._graphs=null;
        this._graphsLast=0;
        this._changed('energy_entity',String(event.detail?.value??'').trim());
      }
    });
  }
  setConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Configuration de carte incorrecte');
    }
    this._config={...config};
    this._render();
  }
  set hass(hass) {
    this._hass=hass;
    for(const id of ['#pac-power-entity-picker','#pac-energy-entity-picker']){
      const picker=this.shadowRoot?.querySelector?.(id);
      if(picker) picker.hass=hass;
    }
  }
  _changed(key,value) {
    // Conserve les paramètres additionnels/associations d'entités et la
    // largeur, même s'ils ne sont pas modifiés dans l'éditeur visuel.
    const config={...this._config,[key]:value};
    this._config=config;
    this.dispatchEvent(new CustomEvent('config-changed',{
      detail:{config},bubbles:true,composed:true
    }));
  }
  _render() {
    const config=this._config||{};
    const theme=['auto','light','dark'].includes(config.theme_mode)?config.theme_mode:'auto';
    const selected=value=>theme===value?' selected':'';
    const checked=config.show_diagnostics!==false?' checked':'';
    const checkedLinks=config.show_links!==false?' checked':'';
    const checkedMotion=config.animate_flows!==false?' checked':'';
    const checkedPumps=config.show_pump_badges!==false?' checked':'';
    const checkedControls=config.show_controls!==false?' checked':'';
    const checkedSimulation=config.show_simulation!==false?' checked':'';
    const checkedGraphs=config.show_graphs!==false?' checked':'';
    const checkedCurve=config.show_curve!==false?' checked':'';
    const circuit1Name=typeof config.circuit_1_name==='string'?config.circuit_1_name:'RDC';
    const circuit2Name=typeof config.circuit_2_name==='string'?config.circuit_2_name:'Étage';
    const ecsDelta=Number.isFinite(Number(config.ecs_eco_delta))?Number(config.ecs_eco_delta):3;
    const powerEntity=typeof config.power_entity==='string'?config.power_entity:'';
    const energyEntity=typeof config.energy_entity==='string'?config.energy_entity:'';
    const selectedLayout=(config.layout_style||'classic');
    const selectedOrientation=['auto','landscape','portrait'].includes(config.layout_orientation)?config.layout_orientation:'auto';
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;color:var(--primary-text-color,#243443);
          font-family:var(--primary-font-family,Roboto,Arial,sans-serif);
          font-size:14px}
        *{box-sizing:border-box}
        .editor{display:grid;gap:20px;padding:16px 0 8px}
        .field{display:grid;gap:9px}
        label{font-size:14px;font-weight:600;line-height:1.35}
        select{display:block;min-height:48px;width:100%;font:inherit;
          color:var(--primary-text-color,#243443);
          background:var(--card-background-color,var(--ha-card-background,#fff));
          border:1px solid var(--divider-color,#8da0b0);border-radius:10px;
          padding:10px 12px;cursor:pointer}
        select:focus-visible,input:focus-visible{outline:2px solid
          var(--primary-color,#03a9f4);outline-offset:3px}
        input[type=text],input[type=number]{display:block;min-height:48px;width:100%;font:inherit;
          color:var(--primary-text-color,#243443);
          background:var(--card-background-color,var(--ha-card-background,#fff));
          border:1px solid var(--divider-color,#8da0b0);border-radius:10px;padding:10px 12px}
        ha-entity-picker{display:block;width:100%}
        .toggle{display:flex;align-items:center;gap:12px;cursor:pointer}
        input[type=checkbox]{width:19px;height:19px;accent-color:var(--primary-color,#03a9f4);
          flex:none;cursor:pointer}
        .hint{color:var(--secondary-text-color,#65788b);line-height:1.45;font-size:12px}
        .notice{border-top:1px solid var(--divider-color,#abb7c0);padding-top:12px}
      </style>
      <div class="editor">
        <div class="field">
          <label for="pac-theme-choice">Apparence du synoptique</label>
          <select id="pac-theme-choice" aria-label="Apparence du synoptique">
            <option value="auto"${selected('auto')}>Automatique (thème Home Assistant)</option>
            <option value="light"${selected('light')}>Clair</option>
            <option value="dark"${selected('dark')}>Sombre</option>
          </select>
          <div class="hint">Automatique suit le thème actuellement utilisé dans Home Assistant.</div>
        </div>
        <div class="field">
          <label for="pac-circuit-1-name">Nom du circuit 1</label>
          <input id="pac-circuit-1-name" type="text" value="${html(circuit1Name)}" placeholder="RDC">
          <label for="pac-circuit-2-name">Nom du circuit 2</label>
          <input id="pac-circuit-2-name" type="text" value="${html(circuit2Name)}" placeholder="Étage">
          <div class="hint">Noms affichés sur le synoptique. Les entités restent C1/C2 ; les commandes utilisent leurs entités Climate.</div>
        </div>
        <div class="field">
          <label for="pac-ecs-delta">Écart consigne ECS éco (°C)</label>
          <input id="pac-ecs-delta" type="number" min="0" max="15" step="0.5" value="${ecsDelta}">
          <div class="hint">Quand tu modifies la consigne ECS, la consigne éco (1612) est écrite à « confort − écart ».</div>
        </div>
        <div class="field">
          <label for="pac-power-entity-picker">Entité de puissance consommée</label>
          <ha-entity-picker id="pac-power-entity-picker" allow-custom-entity></ha-entity-picker>
          <div class="hint">Entité instantanée (W ou kW), affichée avec les commandes. Tape pour rechercher parmi les capteurs.</div>
        </div>
        <div class="field">
          <label for="pac-energy-entity-picker">Entité d’énergie consommée</label>
          <ha-entity-picker id="pac-energy-entity-picker" allow-custom-entity></ha-entity-picker>
          <div class="hint">Compteur d’énergie (kWh) utilisé pour l’historique quotidien sur 10 jours. Vide = détection automatique.</div>
        </div>
        <div class="field">
          <label class="toggle" for="pac-show-controls">
            <input type="checkbox" id="pac-show-controls"${checkedControls}>
            Afficher les commandes (mode PAC, Off/Auto, consigne)
          </label>
          <div class="hint">Les commandes passent par les entités Climate/Select de l'intégration, avec la dérogation native sécurisée.</div>
          <label class="toggle" for="pac-show-simulation">
            <input type="checkbox" id="pac-show-simulation"${checkedSimulation}>
            Afficher la simulation de dérogation
          </label>
          <div class="hint">Case à cocher, durée et température de retour sur chaque circuit.</div>
        </div>
        <div class="field">
          <label class="toggle" for="pac-show-graphs">
            <input type="checkbox" id="pac-show-graphs"${checkedGraphs}>
            Afficher la section Consommation énergétique
          </label>
          <label class="toggle" for="pac-show-curve">
            <input type="checkbox" id="pac-show-curve"${checkedCurve}>
            Afficher la section Loi d’eau
          </label>
          <div class="hint">Désactive les sections dont tu n’as pas besoin pour alléger la carte.</div>
        </div>
        <div class="field">
          <label for="pac-orientation-choice">Orientation de la carte</label>
          <select id="pac-orientation-choice">
            <option value="auto"${selectedOrientation==='auto'?' selected':''}>Automatique — selon la largeur disponible</option>
            <option value="landscape"${selectedOrientation==='landscape'?' selected':''}>Paysage — horizontal</option>
            <option value="portrait"${selectedOrientation==='portrait'?' selected':''}>Portrait — vertical (mobile)</option>
          </select>
          <div class="hint">Le mode Paysage reste horizontal sur mobile, avec défilement si nécessaire.</div>
        </div>
        <div class="field">
          <label for="pac-layout-choice">Présentation des circuits</label>
          <select id="pac-layout-choice">
            <option value="clean"${selectedLayout==='clean'?' selected':''}>Épurée — traits horizontaux discrets, sans liaisons en portrait</option>
            <option value="classic"${selectedLayout==='classic'?' selected':''}>Classique — tuyauterie schématique</option>
            <option value="aerien"${selectedLayout==='aerien'?' selected':''}>Aérien — dessin simplifié et cartes légères</option>
          </select>
          <div class="hint">Aérien : ventilateur de face et échangeurs assortis, raccordements fins. Classique et Épurée restent disponibles. Les liaisons ne sont pas un schéma hydraulique certifié.</div>
        </div>
        <div class="field">
          <label class="toggle" for="pac-show-links">
            <input type="checkbox" id="pac-show-links"${checkedLinks}>
            Afficher les raccordements en disposition horizontale
          </label>
          <label class="toggle" for="pac-animate-flows">
            <input type="checkbox" id="pac-animate-flows"${checkedMotion}>
            Animer les activités (ventilateur, échangeurs et traits)
          </label>
          <label class="toggle" for="pac-show-pump-badges">
            <input type="checkbox" id="pac-show-pump-badges"${checkedPumps}>
            Afficher l'état des circulateurs sous les circuits
          </label>
        </div>
        <div class="field">
          <label class="toggle" for="pac-show-diagnostics">
            <input type="checkbox" id="pac-show-diagnostics"${checked}>
            Afficher les diagnostics complémentaires
          </label>
          <div class="hint">Les alarmes et leur compteur restent toujours visibles et repliables.</div>
        </div>
        <div class="hint notice">Les commandes sont optionnelles et utilisent les entités Climate de l'intégration.
          La largeur se règle dans l'onglet Disposition du tableau de bord.</div>
      </div>`;
    const powerPicker=this.shadowRoot.querySelector('#pac-power-entity-picker');
    if(powerPicker){
      powerPicker.hass=this._hass;
      powerPicker.value=powerEntity;
      powerPicker.includeDomains=['sensor'];
      powerPicker.entityFilter=state=>state?.attributes?.device_class==='power'||['W','kW'].includes(state?.attributes?.unit_of_measurement);
    }
    const energyPicker=this.shadowRoot.querySelector('#pac-energy-entity-picker');
    if(energyPicker){
      energyPicker.hass=this._hass;
      energyPicker.value=energyEntity;
      energyPicker.includeDomains=['sensor'];
      energyPicker.entityFilter=state=>state?.attributes?.device_class==='energy'||['Wh','kWh','MWh'].includes(state?.attributes?.unit_of_measurement);
    }
  }
}
if(!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG,PacSynoptiqueCardEditor);

if(!customElements.get(TAG)) customElements.define(TAG,PacSynoptiqueCard);
// (moteur interne des onglets : non liste dans le selecteur de cartes)
})();
/* pac-synoptique-photo-card — synoptique photo Alfea Duo (calques lumineux + flux animés)
 * Généré par build_card.py — ne pas éditer FLOWS à la main (relancer build_flows.py + build_card.py)
 */
const VERSION = "2.4.0";
const FLOWS = {"width": 2048, "height": 1152, "flows": {"frigo_gaz": {"layer": "frigo", "color": "#c06bff", "d": "M560,822 L727,822 M850,779 L870,779 L870,525 L888,522"}, "frigo_liquide": {"layer": "frigo", "color": "#3ff2ff", "d": "M882,805 L847,805 M728,855 L560,855"}, "c1_depart": {"layer": "c1", "color": "#ff5a2a", "d": "M950,286 L950,270 L1579,270 L1579,613 L1604,613"}, "c1_retour": {"layer": "c1", "color": "#3aa0ff", "d": "M1604,716 L1564,716 L1564,289 L1061,289"}, "c2_depart": {"layer": "c2", "color": "#ff5a2a", "d": "M1062,306 L1331,306 L1331,659 L1440,659 M1387,659 L1387,809 M1433,659 L1433,809"}, "c2_retour": {"layer": "c2", "color": "#3aa0ff", "d": "M1374,809 L1374,706 M1419,809 L1419,706 L1313,706 L1313,324 L1070,324"}}, "pulses": {}, "anchors": {"ext_temp": [370, 625], "pac_depart": [1210, 248], "pac_retour": [1210, 345], "ecs_ballon": [966, 560], "c1_ambiance": [1735, 560], "c2_ambiance": [1700, 840], "compresseur": [305, 905]}};
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
  install_cfg: ["sensor", "_installation_configuration"],
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
  // entités extérieures choisies dans l'intégration (capteur « Installation - Configuration »)
  const ia = (r.install_cfg && hass?.states?.[r.install_cfg]?.attributes) || {};
  const fromIntegration = [r.ecs_cop, r.ecs_energie].map((id) => hass?.states?.[id]?.attributes?.energy_entity).find(Boolean) || ia.entite_energie;
  if (config.energy_entity) r.energy = config.energy_entity;
  else if (!custom.energy && fromIntegration) r.energy = fromIntegration;
  // puissance : entité de la carte, sinon celle des options de l'intégration (aucune déduction)
  if (config.power_entity) r.power = config.power_entity;
  else if (!custom.power && ia.entite_puissance) r.power = ia.entite_puissance;
  r.weather = config.weather_entity || ia.entite_meteo || "";
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
  ecs_heater: ["ECS · Ballon", ["ecs_temp", "ecs_confort", "ecs_heater", "ecs_pump", "ecs_appoint", "ecs_etat", "ecs_energie"]],
};
const HIST_HOURS = [6, 24, 48, 168];
// variantes d'installation : rustines posées sur le fond, par décor (x, y, largeur, hauteur en pixels image)
const PATCHES = { sans_radiateur: [930, 254, 962, 525], sans_plancher: [1051, 292, 997, 860], sans_ecs: [844, 504, 234, 380] };
// sans ECS : tuyaux frigo redessinés, montant côte à côte jusqu'au module
const FLOWS_SANS_ECS = {
  frigo_gaz: "M560,822 L727,822 M846,781 L891,781 L891,526",
  frigo_liquide: "M915,526 L915,803 L847,803 M728,855 L560,855",
};
const EMITTER_LABEL = { radiateur: "radiateurs", plancher: "plancher chauffant", aucun: "aucun" };
// configurations dessinables (une zone radiateurs, une zone plancher) : [émetteurs C1, émetteurs C2, libellé]
const EMITTER_COMBOS = {
  c1_radiateur_c2_plancher: ["radiateur", "plancher", "C1 radiateurs + C2 plancher chauffant"],
  c1_plancher_c2_radiateur: ["plancher", "radiateur", "C1 plancher chauffant + C2 radiateurs"],
  c1_radiateur: ["radiateur", "aucun", "C1 radiateurs seul"],
  c1_plancher: ["plancher", "aucun", "C1 plancher chauffant seul"],
  c2_radiateur: ["aucun", "radiateur", "C2 radiateurs seul"],
  c2_plancher: ["aucun", "plancher", "C2 plancher chauffant seul"],
};
function comboOf(e1, e2) {
  const k = Object.keys(EMITTER_COMBOS).find((x) => EMITTER_COMBOS[x][0] === e1 && EMITTER_COMBOS[x][1] === e2);
  return k || null;
}
// configuration effective : réglage de la carte, sinon détection de l'intégration (« Installation -
// Configuration »), sinon présence des entités. Une zone du dessin (radiateur, plancher) suit le
// circuit qui a ce type d'émetteur ; deux circuits du même type : répartition par défaut (C1, C2).
function layoutFor(c, hass, e) {
  const st = (k) => (e && e[k] && hass && hass.states && hass.states[e[k]]) || null;
  const a = (st("install_cfg") || {}).attributes || {};
  const known = !!(hass && hass.states);
  const det = {
    ecs: a.ecs_presente === true || a.ecs_presente === false ? a.ecs_presente : !known || ["ecs_heater", "ecs_temp", "ecs_pump", "ecs_appoint", "ecs_etat"].some(st),
    c1: a.circuit_1_present === false ? "aucun" : a.circuit_1_emetteur || (!known || st("c1_climate") ? "radiateur" : "aucun"),
    c2: a.circuit_2_present === false ? "aucun" : a.circuit_2_emetteur || (!known || st("c2_climate") ? "plancher" : "aucun"),
    source: st("install_cfg") && a.lu_le ? "intégration" : "entités",
  };
  const ecs = c.ecs === "oui" ? true : c.ecs === "non" ? false : det.ecs;
  const forced = EMITTER_COMBOS[c.emitters];
  const e1 = forced ? forced[0] : det.c1, e2 = forced ? forced[1] : det.c2;
  let rad = e1 === "radiateur" ? "c1" : e2 === "radiateur" ? "c2" : null;
  let floor = e2 === "plancher" ? "c2" : e1 === "plancher" ? "c1" : null;
  // configuration non dessinable (deux circuits du même type, aucun circuit) : répartition par défaut
  const same = !comboOf(e1, e2);
  if (same) { rad = "c1"; floor = "c2"; }
  return { ecs, rad, floor, e1, e2, det, same, combo: comboOf(e1, e2) };
}
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
  weather_entity: "", show_weather: true, weather_sync: true, weather_anim: true, logo_url: "", logo: NO_LOGO, outdoor_unit: "simple", ecs: "auto", emitters: "auto", panel_click: "history", history_hours: "24",
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
  { type: "expandable", name: "", flatten: true, title: "Installation", icon: "mdi:home-thermometer-outline", schema: [] },
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
      { name: "panel_click", selector: { select: { mode: "dropdown", options: [{ value: "history", label: "Historique des entités du panneau" }, { value: "more-info", label: "Fiche de l'entité principale" }] } } },
      { name: "history_hours", selector: { select: { mode: "dropdown", options: HIST_HOURS.map((h) => ({ value: String(h), label: h < 48 ? `${h} h` : `${h / 24} jours` })) } } },
      { name: "image_path", selector: { text: {} } },
      { name: "positions", selector: { object: {} } }] },
];
const LABELS = {
  device: "Appareil PAC (Atlantic Alfea BSB-LAN)",
  power_entity: "Puissance électrique PAC (W ; vide = celle des options de l'intégration)",
  energy_entity: "Énergie électrique PAC (kWh ; vide = compteur des options de l'intégration)",
  title: "Titre", subtitle: "Sous-titre", circuit_1_name: "Nom du circuit 1 (vide = nom défini dans l'intégration)", circuit_2_name: "Nom du circuit 2 (vide = nom défini dans l'intégration)",
  outdoor_unit: "Groupe extérieur",
  ecs: "Eau chaude sanitaire (ballon)", emitters: "Émetteurs des circuits",
  logo: "Logo affiché",
  logo_url: "URL de l'image (ex. /local/pac_logos/mon_logo.svg ; un fond blanc disparaît)",
  logos: "Logos proposés dans le menu",
  image_set: "Jeu d'images", debug: "Boutons de test (debug)", image_path: "Chemin des images",
  show_alarms: "Alarmes et surveillance", show_diagnostics: "Diagnostics et capteurs", show_graphs: "Consommation énergétique",
  show_curve: "Loi d'eau", show_controls: "Commandes (mode, consignes)",
  panel_click: "Clic sur un panneau", history_hours: "Durée de l'historique",
  weather_entity: "Entité météo (vide = celle des options de l'intégration)", show_weather: "Afficher la météo dans le paysage",
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
    // installation : « Automatique » affiche ce que l'intégration (ou les entités) a détecté
    const L = layoutFor({}, this._hass, resolveEntities(this._hass, this._config));
    const src = L.det.source === "intégration" ? "intégration" : "déduit des entités";
    const detCombo = comboOf(L.det.c1, L.det.c2);
    const detLabel = detCombo ? EMITTER_COMBOS[detCombo][2]
      : `C1 ${EMITTER_LABEL[L.det.c1]}, C2 ${EMITTER_LABEL[L.det.c2]} — non dessinable, choisissez la configuration la plus proche`;
    const instSection = [
      { name: "ecs", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: `Automatique (${src} : ${L.det.ecs ? "avec ballon" : "sans ballon"})` },
        { value: "oui", label: "Avec ballon" }, { value: "non", label: "Sans ballon" }] } } },
      { name: "emitters", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: `Automatique (${src} : ${detLabel})` },
        ...Object.entries(EMITTER_COMBOS).map(([value, v]) => ({ value, label: v[2] }))] } } },
    ];
    this._form.schema = EDITOR_SCHEMA.map((s) => s.title === "Logo du groupe extérieur" ? { ...s, schema: logoSection }
      : s.title === "Installation" ? { ...s, schema: instSection } : s);
    this._form.data = { ...DEFAULTS, ...this._config, logo, history_hours: String(this._config.history_hours || DEFAULTS.history_hours),
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
    this._L = layoutFor(this._config, this._hass, this._e);
    this._built = false;
    if (this._hass) { this._build(); this._update(); }
  }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: "full", rows: "auto" }; }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    // entités extérieures de l'intégration (météo, puissance, énergie) : re-résolues si elles changent
    const ia = (this._e?.install_cfg && hass.states[this._e.install_cfg]?.attributes) || {};
    const iaSig = [ia.entite_meteo, ia.entite_puissance, ia.entite_energie].join("|");
    if (first || this._entReg !== hass.entities || iaSig !== this._iaSig) {
      this._entReg = hass.entities; this._iaSig = iaSig; this._e = resolveEntities(hass, this._config);
    }
    this._L = layoutFor(this._config, hass, this._e);
    if (this._built && this._sig() !== this._namesSig) this._built = false;  // un nom ou la configuration a changé
    if (!this._built) this._build();
    this._update();
  }

  // signature de ce qui impose de reconstruire la carte (noms des circuits, configuration dessinée)
  _sig() { return this._cname(1) + "|" + this._cname(2) + "|" + [this._L?.ecs, this._L?.rad, this._L?.floor].join(","); }
  // énergie du jour : variation du compteur depuis minuit (statistiques de HA), suivie en direct
  // entre deux relectures (10 min) ; total du compteur en infobulle ; sans statistiques : total
  _energyToday() {
    const el = this._root.getElementById("x_en"), k = this._root.getElementById("x_enk");
    const s = this._s("energy"), unit = s?.attributes?.unit_of_measurement || "kWh", cur = parseFloat(s?.state);
    if (!el) return;
    const fmt = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`;
    el.title = isNaN(cur) ? "" : `Compteur total : ${fmt(cur)}`;
    const day = new Date().toDateString(), st = this._enDay;
    const fresh = st && st.id === this._e.energy && st.day === day;
    if (fresh && isFinite(st.change) && isFinite(st.ref) && !isNaN(cur)) {
      k.textContent = "Énergie du jour";
      el.textContent = fmt(Math.max(0, st.change + (cur - st.ref)));
    } else {
      k.textContent = "Énergie"; el.textContent = isNaN(cur) ? "—" : fmt(cur);   // statistiques indisponibles : total
    }
    const due = !fresh || Date.now() - st.at > 600000;
    if (!due || this._enBusy || !this._e.energy || isNaN(cur) || !this._hass?.callWS) return;
    this._enBusy = true;
    const id = this._e.energy;
    this._hass.callWS({ type: "recorder/statistic_during_period", statistic_id: id, calendar: { period: "day" }, types: ["change"] })
      .then((r) => {
        if (r && typeof r.change === "number") {
          this._enDay = { id, day, change: r.change, ref: parseFloat(this._s("energy")?.state), at: Date.now() };
          this._energyToday();
        }
      })
      .catch(() => { this._enDay = { id, day, change: NaN, ref: NaN, at: Date.now() }; })
      .finally(() => { this._enBusy = false; });
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
    const c = this._config, wid = this._e?.weather, s = wid && this._hass && this._hass.states[wid];
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
    let file = dbl && name === "calque_ventilateur" ? "calque_ventilateur_double" : name;
    if (name === "calque_frigo" && this._L && !this._L.ecs) file = "calque_frigo_sans_ecs";
    return `${this._config.image_path}${dir}/${file}.webp?v=${VERSION}`;
  }
  _fans() { return this._config.outdoor_unit === "double" ? FANS_DOUBLE : [FAN]; }
  // rustines de l'installation (intérieur : même image en groupe simple ou double)
  _patch(name, variant) {
    const set = this._imgSet(), dir = variant ? `${set}_${variant}` : set;
    return `${this._config.image_path}${dir}/patch_${name}.webp?v=${VERSION}`;
  }
  _patchOn(name) {
    const L = this._L || {};
    return name === "sans_radiateur" ? !L.rad : name === "sans_plancher" ? !L.floor : name === "sans_ecs" ? L.ecs === false : false;
  }
  // fond + calques selon jour/nuit et météo, sans reconstruire la carte
  _applyImages(wx) {
    const sig = this._imgSet() + "|" + (wx.variant || "");
    if (sig === this._imgSig) return;
    this._imgSig = sig;
    const r = this._root, base = this._img("base", wx.variant);
    const bi = r.getElementById("baseImg"); if (bi) bi.src = base;
    const hz = r.getElementById("hazeImg"); if (hz) hz.setAttribute("href", base);
    r.querySelectorAll("img.layer").forEach((el) => { el.src = this._img("calque_" + el.dataset.layer); });
    r.querySelectorAll("img.patch").forEach((el) => { el.src = this._patch(el.dataset.patch, wx.variant); });
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
    const L = this._L || layoutFor(c, this._hass, this._e), cn = (z) => (z === "c2" ? 2 : 1);
    this._namesSig = this._sig();
    this._imgSig = this._fxSig = null;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const flows = Object.entries(FLOWS.flows).map(([k, f]) =>
      `<path class="flow" data-layer="${f.layer}" data-flow="${k}" d="${(this._L && !this._L.ecs && FLOWS_SANS_ECS[k]) || f.d}" style="--c:${f.color}"/>`).join("");
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
  .pic img.patch { inset:auto; }
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
    ${Object.entries(PATCHES).filter(([n]) => this._patchOn(n)).map(([n, [px, py, pw, ph]]) =>
      `<img class="patch" data-patch="${n}" alt="" src="${this._patch(n, wx0.variant)}" style="left:${(px / FLOWS.width * 100).toFixed(3)}%;top:${(py / FLOWS.height * 100).toFixed(3)}%;width:${(pw / FLOWS.width * 100).toFixed(3)}%;height:${(ph / FLOWS.height * 100).toFixed(3)}%">`).join("")}
    ${LAYERS.map((l) => `<img class="layer ${l}" data-layer="${l}" src="${this._img("calque_" + l)}" alt="">`).join("")}
    <svg class="fx" viewBox="0 0 ${FLOWS.width} ${FLOWS.height}" preserveAspectRatio="none">${fan}${heat}${flows}</svg>
    ${logoFor(c) ? (() => { const lg = logoFor(c), [lx, ly, lw] = lg.box;  // image HTML : haut calé, hauteur selon le format du logo
      return `<img class="logo" alt="" src="${String(lg.url).replace(/"/g, "&quot;")}" style="left:${(lx / FLOWS.width * 100).toFixed(3)}%;top:${(ly / FLOWS.height * 100).toFixed(3)}%;width:${(lw / FLOWS.width * 100).toFixed(3)}%">`; })() : ""}
    ${L.ecs ? `<svg class="fx tankfx" viewBox="0 0 ${FLOWS.width} ${FLOWS.height}" preserveAspectRatio="none">${tank}</svg>` : ""}
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
      <div class="row"><span class="k" id="x_enk">Énergie du jour</span><span class="v" id="x_en"></span></div>
      <div class="chips" id="x_chips"></div></div>
    <div class="card" id="k_c1" data-more="${L.rad || "c1"}_climate" style="--x:${P_.c1[0]}%;--y:${P_.c1[1]}%;--w:${P_.c1[2]}%;--accent:#ff5a2a${L.rad ? "" : ";display:none"}">
      <h3><i></i>Circuit ${cn(L.rad)} · <span>${this._cname(cn(L.rad))}</span></h3>
      <div class="pair"><div><small>Ambiance</small><b id="c1_t"></b></div><div><small>Consigne</small><b id="c1_c"></b></div></div>
      <div class="row" id="c1_fr"><span class="k" id="c1_fk">Départ circuit</span><span class="v h" id="c1_f"></span></div>
      <div class="chips" id="c1_chips"></div></div>
    <div class="card" id="k_c2" data-more="${L.floor || "c2"}_climate" style="--x:${P_.c2[0]}%;--y:${P_.c2[1]}%;--w:${P_.c2[2]}%;--accent:#ff5a2a${L.floor ? "" : ";display:none"}">
      <h3><i></i>Circuit ${cn(L.floor || "c2")} · <span>${this._cname(cn(L.floor || "c2"))}</span></h3>
      <div class="pair"><div><small>Ambiance</small><b id="c2_t"></b></div><div><small>Consigne</small><b id="c2_c"></b></div></div>
      <div class="row" id="c2_fr"><span class="k" id="c2_fk">Départ circuit</span><span class="v h" id="c2_f"></span></div>
      <div class="chips" id="c2_chips"></div></div>
    <div class="card" id="k_ecs" data-more="ecs_heater" style="--x:${P_.ecs[0]}%;--y:${P_.ecs[1]}%;--w:${P_.ecs[2]}%;--accent:#ffb347${L.ecs ? "" : ";display:none"}">
      <h3><i></i>ECS · Ballon</h3>
      <div class="big" id="e_t"></div>
      <div class="row"><span class="k">Confort</span><span class="v" id="e_conf"></span></div>
      <div class="row"><span class="k">Actuelle</span><span class="v" id="e_cur"></span></div>
      <div class="row"><span class="k" id="e_enk">Dernière charge</span><span class="v" id="e_en"></span></div>
      <div class="row"><span class="k" id="e_copk">COP</span><span class="v" id="e_cop"></span></div>
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
      const id = this._e?.weather; if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })); });
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
    // zones du dessin : le radiateur suit le circuit « radiateurs », le plancher le circuit « plancher »
    const L = this._L;
    const act = { c1: c1Active || c1Overrun, c2: this._on("c2_pump") }, heat = { c1: c1Active, c2: this._on("c2_pump") };
    st.c1 = L.rad ? act[L.rad] : false; st.c1_radiateur = L.rad ? heat[L.rad] : false;
    st.c2 = L.floor ? act[L.floor] : false;
    for (const k of LAYERS) if (f[k]) st[k] = true;
    if (f.c1) st.c1_radiateur = true;
    // éléments absents de l'installation : jamais allumés (même forcés en debug)
    if (!L.rad) st.c1 = st.c1_radiateur = false;
    if (!L.floor) st.c2 = false;
    if (!L.ecs) st.ecs_serpentin = st.ecs_resistance = false;
    if (L.e2 === "aucun") st.pompe_c2 = false;
    st.ecs_eau = st.ecs_serpentin || st.ecs_resistance;  // l'eau chauffe par le serpentin (PAC) ou par l'appoint
    const tB = parseFloat(this._v("ecs_temp"));
    r.querySelector(".water")?.style.setProperty("--wheat", isNaN(tB) ? ".85" : Math.max(0.45, Math.min(1, (tB - 20) / 35)).toFixed(2));
    r.querySelectorAll("[data-layer]").forEach((el) => el.classList.toggle("on", !!st[el.dataset.layer]));
    let tDep = parseFloat(this._v(`${L.rad || "c1"}_flow`)); if (isNaN(tDep)) tDep = parseFloat(this._v("depart"));
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
    this._energyToday();
    for (const [z, n] of [["c1", L.rad], ["c2", L.floor]]) {   // z : panneau (zone du dessin), n : circuit
      if (!n) continue;
      $(`${z}_t`).textContent = this._attr(`${n}_climate`, "current_temperature");
      $(`${z}_c`).textContent = this._attr(`${n}_climate`, "temperature");
      const fl = parseFloat(this._v(`${n}_flow`));
      // C1 = circuit direct sans sonde propre : sans valeur 8743, son départ est celui de la PAC
      const direct = n === "c1" && isNaN(fl) && !isNaN(parseFloat(this._v("depart")));
      $(`${z}_fr`).style.display = isNaN(fl) && !direct ? "none" : "";
      $(`${z}_f`).textContent = direct ? this._num("depart") : this._num(`${n}_flow`);
      $(`${z}_fk`).textContent = direct ? "Départ (= départ PAC)" : "Départ circuit";
      const cl = this._v(`${n}_climate`);
      const pumpRaw = this._on(`${n}_pump`), pumpActive = n === "c1" ? c1Active : pumpRaw;
      const pumpChip = pumpRaw && !ecsMode && overrun(n) && !(n === "c1" && c1Active)
        ? `<span class="chip on" title="Compresseur arrêté : la pompe tourne encore quelques minutes pour évacuer la chaleur">Post-circulation</span>`
        : pumpActive ? `<span class="chip on">Circulateur en marche</span>`
        : pumpRaw ? `<span class="chip" title="Pompe primaire active mais circuit ${ecsMode ? "court-circuité par la charge ECS" : "à l'arrêt"}">Pompe primaire${ecsMode ? " (charge ECS)" : ""}</span>`
        : `<span class="chip">Circulateur arrêté</span>`;
      $(`${z}_chips`).innerHTML = `<span class="chip ${cl === "heat" ? "hot" : ""}">${cl === "heat" ? "Chauffe" : cl === "off" ? "OFF" : (cl || "—")}</span>` +
        `<span class="chip">${this._v(`${n}_etat`) || "—"}</span>` +
        (n === "c1" ? "" : pumpChip);  // C1 : la pompe primaire (QX1) est affichée dans le panneau PAC, l'état du circuit suffit ici
    }
    $("e_t").textContent = this._num("ecs_temp");
    $("e_conf").textContent = this._num("ecs_confort");
    $("e_cur").textContent = this._attr("ecs_heater", "temperature");
    // charge ECS : énergie de la charge en cours (COP connu à la fin), sinon COP et énergie de la dernière charge.
    // (« ECS - Énergie consommée » est un cumul de toutes les charges : il reste dans l'historique du panneau)
    const ca = this._s("ecs_cop")?.attributes || {}, fr = (v, d) => (+v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
    const last = Array.isArray(ca.sessions) && ca.sessions.length ? ca.sessions[ca.sessions.length - 1] : null;
    const lastCop = last && isFinite(parseFloat(last.cop)) ? +last.cop : parseFloat(this._v("ecs_cop"));
    const running = ca.session_active && isFinite(parseFloat(ca.conso_session_kwh));
    $("e_enk").textContent = running ? "Charge en cours" : "Dernière charge";
    $("e_en").textContent = running ? `${fr(ca.conso_session_kwh, 2)} kWh` : last && isFinite(parseFloat(last.e_elec_kwh)) ? `${fr(last.e_elec_kwh, 2)} kWh` : "—";
    $("e_copk").textContent = running ? "COP charge préc." : "COP";
    $("e_cop").textContent = isFinite(lastCop) ? fr(lastCop, 2) : "—";
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
