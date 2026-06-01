/* ═══════════════════════════════════════════════════
   GROWLOG v3 — app.js
   Design: uma coisa por tela, próximo passo óbvio,
   hierarquia brutal, lógica invisível.
═══════════════════════════════════════════════════ */
'use strict';

/* ═══════════════════════════════════════════════
   DB — IndexedDB + localStorage fallback duplo
═══════════════════════════════════════════════ */
const DB = (() => {
  const LS_KEY = 'growlog_v3';
  let _data = { plants: [], library: { substrates: [], recipes: [], nutrients: [] } };
  let _idb = null;

  async function init() {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open('growlog', 3);
        req.onupgradeneeded = ev => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        };
        req.onsuccess = ev => { _idb = ev.target.result; resolve(true); };
        req.onerror  = () => resolve(false);
      } catch { resolve(false); }
    });
  }

  async function load() {
    await init();
    if (_idb) {
      return new Promise(resolve => {
        const tx  = _idb.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get('data');
        req.onsuccess = () => {
          if (req.result) _data = req.result;
          _ensureShape();
          resolve();
        };
        req.onerror = () => { _loadFromLS(); resolve(); };
      });
    } else { _loadFromLS(); }
  }

  function _ensureShape() {
    if (!Array.isArray(_data.plants)) _data.plants = [];
    if (!_data.library) _data.library = {};
    if (!Array.isArray(_data.library.substrates)) _data.library.substrates = [];
    if (!Array.isArray(_data.library.recipes))    _data.library.recipes    = [];
    if (!Array.isArray(_data.library.nutrients))  _data.library.nutrients  = [];
    if (!Array.isArray(_data.library.setups))     _data.library.setups     = [];
  }

  function _loadFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) _data = JSON.parse(raw);
      _ensureShape();
    } catch { _data = { plants: [], library: { substrates:[], recipes:[], nutrients:[] } }; }
  }

  function save() {
    if (_idb) {
      try {
        const tx = _idb.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(_data, 'data');
      } catch {}
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(_data)); } catch {}
  }

  const get       = ()   => _data;
  const getPlant  = id   => _data.plants.find(p => p.id === id) || null;
  const getLib    = ()   => _data.library;

  function upsertPlant(plant) {
    const i = _data.plants.findIndex(p => p.id === plant.id);
    if (i >= 0) _data.plants[i] = plant; else _data.plants.push(plant);
    save();
  }
  function deletePlant(id) {
    _data.plants = _data.plants.filter(p => p.id !== id);
    // Remove parent refs
    _data.plants.forEach(p => { if (p.parentId === id) delete p.parentId; });
    save();
  }
  function upsertLibItem(category, item) {
    const arr = _data.library[category];
    const i   = arr.findIndex(x => x.id === item.id);
    if (i >= 0) arr[i] = item; else arr.push(item);
    save();
  }
  function deleteLibItem(category, id) {
    _data.library[category] = _data.library[category].filter(x => x.id !== id);
    save();
  }
  function replaceFull(d) { _data = d; _ensureShape(); save(); }

  return { load, save, get, getPlant, getLib, upsertPlant, deletePlant, upsertLibItem, deleteLibItem, replaceFull };
})();


/* ═══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
const Utils = (() => {
  const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const today = () => new Date().toISOString().slice(0,10);
  const nowTime = () => new Date().toTimeString().slice(0,5);

  function daysBetween(a, b) {
    return Math.max(0, Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86_400_000));
  }
  function daysAlive(plant, asOf) {
    if (!plant.startDate) return 0;
    return daysBetween(plant.startDate, asOf || today());
  }
  function weekInStage(plant, asOf) {
    const ref   = asOf || today();
    const start = plant.stageStartDate || plant.startDate;
    if (!start) return 1;
    return Math.max(1, Math.floor(daysBetween(start, ref) / 7) + 1);
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function download(content, filename, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const STAGE_LABELS = { germinacao:'Germinação', plantula:'Plântula', vegetativo:'Vegetativo', floracao:'Floração', colheita:'Colheita' };
  const STAGE_EMOJI  = { germinacao:'🌰', plantula:'🌱', vegetativo:'🍃', floracao:'🌸', colheita:'✂️' };
  const stageLabel = s => STAGE_LABELS[s] || s || '—';
  const stageEmoji = s => STAGE_EMOJI[s]  || '🌿';

  return { uid, today, nowTime, daysBetween, daysAlive, weekInStage, fmtDate, esc, download, stageLabel, stageEmoji };
})();


/* ═══════════════════════════════════════════════
   REF TABLES
═══════════════════════════════════════════════ */
const RefTables = (() => {
  const AUTO = {
    vpd:  [null,{min:.4,max:.8},{min:.5,max:.8},{min:.6,max:.9},{min:.8,max:1.0},{min:.9,max:1.1},{min:1.0,max:1.2},{min:1.1,max:1.3},{min:1.2,max:1.4},{min:1.2,max:1.5},{min:1.3,max:1.5}],
    ur:   [null,{min:70,max:80},{min:65,max:75},{min:60,max:70},{min:58,max:68},{min:55,max:65},{min:50,max:60},{min:45,max:55},{min:40,max:50},{min:40,max:48},{min:35,max:45}],
    temp: [null,{min:24,max:26},{min:24,max:27},{min:24,max:27},{min:24,max:28},{min:24,max:28},{min:24,max:28},{min:23,max:27},{min:22,max:27},{min:22,max:26},{min:21,max:26}],
    ec:  [{weeks:[1,2],min:.2,max:.5},{weeks:[3,4],min:.5,max:1.2},{weeks:[5,6],min:1.2,max:2.0},{weeks:[7,8],min:1.8,max:2.4},{weeks:[9,10],min:2.0,max:2.8},{weeks:'11+',min:.2,max:.8}],
    ppm: [{weeks:[1,2],min:100,max:250},{weeks:[3,4],min:250,max:600},{weeks:[5,6],min:600,max:1000},{weeks:[7,8],min:900,max:1300},{weeks:[9,10],min:1000,max:1400},{weeks:'11+',min:100,max:400}],
    ph:  [{weeks:[1,2],min:5.8,max:6.0},{weeks:[3,4],min:5.8,max:6.1},{weeks:[5,6],min:5.9,max:6.2},{weeks:[7,8],min:6.0,max:6.3},{weeks:[9,10],min:6.1,max:6.4},{weeks:'11+',min:6.0,max:6.3}],
  };
  const FOTO = {
    vpd:  [null,{min:.4,max:.8},{min:.5,max:.8},{min:.6,max:.9},{min:.7,max:1.0},{min:.8,max:1.1},{min:.9,max:1.2},{min:1.0,max:1.2},{min:1.0,max:1.3},{min:1.1,max:1.3},{min:1.1,max:1.4},{min:1.2,max:1.4},{min:1.2,max:1.5},{min:1.3,max:1.5},{min:1.3,max:1.6}],
    ur:   [null,{min:70,max:80},{min:65,max:75},{min:60,max:70},{min:58,max:68},{min:55,max:65},{min:50,max:60},{min:50,max:58},{min:48,max:55},{min:45,max:55},{min:45,max:52},{min:42,max:50},{min:40,max:48},{min:38,max:45},{min:35,max:45}],
    temp: [null,{min:24,max:26},{min:24,max:27},{min:24,max:27},{min:24,max:28},{min:24,max:28},{min:24,max:28},{min:24,max:28},{min:24,max:28},{min:23,max:28},{min:23,max:27},{min:22,max:27},{min:22,max:27},{min:21,max:26},{min:20,max:26}],
    ec:  [{weeks:[1,2],min:.2,max:.5},{weeks:[3,4],min:.5,max:1.0},{weeks:[5,6],min:1.0,max:1.6},{weeks:[7,8],min:1.6,max:2.2},{weeks:[9,10],min:1.8,max:2.4},{weeks:[11,13],min:2.0,max:2.8},{weeks:[14,16],min:2.4,max:3.2},{weeks:'17+',min:.2,max:.8}],
    ppm: [{weeks:[1,2],min:100,max:250},{weeks:[3,4],min:250,max:500},{weeks:[5,6],min:500,max:800},{weeks:[7,8],min:800,max:1100},{weeks:[9,10],min:900,max:1200},{weeks:[11,13],min:1100,max:1400},{weeks:[14,16],min:1300,max:1600},{weeks:'17+',min:100,max:400}],
    ph:  [{weeks:[1,2],min:5.8,max:6.0},{weeks:[3,4],min:5.8,max:6.1},{weeks:[5,6],min:5.9,max:6.2},{weeks:[7,8],min:6.0,max:6.2},{weeks:[9,10],min:6.0,max:6.3},{weeks:[11,13],min:6.1,max:6.4},{weeks:[14,16],min:6.2,max:6.5},{weeks:'17+',min:6.0,max:6.3}],
  };

  function _tbl(type)  { return type === 'foto' ? FOTO : AUTO; }
  function _byWeek(arr, w) { return arr[Math.min(w, arr.length-1)] || arr[arr.length-1]; }
  function _grouped(groups, w) {
    for (const g of groups) {
      if (typeof g.weeks === 'string') return g;
      if (w >= g.weeks[0] && w <= g.weeks[1]) return g;
    }
    return groups[groups.length-1];
  }
  function evaluate(param, value, plantType, week) {
    if (value == null || isNaN(value)) return { status:'unknown', range:null };
    const t = _tbl(plantType);
    let range;
    if (param==='vpd')  range = _byWeek(t.vpd, week);
    if (param==='ur')   range = _byWeek(t.ur,  week);
    if (param==='temp') range = _byWeek(t.temp,week);
    if (param==='ec')   range = _grouped(t.ec, week);
    if (param==='ppm')  range = _grouped(t.ppm,week);
    if (param==='ph')   range = _grouped(t.ph, week);
    if (!range) return { status:'unknown', range:null };
    const tol = (range.max - range.min) * .1;
    const status = value < range.min - tol ? 'low' : value > range.max + tol ? 'high' : (value < range.min || value > range.max) ? 'warn' : 'ok';
    return { status, range };
  }
  function badge(param, value, plantType, week) {
    if (!week || week < 1) return '';
    const { status, range } = evaluate(param, value, plantType, week);
    if (status === 'unknown') return '';
    const cls  = status === 'ok' ? 'ref-ok' : status === 'warn' ? 'ref-warn' : 'ref-bad';
    const icon = { ok:'🟢', warn:'🟡', low:'🔴', high:'🔴' }[status];
    return `<span class="ref-badge ${cls}" title="Ref. sem.${week}: ${range.min}–${range.max}">${icon} ${range.min}–${range.max}</span>`;
  }
  return { evaluate, badge };
})();


