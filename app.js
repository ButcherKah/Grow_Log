'use strict';

/* ═══ DB ═══ */
const DB = (() => {
  const LSK = 'gl4';
  let _d = null, _idb = null;
  const blank = () => ({ plants:[], library:{ substrates:[], recipes:[], nutrients:[], setups:[], pots:[], lineageNodes:[] }, obDone:false });
  function fix(d) {
    if (!d) d = blank();
    if (!d.plants) d.plants = [];
    if (!d.library) d.library = {};
    ['substrates','recipes','nutrients','setups','pots','lineageNodes'].forEach(c => { if (!Array.isArray(d.library[c])) d.library[c] = []; });
    return d;
  }
  async function load() {
    await new Promise(r => { try { const q = indexedDB.open('gl4',1); q.onupgradeneeded = e => e.target.result.createObjectStore('kv'); q.onsuccess = e => { _idb=e.target.result; r(); }; q.onerror = r; } catch { r(); } });
    if (_idb) await new Promise(r => { const q = _idb.transaction('kv','readonly').objectStore('kv').get('data'); q.onsuccess = () => { _d=fix(q.result); r(); }; q.onerror = () => { _d=fix(_ls()); r(); }; });
    else _d = fix(_ls());
  }
  function _ls() { try { return JSON.parse(localStorage.getItem(LSK)); } catch { return null; } }
  function save() {
    if (_idb) { try { _idb.transaction('kv','readwrite').objectStore('kv').put(_d,'data'); } catch {} }
    try { localStorage.setItem(LSK, JSON.stringify(_d)); } catch {}
  }
  const get = () => _d;
  const getLib = () => _d.library;
  const getPlant = id => _d.plants.find(p => p.id===id) || null;
  function upsert(p) { const i=_d.plants.findIndex(x=>x.id===p.id); i>=0?_d.plants[i]=p:_d.plants.push(p); save(); }
  function del(id) { _d.plants=_d.plants.filter(p=>p.id!==id); _d.plants.forEach(p=>{if(p.parentId===id) delete p.parentId;}); save(); }
  function upsertLib(cat, item) { const a=_d.library[cat]; const i=a.findIndex(x=>x.id===item.id); i>=0?a[i]=item:a.push(item); save(); }
  function delLib(cat,id) { _d.library[cat]=_d.library[cat].filter(x=>x.id!==id); save(); }
  function replace(d) { _d=fix(d); save(); }
  function obDone() { _d.obDone=true; save(); }
  const isObDone = () => !!_d.obDone;
  return { load, save, get, getLib, getPlant, upsert, del, upsertLib, delLib, replace, obDone, isObDone };
})();

/* ═══ UTILS ═══ */
const U = (() => {
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const today = () => new Date().toISOString().slice(0,10);
  const nowT = () => new Date().toTimeString().slice(0,5);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtD = iso => { if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };
  const daysBetween = (a,b) => Math.max(0, Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000));
  const daysAlive = (p,at) => p.startDate ? daysBetween(p.startDate,at||today()) : 0;
  const weekInStage = (p,at) => { const s=p.stageStartDate||p.startDate; return s?Math.max(1,Math.floor(daysBetween(s,at||today())/7)+1):1; };
  const dl = (content,name,type) => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
  const SL = { germinacao:'Germinação', plantula:'Plântula', vegetativo:'Vegetativo', floracao:'Floração', colheita:'Colheita' };
  const SE = { germinacao:'🌰', plantula:'🌱', vegetativo:'🍃', floracao:'🌸', colheita:'✂️' };
  const stageLbl = s => SL[s]||s||'—';
  const stageEmj = s => SE[s]||'🌿';
  return { uid, today, nowT, esc, fmtD, daysBetween, daysAlive, weekInStage, dl, stageLbl, stageEmj };
})();

/* ═══ REF ═══ */
const Ref = (() => {
  const AU = {
    vpd:[null,{a:.4,b:.8},{a:.5,b:.8},{a:.6,b:.9},{a:.8,b:1},{a:.9,b:1.1},{a:1,b:1.2},{a:1.1,b:1.3},{a:1.2,b:1.4},{a:1.2,b:1.5},{a:1.3,b:1.5}],
    ur:[null,{a:70,b:80},{a:65,b:75},{a:60,b:70},{a:58,b:68},{a:55,b:65},{a:50,b:60},{a:45,b:55},{a:40,b:50},{a:40,b:48},{a:35,b:45}],
    temp:[null,{a:24,b:26},{a:24,b:27},{a:24,b:27},{a:24,b:28},{a:24,b:28},{a:24,b:28},{a:23,b:27},{a:22,b:27},{a:22,b:26},{a:21,b:26}],
    ec:[{w:[1,2],a:.2,b:.5},{w:[3,4],a:.5,b:1.2},{w:[5,6],a:1.2,b:2},{w:[7,8],a:1.8,b:2.4},{w:[9,10],a:2,b:2.8},{w:[11,99],a:.2,b:.8}],
    ph:[{w:[1,2],a:5.8,b:6},{w:[3,4],a:5.8,b:6.1},{w:[5,6],a:5.9,b:6.2},{w:[7,8],a:6,b:6.3},{w:[9,10],a:6.1,b:6.4},{w:[11,99],a:6,b:6.3}],
  };
  const FO = {
    vpd:[null,{a:.4,b:.8},{a:.5,b:.8},{a:.6,b:.9},{a:.7,b:1},{a:.8,b:1.1},{a:.9,b:1.2},{a:1,b:1.2},{a:1,b:1.3},{a:1.1,b:1.3},{a:1.1,b:1.4},{a:1.2,b:1.4},{a:1.2,b:1.5},{a:1.3,b:1.5},{a:1.3,b:1.6}],
    ur:[null,{a:70,b:80},{a:65,b:75},{a:60,b:70},{a:58,b:68},{a:55,b:65},{a:50,b:60},{a:50,b:58},{a:48,b:55},{a:45,b:55},{a:45,b:52},{a:42,b:50},{a:40,b:48},{a:38,b:45},{a:35,b:45}],
    temp:[null,{a:24,b:26},{a:24,b:27},{a:24,b:27},{a:24,b:28},{a:24,b:28},{a:24,b:28},{a:24,b:28},{a:24,b:28},{a:23,b:28},{a:23,b:27},{a:22,b:27},{a:22,b:27},{a:21,b:26},{a:20,b:26}],
    ec:[{w:[1,2],a:.2,b:.5},{w:[3,4],a:.5,b:1},{w:[5,6],a:1,b:1.6},{w:[7,8],a:1.6,b:2.2},{w:[9,10],a:1.8,b:2.4},{w:[11,13],a:2,b:2.8},{w:[14,16],a:2.4,b:3.2},{w:[17,99],a:.2,b:.8}],
    ph:[{w:[1,2],a:5.8,b:6},{w:[3,4],a:5.8,b:6.1},{w:[5,6],a:5.9,b:6.2},{w:[7,8],a:6,b:6.2},{w:[9,10],a:6,b:6.3},{w:[11,13],a:6.1,b:6.4},{w:[14,16],a:6.2,b:6.5},{w:[17,99],a:6,b:6.3}],
  };
  function _tbl(type) { return type==='foto'?FO:AU; }
  function _byw(arr,w) { return arr[Math.min(w,arr.length-1)]||arr[arr.length-1]; }
  function _grp(groups,w) { return groups.find(g=>w>=g.w[0]&&w<=g.w[1])||groups[groups.length-1]; }
  function badge(param,val,type,week) {
    if(val==null||isNaN(val)) return '';
    const t=_tbl(type); let r;
    if(param==='vpd'||param==='ur'||param==='temp') r=_byw(t[param],week);
    else r=_grp(t[param]||[],week);
    if(!r) return '';
    const tol=(r.b-r.a)*.1;
    const st=val<r.a-tol?'bad':val>r.b+tol?'bad':(val<r.a||val>r.b)?'warn':'ok';
    const cls=st==='ok'?'rok':st==='warn'?'rwarn':'rbad';
    const ic=st==='ok'?'🟢':st==='warn'?'🟡':'🔴';
    return `<span class="rb ${cls}" title="${r.a}–${r.b}">${ic}</span>`;
  }
  return { badge };
})();

/* ═══ LIGHT ═══ */
const Light = (() => {
  const F = 0.0185;
  const toPPFD = lux => Math.round(lux*F);
  const toDLI = (ppfd,h) => +((ppfd*h*3600)/1e6).toFixed(2);
  const parseH = t => { if(!t)return null; const[h,m]=t.split(':').map(Number);return h+m/60; };
  function recalc() {
    const lux=parseFloat(document.getElementById('ef-lux')?.value);
    const on=document.getElementById('ef-ledon')?.value;
    const off=document.getElementById('ef-ledoff')?.value;
    const pEl=document.getElementById('ef-ppfd'), dEl=document.getElementById('ef-dli'), fb=document.getElementById('ef-lfb');
    let ppfd=null;
    if(!isNaN(lux)&&lux>0){ppfd=toPPFD(lux);pEl.textContent=ppfd+' µmol/m²/s';pEl.classList.remove('dim');}
    else{pEl.textContent='—';pEl.classList.add('dim');}
    const ha=parseH(on),hb=parseH(off);let h=null;if(ha!==null&&hb!==null){h=hb-ha;if(h<=0)h+=24;}
    if(ppfd&&h){const dli=toDLI(ppfd,h);dEl.textContent=dli+' mol/m²/d';dEl.classList.remove('dim');fb.innerHTML=`✅ ${h.toFixed(1)}h → DLI <strong>${dli}</strong>`;fb.classList.remove('hidden');}
    else{dEl.textContent='—';dEl.classList.add('dim');fb.classList.add('hidden');}
  }
  return { toPPFD, toDLI, parseH, recalc };
})();

