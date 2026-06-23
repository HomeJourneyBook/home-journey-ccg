function getTagVal(card, tagName){
  const t=(card.tags||[]).find(t=>t===tagName||t.startsWith(tagName+':'));
  if(!t) return null;
  // Remove tagName prefix to get value: 'aura:maxhp:1' with tagName='aura:maxhp' -> '1'
  const rest=t.slice(tagName.length);
  if(!rest||rest==='') return true;
  const valStr=rest.startsWith(':')?rest.slice(1):rest;
  const num=parseInt(valStr);
  return isNaN(num)?valStr:num;
}
function hasTag(card, tagName){ return getTagVal(card,tagName)!==null; }

function getAbilities(card){
  const ab=[];
  for(const tag of (card.tags||[])){
    const [name,...rest]=tag.split(':');
    const val=rest.length?parseInt(rest[0]):1;
    switch(name){
      case 'vanguard':   ab.push({timing:'passive',effect:'vanguard'}); break;
      case 'provoke':    ab.push({timing:'passive',effect:'provoke'}); break;
      case 'pierce':     ab.push({timing:'passive',effect:'pierce'}); break;
      case 'fear':       ab.push({timing:'on_attack',effect:'fear'}); break;
      case 'burn':       ab.push({timing:'on_attack',effect:'burn'}); break;
      case 'aoe':        ab.push({timing:'active',effect:'aoe',val}); break;
      case 'enter_aoe':  ab.push({timing:'on_enter',effect:'aoe',val}); break;
      case 'draw':
        if(card.spell)                    ab.push({timing:'instant',effect:'draw',val});
        else if(card.world||card.artifact) ab.push({timing:'on_turn',effect:'draw',val});
        else if(card.unique)               ab.push({timing:'on_turn',effect:'draw',val});
        else                               ab.push({timing:'on_attack',effect:'draw',val});
        break;
      case 'heal':
        if(card.artifact||card.world) ab.push({timing:'on_turn',effect:'hp_add',val,target:'all'});
        else                          ab.push({timing:'active',effect:'hp_add',val});
        break;
      case 'regen':      ab.push({timing:'on_turn',effect:'hp_add',val,self:true}); break;
      case 'revive':     ab.push({timing:'instant',effect:'revive',val}); break;
      case 'salvage':    ab.push({timing:'instant',effect:'salvage'}); break;
      case 'bounce':     ab.push({timing:'instant',effect:'bounce'}); break;
      case 'ess_max':
        if(card.world||card.artifact) ab.push({timing:'on_turn',effect:'ess_max',val});
        else                          ab.push({timing:'instant',effect:'ess_max',val});
        break;
      case 'ess_add':
        if(card.world||card.artifact) ab.push({timing:'on_turn',effect:'ess_add',val});
        else                          ab.push({timing:'instant',effect:'ess_add',val});
        break;
      // maxhp_add removed - use aura:maxhp for passive, active ability removed
      case 'hp_add':
        if(card.world)         ab.push({timing:'on_enter',effect:'hp_add',val,target:'all'});
        else if(card.artifact) ab.push({timing:'on_turn',effect:'hp_add',val,target:'all'});
        else                   ab.push({timing:'active',effect:'hp_add',val});
        break;
      case 'bushido':      ab.push({timing:'passive',effect:'bushido'}); break;
      case 'on_kill_base':         ab.push({timing:'on_kill',effect:'hp_base',val}); break;
      case 'on_any_death_base':    ab.push({timing:'on_any_death',effect:'hp_base',val}); break;
      case 'on_play_creature':     ab.push({timing:'on_play_creature',effect:'hp_base',val}); break;
      case 'sacrifice':            ab.push({timing:'active',effect:'sacrifice'}); break;
      case 'raise':              ab.push({timing:'on_turn',effect:'raise',val}); break;
      case 'rage':         ab.push({timing:'on_attack',effect:'rage',val}); break;
      case 'draw_attack': ab.push({timing:'on_attack',effect:'draw',val}); break;
      case 'aura':
        {const [,type,n]=tag.split(':');
        const auraVal=parseInt(n)||1;
        if(type==='atk'){
          // passive aura: ATK bonus maintained each turn via applyAuras()
          ab.push({timing:'passive',effect:'aura',auraType:'atk',val:auraVal});
        } else if(type==='maxhp'){
          // maxhp aura applied manually via applyMaxHpAura() in game.js
          // NOT through triggerAbilities to avoid double application
          ab.push({timing:'_manual',effect:'aura',auraType:'maxhp',val:auraVal});
        }} break;
      case 'unique': case 'spell': case 'world': case 'artifact': break;
    }
  }

  // revive:full sets full HP flag
  const hasReviveFull=card.tags&&card.tags.some(t=>t==='revive:full');
  if(hasReviveFull){
    const idx=ab.findIndex(a=>a.effect==='revive');
    if(idx>=0) ab[idx].val='full';
  }

  // Unique card special abilities — only truly unique mechanics remain here
  switch(card.key){
    // All legendaries now handled via tags in data.js
  }

  return ab;
}

