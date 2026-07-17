let G={};

// customList (optional) — a pre-picked Rush deck (see js/deckbuilder.js), used
// instead of buildDeck() when provided. Not yet shuffled by the caller (the
// deckbuilder hands over picks in pool order) — shuffled here either way.
function newPlayer(f, deckConfig, customList){
  const d = customList ? shuffleArr(customList.slice()) : buildDeck(f, deckConfig||'classic');
  return{hp:30,maxHp:30,ess:1,essMax:1,
    hand:d.splice(0,5).map(k=>mkCard(k)),
    field:[],deck:d.map(k=>mkCard(k)),grave:[],void:[],
    world:null,artifacts:[],extraDraw:0,burned:false};
}

// opts (необязательно) — конфиг режима игры:
//   { mode:'vsai', humanFaction:'tea'|'jeet', deckConfig:'classic'|'rush',
//     rushDecks:{tea:[...keys],jeet:[...keys]}, firstFaction:'tea'|'jeet',
//     spectator:true }
// spectator — оба игрока управляются ИИ (см. isAiTurn() ниже и startAiVsAiSpectator()
// в ui.js) — humanFaction/aiFaction по-прежнему назначаются (для POV рендера: чья рука
// открыта/закрыта), но НИКТО ход не отдаёт человеку — обе стороны всегда играет runAiTurn().
// rushDecks — только для deckConfig:'rush': pre-picked deck lists from the
// deckbuilder (human side(s)) + buildAiRushDeck() (AI side, vsAI only). Stashed
// back onto G so "Restart (same setup)" (resetGame() in ui.js) can reuse the
// exact same picks instead of re-opening the deckbuilder.
// firstFaction — who goes first, decided by the order-roll dice-off
// (openOrderRoll() in ui.js) before initState() is ever called. Defaults to
// 'tea' only for the throwaway pre-landing boot state (see bottom of ui.js) —
// every real match always passes one in explicitly.
// Без opts — обычный Hot Seat, поведение полностью как раньше (deckConfig='classic').
function initState(opts){
  UID=0;
  if(typeof _seenPcardPids!=='undefined') _seenPcardPids.clear(); // сброс между партиями, см. render.js/reorderZones
  const deckConfig=(opts&&opts.deckConfig)||'classic';
  const rushDecks=(opts&&opts.rushDecks)||null;
  const firstFaction=(opts&&opts.firstFaction==='jeet')?'jeet':'tea';
  const secondFaction=firstFaction==='tea'?'jeet':'tea';
  G={turn:firstFaction,turnNum:1,phase:'mulligan',mulliganTurn:firstFaction,sel:null,
    tea:newPlayer('tea',deckConfig,rushDecks&&rushDecks.tea),
    jeet:newPlayer('jeet',deckConfig,rushDecks&&rushDecks.jeet),
    firstFaction,secondFaction,
    // True until secondFaction's very first turn has happened — that turn
    // gets essMax/ess=1 (not the usual +1 accrual) same as everyone's actual
    // first turn. Was hardcoded to "jeetFirstTurn" back when Jeet was always
    // 2nd; now tracks whichever faction the dice-roll made 2nd. See endTurn()
    // in game.js.
    secondFirstTurn:true,logs:[],previewCard:null,mulligan:{tea:{used:0},jeet:{used:0}},
    mode:'hotseat',humanFaction:null,aiFaction:null,spectatorMode:false,gameOver:false,deckConfig,rushDecks};
  if(opts&&opts.mode==='vsai'){
    G.mode='vsai';
    G.humanFaction=opts.humanFaction==='jeet'?'jeet':'tea';
    G.aiFaction=G.humanFaction==='tea'?'jeet':'tea';
    G.spectatorMode=!!opts.spectator;
  }
  // Чистим DOM поля/руки/персиста СРАЗУ, синхронно с ресетом состояния — иначе между
  // стартом новой партии и появлением экрана муллигана (там есть небольшая задержка,
  // см. setTimeout в startGame()/startGameVsAI()/resetGame()) на долю секунды видны
  // карты из ПРЕДЫДУЩЕЙ партии, которые ещё не были перерисованы через render().
  ['teaField','jeetField','teaHand','jeetHand','teaPersist','jeetPersist','log'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.innerHTML='';
  });
}

