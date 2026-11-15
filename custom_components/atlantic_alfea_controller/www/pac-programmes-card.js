/**
 * Programmes PAC v0.5.0 — programmes horaires natifs BSB-LAN, avec mode édition
 * (chauffage C1/C2 et ECS) via le service atlantic_alfea_controller.set_weekly_program.
 * Noms des circuits : option de l'intégration (attribut nom_circuit), surchargeable dans la carte.
 * Les onglets rafraîchissement sont masqués si leur capteur est en erreur.
 * Les barres représentent les créneaux natifs ; aucun horaire n'est simulé.
 */
(() => {
  'use strict';
  const TAG = 'pac-programmes-card';
  if (customElements.get(TAG)) return;

  const PROGRAMS = [
    {key:'chauffage_c1',label:'Chauffage C1',base:'501',color:'var(--warning-color,#e6a23c)',setpoints:[710,712]},
    {key:'chauffage_c2',label:'Chauffage C2',base:'521',color:'var(--info-color,#039be5)',setpoints:[1010,1012]},
    {key:'ecs',label:'Eau chaude sanitaire',base:'561',color:'var(--success-color,#43a047)',setpoints:[1610,1612]},
    {key:'rafraichissement_c1',label:'Rafraîchissement C1',base:'11000',color:'#0891b2',setpoints:[902,903]},
    {key:'rafraichissement_c2',label:'Rafraîchissement C2',base:'11010',color:'#7c3aed',setpoints:[1202,1203]}
  ];
  const DAYS = [
    ['lundi','Lundi'],['mardi','Mardi'],['mercredi','Mercredi'],
    ['jeudi','Jeudi'],['vendredi','Vendredi'],['samedi','Samedi'],['dimanche','Dimanche']
  ];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  function toMinutes(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [h,m] = value.split(':').map(Number);
    if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
    return h*60+m;
  }

  const WRITABLE = new Set(['chauffage_c1', 'chauffage_c2', 'ecs']);
  const SERVICE_DOMAIN = 'atlantic_alfea_controller', SERVICE = 'set_weekly_program';
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const normClock = (v) => { const m = String(v || '').trim().match(/^(\d{1,2})[:hH.]?(\d{2})$/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(v || '').trim(); };
  const slotsText = (slots) => slots.length ? slots.map(s => `${s.debut}–${s.fin}`).join(', ') : 'aucune plage';
  // Mêmes règles que l'intégration : HH:MM, pas de 10 min, ordonnées, sans chevauchement, 3 max, 24:00 en fin seulement
  function validateDay(slots) {
    if (slots.length > 3) return 'Trois plages au maximum';
    let prev = -1;
    for (const s of slots) {
      const a = toMinutes(s.debut), b = toMinutes(s.fin);
      if (a === null || b === null) return `Heure invalide (HH:MM) : ${s.debut}–${s.fin}`;
      if (a === 1440) return '24:00 seulement en fin de plage';
      if (a % 10 || b % 10) return `Pas de 10 minutes : ${s.debut}–${s.fin}`;
      if (a >= b) return `Plage inversée ou vide : ${s.debut}–${s.fin}`;
      if (a < prev) return `Plages qui se chevauchent : ${s.debut}–${s.fin}`;
      prev = b;
    }
    return '';
  }
  const PRESETS = [
    { label: '06:00–22:00', slots: [{ debut: '06:00', fin: '22:00' }] },
    { label: '06:00–08:00 + 17:00–22:00', slots: [{ debut: '06:00', fin: '08:00' }, { debut: '17:00', fin: '22:00' }] },
    { label: 'Aucune plage', slots: [] },
  ];
  const GROUPS = [
    { label: 'Lun–Ven', days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] },
    { label: 'Week-end', days: ['samedi', 'dimanche'] },
    { label: 'Tous les jours', days: DAYS.map(d => d[0]) },
  ];

  class PacProgrammesCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this._config = {};
      this._selected = 'chauffage_c1';
      this._hass = null;
      this._refreshing = false;
      this._spTimers = {};
      this._spDesired = {};
    }
    setConfig(config) {
      this._config = config || {};
      if (!PROGRAMS.some(p => p.key === this._selected)) this._selected = 'chauffage_c1';
      this._render();
    }
    set hass(hass) {
      this._hass = hass;
      if (this._edit) return;
      const signature = this._signature();
      if (signature === this._signatureCache) return;
      this._signatureCache = signature;
      this._render();
    }
    getCardSize() { return 5; }
    static getConfigElement() { return document.createElement('pac-programmes-card-editor'); }
    static getStubConfig() { return {}; }

    // Nom du circuit : config de la carte > option de l'intégration (nom_circuit) > « Circuit N »
    _circuitName(n) {
      const own = String(this._config[`circuit_${n}_name`] || '').trim();
      if (own) return own;
      const prog = PROGRAMS.find(p => p.key === `chauffage_c${n}`);
      const fromSensor = prog && this._sensor(prog)?.attributes?.nom_circuit;
      if (fromSensor) return fromSensor;
      const clim = Object.values(this._hass?.states || {}).find(s => s.entity_id.startsWith('climate.') &&
        s.entity_id.endsWith(`_c${n}_circuit_${n}`) && s.attributes?.nom_circuit);
      return clim?.attributes?.nom_circuit || `Circuit ${n}`;
    }
    _label(program) {
      const m = program.key.match(/_c([12])$/);
      return m ? `${program.label.replace(/ C[12]$/, '')} ${this._circuitName(Number(m[1]))}` : program.label;
    }

    _sensor(program) {
      const configured = this._config[program.key];
      if (configured) return this._hass?.states[configured] || null;
      return Object.values(this._hass?.states || {}).find(s =>
        s.entity_id.startsWith('sensor.') &&
        s.attributes?.parametre_lundi === program.base &&
        s.attributes?.source === 'BSB-LAN JSON /JQ'
      ) || null;
    }
    _button() {
      const configured = this._config.refresh_button;
      if (configured) return this._hass?.states[configured] || null;
      return Object.values(this._hass?.states || {}).find(s =>
        s.entity_id.startsWith('button.') &&
        (s.attributes?.friendly_name || '').includes('Programmes natifs - Actualiser')
      ) || null;
    }
    _signature() {
      if (!this._hass) return '';
      const parts = [this._selected, this._refreshing ? '1' : '0', this._lastError || '', this._circuitName(1), this._circuitName(2)];
      for (const program of PROGRAMS) {
        const sensor = this._sensor(program);
        parts.push(program.key, sensor?.state || '', sensor?.attributes?.derniere_importation || '',
          sensor?.attributes?.erreur_derniere_lecture || '', JSON.stringify(sensor?.attributes?.jours || {}));
      }
      const button = this._button();
      parts.push('button', button?.state || '');
      for (const parameter of [710, 712, 1010, 1012, 1610, 1612, 902, 903, 1202, 1203]) {
        parts.push(String(parameter), this._hass.states?.[this._setpointEntity(parameter)?.entity_id]?.state || '');
      }
      return parts.join('|');
    }
    _setpointEntity(parameter) {
      return Object.values(this._hass?.states || {}).find(s =>
        s.entity_id.startsWith('number.') &&
        (s.entity_id.includes(`_${parameter}`) ||
         (s.attributes?.friendly_name || '').includes(`(${parameter})`))
      ) || null;
    }
    _setpointValue(parameter) {
      const state = this._setpointEntity(parameter);
      // entité absente, vide ou indisponible : « — » (Number('') vaudrait 0)
      const raw = String(state?.state ?? '').trim().replace(',', '.');
      const value = raw === '' ? NaN : Number(raw);
      return {state, value: Number.isFinite(value) ? value : null};
    }
    _setpointHtml(program) {
      if (!program?.setpoints) return '';
      const [comfortParam, reducedParam] = program.setpoints;
      const isDhw = program.key === 'ecs';
      const isCooling = program.key.startsWith('rafraichissement_');
      const circuit = program.key.endsWith('_c1') ? 'C1' : program.key.endsWith('_c2') ? 'C2' : 'ECS';
      const labels = isDhw ? ['Nominale', 'Réduite'] : ['Confort', 'Réduit'];
      const comfort = this._setpointValue(comfortParam);
      const reduced = this._setpointValue(reducedParam);
      const item = (name, data) => `<span class="sp-item"><span>${name}</span>
        <button type="button" data-sp="${data.state?.entity_id || ''}" data-delta="-1" ${data.state ? '' : 'disabled'} aria-label="Diminuer ${name} ${circuit}">−</button>
        <strong>${data.value === null ? '—' : data.value.toFixed(1).replace('.', ',')} °C</strong>
        <button type="button" data-sp="${data.state?.entity_id || ''}" data-delta="1" ${data.state ? '' : 'disabled'} aria-label="Augmenter ${name} ${circuit}">+</button></span>`;
      return `<div class="setpoints"><div class="sp-head"><span>Consignes · ${esc(this._label(program))}</span><small>${isDhw ? 'ECS' : isCooling ? 'rafraîchissement' : 'chauffage'}</small></div>
        <div class="sp-circuit"><strong>${circuit}</strong>${item(labels[0], comfort)}${item(labels[1], reduced)}</div></div>`;
    }
    _changeSetpoint(entityId, delta) {
      if (!entityId) return;
      const state = this._hass?.states?.[entityId];
      if (!state) return;
      const current = Number(String(state.state).replace(',', '.'));
      if (!Number.isFinite(current)) return;
      const base = Number.isFinite(this._spDesired[entityId]) ? this._spDesired[entityId] : current;
      const minimum = Number(state.attributes?.min ?? 5);
      const maximum = Number(state.attributes?.max ?? 35);
      const next = Math.round(Math.max(minimum, Math.min(maximum, base + delta)) * 10) / 10;
      this._spDesired[entityId] = next;
      clearTimeout(this._spTimers[entityId]);
      this._spTimers[entityId] = setTimeout(async () => {
        const value = this._spDesired[entityId];
        delete this._spDesired[entityId];
        try {
          await this._hass.callService('number', 'set_value', {entity_id: entityId, value});
        } catch (err) {
          this._lastError = String(err?.message || err);
          this._render();
        }
      }, 600);
    }
    async _refresh() {
      const button = this._button();
      if (!button || button.state === 'unavailable' || this._refreshing) return;
      const started = Date.now();
      this._refreshing = true;
      this._lastError = null;
      this._render();
      try {
        await this._hass.callService('button','press',{entity_id:button.entity_id});
      } catch (err) {
        // Les capteurs conservent le détail des erreurs d'importation.
        this._lastError = String(err?.message || err);
      } finally {
        // Garde un retour visuel minimal même si le service répond très vite.
        const remaining = Math.max(0, 4000 - (Date.now() - started));
        setTimeout(() => {
          this._refreshing = false;
          this._render();
        }, remaining);
      }
    }
    // ---------- mode édition ----------
    _canEdit(program, sensor) {
      return WRITABLE.has(program.key) && sensor?.state === 'Chargé'
        && !!this._hass?.services?.[SERVICE_DOMAIN]?.[SERVICE];
    }
    _startEdit(program, days) {
      const d = {};
      for (const [k] of DAYS) d[k] = Array.isArray(days[k]) ? clone(days[k]) : [];
      this._edit = { key: program.key, days: d, orig: clone(d), clip: null, confirm: false, saving: false, status: '', error: '' };
      this._render();
    }
    _endEdit() { this._edit = null; this._signatureCache = null; this._render(); }
    _changedDays() {
      const e = this._edit; if (!e) return [];
      return DAYS.map(d => d[0]).filter(k => JSON.stringify(e.days[k]) !== JSON.stringify(e.orig[k]));
    }
    _addSlot(day, at) {
      const slots = this._edit.days[day];
      if (slots.length >= 3) return;
      const taken = slots.map(s => [toMinutes(s.debut), toMinutes(s.fin)]);
      const free = (a, b) => taken.every(([x, y]) => b <= x || a >= y);
      let a, b;
      if (at !== undefined) { a = Math.max(0, Math.min(1380, Math.round(at / 10) * 10 - 30)); b = a + 60; }
      else if (!slots.length) { a = 360; b = 1320; }
      else { const last = Math.max(...taken.map(t => t[1])); a = Math.min(last + 60, 1380); b = Math.min(a + 120, 1440); }
      if (!free(a, b)) {  // cherche le premier creneau libre d'une heure
        a = null;
        for (let m = 0; m <= 1380; m += 10) if (free(m, m + 60)) { a = m; break; }
        if (a === null) return;
        b = a + 60;
      }
      slots.push({ debut: fmt(a), fin: fmt(b) });
      slots.sort((x, y) => (toMinutes(x.debut) ?? 0) - (toMinutes(y.debut) ?? 0));
      this._render();
    }
    _paste(days) {
      const e = this._edit; if (!e || !e.clip) return;
      for (const d of days) e.days[d] = clone(e.clip.slots);
      this._render();
    }
    async _save() {
      const e = this._edit; if (!e || e.saving) return;
      const changed = this._changedDays();
      const groups = {};
      for (const d of changed) { const k = JSON.stringify(e.days[d]); (groups[k] = groups[k] || []).push(d); }
      const list = Object.entries(groups);
      e.saving = true; e.error = '';
      try {
        for (let i = 0; i < list.length; i++) {
          const [k, days] = list[i];
          e.status = `Écriture ${i + 1}/${list.length} : ${days.join(', ')}…`; this._render();
          await this._hass.callService(SERVICE_DOMAIN, SERVICE, { program: e.key, days, slots: JSON.parse(k) });
          for (const d of days) e.orig[d] = clone(e.days[d]);
        }
        // Affiche tout de suite ce qui a été écrit, le temps que Home Assistant transmette le nouvel état.
        this._optimistic = { key: e.key, days: clone(e.days), until: Date.now() + 60000 };
        setTimeout(() => { this._signatureCache = null; this._render(); }, 61000);
        this._endEdit();
      } catch (err) {
        e.saving = false; e.confirm = false;
        e.error = `Écriture interrompue : ${err?.message || err}. Les jours déjà écrits sont conservés ; les autres restent modifiables.`;
        e.status = ''; this._render();
      }
    }
    _editHtml(program) {
      const e = this._edit;
      for (const [k] of DAYS) e.days[k].sort((x, y) => (toMinutes(x.debut) ?? 0) - (toMinutes(y.debut) ?? 0));
      const changed = this._changedDays();
      const errors = Object.fromEntries(DAYS.map(([k]) => [k, validateDay(e.days[k])]));
      const hasErr = Object.values(errors).some(Boolean);
      const today = (new Date().getDay() + 6) % 7;
      const rows = DAYS.map(([key, label], index) => {
        const slots = e.days[key];
        const isChanged = changed.includes(key);
        const bars = slots.map((r, i) => {
          const a = toMinutes(r.debut), b = toMinutes(r.fin);
          if (a === null || b === null || b <= a) return '';
          return `<span class="slot edit" data-day="${key}" data-i="${i}" style="left:${a / 14.4}%;width:${(b - a) / 14.4}%">
            <i class="h start" data-day="${key}" data-i="${i}" data-edge="debut"></i><i class="h end" data-day="${key}" data-i="${i}" data-edge="fin"></i></span>`;
        }).join('');
        const fields = slots.map((r, i) => `<span class="se">
            <input data-day="${key}" data-i="${i}" data-f="debut" value="${esc(r.debut)}" maxlength="5" inputmode="numeric" aria-label="Début plage ${i + 1} ${label}">–<input data-day="${key}" data-i="${i}" data-f="fin" value="${esc(r.fin)}" maxlength="5" inputmode="numeric" aria-label="Fin plage ${i + 1} ${label}">
            <button type="button" class="mini" data-del="${key}" data-i="${i}" title="Supprimer la plage">×</button></span>`).join('');
        return `<div class="day ${index === today ? 'today' : ''} ${isChanged ? 'changed' : ''} ${errors[key] ? 'invalid' : ''}">
          <div class="day-name">${esc(label)}<small>${isChanged ? 'modifié' : index === today ? 'Aujourd’hui' : ''}</small></div>
          <div class="day-detail">
            <div class="timeline edit" data-day="${key}" title="Cliquer sur une zone vide pour ajouter une plage">${bars}</div>
            <div class="slots-edit">${fields || '<span class="empty">Aucune plage</span>'}
              ${slots.length < 3 ? `<button type="button" class="mini add" data-add="${key}">+ plage</button>` : ''}
              <button type="button" class="mini" data-copy="${key}" title="Copier ce jour">⧉ Copier</button>
              ${e.clip ? `<button type="button" class="mini" data-paste-day="${key}" title="Coller ici">Coller</button>` : ''}
            </div>
            ${errors[key] ? `<div class="row-err">${esc(errors[key])}</div>` : ''}
          </div></div>`;
      }).join('');
      const toolbar = `<div class="toolbar">
          <span class="tb-label">Modèles :</span>${PRESETS.map((p, i) => `<button type="button" class="mini" data-preset="${i}">${esc(p.label)}</button>`).join('')}
          <span class="sep"></span>
          <span class="tb-label">${e.clip ? `Copié : <b>${esc(e.clip.label)}</b> (${esc(slotsText(e.clip.slots))}) → coller sur` : 'Copiez un jour ou choisissez un modèle, puis collez-le'}</span>
          ${e.clip ? GROUPS.map((g, i) => `<button type="button" class="mini" data-paste-group="${i}">${g.label}</button>`).join('') : ''}
        </div>`;
      const summary = changed.map(d => `<li><b>${esc(DAYS.find(x => x[0] === d)[1])}</b> : ${esc(slotsText(e.orig[d]))} → <span class="new">${esc(slotsText(e.days[d]))}</span></li>`).join('');
      const actions = e.confirm
        ? `<div class="confirm"><div class="c-title">Écrire ces changements dans la PAC (${esc(this._label(program))}) ?</div><ul>${summary}</ul>
             <div class="c-note">Chaque jour est écrit puis relu ; en cas d'écart, la valeur d'origine est restaurée.</div>
             <div class="actions"><button type="button" class="btn" data-act="back" ${e.saving ? 'disabled' : ''}>Retour</button>
             <button type="button" class="btn primary" data-act="write" ${e.saving ? 'disabled' : ''}>${e.saving ? esc(e.status || 'Écriture…') : 'Écrire dans la PAC'}</button></div></div>`
        : `<div class="actions"><button type="button" class="btn" data-act="cancel">Annuler</button>
             <button type="button" class="btn" data-act="reset" ${changed.length ? '' : 'disabled'}>Rétablir</button>
             <button type="button" class="btn primary" data-act="review" ${changed.length && !hasErr ? '' : 'disabled'}>
               Enregistrer${changed.length ? ` (${changed.length} jour${changed.length > 1 ? 's' : ''})` : ''}</button></div>`;
      return `${toolbar}
        <div class="scale"><span></span><div class="ticks"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div></div>
        <div class="days">${rows}</div>
        ${e.error ? `<div class="warning">${esc(e.error)}</div>` : ''}
        ${actions}`;
    }
    _bindEdit(root) {
      const e = this._edit;
      // Saisie : le modèle est mis à jour sans redessiner la carte, sinon un clic sur un bouton
      // juste après une saisie serait perdu (le bouton disparaîtrait entre l'appui et le relâchement).
      root.querySelectorAll('input[data-f]').forEach(inp => {
        const slot = () => e.days[inp.dataset.day][+inp.dataset.i];
        inp.addEventListener('input', () => { const s = slot(); if (s) s[inp.dataset.f] = inp.value.trim(); });
        inp.addEventListener('change', () => { const s = slot(); if (s) { s[inp.dataset.f] = normClock(inp.value); inp.value = s[inp.dataset.f]; } });
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { inp.dispatchEvent(new Event('change')); this._render(); } });
        inp.addEventListener('focusout', () => setTimeout(() => { if (this._edit && !this.shadowRoot.activeElement) this._render(); }, 0));
      });
      root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { e.days[b.dataset.del].splice(+b.dataset.i, 1); this._render(); }));
      root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => this._addSlot(b.dataset.add)));
      root.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
        const d = b.dataset.copy; e.clip = { label: DAYS.find(x => x[0] === d)[1], slots: clone(e.days[d]) }; this._render();
      }));
      root.querySelectorAll('[data-paste-day]').forEach(b => b.addEventListener('click', () => this._paste([b.dataset.pasteDay])));
      root.querySelectorAll('[data-paste-group]').forEach(b => b.addEventListener('click', () => this._paste(GROUPS[+b.dataset.pasteGroup].days)));
      root.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
        const p = PRESETS[+b.dataset.preset]; e.clip = { label: p.label, slots: clone(p.slots) }; this._render();
      }));
      root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'cancel') this._endEdit();
        else if (a === 'reset') { e.days = clone(e.orig); this._render(); }
        else if (a === 'review') { e.confirm = true; this._render(); }
        else if (a === 'back') { e.confirm = false; this._render(); }
        else if (a === 'write') this._save();
      }));
      // clic sur une zone vide de la frise : ajoute une plage d'une heure
      root.querySelectorAll('.timeline.edit').forEach(tl => tl.addEventListener('click', ev => {
        if (ev.target !== tl) return;
        const r = tl.getBoundingClientRect();
        this._addSlot(tl.dataset.day, (ev.clientX - r.left) / r.width * 1440);
      }));
      // glisser les poignees : pas de 10 min, borne par les plages voisines
      root.querySelectorAll('.h').forEach(h => h.addEventListener('pointerdown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        const day = h.dataset.day, i = +h.dataset.i, edge = h.dataset.edge;
        const tl = h.closest('.timeline'), slotEl = h.parentElement, slots = e.days[day], s = slots[i];
        const lo = edge === 'debut' ? (i > 0 ? toMinutes(slots[i - 1].fin) : 0) : toMinutes(s.debut) + 10;
        const hi = edge === 'debut' ? toMinutes(s.fin) - 10 : (i < slots.length - 1 ? toMinutes(slots[i + 1].debut) : 1440);
        const inputs = root.querySelectorAll(`input[data-day="${day}"][data-i="${i}"]`);
        h.setPointerCapture(ev.pointerId);
        const move = (mv) => {
          const r = tl.getBoundingClientRect();
          let m = Math.round(((mv.clientX - r.left) / r.width * 1440) / 10) * 10;
          m = Math.max(lo, Math.min(hi, m));
          s[edge] = fmt(m);
          const a = toMinutes(s.debut), b = toMinutes(s.fin);
          slotEl.style.left = `${a / 14.4}%`; slotEl.style.width = `${(b - a) / 14.4}%`;
          inputs.forEach(inp => { inp.value = s[inp.dataset.f]; });
        };
        const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); this._render(); };
        h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      }));
    }

    // Onglets masqués : « Non disponible » = aucun programme horaire dédié sur cette PAC (normal) ; « Erreur » = lecture en échec.
    _hiddenNote(hidden) {
      if (!hidden.length) return '';
      const absent = hidden.filter(p => this._sensor(p)?.state === 'Non disponible');
      const failed = hidden.filter(p => !absent.includes(p));
      const names = (list) => list.map(p => esc(this._label(p))).join(', ');
      return (absent.length ? `<div class="foot">${names(absent)} : aucun programme horaire dédié sur cette PAC (fonctionnement sans plage horaire).</div>` : '')
        + (failed.length ? `<div class="foot">${names(failed)} : lecture impossible (capteur en erreur ou indisponible).</div>` : '');
    }
    _visiblePrograms() {
      return PROGRAMS.filter(program => {
        if (!program.key.startsWith('rafraichissement_')) return true;
        const sensor = this._sensor(program);
        return !!sensor && !['Erreur', 'Non disponible', 'unavailable', 'unknown'].includes(sensor.state);
      });
    }
    _render() {
      if (!this.shadowRoot) return;
      const visible = this._visiblePrograms();
      const selected = visible.find(p => p.key === this._selected) || visible[0] || PROGRAMS[0];
      this._selected = selected.key;
      const hidden = PROGRAMS.filter(p => !visible.includes(p));
      const sensor = this._sensor(selected);
      const button = this._button();
      let days = sensor?.attributes?.jours || {};
      let pendingNote = '';
      const opt = this._optimistic;
      if (opt && opt.key === selected.key) {
        if (Date.now() > opt.until || JSON.stringify(days) === JSON.stringify(opt.days)) this._optimistic = null;
        else { days = opt.days; pendingNote = 'Écrit dans la PAC · actualisation de l’affichage en cours'; }
      }
      const status = sensor?.state || 'Capteur non trouvé';
      const today = (new Date().getDay() + 6) % 7;
      const updated = sensor?.attributes?.derniere_importation;
      const error = sensor?.attributes?.erreur_derniere_lecture;
      const rows = DAYS.map(([key,label],index) => {
        const ranges = Array.isArray(days[key]) ? days[key] : [];
        const bars = ranges.map(range => {
          const start = toMinutes(range.debut), end = toMinutes(range.fin);
          if (start === null || end === null || end <= start) return '';
          const left = Math.max(0,Math.min(100,start/1440*100));
          const width = Math.max(0,Math.min(100-left,(end-start)/1440*100));
          return `<span class="slot" style="left:${left}%;width:${width}%"></span>`;
        }).join('');
        const labels = ranges.length
          ? ranges.map(r => `<span class="range">${esc(r.debut)}–${esc(r.fin)}</span>`).join('')
          : (Array.isArray(days[key]) ? '<span class="empty">Aucune plage</span>' : '<span class="empty">Non chargé</span>');
        return `<div class="day ${index === today ? 'today' : ''}">
          <div class="day-name">${esc(label)}${index === today ? '<small>Aujourd’hui</small>' : ''}</div>
          <div class="day-detail">
            <div class="timeline">${bars}</div>
            <div class="ranges">${labels}</div>
          </div>
        </div>`;
      }).join('');
      const editing = this._edit && this._edit.key === selected.key;
      if (this._edit && !editing) this._edit = null;
      const tabs = visible.map(p => {
        const s = this._sensor(p);
        return `<button class="tab ${p.key === selected.key ? 'selected' : ''}" data-tab="${p.key}" ${editing && p.key !== selected.key ? 'disabled' : ''}
          type="button" aria-pressed="${p.key === selected.key}">${esc(this._label(p))}${s?.state === 'Erreur' ? ' ⚠' : ''}</button>`;
      }).join('');
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;--program-color:${selected.color}}
          ha-card{padding:18px 18px 16px;color:var(--primary-text-color);background:var(--ha-card-background,var(--card-background-color))}
          .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
          h2{font-size:18px;font-weight:650;margin:0}
          .refresh{border:1px solid var(--divider-color);background:var(--secondary-background-color);
            color:var(--primary-text-color);padding:8px 12px;border-radius:10px;cursor:pointer}
          .refresh:disabled{opacity:.45;cursor:default}
          .tabs{display:flex;gap:7px;flex-wrap:wrap;margin:17px 0 14px}
          .tab{border:1px solid var(--divider-color);border-radius:11px;background:transparent;
            color:var(--primary-text-color);padding:10px 12px;cursor:pointer;font-size:13px}
          .tab.selected{border-color:var(--program-color);background:color-mix(in srgb,var(--program-color) 12%,transparent);font-weight:700}
          .meta{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--secondary-text-color);margin-bottom:13px}
          .state{font-weight:650;color:var(--primary-text-color)}
          .scale{display:grid;grid-template-columns:105px 1fr;gap:12px;align-items:center;margin:0 0 6px}
          .ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--secondary-text-color)}
          .days{display:grid;gap:5px}
          .day{display:grid;grid-template-columns:105px minmax(0,1fr);gap:12px;align-items:center;
            border-radius:10px;padding:9px 8px}
          .day:nth-child(odd){background:var(--secondary-background-color)}
          .day.today{outline:1px solid var(--program-color)}
          .day-name{font-size:13px;font-weight:600}
          .day-name small{display:block;font-size:10px;color:var(--secondary-text-color);font-weight:400}
          .day-detail{min-width:0}
          .timeline{position:relative;height:14px;background:var(--divider-color);border-radius:6px;overflow:hidden}
          .slot{position:absolute;top:0;bottom:0;background:var(--program-color);border-radius:4px}
          .ranges{display:flex;flex-wrap:wrap;gap:5px 11px;margin-top:6px;font-size:11px;font-variant-numeric:tabular-nums}
          .range{white-space:nowrap}
          .empty{color:var(--secondary-text-color)}
          .warning{font-size:12px;color:var(--error-color);margin-top:10px;overflow-wrap:anywhere}
          .setpoints{border:1px solid var(--divider-color);border-radius:12px;padding:10px 12px;margin:0 0 14px;display:grid;gap:7px}
          .sp-head{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:650}
          .sp-head small{font-weight:400;color:var(--secondary-text-color)}
          .sp-circuit{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:11px}
          .sp-circuit>strong{min-width:24px;font-size:12px}
          .sp-item{display:inline-flex;align-items:center;gap:4px;padding:2px 4px;border-radius:8px;background:var(--secondary-background-color)}
          .sp-item>span{color:var(--secondary-text-color)}
          .sp-item button{border:0;background:transparent;color:var(--primary-text-color);font:700 16px/1 inherit;width:24px;height:24px;border-radius:6px;cursor:pointer;padding:0}
          .sp-item button:hover{background:var(--divider-color)}
          .sp-item button:disabled{opacity:.35;cursor:default}
          .sp-item strong{min-width:53px;text-align:center;font-variant-numeric:tabular-nums;font-size:12px}
          .foot{font-size:11px;color:var(--secondary-text-color);margin-top:14px}
          .hbtns{display:flex;gap:8px;align-items:center}
          .pending{color:var(--program-color);font-weight:650}
          .edit-tag{font-size:12px;font-weight:700;color:var(--program-color);border:1px solid var(--program-color);border-radius:999px;padding:4px 10px}
          .tab:disabled{opacity:.4;cursor:default}
          .toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;margin:0 0 12px;padding:8px 10px;border:1px dashed var(--divider-color);border-radius:10px}
          .tb-label{color:var(--secondary-text-color)} .toolbar .sep{flex-basis:100%;height:0}
          .mini{border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer}
          .mini:hover{border-color:var(--program-color)} .mini.add{color:var(--program-color)}
          .timeline.edit{height:22px;cursor:copy;overflow:visible}
          .slot.edit{cursor:default;opacity:.9}
          .h{position:absolute;top:-3px;bottom:-3px;width:12px;background:var(--primary-text-color);opacity:.0;border-radius:4px;cursor:ew-resize;touch-action:none}
          .h.start{left:-6px} .h.end{right:-6px}
          .slot.edit:hover .h,.h:active{opacity:.55}
          @media (pointer:coarse){.h{opacity:.35;width:18px}.h.start{left:-9px}.h.end{right:-9px}}
          .slots-edit{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:7px;font-size:12px}
          .se{display:inline-flex;align-items:center;gap:3px;background:var(--secondary-background-color);border-radius:8px;padding:2px 4px}
          .se input{width:46px;font:inherit;font-variant-numeric:tabular-nums;text-align:center;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:3px 2px}
          .day.changed{box-shadow:inset 3px 0 0 var(--program-color)}
          .day.invalid{box-shadow:inset 3px 0 0 var(--error-color)}
          .row-err{font-size:11px;color:var(--error-color);margin-top:5px}
          .actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
          .btn{border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13px}
          .btn.primary{background:var(--program-color);border-color:var(--program-color);color:#fff;font-weight:700}
          .btn:disabled{opacity:.45;cursor:default}
          .confirm{margin-top:12px;border:1px solid var(--program-color);border-radius:12px;padding:12px}
          .c-title{font-weight:700;font-size:13px;margin-bottom:6px} .confirm ul{margin:0 0 8px;padding-left:18px;font-size:12px;line-height:1.6}
          .confirm .new{color:var(--program-color);font-weight:650} .c-note{font-size:11px;color:var(--secondary-text-color)}
          @media(max-width:440px){
            ha-card{padding:14px 10px}
            .day,.scale{grid-template-columns:72px minmax(0,1fr);gap:6px}
            .day{padding:9px 5px}
            .day-name{font-size:12px}
            .tab{padding:9px 8px;font-size:12px}
          }
        </style>
        <ha-card>
          <div class="header"><h2>${esc(this._config.title || 'Programmes horaires PAC')}</h2>
            <span class="hbtns">
            ${!editing && this._canEdit(selected, sensor) ? '<button type="button" class="refresh edit-btn">✎ Modifier</button>' : ''}
            ${editing ? '<span class="edit-tag">Mode édition</span>' : `<button type="button" class="refresh" ${!button || button.state === 'unavailable' || this._refreshing ? 'disabled' : ''}>
              ${this._refreshing ? 'Actualisation…' : '↻ Actualiser'}
            </button>`}</span>
          </div>
          <div class="tabs">${tabs}</div>
          <div class="meta"><span class="state">${esc(status)}</span>
            <span>${updated ? 'Dernière importation : '+esc(updated.replace('T',' ')) : 'Aucune importation'}</span>
            ${pendingNote ? `<span class="pending">${pendingNote}</span>` : ''}
          </div>
          ${this._setpointHtml(selected)}
          ${editing ? this._editHtml(selected) : `<div class="scale"><span></span><div class="ticks"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div></div>
          <div class="days">${rows}</div>`}
          ${error ? `<div class="warning">Dernière lecture : ${esc(error)}</div>` : ''}
          ${this._lastError ? `<div class="warning">Actualisation : ${esc(this._lastError)}</div>` : ''}
          ${this._hiddenNote(hidden)}
          <div class="foot">Horaires natifs de la PAC · ${editing ? 'pas de 10 min, 3 plages max par jour · glisser les poignées ou saisir HH:MM' : 'consignes C1/C2 modifiables via les entités Atlantic'}</div>
        </ha-card>`;
      this.shadowRoot.querySelectorAll('[data-tab]').forEach(el =>
        el.addEventListener('click', () => {this._selected=el.dataset.tab;this._render();})
      );
      this.shadowRoot.querySelector('.refresh:not(.edit-btn)')?.addEventListener('click', () => this._refresh());
      this.shadowRoot.querySelector('.edit-btn')?.addEventListener('click', () => this._startEdit(selected, days));
      if (editing) this._bindEdit(this.shadowRoot);
      this.shadowRoot.querySelectorAll('[data-sp]').forEach(el =>
        el.addEventListener('click', () => this._changeSetpoint(el.dataset.sp, Number(el.dataset.delta)))
      );
      this._signatureCache = this._signature();
    }
  }
  customElements.define(TAG,PacProgrammesCard);

  // Éditeur visuel : titre et noms (facultatifs : par défaut ceux de l'intégration)
  class PacProgrammesCardEditor extends HTMLElement {
    setConfig(config) { this._config = config || {}; this._render(); }
    set hass(hass) { this._hass = hass; this._render(); }
    _render() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        this._form = document.createElement('ha-form');
        this._form.computeLabel = (s) => ({
          title: 'Titre',
          circuit_1_name: 'Nom du circuit 1 (vide = nom défini dans l’intégration)',
          circuit_2_name: 'Nom du circuit 2 (vide = nom défini dans l’intégration)',
        })[s.name] || s.name;
        this._form.addEventListener('value-changed', (ev) => {
          const v = { ...ev.detail.value };
          for (const k of ['title', 'circuit_1_name', 'circuit_2_name']) if (!String(v[k] || '').trim()) delete v[k];
          this._config = { type: this._config.type, ...v };
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = [
        { name: 'title', selector: { text: {} } },
        { type: 'grid', name: '', schema: [{ name: 'circuit_1_name', selector: { text: {} } }, { name: 'circuit_2_name', selector: { text: {} } }] },
      ];
      this._form.data = { ...this._config };
    }
  }
  if (!customElements.get('pac-programmes-card-editor')) customElements.define('pac-programmes-card-editor', PacProgrammesCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type:TAG,name:'PAC — Programmes horaires natifs',
    description:'Programmes horaires natifs chauffage C1, C2 et ECS via BSB-LAN, avec mode édition (écriture vérifiée).'
  });
})();