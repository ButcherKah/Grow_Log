/* ═══════════════════════════════════════════════════
   GROWLOG v2 — app.js
   DB · Utils · RefTables · Light · VPD · Countdown
   ActionType · Entry · UI · DetailTabs · Timeline
   Render · Modals · App · HarvestReport · Init
═══════════════════════════════════════════════════ */
'use strict';

/* ═══════════════════════════════════════════════
   DB — IndexedDB via wrapper leve (fallback localStorage)
═══════════════════════════════════════════════ */
const DB = (() => {
  const LS_KEY = 'growlog_v2';
  let _data = { plants: [] };
  let _idb = null;
  let _ready = false;

  // Tenta abrir IndexedDB; se falhar usa localStorage
  async function init() {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open('growlog', 2);
        req.onupgradeneeded = ev => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv');
          }
        };
        req.onsuccess = ev => {
          _idb = ev.target.result;
          _ready = true;
          resolve(true);
        };
        req.onerror = () => { _ready = false; resolve(false); };
      } catch {
        _ready = false;
        resolve(false);
      }
    });
  }

  async function load() {
    await init();
    if (_idb) {
      return new Promise(resolve => {
        const tx = _idb.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get('data');
        req.onsuccess = () => {
          if (req.result) _data = req.result;
          if (!Array.isArray(_data.plants)) _data.plants = [];
          resolve();
        };
        req.onerror = () => {
          _loadFromLS();
          resolve();
        };
      });
    } else {
      _loadFromLS();
    }
  }

  function _loadFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) _data = JSON.parse(raw);
      if (!Array.isArray(_data.plants)) _data.plants = [];
    } catch { _data = { plants: [] }; }
  }

  function save() {
    if (_idb) {
      try {
        const tx = _idb.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(_data, 'data');
      } catch { _saveToLS(); }
    } else {
      _saveToLS();
    }
    // Sempre salva no LS como fallback secundário
    _saveToLS();
  }

  function _saveToLS() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_data)); } catch {}
  }

  function get() { return _data; }
  function getPlant(id) { return _data.plants.find(p => p.id === id) || null; }

  function upsertPlant(plant) {
    const idx = _data.plants.findIndex(p => p.id === plant.id);
    if (idx >= 0) _data.plants[idx] = plant;
    else _data.plants.push(plant);
    save();
  }

  function deletePlant(id) {
    _data.plants = _data.plants.filter(p => p.id !== id);
    save();
  }

  function replaceFull(newData) {
    _data = newData;
    save();
  }

  return { load, save, get, getPlant, upsertPlant, deletePlant, replaceFull };
})();


