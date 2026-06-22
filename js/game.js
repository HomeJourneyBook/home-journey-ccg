// ── CLICK HANDLER ─────────────────────────────────────────
function getTargetableCards(oppField, att){
  const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return [bushido.id];
  const provokes=oppField.filter(c=>c.tags.includes('provoke'));
  const hasPierce=att&&att.tags.includes('pierce');
  if(provokes.length>0&&!hasPierce) return provokes.map(c=>c.id);
  return oppField.map(c=>c.id);
}

function onClick(card,zone){
  const opp=G.turn==='tea'?'jeet':'tea';

  if(G.phase==='burn'){
    if(zone==='hand'&&card.f===G.turn)doBurnCard(card);
    return;
  }

  if(G.phase==='healTarget'){
    // Click ally with missing HP → heal
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
    // Click enemy → attack
    if(zone==='field'&&card.f===opp){
      const healer=findC(G.sel);
      if(healer){
        const oppField=G[opp].field;
        const targetable=getTargetableCards(oppField,healer);
        if(!targetable.includes(card.id)){
          const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
          lg(bushido?`Must attack ${bushido.name} (Bushido) first!`:`Must attack the Provoke card first!`,'dmg');
          return;
        }
        doAttack(healer,card);
      }
      return;
    }
    // Click own card → cancel
    if(card.f===G.turn){G.sel=null;G.phase='action';render();}
    return;
  }

  if(G.phase==='action'){
    // Hand card → preview
    if(zone==='hand'&&card.f===G.turn){
      G.previewCard=G.previewCard===card.id?null:card.id;
      render();return;
    }
    // Field card → select for action
    if(zone==='field'&&card.f===G.turn&&!card.sleeping&&!card.exhausted&&!card.feared&&!card.spell&&!card.world&&!card.artifact){
      const isHealer=card.tags.some(t=>t.startsWith('heal:'));
      if(isHealer){
        G.sel=card.id;G.phase='healTarget';
        lg(`${card.name}: click an ALLY (green) to heal, or an ENEMY (red) to attack.`);
        render();return;
      }
      G.sel=card.id;G.phase='selectTarget';
      lg(`Selected ${card.name} — click enemy to attack, or tap base.`);
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
        lg(bushido?`Must attack ${bushido.name} (Bushido) first!`:`Must attack the Provoke card first!`,'dmg');
        return;
      }
      doAttack(att,card);
    }
  }
}

// ── PLAY CARDS ─────────────────────────────────────────────
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
  const cur=G[G.turn];
  card.sleeping=!card.tags.includes('vanguard');
  card.exhausted=false;
  cur.field.push(card);
  lg(`▶ ${G.turn.toUpperCase()} plays ${card.name}.`,'imp');

  // on_enter abilities via ability system (Faeron AOE, Maltor AOE, Tuborg ATK, World HP)
  triggerAbilities(card,'on_enter');

  // Track draw bonus for cards with draw tag
  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;

  // Apply aura:atk bonus to newly entered card if aura card on field
  if(!hasTag(card,'aura:atk')){
    const auraCard=cur.field.find(c=>hasTag(c,'aura:atk')&&c.id!==card.id);
    if(auraCard&&!card.spell&&!card.world&&!card.artifact)
      card.atkBonus=(getTagVal(auraCard,'aura:atk')||1);
  }

  if(card.tags.includes('vanguard')) lg(`${card.name} has Vanguard!`);
}

function doWorld(card){
  const cur=G[G.turn];
  if(cur.world){cur.grave.push(cur.world);lg(`Replaced ${cur.world.name}.`);}
  cur.world=card;
  triggerAbilities(card,'on_enter');
  lg(`▶ World: ${card.name} activated.`,'imp');
}

function doArtifact(card){
  const cur=G[G.turn];
  cur.artifacts.push(card);
  lg(`▶ Artifact: ${card.name} placed.`,'imp');
  // Track draw bonus via tag system
  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;
}

function doSpell(card){
  const cur=G[G.turn];
  lg(`▶ Spell: ${card.name}.`,'imp');
  triggerAbilities(card,'instant');
  cur.grave.push(card);
}

