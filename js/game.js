function getTargetableCards(oppField, att){
  const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return [bushido.id];
  const visible=oppField.filter(c=>!hasTag(c,'invisible')||oppField.length===1);
  const provokes=visible.filter(c=>c.tags.includes('provoke'));
  const hasPierce=att&&(att.tags.includes('pierce')||(att.squadParam&&att.squadParam.pierce));
  if(provokes.length>0&&!hasPierce) return provokes.map(c=>c.id);
  return visible.map(c=>c.id);
}

function onClick(card,zone){
  const opp=G.turn==='tea'?'jeet':'tea';
  if(G.phase==='burn'){
    if(zone==='hand'&&card.f===G.turn)doBurnCard(card);
    return;
  }
  if(G.phase==='healTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp){
      const healer=findC(G.sel);
      if(healer){
        const healAmt=(healer.squadParam&&healer.squadParam.heal)||getTagVal(healer,'heal')||1;
        card.hp=Math.min(card.maxHp,card.hp+healAmt);
        const healedId=card.id;
        setTimeout(()=>showFloat(healedId, `+${healAmt}`, 'heal'), 50);
        const debuffs=[];
        if(card.burning){card.burning=false;debuffs.push('fire');}
        if(card.feared){card.feared=false;debuffs.push('fear');}
        lg(`${healer.name}: +${healAmt} HP to ${card.name}${debuffs.length?', removes '+debuffs.join(' & '):''}.`,'hl');
        healer.exhausted=true;
      }
      G.sel=null;G.phase='action';
      render();
      activateCard(healer.id);
      return;
    }
    if(zone==='field'&&card.f===opp){
      const healer=findC(G.sel);
      if(healer){
        const oppField=G[opp].field;
        const targetable=getTargetableCards(oppField,healer);
        if(!targetable.includes(card.id)){
          const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
          lg(bushido?`Must attack ${bushido.name} (Bushido) first!`:`Must attack the Provoke card first!`,'hint');
          return;
        }
        doAttack(healer,card);
      }
      return;
    }
    if(card.f===G.turn){G.sel=null;G.phase='action';render();}
    return;
  }
  if(G.phase==='shardTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      doShardTarget(card);return;
    }
    G.phase='action';G.sel=null;render();return; // cancel
  }
  if(G.phase==='sacrificeTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSacrifice_target(card);return;
    }
    G.phase='action';G.sel=null;render();return; // cancel on any other click
  }
  if(G.phase==='action'){
    if(zone==='hand'&&card.f===G.turn){
      G.previewCard=G.previewCard===card.id?null:card.id;
      render();return;
    }
    if(zone==='field'&&card.f===G.turn&&card.artifact&&hasTag(card,'sacrifice')&&!card.sleeping&&!card.exhausted){
      G.phase='sacrificeTarget';
      lg(`${card.name}: select a creature to sacrifice.`,'hint');
      render();return;
    }
    if(zone==='field'&&card.f===G.turn&&!card.sleeping&&!card.exhausted&&!card.feared&&!card.spell&&!card.world&&!card.artifact){
      const isHealer=card.tags.some(t=>t.startsWith('heal:'));
      if(isHealer){
        G.sel=card.id;G.phase='healTarget';
        lg(`${card.name}: click an ALLY to heal, or an ENEMY to attack.`,'hint');
        render();return;
      }
      G.sel=card.id;G.phase='selectTarget';
      lg(`Selected ${card.name} — click enemy to attack, or tap base.`,'hint');
      render();return;
    }
  }
  if(G.phase==='selectTarget'){
    if(card.f===G.turn){G.sel=null;G.phase='action';render();return;}
    if(zone==='field'&&card.f===opp){
      const att=findC(G.sel);
      if(!att)return;
      const oppField=G[opp].field;
      const targetable=getTargetableCards(oppField,att);
      if(!targetable.includes(card.id)){
        const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
        if(bushido) lg(`Must attack ${bushido.name} (Bushido) first!`,'hint');
        else if(hasTag(card,'invisible')) lg(`${card.name} is invisible — pick another target.`,'hint');
        else lg(`Must attack the Provoke card first!`,'hint');
        return;
      }
      doAttack(att,card);
    }
  }
}

