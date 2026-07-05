let G={};

function newPlayer(f, deckConfig){
  const d=buildDeck(f, deckConfig||'full');
  return{hp:20,maxHp:20,ess:1,essMax:1,
    hand:d.splice(0,5).map(k=>mkCard(k)),
    field:[],deck:d.map(k=>mkCard(k)),grave:[],void:[],
    world:null,artifacts:[],extraDraw:0,burned:false};
}

// opts (необязательно) — конфиг режима игры:
//   { mode:'vsai', humanFaction:'tea'|'jeet', deckConfig:'full'|'compact'|'mini' }
// Без opts — обычный Hot Seat, поведение полностью как раньше (deckConfig='full').
function initState(opts){
  UID=0;
  if(typeof _seenPcardPids!=='undefined') _seenPcardPids.clear(); // сброс между партиями, см. render.js/reorderZones
  const deckConfig=(opts&&opts.deckConfig)||'full';
  G={turn:'tea',turnNum:1,phase:'mulligan',mulliganTurn:'tea',sel:null,
    tea:newPlayer('tea',deckConfig),jeet:newPlayer('jeet',deckConfig),
    jeetFirstTurn:true,logs:[],previewCard:null,mulligan:{tea:{used:0},jeet:{used:0}},
    mode:'hotseat',humanFaction:null,aiFaction:null,gameOver:false,deckConfig};
  if(opts&&opts.mode==='vsai'){
    G.mode='vsai';
    G.humanFaction=opts.humanFaction==='jeet'?'jeet':'tea';
    G.aiFaction=G.humanFaction==='tea'?'jeet':'tea';
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
      field:p.field.map(c=>`${c.name} (${c.hp}/${c.maxHp} HP, ${c.atk+(c.atkBonus||0)+(c.rageBonus||0)+(c.squadAtkBonus||0)+(c.tempAtkBonus||0)} ATK)`),
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
  c.sleeping=false;c.exhausted=false;c.feared=false;c.burning=false;c.atkBonus=0;c.rageBonus=0;c.tempAtkBonus=0;c.maxHpBonus=0;c.squadMaxHpBonus=0;c.squadAtkBonus=0;c.squadParam=null;
  const def=DEFS[c.key];if(def){c.hp=def.hp;c.maxHp=def.hp;}
}

// Base HP visual tier (1-5) — drives which bg_statbar_<faction><tier>.png shows
// on the player-name-box. 20=1 (full/pristine), 15-19=2, 10-14=3, 5-9=4, 0-4=5
// (most damaged). See reorderZones() in render.js for where this gets applied.
function hpTier(hp){
  if(hp>=20) return 1;
  if(hp>=15) return 2;
  if(hp>=10) return 3;
  if(hp>=5) return 4;
  return 5;
}