/* ═══════════════════════════════════════════════
   LIGHT
═══════════════════════════════════════════════ */
const Light = (() => {
  const FACTOR = 0.0185;
  const luxToPPFD = lux  => Math.round(lux * FACTOR);
  const calcDLI   = (ppfd,h) => parseFloat(((ppfd*h*3600)/1e6).toFixed(2));
  function parseHours(t) { if (!t) return null; const [h,m]=t.split(':').map(Number); return h+m/60; }
  function photoperiodHours(on,off) {
    const a=parseHours(on), b=parseHours(off);
    if (a===null||b===null) return null;
    let h=b-a; if (h<=0) h+=24; return h;
  }
  function recalc() {
    const lux   = parseFloat(document.getElementById('ef-lux')?.value);
    const on    = document.getElementById('ef-ledon')?.value;
    const off   = document.getElementById('ef-ledoff')?.value;
    const ppfdEl= document.getElementById('ef-ppfd-auto');
    const dliEl = document.getElementById('ef-dli-auto');
    const fbEl  = document.getElementById('light-feedback');
    let ppfd=null, dli=null;
    if (!isNaN(lux)&&lux>0) { ppfd=luxToPPFD(lux); ppfdEl.textContent=ppfd+' µmol/m²/s'; ppfdEl.classList.remove('dim'); }
    else { ppfdEl.textContent='— preencha Lux'; ppfdEl.classList.add('dim'); }
    const h=photoperiodHours(on,off);
    if (ppfd&&h) { dli=calcDLI(ppfd,h); dliEl.textContent=dli+' mol/m²/d'; dliEl.classList.remove('dim'); fbEl.innerHTML=`✅ ${h.toFixed(1)}h → DLI <strong>${dli}</strong>`; fbEl.classList.remove('hidden'); }
    else { dliEl.textContent=ppfd?'— preencha horários':'— preencha horas'; dliEl.classList.add('dim'); fbEl.classList.add('hidden'); }
    return { ppfd, dli };
  }
  return { luxToPPFD, calcDLI, photoperiodHours, recalc };
})();


/* ═══════════════════════════════════════════════
   VPD
═══════════════════════════════════════════════ */
const VPD = (() => {
  const svp = t => 0.6108 * Math.exp((17.27*t)/(t+237.3));
  const calc = (t,rh) => parseFloat((svp(t)*(1-rh/100)).toFixed(2));
  function zone(vpd, stage) {
    const z = { germinacao:{l:.4,h:.8}, plantula:{l:.4,h:.8}, vegetativo:{l:.8,h:1.2}, floracao:{l:1.2,h:1.6}, colheita:{l:1.2,h:1.6} }[stage] || {l:.8,h:1.2};
    if (vpd < z.l-.1)  return { label:'🔵 Muito baixo',   color:'#5ca8e0' };
    if (vpd < z.l)     return { label:'🟢 Abaixo ideal',  color:'#5dce76' };
    if (vpd <= z.h)    return { label:'✅ Zona ideal',     color:'#5dce76' };
    if (vpd <= z.h+.2) return { label:'🟡 Acima ideal',   color:'#f5a623' };
    return               { label:'🔴 Muito alto',          color:'#e07070' };
  }
  function recalc() {
    const temp=parseFloat(document.getElementById('ef-temp')?.value);
    const rh  =parseFloat(document.getElementById('ef-ur')?.value);
    const vEl =document.getElementById('ef-vpd-auto');
    const zEl =document.getElementById('ef-vpd-zone');
    if (isNaN(temp)||isNaN(rh)) { vEl.textContent='— preencha T° e UR'; vEl.classList.add('dim'); zEl.textContent='—'; return; }
    const v=calc(temp,rh);
    const plant=DB.getPlant(App.activePlantId());
    const stage=UI.getPill('entry-stage-group')||plant?.stage||'vegetativo';
    const zi=zone(v,stage);
    vEl.textContent=v+' kPa'; vEl.classList.remove('dim'); vEl.style.color=zi.color;
    zEl.textContent=zi.label; zEl.classList.remove('dim'); zEl.style.color=zi.color;
  }
  return { calc, zone, recalc };
})();


/* ═══════════════════════════════════════════════
   COUNTDOWN
═══════════════════════════════════════════════ */
const Countdown = (() => {
  function render(plant) {
    const card=document.getElementById('countdown-card');
    const veg=parseInt(plant.vegWeeks)||0, flor=parseInt(plant.flowerWeeks)||0;
    if ((!veg&&!flor)||!plant.startDate) { card.classList.add('hidden'); return; }
    const total=( veg+flor)*7, lived=Utils.daysAlive(plant);
    const rem=Math.max(0,total-lived), pct=Math.min(100,Math.round((lived/total)*100));
    const hd=new Date(plant.startDate+'T00:00:00'); hd.setDate(hd.getDate()+total);
    document.getElementById('countdown-date').textContent=hd.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
    document.getElementById('countdown-days').textContent=rem;
    document.getElementById('countdown-unit').textContent=rem===1?'dia':'dias';
    const bar=document.getElementById('countdown-bar');
    bar.style.width=pct+'%';
    bar.style.background=pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--accent)';
    card.classList.remove('hidden');
  }
  return { render };
})();


/* ═══════════════════════════════════════════════
   WATERING
═══════════════════════════════════════════════ */
const Watering = (() => {
  function next(plant) {
    const withN=parseInt(plant.cycleWith)||2, withoutN=parseInt(plant.cycleWithout)||1;
    const total=withN+withoutN;
    const regas=(plant.entries||[]).filter(e=>e.actionType==='rega'||e.water).sort((a,b)=>a.date.localeCompare(b.date));
    if (!regas.length) return { type:'com', sub:'Sem histórico de regas' };
    const pos=regas.length%total;
    const type=pos<withN?'com':'sem';
    const last=regas[regas.length-1];
    const d=Utils.daysBetween(last.date,Utils.today());
    const dStr=d===0?'hoje':d===1?'há 1 dia':`há ${d} dias`;
    return { type, sub:`Última rega ${dStr} · ciclo ${withN}+${withoutN}` };
  }
  function renderCard(plant) {
    const card=document.getElementById('watering-card');
    if (!card) return;
    const info=next(plant);
    const withN=parseInt(plant.cycleWith)||2, withoutN=parseInt(plant.cycleWithout)||1;
    card.innerHTML=`
      <div class="wcard-left">
        <span class="wcard-eyebrow">Próxima rega</span>
        <span class="wcard-next ${info.type}">${info.type==='com'?'💧🧪 com nutriente':'💧 sem nutriente'}</span>
        <span class="wcard-sub">${info.sub}</span>
      </div>
      <div class="wcard-cycle">
        <span class="wcard-cycle-n">${withN}</span>
        <span class="wcard-cycle-sep">+</span>
        <span class="wcard-cycle-n">${withoutN}</span>
      </div>`;
    card.classList.remove('hidden');
  }
  return { next, renderCard };
})();


