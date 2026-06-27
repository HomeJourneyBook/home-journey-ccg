function updateTurnColors(){
  if(!G) return;
  const isTea=G.turn==='tea';
  const green='#2d8b3a', greenDim='#1b641b55';
  const pink='#d83c88',  pinkDim='#d83c8855';
  const set=(id,col)=>{const el=document.getElementById(id);if(el)el.style.borderColor=col;};
  // Tea turn: bottom=green bright, top=pink dim
  // Jeet turn: bottom=pink bright, top=green dim
  const bottomColor = isTea ? green : pink;
  const bottomDim   = isTea ? greenDim : pinkDim;
  const topColor    = isTea ? pink : green;
  const topDim      = isTea ? pinkDim : greenDim;
  set('playerFieldZone', bottomColor);
  set('playerStats',     bottomColor);
  set('oppFieldZone',    topDim);
  set('oppStats',        topDim);
  set('oppHandZone',     topDim);
}

function render(){
  updateTurnColors();
  const cur=G[G.turn];
  document.getElementById('turnNum').textContent=G.turnNum;
  document.getElementById('turnPlayer').textContent=G.turn.toUpperCase();
  ['tea','jeet'].forEach(f=>{
    const p=G[f];
    document.getElementById(f+'Hp').textContent=p.hp;
    document.getElementById(f+'Ess').textContent=p.ess;
    document.getElementById(f+'EssMax').textContent=p.essMax;
    const hc=document.getElementById(f+'HandCount');
    if(hc)hc.textContent=p.hand.length;
    // Stats bar counters
    const dc=document.getElementById(f+'DeckCountStat');
    if(dc)dc.textContent=p.deck.length;
    const gc=document.getElementById(f+'GraveCountStat');
    if(gc)gc.textContent=p.grave.length;
    // Bottom bar badges
    const graveBadge=document.getElementById(f+'GraveBadge');
    if(graveBadge)graveBadge.textContent=p.grave.length;
    const deckBadge=document.getElementById(f+'DeckBadge');
    if(deckBadge)deckBadge.textContent=p.deck.length;
  });
  rZone('teaField',G.tea.field,'field');
  rZone('jeetField',G.jeet.field,'field');
  if(G.turn==='tea'){
    const th=document.getElementById('teaHand');
    if(th) th.className='hand';
    rZone('teaHand',G.tea.hand,'hand');
    rHiddenHand('jeetHand',G.jeet.hand,'jeet');
  } else {
    const jh=document.getElementById('jeetHand');
    if(jh) jh.className='hand';
    rZone('jeetHand',G.jeet.hand,'hand');
    rHiddenHand('teaHand',G.tea.hand,'tea');
  }
  rPersist('teaPersist',G.tea);
  reorderZones();
  rPersist('jeetPersist',G.jeet);
  ['teaHand','jeetHand'].forEach(hid=>{
    const hel=document.getElementById(hid);
    if(hel)hel.style.zIndex=G.previewCard?'500':'50';
  });
  requestAnimationFrame(()=>{ adjustHandOverlap(); requestAnimationFrame(adjustHandOverlap); });

  const sfx=G.turn==='tea'?'T':'J';
  updateMulliganBtn(G.turn);

  const inactSB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'SidebarBtns');
  if(inactSB)inactSB.style.display='none';
  const actSB=document.getElementById(G.turn+'SidebarBtns');
  if(actSB)actSB.style.display='flex';

  const inactBB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'BottomBar');
  if(inactBB)inactBB.style.display='none';
  const actBB=document.getElementById(G.turn+'BottomBar');
  if(actBB)actBB.style.display='flex';

  const oppKey=G.turn==='tea'?'jeet':'tea';
  const oppZoneEl=document.getElementById('oppStats');
  if(oppZoneEl){
    const canHitBase=(G.phase==='selectTarget'||G.phase==='healTarget')&&G.sel&&canAttackBase();
    oppZoneEl.classList.toggle('base-targetable', canHitBase);
  }
  const playerStatsEl=document.getElementById('playerStats');
  if(playerStatsEl) playerStatsEl.classList.remove('base-targetable');

  const hitEl=document.getElementById('hitBase'+sfx);if(hitEl)hitEl.style.display='none';

  const hints={
    action:'',
    selectTarget:'Select enemy or tap their base.',
    burn:'Select card to burn.',
    healTarget:'Select ally to heal or enemy to attack.',
  };
  const hintEl2=document.getElementById('hint'+sfx+'2');
  if(hintEl2)hintEl2.textContent=hints[G.phase]||'';
  if(typeof _applyPendingFlash==='function') _applyPendingFlash();
}

