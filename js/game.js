function getTargetableCards(oppField, att){
  const bushido=oppField.find(c=>c.key==='t_nab');
  if(bushido) return [bushido.id];
  const provokes=oppField.filter(c=>c.tags.includes('provoke'));
  const hasPierce=att&&att.tags.includes('pierce');
  if(provokes.length>0&&!hasPierce) return provokes.map(c=>c.id);
  return oppField.map(c=>c.id);
}

function onClick(card,zone){
  const opp=G.turn==='tea'?'jeet':'tea';
  if(G.phase==='burn'){
    if(zone==='hand'&&card.f===G.turn)doBurn(card);
    return;
  }
  if(G.phase==='healTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp){
      const healer=findC(G.sel);
      if(healer){
        const healAmt=getTagVal(healer,'heal')||1;
        card.hp=Math.min(card.maxHp,card.hp+healAmt);
        const debuffs=[];
        if(card.burning){card.burning=false;debuffs.push('fire');}
        if(card.feared){card.feared=false;debuffs.push('fear');}
        lg(`💚 ${healer.name}: +${healAmt} HP to ${card.name}${debuffs.length?', removes '+debuffs.join(' & '):''}.`,'hl');
        healer.exhausted=true;
      }
      G.sel=null;G.phase='action';render();return;
    }
    if(zone==='field'&&card.f===opp){
      const healer=findC(G.sel);
      if(healer){
        const oppField=G[opp].field;
        const targetableHC=getTargetableCards(oppField,healer);
        if(!targetableHC.includes(card.id)){
          const bushidoHC=oppField.find(c=>c.key==='t_nab');
          if(bushidoHC) lg(`Must attack ${bushidoHC.name} (Bushido) first!`,'dmg');
          else lg(`Must attack the Provoke card first!`,'dmg');
          return;
        }
        doAttack(healer,card);
      }
      return;
    }
    if(card.f===G.turn){G.sel=null;G.phase='action';render();}
    return;
  }
  if(G.phase==='action'){
    if(zone==='hand'&&card.f===G.turn){
      G.previewCard=G.previewCard===card.id?null:card.id;
      render();
      return;
    }
    if(zone==='field'&&card.f===G.turn&&!card.sleeping&&!card.exhausted&&!card.feared&&!card.spell&&!card.world&&!card.artifact){
      const isOrb=card.tags.some(t=>t.startsWith('heal:'));
      if(isOrb){
        G.sel=card.id;G.phase='healTarget';
        lg(`${card.name}: click an ALLY (green) to heal, or an ENEMY (red) to attack.`);render();return;
      }
      G.sel=card.id;G.phase='selectTarget';
      lg(`Selected ${card.name} — click enemy to attack, or ⚔ Hit Base.`);render();return;
    }
  }
  if(G.phase==='selectTarget'){
    if(card.f===G.turn){G.sel=null;G.phase='action';render();return;}
    if(zone==='field'&&card.f===opp){
      const att=findC(G.sel);
      if(!att)return;
      const oppField=G[opp].field;
      const targetableClick=getTargetableCards(oppField,att);
      if(!targetableClick.includes(card.id)){
        const bushidoC=oppField.find(c=>c.key==='t_nab');
        if(bushidoC) lg(`Must attack ${bushidoC.name} (Bushido) first!`,'dmg');
        else lg(`Must attack the Provoke card first!`,'dmg');
        return;
      }
      doAttack(att,card);
    }
  }
}

function doPlay(card){
  const cur=G[G.turn];
  if(cur.ess<card.cost){lg(`Need ${card.cost} essence, have ${cur.ess}.`,'dmg');return;}
  cur.ess-=card.cost;
  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  if(card.spell)doSpell(card);
  else if(card.world)doWorld(card);
  else if(card.artifact)doArtifact(card);
  else doCreature(card);
  render();
}