/* ═══════════════════════════════════════════════
   ACTION TYPE
═══════════════════════════════════════════════ */
const ActionType = (() => {
  const MAP = {
    geral:['ef-ambiente','ef-luz','ef-rega'], rega:['ef-ambiente','ef-rega'],
    clima:['ef-ambiente','ef-luz'], luz:['ef-luz'],
    poda:['af-poda'], lst:['af-lst'], defoliacao:['af-poda'],
    transplante:['af-transplante'], flush:['af-flush','ef-rega'], runoff:['af-runoff'],
  };
  const ALL=['ef-ambiente','ef-luz','ef-rega','af-poda','af-lst','af-transplante','af-flush','af-runoff'];
  const LABELS={ geral:'Novo Registro', rega:'💧 Rega', clima:'🌡️ Clima', luz:'💡 Luz', poda:'✂️ Poda', lst:'🪢 LST', defoliacao:'🍃 Defoliação', transplante:'🪴 Transplante', flush:'🚿 Flush', runoff:'🧪 Runoff' };

  function select(btn) {
    document.querySelectorAll('#action-type-grid .atype-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const type=btn.dataset.v;
    if (type==='defoliacao') UI.setPill('af-poda-type','defoliacao');
    else if (type==='poda')  UI.setPill('af-poda-type','topping');
    const vis=MAP[type]||MAP.geral;
    ALL.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden',!vis.includes(id)); });
    document.getElementById('me-title').textContent=LABELS[type]||'Novo Registro';
  }
  function getSelected() { return document.querySelector('#action-type-grid .atype-btn.active')?.dataset.v||'geral'; }
  function reset()  { const b=document.querySelector('#action-type-grid .atype-btn[data-v="geral"]'); if(b) select(b); }
  function preset(t){ const b=document.querySelector(`#action-type-grid .atype-btn[data-v="${t}"]`); if(b) select(b); }
  function getActionData(type) {
    const v=id=>{ const el=document.getElementById(id); return el?el.value.trim():null; };
    const n=id=>{ const el=document.getElementById(id); return el?parseFloat(el.value)||null:null; };
    switch(type) {
      case 'poda': case 'defoliacao': return { podaTecnica:UI.getPill('af-poda-type'), podaNodes:n('af-poda-nodes') };
      case 'lst':         return { lstTecnica:UI.getPill('af-lst-type'), lstDesc:v('af-lst-desc')||null };
      case 'transplante': return { tpFrom:n('af-tp-from'), tpTo:n('af-tp-to'), tpSubstrate:v('af-tp-substrate')||null };
      case 'flush':       return { flushVol:n('af-flush-vol'), flushPh:n('af-flush-ph') };
      case 'runoff':      return { roPh:n('af-ro-ph'), roEc:n('af-ro-ec') };
      default: return {};
    }
  }
  function clearFields() {
    ['af-poda-nodes','af-lst-desc','af-tp-from','af-tp-to','af-tp-substrate','af-flush-vol','af-flush-ph','af-ro-ph','af-ro-ec']
      .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  }
  return { select, getSelected, reset, preset, getActionData, clearFields };
})();


/* ═══════════════════════════════════════════════
   ENTRY
═══════════════════════════════════════════════ */
const Entry = (() => {
  let _nutrients = [];

  function autoProgress() {
    const plant=DB.getPlant(App.activePlantId()); if(!plant) return;
    const date=document.getElementById('ef-date').value; if(!date) return;
    document.getElementById('ef-days-auto').textContent=Utils.daysAlive(plant,date)+' dias';
    document.getElementById('ef-weeks-auto').textContent='Sem. '+Utils.weekInStage(plant,date);
  }

  function addNutrient() {
    const name=document.getElementById('nut-name').value.trim();
    if (!name) return;
    const qty=parseFloat(document.getElementById('nut-qty').value)||null;
    _nutrients.push({ name, qty });
    document.getElementById('nut-name').value='';
    document.getElementById('nut-qty').value='';
    _renderNutTags();
    Library.renderNutAutocomplete('');
  }
  function addNutrientFromLib(name) {
    document.getElementById('nut-name').value=name;
    document.getElementById('nut-name').focus();
  }
  function removeNutrient(i) { _nutrients.splice(i,1); _renderNutTags(); }
  function _renderNutTags() {
    document.getElementById('nut-tags').innerHTML=_nutrients
      .map((n,i)=>`<span class="nut-tag">${Utils.esc(n.name)}${n.qty?' '+n.qty+' ml/L':''}<span class="nut-tag-rm" onclick="Entry.removeNutrient(${i})">✕</span></span>`)
      .join('');
  }

  function reset(plantId, data) {
    _nutrients = data?.nutrients ? [...data.nutrients] : [];
    const plant=DB.getPlant(plantId);
    const date=data?.date||Utils.today();
    const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v??''; };
    sv('ef-date',date); sv('ef-time',data?.time||Utils.nowTime());
    sv('ef-temp',data?.temp||''); sv('ef-ur',data?.ur||'');
    sv('ef-lux',data?.lux||''); sv('ef-dimmer',data?.dimmer||'');
    sv('ef-dist',data?.dist||''); sv('ef-ledon',data?.ledon||'');
    sv('ef-ledoff',data?.ledoff||''); sv('ef-water',data?.water||'');
    sv('ef-ec',data?.ec||''); sv('ef-ph',data?.ph||'');
    sv('ef-obs',data?.obs||''); sv('nut-name',''); sv('nut-qty','');
    _renderNutTags();

    ['ef-ppfd-auto','ef-dli-auto'].forEach(id=>{ const el=document.getElementById(id); if(el){el.textContent='—';el.classList.add('dim');} });
    document.getElementById('light-feedback')?.classList.add('hidden');
    const vEl=document.getElementById('ef-vpd-auto'), zEl=document.getElementById('ef-vpd-zone');
    if(vEl){vEl.textContent='—';vEl.classList.add('dim');vEl.style.color='';}
    if(zEl){zEl.textContent='—';zEl.classList.add('dim');zEl.style.color='';}

    if(data?.lux) Light.recalc();
    if(data?.temp&&data?.ur) VPD.recalc();

    UI.resetToggle('tgl-water','water-fields'); UI.resetToggle('tgl-nut','nut-fields');
    if(data?.water) UI.forceToggle('tgl-water','water-fields');
    if(data?.nutrients?.length) UI.forceToggle('tgl-nut','nut-fields');

    ActionType.reset(); ActionType.clearFields();
    if(data?.actionType){ const b=document.querySelector(`#action-type-grid .atype-btn[data-v="${data.actionType}"]`); if(b) ActionType.select(b); }

    const stage=data?.stage||(plant?.stage)||'vegetativo';
    UI.setPill('entry-stage-group',stage);
    if(data){
      const si=(id,v)=>{ const el=document.getElementById(id); if(el&&v!=null) el.value=v; };
      si('af-poda-nodes',data.podaNodes); si('af-lst-desc',data.lstDesc);
      si('af-tp-from',data.tpFrom); si('af-tp-to',data.tpTo);
      si('af-tp-substrate',data.tpSubstrate); si('af-flush-vol',data.flushVol);
      si('af-flush-ph',data.flushPh); si('af-ro-ph',data.roPh); si('af-ro-ec',data.roEc);
      if(data.podaTecnica) UI.setPill('af-poda-type',data.podaTecnica);
      if(data.lstTecnica)  UI.setPill('af-lst-type',data.lstTecnica);
    }
    if(plant){
      document.getElementById('ef-days-auto').textContent=Utils.daysAlive(plant,date)+' dias';
      document.getElementById('ef-weeks-auto').textContent='Sem. '+Utils.weekInStage(plant,date);
    }
    // populate substrate autocomplete on reset
    Library.renderSubstrateList(document.getElementById('ef-substrate-sel'));
  }

  function getNutrients() { return [..._nutrients]; }
  return { autoProgress, addNutrient, addNutrientFromLib, removeNutrient, reset, getNutrients };
})();


/* ═══════════════════════════════════════════════
   LIBRARY — Biblioteca de insumos
═══════════════════════════════════════════════ */
const Library = (() => {
  const SOIL_TYPE_LABEL = { inerte:'🪨 Inerte', organico:'🌿 Orgânico', organomineral:'⚗️ Organomineral', coco:'🌴 Coco' };
  const NUT_TYPE_LABEL  = { mineral:'⚗️ Mineral', organico:'🌿 Orgânico', adubo:'🌱 Adubo sólido' };

  /* ── Substrate list ── */
  function renderSubstrateList(selectEl) {
    if (!selectEl) return;
    const lib = DB.getLib();
    selectEl.innerHTML = `<option value="">— selecione ou deixe em branco —</option>` +
      lib.substrates.map(s => `<option value="${s.id}">${Utils.esc(s.name)}</option>`).join('') +
      lib.recipes.map(r => `<option value="recipe_${r.id}">${Utils.esc(r.name)}</option>`).join('');
  }

  /* ── Nutrient autocomplete ── */
  function renderNutAutocomplete(query) {
    const list = document.getElementById('nut-autocomplete');
    if (!list) return;
    const lib  = DB.getLib();
    const q    = query.toLowerCase();
    const hits = lib.nutrients.filter(n => !q || n.name.toLowerCase().includes(q));
    if (!hits.length) { list.classList.add('hidden'); return; }
    list.innerHTML = hits.map(n =>
      `<div class="autocomplete-item" onclick="Entry.addNutrientFromLib('${Utils.esc(n.name)}');document.getElementById('nut-autocomplete').classList.add('hidden')">
        <span>${NUT_TYPE_LABEL[n.type]||'🧪'}</span>
        <div><div>${Utils.esc(n.name)}</div><div class="autocomplete-item-sub">${n.doseMin||''}${n.doseMin?'–'+n.doseMax+' ml/L':''}</div></div>
      </div>`
    ).join('');
    list.classList.remove('hidden');
  }

  /* ── Library screen render ── */
  function renderScreen() {
    const lib = DB.getLib();
    // Substrates
    const subEl = document.getElementById('lib-substrates-list');
    if (subEl) subEl.innerHTML = lib.substrates.length
      ? lib.substrates.map(s => _itemHTML('substrates', s, SOIL_TYPE_LABEL[s.type]||'🪨', s.brand||s.notes||'')).join('')
      : '<div class="empty-hint">Nenhum substrato cadastrado.</div>';
    // Recipes
    const recEl = document.getElementById('lib-recipes-list');
    if (recEl) recEl.innerHTML = lib.recipes.length
      ? lib.recipes.map(r => _itemHTML('recipes', r, '📋', r.recipe?.substring(0,60)||'')).join('')
      : '<div class="empty-hint">Nenhuma receita cadastrada.</div>';
    // Nutrients
    const nutEl = document.getElementById('lib-nutrients-list');
    if (nutEl) nutEl.innerHTML = lib.nutrients.length
      ? lib.nutrients.map(n => _itemHTML('nutrients', n, NUT_TYPE_LABEL[n.type]||'🧪', n.doseMin?`${n.doseMin}–${n.doseMax} ml/L`:'')).join('')
      : '<div class="empty-hint">Nenhum nutriente cadastrado.</div>';
    // Setups
    const setupEl = document.getElementById('lib-setups-list');
    if (setupEl) setupEl.innerHTML = (lib.setups||[]).length
      ? (lib.setups||[]).map(s => _itemHTML('setups', s, '💡', [s.ledModel, s.tentSize].filter(Boolean).join(' · '))).join('')
      : '<div class="empty-hint">Nenhum setup cadastrado.</div>';
  }

  function _itemHTML(cat, item, icon, sub) {
    return `<div class="lib-item" onclick="Library.openItem('${cat}','${item.id}')">
      <div class="lib-item-icon">${icon}</div>
      <div class="lib-item-info">
        <div class="lib-item-name">${Utils.esc(item.name)}</div>
        ${sub?`<div class="lib-item-sub">${Utils.esc(sub)}</div>`:''}
      </div>
      <div class="lib-item-action">›</div>
    </div>`;
  }

  function switchTab(tab) {
    document.querySelectorAll('.lib-tab').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
    document.querySelectorAll('.lib-content').forEach(c => c.classList.toggle('active', c.id==='lib-'+tab));
  }

  /* ── Open/save item modal ── */
  let _editCat=null, _editId=null;
  function openItem(cat, id) {
    _editCat=cat; _editId=id||null;
    const lib=DB.getLib();
    const item=id?(lib[cat]||[]).find(x=>x.id===id):null;
    document.getElementById('lib-modal-title').textContent = item ? 'Editar item' : _catLabel(cat);
    // reset all fields
    ['lib-item-name','lib-item-notes','lib-item-recipe','lib-item-brand',
     'lib-item-dose-min','lib-item-dose-max',
     'lib-setup-led-model','lib-setup-led-type','lib-setup-led-watts',
     'lib-setup-photo-on','lib-setup-photo-off','lib-setup-tent-size',
     'lib-setup-exhaust','lib-setup-fan','lib-setup-timer',
     'lib-setup-co2','lib-setup-vpd-sensor','lib-setup-light-sensor',
     'lib-setup-camera','lib-setup-irrigation','lib-setup-smart-plug',
    ].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=''; });
    UI.setPill('lib-soil-type','inerte');
    UI.setPill('lib-nut-type','mineral');
    _updateLibFields(cat);
    if (item) {
      const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
      sv('lib-item-name',item.name); sv('lib-item-notes',item.notes);
      sv('lib-item-recipe',item.recipe); sv('lib-item-brand',item.brand);
      sv('lib-item-dose-min',item.doseMin); sv('lib-item-dose-max',item.doseMax);
      if(item.type&&cat==='substrates') UI.setPill('lib-soil-type',item.type);
      if(item.type&&cat==='nutrients')  UI.setPill('lib-nut-type',item.type);
      if(cat==='setups') {
        sv('lib-setup-led-model',   item.ledModel);
        sv('lib-setup-led-type',    item.ledType);
        sv('lib-setup-led-watts',   item.ledWatts);
        sv('lib-setup-photo-on',    item.photoOn);
        sv('lib-setup-photo-off',   item.photoOff);
        sv('lib-setup-tent-size',   item.tentSize);
        sv('lib-setup-exhaust',     item.exhaust);
        sv('lib-setup-fan',         item.fan);
        sv('lib-setup-timer',       item.timer);
        sv('lib-setup-co2',         item.co2);
        sv('lib-setup-vpd-sensor',  item.vpdSensor);
        sv('lib-setup-light-sensor',item.lightSensor);
        sv('lib-setup-camera',      item.camera);
        sv('lib-setup-irrigation',  item.irrigationAuto);
        sv('lib-setup-smart-plug',  item.smartPlug);
      }
    }
    document.getElementById('lib-del-btn').style.display=id?'':'none';
    Modals.open('modal-lib-item');
  }

  function _updateLibFields(cat) {
    ['lib-fields-substrate','lib-fields-recipe','lib-fields-nutrient','lib-fields-setup']
      .forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('hidden'); });
    const map={ substrates:'lib-fields-substrate', recipes:'lib-fields-recipe', nutrients:'lib-fields-nutrient', setups:'lib-fields-setup' };
    const el=document.getElementById(map[cat]); if(el) el.classList.remove('hidden');
  }

  function _catLabel(cat) {
    return { substrates:'Novo substrato', recipes:'Nova receita de solo', nutrients:'Novo nutriente', setups:'Novo setup' }[cat]||'Novo item';
  }

  function saveItem() {
    const name=document.getElementById('lib-item-name').value.trim();
    if (!name) { UI.toast('Informe o nome.'); return; }
    const sv=id=>{ const el=document.getElementById(id); return el?el.value.trim()||null:null; };
    const nv=id=>{ const el=document.getElementById(id); return el?parseFloat(el.value)||null:null; };

    let item = { id: _editId || Utils.uid(), name };

    if (_editCat === 'substrates') {
      item = { ...item, type:UI.getPill('lib-soil-type'), brand:sv('lib-item-brand'), notes:sv('lib-item-notes') };
    } else if (_editCat === 'recipes') {
      item = { ...item, recipe:sv('lib-item-recipe'), notes:sv('lib-item-notes') };
    } else if (_editCat === 'nutrients') {
      item = { ...item, type:UI.getPill('lib-nut-type'), doseMin:nv('lib-item-dose-min'), doseMax:nv('lib-item-dose-max'), notes:sv('lib-item-notes') };
    } else if (_editCat === 'setups') {
      item = { ...item,
        ledModel:  sv('lib-setup-led-model'),
        ledType:   sv('lib-setup-led-type'),
        ledWatts:  sv('lib-setup-led-watts'),
        photoOn:   sv('lib-setup-photo-on'),
        photoOff:  sv('lib-setup-photo-off'),
        tentSize:  sv('lib-setup-tent-size'),
        exhaust:   sv('lib-setup-exhaust'),
        fan:       sv('lib-setup-fan'),
        timer:     sv('lib-setup-timer'),
        co2:       sv('lib-setup-co2'),
        vpdSensor: sv('lib-setup-vpd-sensor'),
        lightSensor:sv('lib-setup-light-sensor'),
        camera:    sv('lib-setup-camera'),
        irrigationAuto:sv('lib-setup-irrigation'),
        smartPlug: sv('lib-setup-smart-plug'),
        notes:     sv('lib-item-notes'),
      };
    }

    DB.upsertLibItem(_editCat, item);
    Modals.close('modal-lib-item');
    renderScreen();
    UI.toast('Salvo! ✅');
  }

  function deleteItem() {
    if (!_editId) return;
    UI.confirm('Excluir item', 'Remover este item da biblioteca?').then(ok => {
      if (!ok) return;
      DB.deleteLibItem(_editCat, _editId);
      Modals.close('modal-lib-item');
      renderScreen();
      UI.toast('Removido.');
    });
  }

  return { renderScreen, renderSubstrateList, renderNutAutocomplete, switchTab, openItem, saveItem, deleteItem };
})();