function getTypeDotImg(card){
  if(card.world) return 'img/type_world.png';
  if(card.unique) return 'img/type_unique.png';
  if(card.artifact) return 'img/type_artifact.png';
  if(card.spell) return 'img/type_spell.png';
  return 'img/type_creature.png';
}

function mkSmallEl(card){
  const d=document.createElement('div');
  d.className=`card-small ${card.f}-card`;
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='Invis';
    d.appendChild(inv);
  }
  if(card.feared)d.classList.add('feared');
  if(card.burning)d.classList.add('burning');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='selectTarget'&&card.f!==G.turn){
    const oppField=G[card.f].field;
    const attS=G.sel?findC(G.sel):null;
    const targetableS=getTargetableCards(oppField,attS);
    if(targetableS.includes(card.id))d.classList.add('targetable');
  }
  if(G.phase==='shardTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='healTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp)d.classList.add('healable');
  if(G.phase==='healTarget'&&card.f!==G.turn){
    const oppField2=G[card.f].field;
    const attH=G.sel?findC(G.sel):null;
    const targetableH=getTargetableCards(oppField2,attH);
    if(targetableH.includes(card.id))d.classList.add('targetable');
  }
  if(G.phase==='vardanPick'&&card.f!==G.turn&&!card.sleeping&&!card.exhausted&&!card.feared)d.classList.add('targetable');
  if(G.phase==='vardanAttack'&&card.f===G.turn)d.classList.add('targetable');
  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
};
const tagIcons=(card.tags||[])
  .map(t=>t.split(':')[0])
  .filter(t=>TAG_ICONS[t])
  .map(t=>`<div class="card-tag-icon">${TAG_ICONS[t]}</div>`)
  .join('');
  d.innerHTML=`
    <div class="card-small-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    ${card.burning?'<div class="card-small-burning"><img src="img/ef_burn.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.feared?'<div class="card-small-feared"><img src="img/ico_fear.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    <div class="card-small-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    <div class="card-small-name-box"><div class="card-small-name">${card.name}</div></div>
${!isSW?`<div class="card-small-stats">
  <div class="card-small-hp-box"><span class="card-small-hp">${card.hp}</span></div>
  <img src="img/chel.png" class="card-stats-icon">
  <div class="card-small-atk-box"><span class="card-small-atk">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
</div>`
:`<div class="card-small-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}`;
  if(card.id===G.sel&&card.f===G.turn&&!card.exhausted&&!card.sleeping&&!card.feared){
    const isUmb=hasTag(card,'aoe')&&!card.unique;
    const isVard=hasTag(card,'aoe')&&card.unique;
    if(isUmb||isVard){
      const pop=document.createElement('div');
      pop.className='field-ability-popup';
      if(isUmb){
        const btn=document.createElement('button');
        btn.className='fab-btn umbasir';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doUmbAsir();};
        pop.appendChild(btn);
      }
      if(isVard){
        const btn=document.createElement('button');
        btn.className='fab-btn vardan';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doVardan();};
        pop.appendChild(btn);
      }
      d.appendChild(pop);
    }
  }
  d.addEventListener('click',()=>onClick(card,'field'));
  return d;
}