/* ═══════════════════════════════════════════════
   UTILS — helpers gerais
═══════════════════════════════════════════════ */
const Utils = (() => {
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function nowTime() { return new Date().toTimeString().slice(0, 5); }

  function daysBetween(startIso, endIso) {
    const a = new Date(startIso + 'T00:00:00');
    const b = new Date(endIso + 'T00:00:00');
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }

  function daysAlive(plant, asOf) {
    if (!plant.startDate) return 0;
    return daysBetween(plant.startDate, asOf || today());
  }

  function weekInStage(plant, asOf) {
    const ref = asOf || today();
    const stageStart = plant.stageStartDate || plant.startDate;
    if (!stageStart) return 1;
    return Math.max(1, Math.floor(daysBetween(stageStart, ref) / 7) + 1);
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function download(content, filename, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const STAGE_LABELS = {
    germinacao:'Germinação', plantula:'Plântula',
    vegetativo:'Vegetativo', floracao:'Floração', colheita:'Colheita',
  };
  const STAGE_EMOJI = {
    germinacao:'🌰', plantula:'🌱', vegetativo:'🍃',
    floracao:'🌸', colheita:'✂️',
  };

  function stageLabel(s) { return STAGE_LABELS[s] || s || '—'; }
  function stageEmoji(s) { return STAGE_EMOJI[s] || '🌿'; }

  return { uid, today, nowTime, daysBetween, daysAlive, weekInStage,
           fmtDate, esc, download, stageLabel, stageEmoji };
})();


/* ═══════════════════════════════════════════════
   REF TABLES — tabelas de referência por semana
   Fonte: PDFs anexados pelo cultivador
═══════════════════════════════════════════════ */
const RefTables = (() => {

  // Automáticas
  const AUTO = {
    vpd: [
      null, // idx 0 não usado (semanas começam em 1)
      { min:0.4, max:0.8 },   // sem 1
      { min:0.5, max:0.8 },   // sem 2
      { min:0.6, max:0.9 },   // sem 3
      { min:0.8, max:1.0 },   // sem 4
      { min:0.9, max:1.1 },   // sem 5
      { min:1.0, max:1.2 },   // sem 6
      { min:1.1, max:1.3 },   // sem 7
      { min:1.2, max:1.4 },   // sem 8
      { min:1.2, max:1.5 },   // sem 9
      { min:1.3, max:1.5 },   // sem 10+
    ],
    ur: [
      null,
      { min:70, max:80 }, { min:65, max:75 }, { min:60, max:70 },
      { min:58, max:68 }, { min:55, max:65 }, { min:50, max:60 },
      { min:45, max:55 }, { min:40, max:50 }, { min:40, max:48 },
      { min:35, max:45 },
    ],
    temp: [
      null,
      { min:24, max:26 }, { min:24, max:27 }, { min:24, max:27 },
      { min:24, max:28 }, { min:24, max:28 }, { min:24, max:28 },
      { min:23, max:27 }, { min:22, max:27 }, { min:22, max:26 },
      { min:21, max:26 },
    ],
    // EC: agrupado por semanas
    ec: [
      { weeks:[1,2],  min:0.2, max:0.5 },
      { weeks:[3,4],  min:0.5, max:1.2 },
      { weeks:[5,6],  min:1.2, max:2.0 },
      { weeks:[7,8],  min:1.8, max:2.4 },
      { weeks:[9,10], min:2.0, max:2.8 },
      { weeks:'11+',  min:0.2, max:0.8 },
    ],
    ppm: [
      { weeks:[1,2],  min:100,  max:250  },
      { weeks:[3,4],  min:250,  max:600  },
      { weeks:[5,6],  min:600,  max:1000 },
      { weeks:[7,8],  min:900,  max:1300 },
      { weeks:[9,10], min:1000, max:1400 },
      { weeks:'11+',  min:100,  max:400  },
    ],
    ph: [
      { weeks:[1,2],  min:5.8, max:6.0 },
      { weeks:[3,4],  min:5.8, max:6.1 },
      { weeks:[5,6],  min:5.9, max:6.2 },
      { weeks:[7,8],  min:6.0, max:6.3 },
      { weeks:[9,10], min:6.1, max:6.4 },
      { weeks:'11+',  min:6.0, max:6.3 },
    ],
  };

  // Fotoperíodo
  const FOTO = {
    vpd: [
      null,
      { min:0.4, max:0.8 }, { min:0.5, max:0.8 }, { min:0.6, max:0.9 },
      { min:0.7, max:1.0 }, { min:0.8, max:1.1 }, { min:0.9, max:1.2 },
      { min:1.0, max:1.2 }, { min:1.0, max:1.3 }, { min:1.1, max:1.3 },
      { min:1.1, max:1.4 }, { min:1.2, max:1.4 }, { min:1.2, max:1.5 },
      { min:1.3, max:1.5 }, { min:1.3, max:1.6 },
    ],
    ur: [
      null,
      { min:70, max:80 }, { min:65, max:75 }, { min:60, max:70 },
      { min:58, max:68 }, { min:55, max:65 }, { min:50, max:60 },
      { min:50, max:58 }, { min:48, max:55 }, { min:45, max:55 },
      { min:45, max:52 }, { min:42, max:50 }, { min:40, max:48 },
      { min:38, max:45 }, { min:35, max:45 },
    ],
    temp: [
      null,
      { min:24, max:26 }, { min:24, max:27 }, { min:24, max:27 },
      { min:24, max:28 }, { min:24, max:28 }, { min:24, max:28 },
      { min:24, max:28 }, { min:24, max:28 }, { min:23, max:28 },
      { min:23, max:27 }, { min:22, max:27 }, { min:22, max:27 },
      { min:21, max:26 }, { min:20, max:26 },
    ],
    ec: [
      { weeks:[1,2],   min:0.2, max:0.5 },
      { weeks:[3,4],   min:0.5, max:1.0 },
      { weeks:[5,6],   min:1.0, max:1.6 },
      { weeks:[7,8],   min:1.6, max:2.2 },
      { weeks:[9,10],  min:1.8, max:2.4 },
      { weeks:[11,13], min:2.0, max:2.8 },
      { weeks:[14,16], min:2.4, max:3.2 },
      { weeks:'17+',   min:0.2, max:0.8 },
    ],
    ppm: [
      { weeks:[1,2],   min:100,  max:250  },
      { weeks:[3,4],   min:250,  max:500  },
      { weeks:[5,6],   min:500,  max:800  },
      { weeks:[7,8],   min:800,  max:1100 },
      { weeks:[9,10],  min:900,  max:1200 },
      { weeks:[11,13], min:1100, max:1400 },
      { weeks:[14,16], min:1300, max:1600 },
      { weeks:'17+',   min:100,  max:400  },
    ],
    ph: [
      { weeks:[1,2],   min:5.8, max:6.0 },
      { weeks:[3,4],   min:5.8, max:6.1 },
      { weeks:[5,6],   min:5.9, max:6.2 },
      { weeks:[7,8],   min:6.0, max:6.2 },
      { weeks:[9,10],  min:6.0, max:6.3 },
      { weeks:[11,13], min:6.1, max:6.4 },
      { weeks:[14,16], min:6.2, max:6.5 },
      { weeks:'17+',   min:6.0, max:6.3 },
    ],
  };

  function _getTable(type) { return type === 'foto' ? FOTO : AUTO; }

  // Retorna faixa para parâmetros por índice direto (vpd, ur, temp)
  function _rangeByWeek(arr, week) {
    const idx = Math.min(week, arr.length - 1);
    return arr[idx] || arr[arr.length - 1];
  }

  // Retorna faixa para parâmetros agrupados (ec, ppm, ph)
  function _rangeGrouped(groups, week) {
    for (const g of groups) {
      if (g.weeks === '11+' || g.weeks === '17+') return g;
      if (Array.isArray(g.weeks)) {
        if (week >= g.weeks[0] && week <= g.weeks[1]) return g;
      }
    }
    return groups[groups.length - 1];
  }

  // Avalia um valor e retorna { status, label, range }
  // status: 'ok' | 'low' | 'high' | 'unknown'
  function evaluate(param, value, plantType, week) {
    if (value === null || value === undefined || isNaN(value)) {
      return { status: 'unknown', label: '—', range: null };
    }
    const tbl = _getTable(plantType);
    let range;

    if (param === 'vpd')  range = _rangeByWeek(tbl.vpd,  week);
    if (param === 'ur')   range = _rangeByWeek(tbl.ur,   week);
    if (param === 'temp') range = _rangeByWeek(tbl.temp, week);
    if (param === 'ec')   range = _rangeGrouped(tbl.ec,  week);
    if (param === 'ppm')  range = _rangeGrouped(tbl.ppm, week);
    if (param === 'ph')   range = _rangeGrouped(tbl.ph,  week);

    if (!range) return { status: 'unknown', label: '—', range: null };

    const tolerance = (range.max - range.min) * 0.1;
    let status;
    if (value < range.min - tolerance) status = 'low';
    else if (value > range.max + tolerance) status = 'high';
    else if (value < range.min || value > range.max) status = 'warn';
    else status = 'ok';

    const rangeLabel = `${range.min}–${range.max}`;
    const icons = { ok: '🟢', warn: '🟡', low: '🔴', high: '🔴' };
    return { status, label: `${icons[status]} ${rangeLabel}`, range };
  }

  // Retorna badge HTML para exibição inline
  function badge(param, value, plantType, week) {
    if (!week || week < 1) return '';
    const ev = evaluate(param, value, plantType, week);
    if (ev.status === 'unknown') return '';
    const cls = ev.status === 'ok' ? 'ref-ok' : ev.status === 'warn' ? 'ref-warn' : 'ref-bad';
    return `<span class="ref-badge ${cls}" title="Referência sem ${week} (${plantType === 'foto' ? 'foto' : 'auto'}): ${ev.range.min}–${ev.range.max}">${ev.label}</span>`;
  }

  return { evaluate, badge, AUTO, FOTO };
})();


/* ═══════════════════════════════════════════════
   LIGHT — Lux → PPFD → DLI
═══════════════════════════════════════════════ */
const Light = (() => {
  const LUX_PPFD_FACTOR = 0.0185;

  function luxToPPFD(lux) { return Math.round(lux * LUX_PPFD_FACTOR); }
  function calcDLI(ppfd, hoursOn) {
    return parseFloat(((ppfd * hoursOn * 3600) / 1_000_000).toFixed(2));
  }
  function parseTimeHours(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
  }
  function photoperiodHours(onTime, offTime) {
    const on = parseTimeHours(onTime), off = parseTimeHours(offTime);
    if (on === null || off === null) return null;
    let h = off - on;
    if (h <= 0) h += 24;
    return h;
  }

  function recalc() {
    const luxVal  = parseFloat(document.getElementById('ef-lux').value);
    const onTime  = document.getElementById('ef-ledon').value;
    const offTime = document.getElementById('ef-ledoff').value;
    const ppfdEl  = document.getElementById('ef-ppfd-auto');
    const dliEl   = document.getElementById('ef-dli-auto');
    const fbEl    = document.getElementById('light-feedback');
    let ppfd = null, dli = null;
    const lines = [];

    if (!isNaN(luxVal) && luxVal > 0) {
      ppfd = luxToPPFD(luxVal);
      ppfdEl.textContent = ppfd + ' µmol/m²/s';
      ppfdEl.classList.remove('dim');
      lines.push(`✅ PPFD: <strong>${ppfd} µmol/m²/s</strong>`);
    } else {
      ppfdEl.textContent = '— preencha Lux';
      ppfdEl.classList.add('dim');
    }

    const hours = photoperiodHours(onTime, offTime);
    if (ppfd !== null && hours !== null) {
      dli = calcDLI(ppfd, hours);
      dliEl.textContent = dli + ' mol/m²/d';
      dliEl.classList.remove('dim');
      lines.push(`📅 ${hours.toFixed(1)}h → DLI: <strong>${dli}</strong>`);
    } else {
      dliEl.textContent = ppfd ? '— preencha horários' : '— preencha horas';
      dliEl.classList.add('dim');
    }

    if (lines.length) { fbEl.innerHTML = lines.join('<br>'); fbEl.classList.remove('hidden'); }
    else fbEl.classList.add('hidden');
    return { ppfd, dli };
  }

  return { luxToPPFD, calcDLI, photoperiodHours, recalc };
})();


/* ═══════════════════════════════════════════════
   VPD — Vapour Pressure Deficit
═══════════════════════════════════════════════ */
const VPD = (() => {
  function calcSVP(t) { return 0.6108 * Math.exp((17.27 * t) / (t + 237.3)); }
  function calc(tempC, rh) {
    return parseFloat((calcSVP(tempC) * (1 - rh / 100)).toFixed(2));
  }
  function zone(vpd, stage) {
    const zones = {
      germinacao:{ low:0.4, high:0.8 }, plantula:{ low:0.4, high:0.8 },
      vegetativo:{ low:0.8, high:1.2 }, floracao:{ low:1.2, high:1.6 },
      colheita:  { low:1.2, high:1.6 },
    };
    const z = zones[stage] || zones.vegetativo;
    if (vpd < z.low - 0.1)   return { label:'🔵 Muito baixo',    cls:'vpd-low',    color:'#5ca8e0' };
    if (vpd < z.low)         return { label:'🟢 Abaixo do ideal',cls:'vpd-ok-low', color:'#3ddc6a' };
    if (vpd <= z.high)       return { label:'✅ Zona ideal',      cls:'vpd-ideal',  color:'#3ddc6a' };
    if (vpd <= z.high + 0.2) return { label:'🟡 Acima do ideal', cls:'vpd-ok-high',color:'#f5a623' };
    return { label:'🔴 Muito alto', cls:'vpd-high', color:'#e05c5c' };
  }

  function recalc() {
    const temp = parseFloat(document.getElementById('ef-temp').value);
    const rh   = parseFloat(document.getElementById('ef-ur').value);
    const vpdEl  = document.getElementById('ef-vpd-auto');
    const zoneEl = document.getElementById('ef-vpd-zone');
    if (isNaN(temp) || isNaN(rh)) {
      vpdEl.textContent = '— preencha T° e UR'; vpdEl.classList.add('dim');
      zoneEl.textContent = '—'; zoneEl.classList.add('dim');
      return;
    }
    const vpd = calc(temp, rh);
    const plant = DB.getPlant(App.activePlantId());
    const stage = UI.getPill('entry-stage-group') || plant?.stage || 'vegetativo';
    const zoneInfo = zone(vpd, stage);
    vpdEl.textContent = vpd + ' kPa'; vpdEl.classList.remove('dim');
    vpdEl.style.color = zoneInfo.color;
    zoneEl.textContent = zoneInfo.label; zoneEl.classList.remove('dim');
    zoneEl.style.color = zoneInfo.color;
  }

  return { calc, zone, recalc };
})();


/* ═══════════════════════════════════════════════
   COUNTDOWN
═══════════════════════════════════════════════ */
const Countdown = (() => {
  function render(plant) {
    const card = document.getElementById('countdown-card');
    const veg  = parseInt(plant.vegWeeks)    || 0;
    const flor = parseInt(plant.flowerWeeks) || 0;
    if ((!veg && !flor) || !plant.startDate) { card.classList.add('hidden'); return; }

    const totalDays = (veg + flor) * 7;
    const daysLived = Utils.daysAlive(plant);
    const daysRemaining = Math.max(0, totalDays - daysLived);
    const pct = Math.min(100, Math.round((daysLived / totalDays) * 100));

    const harvestDate = new Date(plant.startDate + 'T00:00:00');
    harvestDate.setDate(harvestDate.getDate() + totalDays);
    const dateStr = harvestDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });

    document.getElementById('countdown-date').textContent = dateStr;
    document.getElementById('countdown-days').textContent = daysRemaining;
    document.getElementById('countdown-unit').textContent = daysRemaining === 1 ? 'dia' : 'dias';
    document.getElementById('countdown-bar').style.width  = pct + '%';
    const bar = document.getElementById('countdown-bar');
    bar.style.background = pct >= 90 ? '#e05c5c' : pct >= 70 ? '#f5a623' : '#3ddc6a';
    card.classList.remove('hidden');
  }
  return { render };
})();