/* ═══════════════════════════════════════════════
   GENEALOGY
═══════════════════════════════════════════════ */
const Genealogy = (() => {
  function render(activePlantId) {
    const el = document.getElementById('tab-genealogy');
    if (!el) return;
    const { plants } = DB.get();
    if (plants.length === 0) { el.innerHTML = '<div class="empty-hint">Nenhuma planta cadastrada.</div>'; return; }

    // Build tree
    const roots = plants.filter(p => !p.parentId);
    el.innerHTML = `<div class="genealogy-wrap"><div class="gene-tree">${roots.map(r => _nodeHTML(r, plants, activePlantId, 0)).join('')}</div></div>`;
  }

  function _nodeHTML(plant, all, activeId, depth) {
    const children = all.filter(p => p.parentId === plant.id);
    const isActive = plant.id === activeId;
    const isMother = children.length > 0;
    const days     = Utils.daysAlive(plant);
    const badge    = isActive ? '<span class="gene-node-badge gene-badge-self">atual</span>' : isMother ? '<span class="gene-node-badge gene-badge-mother">madre</span>' : '<span class="gene-node-badge gene-badge-clone">clone</span>';
    const indent   = depth > 0 ? 'gene-indent' : '';
    const motherCls= isMother && !isActive ? 'is-mother' : '';

    let html = `
      ${depth>0?'<div class="gene-connector"></div>':''}
      <div class="gene-node ${isActive?'is-active':''} ${motherCls} ${indent}" onclick="App.openPlant('${plant.id}')">
        <span class="gene-node-emoji">${Utils.stageEmoji(plant.stage)}</span>
        <div class="gene-node-info">
          <div class="gene-node-name">${Utils.esc(plant.name)}</div>
          <div class="gene-node-meta">${Utils.stageLabel(plant.stage)} · ${days}d</div>
        </div>
        ${badge}
      </div>`;
    if (children.length) html += children.map(c => _nodeHTML(c, all, activeId, depth+1)).join('');
    return html;
  }

  return { render };
})();