function mkEl(card,zone){
  const d=document.createElement('div');
  d.className=`card ${card.f}-card`;
  d.style.flexShrink='0';
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.burning)d.classList.add('burning');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='👻 Invis';
    d.appendChild(inv);
  }
  if(card.feared)d.classList.add('feared');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&zone==='field'&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='shardTarget'&&card.f!==G.turn&&zone==='field'&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='selectTarget'&&card.f!==G.turn&&zone==='field'){
    const oppField=G[card.f].field;
    const attE=G.sel?findC(G.sel):null;
    const targetableE=getTargetableCards(oppField,attE);
    if(targetableE.includes(card.id))d.classList.add('targetable');
  }
  if(G.phase==='healTarget'&&card.f===G.turn&&zone==='field'&&!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp)d.classList.add('healable');
  if(G.phase==='healTarget'&&card.f!==G.turn&&zone==='field'){
    const oppFieldH=G[card.f].field;
    const attH=G.sel?findC(G.sel):null;
    const targetableH2=getTargetableCards(oppFieldH,attH);
    if(targetableH2.includes(card.id))d.classList.add('targetable');
  }

  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
};
const tagIcons = (card.tags||[])
  .map(t=>t.split(':')[0])
  .filter(t=>TAG_ICONS[t])
  .map(t=>`<div class="card-tag-icon">${TAG_ICONS[t]}</div>`)
  .join('');
  if(card.world){
  d.classList.add('world-card');
  if(card.img){
    d.classList.add('world-img-' + card.img.replace('.','_'));
  }
  d.innerHTML=`
    <div class="card-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const popup=document.createElement('div');
    popup.className='card-actions-popup';
    const cur=G[G.turn];
    if(cur.ess>=card.cost){
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
    }
    if(!cur.burned){
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();G.previewCard=null;doBurnCard(card);};
      popup.appendChild(burnBtn);
    }
    d.appendChild(popup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  return d;
}
  d.innerHTML=`
    <div class="card-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${card.burning?'<div class="burning-icon"></div>':''}
    <div class="card-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    ${!isSW?`<div class="card-stats">
      <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${card.maxHp}</span></div>
        <img src="img/chel.png" class="card-stats-icon">
      <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
    </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}
    <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const popup=document.createElement('div');
    popup.className='card-actions-popup';
    const cur=G[G.turn];
    if(cur.ess>=card.cost){
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
    }
    if(!cur.burned){
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();G.previewCard=null;doBurnCard(card);};
      popup.appendChild(burnBtn);
    }
    d.appendChild(popup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  return d;
}

function rZone(id,cards,zone){
  const el=document.getElementById(id);
  if(zone==='field'){
    const dying=[];
    el.querySelectorAll('.card-small').forEach(cardEl=>{
      const stillExists=cards.find(c=>String(c.id)===cardEl.dataset.id);
      if(!stillExists) dying.push(cardEl);
    });
    dying.forEach(cardEl=>{
      cardEl.classList.add('dying');
      cardEl.style.pointerEvents='none';
    });
    if(dying.length>0){
      setTimeout(()=>{
        dying.forEach(cardEl=>{if(cardEl.parentElement)cardEl.remove();});
      }, 400);
      // Build map of live (non-dying) existing elements
      const existingMap={};
      el.querySelectorAll('.card-small:not(.dying)').forEach(cardEl=>{
        existingMap[cardEl.dataset.id]=cardEl;
      });
      // Update live cards in-place (fixes targetable staying lit), add new ones with entering
      cards.forEach(c=>{
        if(existingMap[String(c.id)]){
          existingMap[String(c.id)].replaceWith(mkSmallEl(c));
        } else {
          const cardEl=mkSmallEl(c);
          cardEl.classList.add('entering');
          el.appendChild(cardEl);
        }
      });
      return;
    }
  }
  const existingIds=new Set([...el.querySelectorAll('.card-small')].map(e=>e.dataset.id));
  el.innerHTML='';
  cards.forEach(c=>{
    if(zone==='field'){
      const cardEl=mkSmallEl(c);
      if(!existingIds.has(String(c.id))) cardEl.classList.add('entering');
      el.appendChild(cardEl);
    } else {
      el.appendChild(mkEl(c,zone));
    }
  });
}