/* ═══ VPD ═══ */
const VPD = (() => {
  const svp = t => 0.6108*Math.exp(17.27*t/(t+237.3));
  const calc = (t,rh) => +( svp(t)*(1-rh/100) ).toFixed(2);
  function zone(v,stage) {
    const z={germinacao:{l:.4,h:.8},plantula:{l:.4,h:.8},vegetativo:{l:.8,h:1.2},floracao:{l:1.2,h:1.6},colheita:{l:1.2,h:1.6}}[stage]||{l:.8,h:1.2};
    if(v<z.l-.1)return{lbl:'🔵 Muito baixo',c:'#5ca8e0'};
    if(v<z.l)return{lbl:'🟢 Abaixo ideal',c:'#ff4db8'};
    if(v<=z.h)return{lbl:'✅ Zona ideal',c:'#ff4db8'};
    if(v<=z.h+.2)return{lbl:'🟡 Acima ideal',c:'#e8a020'};
    return{lbl:'🔴 Muito alto',c:'#ff4466'};
  }
  function recalc() {
    const t=parseFloat(document.getElementById('ef-temp')?.value);
    const rh=parseFloat(document.getElementById('ef-ur')?.value);
    const vEl=document.getElementById('ef-vpd'),zEl=document.getElementById('ef-vpd-zone');
    if(isNaN(t)||isNaN(rh)){vEl.textContent='—';vEl.classList.add('dim');zEl.textContent='—';return;}
    const v=calc(t,rh);
    const plant=DB.getPlant(App.activeId());
    const stage=UI.getPill('ef-stage')||plant?.stage||'vegetativo';
    const zi=zone(v,stage);
    vEl.textContent=v+' kPa';vEl.classList.remove('dim');vEl.style.color=zi.c;
    zEl.textContent=zi.lbl;zEl.style.color=zi.c;
  }
  return { calc, zone, recalc };
})();

/* ═══ UI ═══ */
const UI = (() => {
  let _cr=null,_tt=null;
  function setPill(gid,val) { document.getElementById(gid)?.querySelectorAll('.pill').forEach(p=>p.classList.toggle('on',p.dataset.v===val)); }
  function getPill(gid) { return document.getElementById(gid)?.querySelector('.pill.on')?.dataset.v||''; }
  function initPills(gid) {
    document.getElementById(gid)?.querySelectorAll('.pill').forEach(btn=>{
      btn.addEventListener('click',()=>{ document.getElementById(gid).querySelectorAll('.pill').forEach(p=>p.classList.remove('on')); btn.classList.add('on'); });
    });
  }
  function tgl(btnId,secId) {
    const b=document.getElementById(btnId),s=document.getElementById(secId);
    if(!b||!s)return;
    const on=!b.classList.contains('on');
    b.classList.toggle('on',on);s.classList.toggle('on',on);
  }
  function resetTgl(btnId,secId) { document.getElementById(btnId)?.classList.remove('on'); document.getElementById(secId)?.classList.remove('on'); }
  function forceTgl(btnId,secId) { document.getElementById(btnId)?.classList.add('on'); document.getElementById(secId)?.classList.add('on'); }
  function toast(msg) {
    const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
    clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function confirm(title,msg) {
    return new Promise(res=>{ _cr=res; document.getElementById('conf-title').textContent=title; document.getElementById('conf-msg').textContent=msg; M.open('modal-confirm'); });
  }
  function resolveConfirm(ok) { M.close('modal-confirm'); if(_cr){_cr(ok);_cr=null;} }
  function setScreen(name) {
    document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));
    document.getElementById('scr-'+name)?.classList.add('on');
    document.querySelectorAll('.bni').forEach(b=>b.classList.toggle('on',b.dataset.s===name));
  }
  return { setPill, getPill, initPills, tgl, resetTgl, forceTgl, toast, confirm, resolveConfirm, setScreen };
})();

const M = {
  open: id => document.getElementById(id)?.classList.add('open'),
  close: id => document.getElementById(id)?.classList.remove('open'),
};

/* ═══ AT ═══ */
const AT = (() => {
  const SHOW = {
    geral:['ef-amb','ef-luz','ef-rega'],rega:['ef-amb','ef-rega'],clima:['ef-amb'],
    luz:['ef-luz'],poda:['ef-poda'],lst:['ef-lst'],defoliacao:['ef-poda'],
    transplante:['ef-transp'],flush:['ef-flush','ef-rega'],runoff:['ef-runoff'],
  };
  const ALL=['ef-amb','ef-luz','ef-rega','ef-poda','ef-lst','ef-transp','ef-flush','ef-runoff'];
  const LABELS={geral:'Novo Registro',rega:'💧 Rega',clima:'🌡️ Clima',luz:'💡 Luz',poda:'✂️ Poda',lst:'🪢 LST',defoliacao:'🍃 Defoliação',transplante:'🪴 Transplante',flush:'🚿 Flush',runoff:'🧪 Runoff'};
  function sel(btn) {
    document.querySelectorAll('#atg .atbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const type=btn.dataset.v;
    ALL.forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('hidden',!(SHOW[type]||SHOW.geral).includes(id));});
    document.getElementById('me-title').textContent=LABELS[type]||'Novo Registro';
    if(type==='defoliacao') UI.setPill('ef-poda-tipo','defoliacao');
  }
  function get() { return document.querySelector('#atg .atbtn.on')?.dataset.v||'geral'; }
  function reset() { const b=document.querySelector('#atg .atbtn[data-v="geral"]'); if(b)sel(b); }
  function preset(t) { const b=document.querySelector(`#atg .atbtn[data-v="${t}"]`); if(b)sel(b); }
  function extra(type) {
    const v=id=>document.getElementById(id)?.value.trim()||null;
    const n=id=>parseFloat(document.getElementById(id)?.value)||null;
    switch(type){
      case 'poda':case 'defoliacao':return{podaTecnica:UI.getPill('ef-poda-tipo'),podaNodes:n('ef-poda-nos')};
      case 'lst':return{lstTecnica:UI.getPill('ef-lst-tipo'),lstDesc:v('ef-lst-desc')};
      case 'transplante':return{tpFrom:n('ef-tp-from'),tpTo:n('ef-tp-to'),tpSub:v('ef-tp-sub')};
      case 'flush':return{flushVol:n('ef-flush-vol'),flushPh:n('ef-flush-ph')};
      case 'runoff':return{roPh:n('ef-ro-ph'),roEc:n('ef-ro-ec')};
      default:return{};
    }
  }
  function clearExtra() { ['ef-poda-nos','ef-lst-desc','ef-tp-from','ef-tp-to','ef-tp-sub','ef-flush-vol','ef-flush-ph','ef-ro-ph','ef-ro-ec'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); }
  return { sel, get, reset, preset, extra, clearExtra };
})();