function doCreature(card){
  const cur=G[G.turn];const opp=G[G.turn==='tea'?'jeet':'tea'];
  card.sleeping=!card.tags.includes('vanguard');
  card.exhausted=false;
  cur.field.push(card);
  lg(`▶ ${G.turn.toUpperCase()} plays ${card.name}.`,'imp');
  if(card.key==='t_faeron'){
    lg(`Faeron: 3 dmg to all enemies!`,'dmg');
    [...opp.field].forEach(c=>dmgCard(c,3,G.turn==='tea'?'jeet':'tea'));
  }
  if(card.key==='j_mal'){
    lg(`Maltor: 1 dmg to all enemies!`,'dmg');
    [...G.tea.field].forEach(c=>dmgCard(c,1,'tea'));
  }
  const drawTag=getTagVal(card,'draw');
  if(drawTag)cur.extraDraw+=drawTag;
  if(card.key==='t_tuborg'){
    cur.field.forEach(a=>{if(a.id!==card.id)a.atkBonus=1;});
    lg(`Tuborg: all allies get +1 ATK!`,'imp');
  }
  if(card.tags.includes('vanguard'))lg(`${card.name} has Vanguard!`);
}

function doWorld(card){
  const cur=G[G.turn];
  if(cur.world){cur.grave.push(cur.world);lg(`Replaced ${cur.world.name}.`);}
  cur.world=card;lg(`▶ World: ${card.name} activated.`,'imp');
}

function doArtifact(card){
  const cur=G[G.turn];
  cur.artifacts.push(card);
  lg(`▶ Artifact: ${card.name} placed.`,'imp');
  if(card.key==='t_a1'||card.key==='j_a1')cur.extraDraw+=1;
}

function doSpell(card){
  const cur=G[G.turn];
  lg(`▶ Spell: ${card.name}.`,'imp');
  triggerAbilities(card,'instant');
  cur.grave.push(card);
}

function reviveCard(card,toF){
  const def=DEFS[card.key];
  if(def){card.hp=def.hp;card.maxHp=def.hp;}
  card.sleeping=true;card.exhausted=false;card.feared=false;card.atkBonus=0;
  G[toF].field.push(card);
  lg(`✨ Revived ${card.name} at full HP.`,'hl');
}