function doPlay(card){
  const cur=G[G.turn];
  if(cur.ess<card.cost){lg(`Not enough essence — need ${card.cost}, have ${cur.ess}.`,'hint');return;}
  cur.ess-=card.cost;
  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  if(card.spell)doSpell(card);
  else if(card.world)doWorld(card);
  else if(card.artifact)doArtifact(card);
  else doCreature(card);
  render();
}

function doCreature(card){
  const cur=G[G.turn];
  card.sleeping=!card.tags.includes('vanguard');
  card.exhausted=false;
  cur.field.push(card);
  lg(`${G.turn.toUpperCase()} plays ${card.name}.`,'imp');

  G[G.turn].field.forEach(c=>{
    if(c.id!==card.id) triggerAbilities(c,'on_play_creature');
  });
  triggerAbilities(card,'on_play_creature');
  triggerAbilities(card,'on_enter');

  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;
  if(hasTag(card,'aura:atk')) cur._auraAtkLog=card.id;
  if(hasTag(card,'aura:maxhp')) cur._auraMaxLog=card.id;
  if(cur.world&&hasTag(cur.world,'world_maxhp')&&!card.worldMaxHpSet&&!card.spell&&!card.world&&!card.artifact){
    const val=getTagVal(cur.world,'world_maxhp')||1;
    const wasFull=card.hp===card.maxHp;
    card.maxHp+=val;
    if(wasFull) card.hp=card.maxHp;
    card.worldMaxHpBonus=(card.worldMaxHpBonus||0)+val;
    card.worldMaxHpSet=true;
  }
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
}

function doWorld(card){
  const cur=G[G.turn];
  if(cur.world){
    const oldDraw=getTagVal(cur.world,'draw');
  if(oldDraw) cur.extraDraw=Math.max(0,cur.extraDraw-oldDraw);
    cur.world.voided=true;
    cur.void.push(cur.world); 
    lg(`Replaced ${cur.world.name}.`);
  if(hasTag(cur.world,'aura:atk')||hasTag(cur.world,'aura:maxhp')) 
    applyAuras(G.turn);
  }
  cur.world=card;
  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;
  if(hasTag(card,'aura:atk')){
    G[G.turn]._auraAtkLog=card.id;
  }
  if(hasTag(card,'aura:maxhp')){
    G[G.turn]._auraMaxLog=card.id;
  }
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  lg(`World: ${card.name} landed.`,'imp');
}

function doArtifact(card){
  const cur=G[G.turn];
  card.sleeping=true; 
  cur.artifacts.push(card);
  lg(`Artifact: ${card.name} placed.`,'imp');
  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;
}

function doSpell(card){
  const cur=G[G.turn];
  lg(`Spell: ${card.name}.`,'imp');
  triggerAbilities(card,'instant');
  card.voided=true;
  cur.void.push(card); 
}

function reviveCard(card,toF){
  const def=DEFS[card.key];
  if(def){card.hp=def.hp;card.maxHp=def.hp;}
  card.sleeping=true;card.exhausted=false;card.feared=false;card.burning=false;card.atkBonus=0;card.rageBonus=0;card.maxHpBonus=0;card.baseMaxHp=null;card.worldMaxHpBonus=0;card.worldMaxHpSet=false;card.squadParam=null;card.squadAtkBonus=0;card.squadMaxHpBonus=0;
  card.f=toF;
  G[toF].field.push(card); 
  lg(`Revived ${card.name} at full HP.`,'hl');

  if(hasTag(card,'aura:atk')) G[toF]._auraAtkLog=card.id;
  if(hasTag(card,'aura:maxhp')) G[toF]._auraMaxLog=card.id;
  applyAuras(toF);
  checkSquadBonuses(toF); 
}

