// ── RUSH DECKBUILDER ──────────────────────────────────────────────────────
// Rush mode has no fixed starter deck: the human player(s) assemble their own
// (minimum RUSH_MIN cards, see deck.js) by picking quantities out of the same
// pool Classic mode uses (getRushPool() in deck.js). Runs once per
// human-controlled faction:
//   - Hot Seat: twice — Tea then Jeet, with the existing "pass the device"
//     screen between them so each player only sees their own pool.
//   - VS AI: once — just the human. The AI gets an automatic random
//     RUSH_MIN-card sample of the same pool (buildAiRushDeck() in deck.js),
//     no deckbuilder UI for it.
// Entry point: startRushBuild(flow, opts) — called from chooseDeckConfig()/
// startGameVsAI() in ui.js once Rush has been picked (and, for vsAI, the
// human's faction chosen).

let _db = null; // { flow:'hotseat'|'vsai', vsAiHumanFaction, buildOrder:[faction,...], stepIndex, picks:{tea:{key:qty}, jeet:{key:qty}} }

function startRushBuild(flow, opts){
  _db = {
    flow,
    vsAiHumanFaction: opts && opts.vsAiHumanFaction,
    buildOrder: flow==='hotseat' ? ['tea','jeet'] : [(opts && opts.vsAiHumanFaction) || 'tea'],
    stepIndex: 0,
    picks: { tea:{}, jeet:{} },
  };
  _openDeckBuilderStep();
}

function _dbFaction(){ return _db.buildOrder[_db.stepIndex]; }

// Кнопка "назад" — по требованию автора черновик Rush-колоды НЕ сохраняется: неважно,
// на каком шаге (Tea/Jeet в hotseat), назад полностью аннулирует текущую сборку и
// возвращает к модалке, из которой в неё попали — vsAiPickerModal (флоу vsai, там перед
// дек-билдером был выбор фракции) или deckPickerModal (флоу hotseat, дек-билдер шёл сразу
// после выбора Classic/Rush).
function backFromDeckBuilder(){
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  const flow=_db?_db.flow:'hotseat';
  const modal=document.getElementById('deckBuilderModal');
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    _db=null;
    const backModal=document.getElementById(flow==='vsai'?'vsAiPickerModal':'deckPickerModal');
    backModal.classList.remove('hidden');
    _modalPopIn(backModal);
  }, 250);
}

function _openDeckBuilderStep(){
  const faction=_dbFaction();
  document.getElementById('deckBuilderTitle').textContent = 'CHOOSE YOUR DECK';
  _dbFilter='all';
  _renderDeckBuilder(faction);
  const modal=document.getElementById('deckBuilderModal');
  modal.classList.remove('hidden');
  _modalPopIn(modal);
}

const DB_TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
  'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
  'invisible':'<img src="img/ico_invis.png" style="width:60%;height:60%;">',
};

// Категории для кнопок-фильтров над правой (пул) областью — переиспользует ту же
// классификацию, что и .card-type-dot (getTypeDotLabel в render.js), просто сводит
// Unique к Traveler (легендарки — всё ещё существа с hp/atk, отдельная кнопка под
// них не нужна, тем более пока их нет в Rush-пуле).
const DB_FILTERS = [
  {id:'all',      label:'All',       test:()=>true},
  {id:'traveler', label:'Travelers', test:def=>!def.world&&!def.artifact&&!def.spell},
  {id:'spell',    label:'Spells',    test:def=>!!def.spell},
  {id:'world',    label:'Worlds',    test:def=>!!def.world},
  {id:'artifact', label:'Artifacts', test:def=>!!def.artifact},
];
let _dbFilter='all'; // сбрасывается на 'all' при каждом новом шаге (см. _openDeckBuilderStep)