/* ═══════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════ */
const Analytics = (() => {
  function render() {
    const { plants } = DB.get();
    const wrap = document.getElementById('stats-screen');
    if (!wrap) return;
    if (plants.length === 0) { wrap.innerHTML = '<div class="empty-hint" style="padding:40px">Sem dados ainda.<br>Adicione plantas e registros para ver analytics.</div>'; return; }

    const allEntries = plants.flatMap(p => (p.entries||[]).map(e=>({...e,_plant:p})));
    const totalLogs  = allEntries.length;
    const waterTotal = allEntries.reduce((a,e)=>a+(e.water||0),0);
    const avgTemp    = _avg(allEntries.filter(e=>e.temp).map(e=>e.temp));
    const avgVPD     = _avg(allEntries.filter(e=>e.vpd).map(e=>e.vpd));

    const actionCounts = {};
    allEntries.forEach(e => { const t=e.actionType||'geral'; actionCounts[t]=(actionCounts[t]||0)+1; });
    const maxAction = Math.max(...Object.values(actionCounts), 1);

    const ACTION_LABEL = { geral:'Geral', rega:'Rega', clima:'Clima', luz:'Luz', poda:'Poda', lst:'LST', defoliacao:'Defoliação', transplante:'Transplante', flush:'Flush', runoff:'Runoff' };
    const ACTION_COLOR = { rega:'blue', poda:'red', flush:'blue', lst:'', runoff:'' };

    // Water per plant
    const waterByPlant = plants.map(p=>({ name:p.name, val:((p.entries||[]).reduce((a,e)=>a+(e.water||0),0)/1000) })).filter(x=>x.val>0);
    const maxWater = Math.max(...waterByPlant.map(x=>x.val), 1);

    wrap.innerHTML = `
      <div class="stats-screen">
        <div class="analytics-kpi-row">
          ${_kpi('🌱', plants.length, 'Plantas')}
          ${_kpi('📋', totalLogs, 'Registros')}
          ${_kpi('💧', waterTotal>0?(waterTotal/1000).toFixed(1)+'L':'—', 'Água total')}
          ${_kpi('🌡️', avgTemp?avgTemp+'°C':'—', 'Temp. média')}
        </div>
        ${avgVPD ? `
        <div class="analytics-kpi-row">
          ${_kpi('🌬️', avgVPD, 'VPD médio')}
          ${_kpi('📅', plants.length?Math.max(...plants.map(p=>Utils.daysAlive(p)))+'d':'—', 'Ciclo mais longo')}
          ${_kpi('✂️', allEntries.filter(e=>['poda','lst','defoliacao'].includes(e.actionType)).length, 'Treinamentos')}
          ${_kpi('🚿', allEntries.filter(e=>e.actionType==='flush').length, 'Flushes')}
        </div>` : ''}

        <div class="analytics-section">
          <div class="analytics-section-title">Ações por tipo</div>
          <div class="bar-chart">
            ${Object.entries(actionCounts).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`
              <div class="bar-row">
                <div class="bar-label">${ACTION_LABEL[t]||t}</div>
                <div class="bar-track"><div class="bar-fill ${ACTION_COLOR[t]||''}" style="width:${(c/maxAction*100).toFixed(1)}%"></div></div>
                <div class="bar-val">${c}</div>
              </div>`).join('')}
          </div>
        </div>

        ${waterByPlant.length ? `
        <div class="analytics-section">
          <div class="analytics-section-title">Água por planta (L)</div>
          <div class="bar-chart">
            ${waterByPlant.map(x=>`
              <div class="bar-row">
                <div class="bar-label">${Utils.esc(x.name.substring(0,10))}</div>
                <div class="bar-track"><div class="bar-fill blue" style="width:${(x.val/maxWater*100).toFixed(1)}%"></div></div>
                <div class="bar-val">${x.val.toFixed(1)}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <div class="analytics-section">
          <div class="analytics-section-title">Por planta</div>
          ${plants.map(p => {
            const ent=p.entries||[];
            const water=ent.reduce((a,e)=>a+(e.water||0),0);
            const tAvg=_avg(ent.filter(e=>e.temp).map(e=>e.temp));
            const urAvg=_avg(ent.filter(e=>e.ur).map(e=>e.ur));
            const phAvg=_avg(ent.filter(e=>e.ph).map(e=>e.ph));
            return `<div class="stats-plant-block">
              <div class="stats-plant-name">${Utils.stageEmoji(p.stage)} ${Utils.esc(p.name)}</div>
              ${_row('Estágio',    Utils.stageLabel(p.stage),true)}
              ${_row('Início',    Utils.fmtDate(p.startDate))}
              ${_row('Dias',      Utils.daysAlive(p)+'d · Sem.'+Utils.weekInStage(p),true)}
              ${_row('Tipo',      p.type==='foto'?'Fotoperíodo':'Automática')}
              ${_row('Registros', ent.length)}
              ${_row('Água total',water>0?(water/1000).toFixed(1)+'L':'—')}
              ${tAvg?_row('Temp. média',tAvg+'°C',true):''}
              ${urAvg?_row('UR média',urAvg+'%'):''}
              ${phAvg?_row('pH médio',phAvg):''}
              ${p.setup?.tentSize?_row('Tenda',p.setup.tentSize):''}
              ${p.setup?.ledModel?_row('LED',p.setup.ledModel):''}
              ${p.soil?_row('Solo',p.soil.type==='organico'?'Orgânico':'Inerte'):''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function _avg(arr) { return arr.length?(arr.reduce((a,v)=>a+v,0)/arr.length).toFixed(1):null; }
  function _kpi(icon,val,lbl) {
    return `<div class="analytics-kpi-card"><div class="akpi-icon">${icon}</div><div class="akpi-val">${val}</div><div class="akpi-lbl">${lbl}</div></div>`;
  }
  function _row(lbl,val,accent=false) {
    return `<div class="stats-row"><span class="stats-row-lbl">${lbl}</span><span class="stats-row-val${accent?' accent':''}">${Utils.esc(String(val))}</span></div>`;
  }

  return { render };
})();


/* ═══════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════ */
const Timeline = (() => {
  const ICON  = { geral:'📋',rega:'💧',clima:'🌡️',luz:'💡',poda:'✂️',lst:'🪢',defoliacao:'🍃',transplante:'🪴',flush:'🚿',runoff:'🧪' };
  const COLOR = { geral:'var(--border-3)',rega:'var(--blue)',clima:'#94a3b8',luz:'#fde047',poda:'var(--red)',lst:'#a78bfa',defoliacao:'#86efac',transplante:'var(--amber)',flush:'var(--blue)',runoff:'#34d399' };
  const LABEL = { geral:'Registro geral',rega:'Rega',clima:'Clima',luz:'Luz',poda:'Poda',lst:'LST',defoliacao:'Defoliação',transplante:'Transplante',flush:'Flush',runoff:'Runoff' };

  function render(plant, entries) {
    const el=document.getElementById('cycle-timeline');
    if (!entries?.length) { el.innerHTML='<div class="empty-hint">Adicione registros para ver a timeline.</div>'; return; }
    const sorted=[...entries].sort((a,b)=>(a.date+(a.time||'00:00')).localeCompare(b.date+(b.time||'00:00')));
    const byDate={};
    sorted.forEach(e=>{ if(!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); });

    el.innerHTML = Object.entries(byDate).reverse().map(([date,dayEnts])=>{
      const obj=new Date(date+'T00:00:00');
      const lbl=obj.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
      const d=Utils.daysBetween(plant.startDate,date);
      return `<div class="tl-day">
        <div class="tl-day-header"><span class="tl-day-label">${lbl}</span><span class="tl-day-num">D${d}</span></div>
        <div class="tl-entries">${dayEnts.map(e=>_node(e,plant)).join('')}</div>
      </div>`;
    }).join('') + `<div class="tl-start-node"><span class="tl-start-dot">🌱</span><span>Início do ciclo · ${Utils.fmtDate(plant.startDate)}</span></div>`;
  }

  function _node(e, plant) {
    const type=e.actionType||'geral', icon=ICON[type]||'📋', color=COLOR[type]||'var(--border-3)';
    const pType=plant?.type||'auto', week=e.weekInStage||1;
    const chips=[];
    if(e.temp&&e.ur) chips.push(`${e.temp}°C · ${e.ur}%`);
    if(e.vpd)   chips.push(`VPD ${e.vpd}`);
    if(e.water) chips.push(`💧 ${e.water}ml`);
    if(e.ph)    chips.push(`pH ${e.ph}`);
    if(e.ppfd)  chips.push(`⚡${e.ppfd}`);
    if(e.podaTecnica) chips.push(e.podaTecnica);
    if(e.lstTecnica)  chips.push(e.lstTecnica);
    if(e.tpTo)  chips.push(`🪴→${e.tpTo}L`);
    return `<div class="tl-node" onclick="Modals.openEntryDetail('${e.id}')">
      <div class="tl-node-dot" style="background:${color}"></div>
      <div class="tl-node-body">
        <div class="tl-node-head">
          <span class="tl-node-icon">${icon}</span>
          <span class="tl-node-type">${LABEL[type]||type}</span>
          ${e.time?`<span class="tl-node-time">${e.time}</span>`:''}
        </div>
        ${chips.length?`<div class="tl-chips">${chips.map(c=>`<span class="tl-chip">${Utils.esc(c)}</span>`).join('')}</div>`:''}
        ${e.obs?`<div class="tl-obs">${Utils.esc(e.obs).substring(0,100)}${e.obs.length>100?'…':''}</div>`:''}
      </div>
    </div>`;
  }
  return { render };
})();


/* ═══════════════════════════════════════════════
   UI
═══════════════════════════════════════════════ */
const UI = (() => {
  let _cr=null, _tt=null;

  function setPill(groupId,value) {
    document.getElementById(groupId)?.querySelectorAll('.pill').forEach(p=>p.classList.toggle('active',p.dataset.v===value));
  }
  function getPill(groupId) {
    return document.getElementById(groupId)?.querySelector('.pill.active')?.dataset.v||'';
  }
  function initPills(groupId) {
    document.getElementById(groupId)?.querySelectorAll('.pill').forEach(btn=>{
      btn.addEventListener('click',()=>{ document.getElementById(groupId).querySelectorAll('.pill').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); });
    });
  }
  function toggle(btnId,secId) {
    const b=document.getElementById(btnId),s=document.getElementById(secId); if(!b||!s) return;
    const on=!b.classList.contains('on');
    b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); s.classList.toggle('open',on);
  }
  function resetToggle(btnId,secId) { const b=document.getElementById(btnId),s=document.getElementById(secId); if(!b||!s) return; b.classList.remove('on'); b.setAttribute('aria-checked','false'); s.classList.remove('open'); }
  function forceToggle(btnId,secId) { const b=document.getElementById(btnId),s=document.getElementById(secId); if(!b||!s) return; b.classList.add('on'); b.setAttribute('aria-checked','true'); s.classList.add('open'); }

  function toast(msg) {
    const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
    clearTimeout(_tt); _tt=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function confirm(title,msg) {
    return new Promise(resolve=>{
      _cr=resolve;
      document.getElementById('confirm-title').textContent=title;
      document.getElementById('confirm-msg').textContent=msg;
      Modals.open('modal-confirm');
    });
  }
  function resolveConfirm(ok) { Modals.close('modal-confirm'); if(_cr){_cr(ok);_cr=null;} }

  function setActive(screen) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('screen-'+screen)?.classList.add('active');
    document.querySelectorAll('.bnav-item').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));
  }

  return { setPill, getPill, initPills, toggle, resetToggle, forceToggle, toast, confirm, resolveConfirm, setActive };
})();


/* ═══════════════════════════════════════════════
   DETAIL TABS
═══════════════════════════════════════════════ */
const DetailTabs = (() => {
  function switchTab(tab) {
    document.querySelectorAll('.dtab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.detail-tab-content').forEach(c=>c.classList.toggle('active',c.id==='tab-'+tab));
    if (tab === 'genealogy') Genealogy.render(App.activePlantId());
  }
  return { switch: switchTab };
})();


