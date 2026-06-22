let G={};

function newPlayer(f){
  const d=buildDeck(f);
  return{hp:20,maxHp:20,ess:1,essMax:1,
    hand:d.splice(0,5).map(k=>mkCard(k)),
    field:[],deck:d.map(k=>mkCard(k)),grave:[],void:[],
    world:null,artifacts:[],extraDraw:0,burned:false};
}

function initState(){
  UID=0;
  G={turn:'tea',turnNum:1,phase:'action',sel:null,
    tea:newPlayer('tea'),jeet:newPlayer('jeet'),
    jeetFirstTurn:true,logs:[],previewCard:null,mulligan:{tea:{used:0},jeet:{used:0}}};
}

function lg(msg,cls=''){
  G.logs.push({msg,cls});
  const el=document.getElementById('log');
  el.innerHTML=G.logs.slice(-50).map(e=>`<div class="le ${e.cls}">${e.msg}</div>`).join('');
  el.scrollTop=el.scrollHeight;
}

function findC(id){
  for(const f of['tea','jeet'])for(const arr of[G[f].hand,G[f].field,G[f].grave]){
    const c=arr.find(x=>x.id===id);if(c)return c;
  }return null;
}

function resetC(c){
  c.sleeping=false;c.exhausted=false;c.feared=false;c.atkBonus=0;
  const def=DEFS[c.key];if(def){c.hp=def.hp;c.maxHp=def.hp;}
}