function doAttack(att,target){
  const curK=G.turn;
  const oppK=curK==='tea'?'jeet':'tea';
  const atk=att.atk+(att.atkBonus||0)+(att.rageBonus||0)+(att.squadAtkBonus||0);

  lg(`${att.name} attacks ${target.name}!`,'imp');
  dmgCard(target,atk,oppK);
  if(!hasTag(att,'invisible') && !target.feared)
  dmgCard(att,
    target.atk +
    (target.atkBonus || 0) +
    (target.rageBonus || 0) +
    (target.squadAtkBonus || 0),
    curK
  );
triggerAbilities(att,'on_attack',{target});
  
  att.exhausted=true;
  G.sel=null;
  G.phase='action';
  checkWin();
  render();
  activateCard(att.id);
}

function doUmbAsir(){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const umb=findC(G.sel);
  if(!umb||!hasTag(umb,'aoe')){lg('Select an AOE card first.','hint');return;}
  if(umb.exhausted){lg(`${umb.name} already acted this turn.`,'dmg');return;}
  const dmgAmt=(umb.squadParam&&umb.squadParam.aoe)||getTagVal(umb,'aoe')||1;
  lg(`${umb.name} hits ALL enemies for ${dmgAmt} dmg!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK));
  umb.exhausted=true;
  G.sel=null;G.phase='action';
  checkWin();render();
  activateCard(umb.id);
}

function doVardan(){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(!G.sel){lg('No card selected — select an AOE card first.','hint');return;}
  const vard=findC(G.sel);
  if(!vard||!hasTag(vard,'aoe')){lg('Select an AOE card first.','hint');return;}
  if(vard.exhausted){lg(`${vard.name} already acted this turn.`,'dmg');return;}
  const dmgAmt=getTagVal(vard,'aoe')||2;
  lg(`⚡ ${vard.name} — Dark Will: ${dmgAmt} dmg to ALL enemies!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK));
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
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return false;
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')&&!(att.squadParam&&att.squadParam.pierce)) return false;
  return true;
}

function tryAttackBase(){
  if(G.phase!=='selectTarget'&&G.phase!=='healTarget'){lg('Select a card to attack with first.','hint');return;}
  const att=findC(G.sel);if(!att)return;
  const oppK=G.turn==='tea'?'jeet':'tea';const opp=G[oppK];
  const atk=att.atk+(att.atkBonus||0)+(att.rageBonus||0)+(att.squadAtkBonus||0);
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido){lg(`${bushido.name} (Bushido) blocks — must attack it first!`,'hint');return;}
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')&&!(att.squadParam&&att.squadParam.pierce)){lg(`${provoke.name} has Provoke — attack it first!`,'hint');return;}
  lg(`${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`,'dmg');
  opp.hp=Math.max(0,opp.hp-atk);
  triggerAbilities(att,'on_attack',{target:null});
  att.exhausted=true;G.sel=null;G.phase='action';
  flashBase('opp', 'dmg');
  checkWin();render();
  activateCard(att.id); 
}

function dmgCard(card,dmg,faction){
  if(dmg<=0)return;
  card.hp-=dmg;
  requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
  const cardId=card.id;
  const dmgAmt=dmg;
  requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(cardId,`-${dmgAmt}`,'dmg')));
  lg(`${card.name} takes ${dmg} → ${card.hp}/${card.maxHp} HP.`,'dmg');
  if(card.hp<=0)killCard(card,faction);
}