function rHiddenHand(id,cards,faction){
  const el=document.getElementById(id);
  el.innerHTML='';
  el.className='hand-mini';
  cards.forEach(()=>{
    const d=document.createElement('div');
    d.className=`card-mini ${faction}-mini`;
    d.style.backgroundImage="url('img/runaha.png')";
    d.style.backgroundSize='cover';
    d.style.backgroundPosition='bottom';
    d.innerHTML='';
    el.appendChild(d);
  });
}

function rPersist(id,player){
  const el=document.getElementById(id);
  el.innerHTML='';
  const cls=player===G.tea?'tcp':'jcp';
  if(player.world){
    const d=document.createElement('div');
    d.className=`pcard ${cls}`;
    d.textContent=`${player.world.art} ${player.world.name}`;
    d.title=player.world.ab;
    el.appendChild(d);
  }
  player.artifacts.forEach(a=>{
    const d=document.createElement('div');
    d.className=`pcard ${cls}`;
    d.textContent=`${a.art} ${a.name}`;
    d.title=a.ab;
    // Shard damage logic
    if(hasTag(a,'shard')&&a.f===G.turn){
      if(a.exhausted||a.sleeping){
        d.style.opacity='0.5';
      } else if(G.phase==='shardTarget'){
        // Active and waiting for target
        d.classList.add('pcard-active');
        d.style.border='2px solid #e05050';
        d.style.boxShadow='0 0 8px #e05050';
        d.style.borderRadius='6px';
        d.addEventListener('click',(e)=>{e.stopPropagation();doShard(a);});
      } else if(G.phase==='action'){
        // Ready - hover/press via CSS class only
        d.classList.add('pcard-active');
        d.addEventListener('click',(e)=>{e.stopPropagation();doShard(a);});
      }
    }
    // Altar sacrifice logic
    if(hasTag(a,'sacrifice')&&a.f===G.turn){
      if(a.exhausted||a.sleeping){
        // Inactive - grey out
        d.style.opacity='0.5';
      } else if(G.phase==='sacrificeTarget'){
        // Active and waiting for target - pulse border, click cancels
        d.classList.add('pcard-active');
        d.style.border='2px solid #b44fd4';
        d.style.boxShadow='0 0 8px #b44fd4';
        d.style.borderRadius='6px';
        d.addEventListener('click',(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();});
      } else if(G.phase==='action'){
        // Ready - hover/press via CSS class, no border in idle
        d.classList.add('pcard-active');
        d.addEventListener('click',(e)=>{
          e.stopPropagation();
          G.phase='sacrificeTarget';
          G.sel=a.id;
          lg('Altar: select a creature to sacrifice.','hint');
          render();
        });
      }
    }
    el.appendChild(d);
  });
  if(!player.world&&player.artifacts.length===0){
    const d=document.createElement('div');
    d.className='empty-persist';
    d.textContent='none';
    el.appendChild(d);
  }
}