/* ═══ EF ═══ */
const EF = (() => {
  let _nuts = [];
  function autoP() {
    const p=DB.getPlant(App.activeId());if(!p)return;
    const d=document.getElementById('ef-date').value;if(!d)return;
    document.getElementById('ef-days').textContent=U.daysAlive(p,d)+' dias';
    document.getElementById('ef-weeks').textContent='Sem. '+U.weekInStage(p,d);
  }
  function addNut() {
    const name=document.getElementById('nut-name').value.trim();if(!name)return;
    const qty=parseFloat(document.getElementById('nut-qty').value)||null;
    _nuts.push({name,qty});document.getElementById('nut-name').value='';document.getElementById('nut-qty').value='';
    _rn();document.getElementById('nut-ac').classList.add('hidden');
  }
  function fromLib(name){document.getElementById('nut-name').value=name;document.getElementById('nut-name').focus();}
  function removeNut(i){_nuts.splice(i,1);_rn();}
  function _rn(){document.getElementById('nut-tags').innerHTML=_nuts.map((n,i)=>`<span class="nuttag">${U.esc(n.name)}${n.qty?' '+n.qty+' ml/L':''}<span class="nutrm" onclick="EF.removeNut(${i})">✕</span></span>`).join('');}
  function renderAC(q) {
    const l=document.getElementById('nut-ac');if(!l)return;
    const nuts=DB.getLib().nutrients;
    const hits=nuts.filter(n=>!q||n.name.toLowerCase().includes(q.toLowerCase()));
    if(!hits.length){l.classList.add('hidden');return;}
    l.innerHTML=hits.map(n=>`<div class="aci" onclick="EF.fromLib('${U.esc(n.name)}');document.getElementById('nut-ac').classList.add('hidden')"><span>🧪</span><div><div>${U.esc(n.name)}</div>${n.doseMin?`<div class="acis">${n.doseMin}–${n.doseMax} ml/L</div>`:''}</div></div>`).join('');
    l.classList.remove('hidden');
  }
  function reset(plantId,data) {
    _nuts=data?.nutrients?[...data.nutrients]:[];
    const p=DB.getPlant(plantId);
    const date=data?.date||U.today();
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??'';};
    sv('ef-date',date);sv('ef-time',data?.time||U.nowT());
    sv('ef-temp',data?.temp||'');sv('ef-ur',data?.ur||'');
    sv('ef-lux',data?.lux||'');sv('ef-dimmer',data?.dimmer||'');sv('ef-dist',data?.dist||'');
    sv('ef-ledon',data?.ledon||'');sv('ef-ledoff',data?.ledoff||'');
    sv('ef-water',data?.water||'');sv('ef-ph',data?.ph||'');sv('ef-ec',data?.ec||'');
    sv('ef-obs',data?.obs||'');sv('nut-name','');sv('nut-qty','');
    _rn();
    ['ef-ppfd','ef-dli'].forEach(id=>{const el=document.getElementById(id);if(el){el.textContent='—';el.classList.add('dim');}});
    document.getElementById('ef-lfb')?.classList.add('hidden');
    const vEl=document.getElementById('ef-vpd'),zEl=document.getElementById('ef-vpd-zone');
    if(vEl){vEl.textContent='—';vEl.classList.add('dim');vEl.style.color='';}
    if(zEl){zEl.textContent='—';zEl.style.color='';}
    UI.resetTgl('tgl-water','ws');UI.resetTgl('tgl-nut','ns');
    if(data?.water)UI.forceTgl('tgl-water','ws');
    if(data?.nutrients?.length)UI.forceTgl('tgl-nut','ns');
    AT.reset();AT.clearExtra();
    if(data?.actionType)AT.preset(data.actionType);
    UI.setPill('ef-stage',data?.stage||p?.stage||'vegetativo');
    if(data){
      const si=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
      si('ef-poda-nos',data.podaNodes);si('ef-lst-desc',data.lstDesc);si('ef-tp-from',data.tpFrom);
      si('ef-tp-to',data.tpTo);si('ef-tp-sub',data.tpSub);si('ef-flush-vol',data.flushVol);
      si('ef-flush-ph',data.flushPh);si('ef-ro-ph',data.roPh);si('ef-ro-ec',data.roEc);
      if(data.podaTecnica)UI.setPill('ef-poda-tipo',data.podaTecnica);
      if(data.lstTecnica)UI.setPill('ef-lst-tipo',data.lstTecnica);
    }
    if(p){document.getElementById('ef-days').textContent=U.daysAlive(p,date)+' dias';document.getElementById('ef-weeks').textContent='Sem. '+U.weekInStage(p,date);}
    if(data?.lux)Light.recalc();
    if(data?.temp&&data?.ur)VPD.recalc();
  }
  const getNuts = () => [..._nuts];
  return { autoP, addNut, fromLib, removeNut, renderAC, reset, getNuts };
})();

