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
  if(G.mode==='vsai'&&G.turn===G.aiFaction) return; // ход ИИ — игнорируем клики человека
  const opp=G.turn==='tea'?'jeet':'tea';
  if(G.phase==='burn'){
    if(zone==='hand'&&card.f===G.turn)doBurnCard(card);
    return;
  }
  if(G.phase==='healTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&(card.hp<card.maxHp||card.burning||card.feared)){
      const healer=findC(G.sel);
      if(healer){
        const healAmt=(healer.squadParam&&healer.squadParam.heal)||getTagVal(healer,'heal')||1;
        const oldHp=card.hp;
        card.hp=Math.min(card.maxHp,card.hp+healAmt);
        const actualHeal=card.hp-oldHp;
        playSfx('heal');
        const healedId=card.id;
        // +N HP float — только если реально что-то долечили. Кликнуть на дебаффнутую, но
        // уже полную по HP цель (см. (card.hp<card.maxHp||card.burning||card.feared) выше —
        // это легитимный кейс, только чтобы снять fear/burn) — clean срабатывает верно, но
        // раньше здесь всё равно вылезало "+1 HP", хотя HP не менялось вообще. Баг, найденный
        // автором 2026-07-10.
        if(actualHeal>0) setTimeout(()=>showFloat(healedId, `+${actualHeal}`, 'heal'), 50);
        const debuffs=[];
        if(card.burning){card.burning=false;debuffs.push('fire');}
        if(card.feared){card.feared=false;debuffs.push('fear');}
        if(debuffs.length) queueFieldFx(card.id,'CLEANED','fx-cleaned');
        lg(`${healer.name}: ${actualHeal>0?`+${actualHeal} HP to ${card.name}`:`cleanses ${card.name}`}${debuffs.length?(actualHeal>0?', removes '+debuffs.join(' & '):' — removes '+debuffs.join(' & ')):''}.`,'hl');
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
  if(G.phase==='spellDmgTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSpellDmgTarget(card);return;
    }
    cancelPendingSpell();return; // cancel — refunds cost, returns card to hand
  }
  if(G.phase==='spellBuffTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&!card.sleeping&&!card.exhausted&&!card.feared){
      doSpellBuffTarget(card);return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellDispelTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSpellDispelTarget(card);return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellUntapTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      if(card.sleeping||card.exhausted){
        doSpellUntapTarget(card);return;
      }
      // Клик по своей карте, которая и так уже активна — заклинанию нечего снимать.
      // По просьбе автора это больше НЕ считается отменой (раньше любой такой клик
      // отменял заклинание с рефандом) — просто игнорируем клик и ждём валидную цель,
      // чтобы случайный тап не по той карте не срывал применение.
      return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='action'){
    if(zone==='hand'&&card.f===G.turn){
      G.previewCard=G.previewCard===card.id?null:card.id;
      if(G.previewCard) playSfx('card_select_traveler'); // звук при открытии превью
      render();return;
    }
    if(zone==='field'&&card.f===G.turn&&card.artifact&&hasTag(card,'sacrifice')&&!card.sleeping&&!card.exhausted){
      G.phase='sacrificeTarget';
      lg(`${card.name}: select a creature to sacrifice.`,'hint');
      render();return;
    }
    if(zone==='field'&&card.f===G.turn&&!card.sleeping&&!card.exhausted&&!card.feared&&!card.spell&&!card.world&&!card.artifact){
      // Хилер больше не прыгает в healTarget сразу по клику — как и AOE-существа
      // (Umbasir/Vardan), он просто выделяется (selectTarget), а над ним всплывает
      // попап-кнопка (см. mkSmallEl в render.js: isHealerAbility/hasHealTarget) —
      // ТОЛЬКО клик по этой кнопке переводит в healTarget с подсветкой целей.
      // Обычная атака враг/база работает как у любого другого существа через selectTarget.
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
  // Targeted spells pause for a target click instead of resolving instantly —
  // same pattern as shardTarget/sacrificeTarget/healTarget below. The spell
  // card is held in G.pendingSpell until a valid target is clicked (or the
  // player cancels by clicking anything else, same as those other phases).
  if(card.spell&&hasTag(card,'spell_dmg_target')){
    G.pendingSpell=card;G.phase='spellDmgTarget';
    lg(`${card.name}: select an enemy creature.`,'hint');render();return;
  }
  if(card.spell&&hasTag(card,'spell_buff_temp')){
    G.pendingSpell=card;G.phase='spellBuffTarget';
    lg(`${card.name}: select an ally creature.`,'hint');render();return;
  }
  if(card.spell&&hasTag(card,'spell_dispel')){
    G.pendingSpell=card;G.phase='spellDispelTarget';
    lg(`${card.name}: select an enemy creature to dispel.`,'hint');render();return;
  }
  if(card.spell&&hasTag(card,'spell_untap')){
    G.pendingSpell=card;G.phase='spellUntapTarget';
    lg(`${card.name}: select an ally creature to activate.`,'hint');render();return;
  }
  if(card.spell)doSpell(card);
  else if(card.world)doWorld(card);
  else if(card.artifact)doArtifact(card);
  else doCreature(card);
  // Fires for ANY card played (creature/world/artifact/spell), not just creatures —
  // centralized here so effects like Faeron's "Each On play: Heal base 1HP" trigger
  // regardless of what type of card was just played. Previously this only lived
  // inside doCreature(), so playing a World/Artifact/Spell never notified field
  // creatures with this tag (bug: Faeron didn't heal base when a World was played).
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  render();
}

function doCreature(card){
  const cur=G[G.turn];
  card.sleeping=!card.tags.includes('vanguard');
  card.exhausted=false;
  cur.field.push(card);
  lg(`${G.turn.toUpperCase()} plays ${card.name}.`,'imp');

  // on_play_creature is now triggered centrally in doPlay() for every card type.
  triggerAbilities(card,'on_enter');

  const drawTag=getTagVal(card,'draw');
  if(drawTag) cur.extraDraw+=drawTag;
  if(hasTag(card,'aura:atk')) cur._auraAtkLog=card.id;
  if(hasTag(card,'aura:maxhp')) cur._auraMaxLog=card.id;
  if(hasTag(card,'aura:armor')) cur._auraArmorLog=card.id;
  if(cur.world&&hasTag(cur.world,'world_maxhp')&&!card.worldMaxHpSet&&!card.spell&&!card.world&&!card.artifact){
    const val=getTagVal(cur.world,'world_maxhp')||1;
    const wasFull=card.hp===card.maxHp;
    card.maxHp+=val;
    if(wasFull) card.hp=card.maxHp;
    card.worldMaxHpBonus=(card.worldMaxHpBonus||0)+val;
    card.worldMaxHpSet=true;
    const worldMaxId=card.id;
    requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(worldMaxId,`+${val} maxHP`,'maxhp')));
  }
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  // Armor — see recalcArmor() for the full stacking model (own tag + squad + world +
  // aura-from-ally). Deliberately NOT initialised inline here anymore (used to be a simple
  // `if(hasTag(card,'armor')) card.armor=getTagVal(...)` right at entry) — that only ever
  // covered the card's OWN tag, missing squad-completion-on-entry and any aura already on
  // the field. recalcArmor()'s "armorMax===undefined" branch (this card has never been
  // through it before) handles first-time init uniformly, own+squad+aura+world all at once.
  recalcArmor(G.turn);
  if(card.armorMax>0){
    lg(`${card.name} enters with ${card.armor}/${card.armorMax} Armor.`,'imp');
  }
}