/* ═══════════════════════════════════════════════
   WATERING — próxima rega
═══════════════════════════════════════════════ */
const Watering = (() => {
  // Retorna { next: 'com'|'sem', daysAgo: N, label }
  function nextWatering(plant) {
    const withN = parseInt(plant.cycleWith)    || 2;
    const withoutN = parseInt(plant.cycleWithout) || 1;
    const total = withN + withoutN;

    const waterings = (plant.entries || [])
      .filter(e => e.actionType === 'rega' || e.water)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (waterings.length === 0) {
      return { next: 'com', label: 'Próxima rega: 💧 com nutriente (sem histórico)' };
    }

    // Calcula posição no ciclo com base no número de regas registradas
    const count = waterings.length;
    const posInCycle = count % total; // 0..total-1
    const next = posInCycle < withN ? 'com' : 'sem';

    const lastWatering = waterings[waterings.length - 1];
    const daysAgo = Utils.daysBetween(lastWatering.date, Utils.today());

    const daysStr = daysAgo === 0 ? 'hoje' : daysAgo === 1 ? 'há 1 dia' : `há ${daysAgo} dias`;
    const icon = next === 'com' ? '💧🧪' : '💧';
    const txt  = next === 'com' ? 'com nutriente' : 'sem nutriente';

    return {
      next,
      daysAgo,
      lastDate: lastWatering.date,
      label: `Próxima rega: ${icon} ${txt}`,
      sub: `Última rega ${daysStr} · Ciclo ${withN}+${withoutN}`,
    };
  }

  function renderCard(plant) {
    const card = document.getElementById('watering-card');
    if (!card) return;
    const entries = plant.entries || [];
    const hasAnyWatering = entries.some(e => e.actionType === 'rega' || e.water);

    const info = nextWatering(plant);
    const withN   = parseInt(plant.cycleWith)    || 2;
    const withoutN = parseInt(plant.cycleWithout) || 1;

    const dotClass = info.next === 'com' ? 'wcard-dot-com' : 'wcard-dot-sem';
    card.innerHTML = `
      <div class="wcard-left">
        <span class="wcard-label">Próxima rega</span>
        <span class="wcard-next ${dotClass}">${info.next === 'com' ? '💧🧪 com nutriente' : '💧 sem nutriente'}</span>
        <span class="wcard-sub">${hasAnyWatering ? info.sub : 'Sem regas registradas'}</span>
      </div>
      <div class="wcard-cycle">
        <span class="wcard-cycle-num">${withN}</span>
        <span class="wcard-cycle-sep">+</span>
        <span class="wcard-cycle-num">${withoutN}</span>
      </div>`;
    card.classList.remove('hidden');
  }

  return { nextWatering, renderCard };
})();


/* ═══════════════════════════════════════════════
   ACTION TYPE
═══════════════════════════════════════════════ */
const ActionType = (() => {
  const SECTION_MAP = {
    geral:       ['ef-ambiente', 'ef-luz', 'ef-rega'],
    rega:        ['ef-ambiente', 'ef-rega'],
    clima:       ['ef-ambiente', 'ef-luz'],
    luz:         ['ef-luz'],
    poda:        ['af-poda'],
    lst:         ['af-lst'],
    defoliacao:  ['af-poda'],
    transplante: ['af-transplante'],
    flush:       ['af-flush', 'ef-rega'],
    runoff:      ['af-runoff'],
  };
  const ALL_SECTIONS = ['ef-ambiente','ef-luz','ef-rega','af-poda','af-lst','af-transplante','af-flush','af-runoff'];

  function select(btn) {
    document.querySelectorAll('#action-type-grid .atype-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.v;
    if (type === 'defoliacao') UI.setPill('af-poda-type', 'defoliacao');
    else if (type === 'poda')  UI.setPill('af-poda-type', 'topping');
    const visible = SECTION_MAP[type] || SECTION_MAP.geral;
    ALL_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !visible.includes(id));
    });
    const labels = {
      geral:'Novo Registro', rega:'💧 Rega', clima:'🌡️ Clima',
      luz:'💡 Luz', poda:'✂️ Poda', lst:'🪢 LST',
      defoliacao:'🍃 Defoliação', transplante:'🪴 Transplante',
      flush:'🚿 Flush', runoff:'🧪 Runoff',
    };
    document.getElementById('me-title').textContent = labels[type] || 'Novo Registro';
  }

  function getSelected() {
    return document.querySelector('#action-type-grid .atype-btn.active')?.dataset.v || 'geral';
  }

  function reset() {
    const btn = document.querySelector('#action-type-grid .atype-btn[data-v="geral"]');
    if (btn) select(btn);
  }

  function preset(type) {
    const btn = document.querySelector(`#action-type-grid .atype-btn[data-v="${type}"]`);
    if (btn) select(btn);
  }

  function getActionData(type) {
    switch (type) {
      case 'poda': case 'defoliacao':
        return { podaTecnica: UI.getPill('af-poda-type'), podaNodes: parseInt(document.getElementById('af-poda-nodes').value) || null };
      case 'lst':
        return { lstTecnica: UI.getPill('af-lst-type'), lstDesc: document.getElementById('af-lst-desc').value.trim() || null };
      case 'transplante':
        return { tpFrom: parseFloat(document.getElementById('af-tp-from').value) || null, tpTo: parseFloat(document.getElementById('af-tp-to').value) || null, tpSubstrate: document.getElementById('af-tp-substrate').value.trim() || null };
      case 'flush':
        return { flushVol: parseFloat(document.getElementById('af-flush-vol').value) || null, flushPh: parseFloat(document.getElementById('af-flush-ph').value) || null };
      case 'runoff':
        return { roPh: parseFloat(document.getElementById('af-ro-ph').value) || null, roEc: parseFloat(document.getElementById('af-ro-ec').value) || null };
      default: return {};
    }
  }

  function clearActionFields() {
    ['af-poda-nodes','af-lst-desc','af-tp-from','af-tp-to','af-tp-substrate','af-flush-vol','af-flush-ph','af-ro-ph','af-ro-ec']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    UI.initPills('af-poda-type');
    UI.initPills('af-lst-type');
  }

  return { select, getSelected, reset, preset, getActionData, clearActionFields };
})();


/* ═══════════════════════════════════════════════
   ENTRY — formulário de registro
═══════════════════════════════════════════════ */
const Entry = (() => {
  let _nutrients = [];

  function autoProgress() {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    const date = document.getElementById('ef-date').value;
    if (!date) return;
    document.getElementById('ef-days-auto').textContent  = Utils.daysAlive(plant, date) + ' dias';
    document.getElementById('ef-weeks-auto').textContent = 'Sem. ' + Utils.weekInStage(plant, date);
  }

  function addNutrient() {
    const name = document.getElementById('nut-name').value.trim();
    const qty  = parseFloat(document.getElementById('nut-qty').value) || null;
    if (!name) return;
    _nutrients.push({ name, qty });
    document.getElementById('nut-name').value = '';
    document.getElementById('nut-qty').value  = '';
    _renderNutTags();
  }

  function removeNutrient(idx) {
    _nutrients.splice(idx, 1);
    _renderNutTags();
  }

  function _renderNutTags() {
    document.getElementById('nut-tags').innerHTML = _nutrients
      .map((n, i) => `<span class="nut-tag">${Utils.esc(n.name)}${n.qty ? ' '+n.qty+' ml/L' : ''}<span class="nut-tag-rm" onclick="Entry.removeNutrient(${i})">✕</span></span>`)
      .join('');
  }

  function reset(plantId, entryData) {
    _nutrients = entryData?.nutrients ? [...entryData.nutrients] : [];
    const plant = DB.getPlant(plantId);
    const dateStr = entryData?.date || Utils.today();

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    setVal('ef-date',   dateStr);
    setVal('ef-time',   entryData?.time   || Utils.nowTime());
    setVal('ef-temp',   entryData?.temp   || '');
    setVal('ef-ur',     entryData?.ur     || '');
    setVal('ef-lux',    entryData?.lux    || '');
    setVal('ef-dimmer', entryData?.dimmer || '');
    setVal('ef-dist',   entryData?.dist   || '');
    setVal('ef-ledon',  entryData?.ledon  || '');
    setVal('ef-ledoff', entryData?.ledoff || '');
    setVal('ef-water',  entryData?.water  || '');
    setVal('ef-ec',     entryData?.ec     || '');
    setVal('ef-ph',     entryData?.ph     || '');
    setVal('ef-obs',    entryData?.obs    || '');
    setVal('nut-name',  '');
    setVal('nut-qty',   '');

    _renderNutTags();

    // Computed resets
    ['ef-ppfd-auto','ef-dli-auto'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.classList.add('dim'); }
    });
    document.getElementById('light-feedback')?.classList.add('hidden');

    const vpdEl  = document.getElementById('ef-vpd-auto');
    const zoneEl = document.getElementById('ef-vpd-zone');
    if (vpdEl)  { vpdEl.textContent = '—'; vpdEl.classList.add('dim'); vpdEl.style.color = ''; }
    if (zoneEl) { zoneEl.textContent = '—'; zoneEl.classList.add('dim'); zoneEl.style.color = ''; }

    // Se editando, recalcula
    if (entryData?.lux)  Light.recalc();
    if (entryData?.temp && entryData?.ur) VPD.recalc();

    UI.resetToggle('tgl-water', 'water-fields');
    UI.resetToggle('tgl-nut',   'nut-fields');

    // Se editando e tinha rega/nutrientes, abre os toggles
    if (entryData?.water) UI.forceToggle('tgl-water', 'water-fields');
    if (entryData?.nutrients?.length) UI.forceToggle('tgl-nut', 'nut-fields');

    ActionType.reset();
    ActionType.clearActionFields();

    if (entryData?.actionType) {
      const btn = document.querySelector(`#action-type-grid .atype-btn[data-v="${entryData.actionType}"]`);
      if (btn) ActionType.select(btn);
    }

    const stage = entryData?.stage || (plant && plant.stage) || 'vegetativo';
    UI.setPill('entry-stage-group', stage);

    // Preenche campos de ação específicos se editando
    if (entryData) {
      const setIfEl = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
      setIfEl('af-poda-nodes', entryData.podaNodes);
      setIfEl('af-lst-desc',   entryData.lstDesc);
      setIfEl('af-tp-from',    entryData.tpFrom);
      setIfEl('af-tp-to',      entryData.tpTo);
      setIfEl('af-tp-substrate', entryData.tpSubstrate);
      setIfEl('af-flush-vol',  entryData.flushVol);
      setIfEl('af-flush-ph',   entryData.flushPh);
      setIfEl('af-ro-ph',      entryData.roPh);
      setIfEl('af-ro-ec',      entryData.roEc);
      if (entryData.podaTecnica) UI.setPill('af-poda-type', entryData.podaTecnica);
      if (entryData.lstTecnica)  UI.setPill('af-lst-type',  entryData.lstTecnica);
    }

    if (plant) {
      document.getElementById('ef-days-auto').textContent  = Utils.daysAlive(plant, dateStr) + ' dias';
      document.getElementById('ef-weeks-auto').textContent = 'Sem. ' + Utils.weekInStage(plant, dateStr);
    } else {
      document.getElementById('ef-days-auto').textContent  = '—';
      document.getElementById('ef-weeks-auto').textContent = '—';
    }
  }

  function getNutrients() { return [..._nutrients]; }
  return { autoProgress, addNutrient, removeNutrient, reset, getNutrients };
})();