/* ═══ Library ═══ */
const Library = (() => {
  let _cat=null, _eid=null;
  const SLTBL={inerte:'🪨 Inerte',organico:'🌿 Orgânico',organomineral:'⚗️ Organomineral',coco:'🌴 Coco'};
  const NTLBL={mineral:'⚗️ Mineral',organico:'🌿 Orgânico',adubo:'🌱 Adubo'};
  const PTLBL={plastico:'Plástico',tecido:'Tecido',airpot:'Airpot',inteligente:'Inteligente'};
  const PTICON={plastico:'🪣',tecido:'🧺',airpot:'⭕',inteligente:'🤖'};

  function render() {
    const lib=DB.getLib();
    _fill('lib-substrates-list',lib.substrates,s=>_item('substrates',s,SLTBL[s.type]||'🪨',s.brand||s.notes||''),'Nenhum substrato cadastrado.');
    _fill('lib-recipes-list',lib.recipes,r=>_item('recipes',r,'📋',r.recipe?.substring(0,60)||''),'Nenhuma receita.');
    _fill('lib-nutrients-list',lib.nutrients,n=>_item('nutrients',n,NTLBL[n.type]||'🧪',n.doseMin?`${n.doseMin}–${n.doseMax} ml/L`:''),'Nenhum nutriente.');
    _fill('lib-setups-list',lib.setups,s=>_item('setups',s,'💡',[s.ledModel,s.tentSize].filter(Boolean).join(' · ')),'Nenhum setup cadastrado.');
    _fill('lib-pots-list',lib.pots,p=>_item('pots',p,PTICON[p.type]||'🪴',`${p.volume}L · ${PTLBL[p.type]||''}`),'Nenhum vaso.');
    _fill('lib-lineage-list',lib.lineageNodes,n=>_item('lineageNodes',n,'🧬',`${n.generation||''}${n.seedbank?' · '+n.seedbank:''}`),'Nenhuma strain.');
  }
  function _fill(id,arr,fn,empty) {
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=arr.length?arr.map(fn).join(''):`<div class="eh">${empty}</div>`;
  }
  function _item(cat,item,icon,sub) {
    return `<div class="litem" onclick="Library.openItem('${cat}','${item.id}')"><div class="litemi">${icon}</div><div class="liteminf"><div class="litemn">${U.esc(item.name)}</div>${sub?`<div class="litems">${U.esc(sub)}</div>`:''}</div><div class="litema">›</div></div>`;
  }

  function sw(tab) {
    document.querySelectorAll('.libtab').forEach(b=>b.classList.toggle('on',b.dataset.lt===tab));
    document.querySelectorAll('.libcon').forEach(c=>c.classList.toggle('on',c.id==='lib-'+tab));
  }

  function openItem(cat,id) {
    _cat=cat;_eid=id||null;
    const lib=DB.getLib();
    const item=id?(lib[cat]||[]).find(x=>x.id===id):null;
    document.getElementById('lib-title').textContent=item?'Editar item':_catLbl(cat);
    ['lib-nome','lib-sub-brand','lib-sub-notes','lib-rec-recipe','lib-rec-notes','lib-nut-dmin','lib-nut-dmax','lib-nut-notes',
     'lib-s-led-model','lib-s-led-chip','lib-s-led-watts','lib-s-photo-on','lib-s-photo-off','lib-s-tent','lib-s-exhaust',
     'lib-s-fan','lib-s-timer','lib-s-smartplug','lib-s-irrigation','lib-s-co2','lib-s-vpd','lib-s-light','lib-s-camera','lib-s-notes',
     'lib-pot-vol','lib-gene-p1','lib-gene-p2','lib-gene-bank','lib-gene-notes'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
    UI.setPill('lib-soil-type','inerte');UI.setPill('lib-nut-type','mineral');UI.setPill('lib-pot-type','plastico');UI.setPill('lib-gene-gen','F1');
    ['lf-sub','lf-rec','lf-nut','lf-setup','lf-pot','lf-gene'].forEach(i=>document.getElementById(i)?.classList.add('hidden'));
    const MAP={substrates:'lf-sub',recipes:'lf-rec',nutrients:'lf-nut',setups:'lf-setup',pots:'lf-pot',lineageNodes:'lf-gene'};
    document.getElementById(MAP[cat])?.classList.remove('hidden');
    const nfg=document.getElementById('lib-nome-fg');
    if(nfg)nfg.style.display=cat==='pots'?'none':'';
    const nl=document.getElementById('lib-nome-lbl');
    if(nl)nl.textContent=cat==='lineageNodes'?'Nome da strain':'Nome';
    if(item){
      const sv=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
      sv('lib-nome',item.name);
      if(cat==='substrates'){if(item.type)UI.setPill('lib-soil-type',item.type);sv('lib-sub-brand',item.brand);sv('lib-sub-notes',item.notes);}
      if(cat==='recipes'){sv('lib-rec-recipe',item.recipe);sv('lib-rec-notes',item.notes);}
      if(cat==='nutrients'){if(item.type)UI.setPill('lib-nut-type',item.type);sv('lib-nut-dmin',item.doseMin);sv('lib-nut-dmax',item.doseMax);sv('lib-nut-notes',item.notes);}
      if(cat==='setups'){sv('lib-s-led-model',item.ledModel);sv('lib-s-led-chip',item.ledChip);sv('lib-s-led-watts',item.ledWatts);sv('lib-s-photo-on',item.photoOn);sv('lib-s-photo-off',item.photoOff);sv('lib-s-tent',item.tentSize);sv('lib-s-exhaust',item.exhaust);sv('lib-s-fan',item.fan);sv('lib-s-timer',item.timer);sv('lib-s-smartplug',item.smartPlug);sv('lib-s-irrigation',item.irrigationAuto);sv('lib-s-co2',item.co2);sv('lib-s-vpd',item.vpdSensor);sv('lib-s-light',item.lightSensor);sv('lib-s-camera',item.camera);sv('lib-s-notes',item.notes);}
      if(cat==='pots'){sv('lib-pot-vol',item.volume);if(item.type)UI.setPill('lib-pot-type',item.type);}
      if(cat==='lineageNodes'){if(item.generation)UI.setPill('lib-gene-gen',item.generation);sv('lib-gene-p1',item.parent1);sv('lib-gene-p2',item.parent2);sv('lib-gene-bank',item.seedbank);sv('lib-gene-notes',item.notes);}
    }
    document.getElementById('lib-del-btn')?.classList.toggle('hidden',!id);
    M.open('modal-lib');
  }
  function _catLbl(cat) { return{substrates:'Novo substrato',recipes:'Nova receita',nutrients:'Novo nutriente',setups:'Novo setup',pots:'Novo vaso',lineageNodes:'Nova strain'}[cat]||'Novo item'; }

  function saveItem() {
    const sv=id=>document.getElementById(id)?.value.trim()||null;
    const nv=id=>parseFloat(document.getElementById(id)?.value)||null;
    let item={id:_eid||U.uid()};
    if(_cat==='pots'){
      const vol=nv('lib-pot-vol');if(!vol){UI.toast('Informe o volume.');return;}
      const type=UI.getPill('lib-pot-type');
      item={...item,name:sv('lib-nome')||`${PTLBL[type]||'Vaso'} ${vol}L`,volume:vol,type};
    } else if(_cat==='lineageNodes'){
      const name=sv('lib-nome');if(!name){UI.toast('Informe o nome da strain.');return;}
      item={...item,name,generation:UI.getPill('lib-gene-gen'),parent1:sv('lib-gene-p1'),parent2:sv('lib-gene-p2'),seedbank:sv('lib-gene-bank'),notes:sv('lib-gene-notes')};
    } else {
      const name=sv('lib-nome');if(!name){UI.toast('Informe o nome.');return;}
      item.name=name;
      if(_cat==='substrates')item={...item,type:UI.getPill('lib-soil-type'),brand:sv('lib-sub-brand'),notes:sv('lib-sub-notes')};
      if(_cat==='recipes')item={...item,recipe:sv('lib-rec-recipe'),notes:sv('lib-rec-notes')};
      if(_cat==='nutrients')item={...item,type:UI.getPill('lib-nut-type'),doseMin:nv('lib-nut-dmin'),doseMax:nv('lib-nut-dmax'),notes:sv('lib-nut-notes')};
      if(_cat==='setups')item={...item,ledModel:sv('lib-s-led-model'),ledChip:sv('lib-s-led-chip'),ledWatts:sv('lib-s-led-watts'),photoOn:sv('lib-s-photo-on'),photoOff:sv('lib-s-photo-off'),tentSize:sv('lib-s-tent'),exhaust:sv('lib-s-exhaust'),fan:sv('lib-s-fan'),timer:sv('lib-s-timer'),smartPlug:sv('lib-s-smartplug'),irrigationAuto:sv('lib-s-irrigation'),co2:sv('lib-s-co2'),vpdSensor:sv('lib-s-vpd'),lightSensor:sv('lib-s-light'),camera:sv('lib-s-camera'),notes:sv('lib-s-notes')};
    }
    DB.upsertLib(_cat,item);M.close('modal-lib');render();UI.toast('Salvo! ✅');
  }
  function deleteItem() {
    if(!_eid)return;
    UI.confirm('Excluir item','Remover da biblioteca?').then(ok=>{if(!ok)return;DB.delLib(_cat,_eid);M.close('modal-lib');render();UI.toast('Removido.');});
  }

  function fillSelects(plant) {
    const lib=DB.getLib();
    const ss=document.getElementById('mp-soil');
    if(ss){ss.innerHTML='<option value="">— sem solo —</option>'+lib.substrates.map(s=>`<option value="sub_${s.id}">${U.esc(s.name)}</option>`).join('')+lib.recipes.map(r=>`<option value="rec_${r.id}">${U.esc(r.name)}</option>`).join('');if(plant?.soilId)ss.value=plant.soilId;}
    const ps=document.getElementById('mp-pot');
    if(ps){ps.innerHTML='<option value="">— sem vaso —</option>'+lib.pots.map(p=>`<option value="${p.id}">${U.esc(p.name)}</option>`).join('');if(plant?.potId)ps.value=plant.potId;}
    const sus=document.getElementById('mp-setup');
    if(sus){sus.innerHTML='<option value="">— sem setup —</option>'+lib.setups.map(s=>`<option value="${s.id}">${U.esc(s.name)}</option>`).join('');if(plant?.setupId)sus.value=plant.setupId;}
    const prs=document.getElementById('mp-parent');
    if(prs){const plants=DB.get().plants.filter(p=>p.id!==plant?.id);prs.innerHTML='<option value="">— sem mãe —</option>'+plants.map(p=>`<option value="${p.id}">${U.esc(p.name)}</option>`).join('');if(plant?.parentId)prs.value=plant.parentId;}
    const ls=document.getElementById('mp-lineage');
    if(ls){ls.innerHTML='<option value="">— sem strain —</option>'+lib.lineageNodes.map(n=>`<option value="${n.id}">${U.esc(n.name)}</option>`).join('');if(plant?.lineageNodeId)ls.value=plant.lineageNodeId;}
  }
  return { render, sw, openItem, saveItem, deleteItem, fillSelects };
})();

/* ═══ Lineage ═══ */
const Lineage = {
  open(plantId) {
    const p=DB.getPlant(plantId);
    document.getElementById('lin-plant-name').textContent=p?p.name:'—';
    this._graph(p);this._list(p);M.open('modal-lineage');
  },
  _graph(plant) {
    const wrap=document.getElementById('lin-svg');if(!wrap)return;
    const nodes=DB.getLib().lineageNodes||[];
    const rootId=plant?.lineageNodeId;
    const root=rootId?nodes.find(n=>n.id===rootId):null;
    if(!nodes.length){wrap.innerHTML='<div class="eh">Nenhuma strain cadastrada.</div>';return;}
    if(!root){wrap.innerHTML='<div class="eh">Nenhuma strain vinculada. Vincule em Editar planta → Origem.</div>';return;}
    const byName=name=>nodes.find(n=>n.name.toLowerCase()===(name||'').toLowerCase());
    const W=150,H=62,PAD=16,VG=82;
    function build(node,depth){if(!node||depth>4)return null;return{node,depth,left:node.parent1?build(byName(node.parent1),depth+1):null,right:node.parent2?build(byName(node.parent2),depth+1):null};}
    function countL(t){if(!t)return 1;const l=t.left?countL(t.left):0,r=t.right?countL(t.right):0;return l+r||1;}
    function assignX(t,sx,aw){if(!t)return;t.x=sx+aw/2;if(t.left&&t.right){assignX(t.left,sx,aw/2);assignX(t.right,sx+aw/2,aw/2);}else if(t.left)assignX(t.left,sx,aw);else if(t.right)assignX(t.right,sx,aw);}
    const tree=build(root,0);const leaves=countL(tree);
    const svgW=Math.max(320,leaves*(W+PAD)+PAD*2);
    assignX(tree,PAD,svgW-PAD*2);
    const allN=[],edges=[];
    function collect(t,px,py){if(!t)return;const y=PAD+t.depth*VG;allN.push({...t,y});if(px!==null)edges.push({x1:px,y1:py+H,x2:t.x,y2:y});collect(t.left,t.x,y);collect(t.right,t.x,y);}
    collect(tree,null,null);
    const svgH=PAD+(allN.reduce((m,n)=>Math.max(m,n.depth),0)+1)*VG+H+PAD;
    const eHTML=edges.map(e=>`<path class="lin-edge" d="M${e.x1},${e.y1} C${e.x1},${(e.y1+e.y2)/2} ${e.x2},${(e.y1+e.y2)/2} ${e.x2},${e.y2}"/>`).join('');
    const nHTML=allN.map(n=>{
      const isRoot=n.node.id===rootId;
      const rc=isRoot?'lin-rect root':n.node.generation==='Landrace'?'lin-rect land':'lin-rect';
      const nm=n.node.name.length>15?n.node.name.substring(0,13)+'…':n.node.name;
      return `<g transform="translate(${n.x-W/2},${n.y})"><rect class="${rc}" width="${W}" height="${H}" rx="10" ry="10"/><text class="lin-name" x="${W/2}" y="24" text-anchor="middle">${U.esc(nm)}</text><text class="lin-gen" x="${W/2}" y="40" text-anchor="middle">${n.node.generation||''}</text>${n.node.seedbank?`<text class="lin-seed" x="${W/2}" y="54" text-anchor="middle">${U.esc(n.node.seedbank.substring(0,18))}</text>`:''}</g>`;
    }).join('');
    wrap.innerHTML=`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">${eHTML}${nHTML}</svg></div>`;
  },
  _list(plant) {
    const el=document.getElementById('lin-list');if(!el)return;
    const nodes=DB.getLib().lineageNodes||[];
    const GBC={F1:'gf1',F2:'gf2',IBL:'gibl',BX:'gbx',Landrace:'gld',Clone:'gcl'};
    el.innerHTML=nodes.map(n=>`<div class="lni ${plant?.lineageNodeId===n.id?'root':''}"><div class="lnii"><div class="lnin">${U.esc(n.name)}</div><div class="lnis">${[n.parent1,n.parent2].filter(Boolean).join(' × ')||'—'}${n.seedbank?' · '+n.seedbank:''}</div></div><span class="gbdg2 ${GBC[n.generation]||'gcl'}">${n.generation||'—'}</span></div>`).join('')||'<div class="eh">Nenhuma strain.</div>';
  },
};

/* ═══ Gene ═══ */
const Gene = {
  render(activeId) {
    const el=document.getElementById('dcon-gene');if(!el)return;
    const {plants}=DB.get();const plant=DB.getPlant(activeId);
    const lbtn=`<button class="lbtn" onclick="Lineage.open('${activeId}')">🧬 Ver linhagem genética${plant?.lineageNodeId?' ✓':''}</button>`;
    const roots=plants.filter(p=>!p.parentId);
    const tree=roots.map(r=>this._node(r,plants,activeId,0)).join('');
    el.innerHTML=`<div class="genw">${lbtn}<div class="slbl" style="padding:12px 0 8px">Árvore de clones</div><div class="gene-tree">${tree||'<div class="eh">Sem clones cadastrados.</div>'}</div></div>`;
  },
  _node(p,all,activeId,depth) {
    const children=all.filter(x=>x.parentId===p.id);
    const isActive=p.id===activeId,isMother=children.length>0;
    const badge=isActive?'<span class="gbdg gbs">atual</span>':isMother?'<span class="gbdg gbm">madre</span>':'<span class="gbdg gbc">clone</span>';
    let html=`${depth>0?'<div class="gconn"></div>':''}<div class="gnode ${isActive?'active':''} ${isMother&&!isActive?'mother':''} ${depth>0?'gindent':''}" onclick="App.openPlant('${p.id}')"><span class="gemo">${U.stageEmj(p.stage)}</span><div class="ginf"><div class="gn">${U.esc(p.name)}</div><div class="gm">${U.stageLbl(p.stage)} · ${U.daysAlive(p)}d</div></div>${badge}</div>`;
    if(children.length)html+=children.map(c=>this._node(c,all,activeId,depth+1)).join('');
    return html;
  },
};

const DT = {
  sw(tab) {
    document.querySelectorAll('.dtab').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
    document.querySelectorAll('.dcon').forEach(c=>c.classList.toggle('on',c.id==='dcon-'+tab));
    if(tab==='gene')Gene.render(App.activeId());
  }
};

const PT = {
  sw(tab) {
    document.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('on',b.dataset.pt===tab));
    document.querySelectorAll('.ptcon').forEach(c=>c.classList.toggle('on',c.id==='ptc-'+tab));
  }
};