// ── REVIVE ─────────────────────────────────────────────────
function reviveCard(card,toF){
  const def=DEFS[card.key];
  if(def){card.hp=def.hp;card.maxHp=def.hp;}
  card.sleeping=true;card.exhausted=false;card.feared=false;card.burning=false;card.atkBonus=0;
  card.f=toF;
  G[toF].field.push(card);
  lg(`✨ Revived ${card.name} at full HP.`,'hl');

  // Aura interaction on revive
  if(hasTag(card,'aura:atk')){
    // Aura card revived — give ATK bonus to all allies
    const auraVal=getTagVal(card,'aura:atk')||1;
    G[toF].field.forEach(a=>{
      if(a.id!==card.id&&!a.spell&&!a.world&&!a.artifact) a.atkBonus=auraVal;
    });
    lg(`${card.name}: all allies +${auraVal} ATK!`,'imp');
  } else {
    // Someone else revived — check if aura card on field
    const auraCard=G[toF].field.find(c=>hasTag(c,'aura:atk')&&c.id!==card.id);
    if(auraCard&&!card.spell&&!card.world&&!card.artifact)
      card.atkBonus=getTagVal(auraCard,'aura:atk')||1;
  }
}

// ── ATTACK ─────────────────────────────────────────────────
function doAttack(att,target){
  const curK=G.turn;
  const oppK=curK==='tea'?'jeet':'tea';
  const atk=att.atk+att.atkBonus;

  lg(`⚔ ${att.name} attacks ${target.name}!`,'imp');
  dmgCard(target,atk,oppK);
  dmgCard(att,target.atk+target.atkBonus,curK);

  // All on_attack abilities: fear, burn, draw, etc.
  // Only apply if target survived (no fear/burn on dead cards)
  if(target.hp>0){
    triggerAbilities(att,'on_attack',{target});
  }

  att.exhausted=true;
  G.sel=null;
  G.phase='action';
  checkWin();
  render();
}