function doWorld(card){
  const cur=G[G.turn];
  playSfx('open_door');
  if(cur.world){
    const oldDraw=getTagVal(cur.world,'draw');
  if(oldDraw) cur.extraDraw=Math.max(0,cur.extraDraw-oldDraw);
    cur.world.voided=true;
    cur.void.push(cur.world); 
    lg(`Replaced ${cur.world.name}.`);
  if(hasTag(cur.world,'aura:atk')||hasTag(cur.world,'aura:maxhp')) 
    applyAuras(G.turn);
  if(hasTag(cur.world,'world_armor')) recalcArmor(G.turn);
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
  if(hasTag(card,'world_armor')){
    G[G.turn]._worldArmorLog=true;
  }
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  recalcArmor(G.turn);
  lg(`World: ${card.name} landed.`,'imp');
}

function doArtifact(card){
  const cur=G[G.turn];
  playSfx('open_door');
  // Только один артефакт — как с мирами: если уже есть, отправляем в войд
  if(cur.artifacts.length>0){
    const old=cur.artifacts[0];
    const oldDraw=getTagVal(old,'draw');
    if(oldDraw) cur.extraDraw=Math.max(0,cur.extraDraw-oldDraw);
    old.voided=true;
    cur.void.push(old);
    cur.artifacts=[];
    lg(`Replaced ${old.name}.`);
  }
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
  card.sleeping=true;card.exhausted=false;card.feared=false;card.burning=false;card.atkBonus=0;card.rageBonus=0;card.tempAtkBonus=0;card.maxHpBonus=0;card.baseMaxHp=null;card.auraMaxHpBonus=0;card.worldMaxHpBonus=0;card.worldMaxHpSet=false;card.squadParam=null;card.squadAtkBonus=0;card.squadMaxHpBonus=0;card.squadArmorBonus=0;card.armorMax=undefined;card.auraArmorBonus=0;card.worldArmorBonus=0;
  card.f=toF;
  G[toF].field.push(card); 
  lg(`Revived ${card.name} at full HP.`,'hl');

  if(hasTag(card,'aura:atk')) G[toF]._auraAtkLog=card.id;
  if(hasTag(card,'aura:maxhp')) G[toF]._auraMaxLog=card.id;
  if(hasTag(card,'aura:armor')) G[toF]._auraArmorLog=card.id;
  applyAuras(toF);
  checkSquadBonuses(toF); 
  recalcArmor(toF);
}

function playAttackSfx(att){
  playSfx('card_atack');
}

function doAttack(att,target){
  const curK=G.turn;
  const oppK=curK==='tea'?'jeet':'tea';
  const atk=att.atk+(att.atkBonus||0)+(att.rageBonus||0)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0);

  // Fear и Burn полностью замещают звук атаки — если этот удар реально применит
  // один из этих эффектов (цель выживает после урона), звук самой атаки не играем.
  const targetSurvives = (target.hp - atk) > 0;
  const willFear = hasTag(att,'fear') && targetSurvives;
  const willBurn = hasTag(att,'burn') && targetSurvives;
  if(!willFear && !willBurn) playAttackSfx(att);
  lg(`${att.name} attacks ${target.name}!`,'imp');
  dmgCard(target,atk,oppK);
  if(!hasTag(att,'invisible') && !target.feared && !target.exhausted)
  dmgCard(att,
    target.atk +
    (target.atkBonus || 0) + (target.tempAtkBonus || 0) +
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
  playSfx('card_spell_atack');
  const dmgAmt=(umb.squadParam&&umb.squadParam.aoe)||getTagVal(umb,'aoe')||1;
  lg(`${umb.name} hits ALL enemies for ${dmgAmt} dmg!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK,true));
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
  playSfx('card_spell_atack');
  const dmgAmt=getTagVal(vard,'aoe')||2;
  lg(`⚡ ${vard.name} — Dark Will: ${dmgAmt} dmg to ALL enemies!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK,true));
  vard.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
}

function onBaseClick(faction){
  if(G.mode==='vsai'&&G.turn===G.aiFaction) return;
  if(faction===G.turn) return;
  if((G.phase==='selectTarget'||G.phase==='action')&&G.sel&&canAttackBase()){
    tryAttackBase();
  }
  if(G.phase==='healTarget'&&G.sel){
    const att=findC(G.sel);
    if(att){ tryAttackBase(); }
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
  if(G.gameOver) return;
  if(G.phase!=='selectTarget'&&G.phase!=='healTarget'){lg('Select a card to attack with first.','hint');return;}
  const att=findC(G.sel);if(!att)return;
  const oppK=G.turn==='tea'?'jeet':'tea';const opp=G[oppK];
  const atk=att.atk+(att.atkBonus||0)+(att.rageBonus||0)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0);
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido){lg(`${bushido.name} (Bushido) blocks — must attack it first!`,'hint');return;}
  const provoke=opp.field.find(c=>c.tags.includes('provoke'));
  if(provoke&&!att.tags.includes('pierce')&&!(att.squadParam&&att.squadParam.pierce)){lg(`${provoke.name} has Provoke — attack it first!`,'hint');return;}
  playSfx('base_atack');
  lg(`${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`,'dmg');
  opp.hp=Math.max(0,opp.hp-atk);
  triggerAbilities(att,'on_attack',{target:null});
  att.exhausted=true;G.sel=null;G.phase='action';
  flashBase('opp', 'dmg', atk);
  checkWin();render();
  activateCard(att.id); 
}

