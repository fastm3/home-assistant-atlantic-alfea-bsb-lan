// Smoke test minimal de la carte de supervision 2.5D.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

class FakeElement {
  constructor() {
    this.shadowRoot = {
      innerHTML: '',
      querySelectorAll: () => []
    };
  }
  attachShadow() { return this.shadowRoot; }
  dispatchEvent() {}
}
global.HTMLElement = FakeElement;
global.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
global.window = {customCards: []};
const registry = new Map();
global.customElements = {
  get: name => registry.get(name),
  define: (name, klass) => registry.set(name, klass)
};

const source = fs.readFileSync(path.join(__dirname, '..', 'custom_components', 'atlantic_alfea_controller', 'www', 'pac-supervision-card.js'), 'utf8');
eval(source);

const Card = registry.get('pac-supervision-card');
assert(Card, 'pac-supervision-card must be registered');
const states = {
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_comp_etat': {state:'on',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_comp_modulation': {state:'16',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_exterieure': {state:'14.4',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_depart': {state:'43.0',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_depart_cible': {state:'42.6',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_retour': {state:'40.8',attributes:{}},
    'climate.chaufferie_atlantic_alfea_bsb_lan_c1_circuit_1': {state:'heat',attributes:{hvac_action:'heating',current_temperature:20.9,temperature:22}},
    'climate.chaufferie_atlantic_alfea_bsb_lan_c2_circuit_2': {state:'heat',attributes:{hvac_action:'idle',current_temperature:21.0,temperature:20.5}},
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_c1_circulateur': {state:'on',attributes:{}},
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_c2_circulateur': {state:'off',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_t_ballon': {state:'48.8',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_production': {state:'Inactive',attributes:{}},
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_pompe': {state:'off',attributes:{}},
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_appoint_electrique': {state:'off',attributes:{}},
    'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_pac_degivrage_di6': {state:'off',attributes:{}},
    'select.chaufferie_atlantic_alfea_bsb_lan_mode_global': {state:'Chauffage',attributes:{}},
    'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_etat': {state:'Compressor running time min active',attributes:{}}
};
Object.entries(states).forEach(([id, state]) => { state.entity_id = id; });
const card = new Card();
card.setConfig({});
card.hass = {states};
assert(card.shadowRoot.innerHTML.includes('Atlantic Alféa Duo'), 'scene title rendered');
assert(card.shadowRoot.innerHTML.includes('UNITÉ EXTÉRIEURE'), 'outdoor unit rendered');
assert(card.shadowRoot.innerHTML.includes('MODULE HYDRAULIQUE'), 'hydraulic module rendered');
assert(card.shadowRoot.innerHTML.includes('RDC'), 'RDC circuit rendered');
assert(card.shadowRoot.innerHTML.includes('Étage'), 'Étage circuit rendered');
console.log('PASS: supervision card smoke');