function doAttack(att,target){
  const curK=G.turn;const oppK=curK==='tea'?'jeet':'tea';
  const atk=att.atk+att.atkBonus;
  lg(`⚔ ${att.name} attacks ${target.name}!`,'imp');
  dmgCard(target,atk,oppK);
  dmgCard(att,target.atk+target.atkBonus,curK);
  if((att.tags.includes('fear')||att.key==='j_ryv'||att.key==='j_mal')&&target.hp>0){
    target.feared=true;lg(`${target.name} is Feared — skips next turn.`);
  }
  if(hasTag(att,'burn')&&target.hp>0){
    target.burning=true;
    lg(`🔥 ${target.name} is on fire!`,'imp');
  }
  const drawOnAtk=getTagVal(att,'draw');
  if(drawOnAtk&&att.unique){
    const cur=G[curK];
    for(let i=0;i<drawOnAtk;i++)if(cur.deck.length>0)cur.hand.push(cur.deck.shift());
    lg(`${att.name} draws ${drawOnAtk} card(s).`,'imp');
  }
  att.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

function doUmbAsir(){
  const cur=G[G.turn];const oppK=G.turn==='tea'?'jeet':'tea';
  const umb=findC(G.sel);
  if(!umb||(umb.key!=='t_umb_w'&&umb.key!=='t_umb_s'&&umb.key!=='j_umb_w'&&umb.key!=='j_umb_s')){
    lg('Select Umbасir first.','dmg');return;
  }
  const dmgAmt=umb.key.endsWith('_s')?2:1;
  lg(`🌀 ${umb.name} hits ALL enemies for ${dmgAmt} dmg!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK));
  umb.exhausted=true;
  G.sel=null;G.phase='action';
  checkWin();render();
}

function doVardan(){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(!G.sel){lg('No card selected — click Big Vardan first.','dmg');return;}
  const vard=findC(G.sel);
  if(!vard){lg('Could not find selected card.','dmg');return;}
  if(vard.key!=='j_vard'){lg(`${vard.name} is not Big Vardan.`,'dmg');return;}
  if(vard.exhausted){lg('Big Vardan already acted this turn.','dmg');return;}
  lg(`⚡ ${vard.name} — Dark Will: 2 dmg to ALL enemies!`,'imp');
  const targets=[...G[oppK].field];
  if(targets.length===0){lg('No enemies on field to hit.','dmg');}
  targets.forEach(c=>dmgCard(c,2,oppK));
  vard.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

function onBaseClick(faction){
  if(faction===G.turn) return;
  if((G.phase==='selectTarget'||G.phase==='action')&&G.sel&&canAttackBase()){
    tryAttackBase();
  }
  if(G.phase==='healTarget'&&G.sel){
    const att=findC(G.sel);
    if(att) tryAttackBase();
  }
}

function canAttackBase(){
  if(!G.sel) return false;
  const att=findC(G.sel);
  if(!att||att.exhausted||att.sleeping||att.feared) return false;
  const oppK=G.turn==='tea'?'jeet':'tea';
  const opp=G[oppK];
  const bushido=opp.field.find(c=>c.key==='t_nab');
  if(bushido) return false;
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')) return false;
  return true;
}

function tryAttackBase(){
  if(G.phase!=='selectTarget'&&G.phase!=='healTarget'){lg('Select a card to attack with first.');return;}
  const att=findC(G.sel);if(!att)return;
  const oppK=G.turn==='tea'?'jeet':'tea';const opp=G[oppK];
  const atk=att.atk+att.atkBonus;
  const bushido=opp.field.find(c=>c.key==='t_nab');
  if(bushido){lg(`${bushido.name} (Bushido) blocks — must attack it first!`,'dmg');return;}
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')){lg(`${provoke.name} has Provoke — attack it first!`,'dmg');return;}
  lg(`⚔ ${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`,'dmg');
  opp.hp=Math.max(0,opp.hp-atk);
  att.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

function dmgCard(card,dmg,faction){
  if(dmg<=0)return;
  card.hp-=dmg;
  lg(`${card.name} takes ${dmg} → ${card.hp}/${card.maxHp} HP.`,'dmg');
  if(card.hp<=0)killCard(card,faction);
}

function killCard(card,faction){
  G[faction].field=G[faction].field.filter(c=>c.id!==card.id);
  G[faction].grave.push(card);
  lg(`💀 ${card.name} dies.`,'die');
  if(card.key==='t_tuborg'){G[faction].field.forEach(a=>{a.atkBonus=0;});lg('Tuborg died — ATK bonus removed.');}
  if(card.f!==G.turn){
    const reap=G[G.turn].field.find(c=>c.key==='j_reap');
    if(reap){G.jeet.maxHp+=2;G.jeet.hp+=2;lg(`Reaper: Jeet base +2/+2 → ${G.jeet.hp}/${G.jeet.maxHp}`,'hl');}
  }
  const drawTagD=getTagVal(card,'draw');
  if(drawTagD){const f=card.f;G[f].extraDraw=Math.max(0,G[f].extraDraw-drawTagD);}
}

function doBurnCard(card){
  const cur=G[G.turn];
  if(cur.burned){lg('Already burned a card this turn!','dmg');return;}
  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  card.voided=true;
  cur.void.push(card);
  cur.essMax+=1;cur.ess+=1;cur.burned=true;
  lg(`🔥 Burned ${card.name} → essence now ${cur.ess}/${cur.essMax}.`,'imp');
  G.phase='action';render();
}

function doBurn(card){
  const cur=G[G.turn];
  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  card.voided=true;
  cur.void.push(card);
  cur.essMax+=1;cur.ess+=1;cur.burned=true;
  lg(`🔥 Burned ${card.name} → essence now ${cur.ess}/${cur.essMax}.`,'imp');
  G.phase='action';render();
}

function endTurn(){
  G.sel=null;G.phase='action';G.previewCard=null;
  const next=G.turn==='tea'?'jeet':'tea';
  G[G.turn].field.forEach(c=>{c.sleeping=false;c.exhausted=false;c.feared=false;});
  G.turn=next;
  const cur=G[G.turn];
  cur.burned=false;

  if(G.jeetFirstTurn&&G.turn==='jeet'){
    cur.essMax=1;cur.ess=1;G.jeetFirstTurn=false;
  }else{
    cur.essMax+=1;cur.ess=cur.essMax;
  }

  if(cur.world) triggerAbilities(cur.world,'on_turn');
  cur.artifacts.forEach(a=>triggerAbilities(a,'on_turn'));

  const oppKb=G.turn==='tea'?'jeet':'tea';
  [...G[G.turn].field,...G[oppKb].field].forEach(card=>{
    if(card.burning&&!card.spell&&!card.world&&!card.artifact){
      card.hp-=1;
      lg(`🔥 ${card.name} burns for 1 HP → ${card.hp}/${card.maxHp}.`,'dmg');
      if(card.hp<=0){
        const faction=G[G.turn].field.includes(card)?G.turn:oppKb;
        killCard(card,faction);
      }
    }
  });
  checkWin();

  const oppK=G.turn==='tea'?'jeet':'tea';
  cur.field.forEach(c=>{
    if(c.key==='t_aslex'){
      cur.field.forEach(a=>{if(!a.spell&&!a.world&&!a.artifact){a.maxHp+=1;a.hp=Math.min(a.hp+1,a.maxHp);}});
      lg(`Aslex: +1 max HP & HP to all allies.`,'hl');
    }
    if(c.key==='t_tuborg'){cur.field.forEach(a=>{if(a.id!==c.id)a.atkBonus=1;});}
    if(c.key==='j_phleg'){
      const all=[...G[G.turn].grave,...G[oppK].grave].filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided);
      if(all.length>0){
        const r=all[all.length-1];
        G[G.turn].grave=G[G.turn].grave.filter(x=>x.id!==r.id);
        G[oppK].grave=G[oppK].grave.filter(x=>x.id!==r.id);
        r.hp=1;r.sleeping=true;r.exhausted=false;r.feared=false;r.atkBonus=0;
        r.f=G.turn;
        cur.field.push(r);lg(`Phlegmor raises ${r.name} at 1 HP!`,'imp');
      }
    }
  });

  const skipDraw=(G.turn==='jeet'&&G.turnNum===1);
  if(!skipDraw){
    const n=1+cur.extraDraw;
    for(let i=0;i<n;i++)if(cur.deck.length>0)cur.hand.push(cur.deck.shift());
  }

  if(G.turn==='tea')G.turnNum++;
  lg(`─── Turn ${G.turnNum}: ${G.turn.toUpperCase()} · ${cur.ess}/${cur.essMax} Essence ───`,'trn');
  const lp=document.getElementById('logPanel');if(lp)lp.classList.remove('open');
  render();
}

function checkWin(){
  if(G.tea.hp<=0)showWin('jeet');
  if(G.jeet.hp<=0)showWin('tea');
}

function doMulligan(faction){
  const m=G.mulligan[faction];
  const p=G[faction];
  const used=m.used;
  if(used>=3){lg('No more mulligans!','dmg');return;}

  p.hand.forEach(card=>{resetC(card);p.deck.push(card);});
  p.hand=[];
  for(let i=p.deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [p.deck[i],p.deck[j]]=[p.deck[j],p.deck[i]];
  }

  let draw, msg;
  if(used===0){draw=5;msg=`🔀 Mulligan (free): drew ${draw} new cards.`;}
  else if(used===1){draw=4;msg=`🔀 Mulligan (−1): drew ${draw} cards.`;}
  else{draw=3;msg=`🔀 Mulligan (−2): drew ${draw} cards. Last mulligan used.`;}

  for(let i=0;i<draw;i++) if(p.deck.length>0)p.hand.push(p.deck.shift());
  lg(msg,'imp');
  m.used++;
  updateMulliganBtn(faction);
  render();
}

function cancelAction(){G.previewCard=null;clearPreview();G.sel=null;G.phase='action';render();}
function handleGameClick(e){
  if(!e.target.closest('.card')&&G.previewCard){
    G.previewCard=null;
    clearPreview();
    render();
  }
}
function clearPreview(){
  document.querySelectorAll('.hand .card.previewed').forEach(el=>el.classList.remove('previewed'));
}