// ── ACTIVE ABILITIES ───────────────────────────────────────
function doUmbAsir(){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const umb=findC(G.sel);
  if(!umb||!hasTag(umb,'aoe')){lg('Select an AOE card first.','dmg');return;}
  if(umb.exhausted){lg(`${umb.name} already acted this turn.`,'dmg');return;}
  const dmgAmt=getTagVal(umb,'aoe')||1;
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
  if(!vard||!hasTag(vard,'aoe')){lg('Select an AOE card first.','dmg');return;}
  if(vard.exhausted){lg(`${vard.name} already acted this turn.`,'dmg');return;}
  const dmgAmt=getTagVal(vard,'aoe')||2;
  lg(`⚡ ${vard.name} — Dark Will: ${dmgAmt} dmg to ALL enemies!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK));
  vard.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

// ── BASE ATTACK ────────────────────────────────────────────
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
  if(provoke&&!att.tags.includes('pierce')) return false;
  return true;
}

function tryAttackBase(){
  if(G.phase!=='selectTarget'&&G.phase!=='healTarget'){lg('Select a card to attack with first.');return;}
  const att=findC(G.sel);if(!att)return;
  const oppK=G.turn==='tea'?'jeet':'tea';const opp=G[oppK];
  const atk=att.atk+att.atkBonus;
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido){lg(`${bushido.name} (Bushido) blocks — must attack it first!`,'dmg');return;}
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')){lg(`${provoke.name} has Provoke — attack it first!`,'dmg');return;}
  lg(`⚔ ${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`,'dmg');
  opp.hp=Math.max(0,opp.hp-atk);
  att.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

// ── DAMAGE & DEATH ─────────────────────────────────────────
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

  // Tuborg death — remove ATK bonus from allies
  // If an aura:atk card dies, recalculate ATK bonuses
  if(hasTag(card,'aura:atk')){
    G[faction].field.forEach(a=>{a.atkBonus=0;});
    lg(`${card.name} died — ATK aura removed.`);
  }

  // Reaper on_kill — heal base HP only (no maxHp increase)
  if(card.f!==G.turn){
    const reap=G[G.turn].field.find(c=>c.key==='j_reap');
    if(reap){
      G.jeet.hp=Math.min(G.jeet.maxHp,G.jeet.hp+2);
      lg(`Reaper: Jeet base +2 HP → ${G.jeet.hp}/${G.jeet.maxHp}`,'hl');
    }
  }

  // Remove draw bonus if card with draw tag dies
  const drawTag=getTagVal(card,'draw');
  if(drawTag){G[card.f].extraDraw=Math.max(0,G[card.f].extraDraw-drawTag);}
}

// ── BURN ───────────────────────────────────────────────────
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

// ── AURAS ──────────────────────────────────────────────────
function applyAuras(faction){
  const cur=G[faction];
  // Reset all atkBonus first, then reapply from active auras
  cur.field.forEach(a=>{if(!hasTag(a,'aura:atk')) a.atkBonus=0;});
  cur.field.forEach(src=>{
    if(!src.spell&&!src.world&&!src.artifact){
      // aura:atk - give ATK bonus to all other allies
      if(hasTag(src,'aura:atk')){
        const val=getTagVal(src,'aura:atk')||1;
        cur.field.forEach(a=>{
          if(a.id!==src.id&&!a.spell&&!a.world&&!a.artifact) a.atkBonus=val;
        });
      }
      // aura:maxhp - increase maxHP of all allies (Aslex)
      if(hasTag(src,'aura:maxhp')){
        const val=getTagVal(src,'aura:maxhp')||1;
        cur.field.forEach(a=>{
          if(a.id!==src.id&&!a.spell&&!a.world&&!a.artifact){
            const wasFull=a.hp===a.maxHp;
            a.maxHp+=val;
            if(wasFull) a.hp+=val;
          }
        });
        lg(`${src.name}: all allies +${val} maxHP!`,'hl');
      }
    }
  });
}

// ── END TURN ───────────────────────────────────────────────
function endTurn(){
  G.sel=null;G.phase='action';G.previewCard=null;
  const next=G.turn==='tea'?'jeet':'tea';

  // Wake current player's cards, clear their debuffs
  G[G.turn].field.forEach(c=>{c.sleeping=false;c.exhausted=false;c.feared=false;});
  G.turn=next;
  const cur=G[G.turn];
  cur.burned=false;

  // Essence refresh
  if(G.jeetFirstTurn&&G.turn==='jeet'){
    cur.essMax=1;cur.ess=1;G.jeetFirstTurn=false;
  } else {
    cur.essMax+=1;cur.ess=cur.essMax;
  }

  const oppK=G.turn==='tea'?'jeet':'tea';

  // 1. World & artifact on_turn effects (ess, draw, heal)
  if(cur.world) triggerAbilities(cur.world,'on_turn');
  cur.artifacts.forEach(a=>triggerAbilities(a,'on_turn'));

  // 2. Apply auras (Tuborg atk, Aslex maxhp) + field on_turn effects
  applyAuras(G.turn);
  cur.field.forEach(c=>{
    // Phlegmor — raise last creature from any graveyard at 1 HP
    if(c.key==='j_phleg'){
      const all=[...G[G.turn].grave,...G[oppK].grave].filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided);
      if(all.length>0){
        const r=all[all.length-1];
        G[G.turn].grave=G[G.turn].grave.filter(x=>x.id!==r.id);
        G[oppK].grave=G[oppK].grave.filter(x=>x.id!==r.id);
        r.hp=1;r.sleeping=true;r.exhausted=false;r.feared=false;r.burning=false;r.atkBonus=0;r.f=G.turn;
        // Apply Tuborg bonus if on field
        const tuborg=cur.field.find(t=>t.key==='t_tuborg');
        if(tuborg) r.atkBonus=1;
        cur.field.push(r);
        lg(`Phlegmor raises ${r.name} at 1 HP!`,'imp');
      }
    }
  });

  // 3. Burning damage (after heals, before draw)
  [...G[G.turn].field,...G[oppK].field].forEach(card=>{
    if(card.burning&&!card.spell&&!card.world&&!card.artifact){
      card.hp-=1;
      lg(`🔥 ${card.name} burns for 1 HP → ${card.hp}/${card.maxHp}.`,'dmg');
      if(card.hp<=0){
        const f=G[G.turn].field.includes(card)?G.turn:oppK;
        killCard(card,f);
      }
    }
  });
  checkWin();

  // 4. Draw
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
    `🔀 Mulligan (free): drew ${draw} new cards.`,
    `🔀 Mulligan (−1): drew ${draw} cards.`,
    `🔀 Mulligan (−2): drew ${draw} cards. Last mulligan used.`,
  ];
  for(let i=0;i<draw;i++) if(p.deck.length>0)p.hand.push(p.deck.shift());
  lg(msgs[m.used],'imp');
  m.used++;
  updateMulliganBtn(faction);
  render();
}

function cancelAction(){G.previewCard=null;clearPreview();G.sel=null;G.phase='action';render();}

function handleGameClick(e){
  if(!e.target.closest('.card')&&G.previewCard){
    G.previewCard=null;clearPreview();render();
  }
}

function clearPreview(){
  document.querySelectorAll('.hand .card.previewed').forEach(el=>el.classList.remove('previewed'));
}