function _dbCardEl(faction,key,def){
  const isSW=def.spell||def.world||def.artifact;
  const tagIcons=(def.tags||[])
    .map(t=>t.split(':')[0])
    .filter(t=>DB_TAG_ICONS[t])
    .map(t=>`<div class="card-tag-icon">${DB_TAG_ICONS[t]}</div>`)
    .join('');

  const div=document.createElement('div');
  div.className=`card cat-card db-card ${def.f==='tea'?'tea-card':'jeet-card'} ${def.world?'world-card':''}`;
  if(def.world && def.img) div.style.cssText += `;background-image:url('img/cards/${def.img}')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;`;

  // Никаких надписей/рамок поверх карты — сам факт того, в какой из двух колонок
  // (пул/выбрано) она сейчас лежит, и есть индикация. Клик просто перебрасывает карту
  // в другую колонку (см. _renderDeckBuilder ниже).
  div.innerHTML = def.world ? `
      <div class="card-cost">${def.cost}</div>
      <div class="card-type-dot" data-type="${getTypeDotLabel(def)}" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
    ` : `
      <div class="card-cost">${def.cost}</div>
      <div class="card-type-dot" data-type="${getTypeDotLabel(def)}" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-art">${def.img?`<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:def.art}</div>
      ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      ${!isSW?`<div class="card-stats">
        <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${def.hp}</span></div>
        <img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon">
        <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${def.atk}</span></div>
      </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon"></div>`}
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
    `;

  div.addEventListener('mouseenter',()=>playSfx('Navigation_Cursor'));
  div.style.cursor='pointer';
  return div;
}

// Стопка = одна физическая карта (count===1) или несколько одинаковых копий друг на
// друге с небольшим сдвигом (count>1, только у заклинаний — см. getRushPool в deck.js).
// count — сколько копий этого key лежит ИМЕННО в этой колонке сейчас (remaining в пуле
// или qty в выбранных, см. _renderDeckBuilder). Клик по стопке снимает/добавляет ОДНУ
// копию — caller передаёт onClick.
function _dbStackEl(faction,key,def,count,onClick){
  const wrap=document.createElement('div');
  wrap.className='db-stack';
  // Не рисуем больше 2 "теневых" слоёв под верхней картой, даже если копий больше —
  // визуально это уже читается как "стопка", дальше только загромождает.
  const shadowLayers=Math.min(count-1,2);
  for(let s=shadowLayers;s>=1;s--){
    const layer=document.createElement('div');
    layer.className=`db-stack-layer ${def.f==='tea'?'tea-card':'jeet-card'}`;
    layer.style.setProperty('--layer-i', s);
    wrap.appendChild(layer);
  }
  const card=_dbCardEl(faction,key,def);
  card.classList.add('db-stack-top');
  card.onclick=onClick;
  wrap.appendChild(card);
  if(count>1){
    const badge=document.createElement('div');
    badge.className='db-stack-count';
    badge.textContent='×'+count;
    wrap.appendChild(badge);
  }
  return wrap;
}

function dbSetFilter(filterId){
  _dbFilter=filterId;
  _renderDeckBuilder(_dbFaction());
}

function _renderDbFilters(){
  const bar=document.getElementById('deckBuilderFilters');
  if(!bar) return;
  bar.innerHTML=DB_FILTERS.map(f=>
    `<button class="db-filter-btn ${f.id===_dbFilter?'active':''}" onclick="dbSetFilter('${f.id}')">${f.label}</button>`
  ).join('');
}

function _renderDeckBuilder(faction){
  const pool=getRushPool(faction).slice().sort((a,b)=>{
    const da=DEFS[a.key], db=DEFS[b.key];
    return (da.cost-db.cost) || da.name.localeCompare(db.name);
  });

  _renderDbFilters();

  const poolGrid=document.getElementById('deckBuilderPoolGrid');
  const chosenGrid=document.getElementById('deckBuilderChosenGrid');
  poolGrid.innerHTML='';
  chosenGrid.innerHTML='';

  const activeFilter=DB_FILTERS.find(f=>f.id===_dbFilter)||DB_FILTERS[0];

  pool.forEach(({key,max})=>{
    const def=DEFS[key];
    const qty=_db.picks[faction][key]||0;
    const remaining=max-qty;
    // Пул (справа) — фильтруется кнопками сверху; выбранные (слева) — всегда все, без фильтра,
    // это же "твоя колода", её не прячем.
    if(remaining>0 && activeFilter.test(def)){
      poolGrid.appendChild(_dbStackEl(faction,key,def,remaining,()=>dbSetQty(faction,key,qty+1)));
    }
    if(qty>0){
      chosenGrid.appendChild(_dbStackEl(faction,key,def,qty,()=>dbSetQty(faction,key,qty-1)));
    }
  });

  _updateDeckBuilderCount();
  _renderDbCurve(faction);
}

function dbSetQty(faction,key,newQty){
  const entry=getRushPool(faction).find(p=>p.key===key);
  const max=entry?entry.max:1;
  newQty=Math.max(0,Math.min(max,newQty));
  if(_db.picks[faction][key]===newQty) return;
  _db.picks[faction][key]=newQty;
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  _renderDeckBuilder(faction);
}

// Кнопка "Очистить" в футере — полностью сбрасывает выбор ТЕКУЩЕГО шага (Tea или Jeet,
// смотря чей сейчас черёд собирать колоду), возвращает все карты обратно в пул.
function dbClearPicks(){
  const faction=_dbFaction();
  if(_dbTotal(faction)===0) return;
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  _db.picks[faction]={};
  _renderDeckBuilder(faction);
}

function _dbTotal(faction){
  return Object.values(_db.picks[faction]).reduce((a,b)=>a+b,0);
}

// Кривая маны — просто столбики CSS высотой пропорционально количеству ВЫБРАННЫХ карт
// на каждую стоимость (0..6, 6 = "6 и больше"), без канваса/библиотек. Кастомный арт —
// отдельным заходом позже (автор ещё не решил, как хочет это визуально).
function _renderDbCurve(faction){
  const el=document.getElementById('deckBuilderCurve');
  if(!el) return;
  const buckets=new Array(7).fill(0); // индекс 6 = "6+"
  Object.keys(_db.picks[faction]).forEach(key=>{
    const qty=_db.picks[faction][key];
    if(!qty) return;
    const cost=Math.min(DEFS[key].cost, 6);
    buckets[cost]+=qty;
  });
  const max=Math.max(1,...buckets);
  el.innerHTML=buckets.map((n,i)=>`
    <div class="db-curve-bar-wrap" title="${i===6?'6+':i} cost: ${n}">
      <div class="db-curve-bar" style="height:${n?Math.round(n/max*100):0}%"></div>
      <div class="db-curve-n">${n||''}</div>
      <div class="db-curve-label">${i===6?'6+':i}</div>
    </div>`).join('');
}

function _updateDeckBuilderCount(){
  const faction=_dbFaction();
  const total=_dbTotal(faction);
  const picks=_db.picks[faction];
  const counts={traveler:0,spell:0,world:0,artifact:0};
  Object.keys(picks).forEach(key=>{
    const qty=picks[key]; if(!qty) return;
    const def=DEFS[key];
    if(def.world) counts.world+=qty;
    else if(def.artifact) counts.artifact+=qty;
    else if(def.spell) counts.spell+=qty;
    else counts.traveler+=qty;
  });
  const el=document.getElementById('deckBuilderStats');
  if(el){
    el.innerHTML=
      `<div class="db-stat-line ${total>=RUSH_MIN?'db-count-ok':''}">Selected: ${total} (min ${RUSH_MIN})</div>`+
      `<div class="db-stat-line">Travelers: ${counts.traveler}</div>`+
      `<div class="db-stat-line">Spells: ${counts.spell}</div>`+
      `<div class="db-stat-line">Worlds: ${counts.world}</div>`+
      `<div class="db-stat-line">Artifacts: ${counts.artifact}</div>`;
  }
  const btn=document.getElementById('deckBuilderNextBtn');
  btn.disabled = total<RUSH_MIN;
  const isLastStep = _db.stepIndex >= _db.buildOrder.length-1;
  // Кнопка теперь иконка (✅), без видимого текста — что именно она сделает
  // (доиграть дальше vs начать партию) уходит в title (тултип по наведению)
  // вместо textContent, у которого больше нет видимой области под текст.
  btn.title = isLastStep ? 'Start Game' : `Next: ${_db.buildOrder[_db.stepIndex+1]==='jeet'?'Jeet':'Tea'}`;
}

function deckBuilderConfirm(){
  const faction=_dbFaction();
  if(_dbTotal(faction)<RUSH_MIN) return;
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  const modal=document.getElementById('deckBuilderModal');
  const proceed=()=>{
    modal.classList.add('hidden');
    _db.stepIndex++;
    if(_db.stepIndex < _db.buildOrder.length){
      if(_db.flow==='hotseat'){
        showPassScreen(_db.buildOrder[_db.stepIndex], ()=>_openDeckBuilderStep());
      } else {
        _openDeckBuilderStep();
      }
    } else {
      _finishRushBuild();
    }
  };
  _modalPopOut(modal, proceed, 250);
}

function _dbPicksToList(faction){
  const list=[];
  const picks=_db.picks[faction];
  Object.keys(picks).forEach(key=>{ for(let i=0;i<picks[key];i++) list.push(key); });
  return list;
}

function _finishRushBuild(){
  const rushDecks={tea:null,jeet:null};

  if(_db.flow==='hotseat'){
    rushDecks.tea=_dbPicksToList('tea');
    rushDecks.jeet=_dbPicksToList('jeet').concat(['unseen']); // 2nd-player bonus, always Jeet for now
    _db=null;
    document.getElementById('game').style.display='flex';
    collapseStart();
    initState({deckConfig:'rush',rushDecks});
    render(); // see startGame()/resetGame() in ui.js for why
    lg('─ NEW GAME ─','trn');
    lg('TEA goes first.','imp');
    logTurnSnapshot('tea');
    startMulliganFor('tea'); // synchronous — see 'flicker' note in CLAUDE.md backlog: a 50ms delay here left the bare arena visible for a frame between two black overlays
    return;
  }

  // vsAI: only the human went through the builder; AI gets an automatic sample.
  const human=_db.vsAiHumanFaction;
  const ai = human==='tea' ? 'jeet' : 'tea';
  rushDecks[human]=_dbPicksToList(human);
  if(human==='jeet') rushDecks[human]=rushDecks[human].concat(['unseen']);
  rushDecks[ai]=buildAiRushDeck(ai);
  _db=null;

  document.getElementById('game').style.display='flex';
  collapseStart();
  initState({mode:'vsai',humanFaction:human,deckConfig:'rush',rushDecks});
  render();
  lg('─ NEW GAME (VS AI) ─','trn');
  logTurnSnapshot('tea');
  aiAutoMulligan(G.aiFaction);
  startMulliganFor(G.humanFaction); // synchronous — same flicker fix as above
}

// ── Deck JSON export / import ───────────────────────────────────────────
// Lets a tester save the deck they're assembling to a file (to reuse later,
// or hand to someone else to load) and load one back in — same spirit as the
// existing battle-log export/import workflow (see AI BALANCE NOTES.md).
// Import only replaces the CURRENT builder step's picks (this faction, this
// step) — it does not skip the flow or touch the other faction in Hot Seat.
// `version` is GAME_VERSION (js/data.js) at export time — bump that constant
// whenever DEFS or mechanics change, so older files can be flagged on import
// instead of silently misapplied (see _applyImportedDeck() below).
function dbExportDeck(){
  const faction=_dbFaction();
  const picks=_db.picks[faction];
  const cards=Object.keys(picks).filter(k=>picks[k]>0).map(key=>({
    key, name:(DEFS[key]&&DEFS[key].name)||key, qty:picks[key],
  }));
  const data={
    game:'homes-journey-ccg', kind:'rush-deck', version:GAME_VERSION,
    faction, total:_dbTotal(faction), cards,
  };
  const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`rush_deck_${faction}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
}

