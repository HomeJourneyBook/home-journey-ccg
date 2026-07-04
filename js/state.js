let G={};

function newPlayer(f){
  const d=buildDeck(f);
  return{hp:20,maxHp:20,ess:1,essMax:1,
    hand:d.splice(0,5).map(k=>mkCard(k)),
    field:[],deck:d.map(k=>mkCard(k)),grave:[],void:[],
    world:null,artifacts:[],extraDraw:0,burned:false};
}

// opts (необязательно) — конфиг режима игры:
//   { mode:'vsai', humanFaction:'tea'|'jeet' }
// Без opts — обычный Hot Seat, поведение полностью как раньше.
function initState(opts){
  UID=0;
  if(typeof _seenPcardPids!=='undefined') _seenPcardPids.clear(); // сброс между партиями, см. render.js/reorderZones
  G={turn:'tea',turnNum:1,phase:'mulligan',mulliganTurn:'tea',sel:null,
    tea:newPlayer('tea'),jeet:newPlayer('jeet'),
    jeetFirstTurn:true,logs:[],previewCard:null,mulligan:{tea:{used:0},jeet:{used:0}},
    mode:'hotseat',humanFaction:null,aiFaction:null};
  if(opts&&opts.mode==='vsai'){
    G.mode='vsai';
    G.humanFaction=opts.humanFaction==='jeet'?'jeet':'tea';
    G.aiFaction=G.humanFaction==='tea'?'jeet':'tea';
  }
  // Чистим DOM поля/руки/персиста СРАЗУ, синхронно с ресетом состояния — иначе между
  // стартом новой партии и появлением экрана муллигана (там есть небольшая задержка,
  // см. setTimeout в startGame()/startGameVsAI()/resetGame()) на долю секунды видны
  // карты из ПРЕДЫДУЩЕЙ партии, которые ещё не были перерисованы через render().
  ['teaField','jeetField','teaHand','jeetHand','teaPersist','jeetPersist'].forEach(id=>{
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
    el.innerHTML=G.logs.map(e=>`<div class="le ${e.cls}">${e.msg}</div>`).join('');
    el.scrollTop=el.scrollHeight;
  }
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
  c.sleeping=false;c.exhausted=false;c.feared=false;c.burning=false;c.atkBonus=0;c.rageBonus=0;c.maxHpBonus=0;c.squadMaxHpBonus=0;c.squadAtkBonus=0;
  const def=DEFS[c.key];if(def){c.hp=def.hp;c.maxHp=def.hp;}
}