function reorderZones(){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const playerK=G.turn;
  const oppP=G[oppK];
  const playerP=G[playerK];

  const oppStats=document.getElementById('oppStats');
  const playerStats=document.getElementById('playerStats');
  if(oppStats){
    oppStats.className='stats-bar '+(oppK==='jeet'?'jeet':'tea');
    oppStats.innerHTML=`
  <span class="stat"><img src="./img/hp_${oppK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${oppK}Hp">${oppP.hp}</span></span>
  <span class="player-name ${oppK}">${oppK==='jeet'?'JEET CORE':'TAVERN'}</span>
  <span class="stat"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${oppK}Ess">${oppP.ess}</span>/<span id="${oppK}EssMax">${oppP.essMax}</span></span>`;
    oppStats.onclick=()=>onBaseClick(oppK);
  }
  if(playerStats){
    playerStats.className='stats-bar '+(playerK==='jeet'?'jeet':'tea');
    playerStats.innerHTML=`
  <span class="stat"><img src="./img/hp_${playerK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${playerK}Hp">${playerP.hp}</span></span>
  <span class="player-name ${playerK}">${playerK==='jeet'?'JEET CORE':'TAVERN'}</span>
  <span class="stat"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${playerK}Ess">${playerP.ess}</span>/<span id="${playerK}EssMax">${playerP.essMax}</span></span>`;
    playerStats.onclick=()=>onBaseClick(playerK);
  }

  const oppFieldZone=document.getElementById('oppFieldZone');
  const playerFieldZone=document.getElementById('playerFieldZone');
  const jeetField=document.getElementById('jeetField');
  const jeetPersist=document.getElementById('jeetPersist');
  const teaField=document.getElementById('teaField');
  const teaPersist=document.getElementById('teaPersist');

  if(oppFieldZone&&playerFieldZone){
    if(oppK==='jeet'){
      if(jeetField&&jeetField.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetPersist);
      if(teaField&&teaField.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaPersist);
    } else {
      if(teaField&&teaField.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaPersist);
      if(jeetField&&jeetField.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetPersist);
    }
  }

  const oppHandZone=document.getElementById('oppHandZone');
  const playerHandZone=document.getElementById('playerHandZone');
  const jeetHand=document.getElementById('jeetHand');
  const teaHand=document.getElementById('teaHand');
  if(oppHandZone&&playerHandZone){
    if(oppK==='jeet'){
      if(jeetHand&&jeetHand.parentElement!==oppHandZone) oppHandZone.appendChild(jeetHand);
      if(teaHand&&teaHand.parentElement!==playerHandZone) playerHandZone.appendChild(teaHand);
    } else {
      if(teaHand&&teaHand.parentElement!==oppHandZone) oppHandZone.appendChild(teaHand);
      if(jeetHand&&jeetHand.parentElement!==playerHandZone) playerHandZone.appendChild(jeetHand);
    }
  }

  const teaBB=document.getElementById('teaBottomBar');
  const jeetBB=document.getElementById('jeetBottomBar');
  if(teaBB) teaBB.style.display=G.turn==='tea'?'flex':'none';
  if(jeetBB) jeetBB.style.display=G.turn==='jeet'?'flex':'none';
}

function adjustHandOverlap(){
  ['teaHand','jeetHand'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const wrap=el.closest('.player-hand-wrap');
    let containerW=wrap?wrap.getBoundingClientRect().width:el.getBoundingClientRect().width;
    containerW=Math.floor(containerW)-12;
    if(containerW<=20) containerW=window.innerWidth-90-24;
    if(containerW<=20)return;

    const cards=el.querySelectorAll('.card');
    if(cards.length>0){
      const cardW=cards[0].getBoundingClientRect().width||parseFloat(getComputedStyle(cards[0]).width)||118;
      const total=cards.length;
      let margin=0;
      if(total>1){
        const totalW=cardW*total + (total-1)*8;
        if(totalW>containerW){
          margin=-Math.ceil((totalW-containerW)/(total-1));
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      cards.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        if(!G.previewCard||card.dataset.id!==G.previewCard){
          card.style.zIndex=String(i+1);
        } else {
          card.style.zIndex='';
        }
        card.style.flexShrink='0';
      });
    }

    const mini=el.querySelectorAll('.card-mini');
    if(mini.length>0){
      const cardW=mini[0].getBoundingClientRect().width||parseFloat(getComputedStyle(mini[0]).width)||36;
      const total=mini.length;
      let margin=-8;
      if(total>1){
        const needed=cardW*total;
        if(needed>containerW){
          margin=-Math.floor((needed-containerW)/(total-1))-1;
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      mini.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        card.style.zIndex=String(i+1);
      });
    }
  });
}
