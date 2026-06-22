function getTagVal(card, tagName){
  const t=(card.tags||[]).find(t=>t===tagName||t.startsWith(tagName+':'));
  if(!t) return null;
  const parts=t.split(':');
  return parts.length>1 ? parseInt(parts[1]) : true;
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
      case 'ess_max':    ab.push({timing:'instant',effect:'ess_max',val}); break;
      case 'ess_add':
        if(card.world||card.artifact) ab.push({timing:'on_turn',effect:'ess_add',val});
        else                          ab.push({timing:'instant',effect:'ess_add',val});
        break;
      case 'maxhp_add':
        if(card.world||card.artifact) ab.push({timing:'on_turn',effect:'maxhp_add',val,target:'all'});
        else                          ab.push({timing:'active',effect:'maxhp_add',val});
        break;
      case 'hp_add':
        if(card.world)         ab.push({timing:'on_enter',effect:'hp_add',val,target:'all'});
        else if(card.artifact) ab.push({timing:'on_turn',effect:'hp_add',val,target:'all'});
        else                   ab.push({timing:'active',effect:'hp_add',val});
        break;
      case 'bushido':      ab.push({timing:'passive',effect:'bushido'}); break;
      case 'on_kill_base': ab.push({timing:'on_kill',effect:'hp_base',val}); break;
      case 'rage':         ab.push({timing:'on_attack',effect:'rage',val}); break;
      case 'aura':
        {const [,type,n]=tag.split(':');
        const auraVal=parseInt(n)||1;
        if(type==='atk'){
          // ATK aura: passive, maintained each turn via applyAuras()
          ab.push({timing:'passive',effect:'aura',auraType:'atk',val:auraVal});
        } else if(type==='maxhp'){
          // maxHP aura: one-time on enter, removed on death
          ab.push({timing:'on_enter',effect:'aura',auraType:'maxhp',val:auraVal});
        }} break;
      case 'unique': case 'spell': case 'world': case 'artifact': break;
    }
  }

  // Fix revive:full + revive:any combo
  const hasReviveFull=card.tags&&card.tags.some(t=>t==='revive:full');
  if(hasReviveFull){
    const isAny=card.tags.includes('revive:any');
    const idx=ab.findIndex(a=>a.effect==='revive');
    if(idx>=0) ab[idx]={timing:'instant',effect:'revive',val:'full',any:isAny};
  }

  // Unique card special abilities — only truly unique mechanics remain here
  switch(card.key){
    // All legendaries now handled via tags in data.js
    // Reaper handled via on_kill_base tag
    // Phlegmor: raise last creature from any graveyard at 1 HP
    case 'j_phleg':
      ab.push({timing:'on_turn',effect:'raise'});
      break;
  }

  return ab;
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
        for(let i=0;i<a.val;i++) if(cur.deck.length>0) cur.hand.push(cur.deck.shift());
        lg(`${card.name}: draw ${a.val} card(s).`,'imp'); break;

      case 'atk_all':
        cur.field.forEach(ally=>{
          if(ally.id!==card.id&&!ally.spell&&!ally.world&&!ally.artifact)
            ally.atkBonus=(ally.atkBonus||0)+a.val;
        });
        lg(`${card.name}: all allies +${a.val} ATK!`,'imp'); break;

      case 'aura':
        if(a.auraType==='maxhp'){
          applyMaxHpAura(card,curK);
        }
        // atk aura applied via applyAuras() - no action needed here
        break;

      case 'aura_enter':
        // One-time aura on enter (Aslex: +1 maxHP to all allies)
        if(a.auraType==='maxhp'){
          cur.field.forEach(ally=>{
            if(ally.id!==card.id&&!ally.spell&&!ally.world&&!ally.artifact){
              const wasFull=ally.hp===ally.maxHp;
              ally.maxHp+=a.val;
              if(wasFull) ally.hp+=a.val;
            }
          });
          lg(`${card.name}: all allies +${a.val} maxHP!`,'hl');
        } break;

      case 'bushido':
        // Passive - handled in getTargetableCards() and canAttackBase()
        break;

      case 'hp_all':
        // Increases maxHP; if at full HP also increases current HP (Aslex)
        cur.field.forEach(ally=>{
          if(!ally.spell&&!ally.world&&!ally.artifact){
            const wasFull=ally.hp===ally.maxHp;
            ally.maxHp+=a.val;
            if(wasFull) ally.hp+=a.val;
          }
        });
        lg(`${card.name}: all allies +${a.val} maxHP!`,'hl'); break;

      case 'hp_base':
        // Heal base HP only, no maxHP increase
        G[curK].hp=Math.min(G[curK].maxHp, G[curK].hp+a.val);
        lg(`${card.name}: ${curK} base +${a.val} HP → ${G[curK].hp}/${G[curK].maxHp}.`,'hl'); break;

      case 'hp_add':
        if(a.target==='all'){
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact)
              ally.hp=Math.min(ally.maxHp,ally.hp+a.val);
          });
          lg(`${card.name}: heal all allies +${a.val} HP.`,'hl');
        } else if(a.self){
          if(!card.spell&&!card.world&&!card.artifact){
            card.hp=Math.min(card.maxHp,card.hp+a.val);
            lg(`${card.name}: regen +${a.val} HP → ${card.hp}/${card.maxHp}.`,'hl');
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

      case 'maxhp_add':
        if(ctx.target){
          ctx.target.maxHp+=a.val;
          if(ctx.target.hp===ctx.target.maxHp-a.val) ctx.target.hp+=a.val;
          lg(`${card.name}: ${ctx.target.name} +${a.val} maxHP → ${ctx.target.hp}/${ctx.target.maxHp}.`,'hl');
        } else {
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact){
              const wasFull=ally.hp===ally.maxHp;
              ally.maxHp+=a.val;
              if(wasFull) ally.hp+=a.val;
            }
          });
          lg(`${card.name}: all allies +${a.val} maxHP.`,'hl');
        } break;

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
          r.hp=a.val==='full'?(def?def.hp:r.maxHp):Math.min(a.val||1,r.maxHp);
          r.maxHp=def?def.hp:r.maxHp;
          r.sleeping=true;r.exhausted=false;r.feared=false;r.burning=false;r.atkBonus=0;r.f=curK;
          cur.field.push(r);
          lg(`${card.name}: revives ${r.name} with ${r.hp}/${r.maxHp} HP!`,'imp');
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
        cur.ess=Math.min(cur.essMax,cur.ess+a.val);
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
          r.hp=1;r.sleeping=true;r.exhausted=false;r.feared=false;r.burning=false;r.atkBonus=0;r.f=curK;
          // Apply aura:atk bonus if aura card on field
          const auraCard=cur.field.find(a=>hasTag(a,'aura:atk'));
          if(auraCard) r.atkBonus=getTagVal(auraCard,'aura:atk')||1;
          cur.field.push(r);
          lg(`${card.name} raises ${r.name} at 1 HP!`,'imp');
        }} break;
    }
  }
}