function killCard(card,faction,toVoid=false){
  G[faction].field=G[faction].field.filter(c=>c.id!==card.id);
  card.rageBonus=0;
  card.squadMaxHpBonus=0;
  card.squadAtkBonus=0;
  card.squadParam=null;
  if(toVoid){
    card.voided=true;
    G[faction].void.push(card);
    lg(`${card.name} burned to ash — lost forever.`,'die');
  } else {
    G[faction].grave.push(card);
    lg(`${card.name} dies.`,'die');
  }
  checkSquadBonuses(faction);
  if(hasTag(card,'aura:atk')){
    G[faction].field.forEach(a=>{a.atkBonus=0;});
    lg(`${card.name} died — ATK aura removed.`);
  }
  // Always reapply auras so squad maxHP loss is immediately reflected
  applyAuras(faction);
  if(!card.spell&&!card.world&&!card.artifact){
    const world=G[faction].world;
    if(world&&hasTag(world,'on_own_death')){
      const val=getTagVal(world,'on_own_death')||1;
      for(let i=0;i<val;i++) if(G[faction].deck.length>0) G[faction].hand.push(G[faction].deck.shift());
      lg(`${world.name}: ${card.name} died — draw ${val} card(s).`,'hl');
    }
  }

  ['tea','jeet'].forEach(f=>{
    G[f].field.forEach(ally=>{
      const val=getTagVal(ally,'on_any_death_base');
      if(val&&G[f].hp<G[f].maxHp){
        G[f].hp=Math.min(G[f].maxHp,G[f].hp+val);
        lg(`${ally.name}: ${f} base +${val} HP → ${G[f].hp}/${G[f].maxHp}.`,'hl');
        flashBase(f, 'heal');
      }
    });
  });

  const drawTag=getTagVal(card,'draw');
  if(drawTag){G[card.f].extraDraw=Math.max(0,G[card.f].extraDraw-drawTag);}
}

function doBurnCard(card){
  const cur=G[G.turn];
  if(cur.burned){lg('Already burned a card this turn.','hint');return;}

  // Анимация сжигания — находим карту в DOM и вешаем фейд перед удалением
  const cardEl=document.querySelector(`.hand .card[data-id="${card.id}"]`);
  if(cardEl){
    cardEl.style.transition='opacity 0.3s ease, transform 0.3s ease';
    cardEl.style.opacity='0';
    cardEl.style.transform='scale(0.85)';
  }

  setTimeout(()=>{
    cur.hand=cur.hand.filter(c=>c.id!==card.id);
    card.voided=true;
    cur.void.push(card);
    cur.essMax+=1;cur.ess+=1;cur.burned=true;
    flashEssenceGain(G.turn);
    lg(`Burned ${card.name} → Essence now ${cur.ess}/${cur.essMax}.`,'imp');
    G.phase='action';render();
  }, 300); // ждём пока анимация закончится
}