/* ═══════════════════════════════════════════════
   UI — utilitários de interface
═══════════════════════════════════════════════ */
const UI = (() => {
  let _confirmResolve = null, _toastTimer = null;

  function setPill(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.v === value));
  }

  function getPill(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return '';
    return group.querySelector('.pill.active')?.dataset.v || '';
  }

  function initPills(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function toggle(btnId, sectionId) {
    const btn = document.getElementById(btnId), sec = document.getElementById(sectionId);
    if (!btn || !sec) return;
    const on = !btn.classList.contains('on');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
    sec.classList.toggle('open', on);
  }

  function resetToggle(btnId, sectionId) {
    const btn = document.getElementById(btnId), sec = document.getElementById(sectionId);
    if (!btn || !sec) return;
    btn.classList.remove('on'); btn.setAttribute('aria-checked', 'false');
    sec.classList.remove('open');
  }

  function forceToggle(btnId, sectionId) {
    const btn = document.getElementById(btnId), sec = document.getElementById(sectionId);
    if (!btn || !sec) return;
    btn.classList.add('on'); btn.setAttribute('aria-checked', 'true');
    sec.classList.add('open');
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function confirm(title, msg) {
    return new Promise(resolve => {
      _confirmResolve = resolve;
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent   = msg;
      Modals.open('modal-confirm');
    });
  }

  function resolveConfirm(ok) {
    Modals.close('modal-confirm');
    if (_confirmResolve) { _confirmResolve(ok); _confirmResolve = null; }
  }

  function setActive(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screenName);
    if (target) target.classList.add('active');
    document.querySelectorAll('.bnav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === screenName);
    });
  }

  return { setPill, getPill, initPills, toggle, resetToggle, forceToggle, toast, confirm, resolveConfirm, setActive };
})();