function applyMaxHpAura(src, faction){
  const val=getTagVal(src,'aura:maxhp')||1;
  const affected=[];
  G[faction].field.forEach(a=>{
    if(a.id!==src.id&&!a.spell&&!a.world&&!a.artifact){
      const wasFull=a.hp===a.maxHp;
      a.maxHp+=val;
      if(wasFull) a.hp+=val;
      a.maxHpBonus=(a.maxHpBonus||0)+val;
      affected.push(`${a.name} (${a.hp}/${a.maxHp})`);
    }
  });
  if(affected.length>0)
    lg(`${src.name}: +${val} maxHP → ${affected.join(', ')}.`,'hl');
  else
    lg(`${src.name}: no allies to buff.`,'hl');
}

function removeMaxHpAura(src, faction){
  const val=getTagVal(src,'aura:maxhp')||1;
  G[faction].field.forEach(a=>{
    if(!a.spell&&!a.world&&!a.artifact){
      a.maxHp=Math.max(1,a.maxHp-val);
      a.hp=Math.min(a.hp,a.maxHp);
      a.maxHpBonus=Math.max(0,(a.maxHpBonus||0)-val);
    }
  });
  lg(`${src.name} died — maxHP aura removed.`,'die');
}

function triggerAbilities(card, timing, ctx={}){
  const abs=getAbilities(card).filter(a=>a.timing===timing);
  const curK=G.turn;
  const oppK=curK==='tea'?'jeet':'tea';
  const cur=G[curK];

  for(const a of abs){
    switch(a.effect){

      case 'aoe':
        [...G[oppK].field].forEach(t=>dmgCard(t,a.val,oppK));
        lg(`${card.name}: ${a.val} dmg to all enemies!`,'imp');
        break;

      case 'burn':
        if(ctx.target&&ctx.target.hp>0&&!ctx.target.voided){
          ctx.target.burning=true;
          lg(`${card.name}: ${ctx.target.name} is on fire!`,'imp');
        } break;

      case 'fear':
        if(ctx.target&&ctx.target.hp>0&&!ctx.target.voided){
          ctx.target.feared=true;
          lg(`${card.name}: ${ctx.target.name} is Feared!`,'imp');
        } break;

      case 'draw':
        // instant: spells draw immediately
        // on_attack: Ryvlen draws on each attack
        // on_turn: handled via extraDraw in endTurn — skip here
        if(a.timing==='instant'||a.timing==='on_attack'){
          for(let i=0;i<a.val;i++) if(cur.deck.length>0) cur.hand.push(cur.deck.shift());
          lg(`${card.name}: draws ${a.val} card(s).`,'imp');
        }
        break;

      // atk_all removed — replaced by aura:atk tag

      case 'aura':
        if(a.auraType==='maxhp'){
          applyMaxHpAura(card,curK);
        }
        // atk aura applied via applyAuras() - no action needed here
        break;

      // aura_enter removed — replaced by applyMaxHpAura() via aura:maxhp tag

      case 'bushido':
        // Passive - handled in getTargetableCards() and canAttackBase()
        break;

      // hp_all removed — replaced by applyMaxHpAura() via aura:maxhp tag

      case 'hp_base':
        // Heal base HP only, no maxHP increase
        G[curK].hp=Math.min(G[curK].maxHp, G[curK].hp+a.val);
        lg(`${card.name}: ${curK} base +${a.val} HP → ${G[curK].hp}/${G[curK].maxHp}.`,'hl'); break;

      // on_any_death handled directly in killCard()

      case 'hp_add':
        if(a.target==='all'){
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact)
              ally.hp=Math.min(ally.maxHp,ally.hp+a.val);
          });
          lg(`${card.name}: heal all allies +${a.val} HP.`,'hl');
        } else if(a.self){
          if(!card.spell&&!card.world&&!card.artifact){
            const regenVal=(card.squadParam&&card.squadParam.regen)||a.val;
            card.hp=Math.min(card.maxHp,card.hp+regenVal);
            lg(`${card.name}: regen +${regenVal} HP → ${card.hp}/${card.maxHp}.`,'hl');
          }
        } else if(ctx.target){
          ctx.target.hp=Math.min(ctx.target.maxHp,ctx.target.hp+a.val);
          lg(`${card.name}: +${a.val} HP to ${ctx.target.name} → ${ctx.target.hp}/${ctx.target.maxHp}.`,'hl');
        } else {
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact)
              ally.hp=Math.min(ally.maxHp,ally.hp+a.val);
          });
          lg(`${card.name}: heal all allies +${a.val} HP.`,'hl');
        } break;

      // maxhp_add removed — use aura:maxhp instead

      case 'bounce':
        [...G.tea.field].forEach(x=>{resetC(x);G.tea.hand.push(x);});
        [...G.jeet.field].forEach(x=>{resetC(x);G.jeet.hand.push(x);});
        G.tea.field=[];G.jeet.field=[];
        lg(`${card.name}: all cards return to hands!`,'imp'); break;

      case 'revive':
        {const srcGrave=a.any
          ? [...cur.grave,...G[oppK].grave].filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided)
          : cur.grave.filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided);
        if(srcGrave.length>0){
          const r=srcGrave[srcGrave.length-1];
          cur.grave=cur.grave.filter(x=>x.id!==r.id);
          G[oppK].grave=G[oppK].grave.filter(x=>x.id!==r.id);
          const def=DEFS[r.key];
          if(a.val==='full'&&def){r.hp=def.hp;r.maxHp=def.hp;}
          else{r.hp=Math.min(a.val||1,r.maxHp);}
          reviveCard(r,curK); // use reviveCard for proper aura/squad checks
          lg(`${card.name}: revives ${r.name}!`,'imp');
        } else lg(`${card.name}: graveyard empty.`);} break;

      case 'salvage':
        {const grave2=cur.grave.filter(x=>!x.voided);
        if(grave2.length>0){
          const r=grave2[grave2.length-1];
          cur.grave=cur.grave.filter(x=>x.id!==r.id);
          resetC(r);cur.hand.push(r);
          lg(`${card.name}: ${r.name} returned to hand!`,'imp');
        } else lg(`${card.name}: graveyard empty.`);} break;

      case 'ess_max':
        cur.essMax+=a.val;
        lg(`${card.name}: +${a.val} max Essence → ${cur.essMax}.`,'imp'); break;

      case 'ess_add':
        cur.ess+=a.val; // can exceed essMax temporarily this turn
        lg(`${card.name}: +${a.val} Essence → ${cur.ess}/${cur.essMax}.`,'imp'); break;

      case 'rage':
        // Permanently increase ATK each time this card attacks
        card.rageBonus=(card.rageBonus||0)+a.val;
        lg(`${card.name}: Rage! +${a.val} ATK → total ${card.atk+(card.atkBonus||0)+(card.rageBonus||0)} ATK.`,'imp');
        break;

      case 'raise':
        {const all=[...G[curK].grave,...G[oppK].grave].filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided);
        if(all.length>0){
          const r=all[all.length-1];
          G[curK].grave=G[curK].grave.filter(x=>x.id!==r.id);
          G[oppK].grave=G[oppK].grave.filter(x=>x.id!==r.id);
          // Reset state but keep base stats, set hp to raise value (NOT full)
          r.sleeping=true;r.exhausted=false;r.feared=false;r.burning=false;
          r.atkBonus=0;r.rageBonus=0;r.maxHpBonus=0;r.baseMaxHp=null;
          r.squadParam=null;r.squadAtkBonus=0;r.squadMaxHpBonus=0;
          r.f=curK;
          const def=DEFS[r.key];
          if(def) r.maxHp=def.hp; // restore base maxHp
          r.hp=a.val||1; // raise at 1 HP, not full
          G[curK].field.push(r);
          // Apply auras and squad bonuses
          if(hasTag(r,'aura:atk')) G[curK]._auraAtkLog=r.id;
          if(hasTag(r,'aura:maxhp')) G[curK]._auraMaxLog=r.id;
          applyAuras(curK);
          checkSquadBonuses(curK);
          lg(`${card.name} raises ${r.name} at ${r.hp} HP!`,'imp');
        } else {
          lg(`${card.name}: both graveyards empty.`,'die');
        }} break;
    }
  }
}
