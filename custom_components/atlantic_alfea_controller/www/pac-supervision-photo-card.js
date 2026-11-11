/**
 * PAC Supervision Photo — carte de supervision photoréaliste.
 *
 * Carte indépendante : le fond est un rendu photoréaliste, les panneaux et
 * animations sont des overlays HTML/CSS pilotés par Home Assistant.
 */
(() => {
  'use strict';
  const TAG = 'pac-supervision-photo-card';
  if (customElements.get(TAG)) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const num = value => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (value, digits = 1, unit = '') => value === null
    ? '—' : `${value.toFixed(digits).replace('.', ',')}${unit ? ` ${unit}` : ''}`;
  const isOn = state => state?.state === 'on' || state?.state === 'heat' || state?.state === 'cool';

  class PacSupervisionPhotoCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this._config = {};
      this._hass = null;
      this._signatureCache = '';
    }

    static getStubConfig() {
      return {title:'Supervision PAC', background_image:'/alfea-synoptique/supervision-bg.png'};
    }

    setConfig(config) {
      this._config = config || {};
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      const signature = this._signature();
      if (signature === this._signatureCache) return;
      this._signatureCache = signature;
      this._render();
    }

    getCardSize() { return 8; }

    _find(domain, fragments) {
      const states = Object.values(this._hass?.states || {});
      for (const fragment of fragments) {
        const exact = states.find(state =>
          state.entity_id?.startsWith(`${domain}.`) && state.entity_id.endsWith(`_${fragment}`)
        );
        if (exact) return exact;
        const found = states.find(state =>
          state.entity_id?.startsWith(`${domain}.`) && state.entity_id.includes(fragment)
        );
        if (found) return found;
      }
      return null;
    }

    _model() {
      const cfg = this._config?.entities || {};
      const get = (key, domain, fragments) => cfg[key]
        ? this._hass?.states?.[cfg[key]] : this._find(domain, fragments);
      const compressor = get('compressor','binary_sensor',['comp_etat']);
      const modulation = get('modulation','sensor',['comp_modulation','_8413_']);
      const outdoor = get('outdoor','sensor',['pac_t_exterieure']);
      const flow = get('flow','sensor',['pac_t_depart']);
      const flowTarget = get('flow_target','sensor',['pac_t_depart_cible']);
      const returnTemp = get('return','sensor',['pac_t_retour']);
      const c1 = get('c1','climate',['_c1_circuit_1']);
      const c2 = get('c2','climate',['_c2_circuit_2']);
      const pump1 = get('pump1','binary_sensor',['c1_circulateur']);
      const pump2 = get('pump2','binary_sensor',['c2_circulateur']);
      const ecsTemp = get('ecs_temp','sensor',['ecs_t_ballon']);
      const ecsProduction = get('ecs_production','sensor',['ecs_production']);
      const ecsPump = get('ecs_pump','binary_sensor',['ecs_pompe']);
      const ecsElectric = get('ecs_electric','binary_sensor',['ecs_appoint_electrique']);
      const ecsSession = get('ecs_session','sensor',['ecs_cop_session']);
      const ecsComfort = get('ecs_comfort','sensor',['ecs_t_confort']);
      const ecsEco = get('ecs_eco','sensor',['ecs_t_eco']);
      const defrost = get('defrost','binary_sensor',['pac_degivrage_di6']);
      const globalMode = get('global_mode','select',['mode_global']);
      const pacState = get('pac_state','sensor',['pac_etat']);
      const power = get('power','sensor',['phase_a_diff_pac_power']);
      const ecsSetpoint = get('ecs_setpoint','number',['_ecs_consigne_confort_1610','_1610']);
      const compressorOn = isOn(compressor);
      const modulationValue = Math.max(0, Math.min(100, num(modulation?.state) ?? 0));
      const flowValue = num(flow?.state);
      const returnValue = num(returnTemp?.state);
      const c1Active = isOn(pump1) || c1?.attributes?.hvac_action === 'heating' || c1?.attributes?.hvac_action === 'cooling';
      const c2Active = isOn(pump2) || c2?.attributes?.hvac_action === 'heating' || c2?.attributes?.hvac_action === 'cooling';
      const c1Off = c1?.state === 'off';
      const c2Off = c2?.state === 'off';
      const c1Post = /post.?circulation/i.test(String(c1?.attributes?.etat_circuit_bsb || ''));
      const c2Post = /post.?circulation/i.test(String(c2?.attributes?.etat_circuit_bsb || ''));
      const c1Demand = !c1Off && (isOn(pump1) || c1?.attributes?.hvac_action === 'heating' || c1?.attributes?.hvac_action === 'cooling');
      const c2Demand = !c2Off && (isOn(pump2) || c2?.attributes?.hvac_action === 'heating' || c2?.attributes?.hvac_action === 'cooling');
      const ecsText = String(ecsProduction?.state || '');
      const ecsActive = isOn(ecsPump) || (/chauffe|charge|pac|appoint/i.test(ecsText) && !/inactive|attente|arrêt/i.test(ecsText));
      const modeText = String(globalMode?.state || (c1?.state === 'cool' || c2?.state === 'cool' ? 'Refroidissement' : 'Chauffage'));
      const cooling = /refroid|froid|cool/i.test(modeText);
      return {compressor,compressorOn,modulation:modulationValue,outdoor,flow,flowTarget,returnTemp,
        flowValue,returnValue,delta:flowValue!==null&&returnValue!==null?flowValue-returnValue:null,
        flowTargetValue:num(flowTarget?.state),
        c1,c2,pump1,pump2,c1Active,c2Active,c1Off,c2Off,c1Post,c2Post,c1Demand,c2Demand,ecsTemp,ecsSetpoint,ecsText,ecsActive,ecsSession,ecsComfort,ecsEco,
        ecsElectric:isOn(ecsElectric),defrost:isOn(defrost),pacState,power,modeText,cooling};
    }

    _signature() {
      const m = this._model();
      return [m.compressor?.state,m.modulation,m.outdoor?.state,m.flow?.state,m.flowTarget?.state,m.returnTemp?.state,
        m.c1?.state,m.c1?.attributes?.current_temperature,m.c1?.attributes?.temperature,m.c1?.attributes?.hvac_action,
        m.c2?.state,m.c2?.attributes?.current_temperature,m.c2?.attributes?.temperature,m.c2?.attributes?.hvac_action,
        m.pump1?.state,m.pump2?.state,m.ecsTemp?.state,m.ecsProduction?.state,m.ecsPump?.state,
        m.ecsSession?.state,m.ecsSession?.attributes?.cop,m.ecsSession?.attributes?.duree_session_min,
        m.ecsSession?.attributes?.t_depart_reel,m.ecsSession?.attributes?.t_fin,
        m.ecsSession?.attributes?.fin_session,m.ecsSession?.attributes?.conso_session_kwh,
        m.ecsComfort?.state,m.ecsEco?.state,
        m.ecsElectric?.state,m.defrost?.state,m.pacState?.state,m.power?.state,m.modeText].join('|');
    }

    _temp(value, fallback = null) {
      const n = num(value);
      return n === null ? fallback : n;
    }

    _render() {
      if (!this.shadowRoot || !this._hass) return;
      const m = this._model();
      const images = this._config.background_images || {};
      const fullyStopped = !m.compressorOn && !m.ecsActive && !m.c1Demand && !m.c2Demand && !m.defrost;
      const allZonesActive = m.c1Demand && m.c2Demand && m.ecsActive;
      const variant = allZonesActive ? (m.cooling ? 'cooling' : 'heating') : 'stopped';
      const configured = images[variant]
        || (variant === 'cooling' ? images.stopped : null)
        || images.active
        || this._config.background_image
        || '/alfea-synoptique/supervision-bg.png';
      const bg = configured.replace(/"/g,'%22');
      const fanDuration = m.compressorOn ? Math.max(0.7, Math.min(6.5, 100 / Math.max(16,m.modulation))) : 0;
      const c1Temp = this._temp(m.c1?.attributes?.current_temperature);
      const c1Target = this._temp(m.c1?.attributes?.temperature);
      const c2Temp = this._temp(m.c2?.attributes?.current_temperature);
      const c2Target = this._temp(m.c2?.attributes?.temperature);
      const ecsTemp = this._temp(m.ecsTemp?.state);
      const ecsTarget = this._temp(m.ecsSetpoint?.state);
      const power = this._temp(m.power?.state);
      const cycle = m.ecsSession?.attributes || {};
      const ecsComfort = this._temp(m.ecsComfort?.state, this._temp(cycle.t_fin));
      const ecsCurrent = this._temp(m.ecsSetpoint?.state, ecsComfort);
      const ecsEco = this._temp(m.ecsEco?.state);
      const cycleCop = num(cycle.cop ?? m.ecsSession?.state);
      const cycleDuration = num(cycle.duree_session_min);
      const cycleStart = this._temp(cycle.t_depart_reel);
      const cycleEnd = this._temp(cycle.t_fin);
      const cycleEnergy = num(cycle.conso_session_kwh);
      const cycleTime = cycle.fin_session ? new Date(cycle.fin_session).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : '—';
      const cycleEnergyText = cycleEnergy === null ? '—' : new Intl.NumberFormat('fr-FR', {minimumFractionDigits:3,maximumFractionDigits:3}).format(cycleEnergy);
      const c1Status = String(m.c1?.attributes?.etat_circuit_bsb || '').replace(/^\d+\s*-\s*/, '');
      const c2Status = String(m.c2?.attributes?.etat_circuit_bsb || '').replace(/^\d+\s*-\s*/, '');
      const activityOf = (circuit, status, pump) => {
        if (/post.?circulation/i.test(status)) return {label:'Post-circulation', tone:'standby'};
        if (!circuit) return {label:'Indisponible', tone:'off'};
        if (circuit.state === 'off') return {label:'Arrêt', tone:'off'};
        if (circuit.attributes?.hvac_action === 'heating') return {label:'Chauffe actuellement', tone:'run'};
        if (circuit.attributes?.hvac_action === 'cooling') return {label:'Refroidit actuellement', tone:'run'};
        if (isOn(pump) && circuit.state === 'heat') return {label:'Chauffe actuellement', tone:'run'};
        if (isOn(pump) && circuit.state === 'cool') return {label:'Refroidit actuellement', tone:'run'};
        return {label:'En attente', tone:'standby'};
      };
      const c1Activity = activityOf(m.c1, c1Status, m.pump1);
      const c2Activity = activityOf(m.c2, c2Status, m.pump2);
      const c1Mode = m.c1?.state === 'off' ? 'OFF' : String(m.c1?.attributes?.preset_mode || 'AUTO').toUpperCase();
      const c2Mode = m.c2?.state === 'off' ? 'OFF' : String(m.c2?.attributes?.preset_mode || 'AUTO').toUpperCase();
      const c1Pump = m.c1Post ? 'Post-circulation'
        : m.c1Off ? 'Circulateur arrêté'
        : `Circulateur ${m.pump1?.state === 'on' ? 'actif' : 'arrêté'}`;
      const c2Pump = m.c2Post ? 'Post-circulation'
        : m.c2Off ? 'Circulateur arrêté'
        : `Circulateur ${m.pump2?.state === 'on' ? 'actif' : 'arrêté'}`;
      const modeTone = m.cooling ? 'cool' : 'heat';
      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <ha-card>
          <div class="scene ${modeTone} ${m.compressorOn?'running':''}" style="background-image:url('${bg}')">
            <div class="shade"></div>
            ${m.compressorOn?`<div class="fan-motion" style="--fan-duration:${fanDuration}s"></div>`:''}
            ${m.ecsActive?`<div class="tank-glow ${m.ecsElectric?'electric':''}"></div>`:''}
            ${m.c1Demand?`<div class="zone-glow c1 ${m.cooling?'cold':''}"></div>`:''}
            ${m.c2Demand?`<div class="zone-glow c2 ${m.cooling?'cold':''}"></div>`:''}
            ${m.compressorOn?`<div class="zone-glow outdoor ${m.cooling?'cold':''}"></div>`:''}
            <div class="ecs-resistance ${m.ecsElectric?'on':''}" title="Résistance électrique ECS"></div>
            <div class="panels">
              <section class="panel outdoor" data-more-info="${esc(m.outdoor?.entity_id || '')}">
                <div class="panel-head"><span>Unité extérieure</span><span class="dot ${m.compressorOn?'on':''}"></span></div>
                <div class="outdoor-grid">
                  <div class="outdoor-temp">
                    <div class="value">${fmt(num(m.outdoor?.state),1,'°C')}</div>
                    <div class="caption">Température air</div>
                  </div>
                  <div class="outdoor-meta">
                    <div class="row"><span>Ventilateur</span><b>${m.modulation.toFixed(0)} %</b></div>
                    <div class="bar"><i style="width:${Math.max(3,m.modulation)}%"></i></div>
                    <div class="chips"><span class="chip ${m.compressorOn?'active':'idle'}">${m.compressorOn?'Compresseur actif':'Compresseur arrêté'}</span>${m.defrost?'<span class="chip warn">Dégivrage</span>':''}</div>
                    <div class="status-line">${esc(m.pacState?.state || 'État unité extérieure indisponible')}</div>
                  </div>
                </div>
              </section>

              <section class="panel hydraulic">
                <div class="panel-head"><span>Unité intérieure</span><span class="dot ${m.c1Active||m.c2Active?'on':''}"></span></div>
                <div class="hydro-grid">
                  <div><div class="value small">${fmt(m.flowValue,1,'°C')}</div><div class="caption">Départ PAC</div></div>
                  <div><div class="value small">${fmt(m.returnValue,1,'°C')}</div><div class="caption">Retour PAC</div></div>
                  <div><div class="value small">${fmt(m.flowTargetValue,1,'°C')}</div><div class="caption">Consigne départ</div></div>
                  <div><div class="value small">${fmt(m.delta,1,'K')}</div><div class="caption">ΔT</div></div>
                </div>
                <div class="status-line">${esc(m.pacState?.state || 'État indisponible')}</div>
              </section>

              <section class="panel circuit-card c1" data-more-info="${esc(m.c1?.entity_id || '')}">
                <div class="panel-head"><span>Circuit 1 · Étage</span><span class="dot ${m.c1Demand?'on':''}"></span></div>
                <div class="circuit-sub">Radiateurs · <b class="${c1Activity.tone}">${esc(c1Activity.label)}</b></div>
                <div class="circuit-labels"><span>Température ambiante</span><span>Consigne chauffage</span></div>
                <div class="circuit-values"><strong>${fmt(c1Temp,1,'°C')}</strong><em>${fmt(c1Target,1,'°C')}</em></div>
                <div class="chips circuit-chips"><span class="chip">${esc(c1Mode)}</span>${c1Status&&!(m.c1Post&&/post/i.test(c1Status))?`<span class="chip">${esc(c1Status)}</span>`:''}<span class="chip">Eff. ${fmt(m.c1?.attributes?.temperature,1,'°C')}</span><span class="chip">${esc(c1Pump)}</span></div>
              </section>

              <section class="panel circuit-card c2" data-more-info="${esc(m.c2?.entity_id || '')}">
                <div class="panel-head"><span>Circuit 2 · RDC</span><span class="dot ${m.c2Demand?'on':''}"></span></div>
                <div class="circuit-sub">Plancher chauffant · <b class="${c2Activity.tone}">${esc(c2Activity.label)}</b></div>
                <div class="circuit-labels"><span>Température ambiante</span><span>Consigne chauffage</span></div>
                <div class="circuit-values"><strong>${fmt(c2Temp,1,'°C')}</strong><em>${fmt(c2Target,1,'°C')}</em></div>
                <div class="chips circuit-chips"><span class="chip">${esc(c2Mode)}</span>${c2Status&&!(m.c2Post&&/post/i.test(c2Status))?`<span class="chip">${esc(c2Status)}</span>`:''}<span class="chip">Eff. ${fmt(m.c2?.attributes?.temperature,1,'°C')}</span><span class="chip">${esc(c2Pump)}</span></div>
              </section>

              <section class="panel performance">
                <div class="panel-head"><span>Performances</span><span class="dot ${m.compressorOn?'on':''}"></span></div>
                <div class="split">
                  <div><div class="value small">${power===null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(power)+' W'}</div><div class="caption">Puissance PAC</div></div>
                  <div><div class="value small">${m.modulation.toFixed(0)} %</div><div class="caption">Modulation</div></div>
                </div>
                <div class="row"><span>Mode</span><b>${esc(m.modeText)}</b></div>
              </section>

              <section class="panel ecs" data-more-info="${esc(m.ecsTemp?.entity_id || '')}">
                <div class="panel-head"><span>Ballon ECS</span><span class="dot ${m.ecsActive?'on':''}"></span></div>
                <div class="ecs-top">
                  <div><div class="value">${fmt(ecsTemp,1,'°C')}</div><div class="caption">Température ballon</div></div>
                  <div><div class="value small">${fmt(ecsComfort,1,'°C')}</div><div class="caption">Consigne confort</div></div>
                  <div><div class="value small">${fmt(ecsCurrent,1,'°C')}</div><div class="caption">Consigne actuelle</div></div>
                </div>
                <div class="ecs-cycle">
                  <div class="cycle-head"><span>Dernier cycle</span><time>${cycleTime}</time></div>
                  <div class="cycle-metrics">
                    <span><small>COP</small><b>${fmt(cycleCop,2)}</b></span>
                    <span><small>Durée</small><b>${cycleDuration===null?'—':`${cycleDuration} min`}</b></span>
                    <span><small>Temp.</small><b>${fmt(cycleStart,1,'°C')} → ${fmt(cycleEnd,1,'°C')}</b></span>
                    <span><small>Énergie</small><b>${cycleEnergyText} kWh</b></span>
                  </div>
                </div>
                <div class="chips ecs-chips"><span class="chip">${m.ecsPump?.state==='on'?'Pompe active':'Pompe arrêtée'}</span><span class="chip ${m.ecsElectric?'warn':'idle'}">Résistance ${m.ecsElectric?'active':'arrêtée'}</span><span class="chip">${esc(m.ecsText || 'Inactive')}</span>${ecsEco!==null?`<span class="chip">Éco ${fmt(ecsEco,1,'°C')}</span>`:''}</div>
              </section>

              <section class="panel state">
                <div class="panel-head"><span>État général</span><span class="dot ${m.compressorOn?'on':''}"></span></div>
                <div class="row"><span>Mode</span><b>${esc(m.modeText)}</b></div>
                <div class="row"><span>Dégivrage</span><b>${m.defrost?'Actif':'Non actif'}</b></div>
                <div class="row"><span>Compresseur</span><b>${m.compressorOn?'En marche':'À l’arrêt'}</b></div>
                <div class="status-line">${esc(m.pacState?.state || '')}</div>
              </section>
            </div>
            <div class="legend"><span><i class="hot"></i>Chaud</span><span><i class="cold"></i>Froid</span><span><i class="live"></i>Actif</span></div>
          </div>
        </ha-card>`;
      this.shadowRoot.querySelectorAll('[data-more-info]').forEach(el => {
        el.addEventListener('click', () => {
          if (!el.dataset.moreInfo) return;
          this.dispatchEvent(new CustomEvent('hass-more-info', {
            detail:{entityId:el.dataset.moreInfo},bubbles:true,composed:true
          }));
        });
      });
    }

    _styles() {
      return `
        :host{display:block;--text:#f2f8fb;--sub:#a6bbc9;--glass:rgba(9,18,25,.78);--line:rgba(173,218,238,.18);--hot:#ff9368;--cold:#67d6ff;--green:#55dfb1;--amber:#ffc66f}
        ha-card{background:#071018;border-radius:18px;overflow:hidden;border:1px solid #263d4c;color:var(--text);font-family:var(--primary-font-family,Roboto,Arial,sans-serif)}
        .scene{position:relative;width:100%;aspect-ratio:1672/941;background-size:cover;background-position:center;overflow:hidden;isolation:isolate}
        .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,8,12,.36),transparent 28%,transparent 70%,rgba(2,8,12,.48));pointer-events:none}
        .panels{position:absolute;inset:0;z-index:3}
        .panel{position:absolute;width:23%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(160deg,rgba(12,26,35,.86),rgba(7,15,21,.8));box-shadow:0 18px 45px #0008,inset 0 1px 0 #ffffff14;backdrop-filter:blur(18px) saturate(1.1);-webkit-backdrop-filter:blur(18px) saturate(1.1);cursor:pointer;overflow:hidden}
        .panel:before{content:'';position:absolute;inset:0;background:linear-gradient(130deg,#c8f2ff0e,transparent 38%,transparent 70%,#ffb28408);pointer-events:none}
        .panel.outdoor{left:2.2%;top:3%}.panel.hydraulic{left:38.5%;top:3%}.panel.circuit-card{right:2.2%;width:20%;padding:10px 12px;background:linear-gradient(160deg,rgba(12,26,35,.62),rgba(7,15,21,.56));backdrop-filter:blur(14px) saturate(1.08);-webkit-backdrop-filter:blur(14px) saturate(1.08)}.panel.c1{top:3%}.panel.c2{top:54%}
        .panel.performance{left:2.2%;bottom:3%}.panel.ecs{left:36%;width:28%;bottom:3%}.panel.state{right:2.2%;bottom:3%}
        .panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#b9d3e0}
        .dot{width:7px;height:7px;border-radius:50%;background:#3b5362;box-shadow:0 0 0 3px #ffffff08}
        .dot.on{background:var(--green);box-shadow:0 0 10px var(--green),0 0 0 3px #55dfb122}
        .value{font-size:clamp(24px,2.5vw,38px);line-height:1.05;font-weight:750;letter-spacing:-1.2px;font-variant-numeric:tabular-nums;margin-top:9px;text-shadow:0 2px 12px #0008}
        .outdoor-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;margin-top:8px}
        .outdoor-temp .value{margin-top:0}
        .outdoor-meta{min-width:0}
        .outdoor-meta .row{margin-top:0}
        .outdoor-meta .bar{margin-top:6px}
        .outdoor-meta .chips{margin-top:6px;flex-wrap:wrap}
        .outdoor-meta .status-line{margin-top:5px;white-space:normal;line-height:1.35}
        .value.small{font-size:clamp(18px,1.8vw,27px);letter-spacing:-.7px;margin-top:4px}
        .caption{font-size:10px;color:var(--sub);margin-top:2px}
        .row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:10px;color:var(--sub);margin-top:8px}
        .row b{color:var(--text);font-size:11px}
        .pill{margin-left:auto;border:1px solid #385367;border-radius:99px;padding:3px 6px;font-size:8px;color:#b7cfdd;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chips{display:flex;gap:5px;margin-top:9px}
        .chip{border:1px solid #3b5565;border-radius:99px;padding:3px 7px;font-size:8px;color:#b9d2df}
        .chip.active{border-color:#3c8068;color:#9af0cb;background:#10231e}
        .chip.idle{opacity:.55}
        .chip.warn{border-color:#8a5b37;color:#ffd1a2;background:#2a1b12}
        .split{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .hydro-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;margin-top:8px}
        .hydro-grid .value.small{margin-top:0}
        .circuit-sub{font-size:9px;color:var(--sub);margin-top:1px}
        .circuit-sub b{font-weight:700}
        .circuit-sub b.run{color:#7ff0c8}
        .circuit-sub b.standby{color:#ffc66f}
        .circuit-sub b.off{color:#8fa3b2}
        .circuit-labels{display:flex;justify-content:space-between;gap:8px;font-size:8px;color:var(--sub);margin-top:7px}
        .circuit-values{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:1px}
        .circuit-values strong{font-size:18px;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
        .circuit-values em{font-size:12px;color:var(--sub);font-style:normal;white-space:nowrap}
        .circuit-chips{margin-top:7px;gap:4px}
        .circuit-chips .chip{font-size:7px;padding:2px 5px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ecs-top{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:8px;margin-top:8px}
        .ecs-top .value{font-size:26px;margin-top:0}
        .ecs-top .value.small{font-size:18px;margin-top:4px}
        .ecs-top .caption{font-size:8px}
        .ecs-cycle{margin-top:8px;padding-top:7px;border-top:1px solid #ffffff14}
        .cycle-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:8px;color:var(--sub);text-transform:uppercase;letter-spacing:.8px}
        .cycle-head time{font-variant-numeric:tabular-nums;color:#c8dde9}
        .cycle-metrics{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:4px;font-size:8px;color:var(--sub)}
        .cycle-metrics span{white-space:nowrap}
        .cycle-metrics small{font-size:7px;margin-right:3px;text-transform:uppercase;letter-spacing:.4px}
        .cycle-metrics b{font-size:9px;color:var(--text);font-variant-numeric:tabular-nums}
        .ecs-chips{margin-top:6px;gap:4px}
        .ecs-chips .chip{font-size:7px;padding:2px 5px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bar{height:4px;border-radius:4px;background:#1d303b;margin-top:9px;overflow:hidden}
        .bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#4fc9ee,#9ce8ff);transition:width .6s ease}
        .bar.hot i{background:linear-gradient(90deg,#e65d3f,#ffb184)}
        .circuit{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;margin-top:8px;padding-top:7px;border-top:1px solid #ffffff0d}
        .circuit b{font-size:11px;display:block}.circuit small{font-size:8px;color:var(--sub);display:block}
        .circuit strong{font-size:15px;font-variant-numeric:tabular-nums}.circuit em{font-size:9px;color:var(--sub);font-style:normal;min-width:36px;text-align:right}
        .status-line{font-size:8px;color:#8faabc;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status-line .ok{color:var(--green)}
        .legend{display:none}
        .legend span{display:inline-flex;align-items:center;gap:4px}.legend i{width:11px;height:2px;border-radius:2px}.legend .hot{background:var(--hot)}.legend .cold{background:var(--cold)}.legend .live{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}
        .fan-motion{position:absolute;left:9.2%;top:37%;width:17%;aspect-ratio:1;border-radius:50%;z-index:2;pointer-events:none;background:conic-gradient(from 0deg,#bdefff00,#bdefff22,#bdefff00,#bdefff1a,#bdefff00);filter:blur(8px);mix-blend-mode:screen;animation:fanSpin var(--fan-duration) linear infinite;mask-image:radial-gradient(circle,#000 0 38%,transparent 70%)}
        .tank-glow{position:absolute;left:63.5%;top:20%;width:17%;height:56%;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,#ff7a3f55,transparent 68%);filter:blur(17px);animation:tankPulse 2.6s ease-in-out infinite}
        .tank-glow.electric{background:radial-gradient(ellipse at 50% 55%,#ffd45c66,transparent 68%)}
        .zone-glow{position:absolute;z-index:2;pointer-events:none;filter:blur(20px);opacity:.82;animation:zonePulse 2.8s ease-in-out infinite}
        .zone-glow.c1{left:78%;top:23%;width:17%;height:25%;background:radial-gradient(ellipse at 50% 50%,#ff7b3f99,transparent 70%)}
        .zone-glow.c2{left:56%;top:73%;width:35%;height:20%;background:radial-gradient(ellipse at 50% 50%,#ff7b3f99,transparent 72%)}
        .zone-glow.outdoor{left:6%;top:29%;width:21%;height:34%;background:radial-gradient(ellipse at 50% 50%,#ff8c4c66,transparent 72%);opacity:.55}
        .zone-glow.cold{background:radial-gradient(ellipse at 50% 50%,#53c8ff99,transparent 70%)}
        .zone-glow.outdoor.cold{background:radial-gradient(ellipse at 50% 50%,#53c8ff66,transparent 72%)}
        @keyframes zonePulse{0%,100%{opacity:.45}50%{opacity:.8}}
        .ecs-resistance{position:absolute;left:68.3%;top:24%;width:1.15%;height:38%;z-index:2;pointer-events:none;border-radius:3px;background:linear-gradient(90deg,#667781,#e7f1f4 45%,#8fa1aa 55%,#53646e);box-shadow:0 0 0 1px #ffffff33,0 3px 10px #0007;opacity:.82;transition:box-shadow .35s,background .35s}
        .ecs-resistance:before{content:'';position:absolute;left:-45%;top:-3%;width:190%;height:5%;border-radius:3px;background:linear-gradient(90deg,#4c5c65,#c8d7dd,#4c5c65);box-shadow:0 1px 3px #0008}
        .ecs-resistance:after{content:'';position:absolute;left:50%;top:7%;width:36%;height:86%;transform:translateX(-50%);border-radius:2px;background:linear-gradient(180deg,#f4fafb,#7f919a 55%,#d9e5e9);opacity:.75}
        .ecs-resistance.on{background:linear-gradient(90deg,#71321f,#ffb05f 45%,#ff6b3d 55%,#7e3320);box-shadow:0 0 0 1px #ffd0a766,0 0 15px #ff6b3daa,0 0 32px #ff6b3d55;opacity:1}
        .ecs-resistance.on:after{background:linear-gradient(180deg,#fff1d6,#ff8b52 48%,#ffd26e);opacity:1}
        @keyframes fanSpin{to{transform:rotate(360deg)}}
        @keyframes tankPulse{0%,100%{opacity:.45}50%{opacity:.9}}
        @media(max-width:1050px){
          .scene{aspect-ratio:1672/941}
          .panel{width:27%;padding:10px}.panel.hydraulic{left:36.5%}.panel.ecs{left:33%;width:32%}
          .panel.state{display:none}
        }
        @media(max-width:720px){
          .scene{aspect-ratio:auto;min-height:900px;background-size:cover;background-position:center top}
          .panels{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:10px;inset:auto;width:100%;box-sizing:border-box}
          .panel{position:relative;width:auto;min-width:0;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;padding:9px 10px;overflow:hidden}
          .panel.circuit-card{width:auto}
          .panel.ecs{width:auto}
          .panel.hydraulic,.panel.circuit-card,.panel.state,.panel.performance,.panel.ecs{grid-column:auto;display:block}
          .value{font-size:27px}.value.small{font-size:21px}
          .legend{display:none}.fan-motion,.tank-glow{opacity:.5}
        }
      `;
    }
  }

  customElements.define(TAG, PacSupervisionPhotoCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some(card => card.type === TAG)) {
    window.customCards.push({
      type:TAG,name:'Supervision Photo — Atlantic Alféa',
      description:'Supervision photoréaliste avec panneaux live et animations.',
      preview:false
    });
  }
})();