function applyAuras(faction){
  const cur=G[faction];
  const auraSources=[...cur.field.filter(c=>!c.spell&&!c.world&&!c.artifact)];
  if(cur.world&&hasTag(cur.world,'aura:atk')) auraSources.push(cur.world);
  cur.field.forEach(a=>{
    if(!hasTag(a,'aura:atk')) a.atkBonus=0;
    const hasMaxHpSrc=auraSources.some(s=>s.id!==a.id&&hasTag(s,'aura:maxhp'));
    if(!hasMaxHpSrc&&a.baseMaxHp){
      a.maxHp=a.baseMaxHp;
      a.hp=Math.min(a.hp,a.maxHp);
      a.baseMaxHp=null;
    }
  });

  auraSources.forEach(src=>{
 if(hasTag(src,'aura:atk')){
      const val=getTagVal(src,'aura:atk')||1;
      cur.field.forEach(a=>{
        if(a.id!==src.id&&!a.spell&&!a.world&&!a.artifact){
          a.atkBonus=(a.atkBonus||0)+val;
        }
      });
      if(cur._auraAtkLog===src.id){
        const affected=cur.field.filter(a=>a.id!==src.id&&!a.spell&&!a.world&&!a.artifact);
        if(affected.length>0){
          lg(`${src.name}: +${val} ATK → ${affected.map(a=>a.name).join(', ')}.`,'hl');
          affected.forEach(a=>{
            const aId=a.id;
            requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(aId,`+${val} ATK`,'atk')));
          });
        }
        cur._auraAtkLog=null;
      }
    }
  }); 


  {
    const totalMaxHpBonus=auraSources.reduce((sum,src)=>{
      if(!hasTag(src,'aura:maxhp')) return sum;
      return sum+(getTagVal(src,'aura:maxhp')||1);
    },0);
    cur.field.forEach(a=>{
      if(a.spell||a.world||a.artifact) return;
      if(a.baseMaxHp){
        const squadBonus=a.squadMaxHpBonus||0;
        const worldBonus=a.worldMaxHpBonus||0;
        a.maxHp=a.baseMaxHp+squadBonus+worldBonus; 
        a.hp=Math.min(a.hp,a.maxHp);
      }
    });

    auraSources.forEach(src=>{
      if(!hasTag(src,'aura:maxhp')) return;
      const val=getTagVal(src,'aura:maxhp')||1;
      const affected=[];
      cur.field.forEach(a=>{
        if(a.spell||a.world||a.artifact||a.id===src.id) return;
        if(!a.baseMaxHp) a.baseMaxHp=a.maxHp-(a.squadMaxHpBonus||0)-(a.worldMaxHpBonus||0); 
        const wasFull=a.hp===a.maxHp;
        a.maxHp+=val;
        if(wasFull) a.hp=a.maxHp;
        if(cur._auraMaxLog===src.id) affected.push(`${a.name}(${a.hp}/${a.maxHp})`);
      });
      if(cur._auraMaxLog===src.id){
        if(affected.length>0) lg(`${src.name}: +${val} maxHP → ${affected.join(', ')}.`,'hl');
        else lg(`${src.name}: no allies to buff.`,'hl');
        cur._auraMaxLog=null;
      }
    });
    
    if(!auraSources.some(s=>hasTag(s,'aura:maxhp'))){
      cur.field.forEach(a=>{a.baseMaxHp=null;});
    }
    if(cur.world&&hasTag(cur.world,'world_maxhp')){
      const val=getTagVal(cur.world,'world_maxhp')||1;
      cur.field.forEach(a=>{
        if(a.spell||a.world||a.artifact) return;
        if(!a.worldMaxHpSet){
          const wasFull=a.hp===a.maxHp;
          a.maxHp+=val;
          if(wasFull) a.hp=a.maxHp;
          a.worldMaxHpBonus=(a.worldMaxHpBonus||0)+val;
          a.worldMaxHpSet=true; 
        }
      });
    } else {
      cur.field.forEach(a=>{
        if(a.worldMaxHpBonus){
          a.maxHp=Math.max(1,a.maxHp-a.worldMaxHpBonus);
          a.hp=Math.min(a.hp,a.maxHp);
          a.worldMaxHpBonus=0;
          a.worldMaxHpSet=false;
        }
      });
    }
  }
}

const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'atk',   val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'param', param:'pierce', val:true},
  {gtype:'xui', count:3, effect:'param', param:'regen',  val:2},
];

function checkSquadBonuses(faction){
  const field=G[faction].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
  
  SQUAD_DEFS.forEach(squad=>{
    const members=field.filter(c=>getTagVal(c,'gtype')===squad.gtype);
    const active=members.length>=squad.count;
    
    members.forEach(card=>{
      if(squad.effect==='maxhp'){
        if(active&&!card.squadMaxHpBonus){
          card.maxHp+=squad.val;
          if(card.hp===card.maxHp-squad.val) card.hp+=squad.val;
          card.squadMaxHpBonus=squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} maxHP → ${card.hp}/${card.maxHp}.`,'hl');
        } else if(!active&&card.squadMaxHpBonus){
          card.maxHp=Math.max(1,card.maxHp-card.squadMaxHpBonus);
          card.hp=Math.min(card.hp,card.maxHp);
          card.squadMaxHpBonus=0;
          lg(`${card.name}: squad broken — maxHP bonus lost.`,'die');
        }
      } else if(squad.effect==='atk'){
        if(active&&!card.squadAtkBonus){
          card.squadAtkBonus=squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} ATK.`,'hl');
        } else if(!active&&card.squadAtkBonus){
          card.squadAtkBonus=0;
          lg(`${card.name}: squad broken — ATK bonus lost.`,'die');
        }
      } else if(squad.effect==='param'){
        if(active&&!card.squadParam){
          card.squadParam={[squad.param]:squad.val};
          lg(`Squad bonus! ${card.name} ${squad.param} upgraded to ${squad.val}.`,'hl');
        } else if(!active&&card.squadParam){
          card.squadParam=null;
          lg(`${card.name}: squad broken — ${squad.param} bonus lost.`,'die');
        }
      }
    });
  });
}