// Отвечает на вопрос "этот ход сейчас играет ИИ (а не человек)?" — единая точка
// вместо разбросанных по ai.js/game.js/render.js проверок `G.mode==='vsai'&&G.turn===G.aiFaction`.
// В спектаторском режиме (G.spectatorMode, оба игрока — ИИ, см. startAiVsAiSpectator()
// в ui.js) это верно для ЛЮБОЙ стороны — человек тут вообще не участвует.
function isAiTurn(faction=G.turn){
  return G.mode==='vsai' && (G.spectatorMode || faction===G.aiFaction);
}

function lg(msg,cls=''){
  // 'hint' class goes only to comment bar, not to battle log
  if(cls==='hint'){
    hint(msg);return;
  }
  G.logs.push({msg,cls});
  const el=document.getElementById('log');
  if(el){
    el.innerHTML=G.logs.filter(e=>!e.hidden).map(e=>`<div class="le ${e.cls}">${e.msg}</div>`).join('');
    el.scrollTop=el.scrollHeight;
  }
}

// Structured, hidden log entry — invisible in the on-screen log panel (filtered
// out above), but present in the exported JSON (downloadBattleLog). Captures
// exactly what the about-to-act faction had available at the START of their
// turn: full hand, field state, essence, deck size. This is the data needed
// to tell "AI had a playable creature and chose not to" apart from "AI
// genuinely had nothing to play" — the visible log alone can't distinguish
// those two cases.
function logTurnSnapshot(faction){
  const p=G[faction];
  if(!p) return;
  G.logs.push({
    msg:'', cls:'snapshot', hidden:true,
    snapshot:{
      turn:G.turnNum,
      faction,
      ess:{cur:p.ess,max:p.essMax},
      hand:p.hand.map(c=>c.name),
      field:p.field.map(c=>`${c.name} (${c.hp}/${c.maxHp} HP, ${c.atk+(c.atkBonus||0)+(c.rageBonus||0)+(c.squadAtkBonus||0)+(c.tempAtkBonus||0)} ATK${c.armor?`, ${c.armor} Armor`:''})`),
      deckLeft:p.deck.length,
    }
  });
}

function hint(msg){
  // Show in comment bar only, not in battle log
  ['hintT2','hintJ2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&el.closest('.bottom-bar')&&el.closest('.bottom-bar').style.display!=='none')
      el.textContent=msg;
  });
}

function findC(id){
  for(const f of['tea','jeet'])for(const arr of[G[f].hand,G[f].field,G[f].grave]){
    const c=arr.find(x=>x.id===id);if(c)return c;
  }return null;
}

function resetC(c){
  c.sleeping=false;c.exhausted=false;c.feared=false;c.burning=false;c.provokeBroken=false;c.interceptUsed=false;c.stealthBroken=false;c.shieldConsumed=false;c.atkBonus=0;c.auraMaxHpBonus=0;c.rageBonus=0;c.tempAtkBonus=0;c.maxHpBonus=0;c.squadMaxHpBonus=0;c.squadAtkBonus=0;c.squadArmorBonus=0;c.spellArmorBonus=0;c.squadParam=null;c.armor=0;c.armorMax=undefined;c.auraArmorBonus=0;c.worldArmorBonus=0;
  c.incarnTimer=undefined; // Инкарнация: если карта покидает grave не через revive-тик (см. endTurn()), таймер не должен тащиться дальше
  c.incarnUsed=undefined; // одноразовость — сброс, если карта когда-нибудь вернётся в колоду/руку (bounce и т.п.)
  const def=DEFS[c.key];if(def){c.hp=def.hp;c.maxHp=def.hp;}
}

// Base HP visual tier (1-5) — drives which bg_statbar_<faction><tier>.png shows
// on the player-name-box. 20=1 (full/pristine), 15-19=2, 10-14=3, 5-9=4, 0-4=5
// (most damaged). See reorderZones() in render.js for where this gets applied.
function hpTier(hp){
  if(hp>=24) return 1;
  if(hp>=18) return 2;
  if(hp>=12) return 3;
  if(hp>=6) return 4;
  return 5;
}