/* ═══════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════ */
const Render = (() => {
  function home() {
    const { plants } = DB.get();
    const allEntries = plants.flatMap(p=>p.entries||[]);
    // KPIs
    document.getElementById('kpi-plants').textContent = plants.length;
    document.getElementById('kpi-logs').textContent   = allEntries.length;
    document.getElementById('kpi-days').textContent   = plants.length ? Math.max(...plants.map(p=>Utils.daysAlive(p))) : '—';

    // Hero: última planta ativa
    const heroWrap = document.getElementById('home-hero-content');
    if (plants.length === 0) {
      heroWrap.innerHTML = `
        <div class="home-empty">
          <div class="home-empty-icon">🌱</div>
          <div class="home-empty-title">Comece seu primeiro cultivo</div>
          <div class="home-empty-sub">Registre cada etapa da planta à colheita.</div>
        </div>`;
    } else {
      const p = plants[plants.length-1];
      const days = Utils.daysAlive(p), weeks = Utils.weekInStage(p);
      heroWrap.innerHTML = `
        <div class="home-hero">
          <div class="home-greeting">Cultivo ativo</div>
          <div class="home-focus-plant" onclick="App.openPlant('${p.id}')">
            <div>
              <div class="home-focus-name">${Utils.esc(p.name)}</div>
              <div class="home-focus-meta"><span class="stage-tag stage-${p.stage||'vegetativo'}">${Utils.stageLabel(p.stage)}</span> · sem. ${weeks}</div>
            </div>
            <div class="home-focus-counter">
              <div class="home-focus-days">${days}</div>
              <div class="home-focus-days-lbl">dias</div>
            </div>
          </div>
        </div>`;
    }

    // Alerts
    const alertEl = document.getElementById('alert-strip');
    if (plants.length) {
      const items = plants.map(p => {
        const last=(p.entries||[]).slice(-1)[0];
        if (!last) return { cls:'warn', text:`"${Utils.esc(p.name)}" — sem registros` };
        const d = Math.round((Date.now()-new Date(last.date))/86_400_000);
        return d>=2 ? { cls:'warn', text:`"${Utils.esc(p.name)}" — último registro há ${d} dias` }
                    : { cls:'ok',   text:`"${Utils.esc(p.name)}" — atualizado recentemente` };
      });
      alertEl.innerHTML = items.map(i=>`<div class="alert-item ${i.cls}"><span class="alert-dot dot-${i.cls}"></span>${i.text}</div>`).join('');
      alertEl.classList.remove('hidden');
    } else {
      alertEl.classList.add('hidden');
    }

    // Plant list
    const listEl = document.getElementById('plant-list');
    if (plants.length === 0) { listEl.innerHTML = ''; return; }
    listEl.innerHTML = plants.map(p => {
      const days=Utils.daysAlive(p), weeks=Utils.weekInStage(p), stage=p.stage||'vegetativo';
      return `<div class="plant-card" onclick="App.openPlant('${p.id}')">
        <div class="plant-avatar">${Utils.stageEmoji(stage)}</div>
        <div class="plant-info">
          <div class="plant-name">${Utils.esc(p.name)}</div>
          <div class="plant-meta"><span class="stage-tag stage-${stage}">${Utils.stageLabel(stage)}</span><span>${p.type==='foto'?'Fotoperíodo':'Automática'}</span></div>
        </div>
        <div class="plant-counter">
          <div class="plant-days-num">${days}</div>
          <div class="plant-days-lbl">d / s${weeks}</div>
        </div>
      </div>`;
    }).join('');
  }

  function detail(plant) {
    const days  = plant.daysOverride  ?? Utils.daysAlive(plant);
    const weeks = plant.weeksOverride ?? Utils.weekInStage(plant);
    const stage = plant.stage || 'vegetativo';
    const entries = plant.entries || [];

    document.getElementById('header-title').textContent = plant.name;

    // Hero numbers
    document.getElementById('hero-days').textContent   = days;
    document.getElementById('hero-weeks').textContent  = weeks;
    document.getElementById('hero-stage-label').textContent = Utils.stageLabel(stage);

    // Stage dot color
    const dot = document.getElementById('hero-stage-dot');
    if (dot) {
      const colors = { germinacao:'var(--amber)', plantula:'var(--accent-hi)', vegetativo:'#6dcc80', floracao:'#e07070', colheita:'var(--purple)' };
      dot.style.background = colors[stage] || 'var(--accent)';
    }

    // Alert
    const alertEl = document.getElementById('detail-alert');
    const last = entries.slice(-1)[0];
    if (!last) {
      alertEl.innerHTML = 'Nenhum registro ainda. Toque em <strong>＋ Registrar</strong> para começar.';
      alertEl.className = 'detail-alert'; alertEl.classList.remove('hidden');
    } else {
      const diff = Math.round((Date.now()-new Date(last.date))/86_400_000);
      if (diff >= 2) {
        alertEl.innerHTML = `⚠️ Último registro há <strong>${diff} dias</strong>. Hora de atualizar?`;
        alertEl.className = 'detail-alert'; alertEl.classList.remove('hidden');
      } else {
        alertEl.innerHTML = `✅ Atualizado em <strong>${Utils.fmtDate(last.date)}</strong>`;
        alertEl.className = 'detail-alert ok'; alertEl.classList.remove('hidden');
      }
    }

    _renderEntries(entries, plant);
    Timeline.render(plant, entries);
    Countdown.render(plant);
    Watering.renderCard(plant);

    // VPD card
    const lastVpd = [...entries].reverse().find(e=>e.temp&&e.ur);
    const vpdCard = document.getElementById('vpd-card');
    if (lastVpd) {
      const vpd = VPD.calc(lastVpd.temp, lastVpd.ur);
      const zi  = VPD.zone(vpd, stage);
      document.getElementById('vpd-val').textContent  = vpd;
      document.getElementById('vpd-zone').textContent = zi.label;
      document.getElementById('vpd-zone').style.color = zi.color;
      vpdCard.classList.remove('hidden');
    } else {
      vpdCard.classList.add('hidden');
    }
  }

  function _renderEntries(entries, plant) {
    const el = document.getElementById('entries-list');
    if (!entries.length) { el.innerHTML='<div class="empty-hint">Nenhum registro ainda.</div>'; return; }
    const pType = plant?.type||'auto';
    el.innerHTML = [...entries].reverse().map(e => {
      const week=e.weekInStage||1;
      const chips=[];
      if(e.temp)  chips.push(`<span class="chip">${e.temp}°C ${RefTables.badge('temp',e.temp,pType,week)}</span>`);
      if(e.ur)    chips.push(`<span class="chip">${e.ur}%UR ${RefTables.badge('ur',e.ur,pType,week)}</span>`);
      if(e.vpd)   chips.push(`<span class="chip">${e.vpd} kPa ${RefTables.badge('vpd',e.vpd,pType,week)}</span>`);
      if(e.water) chips.push(`<span class="chip blue">💧 ${e.water}ml</span>`);
      if(e.ph)    chips.push(`<span class="chip">pH ${e.ph} ${RefTables.badge('ph',e.ph,pType,week)}</span>`);
      if(e.ec)    chips.push(`<span class="chip amber">EC ${e.ec} ${RefTables.badge('ec',e.ec,pType,week)}</span>`);
      if(e.ppfd)  chips.push(`<span class="chip green">⚡ ${e.ppfd}</span>`);
      const aIcons={geral:'📋',rega:'💧',clima:'🌡️',luz:'💡',poda:'✂️',lst:'🪢',defoliacao:'🍃',transplante:'🪴',flush:'🚿',runoff:'🧪'};
      const stage=e.stage||'vegetativo';
      const dateStr=e.date?new Date(e.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
      return `<div class="entry-card" onclick="Modals.openEntryDetail('${e.id}')">
        <div class="entry-head">
          <span class="entry-action-icon">${aIcons[e.actionType]||'📋'}</span>
          <span class="entry-date">${dateStr}${e.time?' · '+e.time:''}</span>
          <span class="stage-tag stage-${stage}">${Utils.stageLabel(stage)}</span>
          <span class="entry-day-badge">${e.daysAlive!==undefined?'D'+e.daysAlive:''}</span>
        </div>
        ${chips.length?`<div class="entry-chips">${chips.join('')}</div>`:''}
        ${e.obs?`<div class="entry-obs">${Utils.esc(e.obs).substring(0,140)}${e.obs.length>140?'…':''}</div>`:''}
      </div>`;
    }).join('');
  }

  return { home, detail };
})();


/* ═══════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════ */
const Modals = (() => {
  let _editPlantId=null, _editEntryId=null;

  const open  = id => document.getElementById(id)?.classList.add('open');
  const close = id => document.getElementById(id)?.classList.remove('open');

  /* ── PLANT ── */
  function openPlant(plantId) {
    _editPlantId = plantId||null;
    const plant  = plantId ? DB.getPlant(plantId) : null;
    document.getElementById('mp-title').textContent = plant ? 'Editar Planta' : 'Nova Planta';
    const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v??''; };
    sv('mp-name',plant?.name||''); sv('mp-date',plant?.startDate||Utils.today());
    sv('mp-obs',plant?.obs||''); sv('mp-veg-weeks',plant?.vegWeeks||'');
    sv('mp-flower-weeks',plant?.flowerWeeks||'');
    sv('mp-cycle-with',plant?.cycleWith??2); sv('mp-cycle-without',plant?.cycleWithout??1);
    UI.setPill('mp-type-group',plant?.type||'auto');
    _switchPlantTab('basico');
    // Solo
    const soil=plant?.soil||{};
    UI.setPill('soil-type-group',soil.type||'inerte');
    sv('soil-recipe',soil.recipe||''); sv('soil-brand',soil.brand||''); sv('soil-notes',soil.notes||'');
    _updateSoilFields(soil.type||'inerte');
    // Setup
    const setup=plant?.setup||{};
    ['tent-size','led-model','led-type','led-watts','photo-on','photo-off','exhaust','fan','timer',
     'co2','vpd-sensor','light-sensor','camera','irrigation-auto','smart-plug','notes'].forEach(k=>{
      sv('setup-'+k, setup[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]||'');
    });
    // Parent
    _renderParentSelect(plant?.parentId||'');
    // Setup — popular select da biblioteca
    _renderSetupSelect(plant?.setupId||'');
    // Solo — popular select da biblioteca
    _renderSoilSelect(plant?.soilId||'');
    open('modal-plant');
    setTimeout(()=>document.getElementById('mp-name').focus(),150);
  }

  function _renderSetupSelect(currentId) {
    const sel = document.getElementById('mp-setup-select');
    if (!sel) return;
    const lib = DB.getLib();
    sel.innerHTML = `<option value="">— sem setup —</option>` +
      (lib.setups||[]).map(s=>`<option value="${s.id}" ${s.id===currentId?'selected':''}>${Utils.esc(s.name)}</option>`).join('');
  }

  function _renderSoilSelect(currentId) {
    const sel = document.getElementById('mp-soil-select');
    if (!sel) return;
    const lib = DB.getLib();
    const subs = lib.substrates.map(s=>`<option value="sub_${s.id}">${Utils.esc(s.name)}</option>`).join('');
    const recs = lib.recipes.map(r=>`<option value="rec_${r.id}">${Utils.esc(r.name)}</option>`).join('');
    sel.innerHTML = `<option value="">— sem solo —</option>${subs}${recs}`;
    if (currentId) sel.value = currentId;
  }

  function _renderParentSelect(currentParentId) {
    const sel = document.getElementById('mp-parent');
    if (!sel) return;
    const { plants } = DB.get();
    const id = _editPlantId;
    const eligible = plants.filter(p => p.id !== id);
    sel.innerHTML = `<option value="">— sem planta mãe —</option>` +
      eligible.map(p=>`<option value="${p.id}" ${p.id===currentParentId?'selected':''}>${Utils.esc(p.name)}</option>`).join('');
  }

  function _switchPlantTab(tab) {
    document.querySelectorAll('.ptab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.ptab-content').forEach(c=>c.classList.toggle('active',c.id==='ptab-'+tab));
  }
  function switchPlantTab(tab) { _switchPlantTab(tab); }

  function _updateSoilFields(type) {
    document.getElementById('soil-inert-fields')?.classList.toggle('hidden',  type!=='inerte');
    document.getElementById('soil-organic-fields')?.classList.toggle('hidden', type!=='organico');
  }
  function setSoilType(type) { UI.setPill('soil-type-group',type); _updateSoilFields(type); }

  function savePlant() {
    const name = document.getElementById('mp-name').value.trim();
    if (!name) { UI.toast('Informe o nome da planta.'); return; }
    const g = id => document.getElementById(id);
    const gv= id => g(id)?.value.trim()||null;

    const base = {
      name, type:UI.getPill('mp-type-group')||'auto',
      startDate:g('mp-date').value||Utils.today(),
      obs:gv('mp-obs'),
      vegWeeks:parseInt(g('mp-veg-weeks').value)||null,
      flowerWeeks:parseInt(g('mp-flower-weeks').value)||null,
      cycleWith:parseInt(g('mp-cycle-with').value)||2,
      cycleWithout:parseInt(g('mp-cycle-without').value)||1,
      parentId: g('mp-parent')?.value||null,
      setupId:  g('mp-setup-select')?.value||null,
      soilId:   g('mp-soil-select')?.value||null,
    };
    if (_editPlantId) {
      const p=DB.getPlant(_editPlantId);
      if(p){ Object.assign(p,base); DB.upsertPlant(p); }
    } else {
      DB.upsertPlant({ id:Utils.uid(), ...base, stage:'vegetativo', entries:[] });
    }
    close('modal-plant');
    Render.home();
    UI.toast(_editPlantId?'Planta atualizada. ✏️':'Planta adicionada! 🌱');
  }

  /* ── STAGE ── */
  function openStage() {
    const p=DB.getPlant(App.activePlantId()); if(!p) return;
    UI.setPill('stage-pill-group',p.stage||'vegetativo');
    document.getElementById('ms-days').value=''; document.getElementById('ms-weeks').value='';
    open('modal-stage');
  }
  function saveStage() {
    const p=DB.getPlant(App.activePlantId()); if(!p) return;
    const ns=UI.getPill('stage-pill-group');
    const dOv=parseInt(document.getElementById('ms-days').value);
    const wOv=parseInt(document.getElementById('ms-weeks').value);
    if(ns&&ns!==p.stage) p.stageStartDate=Utils.today();
    const prev=p.stage;
    p.stage=ns||p.stage;
    if(!isNaN(dOv)&&dOv>=0) p.daysOverride=dOv; else delete p.daysOverride;
    if(!isNaN(wOv)&&wOv>=1) p.weeksOverride=wOv; else delete p.weeksOverride;
    DB.upsertPlant(p);
    close('modal-stage'); Render.detail(p); Render.home();
    if(ns==='colheita'&&prev!=='colheita'){ setTimeout(()=>HarvestReport.open(p.id),350); return; }
    UI.toast('Estágio atualizado.');
  }

  /* ── ENTRY ── */
  function openEntry(preset) {
    _editEntryId=null;
    document.getElementById('me-title').textContent='Novo Registro';
    Entry.reset(App.activePlantId(),null);
    if(preset==='water')   setTimeout(()=>ActionType.preset('rega'),80);
    if(preset==='climate') setTimeout(()=>ActionType.preset('clima'),80);
    open('modal-entry');
  }
  function openEditEntry(entryId) {
    const plant=DB.getPlant(App.activePlantId()); if(!plant) return;
    const entry=(plant.entries||[]).find(e=>e.id===entryId); if(!entry) return;
    _editEntryId=entryId;
    document.getElementById('me-title').textContent='✏️ Editar Registro';
    Entry.reset(App.activePlantId(),entry);
    close('modal-entry-detail'); open('modal-entry');
  }
  function saveEntry() {
    const plant=DB.getPlant(App.activePlantId()); if(!plant){UI.toast('Nenhuma planta.');return;}
    const date=document.getElementById('ef-date').value; if(!date){UI.toast('Informe a data.');return;}
    const lux=parseFloat(document.getElementById('ef-lux').value)||null;
    const on=document.getElementById('ef-ledon').value||null;
    const off=document.getElementById('ef-ledoff').value||null;
    const ppfd=lux?Light.luxToPPFD(lux):null;
    const h=Light.photoperiodHours(on,off);
    const dli=(ppfd&&h)?Light.calcDLI(ppfd,h):null;
    const temp=parseFloat(document.getElementById('ef-temp').value)||null;
    const ur=parseFloat(document.getElementById('ef-ur').value)||null;
    const vpd=(temp&&ur)?VPD.calc(temp,ur):null;
    const actionType=ActionType.getSelected();
    const entry={
      id:_editEntryId||Utils.uid(), date,
      time:document.getElementById('ef-time').value||null,
      actionType,...ActionType.getActionData(actionType),
      stage:UI.getPill('entry-stage-group')||plant.stage,
      daysAlive:Utils.daysAlive(plant,date),
      weekInStage:Utils.weekInStage(plant,date),
      temp,ur,vpd,lux,
      dimmer:parseFloat(document.getElementById('ef-dimmer').value)||null,
      dist:parseFloat(document.getElementById('ef-dist').value)||null,
      ledon:on,ledoff:off,ppfd,dli,
      water:parseFloat(document.getElementById('ef-water').value)||null,
      ec:parseFloat(document.getElementById('ef-ec').value)||null,
      ph:parseFloat(document.getElementById('ef-ph').value)||null,
      nutrients:Entry.getNutrients(),
      obs:document.getElementById('ef-obs').value.trim()||null,
    };
    if(!plant.entries) plant.entries=[];
    if(_editEntryId){ const i=plant.entries.findIndex(e=>e.id===_editEntryId); if(i>=0) plant.entries[i]=entry; }
    else plant.entries.push(entry);
    DB.upsertPlant(plant);
    close('modal-entry'); Render.detail(plant); Render.home();
    UI.toast(_editEntryId?'Registro atualizado! ✏️':'Registro salvo! ✅');
  }

  /* ── ENTRY DETAIL ── */
  function openEntryDetail(entryId) {
    const plant=DB.getPlant(App.activePlantId()); if(!plant) return;
    const entry=(plant.entries||[]).find(e=>e.id===entryId); if(!entry) return;
    const week=entry.weekInStage||1, pType=plant.type||'auto';
    const refRow=(lbl,val,param,unit='')=>{
      if(val==null) return `<tr><td>${lbl}</td><td>—</td></tr>`;
      const badge=param?RefTables.badge(param,parseFloat(val),pType,week):'';
      return `<tr><td>${lbl}</td><td>${val}${unit} ${badge}</td></tr>`;
    };
    document.getElementById('entry-detail-body').innerHTML=`
      <table class="detail-table"><tbody>
        <tr><td>Data</td><td>${Utils.fmtDate(entry.date)}</td></tr>
        <tr><td>Hora</td><td>${entry.time||'—'}</td></tr>
        <tr><td>Estágio</td><td>${Utils.stageLabel(entry.stage)}</td></tr>
        <tr><td>Dias / Semana</td><td>D${entry.daysAlive??'—'} / Sem.${entry.weekInStage??'—'}</td></tr>
        ${refRow('Temperatura',entry.temp,'temp',' °C')}
        ${refRow('Umidade',entry.ur,'ur',' %')}
        ${refRow('VPD',entry.vpd,'vpd',' kPa')}
        <tr><td>Lux</td><td>${entry.lux?Number(entry.lux).toLocaleString('pt-BR'):'—'}</td></tr>
        <tr><td>PPFD</td><td>${entry.ppfd?entry.ppfd+' µmol/m²/s':'—'}</td></tr>
        <tr><td>DLI</td><td>${entry.dli?entry.dli+' mol/m²/d':'—'}</td></tr>
        <tr><td>Fotoperíodo</td><td>${(entry.ledon&&entry.ledoff)?entry.ledon+' – '+entry.ledoff:'—'}</td></tr>
        <tr><td>Dimmer</td><td>${entry.dimmer?entry.dimmer+' %':'—'}</td></tr>
        <tr><td>Distância</td><td>${entry.dist?entry.dist+' cm':'—'}</td></tr>
        <tr><td>Água</td><td>${entry.water?entry.water+' ml':'—'}</td></tr>
        ${refRow('pH',entry.ph,'ph')}
        ${refRow('EC',entry.ec,'ec')}
        <tr><td>Nutrientes</td><td>${entry.nutrients?.length?entry.nutrients.map(n=>Utils.esc(n.name)+(n.qty?' '+n.qty+'ml/L':'')).join(', '):'—'}</td></tr>
        <tr><td>Observações</td><td>${entry.obs?Utils.esc(entry.obs):'—'}</td></tr>
      </tbody></table>`;
    document.getElementById('entry-detail-edit').onclick=()=>openEditEntry(entryId);
    document.getElementById('entry-detail-del').onclick=()=>_delEntry(entryId);
    open('modal-entry-detail');
  }
  function _delEntry(entryId) {
    const plant=DB.getPlant(App.activePlantId()); if(!plant) return;
    UI.confirm('Excluir registro','Este registro será removido permanentemente.').then(ok=>{
      if(!ok) return;
      plant.entries=(plant.entries||[]).filter(e=>e.id!==entryId);
      DB.upsertPlant(plant); close('modal-entry-detail');
      Render.detail(plant); Render.home(); UI.toast('Registro excluído.');
    });
  }

  function openImportExport() { open('modal-ie'); }

  return {
    open, close,
    openPlant, savePlant, setSoilType, switchPlantTab,
    openStage, saveStage,
    openEntry, openEditEntry, saveEntry,
    openEntryDetail, openImportExport,
  };
})();


