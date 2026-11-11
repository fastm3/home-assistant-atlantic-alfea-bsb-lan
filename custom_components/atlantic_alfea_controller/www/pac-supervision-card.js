/**
 * PAC Supervision 2.5D — prototype de supervision photoréaliste.
 *
 * Carte indépendante : elle ne remplace pas pac-synoptique-card.
 * Toutes les animations sont pilotées par les entités réelles Home Assistant.
 */
(() => {
  'use strict';
  const TAG = 'pac-supervision-card';
  if (customElements.get(TAG)) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const num = value => {
    const n = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (value, digits = 1, unit = '') => value === null
    ? '—' : `${Number(value).toFixed(digits).replace('.', ',')}${unit ? ` ${unit}` : ''}`;
  const stateOf = (hass, id) => id ? hass?.states?.[id] : null;
  const isOn = state => state?.state === 'on' || state?.state === 'heat' || state?.state === 'cool';
  const includesAny = (text, values) => values.some(value => text.includes(value));

  class PacSupervisionCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this._config = {};
      this._hass = null;
      this._signatureCache = '';
    }

    static getStubConfig() {
      return {title:'Supervision PAC', compact:false};
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

    getCardSize() { return 10; }

    _find(domain, fragments) {
      const states = Object.values(this._hass?.states || {});
      for (const fragment of fragments) {
        const exact = states.find(state =>
          state.entity_id.startsWith(`${domain}.`) && state.entity_id.endsWith(`_${fragment}`)
        );
        if (exact) return exact;
        const found = states.find(state =>
          state.entity_id.startsWith(`${domain}.`) && state.entity_id.includes(fragment)
        );
        if (found) return found;
      }
      return null;
    }

    _entities() {
      const cfg = this._config?.entities || {};
      const get = (key, domain, fragments) =>
        cfg[key] ? stateOf(this._hass, cfg[key]) : this._find(domain, fragments);
      const compressor = get('compressor','binary_sensor',['comp_etat']);
      const modulation = get('modulation','sensor',['comp_modulation','_8413_']);
      const outdoor = get('outdoor','sensor',['pac_t_exterieure']);
      const flow = get('flow','sensor',['pac_t_depart']);
      const returnTemp = get('return','sensor',['pac_t_retour']);
      const c1 = get('c1','climate',['_c1_circuit_1']);
      const c2 = get('c2','climate',['_c2_circuit_2']);
      const pump1 = get('pump1','binary_sensor',['c1_circulateur']);
      const pump2 = get('pump2','binary_sensor',['c2_circulateur']);
      const ecsTemp = get('ecs_temp','sensor',['ecs_t_ballon']);
      const ecsProduction = get('ecs_production','sensor',['ecs_production']);
      const ecsPump = get('ecs_pump','binary_sensor',['ecs_pompe']);
      const ecsElectric = get('ecs_electric','binary_sensor',['ecs_appoint_electrique']);
      const defrost = get('defrost','binary_sensor',['pac_degivrage_di6','defrost']);
      const globalMode = get('global_mode','select',['mode_global']);
      const pacState = get('pac_state','sensor',['pac_etat']);
      return {compressor,modulation,outdoor,flow,returnTemp,c1,c2,pump1,pump2,
        ecsTemp,ecsProduction,ecsPump,ecsElectric,defrost,globalMode,pacState};
    }

    _signature() {
      const e = this._entities();
      return [e.compressor?.state,e.modulation?.state,e.outdoor?.state,e.flow?.state,e.returnTemp?.state,
        e.c1?.state,e.c1?.attributes?.hvac_action,e.c1?.attributes?.current_temperature,e.c1?.attributes?.temperature,
        e.c2?.state,e.c2?.attributes?.hvac_action,e.c2?.attributes?.current_temperature,e.c2?.attributes?.temperature,
        e.pump1?.state,e.pump2?.state,e.ecsTemp?.state,e.ecsProduction?.state,e.ecsPump?.state,
        e.ecsElectric?.state,e.defrost?.state,e.globalMode?.state,e.pacState?.state].join('|');
    }

    _model() {
      const e = this._entities();
      const compressorOn = isOn(e.compressor);
      const modulation = Math.max(0, Math.min(100, num(e.modulation?.state) ?? 0));
      const outdoor = num(e.outdoor?.state);
      const flow = num(e.flow?.state);
      const returnTemp = num(e.returnTemp?.state);
      const delta = flow !== null && returnTemp !== null ? flow - returnTemp : null;
      const defrost = isOn(e.defrost);
      const modeText = String(e.globalMode?.state || (e.c1?.state === 'cool' || e.c2?.state === 'cool' ? 'Refroidissement' : 'Chauffage'));
      const cooling = /refroid|froid|cool/i.test(modeText);
      const c1Active = isOn(e.pump1) || e.c1?.attributes?.hvac_action === 'heating' || e.c1?.attributes?.hvac_action === 'cooling';
      const c2Active = isOn(e.pump2) || e.c2?.attributes?.hvac_action === 'heating' || e.c2?.attributes?.hvac_action === 'cooling';
      const ecsText = String(e.ecsProduction?.state || '');
      const ecsActive = isOn(e.ecsPump) || /chauffe|charge|pac|appoint/i.test(ecsText) && !/inactive|attente|arrêt/i.test(ecsText);
      const ecsTemp = num(e.ecsTemp?.state);
      const ecsPct = ecsTemp === null ? 0 : Math.max(6, Math.min(100, (ecsTemp - 25) / 40 * 100));
      return {e,compressorOn,modulation,outdoor,flow,returnTemp,delta,defrost,modeText,cooling,
        c1Active,c2Active,ecsActive,ecsTemp,ecsPct,ecsElectric:isOn(e.ecsElectric),ecsText};
    }

    _render() {
      if (!this.shadowRoot || !this._hass) return;
      const m = this._model();
      const fanSpeed = m.compressorOn ? Math.max(0.55, Math.min(7, 100 / Math.max(16, m.modulation))) : 0;
      const tone = m.cooling ? 'cool' : 'heat';
      const activeCount = [m.c1Active,m.c2Active,m.ecsActive].filter(Boolean).length;
      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <ha-card>
          <div class="supervision ${tone} ${m.compressorOn?'running':''} ${m.defrost?'defrost':''}">
            <header class="topbar">
              <div>
                <span class="eyebrow">SUPERVISION TECHNIQUE</span>
                <h1>Atlantic Alféa Duo</h1>
                <p>Vue en coupe · états réels Home Assistant</p>
              </div>
              <div class="statuses">
                <span class="status ${tone}">${m.cooling?'Rafraîchissement':'Chauffage'}</span>
                <span class="status ${m.compressorOn?'active':'idle'}">${m.compressorOn?'Compresseur actif':'Compresseur arrêté'}</span>
                <span class="status">${m.modulation.toFixed(0)} % modulation</span>
              </div>
            </header>

            <div class="scene">
              <section class="unit outdoor-card" data-more-info="${esc(m.e.outdoor?.entity_id || '')}">
                <div class="unit-head"><span>UNITÉ EXTÉRIEURE</span><span class="live ${m.compressorOn?'on':''}"></span></div>
                <div class="outdoor-art">
                  <div class="air-stream">${Array.from({length:7},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
                  <div class="outdoor-body">
                    <div class="grille"></div>
                    <div class="fan-shell ${m.compressorOn?'spinning':''}" style="--fan-duration:${fanSpeed || 6}s">
                      <svg class="fan" viewBox="0 0 120 120" aria-hidden="true">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="2" opacity=".2"/>
                        ${[0,72,144,216,288].map(angle=>`<path d="M60 60 C38 48 34 22 55 18 C72 15 78 40 60 60Z" transform="rotate(${angle} 60 60)"/>`).join('')}
                        <circle cx="60" cy="60" r="7" fill="currentColor"/>
                      </svg>
                    </div>
                    ${m.defrost?'<div class="frost"></div>':''}
                    <div class="outdoor-badge">${m.defrost?'DÉGIVRAGE':'ATLANTIC'}</div>
                  </div>
                </div>
                <div class="metrics">
                  <div><span>Air extérieur</span><strong>${fmt(m.outdoor,1,'°C')}</strong></div>
                  <div><span>Modulation</span><strong>${m.modulation.toFixed(0)} <small>%</small></strong></div>
                </div>
                <div class="unit-foot">${esc(m.e.pacState?.state || 'État PAC indisponible')}</div>
              </section>

              <div class="flow-link in ${m.compressorOn?'active':''} ${tone}">
                <svg viewBox="0 0 80 380" preserveAspectRatio="none" aria-hidden="true">
                  <path class="track" d="M0 190 H80"/>
                  ${m.compressorOn?`<path class="water" d="M0 190 H80"/>`:''}
                </svg>
                <span class="link-label">${m.cooling?'FROID':'CHAUD'}</span>
              </div>

              <section class="unit hydraulic-card">
                <div class="unit-head"><span>MODULE HYDRAULIQUE</span><span class="live ${activeCount?'on':''}"></span></div>
                <div class="hydraulic-art">
                  <div class="glass-case">
                    <div class="inner-label">COUPE INTERNE</div>
                    <div class="compressor-block ${m.compressorOn?'working':''}">
                      <span class="bolt"></span><span class="bolt"></span>
                      <b>COMP</b>
                    </div>
                    <div class="exchanger ${tone} ${m.compressorOn?'working':''}">
                      <svg viewBox="0 0 120 90" aria-hidden="true">
                        <path d="M18 12 H92 V30 H30 V47 H92 V64 H30 V80 H100" fill="none"/>
                      </svg>
                    </div>
                    <div class="pump-block ${m.c1Active||m.c2Active?'working':''}">
                      <svg viewBox="0 0 90 90" aria-hidden="true"><circle cx="45" cy="45" r="32" fill="none" stroke="currentColor" stroke-width="2" opacity=".35"/><path class="impeller" d="M45 45 L45 16 M45 45 L70 58 M45 45 L20 58" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><circle cx="45" cy="45" r="7" fill="currentColor"/></svg>
                      <b>PUMP</b>
                    </div>
                    <div class="valve-block ${m.c1Active||m.c2Active||m.ecsActive?'working':''}">
                      <svg viewBox="0 0 70 70" aria-hidden="true"><path d="M10 35 H25 M45 35 H60 M35 10 V25 M35 45 V60" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="35" cy="35" r="11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M27 27 L43 43" stroke="currentColor" stroke-width="3"/></svg>
                      <b>3V</b>
                    </div>
                    <div class="pipe internal hot"></div>
                    <div class="pipe internal cold"></div>
                  </div>
                </div>
                <div class="metrics three">
                  <div><span>Départ</span><strong>${fmt(m.flow,1,'°C')}</strong></div>
                  <div><span>Retour</span><strong>${fmt(m.returnTemp,1,'°C')}</strong></div>
                  <div><span>ΔT</span><strong>${fmt(m.delta,1,'K')}</strong></div>
                </div>
              </section>

              <div class="flow-link out ${m.c1Active||m.c2Active||m.ecsActive?'active':''} ${tone}">
                <svg viewBox="0 0 180 380" preserveAspectRatio="none" aria-hidden="true">
                  <path class="track" d="M0 190 H38 V55 H180 M0 190 H38 V190 H180 M0 190 H38 V325 H180"/>
                  ${m.c1Active?`<path class="water branch-c1" d="M0 190 H38 V55 H180"/>`:''}
                  ${m.c2Active?`<path class="water branch-c2" d="M0 190 H38 V190 H180"/>`:''}
                  ${m.ecsActive?`<path class="water branch-ecs" d="M0 190 H38 V325 H180"/>`:''}
                </svg>
              </div>

              <section class="outputs">
                <article class="zone ${tone} ${m.c1Active?'active':''}" data-more-info="${esc(m.e.c1?.entity_id || '')}">
                  <div class="zone-head"><span class="zone-icon">♨</span><div><h3>Étage</h3><small>Radiateurs</small></div><span class="zone-dot"></span></div>
                  <div class="radiator ${m.c1Active?'heating':''}">${Array.from({length:11},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
                  <div class="zone-values"><span>${fmt(num(m.e.c1?.attributes?.current_temperature),1,'°C')}</span><b>${fmt(num(m.e.c1?.attributes?.temperature),1,'°C')}</b></div>
                  <div class="zone-foot">${m.c1Active?'Circulation active':'En attente'} · ${esc(m.e.c1?.attributes?.hvac_action || 'idle')}</div>
                </article>

                <article class="zone ${tone} ${m.c2Active?'active':''}" data-more-info="${esc(m.e.c2?.entity_id || '')}">
                  <div class="zone-head"><span class="zone-icon">▦</span><div><h3>RDC</h3><small>Plancher chauffant</small></div><span class="zone-dot"></span></div>
                  <div class="floor ${m.c2Active?'heating':''}"><svg viewBox="0 0 220 72" preserveAspectRatio="none" aria-hidden="true"><path d="M8 18 H204 V36 H16 V54 H204"/></svg></div>
                  <div class="zone-values"><span>${fmt(num(m.e.c2?.attributes?.current_temperature),1,'°C')}</span><b>${fmt(num(m.e.c2?.attributes?.temperature),1,'°C')}</b></div>
                  <div class="zone-foot">${m.c2Active?'Diffusion lente':'En attente'} · ${esc(m.e.c2?.attributes?.hvac_action || 'idle')}</div>
                </article>

                <article class="zone ecs-zone ${m.ecsActive?'active':''}" data-more-info="${esc(m.e.ecsTemp?.entity_id || '')}">
                  <div class="zone-head"><span class="zone-icon">◉</span><div><h3>ECS</h3><small>Ballon sanitaire</small></div><span class="zone-dot"></span></div>
                  <div class="tank-wrap">
                    <div class="tank ${m.ecsActive?'charging':''} ${m.ecsElectric?'electric':''}" style="--ecs-level:${m.ecsPct}%">
                      <div class="tank-water"></div>
                      <div class="tank-coil">${Array.from({length:5},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
                      ${m.ecsActive?'<div class="bubbles">'+Array.from({length:7},(_,i)=>`<i style="--i:${i}"></i>`).join('')+'</div>':''}
                      <div class="tank-mark"></div>
                    </div>
                    <div class="tank-temp"><strong>${fmt(m.ecsTemp,1,'°C')}</strong><small>${m.ecsActive?'Chauffe':'Stable'}</small></div>
                  </div>
                  <div class="zone-foot">${esc(m.ecsText || 'Production inconnue')}</div>
                </article>
              </section>
            </div>

            <footer class="foot">
              <span class="legend"><i class="hot"></i>Circuit chaud</span>
              <span class="legend"><i class="cold"></i>Circuit froid</span>
              <span>Animations uniquement sur états réels · clic sur un équipement pour le détail</span>
            </footer>
          </div>
        </ha-card>`;
      this.shadowRoot.querySelectorAll('[data-more-info]').forEach(element => {
        element.addEventListener('click', () => {
          if (!element.dataset.moreInfo) return;
          this.dispatchEvent(new CustomEvent('hass-more-info', {
            detail:{entityId:element.dataset.moreInfo},bubbles:true,composed:true
          }));
        });
      });
    }

    _styles() {
      return `
        :host{display:block;--bg:#0d141b;--panel:#141f2a;--panel2:#192734;--line:#2a3b4b;--text:#eaf4fb;--sub:#8fa8bc;--hot:#ff8a5b;--cold:#56c8ff;--amber:#ffc56b;--green:#57d7ae}
        ha-card{background:var(--bg);color:var(--text);overflow:hidden;border:1px solid #243442;border-radius:18px;font-family:var(--primary-font-family,Roboto,Arial,sans-serif)}
        .supervision{padding:18px;background:radial-gradient(circle at 38% 18%,#193044 0,#0d141b 55%,#0b1118 100%)}
        .topbar{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:16px}
        .eyebrow{font-size:9px;letter-spacing:2.2px;color:#6f8ca3;font-weight:800}
        h1{font-size:22px;line-height:1.05;margin:4px 0 2px;letter-spacing:-.4px}
        .topbar p{margin:0;color:#7791a7;font-size:11px}
        .statuses{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}
        .status{border:1px solid #314657;border-radius:99px;padding:6px 9px;font-size:10px;color:#b7cbdc;background:#101a23}
        .status.active{border-color:#3d7c68;color:#8ff0ca;background:#12251f}
        .status.heat{border-color:#8b4b35;color:#ffb38b;background:#28170f}
        .status.cool{border-color:#2c6685;color:#a7e3ff;background:#0d202b}
        .status.idle{opacity:.62}
        .scene{display:grid;grid-template-columns:236px 58px minmax(260px,1fr) 72px 286px;gap:0;align-items:stretch}
        .unit{position:relative;border:1px solid var(--line);border-radius:14px;background:linear-gradient(160deg,var(--panel),#0f1820);box-shadow:0 18px 35px #0006;overflow:hidden}
        .unit-head{display:flex;justify-content:space-between;align-items:center;padding:11px 12px 0;font-size:9px;letter-spacing:1.5px;color:#8ca6ba;font-weight:800}
        .live{width:6px;height:6px;border-radius:50%;background:#465b6c}
        .live.on{background:var(--green);box-shadow:0 0 9px var(--green)}
        .outdoor-art{height:156px;display:grid;place-items:center;position:relative;margin:2px 10px 0}
        .outdoor-body{position:relative;width:170px;height:112px;border-radius:12px;background:linear-gradient(145deg,#d8e5ed,#7d96a8 55%,#536a7c);box-shadow:inset 0 1px 0 #fff9,0 14px 20px #0007;border:1px solid #b9cedb}
        .outdoor-body:before{content:'';position:absolute;inset:8px 9px;border-radius:8px;background:linear-gradient(160deg,#26343f,#101920);box-shadow:inset 0 0 16px #0009}
        .grille{position:absolute;left:13px;right:13px;top:13px;bottom:13px;border-radius:7px;background:repeating-linear-gradient(0deg,#405361 0 1px,#1b2933 1px 5px);opacity:.55}
        .fan-shell{position:absolute;left:23px;top:14px;width:84px;height:84px;color:#a8d9f1;filter:drop-shadow(0 0 8px #45b9f355)}
        .fan-shell.spinning{animation:spin var(--fan-duration) linear infinite}
        .fan{width:100%;height:100%;fill:#7bb4cf}
        .frost{position:absolute;inset:8px 9px;border-radius:8px;background:radial-gradient(circle at 30% 30%,#e8fbff77,transparent 38%),repeating-linear-gradient(125deg,#d8f8ff33 0 2px,transparent 2px 8px);box-shadow:inset 0 0 25px #c8f6ff66;animation:frostPulse 2.5s ease-in-out infinite}
        .outdoor-badge{position:absolute;right:10px;bottom:9px;font-size:8px;font-weight:800;letter-spacing:1.2px;color:#e9f7ff;text-shadow:0 1px 2px #000}
        .air-stream{position:absolute;right:-3px;top:18px;bottom:18px;width:54px;overflow:hidden;opacity:0;transition:opacity .3s}
        .running .air-stream{opacity:1}
        .air-stream i{position:absolute;right:0;top:calc(8px + var(--i)*19px);width:36px;height:1px;background:linear-gradient(90deg,transparent,#8edcff);filter:drop-shadow(0 0 4px #63cfff);animation:airMove 1.6s linear infinite;animation-delay:calc(var(--i)*-.19s)}
        .metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 12px 9px}
        .metrics.three{grid-template-columns:repeat(3,1fr)}
        .metrics span{display:block;font-size:9px;color:#7f9aae;margin-bottom:2px}
        .metrics strong{font-size:17px;font-variant-numeric:tabular-nums;letter-spacing:-.4px}
        .metrics small{font-size:10px;color:#91aabd}
        .unit-foot{padding:0 12px 11px;color:#6f899d;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .flow-link{position:relative;display:grid;place-items:center;min-width:0}
        .flow-link svg{width:100%;height:100%;min-height:210px;overflow:visible}
        .flow-link .track{fill:none;stroke:#2a3d4d;stroke-width:10;stroke-linecap:round}
        .flow-link .water{fill:none;stroke:var(--cold);stroke-width:5;stroke-linecap:round;stroke-dasharray:8 12;animation:waterFlow 1s linear infinite;filter:drop-shadow(0 0 5px var(--cold))}
        .flow-link.heat .water{stroke:var(--hot);filter:drop-shadow(0 0 6px var(--hot))}
        .flow-link.cool .water{stroke:var(--cold)}
        .flow-link:not(.active) .water{display:none}
        .link-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:8px;letter-spacing:1.3px;color:#7d99ad;background:#0d141b;padding:2px 4px;border-radius:4px}
        .hydraulic-art{height:156px;margin:2px 10px 0;display:grid;place-items:center}
        .glass-case{position:relative;width:100%;height:132px;border:1px solid #5e788a55;border-radius:12px;background:linear-gradient(150deg,#c7e8f51a,#13222d 45%,#0c141b);box-shadow:inset 0 1px 0 #fff2,inset 0 0 30px #4db7dc12;overflow:hidden}
        .glass-case:before{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,#c9efff12 36%,transparent 55%);pointer-events:none}
        .inner-label{position:absolute;left:9px;top:8px;font-size:8px;letter-spacing:1.4px;color:#6e8da2}
        .compressor-block{position:absolute;left:12px;bottom:15px;width:50px;height:58px;border-radius:14px 14px 9px 9px;background:linear-gradient(135deg,#718494,#26343e 45%,#111b22);border:1px solid #8da5b4;box-shadow:inset 0 1px 0 #fff6,0 8px 12px #0008;display:grid;place-items:center;color:#a7c1d3;font-size:9px;letter-spacing:1px}
        .compressor-block.working{animation:compressorVibe .18s linear infinite}
        .compressor-block .bolt{position:absolute;width:4px;height:4px;border-radius:50%;background:#0d151b;top:6px;left:6px;box-shadow:38px 0 #0d151b}
        .compressor-block .bolt+.bolt{top:auto;bottom:6px}
        .exchanger{position:absolute;left:78px;top:25px;width:108px;height:70px;color:#6fb6db;opacity:.9}
        .exchanger svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 0 4px #429bc866)}
        .exchanger.heat{color:#ff9b75;filter:drop-shadow(0 0 5px #ff8a5b66)}
        .exchanger.working svg{animation:coilPulse 2.4s ease-in-out infinite}
        .pump-block{position:absolute;right:11px;bottom:12px;width:45px;height:45px;color:#8fc6df}
        .pump-block svg{width:100%;height:100%}
        .pump-block .impeller{transform-origin:45px 45px}
        .pump-block.working .impeller{animation:spin .75s linear infinite}
        .pump-block b,.valve-block b{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);font-size:7px;letter-spacing:.8px;color:#7691a5}
        .valve-block{position:absolute;right:16px;top:13px;width:34px;height:34px;color:#7de0c0}
        .valve-block svg{width:100%;height:100%}
        .valve-block.working svg{animation:valvePulse 2.1s ease-in-out infinite}
        .pipe.internal{position:absolute;height:4px;border-radius:3px;opacity:.75}
        .pipe.internal.hot{left:62px;right:58px;top:45px;background:linear-gradient(90deg,#4fc5ff,#ff8a5b)}
        .pipe.internal.cold{left:62px;right:58px;top:55px;background:linear-gradient(90deg,#347ca7,#4fc5ff)}
        .outputs{display:grid;grid-template-rows:1fr 1fr 1.2fr;gap:8px;min-width:0}
        .zone{border:1px solid var(--line);border-radius:13px;background:linear-gradient(155deg,#16232e,#101820);padding:10px 11px;display:flex;flex-direction:column;gap:5px;position:relative;overflow:hidden;cursor:pointer}
        .zone.active{border-color:#3a6a78;box-shadow:inset 0 0 22px #3ec7ff0d}
        .zone-head{display:flex;align-items:center;gap:8px}
        .zone-head h3{font-size:13px;margin:0;line-height:1.05}
        .zone-head small{font-size:9px;color:#7f99ad}
        .zone-icon{width:27px;height:27px;border-radius:8px;display:grid;place-items:center;background:#0b141b;border:1px solid #2b4251;color:#8fd9ef;font-size:15px}
        .zone-dot{width:6px;height:6px;border-radius:50%;background:#405363;margin-left:auto}
        .zone.active .zone-dot{background:var(--green);box-shadow:0 0 8px var(--green)}
        .zone-values{display:flex;justify-content:space-between;align-items:baseline;font-variant-numeric:tabular-nums}
        .zone-values span{font-size:18px;font-weight:750}
        .zone-values b{font-size:11px;color:#8faabd;font-weight:500}
        .zone-foot{font-size:8px;color:#708a9d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .radiator{height:34px;display:flex;align-items:flex-end;gap:3px;padding:0 2px}
        .radiator i{flex:1;height:calc(15px + var(--i)*1.4px);border-radius:3px 3px 1px 1px;background:linear-gradient(#526d7d,#263641);border:1px solid #6c899b55}
        .radiator.heating i{background:linear-gradient(#ffb38e,#b84d2c);box-shadow:0 0 8px #ff7a4655;animation:radiate 1.8s ease-in-out infinite;animation-delay:calc(var(--i)*.09s)}
        .floor{height:34px;border-radius:5px;background:linear-gradient(#1c2e39,#0d171e);border:1px solid #2c4555;padding:4px;cursor:pointer}
        .floor svg{width:100%;height:100%;fill:none;stroke:#375565;stroke-width:4;stroke-linecap:round}
        .floor.heating{border-color:#7d513c;box-shadow:0 0 14px #ff8a5b22}
        .floor.heating svg{stroke:#ffad86;filter:drop-shadow(0 0 4px #ff8a5b)}
        .ecs-zone{grid-row:span 1}
        .tank-wrap{display:flex;align-items:center;gap:12px;min-height:52px}
        .tank{position:relative;width:54px;height:72px;border-radius:25px 25px 17px 17px;border:1px solid #6e94a5;background:#0e1a22;box-shadow:inset 0 0 16px #7ed8ff14,0 8px 13px #0006;overflow:hidden;flex:none}
        .tank-water{position:absolute;left:0;right:0;bottom:0;height:var(--ecs-level);background:linear-gradient(#ff9d6b,#e35b3f 65%,#a93325);opacity:.78;transition:height .8s ease}
        .tank-coil{position:absolute;inset:10px 7px;display:grid;gap:5px;align-content:center}
        .tank-coil i{height:2px;border-radius:2px;background:#7ed9ff88;animation:coilGlow 2s ease-in-out infinite;animation-delay:calc(var(--i)*-.2s)}
        .tank.charging .tank-coil i{background:#ffd1a7;box-shadow:0 0 5px #ff9d6b}
        .tank.electric .tank-coil i{background:#ffdd73;box-shadow:0 0 7px #ffc107}
        .tank-mark{position:absolute;left:7px;right:7px;top:22%;border-top:1px dashed #dff7ff44}
        .bubbles{position:absolute;inset:0;overflow:hidden}
        .bubbles i{position:absolute;left:calc(8px + var(--i)*6px);bottom:8px;width:3px;height:3px;border-radius:50%;background:#e7fbff;opacity:.7;animation:bubble 2.2s linear infinite;animation-delay:calc(var(--i)*-.31s)}
        .tank-temp strong{display:block;font-size:20px;line-height:1;font-variant-numeric:tabular-nums}
        .tank-temp small{font-size:9px;color:#86a3b7}
        .foot{display:flex;align-items:center;gap:13px;flex-wrap:wrap;color:#7892a6;font-size:9px;padding-top:11px;border-top:1px solid #243441;margin-top:12px}
        .legend{display:inline-flex;align-items:center;gap:4px}
        .legend i{width:14px;height:2px;border-radius:2px}
        .legend .hot{background:var(--hot)}.legend .cold{background:var(--cold)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes waterFlow{to{stroke-dashoffset:-40}}
        @keyframes airMove{0%{transform:translateX(15px);opacity:0}35%{opacity:.8}100%{transform:translateX(-28px);opacity:0}}
        @keyframes compressorVibe{0%,100%{transform:translate(0,0)}50%{transform:translate(0,-.7px)}}
        @keyframes coilPulse{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes valvePulse{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes radiate{0%,100%{filter:brightness(.92)}50%{filter:brightness(1.15)}}
        @keyframes coilGlow{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes bubble{0%{transform:translateY(0);opacity:0}20%{opacity:.8}100%{transform:translateY(-48px);opacity:0}}
        @keyframes frostPulse{0%,100%{opacity:.55}50%{opacity:.95}}
        @media(max-width:1050px){
          .scene{grid-template-columns:220px 42px minmax(220px,1fr);grid-template-areas:'out in hyd' 'out . outputs' 'out . outputs'}
          .outdoor-card{grid-area:out}.in{grid-area:in}.hydraulic-card{grid-area:hyd}.out{display:none}.outputs{grid-area:outputs;margin-top:8px}
        }
        @media(max-width:720px){
          .supervision{padding:12px}.topbar{display:block}.statuses{justify-content:flex-start;margin-top:8px}
          .scene{display:flex;flex-direction:column;gap:8px}.flow-link{display:none}.outputs{grid-template-rows:none;grid-template-columns:1fr 1fr}.ecs-zone{grid-column:1/-1}
          .outdoor-art,.hydraulic-art{height:140px}.foot{font-size:8px}
        }
      `;
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, PacSupervisionCard);

  window.customCards = window.customCards || [];
  if (!window.customCards.some(card => card.type === TAG)) {
    window.customCards.push({
      type: TAG,
      name: 'Supervision PAC 3D — Atlantic Alféa',
      description: 'Supervision technique animée : extérieur, hydraulique, circuits et ECS.',
      preview: false
    });
  }
})();