function dmgCard(card,dmg,faction,bypassArmor){
  if(dmg<=0)return;
  // Armor absorbs first — see doCreature() (init on enter) / endTurn() (refresh
  // on owner's turn start). Fully-absorbed hits still shake the card (visible
  // feedback that *something* landed) but skip the HP float/log/lethal check
  // entirely — there's no HP change to report.
  // bypassArmor=true — magic damage (AOE active/enter_aoe, Shard, targeted spell
  // damage) ignores armor entirely, same spirit as burn (see endTurn()): armor is
  // a PHYSICAL defense (blocks attacks/counters), spells punch straight through
  // it. Author call, 2026-07-10. Only doAttack()'s two dmgCard() calls (the
  // actual attack + its counter-attack) omit this flag — everything else that
  // deals damage through this function is magic.
  if(card.armor>0 && !bypassArmor){
    const absorbed=Math.min(card.armor,dmg);
    card.armor-=absorbed;
    dmg-=absorbed;
    if(dmg<=0){
      requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
      lg(`${card.name}'s armor absorbs ${absorbed} dmg (${card.armor} armor left).`,'dmg');
      return;
    }
  }
  card.hp-=dmg;
  const lethal=card.hp<=0;
  // Lethal hits skip the shake — the death fade (added by rZone's diff / the
  // explicit burn-death handling below) is the only animation that should play.
  // Otherwise shake+fade run at the same time and look janky.
  if(!lethal){
    requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
  }
  const cardId=card.id;
  const dmgAmt=dmg;
  requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(cardId,`-${dmgAmt}`,'dmg')));
  lg(`${card.name} takes ${dmg} → ${card.hp}/${card.maxHp} HP.`,'dmg');
  if(lethal)killCard(card,faction);
}

// Добор карт ВНЕ обычного "начало хода" момента (Hunger/Altar/Ryvlen on-attack/spell draw) —
// вместо голого `hand.push(deck.shift())` эти 4 источника используют это, чтобы гарантированно
// получить fly-анимацию+звук прилёта карты из колоды. Обычная rZone()-диффинг (render.js,
// сравнение "было ли id уже в DOM") в этих сценариях иногда не срабатывала (баг, найденный
// автором 2026-07-10) — вместо попытки до конца понять, почему именно диффинг иногда мажет,
// добор через этот хелпер ЯВНО кладёт id пришедших карт в G._pendingDrawFx[faction], и rZone()
// принудительно анимирует их СВЕРХ обычной проверки — двойной подстраховки. Обычный
// добор-в-начале-хода (endTurn()) этот хелпер не использует — он и так уже работал корректно,
// трогать не стали, чтобы не рисковать регрессией.
function drawCardsAnimated(faction, n){
  const p=G[faction];
  let drawn=0;
  for(let i=0;i<n;i++){
    if(p.deck.length===0) break;
    const card=p.deck.shift();
    p.hand.push(card);
    drawn++;
    if(!G._pendingDrawFx) G._pendingDrawFx={};
    if(!G._pendingDrawFx[faction]) G._pendingDrawFx[faction]=[];
    G._pendingDrawFx[faction].push(card.id);
  }
  return drawn;
}

function killCard(card,faction,toVoid=false){
  G[faction].field=G[faction].field.filter(c=>c.id!==card.id);
  card.rageBonus=0;
  card.squadMaxHpBonus=0;
  card.squadAtkBonus=0;
  card.squadArmorBonus=0;
  card.armor=0;
  card.armorMax=undefined;
  card.auraArmorBonus=0;
  card.worldArmorBonus=0;
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
  // Пересчёт Брони при смерти — если умерший был aura:armor источником, оставшиеся
  // существа теряют бонус; recalcArmor() сам всё это подхватит, т.к. умерший уже вырезан
  // из G[faction].field строкой выше, и его больше нет в auraSources.
  recalcArmor(faction);
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
      drawCardsAnimated(faction, val);
      lg(`${world.name}: ${card.name} died — draw ${val} card(s).`,'hl');
    }
  }

  ['tea','jeet'].forEach(f=>{
    G[f].field.forEach(ally=>{
      const val=getTagVal(ally,'on_any_death_base');
      if(val&&G[f].hp<G[f].maxHp){
        G[f].hp=Math.min(G[f].maxHp,G[f].hp+val);
        lg(`${ally.name}: ${f} base +${val} HP → ${G[f].hp}/${G[f].maxHp}.`,'hl');
        flashBase(f, 'heal', val);
      }
    });
  });

  const drawTag=getTagVal(card,'draw');
  if(drawTag){G[card.f].extraDraw=Math.max(0,G[card.f].extraDraw-drawTag);}
}