/* ═══ RENDER ═══ */
function _stageCls(s){return{germinacao:'sg',plantula:'sp',vegetativo:'sv',floracao:'sf',colheita:'sc'}[s]||'sv';}

function renderHome() {
  const {plants}=DB.get();
  const allE=plants.flatMap(p=>p.entries||[]);
  document.getElementById('kn-plants').textContent=plants.length;
  document.getElementById('kn-logs').textContent=allE.length;
  document.getElementById('kn-days').textContent=plants.length?Math.max(...plants.map(p=>U.daysAlive(p))):'—';
  const hero=document.getElementById('home-hero');
  if(!plants.length){
    hero.innerHTML=`<div class="hero"><div class="home-empty"><div class="home-empty-ico">🌸</div><div class="home-empty-t">Comece seu cultivo</div><div class="home-empty-s">Toque em + para adicionar sua primeira planta.</div></div></div>`;
  } else {
    const p=plants[plants.length-1];
    const days=U.daysAlive(p),weeks=U.weekInStage(p);
    hero.innerHTML=`<div class="hero"><div class="hero-lbl">Cultivo ativo</div><div class="hero-row" onclick="App.openPlant('${p.id}')"><div><div class="hero-name">${U.esc(p.name)}</div><div class="hero-meta"><span class="stag ${_stageCls(p.stage)}">${U.stageLbl(p.stage)}</span> · sem. ${weeks}</div></div><div style="text-align:center"><div class="hero-days-n">${days}</div><div class="hero-days-l">dias</div></div></div></div>`;
  }
  const al=document.getElementById('alerts');
  if(plants.length){
    al.innerHTML=plants.map(p=>{
      const last=(p.entries||[]).slice(-1)[0];
      if(!last)return`<div class="alert warn"><span class="adot dwarn"></span>"${U.esc(p.name)}" — sem registros</div>`;
      const d=Math.round((Date.now()-new Date(last.date))/86400000);
      return d>=2?`<div class="alert warn"><span class="adot dwarn"></span>"${U.esc(p.name)}" — último registro há ${d} dias</div>`:`<div class="alert ok"><span class="adot dok"></span>"${U.esc(p.name)}" — atualizado recentemente</div>`;
    }).join('');
    al.classList.remove('hidden');
  } else al.classList.add('hidden');
  document.getElementById('plant-list').innerHTML=plants.map(p=>{
    const days=U.daysAlive(p),weeks=U.weekInStage(p),s=p.stage||'vegetativo';
    return `<div class="pcard" onclick="App.openPlant('${p.id}')"><div class="pava">${U.stageEmj(s)}</div><div class="pinf"><div class="pname">${U.esc(p.name)}</div><div class="pmeta"><span class="stag ${_stageCls(s)}">${U.stageLbl(s)}</span><span>${p.type==='foto'?'Foto':'Auto'}</span></div></div><div><div class="pdn">${days}</div><div class="pdl">d/s${weeks}</div></div></div>`;
  }).join('');
}

function renderDetail(plant) {
  const days=plant.daysOverride??U.daysAlive(plant);
  const weeks=plant.weeksOverride??U.weekInStage(plant);
  const entries=plant.entries||[];
  const stage=plant.stage||'vegetativo';
  const STAGEC={germinacao:'var(--am)',plantula:'var(--pkhi)',vegetativo:'var(--bl)',floracao:'var(--pk)',colheita:'var(--pu)'};
  document.getElementById('hdr-title').textContent=plant.name;
  document.getElementById('ph-days').textContent=days;
  document.getElementById('ph-weeks').textContent=weeks;
  document.getElementById('ph-stage').textContent=U.stageLbl(stage);
  document.getElementById('ph-dot').style.background=STAGEC[stage]||'var(--pk)';
  const al=document.getElementById('det-alert');
  const last=entries.slice(-1)[0];
  if(!last){al.innerHTML='Sem registros. Toque em <strong>＋ Registrar</strong>.';al.className='dal';al.classList.remove('hidden');}
  else{const d=Math.round((Date.now()-new Date(last.date))/86400000);if(d>=2){al.innerHTML=`⚠️ Último registro há <strong>${d} dias</strong>.`;al.className='dal';al.classList.remove('hidden');}else{al.innerHTML=`✅ Atualizado em <strong>${U.fmtD(last.date)}</strong>`;al.className='dal ok';al.classList.remove('hidden');}}
  _renderWCard(plant);_renderCdown(plant);_renderVPDCard(plant,entries,stage);
  _renderTimeline(plant,entries);_renderEntries(plant,entries);
}

function _renderWCard(plant){
  const card=document.getElementById('wcard');if(!card)return;
  const withN=parseInt(plant.cycleWith)||2,withoutN=parseInt(plant.cycleWithout)||1,total=withN+withoutN;
  const regas=(plant.entries||[]).filter(e=>e.actionType==='rega'||e.water).sort((a,b)=>a.date.localeCompare(b.date));
  const pos=regas.length%total,type=pos<withN?'com':'sem';
  const last=regas[regas.length-1];
  const d=last?Math.round((Date.now()-new Date(last.date))/86400000):null;
  const sub=last?`Última ${d===0?'hoje':d===1?'há 1 dia':`há ${d} dias`} · ${withN}+${withoutN}`:`Ciclo ${withN}+${withoutN}`;
  card.innerHTML=`<div><span class="we">Próxima rega</span><span class="wn ${type}">${type==='com'?'💧🧪 com nutriente':'💧 sem nutriente'}</span><span class="ws">${sub}</span></div><div class="wcy"><span class="wcn">${withN}</span><span class="wcs">+</span><span class="wcn">${withoutN}</span></div>`;
  card.classList.remove('hidden');
}

function _renderCdown(plant){
  const card=document.getElementById('cdown');
  const veg=parseInt(plant.vegWeeks)||0,flor=parseInt(plant.flowerWeeks)||0;
  if((!veg&&!flor)||!plant.startDate){card.classList.add('hidden');return;}
  const total=(veg+flor)*7,lived=U.daysAlive(plant),rem=Math.max(0,total-lived),pct=Math.min(100,Math.round((lived/total)*100));
  const hd=new Date(plant.startDate+'T00:00:00');hd.setDate(hd.getDate()+total);
  document.getElementById('cd-date').textContent=hd.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  document.getElementById('cd-days').textContent=rem;
  document.getElementById('cd-unit').textContent=rem===1?'dia':'dias';
  const bar=document.getElementById('cd-bar');bar.style.width=pct+'%';bar.style.background=pct>=90?'var(--rd)':pct>=70?'var(--am)':'var(--pk)';
  card.classList.remove('hidden');
}

function _renderVPDCard(plant,entries,stage){
  const card=document.getElementById('vpd-card');
  const lastV=[...entries].reverse().find(e=>e.temp&&e.ur);
  if(!lastV){card.classList.add('hidden');return;}
  const vpd=VPD.calc(lastV.temp,lastV.ur),zi=VPD.zone(vpd,stage);
  document.getElementById('vpd-val').textContent=vpd;
  document.getElementById('vpd-zone').textContent=zi.lbl;document.getElementById('vpd-zone').style.color=zi.c;
  card.classList.remove('hidden');
}