// Wired to the hidden <input type=file> in #deckBuilderModal (see index.html)
function dbImportDeck(fileInput){
  const file=fileInput.files && fileInput.files[0];
  fileInput.value=''; // so re-picking the same filename later still fires 'change'
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    let data=null;
    try{ data=JSON.parse(reader.result); }catch(e){ /* falls through to the shape check below */ }
    _applyImportedDeck(data);
  };
  reader.readAsText(file);
}

function _applyImportedDeck(data){
  const faction=_dbFaction();

  if(!data || data.game!=='homes-journey-ccg' || data.kind!=='rush-deck' || !Array.isArray(data.cards)){
    showConfirm("This file isn't a valid Rush deck export (wrong format or corrupted).",'OK',null,{title:'IMPORT FAILED',hideCancel:true});
    return;
  }
  if(data.faction && data.faction!==faction){
    const label=f=>f==='tea'?'Tavern':'Jeet';
    showConfirm(`This deck was built for ${label(data.faction)}, not ${label(faction)} — pick a file for the side you're currently building.`,'OK',null,{title:'IMPORT FAILED',hideCancel:true});
    return;
  }

  const maxByKey={};
  getRushPool(faction).forEach(({key,max})=>{ maxByKey[key]=max; });

  const newPicks={};
  let unknownCount=0, clampedCount=0;
  data.cards.forEach(entry=>{
    const key=entry && entry.key;
    const qty=Math.max(0, parseInt(entry && entry.qty, 10) || 0);
    if(!key || !(key in maxByKey)){ if(key) unknownCount++; return; }
    const max=maxByKey[key];
    if(qty>max) clampedCount++;
    newPicks[key]=Math.min(qty,max);
  });

  _db.picks[faction]=newPicks;
  _renderDeckBuilder(faction);

  const notes=[];
  if(unknownCount>0) notes.push(`${unknownCount} card(s) from the file no longer exist in the current card pool and were skipped.`);
  if(clampedCount>0) notes.push(`${clampedCount} card(s) asked for more copies than currently exist and were capped.`);
  if(data.version && data.version!==GAME_VERSION) notes.push(`This deck was saved from version ${data.version} (current: ${GAME_VERSION}) — the card list or balance may have changed since, so it's worth double-checking the build before playing.`);

  if(notes.length>0){
    showConfirm(notes.join(' '),'OK',null,{title:'IMPORT NOTICE',hideCancel:true});
  } else {
    playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  }
}