function doBurnCard(card){
  const cur=G[G.turn];
  if(cur.burned){lg('Already burned a card this turn.','hint');return;}
  cur.burned=true; // ставим СРАЗУ — второй клик/тап (напр. от карусели на мобиле) в эти 450мс уже не пройдёт проверку выше

  // Анимация сжигания — CSS keyframes (burnCard, styles.css), запускается классом
  // .burning-out. Длительность анимации и setTimeout ниже НАМЕРЕННО держатся в
  // одном месте (450мс) — если поменяешь одно, поменяй и другое.
  // Класс burning-out — маркер для carousel.js (мобильная карусель руки), чтобы её
  // updateTransforms() не перезаписывала opacity/transform каждый кадр поверх анимации.
  // ВАЖНО: снимаем .previewed СРАЗУ — на мобиле карта в момент клика по Burn почти
  // всегда ещё previewed, а для него carousel.js держит свой @media-стиль с
  // !important (transform/opacity) — !important всегда бьёт CSS-анимацию, так что
  // пока previewed висит, анимация сжигания частично не проигрывалась бы. Также
  // сбрасываем G.previewCard, чтобы ближайший render() не восстановил класс обратно.
  if(G.previewCard===card.id) G.previewCard=null;
  const cardEl=document.querySelector(`.hand .card[data-id="${card.id}"]`);
  if(cardEl){
    cardEl.classList.remove('previewed');
    cardEl.classList.add('burning-out');
  }

  setTimeout(()=>{
    cur.hand=cur.hand.filter(c=>c.id!==card.id);
    card.voided=true;
    cur.void.push(card);
    cur.essMax+=1;cur.ess+=1;
    flashEssenceGain(G.turn);
    lg(`Burned ${card.name} → Essence now ${cur.ess}/${cur.essMax}.`,'imp');
    G.phase='action';render();
  }, 450); // держать в синхроне с длительностью .burning-out (styles.css)
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
          setTimeout(()=>playSfx('baf'), 150);
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
      // Персистентное поле для статус-панели (см. _cardStatusEntries() в render.js) — то же,
      // что atkBonus уже делает для aura:atk. Сбрасываем тут же и пересчитываем ниже в цикле
      // auraSources.forEach — до сих пор такого поля не было вообще, аура maxHP считалась
      // "на лету" внутри baseMaxHp-математики и никуда не сохранялась, поэтому статус-панель
      // не могла её показать (баг, найденный автором 2026-07-10 — Аслекс не показывал
      // ауру-от-карты, только world_maxhp, у которого своё поле worldMaxHpBonus).
      a.auraMaxHpBonus=0;
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
        a.auraMaxHpBonus=(a.auraMaxHpBonus||0)+val;
        if(wasFull) a.hp=a.maxHp;
        if(cur._auraMaxLog===src.id){
          affected.push(`${a.name}(${a.hp}/${a.maxHp})`);
          const allyId=a.id;
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(allyId,`+${val} maxHP`,'maxhp')));
        }
      });
      if(cur._auraMaxLog===src.id){
        if(affected.length>0){ setTimeout(()=>playSfx('baf'), 150); lg(`${src.name}: +${val} maxHP → ${affected.join(', ')}.`,'hl'); }
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
          const worldAllyId=a.id;
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(worldAllyId,`+${val} maxHP`,'maxhp')));
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