function doSacrifice_target(card){
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact){
    lg('Select one of your creatures.','hint');return;
  }
  const altar=G[G.turn].artifacts.find(a=>hasTag(a,'sacrifice'));
  if(altar){altar.exhausted=true;lg('Altar exhausted until next turn.','die');}
  else lg('[DBG] Altar not found in artifacts!');
  lg(`${card.name} sacrificed to the Altar!`,'die');
  killCard(card,G.turn);
  G.phase='action';
  checkWin();render();
}

function doSacrifice(){
  if(!G.sel){lg('Select a creature to sacrifice.','hint');return;}
  const card=findC(G.sel);
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact){
    lg('Select one of your creatures.','hint');return;
  }
  lg(`${card.name} sacrificed to the Altar!`,'die');
  killCard(card,G.turn);
  G.sel=null;G.phase='action';
  checkWin();render();
}


function doShard(artifact){
  if(G.phase==='shardTarget'){
    G.phase='action';G.sel=null;render();return;
  }
  G.phase='shardTarget';
  G.sel=artifact.id;
  lg(`${artifact.name}: select an enemy creature to deal ${getTagVal(artifact,'shard')||2} damage.`,'hint');
  render();
}

function doShardTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  const artifact=G[G.turn].artifacts.find(a=>hasTag(a,'shard'));
  const baseDmg=getTagVal(artifact,'shard')||2;
  const dmg=card.feared?baseDmg+1:baseDmg;
  const fearNote=card.feared?' (feared +1)':'';
  lg(`${artifact.name}: ${card.name} takes ${dmg} damage${fearNote}!`,'dmg');
  dmgCard(card,dmg,oppK);
  if(artifact) artifact.exhausted=true;
  G.phase='action';G.sel=null;
  checkWin();render();
}

function openGraveModal(faction){
  const grave = G[faction].grave.filter(c=>!c.voided);
  const modal = document.getElementById('graveModal');
  const title = document.getElementById('graveModalTitle');
  const cards = document.getElementById('graveModalCards');
  title.textContent = (faction==='tea'?'Tavern':'Jeet Core') + ' Graveyard';
  cards.innerHTML = '';
  if(grave.length===0){
    cards.innerHTML='<div style="color:#555;font-size:20px;padding:20px;">Empty</div>';
  } else {
    grave.slice().reverse().forEach(card=>{
      const d = mkEl(card,'grave');
      d.style.cursor='default';
      d.style.transform='none';
      d.classList.remove('exhausted','sleeping','feared','burning','selected','targetable');
      d.style.opacity='1';
      d.style.borderStyle='';
      cards.appendChild(d);
    });
  }

  const btnId = faction==='tea' ? 'teaBottomBar' : 'jeetBottomBar';
  const bar = document.getElementById(btnId);
  const graveBtn = bar ? bar.querySelector('.btn-graveyard') : null;
  const innerModal = modal.querySelector('.modal');
  if(graveBtn && innerModal){
    const r = graveBtn.getBoundingClientRect();
    innerModal.style.left   = r.left + 'px';
    innerModal.style.bottom = (window.innerHeight - r.top + 14) + 'px';
    innerModal.style.top    = '';
    graveBtn.classList.add('open'); // ← добавь
  }

  modal.classList.remove('hidden');
}

