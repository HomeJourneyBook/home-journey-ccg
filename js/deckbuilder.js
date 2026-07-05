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

function _openDeckBuilderStep(){
  const faction=_dbFaction();
  document.getElementById('deckBuilderTitle').textContent =
    (faction==='tea' ? 'TAVERN' : 'JEET') + ' — BUILD YOUR DECK';
  _renderDeckBuilder(faction);
  const modal=document.getElementById('deckBuilderModal');
  modal.classList.remove('hidden');
  const inner=modal.querySelector('.modal');
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-in');
  }
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

function _dbCardEl(faction,key,def,max,qty){
  const isSW=def.spell||def.world||def.artifact;
  const tagIcons=(def.tags||[])
    .map(t=>t.split(':')[0])
    .filter(t=>DB_TAG_ICONS[t])
    .map(t=>`<div class="card-tag-icon">${DB_TAG_ICONS[t]}</div>`)
    .join('');

  const div=document.createElement('div');
  div.className=`card cat-card db-card ${def.f==='tea'?'tea-card':'jeet-card'} ${qty>0?'db-selected':''} ${def.world?'world-card':''}`;
  if(def.world && def.img) div.style.cssText += `;background-image:url('img/cards/${def.img}')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;`;

  const stepper = max>1
    ? `<div class="db-stepper" onclick="event.stopPropagation()">
         <button class="db-step-btn" onclick="dbSetQty('${faction}','${key}',${qty-1})">−</button>
         <span class="db-qty">${qty}/${max}</span>
         <button class="db-step-btn" onclick="dbSetQty('${faction}','${key}',${qty+1})">+</button>
       </div>`
    : `<div class="db-stepper db-stepper-single">${qty>0?'✓ IN DECK':'TAP TO ADD'}</div>`;

  div.innerHTML = def.world ? `
      <div class="card-cost">${def.cost}</div>
      <div class="card-type-dot" data-type="${getTypeDotLabel(def)}" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
      ${stepper}
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
      ${stepper}
    `;

  div.addEventListener('mouseenter',()=>playSfx('Navigation_Cursor'));
  if(max===1){
    div.style.cursor='pointer';
    div.onclick=()=>dbSetQty(faction,key,qty>0?0:1);
  }
  return div;
}

function _renderDeckBuilder(faction){
  const pool=getRushPool(faction).slice().sort((a,b)=>{
    const da=DEFS[a.key], db=DEFS[b.key];
    return (da.cost-db.cost) || da.name.localeCompare(db.name);
  });
  const grid=document.getElementById('deckBuilderGrid');
  grid.innerHTML='';
  pool.forEach(({key,max})=>{
    const def=DEFS[key];
    const qty=_db.picks[faction][key]||0;
    grid.appendChild(_dbCardEl(faction,key,def,max,qty));
  });
  _updateDeckBuilderCount();
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

function _dbTotal(faction){
  return Object.values(_db.picks[faction]).reduce((a,b)=>a+b,0);
}

function _updateDeckBuilderCount(){
  const faction=_dbFaction();
  const total=_dbTotal(faction);
  const el=document.getElementById('deckBuilderCount');
  el.textContent=`Selected: ${total}  (minimum ${RUSH_MIN})`;
  el.classList.toggle('db-count-ok', total>=RUSH_MIN);
  const btn=document.getElementById('deckBuilderNextBtn');
  btn.disabled = total<RUSH_MIN;
  const isLastStep = _db.stepIndex >= _db.buildOrder.length-1;
  btn.textContent = isLastStep ? 'Start Game' : `Next: ${_db.buildOrder[_db.stepIndex+1]==='jeet'?'Jeet':'Tea'}`;
}

function deckBuilderConfirm(){
  const faction=_dbFaction();
  if(_dbTotal(faction)<RUSH_MIN) return;
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  const modal=document.getElementById('deckBuilderModal');
  const inner=modal.querySelector('.modal');
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
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-out');
    setTimeout(proceed,250);
  } else proceed();
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
    lg('─ NEW GAME ─','trn');
    lg('TEA goes first.','imp');
    logTurnSnapshot('tea');
    setTimeout(()=>{ startMulliganFor('tea'); }, 50);
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
  lg('─ NEW GAME (VS AI) ─','trn');
  logTurnSnapshot('tea');
  aiAutoMulligan(G.aiFaction);
  setTimeout(()=>{ startMulliganFor(G.humanFaction); }, 50);
}