// Szarg's squad bonus was Pierce (param) before 2026-07-10 — shelved by author request,
// not deleted from the game's vocabulary, just currently unused by any SQUAD_DEFS entry.
// If it comes back later, the 'param'/pierce branch in checkSquadBonuses() below still
// knows how to handle it, nothing to re-implement.
const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'armor', val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'atk',   val:1},
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
          queueFieldFx(card.id,'SQUAD!','fx-squad');
        } else if(!active&&card.squadMaxHpBonus){
          card.maxHp=Math.max(1,card.maxHp-card.squadMaxHpBonus);
          card.hp=Math.min(card.hp,card.maxHp);
          card.squadMaxHpBonus=0;
          lg(`${card.name}: squad broken — maxHP bonus lost.`,'die');
          queueFieldFx(card.id,'-SQUAD','fx-squad-lost');
        }
      } else if(squad.effect==='atk'){
        if(active&&!card.squadAtkBonus){
          card.squadAtkBonus=squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} ATK.`,'hl');
          queueFieldFx(card.id,'SQUAD!','fx-squad');
        } else if(!active&&card.squadAtkBonus){
          card.squadAtkBonus=0;
          lg(`${card.name}: squad broken — ATK bonus lost.`,'die');
          queueFieldFx(card.id,'-SQUAD','fx-squad-lost');
        }
      } else if(squad.effect==='armor'){
        // Только флаг здесь — как squadAtkBonus, а не как squadMaxHpBonus (та ветка выше
        // мутирует maxHp/hp напрямую). Сам пересчёт итогового armorMax/armor (с учётом
        // ЕЩЁ aura:armor от других карт на поле и world_armor) — в recalcArmor(), которая
        // вызывается СРАЗУ после checkSquadBonuses() на каждом её call site, так что этот
        // флаг всегда свежий к моменту, когда recalcArmor его читает.
        if(active&&!card.squadArmorBonus){
          card.squadArmorBonus=squad.val;
          lg(`Squad bonus! ${card.name} +${squad.val} Armor.`,'hl');
          queueFieldFx(card.id,'SQUAD!','fx-squad');
        } else if(!active&&card.squadArmorBonus){
          card.squadArmorBonus=0;
          lg(`${card.name}: squad broken — Armor bonus lost.`,'die');
          queueFieldFx(card.id,'-SQUAD','fx-squad-lost');
        }
      } else if(squad.effect==='param'){
        if(active&&!card.squadParam){
          card.squadParam={[squad.param]:squad.val};
          lg(`Squad bonus! ${card.name} ${squad.param} upgraded to ${squad.val}.`,'hl');
          queueFieldFx(card.id,'SQUAD!','fx-squad');
        } else if(!active&&card.squadParam){
          card.squadParam=null;
          lg(`${card.name}: squad broken — ${squad.param} bonus lost.`,'die');
          queueFieldFx(card.id,'-SQUAD','fx-squad-lost');
        }
      }
    });
  });
}

// Armor — same "own tag + squad + world + aura-from-другое-существо" stacking model as
// maxHp (applyAuras() above), but MUCH simpler to maintain: armor's "own" contribution is
// always freely re-derivable from the card's own `armor:N` tag (a fixed DEFS value that
// NEVER mutates at runtime), so — unlike maxHp, which needs a stored `baseMaxHp` snapshot
// because its own value ISN'T tag-derived — this just recomputes the full total fresh on
// every pass and diffs against the card's own previous `armorMax` to decide headroom
// behaviour. No `baseMaxHp`-style bookkeeping needed anywhere.
//
// MUST be called AFTER checkSquadBonuses() at every one of ITS call sites (search for
// "checkSquadBonuses(" — recalcArmor() should follow every single one), so squadArmorBonus
// is always freshly set before this reads it. Independent of applyAuras() — doesn't need to
// run in any particular order relative to it, only relative to checkSquadBonuses().
//
// Headroom rule (author spec, 2026-07-10): if a creature is CURRENTLY AT its armor cap when
// the cap grows (new squad/aura/world source), its current armor grows by the same amount
// (2/2 → 3/3, stays full). If it's NOT at cap (already took a hit this turn, e.g. 1/2), the
// current NUMBER stays exactly the same — the new headroom is just unusable until the next
// refill at the start of the owner's own turn (1/2 → 1/3, not 2/3) — see endTurn().
// If the cap SHRINKS (aura source dies, squad breaks), current armor is clamped down to fit.
function recalcArmor(faction){
  const cur=G[faction];
  const auraSources=cur.field.filter(c=>!c.spell&&!c.world&&!c.artifact&&hasTag(c,'aura:armor'));
  const worldArmorVal=(cur.world&&hasTag(cur.world,'world_armor'))?(getTagVal(cur.world,'world_armor')||1):0;
  const worldIsSource=worldArmorVal>0;
  cur.field.forEach(a=>{
    if(a.spell||a.world||a.artifact) return;
    // Aura sources never buff themselves — same rule as aura:atk/aura:maxhp above.
    const auraBonus=auraSources.reduce((sum,src)=>src.id===a.id?sum:sum+(getTagVal(src,'aura:armor')||1),0);
    // Persisted separately from armorMax's total — NOT used for the absorb/refill math
    // (that only ever needs the combined armorMax), only so _cardStatusEntries() (render.js)
    // can show "this card is receiving an armor aura/world bonus" the same way it already
    // does for atkBonus/worldMaxHpBonus. See bug report 2026-07-10 — these were silently
    // missing from the status panel because nothing was ever storing them on the card.
    a.auraArmorBonus=auraBonus;
    a.worldArmorBonus=worldArmorVal;
    const newMax=(getTagVal(a,'armor')||0)+(a.squadArmorBonus||0)+worldArmorVal+auraBonus;
    if(a.armorMax===undefined){
      // First time this card has ever been through this function (just entered the field,
      // was revived/raised, etc) — no previous partial state to preserve, start at full,
      // same as any creature's armor always has on entry.
      a.armorMax=newMax;
      a.armor=newMax;
    } else if(newMax!==a.armorMax){
      // wasFull — deliberately NOT `&&a.armorMax>0`. A card sitting at 0/0 (no armor source
      // at all yet) is trivially "at its cap" too — 0 used out of 0 available is still full,
      // same as 2/2. Requiring armorMax>0 here was the bug reported 2026-07-10: a 3rd
      // Merchird completing the squad correctly gave the FRESH entrant 1/1 (its own
      // "armorMax===undefined" first-time branch above), but the two ALREADY-on-field
      // Merchirds — sitting at a legitimate 0/0 from their own earlier first-time pass —
      // failed this check (0>0 is false) and got clamped to 0/1 instead of growing to 1/1.
      const wasFull=(a.armor||0)===a.armorMax;
      a.armorMax=newMax;
      a.armor=wasFull?newMax:Math.min(a.armor||0,newMax);
    }
  });
  // Логи — только для карт, у которых явно взведён флаг "залогировать этот пересчёт"
  // (аура только что вошла на поле / world только что сменился), тот же паттерн, что у
  // _auraAtkLog/_auraMaxLog в applyAuras() — иначе КАЖДЫЙ вызов recalcArmor (а их много,
  // после каждого checkSquadBonuses) спамил бы лог даже когда реально ничего не изменилось.
  if(cur._auraArmorLog){
    const src=cur.field.find(c=>c.id===cur._auraArmorLog);
    if(src){
      const affected=cur.field.filter(a=>a.id!==src.id&&!a.spell&&!a.world&&!a.artifact&&hasTag(src,'aura:armor'));
      if(affected.length>0){
        setTimeout(()=>playSfx('baf'), 150);
        lg(`${src.name}: Armor aura → ${affected.map(a=>`${a.name}(${a.armor}/${a.armorMax})`).join(', ')}.`,'hl');
        affected.forEach(a=>{
          const aId=a.id;
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(aId,'+Armor','maxhp')));
        });
      }
    }
    cur._auraArmorLog=null;
  }
  if(cur._worldArmorLog&&worldIsSource){
    const affected=cur.field.filter(a=>!a.spell&&!a.world&&!a.artifact);
    if(affected.length>0){
      setTimeout(()=>playSfx('baf'), 150);
      lg(`${cur.world.name}: Armor aura → ${affected.map(a=>`${a.name}(${a.armor}/${a.armorMax})`).join(', ')}.`,'hl');
    }
    cur._worldArmorLog=false;
  }
}


function doSacrifice_target(card){
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact){
    lg('Select one of your creatures.','hint');return;
  }
  playSfx('card_spell_atack');
  const altar=G[G.turn].artifacts.find(a=>hasTag(a,'sacrifice'));
  if(altar){altar.exhausted=true;lg('Altar exhausted until next turn.','die');}
  else lg('[DBG] Altar not found in artifacts!');
  const cur=G[G.turn];
  // Baseline payoff so this is never a pure downgrade without HUNGER/REAPER on
  // board — those still stack additionally on top of this (draw/heal-base).
  // Card draw added 2026-07-10 (author call) alongside the essence — sacrifice
  // now pays back both a resource AND a fresh card, not just the former.
  cur.ess+=1;
  const drewCard = drawCardsAnimated(G.turn, 1)>0;
  lg(`${card.name} sacrificed to the Altar! +1 Essence${drewCard?' & 1 card':''}.`,'die');
  queueFieldFx(card.id,'SACRIFICED!','fx-sacrifice'); // плейсхолдер — позже заменится на гифку
  killCard(card,G.turn);
  G.phase='action';
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

function cancelPendingSpell(){
  const card=G.pendingSpell;
  if(card){
    // Refund — unlike Shard/Altar (which act on cards already on the field),
    // a spell's cost+card were already spent from hand in doPlay() before we
    // paused for a target. Cancelling with no valid target shouldn't just
    // waste both for nothing.
    G[G.turn].ess+=card.cost;
    G[G.turn].hand.push(card);
    lg(`${card.name} cancelled — refunded.`,'hint');
  }
  G.pendingSpell=null;G.phase='action';G.sel=null;render();
}

function doSpellDmgTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  const dmg=getTagVal(spell,'spell_dmg_target')||3;
  playSfx('card_spell_atack');
  lg(`${spell.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  const oppK=G.turn==='tea'?'jeet':'tea';
  queueFieldFx(card.id,'HIT!','fx-spell-dmg'); // плейсхолдер — позже заменится на гифку
  dmgCard(card,dmg,oppK,true);
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  checkWin();render();
}

function doSpellBuffTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact||card.sleeping||card.exhausted||card.feared){
    lg('Select an ally that can act this turn.','hint');return;
  }
  const val=getTagVal(spell,'spell_buff_temp')||2;
  playSfx('baf');
  // Dedicated field — NOT atkBonus, which applyAuras() resets+recalculates on
  // every single card play (it's exclusively for the aura:atk system). Reusing
  // it here made the trick's bonus vanish the instant ANY other card was played,
  // even without ending the turn.
  card.tempAtkBonus=(card.tempAtkBonus||0)+val;
  lg(`${spell.name}: ${card.name} +${val} ATK until end of turn.`,'hl');
  const buffId=card.id;
  setTimeout(()=>showFloat(buffId, `+${val}`, 'atk'), 50);
  queueFieldFx(card.id,'BUFFED!','fx-spell-buff'); // плейсхолдер — позже заменится на гифку
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  render();
}

function doSpellDispelTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  playSfx('card_spell_atack');
  const removed=[];
  if(card.feared){card.feared=false;removed.push('fear');}
  if(card.burning){card.burning=false;removed.push('burn');}
  if(card.atkBonus){card.atkBonus=0;removed.push('atk buff');}
  if(card.squadAtkBonus){card.squadAtkBonus=0;removed.push('squad atk');}
  if(card.squadMaxHpBonus){card.hp=Math.min(card.hp,card.maxHp-card.squadMaxHpBonus);card.maxHp-=card.squadMaxHpBonus;card.squadMaxHpBonus=0;removed.push('squad maxHP');}
  if(card.squadArmorBonus){card.armor=Math.min(card.armor,(card.armorMax||0)-card.squadArmorBonus);card.armorMax=(card.armorMax||0)-card.squadArmorBonus;card.squadArmorBonus=0;removed.push('squad armor');}
  if(card.squadParam){card.squadParam=null;removed.push('squad bonus');}
  lg(`${spell.name}: ${card.name} dispelled${removed.length?' ('+removed.join(', ')+')':' (nothing to remove)'}.`,'imp');
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  render();
}

function doSpellUntapTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  playSfx('baf');
  const wasReady=!card.sleeping&&!card.exhausted;
  card.sleeping=false;card.exhausted=false;
  lg(`${spell.name}: ${card.name} is active${wasReady?' (was already active)':''}!`,'hl');
  queueFieldFx(card.id,'AWAKENED!','fx-untap'); // плейсхолдер — позже заменится на гифку
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  render();
}

function doShardTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  playSfx('card_spell_atack');
  const artifact=G[G.turn].artifacts.find(a=>hasTag(a,'shard'));
  const baseDmg=getTagVal(artifact,'shard')||2;
  const dmg=card.feared?baseDmg+1:baseDmg;
  const fearNote=card.feared?' (feared +1)':'';
  lg(`${artifact.name}: ${card.name} takes ${dmg} damage${fearNote}!`,'dmg');
  queueFieldFx(card.id,'SHARD!','fx-shard'); // плейсхолдер — позже заменится на гифку
  dmgCard(card,dmg,oppK,true);
  if(artifact) artifact.exhausted=true;
  G.phase='action';G.sel=null;
  checkWin();render();
}

function openGraveModal(faction){
  playSfx('graveyard');
  const grave = G[faction].grave.filter(c=>!c.voided);
  const modal = document.getElementById('graveModal');
  const title = document.getElementById('graveModalTitle');
  const cards = document.getElementById('graveModalCards');
  title.textContent = 'Graveyard';
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
  const innerModal = modal.querySelector('.grave-modal');
  if(graveBtn && innerModal){
    const r = graveBtn.getBoundingClientRect();
    innerModal.style.left   = r.left + 'px';
    innerModal.style.bottom = (window.innerHeight - r.top + 14) + 'px';
    innerModal.style.top    = '';
    graveBtn.classList.add('open'); // ← добавь
  }

  modal.classList.remove('hidden');
  if(innerModal){
    innerModal.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void innerModal.offsetWidth;
    innerModal.classList.add('modal-pop-in-fast');
  }
}

function closeGraveModal(){
  document.querySelectorAll('.btn-graveyard').forEach(b=>b.classList.remove('open'));
  const modal=document.getElementById('graveModal');
  const inner=modal.querySelector('.grave-modal');
  const finish=()=>modal.classList.add('hidden');
  if(inner){
    inner.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-out-fast');
    setTimeout(finish, 125);
  } else {
    finish();
  }
}