/* ═══════════════════════════════════════════════
   DETAIL TABS
═══════════════════════════════════════════════ */
const DetailTabs = (() => {
  function switchTab(tab) {
    document.querySelectorAll('.dtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  }
  return { switch: switchTab };
})();


/* ═══════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════ */
const Timeline = (() => {
  const ACTION_ICON = {
    geral:'📋', rega:'💧', clima:'🌡️', luz:'💡',
    poda:'✂️', lst:'🪢', defoliacao:'🍃',
    transplante:'🪴', flush:'🚿', runoff:'🧪',
  };
  const ACTION_COLOR = {
    geral:'var(--border-3)', rega:'var(--blue)', clima:'#94a3b8',
    luz:'#fde047', poda:'var(--red)', lst:'#a78bfa',
    defoliacao:'#86efac', transplante:'var(--amber)',
    flush:'var(--blue)', runoff:'#34d399',
  };

  function render(plant, entries) {
    const el = document.getElementById('cycle-timeline');
    if (!entries || entries.length === 0) {
      el.innerHTML = '<div class="empty-hint">Adicione registros para ver a timeline.</div>';
      return;
    }

    const sorted = [...entries].sort((a, b) => (a.date+(a.time||'00:00')).localeCompare(b.date+(b.time||'00:00')));
    const byDate = {};
    sorted.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    const milestones = _buildMilestones(plant, sorted);

    const html = Object.entries(byDate).reverse().map(([date, dayEntries]) => {
      const dateObj  = new Date(date + 'T00:00:00');
      const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
      const daysNum  = Utils.daysBetween(plant.startDate, date);
      const dayMilestones = milestones.filter(m => m.date === date);
      return `
        <div class="tl-day">
          <div class="tl-day-header">
            <span class="tl-day-label">${dayLabel}</span>
            <span class="tl-day-num">D${daysNum}</span>
          </div>
          ${dayMilestones.map(_milestoneNode).join('')}
          <div class="tl-entries">${dayEntries.map(e => _entryNode(e, plant)).join('')}</div>
        </div>`;
    }).join('');

    const startNode = `
      <div class="tl-start-node">
        <span class="tl-start-dot">🌱</span>
        <span class="tl-start-label">Início do ciclo · ${Utils.fmtDate(plant.startDate)}</span>
      </div>`;

    el.innerHTML = html + startNode;
  }

  function _entryNode(e, plant) {
    const type  = e.actionType || 'geral';
    const icon  = ACTION_ICON[type] || '📋';
    const color = ACTION_COLOR[type] || 'var(--border-3)';
    const week  = e.weekInStage || 1;
    const pType = plant?.type || 'auto';

    const chips = [];
    if (e.temp && e.ur) chips.push(`${e.temp}°C · ${e.ur}%`);
    if (e.vpd)   chips.push(`VPD ${e.vpd}`);
    if (e.water) chips.push(`💧 ${e.water}ml`);
    if (e.ph)    chips.push(`pH ${e.ph}`);
    if (e.ppfd)  chips.push(`⚡${e.ppfd}`);
    if (e.podaTecnica) chips.push(e.podaTecnica);
    if (e.lstTecnica)  chips.push(e.lstTecnica);
    if (e.tpTo)  chips.push(`🪴 → ${e.tpTo}L`);

    const chipsHtml = chips.length
      ? `<div class="tl-chips">${chips.map(c => `<span class="tl-chip">${Utils.esc(c)}</span>`).join('')}</div>` : '';
    const obsHtml = e.obs
      ? `<div class="tl-obs">${Utils.esc(e.obs).substring(0, 100)}${e.obs.length > 100 ? '…' : ''}</div>` : '';

    return `
      <div class="tl-node" onclick="Modals.openEntryDetail('${e.id}')">
        <div class="tl-node-dot" style="background:${color};border-color:${color}"></div>
        <div class="tl-node-body">
          <div class="tl-node-head">
            <span class="tl-node-icon">${icon}</span>
            <span class="tl-node-type">${_actionLabel(type, e)}</span>
            ${e.time ? `<span class="tl-node-time">${e.time}</span>` : ''}
          </div>
          ${chipsHtml}${obsHtml}
        </div>
      </div>`;
  }

  function _milestoneNode(m) {
    return `<div class="tl-milestone"><span class="tl-milestone-icon">${m.icon}</span><span class="tl-milestone-label">${Utils.esc(m.label)}</span></div>`;
  }

  function _buildMilestones(plant, sorted) {
    const ms = [];
    let lastStage = null;
    sorted.forEach(e => {
      if (e.stage && e.stage !== lastStage) {
        if (lastStage !== null) ms.push({ date: e.date, icon: Utils.stageEmoji(e.stage), label: `Entrou em ${Utils.stageLabel(e.stage)}` });
        lastStage = e.stage;
      }
    });
    sorted.filter(e => e.actionType === 'transplante' && e.tpTo).forEach(e => {
      ms.push({ date: e.date, icon: '🪴', label: `Transplante → ${e.tpTo}L` });
    });
    return ms;
  }

  function _actionLabel(type, e) {
    const map = {
      geral:'Registro geral', rega:'Rega', clima:'Clima', luz:'Luz',
      poda: e.podaTecnica || 'Poda', lst: e.lstTecnica || 'LST',
      defoliacao:'Defoliação', transplante:'Transplante', flush:'Flush', runoff:'Runoff',
    };
    return map[type] || type;
  }

  return { render };
})();


/* ═══════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════ */
const Render = (() => {

  function home() {
    const { plants } = DB.get();
    const totalLogs = plants.reduce((a, p) => a + (p.entries || []).length, 0);
    const maxDays   = plants.reduce((a, p) => Math.max(a, Utils.daysAlive(p)), 0);

    document.getElementById('kpi-plants').textContent = plants.length;
    document.getElementById('kpi-logs').textContent   = totalLogs;
    document.getElementById('kpi-days').textContent   = plants.length ? maxDays : '—';

    if (plants.length > 0) {
      const active = plants[plants.length - 1];
      document.getElementById('banner-title').textContent = active.name;
      document.getElementById('banner-sub').textContent   =
        Utils.stageLabel(active.stage) + ' · ' + Utils.daysAlive(active) + ' dias';
    } else {
      document.getElementById('banner-title').textContent = 'Painel';
      document.getElementById('banner-sub').textContent   = 'Adicione sua primeira planta.';
    }

    _renderAlerts(plants);
    _renderPlantList(plants);
  }

  function _renderAlerts(plants) {
    const el = document.getElementById('alert-list');
    if (plants.length === 0) {
      el.innerHTML = '<div class="empty-hint">Adicione plantas para ver alertas aqui.</div>';
      return;
    }
    const items = [];
    plants.forEach(p => {
      const last = (p.entries || []).slice(-1)[0];
      if (!last) { items.push({ cls:'warn', dot:'dot-warn', text:`"${Utils.esc(p.name)}" — sem registros ainda` }); return; }
      const diff = Math.round((Date.now() - new Date(last.date)) / 86_400_000);
      if (diff >= 2) items.push({ cls:'warn', dot:'dot-warn', text:`"${Utils.esc(p.name)}" — último registro há ${diff} dias` });
      else           items.push({ cls:'ok',   dot:'dot-ok',   text:`"${Utils.esc(p.name)}" — registrado recentemente` });
    });
    el.innerHTML = items.map(i =>
      `<div class="alert-item ${i.cls}"><span class="alert-dot ${i.dot}"></span><span>${i.text}</span></div>`
    ).join('');
  }

  function _renderPlantList(plants) {
    const el = document.getElementById('plant-list');
    if (plants.length === 0) {
      el.innerHTML = '<div class="empty-hint">Nenhuma planta cadastrada ainda.</div>';
      return;
    }
    el.innerHTML = plants.map(p => {
      const days = Utils.daysAlive(p), weeks = Utils.weekInStage(p), stage = p.stage || 'vegetativo';
      return `
      <div class="plant-card" onclick="App.openPlant('${p.id}')">
        <div class="plant-avatar">${Utils.stageEmoji(stage)}</div>
        <div class="plant-info">
          <div class="plant-name">${Utils.esc(p.name)}</div>
          <div class="plant-meta">
            <span class="stage-tag stage-${stage}">${Utils.stageLabel(stage)}</span>
            <span>${p.type === 'foto' ? 'Fotoperíodo' : 'Automática'}</span>
          </div>
        </div>
        <div class="plant-counter">
          <div class="plant-days-num">${days}</div>
          <div class="plant-days-lbl">d / sem.${weeks}</div>
        </div>
      </div>`;
    }).join('');
  }

  function detail(plant) {
    const days  = plant.daysOverride  !== undefined ? plant.daysOverride  : Utils.daysAlive(plant);
    const weeks = plant.weeksOverride !== undefined ? plant.weeksOverride : Utils.weekInStage(plant);
    const stage = plant.stage || 'vegetativo';
    const entries = plant.entries || [];

    document.getElementById('header-title').textContent = plant.name;
    document.getElementById('ribbon-stage').textContent = Utils.stageLabel(stage);
    document.getElementById('ribbon-days').textContent  = days;
    document.getElementById('ribbon-weeks').textContent = weeks;

    const ribbon = document.getElementById('stage-ribbon');
    ribbon.className = 'stage-ribbon';
    ribbon.classList.add('stage-bg-' + stage);

    const alertEl = document.getElementById('detail-alert');
    const last = entries.slice(-1)[0];
    if (!last) {
      alertEl.textContent = 'Nenhum registro ainda. Use os botões abaixo para começar.';
      alertEl.className = 'detail-alert'; alertEl.classList.remove('hidden');
    } else {
      const diff = Math.round((Date.now() - new Date(last.date)) / 86_400_000);
      if (diff >= 2) {
        alertEl.innerHTML = `⚠️ Último registro há <strong>${diff} dias</strong>. Hora de atualizar?`;
        alertEl.className = 'detail-alert'; alertEl.classList.remove('hidden');
      } else {
        alertEl.innerHTML = `✅ Último registro: <strong>${Utils.fmtDate(last.date)}</strong>`;
        alertEl.className = 'detail-alert ok'; alertEl.classList.remove('hidden');
      }
    }

    _renderEntries(entries, plant);
    Timeline.render(plant, entries);
    Countdown.render(plant);
    Watering.renderCard(plant);
    _renderVpdCard(entries, stage);
  }

  function _renderVpdCard(entries, stage) {
    const card = document.getElementById('vpd-card');
    const last = [...entries].reverse().find(e => e.temp && e.ur);
    if (!last) { card.classList.add('hidden'); return; }
    const vpd = VPD.calc(last.temp, last.ur);
    const zoneInfo = VPD.zone(vpd, stage);
    document.getElementById('vpd-val').textContent  = vpd;
    document.getElementById('vpd-zone').textContent = zoneInfo.label;
    document.getElementById('vpd-zone').style.color = zoneInfo.color;
    card.classList.remove('hidden');
  }

  function _renderEntries(entries, plant) {
    const el = document.getElementById('entries-list');
    if (entries.length === 0) {
      el.innerHTML = '<div class="empty-hint">Nenhum registro ainda. Use os botões acima.</div>';
      return;
    }
    const pType = plant?.type || 'auto';

    el.innerHTML = [...entries].reverse().map(e => {
      const week = e.weekInStage || 1;
      const chips = [];
      if (e.temp)  chips.push(`<span class="chip">${e.temp}°C ${RefTables.badge('temp', e.temp, pType, week)}</span>`);
      if (e.ur)    chips.push(`<span class="chip">${e.ur}%UR ${RefTables.badge('ur', e.ur, pType, week)}</span>`);
      if (e.vpd)   chips.push(`<span class="chip" style="color:var(--accent)">VPD ${e.vpd} ${RefTables.badge('vpd', e.vpd, pType, week)}</span>`);
      if (e.water) chips.push(`<span class="chip blue">💧 ${e.water}ml</span>`);
      if (e.ph)    chips.push(`<span class="chip">pH ${e.ph} ${RefTables.badge('ph', e.ph, pType, week)}</span>`);
      if (e.ec)    chips.push(`<span class="chip amber">EC ${e.ec} ${RefTables.badge('ec', e.ec, pType, week)}</span>`);
      if (e.ppfd)  chips.push(`<span class="chip green">⚡ ${e.ppfd} PPFD</span>`);
      if (e.dli)   chips.push(`<span class="chip green">DLI ${e.dli}</span>`);

      const stage = e.stage || 'vegetativo';
      const dateStr = e.date ? new Date(e.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
      const aIcons  = { geral:'📋', rega:'💧', clima:'🌡️', luz:'💡', poda:'✂️', lst:'🪢', defoliacao:'🍃', transplante:'🪴', flush:'🚿', runoff:'🧪' };
      const aIcon   = aIcons[e.actionType] || '📋';

      return `
      <div class="entry-card" onclick="Modals.openEntryDetail('${e.id}')">
        <div class="entry-head">
          <span class="entry-action-icon">${aIcon}</span>
          <span class="entry-date">${dateStr}${e.time ? ' · '+e.time : ''}</span>
          <span class="stage-tag stage-${stage}">${Utils.stageLabel(stage)}</span>
          <span class="entry-day-badge">${e.daysAlive !== undefined ? 'D'+e.daysAlive : ''}</span>
        </div>
        ${chips.length ? `<div class="entry-chips">${chips.join('')}</div>` : ''}
        ${e.obs ? `<div class="entry-obs">${Utils.esc(e.obs).substring(0, 140)}${e.obs.length > 140 ? '…' : ''}</div>` : ''}
      </div>`;
    }).join('');
  }

  function stats() {
    const { plants } = DB.get();
    const wrap = document.getElementById('stats-wrap');
    if (plants.length === 0) { wrap.innerHTML = '<div class="empty-hint">Sem dados ainda.</div>'; return; }

    const allEntries  = plants.flatMap(p => p.entries || []);
    const totalLogs   = allEntries.length;
    const waterTotal  = allEntries.reduce((a, e) => a + (e.water || 0), 0);
    const tempsArr    = allEntries.filter(e => e.temp).map(e => e.temp);
    const tempAvg     = tempsArr.length ? (tempsArr.reduce((a,v)=>a+v,0)/tempsArr.length).toFixed(1) : null;

    const globalGrid = `<div class="stats-grid">
      ${_statCard('🌱', plants.length, 'Plantas')}
      ${_statCard('📋', totalLogs, 'Registros')}
      ${_statCard('💧', waterTotal > 0 ? (waterTotal/1000).toFixed(1)+'L' : '—', 'Água total')}
      ${_statCard('🌡️', tempAvg ? tempAvg+'°C' : '—', 'Temp. média')}
    </div>`;

    const perPlant = plants.map(p => {
      const entries = p.entries || [];
      const water   = entries.reduce((a,e) => a+(e.water||0), 0);
      return `
      <div class="stats-plant-block">
        <div class="stats-plant-name">${Utils.stageEmoji(p.stage)} ${Utils.esc(p.name)}</div>
        ${_statsRow('Estágio',     Utils.stageLabel(p.stage), true)}
        ${_statsRow('Início',      Utils.fmtDate(p.startDate))}
        ${_statsRow('Dias',        Utils.daysAlive(p)+' dias', true)}
        ${_statsRow('Semana',      'Sem. '+Utils.weekInStage(p))}
        ${_statsRow('Tipo',        p.type === 'foto' ? 'Fotoperíodo' : 'Automática')}
        ${_statsRow('Registros',   entries.length, true)}
        ${_statsRow('Água total',  water > 0 ? (water/1000).toFixed(1)+'L' : '—')}
        ${p.setup ? _statsRow('Tenda', p.setup.tentSize || '—') : ''}
        ${p.setup ? _statsRow('LED',   p.setup.ledModel || '—') : ''}
        ${p.soil  ? _statsRow('Solo',  p.soil.type === 'organico' ? 'Orgânico' : 'Inerte') : ''}
      </div>`;
    }).join('');

    wrap.innerHTML = globalGrid + perPlant;
  }

  function _statCard(icon, val, lbl) {
    return `<div class="stat-card"><span class="stat-icon">${icon}</span><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div>`;
  }
  function _statsRow(lbl, val, accent=false) {
    return `<div class="stats-row"><span class="stats-row-lbl">${lbl}</span><span class="stats-row-val${accent?' accent':''}">${val}</span></div>`;
  }

  return { home, detail, stats };
})();


/* ═══════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════ */
const Modals = (() => {
  let _editPlantId = null, _editEntryId = null;

  function open(id)  { document.getElementById(id)?.classList.add('open'); }
  function close(id) { document.getElementById(id)?.classList.remove('open'); }

  // ── PLANTA ────────────────────────────────────
  function openPlant(plantId) {
    _editPlantId = plantId || null;
    const plant  = plantId ? DB.getPlant(plantId) : null;
    document.getElementById('mp-title').textContent = plant ? 'Editar Planta' : 'Nova Planta';

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    setVal('mp-name',         plant?.name        || '');
    setVal('mp-date',         plant?.startDate   || Utils.today());
    setVal('mp-obs',          plant?.obs         || '');
    setVal('mp-veg-weeks',    plant?.vegWeeks    || '');
    setVal('mp-flower-weeks', plant?.flowerWeeks || '');
    setVal('mp-cycle-with',   plant?.cycleWith   ?? 2);
    setVal('mp-cycle-without',plant?.cycleWithout ?? 1);
    UI.setPill('mp-type-group', plant?.type || 'auto');

    // Tabs do modal planta
    _switchPlantTab('basico');

    // Solo
    const soil = plant?.soil || {};
    UI.setPill('soil-type-group', soil.type || 'inerte');
    setVal('soil-recipe',  soil.recipe  || '');
    setVal('soil-brand',   soil.brand   || '');
    setVal('soil-notes',   soil.notes   || '');
    _updateSoilFields(soil.type || 'inerte');

    // Setup
    const setup = plant?.setup || {};
    setVal('setup-tent-size',  setup.tentSize  || '');
    setVal('setup-led-model',  setup.ledModel  || '');
    setVal('setup-led-type',   setup.ledType   || '');
    setVal('setup-led-watts',  setup.ledWatts  || '');
    setVal('setup-exhaust',    setup.exhaust   || '');
    setVal('setup-fan',        setup.fan       || '');
    setVal('setup-timer',      setup.timer     || '');
    setVal('setup-notes',      setup.notes     || '');

    open('modal-plant');
    setTimeout(() => document.getElementById('mp-name').focus(), 150);
  }

  function _switchPlantTab(tab) {
    document.querySelectorAll('.ptab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.ptab-content').forEach(c => c.classList.toggle('active', c.id === 'ptab-' + tab));
  }

  function _updateSoilFields(type) {
    const orgFields  = document.getElementById('soil-organic-fields');
    const inertFields = document.getElementById('soil-inert-fields');
    if (orgFields)   orgFields.classList.toggle('hidden',  type !== 'organico');
    if (inertFields) inertFields.classList.toggle('hidden', type !== 'inerte');
  }

  function savePlant() {
    const name = document.getElementById('mp-name').value.trim();
    if (!name) { UI.toast('Informe o nome da planta.'); return; }

    const type        = UI.getPill('mp-type-group') || 'auto';
    const startDate   = document.getElementById('mp-date').value || Utils.today();
    const obs         = document.getElementById('mp-obs').value.trim();
    const vegWeeks    = parseInt(document.getElementById('mp-veg-weeks').value)    || null;
    const flowerWeeks = parseInt(document.getElementById('mp-flower-weeks').value) || null;
    const cycleWith   = parseInt(document.getElementById('mp-cycle-with').value)   || 2;
    const cycleWithout= parseInt(document.getElementById('mp-cycle-without').value)|| 1;

    // Solo
    const soilType = UI.getPill('soil-type-group') || 'inerte';
    const soil = {
      type: soilType,
      recipe: document.getElementById('soil-recipe')?.value.trim() || null,
      brand:  document.getElementById('soil-brand')?.value.trim()  || null,
      notes:  document.getElementById('soil-notes')?.value.trim()  || null,
    };

    // Setup
    const setup = {
      tentSize: document.getElementById('setup-tent-size')?.value.trim() || null,
      ledModel: document.getElementById('setup-led-model')?.value.trim() || null,
      ledType:  document.getElementById('setup-led-type')?.value.trim()  || null,
      ledWatts: document.getElementById('setup-led-watts')?.value.trim() || null,
      exhaust:  document.getElementById('setup-exhaust')?.value.trim()   || null,
      fan:      document.getElementById('setup-fan')?.value.trim()       || null,
      timer:    document.getElementById('setup-timer')?.value.trim()     || null,
      notes:    document.getElementById('setup-notes')?.value.trim()     || null,
    };

    if (_editPlantId) {
      const plant = DB.getPlant(_editPlantId);
      if (plant) {
        Object.assign(plant, { name, type, startDate, obs, vegWeeks, flowerWeeks, cycleWith, cycleWithout, soil, setup });
        DB.upsertPlant(plant);
      }
    } else {
      DB.upsertPlant({
        id: Utils.uid(), name, type, startDate, obs, vegWeeks, flowerWeeks,
        cycleWith, cycleWithout, soil, setup,
        stage: 'vegetativo', entries: [],
      });
    }

    close('modal-plant');
    Render.home();
    UI.toast(_editPlantId ? 'Planta atualizada. ✏️' : 'Planta adicionada! 🌱');
  }

  // ── ESTÁGIO ───────────────────────────────────
  function openStage() {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    UI.setPill('stage-pill-group', plant.stage || 'vegetativo');
    document.getElementById('ms-days').value  = '';
    document.getElementById('ms-weeks').value = '';
    open('modal-stage');
  }

  function saveStage() {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    const newStage = UI.getPill('stage-pill-group');
    const dOv = parseInt(document.getElementById('ms-days').value);
    const wOv = parseInt(document.getElementById('ms-weeks').value);
    if (newStage && newStage !== plant.stage) plant.stageStartDate = Utils.today();
    const prevStage = plant.stage;
    plant.stage = newStage || plant.stage;
    if (!isNaN(dOv) && dOv >= 0) plant.daysOverride = dOv; else delete plant.daysOverride;
    if (!isNaN(wOv) && wOv >= 1) plant.weeksOverride = wOv; else delete plant.weeksOverride;
    DB.upsertPlant(plant);
    close('modal-stage');
    Render.detail(plant);
    Render.home();
    if (newStage === 'colheita' && prevStage !== 'colheita') {
      setTimeout(() => HarvestReport.open(plant.id), 350);
      return;
    }
    UI.toast('Estágio atualizado.');
  }

  // ── REGISTRO ──────────────────────────────────
  function openEntry(preset) {
    _editEntryId = null;
    document.getElementById('me-title').textContent = 'Novo Registro';
    Entry.reset(App.activePlantId(), null);
    if (preset === 'water')   setTimeout(() => ActionType.preset('rega'),  80);
    if (preset === 'climate') setTimeout(() => ActionType.preset('clima'), 80);
    open('modal-entry');
  }

  function openEditEntry(entryId) {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    const entry = (plant.entries || []).find(e => e.id === entryId);
    if (!entry) return;
    _editEntryId = entryId;
    document.getElementById('me-title').textContent = '✏️ Editar Registro';
    Entry.reset(App.activePlantId(), entry);
    close('modal-entry-detail');
    open('modal-entry');
  }

  function saveEntry() {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) { UI.toast('Nenhuma planta selecionada.'); return; }
    const date = document.getElementById('ef-date').value;
    if (!date) { UI.toast('Informe a data do registro.'); return; }

    const luxVal  = parseFloat(document.getElementById('ef-lux').value)     || null;
    const onTime  = document.getElementById('ef-ledon').value  || null;
    const offTime = document.getElementById('ef-ledoff').value || null;
    const ppfd    = luxVal ? Light.luxToPPFD(luxVal) : null;
    const hours   = Light.photoperiodHours(onTime, offTime);
    const dli     = (ppfd && hours) ? Light.calcDLI(ppfd, hours) : null;
    const tempVal = parseFloat(document.getElementById('ef-temp').value) || null;
    const urVal   = parseFloat(document.getElementById('ef-ur').value)   || null;
    const vpd     = (tempVal && urVal) ? VPD.calc(tempVal, urVal) : null;
    const actionType = ActionType.getSelected();
    const actionData = ActionType.getActionData(actionType);

    const entry = {
      id: _editEntryId || Utils.uid(),
      date, time: document.getElementById('ef-time').value || null,
      actionType, ...actionData,
      stage:       UI.getPill('entry-stage-group') || plant.stage,
      daysAlive:   Utils.daysAlive(plant, date),
      weekInStage: Utils.weekInStage(plant, date),
      temp: tempVal, ur: urVal, vpd,
      lux: luxVal,
      dimmer: parseFloat(document.getElementById('ef-dimmer').value) || null,
      dist:   parseFloat(document.getElementById('ef-dist').value)   || null,
      ledon: onTime, ledoff: offTime, ppfd, dli,
      water: parseFloat(document.getElementById('ef-water').value)   || null,
      ec:    parseFloat(document.getElementById('ef-ec').value)      || null,
      ph:    parseFloat(document.getElementById('ef-ph').value)      || null,
      nutrients: Entry.getNutrients(),
      obs: document.getElementById('ef-obs').value.trim() || null,
    };

    if (!plant.entries) plant.entries = [];
    if (_editEntryId) {
      const idx = plant.entries.findIndex(e => e.id === _editEntryId);
      if (idx >= 0) plant.entries[idx] = entry;
    } else {
      plant.entries.push(entry);
    }

    DB.upsertPlant(plant);
    close('modal-entry');
    Render.detail(plant);
    Render.home();
    UI.toast(_editEntryId ? 'Registro atualizado! ✏️' : 'Registro salvo! ✅');
  }

  // ── DETALHE DO REGISTRO ────────────────────────
  function openEntryDetail(entryId) {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    const entry = (plant.entries || []).find(e => e.id === entryId);
    if (!entry) return;

    const week  = entry.weekInStage || 1;
    const pType = plant.type || 'auto';

    function refRow(label, value, param, unit = '') {
      if (!value && value !== 0) return `<tr><td>${label}</td><td>—</td></tr>`;
      const badgeHtml = param ? RefTables.badge(param, parseFloat(value), pType, week) : '';
      return `<tr><td>${label}</td><td>${value}${unit} ${badgeHtml}</td></tr>`;
    }

    const rows = [
      ['Data',         Utils.fmtDate(entry.date)],
      ['Hora',         entry.time || '—'],
      ['Estágio',      Utils.stageLabel(entry.stage)],
      ['Dias / Semana', `D${entry.daysAlive ?? '—'} / Sem.${entry.weekInStage ?? '—'}`],
    ];

    document.getElementById('entry-detail-body').innerHTML = `
      <table class="detail-table">
        <tbody>
          ${rows.map(([l,v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}
          ${refRow('Temperatura', entry.temp, 'temp', ' °C')}
          ${refRow('Umidade', entry.ur, 'ur', ' %')}
          ${refRow('VPD', entry.vpd, 'vpd', ' kPa')}
          <tr><td>Lux</td><td>${entry.lux ? Number(entry.lux).toLocaleString('pt-BR') : '—'}</td></tr>
          <tr><td>PPFD</td><td>${entry.ppfd ? entry.ppfd + ' µmol/m²/s' : '—'}</td></tr>
          <tr><td>DLI</td><td>${entry.dli ? entry.dli + ' mol/m²/d' : '—'}</td></tr>
          <tr><td>Fotoperíodo</td><td>${(entry.ledon && entry.ledoff) ? entry.ledon+' – '+entry.ledoff : '—'}</td></tr>
          <tr><td>Dimmer</td><td>${entry.dimmer ? entry.dimmer+' %' : '—'}</td></tr>
          <tr><td>Distância</td><td>${entry.dist ? entry.dist+' cm' : '—'}</td></tr>
          <tr><td>Água</td><td>${entry.water ? entry.water+' ml' : '—'}</td></tr>
          ${refRow('pH', entry.ph, 'ph')}
          ${refRow('EC', entry.ec, 'ec')}
          <tr><td>Nutrientes</td><td>${entry.nutrients?.length ? entry.nutrients.map(n => Utils.esc(n.name)+(n.qty?' '+n.qty+'ml/L':'')).join(', ') : '—'}</td></tr>
          <tr><td>Observações</td><td>${entry.obs ? Utils.esc(entry.obs) : '—'}</td></tr>
        </tbody>
      </table>`;

    document.getElementById('entry-detail-edit').onclick = () => openEditEntry(entryId);
    document.getElementById('entry-detail-del').onclick  = () => _deleteEntry(entryId);
    open('modal-entry-detail');
  }

  function _deleteEntry(entryId) {
    const plant = DB.getPlant(App.activePlantId());
    if (!plant) return;
    UI.confirm('Excluir registro', 'Este registro será removido permanentemente.').then(ok => {
      if (!ok) return;
      plant.entries = (plant.entries || []).filter(e => e.id !== entryId);
      DB.upsertPlant(plant);
      close('modal-entry-detail');
      Render.detail(plant);
      Render.home();
      UI.toast('Registro excluído.');
    });
  }

  // ── IMPORT / EXPORT ───────────────────────────
  function openImportExport() { open('modal-ie'); }

  // Solo type toggle
  function setSoilType(type) {
    UI.setPill('soil-type-group', type);
    _updateSoilFields(type);
  }

  // Plant tab switch
  function switchPlantTab(tab) { _switchPlantTab(tab); }

  return {
    open, close,
    openPlant, savePlant, setSoilType, switchPlantTab,
    openStage, saveStage,
    openEntry, openEditEntry, saveEntry,
    openEntryDetail,
    openImportExport,
  };
})();


/* ═══════════════════════════════════════════════
   APP — navegação e export/import
═══════════════════════════════════════════════ */
const App = (() => {
  let _activePlantId = null, _prevScreen = 'home', _curScreen = 'home';

  function activePlantId() { return _activePlantId; }

  function goTo(screen) {
    if (screen === 'detail' && !_activePlantId) return;
    _prevScreen = _curScreen; _curScreen = screen;
    UI.setActive(screen);
    _updateHeader(screen);
    if (screen === 'stats') Render.stats();
    if (screen === 'home')  Render.home();
  }

  function goBack() { goTo(_prevScreen === _curScreen ? 'home' : _prevScreen); }

  function openPlant(id) {
    _activePlantId = id;
    const plant = DB.getPlant(id);
    if (!plant) return;
    document.getElementById('bnav-detail').style.display = '';
    Render.detail(plant);
    goTo('detail');
  }

  function openLastPlant() {
    const { plants } = DB.get();
    if (plants.length === 0) { UI.toast('Nenhuma planta cadastrada ainda.'); return; }
    openPlant(plants[plants.length - 1].id);
  }

  function deletePlant(id) {
    UI.confirm('Excluir planta', 'Todos os registros desta planta serão removidos permanentemente.').then(ok => {
      if (!ok) return;
      DB.deletePlant(id);
      _activePlantId = null;
      document.getElementById('bnav-detail').style.display = 'none';
      goTo('home');
      UI.toast('Planta excluída.');
    });
  }

  function _updateHeader(screen) {
    const logoEl    = document.getElementById('header-logo');
    const titleEl   = document.getElementById('header-title');
    const backBtn   = document.getElementById('back-btn');
    const actionsEl = document.getElementById('header-actions');

    logoEl.classList.remove('hidden'); titleEl.classList.add('hidden');
    backBtn.classList.add('hidden'); actionsEl.innerHTML = '';

    if (screen === 'detail') {
      const plant = DB.getPlant(_activePlantId);
      logoEl.classList.add('hidden');
      titleEl.textContent = plant ? plant.name : '—';
      titleEl.classList.remove('hidden');
      backBtn.classList.remove('hidden');
      actionsEl.innerHTML = `
        <button class="hdr-btn" onclick="Modals.openPlant('${_activePlantId}')" title="Editar planta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="hdr-btn" onclick="App.deletePlant('${_activePlantId}')" title="Excluir planta" style="color:var(--red)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`;
    }
  }

  function exportAll() {
    const { plants } = DB.get();
    if (plants.length === 0) { UI.toast('Nenhum dado para exportar.'); return; }
    const header = 'Planta,Data,Hora,Estágio,Dias,Semana,Temp(°C),UR(%),Lux,PPFD,DLI,Água(ml),pH,EC,Obs';
    const rows = [header];
    plants.forEach(p => {
      (p.entries || []).forEach(e => {
        rows.push([`"${p.name}"`,e.date||'',e.time||'',Utils.stageLabel(e.stage),e.daysAlive??'',e.weekInStage??'',e.temp??'',e.ur??'',e.lux??'',e.ppfd??'',e.dli??'',e.water??'',e.ph??'',e.ec??'',`"${(e.obs||'').replace(/"/g,'""')}"`].join(','));
      });
    });
    Utils.download(rows.join('\n'), 'growlog_export.csv', 'text/csv;charset=utf-8');
    Modals.close('modal-ie');
    UI.toast('CSV exportado! 📤');
  }

  function exportPlantCSV() {
    const plant = DB.getPlant(_activePlantId);
    if (!plant) return;
    const header = 'Data,Hora,Estágio,Dias,Semana,Temp(°C),UR(%),Lux,PPFD,DLI,Água(ml),pH,EC,Obs';
    const rows = [header];
    (plant.entries || []).forEach(e => {
      rows.push([e.date||'',e.time||'',Utils.stageLabel(e.stage),e.daysAlive??'',e.weekInStage??'',e.temp??'',e.ur??'',e.lux??'',e.ppfd??'',e.dli??'',e.water??'',e.ph??'',e.ec??'',`"${(e.obs||'').replace(/"/g,'""')}"`].join(','));
    });
    Utils.download(rows.join('\n'), plant.name.replace(/\s+/g,'_')+'_log.csv', 'text/csv;charset=utf-8');
    UI.toast('CSV da planta exportado! 📊');
  }

  function exportBackup() {
    Utils.download(JSON.stringify(DB.get(), null, 2), 'growlog_backup.json', 'application/json');
    Modals.close('modal-ie');
    UI.toast('Backup salvo! 💾');
  }

  function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.plants) { UI.toast('Arquivo inválido.'); return; }
        UI.confirm('Importar backup', 'Isso substituirá todos os dados atuais. Continuar?').then(ok => {
          if (!ok) return;
          DB.replaceFull(parsed);
          _activePlantId = null;
          document.getElementById('bnav-detail').style.display = 'none';
          Render.home();
          Modals.close('modal-ie');
          goTo('home');
          UI.toast('Backup importado com sucesso! ✅');
        });
      } catch { UI.toast('Erro ao ler o arquivo JSON.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  return { activePlantId, goTo, goBack, openPlant, openLastPlant, deletePlant, exportAll, exportPlantCSV, exportBackup, importBackup };
})();


/* ═══════════════════════════════════════════════
   HARVEST REPORT
═══════════════════════════════════════════════ */
const HarvestReport = (() => {
  let _plantId = null;

  function open(plantId) {
    _plantId = plantId;
    const plant = DB.getPlant(plantId);
    if (!plant) return;
    const entries = plant.entries || [];
    document.getElementById('hr-plant-name').textContent = plant.name;
    const saved = plant.harvestReport || {};
    document.getElementById('hr-yield-wet').value = saved.yieldWet || '';
    document.getElementById('hr-yield-dry').value = saved.yieldDry || '';
    document.getElementById('hr-notes').value     = saved.notes    || '';
    UI.setPill('hr-rating-group', saved.rating ? String(saved.rating) : '4');
    _renderSummary(plant, entries);
    _renderAverages(entries);
    _renderTimeline(plant, entries);
    Modals.open('modal-harvest');
  }

  function _renderSummary(plant, entries) {
    const totalDays  = Utils.daysAlive(plant);
    const waterTotal = entries.reduce((a,e) => a+(e.water||0), 0);
    const waterLogs  = entries.filter(e => e.water).length;
    const trainings  = entries.filter(e => ['poda','lst','defoliacao'].includes(e.actionType)).map(e => e.podaTecnica||e.lstTecnica||e.actionType).filter(Boolean);
    const actionCounts = {};
    entries.forEach(e => { const t = e.actionType||'geral'; actionCounts[t]=(actionCounts[t]||0)+1; });
    const rows = [
      ['Início', Utils.fmtDate(plant.startDate)],
      ['Colheita', Utils.fmtDate(Utils.today())],
      ['Duração', totalDays+' dias'],
      ['Registros', entries.length],
      ['Regas', waterLogs],
      ['Água total', waterTotal > 0 ? (waterTotal/1000).toFixed(2)+'L' : '—'],
      ['Treinamentos', trainings.length > 0 ? trainings.join(', ') : '—'],
      ['Transplantes', actionCounts['transplante']||0],
      ['Flushes', actionCounts['flush']||0],
    ];
    document.getElementById('hr-summary').innerHTML = rows.map(([l,v]) =>
      `<div class="stats-row"><span class="stats-row-lbl">${l}</span><span class="stats-row-val">${Utils.esc(String(v))}</span></div>`
    ).join('');
  }

  function _renderAverages(entries) {
    const avg = arr => arr.length ? (arr.reduce((a,v)=>a+v,0)/arr.length).toFixed(1) : '—';
    const temps  = entries.filter(e=>e.temp).map(e=>e.temp);
    const urs    = entries.filter(e=>e.ur).map(e=>e.ur);
    const phs    = entries.filter(e=>e.ph).map(e=>e.ph);
    const ecs    = entries.filter(e=>e.ec).map(e=>e.ec);
    const vpds   = entries.filter(e=>e.vpd).map(e=>e.vpd);
    const ppfds  = entries.filter(e=>e.ppfd).map(e=>e.ppfd);
    const rows = [
      ['Temp. média',  temps.length  ? avg(temps)+'°C'  : '—'],
      ['UR média',     urs.length    ? avg(urs)+'%'     : '—'],
      ['VPD médio',    vpds.length   ? avg(vpds)+' kPa' : '—'],
      ['pH médio',     phs.length    ? avg(phs)         : '—'],
      ['EC médio',     ecs.length    ? avg(ecs)         : '—'],
      ['PPFD médio',   ppfds.length  ? Math.round(ppfds.reduce((a,v)=>a+v,0)/ppfds.length)+'µmol' : '—'],
    ];
    document.getElementById('hr-averages').innerHTML = rows.map(([l,v]) =>
      `<div class="stats-row"><span class="stats-row-lbl">${l}</span><span class="stats-row-val accent">${Utils.esc(String(v))}</span></div>`
    ).join('');
  }

  function _renderTimeline(plant, entries) {
    const stageChanges = [];
    let lastStage = null;
    [...entries].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => {
      if (e.stage && e.stage !== lastStage) { stageChanges.push({ stage:e.stage, date:e.date }); lastStage = e.stage; }
    });
    if (stageChanges.length === 0) { document.getElementById('hr-timeline').innerHTML='<p class="empty-hint">Sem dados de estágio.</p>'; return; }
    const items = stageChanges.map((sc, i) => {
      const next = stageChanges[i+1];
      const endDate = next ? next.date : Utils.today();
      const duration = Utils.daysBetween(sc.date, endDate);
      return `<div class="timeline-item"><div class="timeline-dot stage-dot-${sc.stage}"></div><div class="timeline-body"><span class="timeline-stage">${Utils.stageEmoji(sc.stage)} ${Utils.stageLabel(sc.stage)}</span><span class="timeline-date">${Utils.fmtDate(sc.date)}</span><span class="timeline-dur">${duration} dias</span></div></div>`;
    });
    document.getElementById('hr-timeline').innerHTML = `<div class="timeline">${items.join('')}</div>`;
  }

  function save() {
    const plant = DB.getPlant(_plantId);
    if (!plant) return;
    plant.harvestReport = {
      date: Utils.today(),
      yieldWet: parseFloat(document.getElementById('hr-yield-wet').value) || null,
      yieldDry: parseFloat(document.getElementById('hr-yield-dry').value) || null,
      rating:   parseInt(UI.getPill('hr-rating-group')) || 4,
      notes:    document.getElementById('hr-notes').value.trim() || null,
    };
    DB.upsertPlant(plant);
    Modals.close('modal-harvest');
    Render.detail(plant);
    UI.toast('Relatório salvo! 🏆');
  }

  function exportCSV() {
    const plant = DB.getPlant(_plantId);
    if (!plant) return;
    const entries = plant.entries || [], report = plant.harvestReport || {};
    const lines = [
      '=== RELATÓRIO DE COLHEITA ===',
      `Planta,${plant.name}`, `Início,${plant.startDate||'—'}`,
      `Colheita,${Utils.today()}`, `Duração,${Utils.daysAlive(plant)} dias`,
      `Peso úmido,${report.yieldWet||'—'} g`, `Peso seco,${report.yieldDry||'—'} g`,
      `Avaliação,${report.rating||'—'} estrelas`,
      `Notas,"${(report.notes||'').replace(/"/g,'""')}"`, '',
      '=== REGISTROS ===',
      'Data,Hora,Tipo,Estágio,Dias,Temp,UR,VPD,Lux,PPFD,DLI,Água(ml),pH,EC,Obs',
      ...entries.map(e => [e.date,e.time||'',e.actionType||'geral',Utils.stageLabel(e.stage),e.daysAlive||'',e.temp||'',e.ur||'',e.vpd||'',e.lux||'',e.ppfd||'',e.dli||'',e.water||'',e.ph||'',e.ec||'',`"${(e.obs||'').replace(/"/g,'""')}"`].join(',')),
    ];
    Utils.download(lines.join('\n'), plant.name.replace(/\s+/g,'_')+'_harvest.csv', 'text/csv;charset=utf-8');
    UI.toast('Relatório exportado! 📤');
  }

  return { open, save, exportCSV };
})();


/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
(async function init() {
  await DB.load();

  ['mp-type-group','stage-pill-group','entry-stage-group',
   'af-poda-type','af-lst-type','hr-rating-group','soil-type-group'].forEach(id => UI.initPills(id));

  // Soil type pills atualizam campos
  const soilGroup = document.getElementById('soil-type-group');
  if (soilGroup) {
    soilGroup.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => Modals.setSoilType(btn.dataset.v));
    });
  }

  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) {
        ov.classList.remove('open');
        if (ov.id === 'modal-confirm') UI.resolveConfirm(false);
      }
    });
  });

  Render.home();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
