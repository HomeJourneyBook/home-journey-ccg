function render(){
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
    document.getElementById(f+'DeckCount').textContent=p.deck.length;
    const gc=document.getElementById(f+'GraveCount');
    if(gc)gc.textContent=p.grave.length;
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
}

function mkSmallEl(card){
  const d=document.createElement('div');
  d.className=`card-small ${card.f}-card`;
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(card.feared)d.classList.add('feared');
  if(card.burning)d.classList.add('burning');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='selectTarget'&&card.f!==G.turn){
    const oppField=G[card.f].field;
    const attS=G.sel?findC(G.sel):null;
    const targetableS=getTargetableCards(oppField,attS);
    if(targetableS.includes(card.id))d.classList.add('targetable');
  }
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
  d.innerHTML=`
    <div class="card-small-cost">${card.cost}</div>
    ${card.burning?'<div class="card-small-burning">🔥</div>':''}
    <div class="card-small-art">${card.art}</div>
    <div class="card-small-name">${card.name}</div>
    ${!isSW?`<div class="card-small-stats"><span class="card-small-hp">❤${card.hp}</span><span class="card-small-atk">⚔${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>`:''}`;
  if(card.id===G.sel&&card.f===G.turn&&!card.exhausted&&!card.sleeping&&!card.feared){
    const isUmb=hasTag(card,'aoe')&&!card.unique;
    const isVard=hasTag(card,'aoe')&&card.unique;
    if(isUmb||isVard){
      const pop=document.createElement('div');
      pop.className='field-ability-popup';
      if(isUmb){
        const btn=document.createElement('button');
        btn.className='fab-btn umbasir';
        btn.textContent='🌀 Hit All';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doUmbAsir();};
        pop.appendChild(btn);
      }
      if(isVard){
        const btn=document.createElement('button');
        btn.className='fab-btn vardan';
        btn.textContent='⚡ Hit All';
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
  d.style.width='118px';
  d.style.minWidth='118px';
  d.style.maxWidth='118px';
  d.style.flexShrink='0';
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.burning)d.classList.add('burning');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(card.feared)d.classList.add('feared');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&zone==='field'&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
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
  const tags=card.tags.map(t=>`<span class="tag ${t}">${t.toUpperCase()}</span>`).join('');
  d.innerHTML=`
    <div class="card-cost">${card.cost}</div>
    ${card.burning?'<div class="burning-icon">🔥</div>':''}
    <div class="card-art">${card.art}</div>
    <div class="card-name">${card.name}</div>
    ${!isSW?`<div class="card-stats"><span class="card-hp">❤${card.hp}/${card.maxHp}</span><span class="card-atk">⚔${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>`:''}
    <div class="card-ability">${card.ab}</div>
    <div class="card-tags">${tags}</div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const popup=document.createElement('div');
    popup.className='card-actions-popup';
    const cur=G[G.turn];
    if(cur.ess>=card.cost){
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.textContent='▶ Play';
      playBtn.onclick=(e)=>{e.stopPropagation();G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
    }
    if(!cur.burned){
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.textContent='🔥 Burn';
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
  el.innerHTML='';
  cards.forEach(c=>{
    if(zone==='field') el.appendChild(mkSmallEl(c));
    else el.appendChild(mkEl(c,zone));
  });
}

function rHiddenHand(id,cards,faction){
  const el=document.getElementById(id);
  el.innerHTML='';
  el.className='hand-mini';
  const sym=faction==='tea'?'🍵':'🖤';
  cards.forEach(()=>{
    const d=document.createElement('div');
    d.className=`card-mini ${faction}-mini`;
    d.innerHTML=`<span>${sym}</span>`;
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
    // Active artifacts (sacrifice) get click handler
    if(hasTag(a,'sacrifice')&&a.f===G.turn&&G.phase==='action'){
      d.style.cursor='pointer';
      d.style.border='1px solid #b44fd4';
      d.addEventListener('click',(e)=>{
        e.stopPropagation();
        G.phase='sacrificeTarget';
        G.sel=a.id;
        lg(`🗿 ${a.name}: select a creature to sacrifice.`,'hint');
        render();
      });
    } else if(hasTag(a,'sacrifice')&&G.phase==='sacrificeTarget'){
      d.style.cursor='pointer';
      d.style.border='1px solid #b44fd4';
      d.style.boxShadow='0 0 6px #b44fd4';
      d.addEventListener('click',(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();});
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
      <span class="player-name ${oppK}">${oppK==='jeet'?'⬡ JEET CORE':'⬡ TAVERN'}</span>
      <span class="stat">${oppK==='jeet'?'🖤':'🤍'} <span class="stat-val hp-val" id="${oppK}Hp">${oppP.hp}</span>/20</span>
      <span class="stat">💠 <span class="ess-val" id="${oppK}Ess">${oppP.ess}</span>/<span id="${oppK}EssMax">${oppP.essMax}</span></span>
      <span class="stat" style="font-size:8px;color:#555">🃏<span id="${oppK}DeckCount">${oppP.deck.length}</span> ☠<span id="${oppK}GraveCount">${oppP.grave.length}</span></span>`;
    oppStats.onclick=()=>onBaseClick(oppK);
  }
  if(playerStats){
    playerStats.className='stats-bar '+(playerK==='jeet'?'jeet':'tea');
    playerStats.innerHTML=`
      <span class="player-name ${playerK}">${playerK==='jeet'?'⬡ JEET CORE':'⬡ TAVERN'}</span>
      <span class="stat">${playerK==='jeet'?'🖤':'🤍'} <span class="stat-val hp-val" id="${playerK}Hp">${playerP.hp}</span>/20</span>
      <span class="stat">💠 <span class="ess-val" id="${playerK}Ess">${playerP.ess}</span>/<span id="${playerK}EssMax">${playerP.essMax}</span></span>
      <span class="stat" style="font-size:8px;color:#555">🃏<span id="${playerK}DeckCount">${playerP.deck.length}</span> ☠<span id="${playerK}GraveCount">${playerP.grave.length}</span></span>`;
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
      const cardW=118;
      const total=cards.length;
      let margin=0;
      if(total>1){
        margin=-Math.ceil((cardW*total - containerW)/(total-1));
        margin=Math.max(margin, -Math.floor(cardW*0.9));
        if(margin>-8) margin=-8;
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
      const cardW=52;
      const total=mini.length;
      let margin=-8;
      if(total>1){
        const needed=cardW*total;
        if(needed>containerW){
          margin=-Math.floor((needed-containerW)/(total-1))-1;
          margin=Math.max(margin,-cardW+12);
        }
      }
      mini.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        card.style.zIndex=String(i+1);
      });
    }
  });
}