function endTurn(){
  if(G.mode==='vsai'&&G.turn===G.aiFaction&&!G._aiIsEnding) return; // человек не может завершить ход ИИ
  playSfx('yellow_buttom');
  G.sel=null;G.phase='action';G.previewCard=null;
  const next=G.turn==='tea'?'jeet':'tea';

  // sleeping/feared/tempAtkBonus — как раньше, снимаются у ВЫХОДЯЩЕГО игрока сразу
  // (т.е. к ходу соперника его карты уже не "спят" — полноценно отвечают на атаки).
  // exhausted — намеренно НЕ здесь по умолчанию: см. ниже, снимается только к СВОЕМУ
  // следующему ходу владельца, чтобы уставшая карта весь ход соперника оставалась
  // уязвима без ответки (см. AI BALANCE NOTES / CLAUDE.md "Version 1.01", п.11).
  // Исключение — тег `untamed` («Неукротимость», Anime pink Mood, см. Lore/Trait
  // mapping): такое существо снимает exhausted уже ЗДЕСЬ, в момент когда его
  // собственный ход заканчивается и начинается ход соперника — намеренный override
  // общего правила для конкретных редких карт, не баг.
  G[G.turn].field.forEach(c=>{
    c.sleeping=false;c.feared=false;c.tempAtkBonus=0;
    if(hasTag(c,'untamed')) c.exhausted=false;
  });
  G[G.turn].artifacts.forEach(a=>{a.sleeping=false;});
  G.turn=next;
  const cur=G[G.turn];
  // exhausted снимается здесь — у ИГРОКА, ЧЕЙ ход начинается, а не у того, чей закончился.
  // Артефакты — туда же, для визуальной консистентности (симметрично картам, хотя
  // геймплейно соперник артефакт всё равно не активирует).
  // Armor — тоже обновляется здесь, у владельца в начале ЕГО хода (не хода соперника,
  // в отличие от untamed выше) — "трата первой до HP, обновляется каждый ход игрока,
  // чья это карта". Рефилл идёт до armorMax (own tag + squad + aura + world — см.
  // recalcArmor()), не только до собственного тега — этот кусок больше не трогает
  // getTagVal напрямую, только уже посчитанный armorMax.
  cur.field.forEach(c=>{
    c.exhausted=false;
    if(c.armorMax>0){
      if(c.armor<c.armorMax) lg(`${c.name}'s armor refills to ${c.armorMax}.`,'imp');
      c.armor=c.armorMax;
    }
  });
  cur.artifacts.forEach(a=>{a.exhausted=false;});
  cur.burned=false;
  if(G.secondFirstTurn&&G.turn===G.secondFaction){
    cur.essMax=1;cur.ess=1;G.secondFirstTurn=false;
  } else {
    cur.essMax+=1;cur.ess=cur.essMax;
  }
  flashEssenceGain(G.turn);
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(cur.world) triggerAbilities(cur.world,'on_turn');
  cur.artifacts.forEach(a=>triggerAbilities(a,'on_turn'));
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  recalcArmor(G.turn);
  
  [...cur.field].forEach(c=>triggerAbilities(c,'on_turn'));
  cur.field.forEach(c=>{
  });

    [...G[G.turn].field].forEach(card=>{
    if(card.burning&&!card.spell&&!card.world&&!card.artifact){
      // Burn deliberately bypasses armor (author call, 2026-07-10) — it always
      // hits HP directly, unlike every other damage source which goes through
      // dmgCard()'s armor-absorbs-first math. Burn is meant to be a reliable,
      // un-mitigatable ongoing HP loss.
      card.hp-=1;
      const burnId=card.id;
      const lethal=card.hp<=0;
      // Same as dmgCard() — skip the shake on a lethal burn tick, so it doesn't
      // play at the same time as the death fade added just below.
      if(!lethal){
        requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(burnId)));
      }
      requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(burnId,'-1','dmg')));
      lg(`${card.name} burns for 1 HP → ${card.hp}/${card.maxHp}.`,'dmg');
      if(lethal){
        const f=G[G.turn].field.includes(card)?G.turn:oppK;
        // Сгоревшая карта уходит в войд, а не на кладбище — общий diff-механизм в rZone()
        // не всегда успевал поймать её между этим циклом и render() в конце хода,
        // поэтому анимацию смерти (dying + удаление через 400мс) вешаем явно здесь.
        const cardEl=document.querySelector(`.card-small[data-id="${card.id}"]`);
        if(cardEl){
          cardEl.classList.add('dying');
          cardEl.style.pointerEvents='none';
          setTimeout(()=>{ if(cardEl.parentElement) cardEl.remove(); }, 400);
        }
        killCard(card,f,true); // true = burned to death → void
      }
    }
  });
  checkWin();

  const skipDraw=(G.turn===G.secondFaction&&G.turnNum===1);
  if(!skipDraw){
    const n=1+cur.extraDraw;
    for(let i=0;i<n;i++)if(cur.deck.length>0)cur.hand.push(cur.deck.shift());
  }

  if(G.turn===G.firstFaction)G.turnNum++;
  logTurnSnapshot(G.turn);
  lg(`─ Turn ${G.turnNum}: ${G.turn.toUpperCase()} · ${cur.ess}/${cur.essMax} Essence ─`,'trn');
  const lp=document.getElementById('logPanel');if(lp)lp.classList.remove('open');
  render();

  if(G.mode==='vsai'&&G.turn===G.aiFaction&&typeof runAiTurn==='function'){
    setTimeout(()=>runAiTurn(),600);
  } else if(G.mode!=='vsai'&&!G.gameOver&&typeof showPassScreen==='function'){
    // Hotseat: hand the device over before the next player sees anything —
    // same modal as the initial tea->jeet mulligan handoff, reused generically.
    showPassScreen(G.turn, null);
  }
}