function closeGraveModal(){
  document.querySelectorAll('.btn-graveyard').forEach(b=>b.classList.remove('open'));
  document.getElementById('graveModal').classList.add('hidden');
}


function endTurn(){
  G.sel=null;G.phase='action';G.previewCard=null;
  const next=G.turn==='tea'?'jeet':'tea';

  G[G.turn].field.forEach(c=>{c.sleeping=false;c.exhausted=false;c.feared=false;});
  G[G.turn].artifacts.forEach(a=>{a.sleeping=false;a.exhausted=false;});
  G.turn=next;
  const cur=G[G.turn];
  cur.burned=false;
  if(G.jeetFirstTurn&&G.turn==='jeet'){
    cur.essMax=1;cur.ess=1;G.jeetFirstTurn=false;
  } else {
    cur.essMax+=1;cur.ess=cur.essMax;
  }
  flashEssenceGain(G.turn);
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(cur.world) triggerAbilities(cur.world,'on_turn');
  cur.artifacts.forEach(a=>triggerAbilities(a,'on_turn'));
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  
  [...cur.field].forEach(c=>triggerAbilities(c,'on_turn'));
  cur.field.forEach(c=>{
  });

    [...G[G.turn].field].forEach(card=>{
    if(card.burning&&!card.spell&&!card.world&&!card.artifact){
      card.hp-=1;
      lg(`${card.name} burns for 1 HP → ${card.hp}/${card.maxHp}.`,'dmg');
      if(card.hp<=0){
        const f=G[G.turn].field.includes(card)?G.turn:oppK;
        killCard(card,f,true); // true = burned to death → void
      }
    }
  });
  checkWin();

  const skipDraw=(G.turn==='jeet'&&G.turnNum===1);
  if(!skipDraw){
    const n=1+cur.extraDraw;
    for(let i=0;i<n;i++)if(cur.deck.length>0)cur.hand.push(cur.deck.shift());
  }

  if(G.turn==='tea')G.turnNum++;
  lg(`─ Turn ${G.turnNum}: ${G.turn.toUpperCase()} · ${cur.ess}/${cur.essMax} Essence ─`,'trn');
  const lp=document.getElementById('logPanel');if(lp)lp.classList.remove('open');
  render();
}

// ── WIN / MULLIGAN / UTILS ─────────────────────────────────
function checkWin(){
  if(G.tea.hp<=0)showWin('jeet');
  if(G.jeet.hp<=0)showWin('tea');
}

function doMulligan(faction){
  const m=G.mulligan[faction];
  const p=G[faction];
  if(m.used>=3){lg('No more mulligans!','dmg');return;}

  // Return hand to deck and reshuffle
  p.hand.forEach(card=>{resetC(card);p.deck.push(card);});
  p.hand=[];
  for(let i=p.deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [p.deck[i],p.deck[j]]=[p.deck[j],p.deck[i]];
  }

  const drawCounts=[5,4,3];
  const draw=drawCounts[m.used];
  const msgs=[
    `1st Mulligan: drew ${draw} new cards.`,
    `2nd Mulligan: drew ${draw} cards.`,
    `3rd Mulligan: drew ${draw} cards. Last mulligan used.`,
  ];
  for(let i=0;i<draw;i++) if(p.deck.length>0)p.hand.push(p.deck.shift());
  lg(msgs[m.used],'imp');
  m.used++;
  updateMulliganBtn(faction);
  render();
}

// Spacebar = End Turn
document.addEventListener('keydown',(e)=>{
  if(e.code==='Space'&&document.getElementById('game')&&document.getElementById('game').style.display!=='none'){
    e.preventDefault();
    const teaBB=document.getElementById('teaBottomBar');
    const jeetBB=document.getElementById('jeetBottomBar');
    if(teaBB&&teaBB.style.display!=='none') endTurn();
    else if(jeetBB&&jeetBB.style.display!=='none') endTurn();
  }
});