function _renderTimeline(plant,entries){
  const el=document.getElementById('tl-wrap');if(!el)return;
  const ICON={geral:'📋',rega:'💧',clima:'🌡️',luz:'💡',poda:'✂️',lst:'🪢',defoliacao:'🍃',transplante:'🪴',flush:'🚿',runoff:'🧪'};
  const COLOR={geral:'var(--b3)',rega:'var(--bl)',clima:'#94a3b8',luz:'#fde047',poda:'var(--rd)',lst:'#a78bfa',defoliacao:'#86efac',transplante:'var(--am)',flush:'var(--bl)',runoff:'#34d399'};
  const LABEL={geral:'Geral',rega:'Rega',clima:'Clima',luz:'Luz',poda:'Poda',lst:'LST',defoliacao:'Defoliação',transplante:'Transplante',flush:'Flush',runoff:'Runoff'};
  if(!entries.length){el.innerHTML='<div class="eh">Sem registros.</div>';return;}
  const sorted=[...entries].sort((a,b)=>(a.date+(a.time||'00:00')).localeCompare(b.date+(b.time||'00:00')));
  const byDate={};sorted.forEach(e=>{if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
  el.innerHTML=Object.entries(byDate).reverse().map(([date,de])=>{
    const obj=new Date(date+'T00:00:00');
    const lbl=obj.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
    const d=U.daysBetween(plant.startDate,date);
    const nodes=de.map(e=>{
      const type=e.actionType||'geral',chips=[];
      if(e.temp&&e.ur)chips.push(`${e.temp}°C · ${e.ur}%`);
      if(e.vpd)chips.push(`VPD ${e.vpd}`);
      if(e.water)chips.push(`💧${e.water}ml`);
      if(e.ph)chips.push(`pH ${e.ph}`);
      if(e.ppfd)chips.push(`⚡${e.ppfd}`);
      if(e.podaTecnica)chips.push(e.podaTecnica);
      if(e.lstTecnica)chips.push(e.lstTecnica);
      if(e.tpTo)chips.push(`→${e.tpTo}L`);
      return `<div class="tln" onclick="Modals.openEDet('${e.id}')"><div class="tlnd" style="background:${COLOR[type]||'var(--b3)'}"></div><div class="tlnb"><div class="tlnh"><span>${ICON[type]||'📋'}</span><span class="tlnt">${LABEL[type]||type}</span>${e.time?`<span class="tlntm">${e.time}</span>`:''}</div>${chips.length?`<div class="tlncs">${chips.map(c=>`<span class="tlnc">${U.esc(c)}</span>`).join('')}</div>`:''}${e.obs?`<div class="tlno">${U.esc(e.obs).substring(0,100)}${e.obs.length>100?'…':''}</div>`:''}</div></div>`;
    }).join('');
    return `<div class="tld"><div class="tldh"><span class="tldl">${lbl}</span><span class="tldd">D${d}</span></div><div class="tle">${nodes}</div></div>`;
  }).join('')+`<div class="tlst"><span>🌱</span><span>Início · ${U.fmtD(plant.startDate)}</span></div>`;
}

function _renderEntries(plant,entries){
  const el=document.getElementById('entries-wrap');if(!el)return;
  if(!entries.length){el.innerHTML='<div class="eh">Sem registros.</div>';return;}
  const pt=plant?.type||'auto';
  const AICONS={geral:'📋',rega:'💧',clima:'🌡️',luz:'💡',poda:'✂️',lst:'🪢',defoliacao:'🍃',transplante:'🪴',flush:'🚿',runoff:'🧪'};
  el.innerHTML=[...entries].reverse().map(e=>{
    const week=e.weekInStage||1,chips=[];
    if(e.temp)chips.push(`<span class="chip">${e.temp}°C ${Ref.badge('temp',e.temp,pt,week)}</span>`);
    if(e.ur)chips.push(`<span class="chip">${e.ur}% ${Ref.badge('ur',e.ur,pt,week)}</span>`);
    if(e.vpd)chips.push(`<span class="chip">${e.vpd}kPa ${Ref.badge('vpd',e.vpd,pt,week)}</span>`);
    if(e.water)chips.push(`<span class="chip bl">💧${e.water}ml</span>`);
    if(e.ph)chips.push(`<span class="chip">pH ${e.ph} ${Ref.badge('ph',e.ph,pt,week)}</span>`);
    if(e.ec)chips.push(`<span class="chip am">EC ${e.ec} ${Ref.badge('ec',e.ec,pt,week)}</span>`);
    if(e.ppfd)chips.push(`<span class="chip pk">⚡${e.ppfd}</span>`);
    const ds=e.date?new Date(e.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
    return `<div class="ecard" onclick="Modals.openEDet('${e.id}')"><div class="ehead"><span>${AICONS[e.actionType]||'📋'}</span><span class="edate">${ds}${e.time?' · '+e.time:''}</span><span class="stag ${_stageCls(e.stage||'vegetativo')}">${U.stageLbl(e.stage)}</span><span class="edb">${e.daysAlive!==undefined?'D'+e.daysAlive:''}</span></div>${chips.length?`<div class="chips">${chips.join('')}</div>`:''}${e.obs?`<div class="eobs">${U.esc(e.obs).substring(0,140)}${e.obs.length>140?'…':''}</div>`:''}</div>`;
  }).join('');
}

function _avg(arr){return arr.length?(arr.reduce((a,v)=>a+v,0)/arr.length).toFixed(1):null;}
function _kpi(ico,v,l){return `<div class="akpi"><div class="akpii">${ico}</div><div class="akpin">${v}</div><div class="akpil">${l}</div></div>`;}
function _row(l,v,pk=false){return `<div class="srow"><span class="srl">${l}</span><span class="srv${pk?' pk':''}">${U.esc(String(v))}</span></div>`;}

function renderStats() {
  const {plants}=DB.get();const wrap=document.getElementById('stats-body');
  if(!plants.length){wrap.innerHTML='<div class="eh" style="padding:40px">Adicione plantas para ver analytics.</div>';return;}
  const allE=plants.flatMap(p=>(p.entries||[]));
  const water=allE.reduce((a,e)=>a+(e.water||0),0);
  const avgT=_avg(allE.filter(e=>e.temp).map(e=>e.temp));
  const aCounts={};allE.forEach(e=>{const t=e.actionType||'geral';aCounts[t]=(aCounts[t]||0)+1;});
  const maxA=Math.max(...Object.values(aCounts),1);
  const ALBL={geral:'Geral',rega:'Rega',clima:'Clima',luz:'Luz',poda:'Poda',lst:'LST',defoliacao:'Defoliação',transplante:'Transplante',flush:'Flush',runoff:'Runoff'};
  const wByP=plants.map(p=>({name:p.name,val:(p.entries||[]).reduce((a,e)=>a+(e.water||0),0)/1000})).filter(x=>x.val>0);
  const maxW=Math.max(...wByP.map(x=>x.val),1);
  wrap.innerHTML=`<div class="statbody">
    <div class="akpig">${_kpi('🌸',plants.length,'Plantas')}${_kpi('📋',allE.length,'Registros')}${_kpi('💧',water>0?(water/1000).toFixed(1)+'L':'—','Água total')}${_kpi('🌡️',avgT?avgT+'°C':'—','Temp. média')}</div>
    <div class="asec"><div class="asect">Ações por tipo</div><div class="barchart">${Object.entries(aCounts).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`<div class="barrow"><div class="barl">${ALBL[t]||t}</div><div class="bartrk"><div class="barf" style="width:${(c/maxA*100).toFixed(1)}%"></div></div><div class="barv">${c}</div></div>`).join('')}</div></div>
    ${wByP.length?`<div class="asec"><div class="asect">Água por planta (L)</div><div class="barchart">${wByP.map(x=>`<div class="barrow"><div class="barl">${U.esc(x.name.substring(0,10))}</div><div class="bartrk"><div class="barf bl" style="width:${(x.val/maxW*100).toFixed(1)}%"></div></div><div class="barv">${x.val.toFixed(1)}</div></div>`).join('')}</div></div>`:''}
    <div class="asec"><div class="asect">Por planta</div>${plants.map(p=>{const ent=p.entries||[];const wa=ent.reduce((a,e)=>a+(e.water||0),0);const ta=_avg(ent.filter(e=>e.temp).map(e=>e.temp));const ua=_avg(ent.filter(e=>e.ur).map(e=>e.ur));const pha=_avg(ent.filter(e=>e.ph).map(e=>e.ph));return `<div class="pblk"><div class="pblkn">${U.stageEmj(p.stage)} ${U.esc(p.name)}</div>${_row('Estágio',U.stageLbl(p.stage),true)}${_row('Início',U.fmtD(p.startDate))}${_row('Dias/Sem',U.daysAlive(p)+'d · Sem.'+U.weekInStage(p),true)}${_row('Tipo',p.type==='foto'?'Fotoperíodo':'Automática')}${_row('Registros',ent.length)}${_row('Água',wa>0?(wa/1000).toFixed(1)+'L':'—')}${ta?_row('Temp. média',ta+'°C',true):''}${ua?_row('UR média',ua+'%'):''}${pha?_row('pH médio',pha):''}</div>`;}).join('')}</div>
  </div>`;
}

/* ═══ HR ═══ */
const HR = (() => {
  let _id=null;
  function open(id){
    _id=id;const p=DB.getPlant(id);if(!p)return;
    const entries=p.entries||[],saved=p.harvestReport||{};
    document.getElementById('hr-plant-name').textContent=p.name;
    document.getElementById('hr-wet').value=saved.yieldWet||'';
    document.getElementById('hr-dry').value=saved.yieldDry||'';
    document.getElementById('hr-notes').value=saved.notes||'';
    UI.setPill('hr-rating',saved.rating?String(saved.rating):'4');
    const total=U.daysAlive(p),waterTotal=entries.reduce((a,e)=>a+(e.water||0),0);
    const counts={};entries.forEach(e=>{const t=e.actionType||'geral';counts[t]=(counts[t]||0)+1;});
    document.getElementById('hr-summary').innerHTML=[['Início',U.fmtD(p.startDate)],['Duração',total+' dias'],['Registros',entries.length],['Regas',counts['rega']||0],['Água total',waterTotal>0?(waterTotal/1000).toFixed(2)+'L':'—'],['Flushes',counts['flush']||0]].map(([l,v])=>`<div class="srow"><span class="srl">${l}</span><span class="srv">${U.esc(String(v))}</span></div>`).join('');
    const avg=arr=>arr.length?(arr.reduce((a,v)=>a+v,0)/arr.length).toFixed(1):'—';
    document.getElementById('hr-avgs').innerHTML=[['Temp.',avg(entries.filter(e=>e.temp).map(e=>e.temp))+'°C'],['UR',avg(entries.filter(e=>e.ur).map(e=>e.ur))+'%'],['VPD',avg(entries.filter(e=>e.vpd).map(e=>e.vpd))+' kPa'],['pH',avg(entries.filter(e=>e.ph).map(e=>e.ph))],['EC',avg(entries.filter(e=>e.ec).map(e=>e.ec))]].map(([l,v])=>`<div class="srow"><span class="srl">${l}</span><span class="srv pk">${U.esc(v)}</span></div>`).join('');
    const changes=[];let last=null;[...entries].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{if(e.stage&&e.stage!==last){changes.push({stage:e.stage,date:e.date});last=e.stage;}});
    document.getElementById('hr-tline').innerHTML=changes.length?`<div class="tline">${changes.map((sc,i)=>{const next=changes[i+1];const dur=U.daysBetween(sc.date,next?next.date:U.today());return `<div class="tlinei"><div class="tlinedot"></div><div class="tlineb"><span class="tlines">${U.stageEmj(sc.stage)} ${U.stageLbl(sc.stage)}</span><span class="tlineda">${U.fmtD(sc.date)}</span><span class="tlinedur">${dur}d</span></div></div>`;}).join('')}</div>`:'<div class="eh">Sem dados.</div>';
    M.open('modal-harvest');
  }
  function save(){
    const p=DB.getPlant(_id);if(!p)return;
    p.harvestReport={date:U.today(),yieldWet:parseFloat(document.getElementById('hr-wet').value)||null,yieldDry:parseFloat(document.getElementById('hr-dry').value)||null,rating:parseInt(UI.getPill('hr-rating'))||4,notes:document.getElementById('hr-notes').value.trim()||null};
    DB.upsert(p);M.close('modal-harvest');renderDetail(p);UI.toast('Relatório salvo! 🏆');
  }
  function exportCSV(){
    const p=DB.getPlant(_id);if(!p)return;
    const r=p.harvestReport||{};
    const lines=['=== RELATÓRIO DE COLHEITA ===',`Planta,${p.name}`,`Duração,${U.daysAlive(p)} dias`,`Peso úmido,${r.yieldWet||'—'} g`,`Peso seco,${r.yieldDry||'—'} g`,`Avaliação,${r.rating||'—'}⭐`,'','Data,Hora,Tipo,Estágio,Dias,Temp,UR,VPD,pH,EC,Água',...(p.entries||[]).map(e=>[e.date,e.time||'',e.actionType||'geral',U.stageLbl(e.stage),e.daysAlive||'',e.temp||'',e.ur||'',e.vpd||'',e.ph||'',e.ec||'',e.water||''].join(','))];
    U.dl(lines.join('\n'),p.name.replace(/\s+/g,'_')+'_harvest.csv','text/csv;charset=utf-8');UI.toast('Exportado! 📤');
  }
  return { open, save, exportCSV };
})();

/* ═══ OB ═══ */
const OB = (() => {
  let _s=0;const N=5;
  function show(){_s=0;_render();document.getElementById('ob').classList.remove('bye');}
  function _render(){
    const dots=document.querySelectorAll('.ob-dot');
    dots.forEach((d,i)=>{d.classList.toggle('done',i<_s);d.classList.toggle('cur',i===_s);});
    document.querySelectorAll('.ob-step').forEach((s,i)=>s.classList.toggle('on',i===_s));
    const foot=document.getElementById('ob-foot');
    foot.innerHTML=`${_s>0?'<button class="btn bgh" onclick="OB.prev()" style="flex:none;padding:14px 18px">←</button>':''}<button class="btn bpk" onclick="${_s===N-1?'OB.finish()':'OB.next()'}">${_s===0?'Vamos lá →':_s===N-1?'Começar! 🌸':'Próximo →'}</button>`;
  }
  function next(){if(_s<N-1){_s++;_render();}}
  function prev(){if(_s>0){_s--;_render();}}
  function finish(){DB.obDone();const el=document.getElementById('ob');el.classList.add('bye');setTimeout(()=>el.style.display='none',400);renderHome();UI.toast('Pronto! Adicione sua primeira planta. 🌱');}
  function skip(){finish();}
  return { show, next, prev, finish, skip };
})();

/* ═══ Modals ═══ */
const Modals = (() => {
  let _ePlant=null, _eEntry=null;

  function openPlant(id){
    _ePlant=id||null;const p=id?DB.getPlant(id):null;
    document.getElementById('mp-title').textContent=p?'Editar Planta':'Nova Planta';
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??'';};
    sv('mp-name',p?.name||'');sv('mp-date',p?.startDate||U.today());sv('mp-obs',p?.obs||'');
    sv('mp-cycw',p?.cycleWith??2);sv('mp-cyco',p?.cycleWithout??1);
    sv('mp-veg',p?.vegWeeks||'');sv('mp-flor',p?.flowerWeeks||'');
    UI.setPill('mp-type',p?.type||'auto');
    PT.sw('basico');Library.fillSelects(p);
    M.open('modal-plant');
    setTimeout(()=>document.getElementById('mp-name').focus(),200);
  }

  function savePlant(){
    const name=document.getElementById('mp-name').value.trim();
    if(!name){UI.toast('Informe o nome.');return;}
    const gv=id=>document.getElementById(id)?.value||null;
    const base={name,type:UI.getPill('mp-type')||'auto',startDate:gv('mp-date')||U.today(),obs:gv('mp-obs')||null,
      vegWeeks:parseInt(gv('mp-veg'))||null,flowerWeeks:parseInt(gv('mp-flor'))||null,
      cycleWith:parseInt(gv('mp-cycw'))||2,cycleWithout:parseInt(gv('mp-cyco'))||1,
      parentId:gv('mp-parent')||null,soilId:gv('mp-soil')||null,potId:gv('mp-pot')||null,
      setupId:gv('mp-setup')||null,lineageNodeId:gv('mp-lineage')||null};
    if(_ePlant){const p=DB.getPlant(_ePlant);if(p){Object.assign(p,base);DB.upsert(p);}}
    else DB.upsert({id:U.uid(),...base,stage:'vegetativo',entries:[]});
    M.close('modal-plant');renderHome();UI.toast(_ePlant?'Planta atualizada. ✏️':'Planta adicionada! 🌱');
  }

  function openStage(){
    const p=DB.getPlant(App.activeId());if(!p)return;
    UI.setPill('stage-pills',p.stage||'vegetativo');
    document.getElementById('ms-days').value='';document.getElementById('ms-weeks').value='';
    M.open('modal-stage');
  }

  function saveStage(){
    const p=DB.getPlant(App.activeId());if(!p)return;
    const ns=UI.getPill('stage-pills');
    const dOv=parseInt(document.getElementById('ms-days').value);
    const wOv=parseInt(document.getElementById('ms-weeks').value);
    if(ns&&ns!==p.stage)p.stageStartDate=U.today();
    const prev=p.stage;p.stage=ns||p.stage;
    if(!isNaN(dOv)&&dOv>=0)p.daysOverride=dOv;else delete p.daysOverride;
    if(!isNaN(wOv)&&wOv>=1)p.weeksOverride=wOv;else delete p.weeksOverride;
    DB.upsert(p);M.close('modal-stage');renderDetail(p);renderHome();
    if(ns==='colheita'&&prev!=='colheita'){setTimeout(()=>HR.open(p.id),350);return;}
    UI.toast('Estágio atualizado.');
  }

  function openEntry(preset){
    _eEntry=null;document.getElementById('me-title').textContent='Novo Registro';
    EF.reset(App.activeId(),null);
    if(preset)setTimeout(()=>AT.preset(preset),80);
    M.open('modal-entry');
  }

  function _openEditEntry(entryId){
    const p=DB.getPlant(App.activeId());if(!p)return;
    const e=(p.entries||[]).find(x=>x.id===entryId);if(!e)return;
    _eEntry=entryId;document.getElementById('me-title').textContent='✏️ Editar Registro';
    EF.reset(App.activeId(),e);M.close('modal-edet');M.open('modal-entry');
  }

  function saveEntry(){
    const p=DB.getPlant(App.activeId());if(!p){UI.toast('Nenhuma planta.');return;}
    const date=document.getElementById('ef-date').value;if(!date){UI.toast('Informe a data.');return;}
    const lux=parseFloat(document.getElementById('ef-lux').value)||null;
    const on=document.getElementById('ef-ledon').value||null;
    const off=document.getElementById('ef-ledoff').value||null;
    const ppfd=lux?Light.toPPFD(lux):null;
    const ha=Light.parseH(on),hb=Light.parseH(off);let h=null;if(ha!==null&&hb!==null){h=hb-ha;if(h<=0)h+=24;}
    const dli=(ppfd&&h)?Light.toDLI(ppfd,h):null;
    const temp=parseFloat(document.getElementById('ef-temp').value)||null;
    const ur=parseFloat(document.getElementById('ef-ur').value)||null;
    const vpd=(temp&&ur)?VPD.calc(temp,ur):null;
    const atype=AT.get();
    const entry={id:_eEntry||U.uid(),date,time:document.getElementById('ef-time').value||null,
      actionType:atype,...AT.extra(atype),stage:UI.getPill('ef-stage')||p.stage,
      daysAlive:U.daysAlive(p,date),weekInStage:U.weekInStage(p,date),
      temp,ur,vpd,lux,dimmer:parseFloat(document.getElementById('ef-dimmer').value)||null,
      dist:parseFloat(document.getElementById('ef-dist').value)||null,ledon:on,ledoff:off,ppfd,dli,
      water:parseFloat(document.getElementById('ef-water').value)||null,
      ec:parseFloat(document.getElementById('ef-ec').value)||null,
      ph:parseFloat(document.getElementById('ef-ph').value)||null,
      nutrients:EF.getNuts(),obs:document.getElementById('ef-obs').value.trim()||null};
    if(!p.entries)p.entries=[];
    if(_eEntry){const i=p.entries.findIndex(x=>x.id===_eEntry);if(i>=0)p.entries[i]=entry;}
    else p.entries.push(entry);
    DB.upsert(p);M.close('modal-entry');renderDetail(p);renderHome();
    UI.toast(_eEntry?'Registro atualizado! ✏️':'Registro salvo! ✅');
  }

  function openEDet(entryId){
    const p=DB.getPlant(App.activeId());if(!p)return;
    const e=(p.entries||[]).find(x=>x.id===entryId);if(!e)return;
    const week=e.weekInStage||1,pt=p.type||'auto';
    const rr=(lbl,val,param,unit='')=>`<tr><td>${lbl}</td><td>${val!=null?val+unit+' '+Ref.badge(param,parseFloat(val),pt,week):'—'}</td></tr>`;
    document.getElementById('edet-body').innerHTML=`<table class="dtbl"><tbody>
      <tr><td>Data</td><td>${U.fmtD(e.date)}</td></tr>
      <tr><td>Hora</td><td>${e.time||'—'}</td></tr>
      <tr><td>Estágio</td><td>${U.stageLbl(e.stage)}</td></tr>
      <tr><td>Dias / Sem.</td><td>D${e.daysAlive??'—'} / Sem.${e.weekInStage??'—'}</td></tr>
      ${rr('Temperatura',e.temp,'temp',' °C')}${rr('Umidade',e.ur,'ur',' %')}${rr('VPD',e.vpd,'vpd',' kPa')}
      <tr><td>Lux</td><td>${e.lux?Number(e.lux).toLocaleString('pt-BR'):'—'}</td></tr>
      <tr><td>PPFD</td><td>${e.ppfd?e.ppfd+' µmol/m²/s':'—'}</td></tr>
      <tr><td>DLI</td><td>${e.dli?e.dli+' mol/m²/d':'—'}</td></tr>
      <tr><td>Fotoperíodo</td><td>${(e.ledon&&e.ledoff)?e.ledon+' – '+e.ledoff:'—'}</td></tr>
      <tr><td>Água</td><td>${e.water?e.water+' ml':'—'}</td></tr>
      ${rr('pH',e.ph,'ph')}${rr('EC',e.ec,'ec')}
      <tr><td>Nutrientes</td><td>${e.nutrients?.length?e.nutrients.map(n=>U.esc(n.name)+(n.qty?' '+n.qty+'ml/L':'')).join(', '):'—'}</td></tr>
      <tr><td>Obs.</td><td>${e.obs?U.esc(e.obs):'—'}</td></tr>
    </tbody></table>`;
    document.getElementById('edet-edit').onclick=()=>_openEditEntry(entryId);
    document.getElementById('edet-del').onclick=()=>{
      const p2=DB.getPlant(App.activeId());if(!p2)return;
      UI.confirm('Excluir registro','Remover permanentemente?').then(ok=>{
        if(!ok)return;p2.entries=(p2.entries||[]).filter(x=>x.id!==entryId);
        DB.upsert(p2);M.close('modal-edet');renderDetail(p2);renderHome();UI.toast('Excluído.');
      });
    };
    M.open('modal-edet');
  }

  function openIE(){M.open('modal-ie');}

  return { openPlant, savePlant, openStage, saveStage, openEntry, saveEntry, openEDet, openIE };
})();

/* ═══ App ═══ */
const App = (() => {
  let _active=null,_cur='home',_prev='home';
  const activeId = () => _active;

  function go(screen){
    if(screen==='detail'&&!_active)return;
    _prev=_cur;_cur=screen;
    UI.setScreen(screen);_hdr(screen);
    if(screen==='stats')renderStats();
    if(screen==='home')renderHome();
    if(screen==='library')Library.render();
  }
  function goBack(){go(_prev===_cur?'home':_prev);}

  function openPlant(id){
    _active=id;const p=DB.getPlant(id);if(!p)return;
    document.getElementById('bnav-detail').style.display='';
    renderDetail(p);go('detail');
  }

  function deletePlant(id){
    UI.confirm('Excluir planta','Todos os registros serão removidos.').then(ok=>{
      if(!ok)return;DB.del(id);_active=null;document.getElementById('bnav-detail').style.display='none';go('home');UI.toast('Planta excluída.');
    });
  }

  function _hdr(screen){
    const logo=document.getElementById('hdr-logo'),title=document.getElementById('hdr-title'),back=document.getElementById('back-btn'),acts=document.getElementById('hdr-acts');
    logo.classList.remove('hidden');title.classList.add('hidden');back.classList.add('hidden');
    acts.innerHTML=`<button class="hbtn" onclick="Modals.openIE()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>`;
    if(screen==='detail'){
      const p=DB.getPlant(_active);logo.classList.add('hidden');
      title.textContent=p?p.name:'—';title.classList.remove('hidden');back.classList.remove('hidden');
      acts.innerHTML=`<button class="hbtn" onclick="Modals.openPlant('${_active}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="hbtn" style="color:var(--rd)" onclick="App.deletePlant('${_active}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`;
    } else if(screen==='stats'||screen==='library'){
      logo.classList.add('hidden');title.textContent=screen==='stats'?'Analytics':'Biblioteca';title.classList.remove('hidden');back.classList.remove('hidden');acts.innerHTML='';
    }
  }

  function exportPlantCSV(){
    const p=DB.getPlant(_active);if(!p)return;
    const rows=['Data,Hora,Tipo,Estágio,Dias,Temp,UR,VPD,pH,EC,Água',...(p.entries||[]).map(e=>[e.date,e.time||'',e.actionType||'geral',U.stageLbl(e.stage),e.daysAlive||'',e.temp||'',e.ur||'',e.vpd||'',e.ph||'',e.ec||'',e.water||''].join(','))];
    U.dl(rows.join('\n'),p.name.replace(/\s+/g,'_')+'_log.csv','text/csv;charset=utf-8');UI.toast('CSV exportado! 📊');
  }
  function exportAllCSV(){
    const {plants}=DB.get();if(!plants.length){UI.toast('Sem dados.');return;}
    const rows=['Planta,Data,Hora,Tipo,Estágio,Dias,Temp,UR,VPD,pH,EC,Água'];
    plants.forEach(p=>(p.entries||[]).forEach(e=>rows.push([`"${p.name}"`,e.date,e.time||'',e.actionType||'geral',U.stageLbl(e.stage),e.daysAlive||'',e.temp||'',e.ur||'',e.vpd||'',e.ph||'',e.ec||'',e.water||''].join(','))));
    U.dl(rows.join('\n'),'growlog_export.csv','text/csv;charset=utf-8');M.close('modal-ie');UI.toast('CSV exportado! 📤');
  }
  function exportBackup(){U.dl(JSON.stringify(DB.get(),null,2),'growlog_backup.json','application/json');M.close('modal-ie');UI.toast('Backup salvo! 💾');}
  function importBackup(event){
    const file=event.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const parsed=JSON.parse(ev.target.result);
        if(!parsed.plants){UI.toast('Arquivo inválido.');return;}
        UI.confirm('Importar backup','Isso substituirá todos os dados.').then(ok=>{
          if(!ok)return;DB.replace(parsed);_active=null;document.getElementById('bnav-detail').style.display='none';
          renderHome();M.close('modal-ie');go('home');UI.toast('Importado! ✅');
        });
      }catch{UI.toast('Erro ao ler o arquivo.');}
    };
    reader.readAsText(file);event.target.value='';
  }
  return { activeId, go, goBack, openPlant, deletePlant, exportPlantCSV, exportAllCSV, exportBackup, importBackup };
})();

/* ═══ INIT ═══ */
(async function init(){
  await DB.load();
  ['mp-type','stage-pills','ef-stage','ef-poda-tipo','ef-lst-tipo','hr-rating',
   'lib-soil-type','lib-nut-type','lib-pot-type','lib-gene-gen'].forEach(id=>UI.initPills(id));
  document.getElementById('nut-name')?.addEventListener('input',e=>EF.renderAC(e.target.value));
  document.getElementById('nut-name')?.addEventListener('blur',()=>setTimeout(()=>document.getElementById('nut-ac')?.classList.add('hidden'),200));
  document.querySelectorAll('.ov').forEach(ov=>{
    ov.addEventListener('click',e=>{if(e.target===ov){ov.classList.remove('open');if(ov.id==='modal-confirm')UI.resolveConfirm(false);}});
  });
  renderHome();
  if(!DB.isObDone())setTimeout(()=>OB.show(),200);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