// ── WIN / MULLIGAN / UTILS ─────────────────────────────────
function checkWin(){
  if(G.gameOver) return;
  if(G.tea.hp<=0){G.gameOver=true;showWin('jeet');}
  if(G.jeet.hp<=0){G.gameOver=true;showWin('tea');}
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

// Spacebar: confirms whichever modal is currently open (mulligan Ready, pass-device
// Ready, win modal, exit/restart confirm) — or, if none is open, ends the turn (old
// behaviour). Modal check runs first so the two shortcuts never both fire at once.
document.addEventListener('keydown',(e)=>{
  if(e.code!=='Space') return;
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA') return; // don't hijack Space while typing (e.g. catalog search)

  const modalButtons=[
    ['confirmModal','confirmYesBtn'],
    ['winModal','winBtn'],
    ['mulliganScreen','mulliganReadyBtn'],
    ['passScreen','passReadyBtn'],
  ];
  for(const [modalId,btnId] of modalButtons){
    const modal=document.getElementById(modalId);
    if(modal&&!modal.classList.contains('hidden')){
      e.preventDefault();
      const btn=document.getElementById(btnId);
      if(btn&&!btn.disabled) btn.click();
      return;
    }
  }

  if(document.getElementById('game')&&document.getElementById('game').style.display!=='none'){
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
// Определяет, в каком стат-баре (top/oppStats или bottom/playerStats) сейчас физически
// отображается фракция `faction` — используется flashBase/flashEssenceGain, чтобы подсветка
// шла у ТОЙ фракции, что реально получила урон/хил, а не залипала сверху/снизу.
// В Hot Seat верх/низ определяет чей сейчас ход (см. reorderZones); в VS AI верх/низ
// закреплены за aiFaction/humanFaction и от хода НЕ зависят — раньше это не учитывалось,
// из-за чего урон по базе всегда мигал сверху, а хил — всегда снизу, независимо от того,
// кому из игроков это реально принадлежало.
function _statsElIdForFaction(faction){
  if(G.mode==='vsai'){
    return faction===G.humanFaction ? 'playerStats' : 'oppStats';
  }
  return faction===G.turn ? 'playerStats' : 'oppStats';
}
// who — либо абсолютная фракция ('tea'/'jeet'), либо относительное 'opp'/'player'
// (относительно ТЕКУЩЕГО хода — используется, когда событие произошло "от лица" атакующего,
// например урон по базе противника при атаке). Сначала переводим в абсолютную фракцию,
// затем резолвим в DOM-элемент через _statsElIdForFaction().
function _resolveFlashFaction(who){
  if(who==='player') return G.turn;
  if(who==='opp') return G.turn==='tea'?'jeet':'tea';
  return who; // уже абсолютная фракция 'tea'/'jeet'
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
    const elId=_statsElIdForFaction(_resolveFlashFaction(who));
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
// ── Squad-activated / Fear-applied overlay popup (text placeholder — swap for
// a gif later) — queued the same way as flashBase, since .card-small elements
// are destroyed and rebuilt by render() every time, so anything created before
// render() runs would just be thrown away.
function queueFieldFx(cardId, label, cls){
  if(!G._pendingFieldFx) G._pendingFieldFx=[];
  G._pendingFieldFx.push({cardId,label,cls});
}
function _applyPendingFieldFx(){
  if(!G._pendingFieldFx||G._pendingFieldFx.length===0) return;
  const fx=G._pendingFieldFx;
  G._pendingFieldFx=[];
  fx.forEach(({cardId,label,cls})=>{
    const el=document.querySelector(`.card-small[data-id="${cardId}"]`);
    if(!el) return;
    const pop=document.createElement('div');
    pop.className=`field-fx-popup ${cls}`;
    pop.textContent=label;
    el.appendChild(pop);
    setTimeout(()=>pop.remove(),1200);
  });
}
function flashBase(who, type, amount){
  // Queue flash to apply after render/reorderZones rewrites innerHTML
  if(!G._pendingFlash) G._pendingFlash=[];
  G._pendingFlash.push({who,type,amount});
}
function _applyPendingFlash(){
  if(!G._pendingFlash||G._pendingFlash.length===0) return;
  const flashes=G._pendingFlash;
  G._pendingFlash=[];
  flashes.forEach(({who,type,amount})=>{
    const targetFaction=_resolveFlashFaction(who);
    const elId=_statsElIdForFaction(targetFaction);
    const bar=document.getElementById(elId);
    if(!bar) return;
    const cls=type==='dmg'?'flash-red':'flash-green';
    const hpBox=bar.querySelector('.stat-hp-box');
    [bar.querySelector('.player-name-box'), hpBox].forEach(target=>{
      if(!target) return;
      target.classList.remove('flash-red','flash-green');
      void target.offsetWidth;
      target.classList.add(cls);
      setTimeout(()=>target.classList.remove('flash-red','flash-green'), 500);
    });
    // "Viewer" — whose perspective the screen-edge glow/shake represents.
    // In vs-AI it's ALWAYS the human, regardless of whose turn it currently
    // is (G.turn flips to the AI's faction during its turn, but the human is
    // still the one watching). In hotseat there's no fixed identity, so we
    // fall back to G.turn — whoever currently holds the device is attacking,
    // so THEY are the one who "caused" any base damage that fires right now.
    const viewer=G.mode==='vsai'?G.humanFaction:G.turn;
    if(targetFaction===viewer){
      // MY OWN base — screen-edge glow (dmg=red / heal=green) + impact shake
      // (dmg only; a heal shouldn't recoil you).
      const edge=document.getElementById('screenEdgeFlash');
      if(edge){
        edge.classList.remove('flash-red','flash-green');
        void edge.offsetWidth;
        edge.classList.add(cls);
        setTimeout(()=>edge.classList.remove('flash-red','flash-green'), 500);
      }
      if(type==='dmg'){
        [document.getElementById('playerHandZone'), bar, document.getElementById(targetFaction+'BottomBar')]
          .forEach(el=>{
            if(!el) return;
            el.classList.remove('zone-shake');
            void el.offsetWidth;
            el.classList.add('zone-shake');
            setTimeout(()=>el.classList.remove('zone-shake'), 350);
          });
      }
    } else if(type==='dmg'){
      // THE OPPONENT's base took damage (viewer just landed a hit on them) —
      // their zones nudge UP instead of down, no red screen-edge glow (it's
      // not a threat to the viewer, just feedback that the hit landed).
      [document.getElementById('oppHandZone'), bar, document.getElementById(targetFaction+'BottomBar')]
        .forEach(el=>{
          if(!el) return;
          el.classList.remove('zone-shake-up');
          void el.offsetWidth;
          el.classList.add('zone-shake-up');
          setTimeout(()=>el.classList.remove('zone-shake-up'), 350);
        });
    }
    // Floating +N/-N over the base's HP box — same look as the creature heal/dmg
    // popups (showFloat), just anchored to .stat-hp-box instead of a card.
    if(amount&&hpBox){
      const num=document.createElement('div');
      num.className=`float-number float-number-base ${type==='dmg'?'fnb-dmg':'fnb-heal'}`;
      num.textContent=`${type==='dmg'?'-':'+'}${amount}`;
      hpBox.appendChild(num);
      setTimeout(()=>num.remove(),900);
    }
  });
}

// ── Случайный текстовый глитч на значениях HP/эссенции в стат-барах ──
function triggerStatGlitch(){
  const targets=[...document.querySelectorAll('.hp-val, .ess-val')];
  if(targets.length===0) return;
  const el=targets[Math.floor(Math.random()*targets.length)];
  el.classList.remove('glitch-text');
  void el.offsetWidth; // форсируем reflow, чтобы анимация перезапустилась, если уже висела
  el.classList.add('glitch-text');
  setTimeout(()=>el.classList.remove('glitch-text'), 250);
}
function scheduleStatGlitch(){
  const delay=4000+Math.random()*8000; // раз в 4-12 секунд, каждый раз новое случайное время
  setTimeout(()=>{ triggerStatGlitch(); scheduleStatGlitch(); }, delay);
}
scheduleStatGlitch();

// ── Случайный глитч тайтла в хедере игры (та же логика, что и triggerStatGlitch выше) ──
function triggerTitleGlitch(){
  // Таргетим .title-glitch-wrap в хедере игры — этот элемент виден ВСЕГДА во время партии.
  // Раньше таргетили .landing-title, но лендинг-экран скрыт во время игры (display:none),
  // поэтому глитч там "срабатывал", но никто его не видел.
  const el=document.querySelector('.title-glitch-wrap');
  if(!el) return;
  el.classList.remove('glitching');
  void el.offsetWidth;
  el.classList.add('glitching');
  setTimeout(()=>el.classList.remove('glitching'), 350);
}
function scheduleTitleGlitch(){
  const delay=4000+Math.random()*8000;
  setTimeout(()=>{ triggerTitleGlitch(); scheduleTitleGlitch(); }, delay);
}
scheduleTitleGlitch();