/* ═══════════════════════════════════════════════
   APP
═══════════════════════════════════════════════ */
const App = (() => {
  let _active=null, _prev='home', _cur='home';

  const activePlantId = () => _active;

  function goTo(screen) {
    if (screen==='detail'&&!_active) return;
    _prev=_cur; _cur=screen;
    UI.setActive(screen);
    _updateHeader(screen);
    if (screen==='stats')   Analytics.render();
    if (screen==='home')    Render.home();
    if (screen==='library') Library.renderScreen();
  }
  function goBack() { goTo(_prev===_cur?'home':_prev); }

  function openPlant(id) {
    _active=id;
    const plant=DB.getPlant(id); if(!plant) return;
    document.getElementById('bnav-detail').style.display='';
    Render.detail(plant);
    goTo('detail');
  }
  function openLastPlant() {
    const { plants }=DB.get();
    if(!plants.length){UI.toast('Nenhuma planta cadastrada.');return;}
    openPlant(plants[plants.length-1].id);
  }
  function deletePlant(id) {
    UI.confirm('Excluir planta','Todos os registros serão removidos permanentemente.').then(ok=>{
      if(!ok) return;
      DB.deletePlant(id); _active=null;
      document.getElementById('bnav-detail').style.display='none';
      goTo('home'); UI.toast('Planta excluída.');
    });
  }

  function _updateHeader(screen) {
    const logo=document.getElementById('header-logo');
    const title=document.getElementById('header-title');
    const back=document.getElementById('back-btn');
    const actions=document.getElementById('header-actions');
    logo.classList.remove('hidden'); title.classList.add('hidden');
    back.classList.add('hidden'); actions.innerHTML='';

    const screenTitles = { stats:'Analytics', library:'Biblioteca' };
    if (screenTitles[screen]) {
      logo.classList.add('hidden');
      title.textContent=screenTitles[screen]; title.classList.remove('hidden');
      back.classList.remove('hidden');
    } else if (screen==='detail') {
      const p=DB.getPlant(_active);
      logo.classList.add('hidden');
      title.textContent=p?p.name:'—'; title.classList.remove('hidden');
      back.classList.remove('hidden');
      actions.innerHTML=`
        <button class="hdr-btn" onclick="Modals.openPlant('${_active}')" title="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="hdr-btn" onclick="App.deletePlant('${_active}')" style="color:var(--red)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>`;
    }
  }

  function exportAll() {
    const { plants }=DB.get(); if(!plants.length){UI.toast('Sem dados.');return;}
    const rows=['Planta,Data,Hora,Estágio,Dias,Semana,Temp,UR,Lux,PPFD,DLI,Água,pH,EC,Obs'];
    plants.forEach(p=>(p.entries||[]).forEach(e=>rows.push([`"${p.name}"`,e.date,e.time||'',Utils.stageLabel(e.stage),e.daysAlive??'',e.weekInStage??'',e.temp??'',e.ur??'',e.lux??'',e.ppfd??'',e.dli??'',e.water??'',e.ph??'',e.ec??'',`"${(e.obs||'').replace(/"/g,'""')}"`].join(','))));
    Utils.download(rows.join('\n'),'growlog_export.csv','text/csv;charset=utf-8');
    Modals.close('modal-ie'); UI.toast('CSV exportado! 📤');
  }
  function exportPlantCSV() {
    const p=DB.getPlant(_active); if(!p) return;
    const rows=['Data,Hora,Estágio,Dias,Semana,Temp,UR,Lux,PPFD,DLI,Água,pH,EC,Obs'];
    (p.entries||[]).forEach(e=>rows.push([e.date,e.time||'',Utils.stageLabel(e.stage),e.daysAlive??'',e.weekInStage??'',e.temp??'',e.ur??'',e.lux??'',e.ppfd??'',e.dli??'',e.water??'',e.ph??'',e.ec??'',`"${(e.obs||'').replace(/"/g,'""')}"`].join(',')));
    Utils.download(rows.join('\n'),p.name.replace(/\s+/g,'_')+'_log.csv','text/csv;charset=utf-8');
    UI.toast('CSV exportado! 📊');
  }
  function exportBackup() { Utils.download(JSON.stringify(DB.get(),null,2),'growlog_backup.json','application/json'); Modals.close('modal-ie'); UI.toast('Backup salvo! 💾'); }
  function importBackup(event) {
    const file=event.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const parsed=JSON.parse(ev.target.result);
        if(!parsed.plants){UI.toast('Arquivo inválido.');return;}
        UI.confirm('Importar backup','Isso substituirá todos os dados. Continuar?').then(ok=>{
          if(!ok) return;
          DB.replaceFull(parsed); _active=null;
          document.getElementById('bnav-detail').style.display='none';
          Render.home(); Modals.close('modal-ie'); goTo('home');
          UI.toast('Importado! ✅');
        });
      } catch { UI.toast('Erro ao ler o arquivo.'); }
    };
    reader.readAsText(file); event.target.value='';
  }

  return { activePlantId, goTo, goBack, openPlant, openLastPlant, deletePlant, exportAll, exportPlantCSV, exportBackup, importBackup };
})();


