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
      // taunt_break (2026-07-13, автор) — на атаке подавляет Provoke у цели (можно бить
      // мимо танка до конца этого хода) — снимается тем же путём, что и fear/exhausted
      // (см. endTurn() в game.js, "снимаются у ВЫХОДЯЩЕГО игрока сразу" — тот же блок,
      // просто рядом с c.feared=false). Итоговое окно действия: остаток хода атакующего +
      // весь следующий ход владельца танка (где это в любом случае неважно — Provoke не
      // проверяется для СВОИХ же атак), снимается точно к следующему ходу атакующего —
      // ровно то, что попросил автор ("к след ходу противника, его карта уже
      // реабилитируется").
      case 'taunt_break': ab.push({timing:'on_attack',effect:'taunt_break'}); break;
      // vampiric (2026-07-13, автор) — на СВОЕЙ атаке лечится на РЕАЛЬНО снятый урон
      // (ctx.realDmgDealt, см. doAttack() в game.js — снимок HP цели до/после удара,
      // Броня/Solana Shield уже учтены самим фактом, что не убавили HP). НЕ реагирует на
      // контратаки (как и fear/burn/taunt_break — только когда карта сама атакует).
      case 'vampiric':    ab.push({timing:'on_attack',effect:'vampiric'}); break;
      // necrophage / "Erase" (2026-07-13, автор) — при УБИЙСТВЕ через свою атаку (timing:
      // on_kill, резолвится в doAttack() ТОЛЬКО если ctx.target.hp<=0 после удара): труп
      // цели стирается из кладбища владельца прямо в войд (Инкарнация, если тикала, —
      // обрывается), сам Erase-обладатель лечится ДО ПОЛНОГО HP и снимает с себя ожог.
      // Скоуп: срабатывает только на килл ПРЯМОЙ атакой — Shard/Bolt/AOE-килы это НЕ
      // подхватывают (у них свой урон, не через doAttack()/on_kill).
      // 2026-07-17 (автор, второй пересмотр): снова обычный timing 'on_kill' — резолвится
      // ПОСЛЕ контрудара, но это больше не отдельный спецкейс. С 2026-07-17 doAttack()
      // откладывает СМЕРТЬ атакующего от контрудара (deferDeath у dmgCard(), см. game.js) до
      // момента, когда уже отработали on_attack/on_kill эффекты этого удара — то есть
      // Erase-хил (card.hp=card.maxHp здесь ниже) может реально "спасти" атакующего, даже
      // если контрудар был смертельным: полное HP выставляется ДО финальной проверки
      // att.hp<=0 в doAttack(), поэтому карта остаётся жива. Тот же принцип, что и у
      // vampiric — оба лечат уже ПОСЛЕ того, как контрудар нанёс урон, оба могут утащить
      // атакующего обратно из смерти.
      case 'necrophage':  ab.push({timing:'on_kill',effect:'necrophage'}); break;
      case 'aoe':        ab.push({timing:'active',effect:'aoe',val}); break;
      case 'bolt':       ab.push({timing:'active',effect:'bolt',val}); break;
      case 'enter_aoe':  ab.push({timing:'on_enter',effect:'aoe',val}); break;
      // enter_heal:N (2026-07-13, автор) — зеркало enter_aoe: тот же тайминг on_enter,
      // но во благо. Переиспользует ГОТОВЫЙ execution-путь hp_add/target:'all' (см. кейс
      // 'hp_add' ниже — уже лечит только раненых своей стороны, клампится по maxHp,
      // раньше использовался только у World-карт через тег hp_add/heal). Здесь — тот же
      // эффект, но доступный любой карте (существу) напрямую через собственный тег,
      // без завязки на card.world.
      case 'enter_heal': ab.push({timing:'on_enter',effect:'hp_add',val,target:'all'}); break;
      // enter_draw:N (2026-07-13, автор) — существо при входе на поле даёт своему владельцу
      // N карт добора. Переиспользует ГОТОВЫЙ execution-путь эффекта 'draw' (см. кейс 'draw'
      // ниже) — тот уже умеет резолвиться синхронно для instant/on_attack, просто добавляем
      // on_enter в тот же список таймингов, которые резолвятся сразу (без анимации/звука
      // прилёта карты — как и все остальные "добор вне начала хода" источники в игре: Hunger/
      // Altar/spell draw/Ryvlen on-attack, см. Приоритет в CLAUDE.md).
      case 'enter_draw': ab.push({timing:'on_enter',effect:'draw',val}); break;
      // enter_lose:N (2026-07-17, автор — замена Invisible у рядового Net-трейта, см.
      // "lose" ниже за детали самого эффекта) — существо при входе на поле заставляет
      // противника сбросить N случайных карт из руки в Пустоту. Тот же on_enter timing,
      // что и enter_heal/enter_draw — резолвится сразу, без анимации прилёта карты.
      case 'enter_lose': ab.push({timing:'on_enter',effect:'lose',val}); break;
      // lose:N (2026-07-17, автор) — "Потеря карты": сбрасывает N случайных карт из руки
      // ПРОТИВНИКА владельца этой карты в Пустоту (навсегда, без возможности вернуть —
      // тот же принцип, что и burn-сброс/сожжение). Если рука противника уже пуста —
      // эффект молча ничего не делает (не ошибка, просто нечего терять). Сейчас
      // подключено только для spell (instant, под будущее заклинание) — тот же паттерн,
      // что у 'draw' ниже: card.spell → instant, резолвится в момент розыгрыша. Если
      // позже понадобится other-carrier (world/artifact on_turn, existing creature
      // on_attack и т.п.) — добавлять сюда по той же вилке, что у 'draw'.
      case 'lose':
        if(card.spell) ab.push({timing:'instant',effect:'lose',val});
        break;
      // spell_aoe_count (2026-07-17, "Board Purge") — деалт-значение НЕ фиксированное
      // число на теге (в отличие от 'aoe'/enter_aoe выше), а считается в момент розыгрыша
      // как размер вражеского поля — поэтому здесь нет val вообще, реальный расчёт живёт в
      // execution-кейсе 'aoe_count' ниже (там же, где есть доступ к G[oppK].field). Только
      // spell — не имеет смысла на существе/мире/артефакте (та же вилка, что у 'lose' выше).
      case 'spell_aoe_count':
        if(card.spell) ab.push({timing:'instant',effect:'aoe_count'});
        break;
      // spell_fear_all (2026-07-17, "Mass Sap") — реюзаем ГОТОВЫЙ движок Fear (см. tag
      // 'fear' выше и case 'fear'/dmgCard() в execution-части ниже — атаковать/юзать
      // активку/контратаковать под Fear уже нельзя, это всё уже проверяется по всей
      // кодовой базе через card.feared, см. canAttackBase()/click-хендлер в game.js,
      // кнопку активки в render.js). Просто применяем его сразу ко ВСЕМУ вражескому полю
      // одним спеллом, вместо one-shot on_attack эффекта одного существа.
      case 'spell_fear_all':
        if(card.spell) ab.push({timing:'instant',effect:'fear_all'});
        break;
      // spell_burn_all (2026-07-18, "WILDFIRE") — Tea-аналог spell_fear_all выше, только
      // Burn вместо Fear (см. execution-кейс 'burn_all' ниже). Продолжает тему "Tea =
      // burn-фракция, Jeet = fear-фракция" — Jeet сохраняет NIGHTMARE (spell_fear_all),
      // Tea получает этот спелл ВЗАМЕН STILLNESS (односторонний свап, см. CLAUDE.md).
      case 'spell_burn_all':
        if(card.spell) ab.push({timing:'instant',effect:'burn_all'});
        break;
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
      case 'on_enemy_death_base':  ab.push({timing:'on_enemy_death',effect:'hp_base',val}); break;
      case 'on_own_death_base':    ab.push({timing:'on_own_death',effect:'hp_base',val}); break;
      case 'on_play_creature':     ab.push({timing:'on_play_creature',effect:'hp_base',val}); break;
      case 'on_own_death':         ab.push({timing:'on_own_death',effect:'draw',val}); break;
      case 'on_enemy_death':       ab.push({timing:'on_enemy_death',effect:'draw',val}); break;
      case 'shard':                ab.push({timing:'active',effect:'shard',val}); break;
      case 'sacrifice':            ab.push({timing:'active',effect:'sacrifice'}); break;
      case 'invisible':            ab.push({timing:'passive',effect:'invisible'}); break;
      case 'ward':                 ab.push({timing:'passive',effect:'ward'}); break;
      case 'world_maxhp':          ab.push({timing:'on_turn',effect:'world_maxhp',val}); break;
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
        // Единственный источник, который попадает сюда — enter_aoe:N (on_enter timing,
        // см. getAbilities() выше). Активная AOE-кнопка (Umbasir/Vardan) сюда НЕ доходит —
        // у неё свой прямой путь через doUmbAsir()/doVardan() в game.js, с отдельным
        // dmgCard(...,true) (магия, игнорирует броню). enter_aoe — по прямому запросу
        // автора (2026-07-10) НЕ считается магией, броню не игнорирует — обычный dmgCard()
        // без bypassArmor.
        playSfx('card_atack');
        [...G[oppK].field].forEach(t=>dmgCard(t,a.val,oppK));
        lg(`${card.name}: ${a.val} dmg to all enemies!`,'imp');
        break;

      case 'aoe_count':
        // Board Purge (2026-07-17) — урон ВСЕМ вражеским существам = их количеству на поле,
        // посчитанному ДО удара (снимок [...] тем же приёмом, что у case 'aoe' выше — все
        // существа берут урон "одновременно", смерти по ходу цикла не уменьшают dmgAmt на
        // лету). Магический урон (bypassArmor=true, как spell_dmg_target/Shard) — Броня не
        // спасает, только Ward. Самобалансирующаяся карта: против 1 существа почти
        // бесполезна (1 dmg), против забитого поля (макс. 6, см. лимит поля в doPlay()) —
        // полноценный вайп.
        {
          const purgeTargets=[...G[oppK].field];
          const dmgAmt=purgeTargets.length;
          if(dmgAmt>0){
            playSfx('card_spell_atack');
            purgeTargets.forEach(t=>{
              queueFieldFx(t.id,'HIT!','fx-spell-dmg'); // тот же fx, что у JOURNEY/HEX (doSpellDmgTarget)
              dmgCard(t,dmgAmt,oppK,true);
            });
            lg(`${card.name}: ${dmgAmt} dmg to ALL enemy creatures (board count)!`,'imp');
          } else {
            lg(`${card.name}: no enemy creatures on the field — fizzles.`,'hint');
          }
        } break;

      case 'fear_all':
        // Mass Sap (2026-07-17) — тот же 'feared' флаг и та же логика снятия, что у обычного
        // Fear (game.js endTurn(): снимается в конце хода ВЛАДЕЛЬЦА, т.е. переживает ровно
        // один их ход, как и положено — и это же самое поле уже блокирует атаку/активку/
        // контратаку по всей кодовой базе, см. canAttackBase()/click-хендлер в game.js,
        // кнопку активки в render.js). Существо, уже Feared от чего-то другого, просто
        // получает флаг повторно — не складывается, не страшно.
        {
          const fearTargets=[...G[oppK].field].filter(t=>!t.spell&&!t.world&&!t.artifact&&!hasTag(t,'ward'));
          if(fearTargets.length>0){
            playSfx('debaf');
            fearTargets.forEach(t=>{t.feared=true;queueFieldFx(t.id,'FEARED!','fx-fear');});
            lg(`${card.name}: all enemy creatures are Feared!`,'imp');
          } else {
            lg(`${card.name}: no enemy creatures on the field — fizzles.`,'hint');
          }
        } break;

      case 'burn_all':
        // WILDFIRE (2026-07-18) — Tea-аналог fear_all выше, только Burn вместо Fear. Реюзаем
        // ГОТОВЫЙ движок Burn (card.burning=true, тик 1 урона в начале каждого хода владельца
        // до смерти — см. endTurn() в game.js и tag 'burn'/case 'burn' ниже), просто применяем
        // его сразу ко ВСЕМУ вражескому полю одним спеллом вместо one-shot on_attack эффекта
        // одного существа. Существо, уже горящее от чего-то другого, просто получает флаг
        // повторно — не складывается, не страшно (тот же принцип, что у fear_all). Без
        // queueFieldFx-попапа — одиночный Burn (case 'burn' ниже) тоже не показывает всплывашку,
        // сама горящая иконка на карте (card.burning) уже достаточный визуальный фидбек.
        {
          const burnTargets=[...G[oppK].field].filter(t=>!t.spell&&!t.world&&!t.artifact&&!hasTag(t,'ward'));
          if(burnTargets.length>0){
            playSfx('card_fire_atack');
            burnTargets.forEach(t=>{t.burning=true;});
            lg(`${card.name}: all enemy creatures are on fire!`,'imp');
          } else {
            lg(`${card.name}: no enemy creatures on the field — fizzles.`,'hint');
          }
        } break;

      case 'burn':
        if(ctx.target&&ctx.target.hp>0&&!ctx.target.voided&&!ctx.target._shieldBlockedThisHit){
          if(hasTag(ctx.target,'ward')){
            lg(`${ctx.target.name}'s Ward blocks the burn entirely.`,'dmg');
          } else {
            ctx.target.burning=true;
            playSfx('card_fire_atack');
            lg(`${card.name}: ${ctx.target.name} is on fire!`,'imp');
          }
        } break;

      case 'fear':
        if(ctx.target&&ctx.target.hp>0&&!ctx.target.voided&&!ctx.target._shieldBlockedThisHit){
          if(hasTag(ctx.target,'ward')){
            lg(`${ctx.target.name}'s Ward blocks the fear entirely.`,'dmg');
          } else {
            ctx.target.feared=true;
            playSfx('debaf');
            lg(`${card.name}: ${ctx.target.name} is Feared!`,'imp');
            queueFieldFx(ctx.target.id,'FEARED!','fx-fear');
          }
        } break;

      case 'taunt_break':
        // Осмысленно только против цели, у которой реально ЕСТЬ provoke — иначе тег просто
        // молча ничего не делает (нечего снимать), без лога/звука/значка, как и остальные
        // условные on_attack эффекты выше. _shieldBlockedThisHit — см. Solana Shield в
        // dmgCard() (game.js): удар полностью поглощён щитом → и сам урон, и любой эффект,
        // который он нёс с собой (fear/burn/taunt_break), не применяется вообще.
        if(ctx.target&&ctx.target.hp>0&&!ctx.target.voided&&!ctx.target._shieldBlockedThisHit&&hasTag(ctx.target,'provoke')){
          ctx.target.provokeBroken=true;
          playSfx('debaf');
          lg(`${card.name}: ${ctx.target.name}'s Provoke is suppressed!`,'imp');
          queueFieldFx(ctx.target.id,'EXPOSED!','fx-fear'); // переиспользуем готовый fx-класс fear — тот же "красный всплеск"
        } break;

      case 'vampiric':
        // ctx.realDmgDealt — реально снятый урон (снимок HP цели до/после удара, см.
        // doAttack()), НЕ номинальный ATK: если часть ушла в Броню или удар поглощён
        // Solana Shield целиком (realDmgDealt=0 в этом случае), лечения не будет — по
        // прямому запросу автора ("сколько именно хп снято"). Срабатывает независимо от
        // того, выжила цель или нет (лайфстил не требует килла, в отличие от necrophage).
        if(ctx.realDmgDealt>0){
          const heal=Math.min(ctx.realDmgDealt,card.maxHp-card.hp);
          if(heal>0){
            card.hp+=heal;
            playSfx('heal');
            const vampId=card.id;
            requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(vampId,`+${heal}`,'heal')));
            lg(`${card.name}: drains ${heal} HP from ${ctx.target.name}.`,'hl');
          }
        } break;

      case 'necrophage':
        // Резолвится ТОЛЬКО когда doAttack() уже убедился, что ctx.target.hp<=0 (см. вызов
        // triggerAbilities(att,'on_kill',{target}) там же) — эта проверка здесь не дублируется,
        // достаточно проверить что karta ещё лежит в grave (не сожжена в войд/не вторая
        // смерть после Инкарнации — те уже сами ушли в войд через killCard(), стирать
        // оттуда нечего, no-op).
        if(ctx.target){
          const deadK=ctx.target.f;
          if(G[deadK].grave.some(c=>c.id===ctx.target.id)){
            G[deadK].grave=G[deadK].grave.filter(c=>c.id!==ctx.target.id);
            ctx.target.voided=true;
            ctx.target.incarnTimer=undefined; // Инкарнация ещё тикала — обрываем, стёртый труп не воскреснет
            G[deadK].void.push(ctx.target);
          }
          const wasBurning=card.burning;
          card.hp=card.maxHp;
          card.burning=false;
          playSfx('rest');
          const eraseId=card.id;
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(eraseId,'FULL','heal')));
          lg(`${card.name}: Erase — ${ctx.target.name}'s corpse is wiped from existence, ${card.name} is fully restored${wasBurning?' and cleansed of fire':''}.`,'hl');
          queueFieldFx(card.id,'ERASED!','fx-fear');
        } break;

      case 'draw':
        // instant: spells draw immediately
        // on_attack: Ryvlen draws on each attack
        // on_enter: enter_draw:N — creature draws for its owner when played (2026-07-13)
        // on_turn: handled via extraDraw in endTurn — skip here
        if(a.timing==='instant'||a.timing==='on_attack'||a.timing==='on_enter'){
          for(let i=0;i<a.val;i++) if(cur.deck.length>0) cur.hand.push(cur.deck.shift());
          lg(`${card.name}: draws ${a.val} card(s).`,'imp');
        }
        break;

      // lose (2026-07-17, автор) — "Потеря карты": сбрасывает a.val случайных карт из руки
      // ПРОТИВНИКА владельца card в Пустоту навсегда. Противник считается от card.f (не от
      // curK/oppK этого triggerAbilities-вызова) — надёжнее, т.к. card.f не зависит от того,
      // чей сейчас G.turn (on_enter обычно совпадает с ходом владельца, но лучше не полагаться
      // на побочное совпадение). Пустая рука противника — молчаливый no-op (нечего терять),
      // без лога-ошибки.
      case 'lose':
        {
          const targetK=card.f==='tea'?'jeet':'tea';
          const targetHand=G[targetK].hand;
          if(targetHand.length===0){
            lg(`${card.name}: opponent's hand is empty — nothing to lose.`,'hint');
            break;
          }
          let lostNames=[];
          for(let i=0;i<a.val;i++){
            if(targetHand.length===0) break;
            const idx=Math.floor(Math.random()*targetHand.length);
            const lostCard=targetHand.splice(idx,1)[0];
            lostCard.voided=true;
            G[targetK].void.push(lostCard);
            lostNames.push(lostCard.name);
          }
          if(lostNames.length>0){
            playSfx('debaf');
            lg(`${card.name}: ${targetK.toUpperCase()} loses ${lostNames.join(', ')} from hand — gone to the Void!`,'imp');
          }
        } break;

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
        // Heal base HP only, no maxHP increase - only if wounded
        if(G[curK].hp<G[curK].maxHp){
          G[curK].hp=Math.min(G[curK].maxHp, G[curK].hp+a.val);
          lg(`${card.name}: ${curK} base +${a.val} HP → ${G[curK].hp}/${G[curK].maxHp}.`,'hl');
          playSfx('heal');
          flashBase(curK, 'heal', a.val);
        }
        break;
      // on_enemy_death handled directly in killCard()

      case 'hp_add':
        if(a.target==='all'){
          let healedAny=false;
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact&&ally.hp<ally.maxHp){
              ally.hp=Math.min(ally.maxHp,ally.hp+a.val);
              healedAny=true;
              const allyId=ally.id;
              requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(allyId,`+${a.val}`,'heal')));
            }
          });
          if(healedAny){
            playSfx('heal');
            lg(`${card.name}: heal all allies +${a.val} HP.`,'hl');
          }
        } else if(a.self){
         if(!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp){
            const regenVal=(card.squadParam&&card.squadParam.regen)||a.val;
            card.hp=Math.min(card.maxHp,card.hp+regenVal);
            playSfx('heal');
            const regenId=card.id;
            requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(regenId,`+${regenVal}`,'heal')));
            lg(`${card.name}: regen +${regenVal} HP → ${card.hp}/${card.maxHp}.`,'hl');
          }
        } else if(ctx.target){
          ctx.target.hp=Math.min(ctx.target.maxHp,ctx.target.hp+a.val);
          playSfx('heal');
          lg(`${card.name}: +${a.val} HP to ${ctx.target.name} → ${ctx.target.hp}/${ctx.target.maxHp}.`,'hl');
        } else {
          cur.field.forEach(ally=>{
            if(!ally.spell&&!ally.world&&!ally.artifact)
              ally.hp=Math.min(ally.maxHp,ally.hp+a.val);
          });
          playSfx('heal');
          lg(`${card.name}: heal all allies +${a.val} HP.`,'hl');
        } break;


      // maxhp_add removed — use aura:maxhp instead

      case 'bounce': {
        const teaReturning=[...G.tea.field];
        const jeetReturning=[...G.jeet.field];
        G.tea.field=[];G.jeet.field=[];
        // Field clears now → next render() (right after this) triggers the same
        // dying/fade animation as any other card leaving the field. Actually
        // adding them to hand is delayed to match that ~400ms fade, so the card
        // doesn't appear in hand until its field ghost has finished fading out.
        setTimeout(()=>{
          teaReturning.forEach(x=>{resetC(x);G.tea.hand.push(x);});
          jeetReturning.forEach(x=>{resetC(x);G.jeet.hand.push(x);});
          playSfx('wind_card');
          render();
        },400);
        lg(`${card.name}: all cards return to hands!`,'imp'); break;
      }

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
          playSfx('rest');
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
        cur.essMax=Math.min(ESS_CAP, cur.essMax+a.val);
        flashEssenceGain(curK);
        lg(`${card.name}: +${a.val} max Essence → ${cur.essMax}.`,'imp'); break;

      case 'ess_add':
        cur.ess+=a.val; // can exceed essMax temporarily this turn
        flashEssenceGain(curK);
        lg(`${card.name}: +${a.val} Essence → ${cur.ess}/${cur.essMax}.`,'imp'); break;

      case 'rage':
        // Permanently increase ATK each time this card attacks
        card.rageBonus=(card.rageBonus||0)+a.val;
        playSfx('baf');
        const rageId=card.id;
requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(rageId,`+${a.val} ATK`,'atk')));
        lg(`${card.name}: Rage! +${a.val} ATK → total ${card.atk+(card.atkBonus||0)+(card.rageBonus||0)} ATK.`,'imp');
        break;

      case 'raise':
        {
        // 2026-07-16: лимит поля 6 существ — этот триггер автоматический (on_turn), у него
        // нет Play-кнопки, которую можно было бы подменить на "Battleground is full", так что
        // просто тихо не срабатываем при полном поле (тот же принцип, что и у revive-спеллов
        // и обычных существ — см. doPlay() в game.js).
        if(G[curK].field.length>=6){ lg(`${card.name}: Battleground is full — can't raise.`,'hint'); break; }
        const all=[...G[curK].grave].filter(x=>!x.spell&&!x.world&&!x.artifact&&!x.voided);
        if(all.length>0){
          const r=all[all.length-1];
          G[curK].grave=G[curK].grave.filter(x=>x.id!==r.id);
          // Reset state but keep base stats, set hp to raise value (NOT full)
          r.sleeping=true;r.exhausted=false;r.feared=false;r.burning=false;
          r.atkBonus=0;r.rageBonus=0;r.tempAtkBonus=0;r.maxHpBonus=0;r.baseMaxHp=null;r.auraMaxHpBonus=0;
          r.squadParam=null;r.squadAtkBonus=0;r.squadMaxHpBonus=0;r.squadArmorBonus=0;r.armorMax=undefined;r.auraArmorBonus=0;r.worldArmorBonus=0;
          // Инкарнация — та же причина, что и в reviveCard() (game.js): если раскопанная
          // карта была на середине своего собственного incarnTimer-отсчёта, этот отсчёт
          // прерван (карта больше не в grave) — гасим поле явно, incarnUsed не трогаем.
          r.incarnTimer=undefined;
          r.f=curK;
          const def=DEFS[r.key];
          if(def) r.maxHp=def.hp; // restore base maxHp
          r.hp=a.val||1; // raise at 1 HP, not full
          G[curK].field.push(r);
          // Apply auras and squad bonuses
          if(hasTag(r,'aura:atk')) G[curK]._auraAtkLog=r.id;
          if(hasTag(r,'aura:maxhp')) G[curK]._auraMaxLog=r.id;
          if(hasTag(r,'aura:armor')) G[curK]._auraArmorLog=r.id;
          applyAuras(curK);
          checkSquadBonuses(curK);
          recalcArmor(curK);
          playSfx('rest');
          lg(`${card.name} raises ${r.name} at ${r.hp} HP!`,'imp');
        } else {
          lg(`${card.name}: both graveyards empty.`,'die');
        }} break;
    }
  }
}
