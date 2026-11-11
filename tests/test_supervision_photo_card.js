// Smoke test de la carte photo : valeurs, circuits et dernier cycle ECS.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

class FakeElement {
  constructor() {
    this.dataset = {};
    this.shadowRoot = {
      innerHTML: '',
      querySelectorAll: () => []
    };
  }
  attachShadow() { return this.shadowRoot; }
  dispatchEvent() { return true; }
}
global.HTMLElement = FakeElement;
global.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
global.window = {customCards: []};
const registry = new Map();
global.customElements = {
  get: name => registry.get(name),
  define: (name, klass) => registry.set(name, klass)
};

const source = fs.readFileSync(path.join(__dirname, '..', 'custom_components', 'atlantic_alfea_controller', 'www', 'pac-supervision-photo-card.js'), 'utf8');
eval(source);

const Card = registry.get('pac-supervision-photo-card');
assert(Card, 'pac-supervision-photo-card must be registered');

const states = {
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_comp_etat': {state:'on',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_comp_modulation': {state:'16',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_exterieure': {state:'14.4',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_depart': {state:'43.0',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_depart_cible': {state:'42.6',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_t_retour': {state:'40.8',attributes:{}},
  'climate.chaufferie_atlantic_alfea_bsb_lan_c1_circuit_1': {state:'off',attributes:{hvac_action:'off',current_temperature:20.7,temperature:null,etat_circuit_bsb:'122 - Room temperature limitation'}},
  'climate.chaufferie_atlantic_alfea_bsb_lan_c2_circuit_2': {state:'heat',attributes:{hvac_action:'idle',current_temperature:21.8,temperature:20.5,etat_circuit_bsb:'114 - Heating mode Comfort',preset_mode:'Auto'}},
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_c1_circulateur': {state:'off',attributes:{source:'QX1'}},
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_c2_circulateur': {state:'on',attributes:{source:'Pompe CC2'}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_t_ballon': {state:'49.9',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_production': {state:'Inactive',attributes:{}},
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_pompe': {state:'off',attributes:{}},
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_appoint_electrique': {state:'off',attributes:{}},
  'binary_sensor.chaufferie_atlantic_alfea_bsb_lan_pac_degivrage_di6': {state:'off',attributes:{}},
  'select.chaufferie_atlantic_alfea_bsb_lan_mode_global': {state:'Chauffage',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_pac_etat': {state:'Released, compressor ready',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_t_confort': {state:'51.0',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_t_eco': {state:'48.0',attributes:{}},
  'number.atlantic_alfea_bsb_lan_ecs_consigne_confort_1610': {state:'51.0',attributes:{}},
  'sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_cop_session': {state:'1.49',attributes:{
    cop:1.49, duree_session_min:24, t_depart_reel:44.0, t_fin:51.0,
    conso_session_kwh:1.035, fin_session:'2026-11-11T09:51:58+00:00'
  }},
  'sensor.phase_a_diff_pac_power': {state:'2125',attributes:{}}
};
Object.entries(states).forEach(([id, state]) => { state.entity_id = id; });

const card = new Card();
card.setConfig({background_image:'/alfea-synoptique/supervision-bg.png'});
card.hass = {states};
const rendered = card.shadowRoot.innerHTML;

for (const text of [
  'Unité extérieure', 'Unité intérieure', 'Circuit 1 · Étage', 'Circuit 2 · RDC',
  'Température ambiante', 'Consigne chauffage', 'Room temperature limitation',
  'Chauffe actuellement', 'Circulateur arrêté', 'Dernier cycle',
  'COP', '24 min', '44,0', '51,0', '1,035 kWh', 'Éco 48,0 °C'
]) {
  assert(rendered.includes(text), `missing "${text}"`);
}
assert(rendered.includes('supervision-bg.png'), 'background image configured');
assert(rendered.includes('Consigne confort'), 'ECS comfort setpoint missing');
assert(rendered.includes('Consigne actuelle'), 'ECS current setpoint missing');
assert(rendered.includes('ecs-resistance'), 'independent ECS electric resistance missing');
assert(rendered.includes('Résistance arrêtée'), 'ECS resistance state missing');

const stoppedStates = JSON.parse(JSON.stringify(states));
stoppedStates['binary_sensor.chaufferie_atlantic_alfea_bsb_lan_comp_etat'].state = 'off';
stoppedStates['climate.chaufferie_atlantic_alfea_bsb_lan_c1_circuit_1'].state = 'off';
stoppedStates['climate.chaufferie_atlantic_alfea_bsb_lan_c2_circuit_2'].state = 'off';
stoppedStates['binary_sensor.chaufferie_atlantic_alfea_bsb_lan_c2_circulateur'].state = 'off';
stoppedStates['sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_production'].state = 'Inactive';
const stopped = new Card();
stopped.setConfig({background_images:{stopped:'/alfea-synoptique/supervision-bg-stopped.png', heating:'/alfea-synoptique/supervision-bg.png'}});
stopped.hass = {states: stoppedStates};
assert(stopped.shadowRoot.innerHTML.includes('supervision-bg-stopped.png'), 'stopped state must use neutral background');
console.log('PASS: supervision photo card smoke');