/* ═══════════════════════════════════════════════
   HARVEST REPORT
═══════════════════════════════════════════════ */
const HarvestReport = (() => {
  let _id=null;
  function open(plantId) {
    _id=plantId;
    const p=DB.getPlant(plantId); if(!p) return;
    const entries=p.entries||[], saved=p.harvestReport||{};
    document.getElementById('hr-plant-name').textContent=p.name;
    document.getElementById('hr-yield-wet').value=saved.yieldWet||'';
    document.getElementById('hr-yield-dry').value=saved.yieldDry||'';
    document.getElementById('hr-notes').value=saved.notes||'';
    UI.setPill('hr-rating-group',saved.rating?String(saved.rating):'4');
    _summary(p,entries); _averages(entries); _timeline(p,entries);
    Modals.open('modal-harvest');
  }
  function _summary(p,entries) {
    const total=Utils.daysAlive(p), water=entries.reduce((a,e)=>a+(e.water||0),0);
    const counts={};entries.forEach(e=>{const t=e.actionType||'geral';counts[t]=(counts[t]||0)+1;});
    const rows=[['Início',Utils.fmtDate(p.startDate)],['Colheita',Utils.fmtDate(Utils.today())],['Duração',total+' dias'],['Registros',entries.length],['Regas',counts['rega']||0],['Água total',water>0?(water/1000).toFixed(2)+'L':'—'],['Flushes',counts['flush']||0]];
    document.getElementById('hr-summary').innerHTML=rows.map(([l,v])=>`<div class="stats-row"><span class="stats-row-lbl">${l}</span><span class="stats-row-val">${Utils.esc(String(v))}</span></div>`).join('');
  }
  function _averages(entries) {
    const avg=arr=>arr.length?(arr.reduce((a,v)=>a+v,0)/arr.length).toFixed(1):'—';
    const rows=[['Temp.',avg(entries.filter(e=>e.temp).map(e=>e.temp))+'°C'],['UR',avg(entries.filter(e=>e.ur).map(e=>e.ur))+'%'],['VPD',avg(entries.filter(e=>e.vpd).map(e=>e.vpd))+' kPa'],['pH',avg(entries.filter(e=>e.ph).map(e=>e.ph))],['EC',avg(entries.filter(e=>e.ec).map(e=>e.ec))]];
    document.getElementById('hr-averages').innerHTML=rows.map(([l,v])=>`<div class="stats-row"><span class="stats-row-lbl">${l}</span><span class="stats-row-val accent">${Utils.esc(v)}</span></div>`).join('');
  }
  function _timeline(p,entries) {
    const changes=[]; let last=null;
    [...entries].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{ if(e.stage&&e.stage!==last){changes.push({stage:e.stage,date:e.date});last=e.stage;} });
    if(!changes.length){document.getElementById('hr-timeline').innerHTML='<p class="empty-hint">Sem dados.</p>';return;}
    document.getElementById('hr-timeline').innerHTML=`<div class="timeline">${changes.map((sc,i)=>{const next=changes[i+1];const dur=Utils.daysBetween(sc.date,next?next.date:Utils.today());return `<div class="timeline-item"><div class="timeline-dot stage-dot-${sc.stage}"></div><div class="timeline-body"><span class="timeline-stage">${Utils.stageEmoji(sc.stage)} ${Utils.stageLabel(sc.stage)}</span><span class="timeline-date">${Utils.fmtDate(sc.date)}</span><span class="timeline-dur">${dur}d</span></div></div>`;}).join('')}</div>`;
  }
  function save() {
    const p=DB.getPlant(_id); if(!p) return;
    p.harvestReport={ date:Utils.today(), yieldWet:parseFloat(document.getElementById('hr-yield-wet').value)||null, yieldDry:parseFloat(document.getElementById('hr-yield-dry').value)||null, rating:parseInt(UI.getPill('hr-rating-group'))||4, notes:document.getElementById('hr-notes').value.trim()||null };
    DB.upsertPlant(p); Modals.close('modal-harvest'); Render.detail(p); UI.toast('Relatório salvo! 🏆');
  }
  function exportCSV() {
    const p=DB.getPlant(_id); if(!p) return;
    const entries=p.entries||[],r=p.harvestReport||{};
    const lines=['=== RELATÓRIO DE COLHEITA ===',`Planta,${p.name}`,`Duração,${Utils.daysAlive(p)} dias`,`Peso úmido,${r.yieldWet||'—'} g`,`Peso seco,${r.yieldDry||'—'} g`,`Avaliação,${r.rating||'—'}⭐`,'','Data,Hora,Tipo,Estágio,Dias,Temp,UR,VPD,pH,EC,Água',...entries.map(e=>[e.date,e.time||'',e.actionType||'geral',Utils.stageLabel(e.stage),e.daysAlive||'',e.temp||'',e.ur||'',e.vpd||'',e.ph||'',e.ec||'',e.water||''].join(','))];
    Utils.download(lines.join('\n'),p.name.replace(/\s+/g,'_')+'_harvest.csv','text/csv;charset=utf-8');
    UI.toast('Exportado! 📤');
  }
  return { open, save, exportCSV };
})();


/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
(async function init() {
  await DB.load();

  ['mp-type-group','stage-pill-group','entry-stage-group','af-poda-type','af-lst-type',
   'hr-rating-group','soil-type-group','lib-soil-type','lib-nut-type'].forEach(id => UI.initPills(id));

  document.getElementById('soil-type-group')?.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => Modals.setSoilType(btn.dataset.v));
  });

  document.getElementById('nut-name')?.addEventListener('input', e => {
    Library.renderNutAutocomplete(e.target.value);
  });
  document.getElementById('nut-name')?.addEventListener('blur', () => {
    setTimeout(() => document.getElementById('nut-autocomplete')?.classList.add('hidden'), 200);
  });

  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) {
        ov.classList.remove('open');
        if (ov.id === 'modal-confirm') UI.resolveConfirm(false);
      }
    });
  });

  Render.home();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