function cancelAction(){G.previewCard=null;clearPreview();G.sel=null;G.phase='action';render();}

function handleGameClick(e){
  if(G.phase==='sacrificeTarget'&&!e.target.closest('.card')&&!e.target.closest('.pcard')){
    G.phase='action';G.sel=null;render();return;
  }
  // добавить:
  if(G.phase==='selectTarget'&&!e.target.closest('.card-small')&&!e.target.closest('.stats-bar')){
    G.phase='action';G.sel=null;render();return;
  }
  if(!e.target.closest('.card')&&G.previewCard){
    G.previewCard=null;clearPreview();render();
  }
}

function clearPreview(){
  document.querySelectorAll('.hand .card.previewed').forEach(el=>el.classList.remove('previewed'));
}
function showFloat(cardId, text, type){
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if(!el) return;
  const num = document.createElement('div');
  num.className = `float-number ${type}`;
  num.textContent = text;
  el.appendChild(num);
  setTimeout(()=>num.remove(), 900);
}
function activateCard(cardId){
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if(!el) return;
  el.classList.remove('activating');
  void el.offsetWidth; 
  el.classList.add('activating');
  setTimeout(()=>el.classList.remove('activating'), 500);
}
function hitCard(cardId){
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if(!el) return;

  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');

  setTimeout(()=>{
    el.classList.remove('hit');
  },250);
}
function flashEssenceGain(who){
  // Ставим в очередь "мигание" эссенции — применяется после render()/reorderZones(),
  // т.к. .stat-ess-box/.ess-val каждый раз пересоздаются заново через innerHTML.
  if(!G._pendingEssGlitch) G._pendingEssGlitch=[];
  G._pendingEssGlitch.push(who);
}
function _applyPendingEssGlitch(){
  if(!G._pendingEssGlitch||G._pendingEssGlitch.length===0) return;
  const list=G._pendingEssGlitch;
  G._pendingEssGlitch=[];
  list.forEach(who=>{
    let elId;
    if(who==='opp'||who==='player'){
      elId=who==='opp'?'oppStats':'playerStats';
    } else {
      const oppK=G.turn==='tea'?'jeet':'tea';
      elId=who===oppK?'oppStats':'playerStats';
    }
    const bar=document.getElementById(elId);
    if(!bar) return;
    const box=bar.querySelector('.stat-ess-box');
    if(box){
      box.classList.remove('flash-green');
      void box.offsetWidth;
      box.classList.add('flash-green');
      setTimeout(()=>box.classList.remove('flash-green'), 500);
    }
    const val=bar.querySelector('.ess-val');
    if(val){
      val.classList.remove('glitch-text');
      void val.offsetWidth;
      val.classList.add('glitch-text');
      setTimeout(()=>val.classList.remove('glitch-text'), 250);
    }
  });
}
function flashBase(who, type){
  // Queue flash to apply after render/reorderZones rewrites innerHTML
  if(!G._pendingFlash) G._pendingFlash=[];
  G._pendingFlash.push({who,type});
}
function _applyPendingFlash(){
  if(!G._pendingFlash||G._pendingFlash.length===0) return;
  const flashes=G._pendingFlash;
  G._pendingFlash=[];
  flashes.forEach(({who,type})=>{
    let elId;
    if(who==='opp'||who==='player'){
      elId=who==='opp'?'oppStats':'playerStats';
    } else {
      const oppK=G.turn==='tea'?'jeet':'tea';
      elId=who===oppK?'oppStats':'playerStats';
    }
    const bar=document.getElementById(elId);
    if(!bar) return;
    const cls=type==='dmg'?'flash-red':'flash-green';
    [bar.querySelector('.player-name-box'), bar.querySelector('.stat-hp-box')].forEach(target=>{
      if(!target) return;
      target.classList.remove('flash-red','flash-green');
      void target.offsetWidth;
      target.classList.add(cls);
      setTimeout(()=>target.classList.remove('flash-red','flash-green'), 500);
    });
  });
}
