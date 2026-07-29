// Видимость для ТОЧЕЧНЫХ СПЕЛЛОВ/Bolt (2026-07-19, по прямому запросу автора — пересмотр
// решения от 2026-07-18). Раньше спелл вообще не имел fallback-исключения: invisible/
// нераскрытый stealth были недостижимы БЕЗ исключений, в отличие от обычной атаки, где
// getTargetableCards() открывает invisible-существ как валидные цели, если ВСЕ существа
// противника invisible (иначе на поле не было бы ни одной цели, кроме базы). Теперь
// спелл ведёт себя ТОЧНО ТАК ЖЕ, как атака: если можно закликать существо в бою (оно
// попадает в getTargetableCards()), то и точечный спелл должен суметь выбрать его целью —
// и, что важно для рендера, для него должна появляться подсветка/мишень (см. render.js,
// mkEl() — раньше подсветка спелл-таргетинга вообще не фильтровала invisible/stealth,
// то есть баг был в обе стороны: и клик блокировался без fallback, и мишень могла
// подсветиться на карте, по которой клик всё равно не сработает).
// Второй параметр (oppField) опционален для обратной совместимости старых вызовов
// без контекста поля — тогда используется старое строгое поведение (без fallback).
// Применяется ТОЛЬКО к вражеским целям — по своим существам (Bounce на союзника, где
// сторона цели не ограничена card.f!==G.turn) видимость не проверяется вообще: игрок
// всегда точно знает, где стоит его собственная invisible/stealth карта.
// КОНВЕНЦИЯ КЛИКА (уточнено автором 2026-07-19, второй пересмотр): если карта не
// isSpellTargetable() — клик по ней НЕ отменяет спелл (никакого cancelPendingSpell()/
// рефанда), просто ИГНОРИРУЕТСЯ, точно как невалидный клик по невидимой цели при обычной
// атаке (getTargetableCards()). Мишень/подсветка и кликабельность — одно и то же: не видно
// как targetable → нельзя и нажать, без побочных эффектов и без сообщений об отмене. См.
// каждую ветку G.phase==='...Target' в onClick() ниже — там именно этот паттерн.
// 2026-07-25 (по прямому запросу автора — баланс burn vs fear, см. sim-данные):
// Burn раньше был бессрочным (тикал до смерти/Clean) — на порядок сильнее Fear
// (тот снимается сам через ~1 ход, см. endTurn() ниже). Теперь Burn считает ходы:
// card.burnTurns ставится в BURN_DURATION в момент наложения (все места, где
// стоит `.burning=true` — abilities.js case 'burn'/'burn_all', game.js
// doSpellBurnTarget) и тикает вниз в endTurn() вместе с уроном; на 0 — снимается
// сам (card.burning=false), как Fear. Повторное наложение поверх уже горящей
// карты ОБНОВЛЯЕТ счётчик до полного BURN_DURATION (refresh), не складывает.
const BURN_DURATION = 2;

function isSpellTargetable(card, oppField){
  if(hasTag(card,'stealth') && !card.stealthBroken) return false;
  if(hasTag(card,'invisible')){
    if(!oppField) return false;
    // Тот же fallback, что и в getTargetableCards(): invisible недостижим, ПОКА на поле
    // есть хоть один видимый (не-invisible) союзник; если видимых вообще не осталось —
    // invisible-существа сами становятся валидными целями.
    const allInvisible = oppField.length>0 && oppField.every(c=>hasTag(c,'invisible'));
    return allInvisible;
  }
  return true;
}

function getTargetableCards(oppField, att){
  const bushido=oppField.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return [bushido.id];
  // Invisible (2026-07-17, автор — второй пересмотр): раньше "последний оставшийся" читался
  // буквально как oppField.length===1 — если на поле стояло НЕСКОЛЬКО invisible-существ разом
  // (например 3), ни одно из них не считалось "последним", и цели не было вообще ни одной
  // (только база). Теперь правило — "пока есть хотя бы один ВИДИМЫЙ союзник рядом, invisible
  // недостижим; если все существа на поле invisible — они все становятся целями" (не просто
  // одно случайное, любое на выбор атакующего). allInvisible проверяет именно это: другие
  // invisible-соседи больше не блокируют друг друга, блокирует только присутствие НЕ-invisible
  // карты на поле.
  const allInvisible=oppField.length>0 && oppField.every(c=>hasTag(c,'invisible'));
  const visibleInvis=allInvisible?oppField:oppField.filter(c=>!hasTag(c,'invisible'));
  // Stealth (2026-07-17, TEANTIST) — anti-invisible пара #2: недостижимо, пока не
  // атаковало ни разу (card.stealthBroken). В отличие от invisible — никакого "все
  // stealth разом → все становятся целями" правила не нужно: тег живёт всего на одной
  // Unique-карте (максимум 1 копия в игре), реальный шанс словить "на поле вообще нет
  // валидной цели" из-за одного stealth-существа ничтожен, а если это всё же случится —
  // functions ниже просто вернут пустой массив, и атакующий сможет только бить базу
  // (canAttackBase() про stealth ничего не знает и не должен — см. его комментарии).
  const visible=visibleInvis.filter(c=>!(hasTag(c,'stealth')&&!c.stealthBroken));
  // provokeBroken (taunt_break, 2026-07-13) — Provoke временно подавлен, эта карта больше
  // не форсирует атаку на себя, как будто тега нет вообще.
  // Provoke rework (2026-07-17, автор): pierce БОЛЬШЕ не обходит форс-таргет — раньше
  // pierce мог свободно выбрать ЛЮБУЮ вражескую карту или базу, даже при живом Provoke, что
  // ощущалось не по-дизайну ("провокация не работает против него вообще"). Теперь Provoke
  // абсолютен для всех без исключения — единственное, что осталось уникальным у pierce,
  // это трампл-перелив урона в базу при убийстве провок-цели (см. doAttack() ниже). att
  // больше не используется здесь вообще, оставлен в сигнатуре ради обратной совместимости
  // вызовов (getTargetableCards(oppField, creature) — см. ai.js).
  // Provoke "stands as an open card" (2026-07-24, по прямому запросу автора — ОТМЕНЯЕТ
  // предыдущее правило 2026-07-17 "Sleeping/exhausted не исключают"): теперь провокация
  // форсирует атаку на себя, только пока сама карта НЕ exhausted — как блокирующее
  // существо в MtG, которое должно быть untapped, чтобы блокировать. Sleeping (только что
  // вышла, ещё не может атаковать сама) — это НЕ exhausted, такая карта всё ещё "открыта"
  // и провоцирует как обычно; единственное состояние, которое снимает форс — реально
  // походившая этим ходом (или иначе уставшая) карта.
  // 2026-07-25 (по прямому запросу автора) — Fear теперь тоже снимает форс-таргет
  // Provoke, тем же принципом, что и exhausted (испуганная карта не может "стоять
  // как открытая" и заставлять бить себя).
  const provokes=visible.filter(c=>c.tags.includes('provoke')&&!c.provokeBroken&&!c.exhausted&&!c.feared&&!c.frozen);
  if(provokes.length>0) return provokes.map(c=>c.id);
  return visible.map(c=>c.id);
}

function onClick(card,zone){
  if(isAiTurn()) return; // ход ИИ (или спектаторский матч) — игнорируем клики человека
  const opp=G.turn==='tea'?'jeet':'tea';
  if(G.phase==='burn'){
    if(zone==='hand'&&card.f===G.turn)doBurnCard(card);
    return;
  }
  if(G.phase==='healTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&(card.hp<card.maxHp||card.burning||card.feared||card.provokeBroken)){
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
        // provokeBroken (taunt_break, 2026-07-13) — та же логика, что fire/fear: если враг
        // taunt_break-атакой снял Provoke с ТВОЕГО танка, хил может восстановить его раньше
        // естественного срока (см. getTargetableCards() — сама карта снова начинает форсить
        // атаку на себя, как только флаг снят).
        if(card.provokeBroken){card.provokeBroken=false;debuffs.push('provoke suppression');}
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
      // Ward/Frost/активный Solana Shield (2026-07-27, по прямому запросу автора — тот же
      // принцип, что и у spellDmgTarget: раньше клик проходил, играла анимация SHARD!,
      // урон тихо блокировался внутри dmgCard() — выглядело как баг.
      if(hasTag(card,'ward') && !(hasTag(card,'shield')&&!card.shieldConsumed)) return; // Shield/Frost намеренно ОСТАЮТСЯ валидными целями для урона — щит/заморозка ДОЛЖНЫ ловить и лопаться от урона, это и есть их механика. Ward блокирует урон, НО пока активен Shield — щит стоит СЛОЕМ ВЫШЕ (2026-07-27, автор поймал живьём): карту с обоими тегами можно выбрать целью, пока щит ещё цел (собьёт его), и только когда щит уже потрачен — Ward начинает защищать тело напрямую и цель становится недоступна.
      if(isSpellTargetable(card,G[opp].field)){
        doShardTarget(card);return;
      }
      // Видимость (2026-07-19, автор — пересмотр): invisible/нераскрытый stealth ведёт
      // себя ТОЧНО как при обычной атаке — если карта не подсвечена как targetable, клик
      // по ней просто ИГНОРИРУЕТСЯ, никакой отмены активки. Раньше это молча съедало
      // клик и отменяло Shard (cancel ниже) — вводило игрока в заблуждение, будто он
      // сделал что-то неправильное, хотя цель просто была невидимой (то же самое, что
      // "не видно как мишень → нельзя нажать", без побочного эффекта отмены).
      return;
    }
    G.phase='action';G.sel=null;render();return; // cancel — клик мимо поля/не по существу
  }
  if(G.phase==='boltTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // См. комментарий у shardTarget выше — тот же принцип для Bolt.
      if(hasTag(card,'ward') && !(hasTag(card,'shield')&&!card.shieldConsumed)) return; // Shield/Frost намеренно ОСТАЮТСЯ валидными целями для урона — щит/заморозка ДОЛЖНЫ ловить и лопаться от урона, это и есть их механика. Ward блокирует урон, НО пока активен Shield — щит стоит СЛОЕМ ВЫШЕ (2026-07-27, автор поймал живьём): карту с обоими тегами можно выбрать целью, пока щит ещё цел (собьёт его), и только когда щит уже потрачен — Ward начинает защищать тело напрямую и цель становится недоступна.
      if(isSpellTargetable(card,G[opp].field)){
        doBoltTarget(card);return;
      }
      // См. комментарий у shardTarget выше — тот же принцип для Bolt.
      return;
    }
    G.phase='action';G.sel=null;render();return; // cancel — клик мимо поля/не по существу
  }
  if(G.phase==='sacrificeTarget'){
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSacrifice_target(card);return;
    }
    G.phase='action';G.sel=null;render();return; // cancel on any other click
  }
  if(G.phase==='spellDmgTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // Ward/Frost/активный Solana Shield — полный иммунитет к магическому урону спеллов
      // (2026-07-27, по прямому запросу автора — тот же принцип, что уже применён к Fear/
      // Burn): раньше такую карту МОЖНО было выбрать целью, играла анимация HIT!, но урон
      // тихо блокировался внутри dmgCard() — по факту "анимация есть, эффекта нет",
      // выглядело как баг. Теперь клик по такой карте — тихий no-op (спелл остаётся
      // pending, ждёт другую цель), она вообще не долетает до резолвера.
      if(hasTag(card,'ward') && !(hasTag(card,'shield')&&!card.shieldConsumed)) return; // Shield/Frost намеренно ОСТАЮТСЯ валидными целями для урона — щит/заморозка ДОЛЖНЫ ловить и лопаться от урона, это и есть их механика. Ward блокирует урон, НО пока активен Shield — щит стоит СЛОЕМ ВЫШЕ (2026-07-27, автор поймал живьём): карту с обоими тегами можно выбрать целью, пока щит ещё цел (собьёт его), и только когда щит уже потрачен — Ward начинает защищать тело напрямую и цель становится недоступна.
      if(isSpellTargetable(card,G[opp].field)){
        doSpellDmgTarget(card);return;
      }
      // См. комментарий у shardTarget выше — тот же принцип: невидимая цель просто не
      // кликабельна, без отмены и рефанда спелла.
      return;
    }
    cancelPendingSpell();return; // cancel — refunds cost, returns card to hand
  }
  if(G.phase==='spellDestroyTarget'){
    // Клик по существу (не по вражескому Миру/Артефакту, у тех свой onclick — см.
    // _mkPcardHtml в render.js) — это клик мимо, отменяем спелл с рефандом, как и у
    // остальных таргетируемых спеллов (spellDmgTarget и т.п.). Сам выбор цели происходит
    // не здесь: pcard вражеского Мира/Артефакта вызывает doSpellDestroyTarget() напрямую
    // через свой собственный onclick.
    cancelPendingSpell();return;
  }
  if(G.phase==='spellBurnTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // Frost/Ward/активный Solana Shield — полный иммунитет к Burn (2026-07-27, по
      // прямому запросу автора): клик по такой цели теперь просто НИЧЕГО не делает
      // (спелл остаётся pending, ждёт другую цель), а НЕ отменяет спелл целиком —
      // раньше это молча попадало в общий cancelPendingSpell() ниже, как будто игрок
      // кликнул мимо поля/по своей карте. Shield ТЕПЕРЬ НЕ тратится такой попыткой —
      // снять его может только реальный входящий урон (см. dmgCard() в game.js), та же
      // логика, что уже применяется к Frost.
      if(card.frozen||hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed)) return;
      if(isSpellTargetable(card,G[opp].field)){
        doSpellBurnTarget(card);return;
      }
      return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellFearTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // См. комментарий в spellBurnTarget выше — тот же принцип для Fear.
      if(card.frozen||hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed)) return;
      if(isSpellTargetable(card,G[opp].field)){
        doSpellFearTarget(card);return;
      }
      return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellBuffTarget'){
    // 2026-07-21 (автор): feared больше НЕ исключён — ничто не должно мешать бафнуть
    // союзника, будь он уставший/спящий/скрытный/в инвизе/горит/в страхе. Единственное
    // требование — своя карта-существо (не спелл/мир/артефакт).
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSpellBuffTarget(card);return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellArmorTarget'){
    // Та же relaxed-таргетинг правка, что и у spellBuffTarget выше (2026-07-15, расширено
    // 2026-07-21 — feared тоже больше не исключён).
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSpellArmorTarget(card);return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellDispelTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      if(isSpellTargetable(card,G[opp].field)){
        doSpellDispelTarget(card);return;
      }
      // См. комментарий у shardTarget выше.
      return;
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
  if(G.phase==='spellBounceTarget'){
    // В отличие от остальных targeted-спеллов — цель ЛЮБАЯ сторона (своя или вражеская),
    // поэтому нет проверки card.f===/!==G.turn, только что это существо на поле.
    // Видимость (invisible/нераскрытый stealth) проверяется ТОЛЬКО для вражеской цели —
    // свою карту игрок всегда видит, ограничения нет (2026-07-18).
    if(zone==='field'&&!card.spell&&!card.world&&!card.artifact){
      if(card.f===G.turn||isSpellTargetable(card,G[opp].field)){
        doSpellBounceTarget(card);return;
      }
      // Видимость (2026-07-19) — тот же принцип, что и у shardTarget/spellDmgTarget выше:
      // невидимая вражеская цель просто не кликабельна, без отмены спелла.
      return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellBounceAllyTarget'){
    // GUST/REVERSE redesign (2026-07-24) — единственное отличие от spellBounceTarget
    // выше: только СВОЯ сторона (card.f===G.turn), видимость не при чём (своя карта
    // всегда видна). Резолвит той же doSpellBounceTarget() — эффект идентичен, разница
    // только в том, кого вообще можно кликнуть.
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact){
      doSpellBounceTarget(card);return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellExecuteHalfTarget'){
    // JUDGMENT/DEATHBLOW rework (2026-07-26, по прямому запросу автора) — раньше цель была
    // ограничена ≤50% maxHP ДО выбора (условный insta-kill). Теперь цель — ЛЮБОЕ вражеское
    // существо, тот же гейт видимости, что у spellDmgTarget выше — сам спелл сначала бьёт
    // Bolt 1, и УЖЕ ПОСЛЕ этого решает, добивать или нет (см. doSpellExecuteHalfTarget()).
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // См. комментарий у spellDmgTarget выше — тот же принцип, 2026-07-27.
      if(hasTag(card,'ward') && !(hasTag(card,'shield')&&!card.shieldConsumed)) return; // Shield/Frost намеренно ОСТАЮТСЯ валидными целями для урона — щит/заморозка ДОЛЖНЫ ловить и лопаться от урона, это и есть их механика. Ward блокирует урон, НО пока активен Shield — щит стоит СЛОЕМ ВЫШЕ (2026-07-27, автор поймал живьём): карту с обоими тегами можно выбрать целью, пока щит ещё цел (собьёт его), и только когда щит уже потрачен — Ward начинает защищать тело напрямую и цель становится недоступна.
      if(isSpellTargetable(card,G[opp].field)){
        doSpellExecuteHalfTarget(card);return;
      }
      return;
    }
    cancelPendingSpell();return;
  }
  if(G.phase==='spellProvokeBreakTarget'){
    // Ward/Frost/активный Solana Shield (2026-07-27, по прямому запросу автора — этот спелл
    // ПРОПУСТИЛ эту проверку раньше, хотя Provoke-break — такой же дебафф, как Fear/Burn,
    // и должен блокироваться теми же тремя иммунитетами тем же способом).
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&hasTag(card,'provoke')&&!card.provokeBroken&&!card.frozen&&!hasTag(card,'ward')&&!(hasTag(card,'shield')&&!card.shieldConsumed)&&isSpellTargetable(card,G[opp].field)){
      doSpellProvokeBreakTarget(card);return;
    }
    // Клик мимо валидной Provoke-цели — как и spellUntapTarget, НЕ считается отменой:
    // просто игнорируем и ждём валидный клик, чтобы случайный тап не по той карте не
    // срывал применение (у этого спелла в принципе не может быть "любой другой цели",
    // так что тут это ещё уместнее, чем у untap).
    return;
  }
  if(G.phase==='spellDmgTrampleTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // См. комментарий у spellDmgTarget выше — тот же принцип, 2026-07-27.
      if(hasTag(card,'ward') && !(hasTag(card,'shield')&&!card.shieldConsumed)) return; // Shield/Frost намеренно ОСТАЮТСЯ валидными целями для урона — щит/заморозка ДОЛЖНЫ ловить и лопаться от урона, это и есть их механика. Ward блокирует урон, НО пока активен Shield — щит стоит СЛОЕМ ВЫШЕ (2026-07-27, автор поймал живьём): карту с обоими тегами можно выбрать целью, пока щит ещё цел (собьёт его), и только когда щит уже потрачен — Ward начинает защищать тело напрямую и цель становится недоступна.
      if(isSpellTargetable(card,G[opp].field)){
        doSpellDmgTrampleTarget(card);return;
      }
      // См. комментарий у shardTarget выше.
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
    if(zone==='field'&&card.f===G.turn&&!card.sleeping&&!card.exhausted&&!card.feared&&!card.frozen&&!card.spell&&!card.world&&!card.artifact){
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

// Список тегов, определяющих ТАРГЕТИРУЕМЫЙ спелл (2026-07-19) — вынесен сюда как общий
// список, чтобы doPlay() мог одной строкой проверить "это простой instant-спелл или нет",
// не дублируя весь if/else список из _resolvePlayedCard() ниже. Если добавляешь новый тип
// таргетируемого спелла — впиши его тег и сюда тоже, иначе он ошибочно попадёт под
// spell-cast-out-анимацию (см. isPlainInstantSpell в doPlay()).
const TARGETED_SPELL_TAGS = ['spell_dmg_target','spell_buff_temp','spell_armor_temp','spell_dispel','spell_untap','spell_bounce_target','spell_bounce_ally_target','spell_provoke_break_target','spell_dmg_trample_target','spell_destroy_target','spell_burn_target','spell_fear_target','spell_execute_half'];

function doPlay(card, afterResolve){
  const cur=G[G.turn];
  if(cur.ess<card.cost){lg(`Not enough essence — need ${card.cost}, have ${cur.ess}.`,'hint');if(typeof afterResolve==='function')afterResolve();return;}
  // Лимит поля (2026-07-16): максимум 6 существ одновременно на своей стороне поля.
  // Миры/Артефакты/обычные Заклинания сюда не попадают (не трогают cur.field вообще —
  // см. doWorld/doArtifact/doSpell), поэтому проверяем только "чистые" карты-существа,
  // как и в doCreature(). Отдельно — спеллы с тегом revive (SHEN'S CALL/FORGETTING):
  // воскрешённая карта ТОЖЕ садится на cur.field (см. reviveCard()), так что тот же лимит
  // распространяется и на них — иначе рес выдал бы 7-ю карту в обход правила.
  const wouldAddToField = (!card.spell&&!card.world&&!card.artifact) || (card.spell&&hasTag(card,'revive'));
  if(wouldAddToField&&cur.field.length>=6){lg('Battleground is full — max 6 creatures.','hint');if(typeof afterResolve==='function')afterResolve();return;}
  cur.ess-=card.cost;

  // Раскрытие спелла ИИ (2026-07-19, по прямому запросу автора — брейншторм с прошлой
  // сессии доведён до кода): человек в VS AI режиме никогда не видит руку ИИ (см.
  // rHiddenHand() в render.js) — единственный сигнал о том, что там был спелл, раньше был
  // текст в логе ПОСЛЕ уже случившегося эффекта. Теперь, если это карта-заклинание,
  // сыгранная ИИ, мы сперва показываем её настоящее лицо (playSpellRevealAnimation(),
  // render.js — вылет из центра oppHandZone, зависание ~0.6с, синий дисолв) и ТОЛЬКО
  // ПОСЛЕ этого резолвим сам эффект — см. _resolvePlayedCard() ниже. Три уточнения от
  // автора: (1) хотсит не участвует — там рука никогда не была по-настоящему скрыта от
  // игрока за столом, откладываем эту тему на будущее для СВОИХ спеллов отдельно; (2)
  // AI vs AI спектатор тоже не участвует (G.spectatorMode) — там некому показывать; (3)
  // конкретный слот рубашки не важен, вылет всегда из центра всей зоны руки.
  // afterResolve — новый опциональный колбэк (используется AI-степ-циклом, ai.js —
  // aiPlayCardsStep ждёт его перед тем как перейти к следующей карте, чтобы анимация не
  // перекрывалась со следующим действием); человеческий Play-клик (render.js) вызывает
  // doPlay(card) без второго аргумента — undefined безопасно игнорируется всюду ниже.
  const needsReveal = card.spell && G.mode==='vsai' && !G.spectatorMode && card.f===G.aiFaction;
  if(needsReveal){
    cur.hand=cur.hand.filter(c=>c.id!==card.id); // рука ИИ скрыта (рубашки) — убираем сразу, как раньше
    render(); // сразу отражаем -1 рубашку в руке ИИ и списанную эссенцию, ДО анимации
    playSpellRevealAnimation(card, ()=>{
      _resolvePlayedCard(card);
      if(typeof afterResolve==='function') afterResolve();
    });
    return;
  }

  // Исчезновение НЕ-таргетируемого спелла из руки (2026-07-19, по прямому запросу автора):
  // "простой" instant-спелл (эссенция, добор/сброс карт, AOE и т.п. — всё, что резолвится
  // МГНОВЕННО через doSpell(), без фазы выбора цели) раньше просто исчезал из руки в тот
  // же кадр, без какой-либо анимации — карта "телепортировалась в никуда". Теперь вместо
  // немедленного удаления из cur.hand сначала вешаем .spell-cast-out на реальный DOM-
  // элемент карты (тот же приём burnCard/revealVanish, но синий и БЕЗ fixed-position/
  // translate-трюка — карта уже стоит на месте во flex-раскладке руки), ждём длительность
  // анимации (450мс, синхронно с CSS — см. .hand .card.spell-cast-out в styles.css) и
  // ТОЛЬКО ПОСЛЕ этого реально убираем карту из руки и резолвим эффект.
  // Таргетируемые спеллы (TARGETED_SPELL_TAGS) сюда НЕ попадают — они и так уже покидают
  // руку в момент клика Play, целятся отдельной фазой, доп. анимация им не нужна (сама
  // карта к тому моменту, когда реально резолвится, давно не в руке визуально).
  // Работает одинаково для человека И для ИИ в хотсите/спектаторе — там рука ИИ рисуется
  // настоящими DOM-элементами (не рубашками), так что querySelector ниже находит карту
  // и для них тоже; в VS AI (скрытая рука ИИ) селектор просто ничего не найдёт — см.
  // needsReveal-ветку выше, она уже обработала этот случай отдельно и сюда не доходит.
  const isPlainInstantSpell = card.spell && !TARGETED_SPELL_TAGS.some(t=>hasTag(card,t));
  if(isPlainInstantSpell){
    const cardEl=document.querySelector(`.hand .card[data-id="${card.id}"]`);
    if(cardEl){
      if(G.previewCard===card.id) G.previewCard=null;
      cardEl.classList.remove('previewed');
      cardEl.classList.add('spell-cast-out');
      // 2026-07-24 (баг, автор): реальный эффект спелла резолвится тут с задержкой 450мс
      // (чисто под анимацию вылета карты) — G.turn читается ЗАНОВО в момент резолва
      // (см. triggerAbilities()), а не сохраняется здесь. Если игрок успевал нажать
      // End Turn ДО того, как этот таймаут срабатывал, ход уже флипался на соперника,
      // и эффект спелла резолвился под ЧУЖИМ G.turn (curK/oppK внутри triggerAbilities
      // получались перепутанными местами) — конкретно этим объясняются странные
      // зависания/десинхронизации хода, пойманные автором на SCATTERSHOT/BLIGHT/VIGIL.
      // Счётчик (не boolean — на случай нескольких карт подряд) даёт endTurn() знать,
      // что нужно подождать, прежде чем реально переключать G.turn.
      G._pendingInstantSpellResolve=(G._pendingInstantSpellResolve||0)+1;
      setTimeout(()=>{
        // 2026-07-24 (КРИТИЧНЫЙ баг, автор поймал живьём ПОСЛЕ вчерашнего фикса) —
        // try/finally: без него, если _resolvePlayedCard() кидает исключение ВНУТРИ
        // (например баг в одном из execution-кейсов конкретного спелла), счётчик
        // G._pendingInstantSpellResolve НИКОГДА не декрементится — а endTurn() из
        // вчерашнего фикса ждёт именно этот счётчик, значит виснет НАВСЕГДА (поллинг
        // раз в 100мс до бесконечности). Это ХУЖЕ, чем исходный баг — раньше хотя бы
        // ход в итоге переходил (просто криво). Теперь декремент гарантирован в любом
        // случае, даже если сам эффект спелла упал с ошибкой (та ошибка уйдёт в консоль,
        // но игра не замрёт).
        try{
          cur.hand=cur.hand.filter(c=>c.id!==card.id);
          _resolvePlayedCard(card);
        } catch(e){
          console.error('Spell resolution failed:', card.name, e);
        } finally {
          G._pendingInstantSpellResolve--;
        }
        if(typeof afterResolve==='function') afterResolve();
      }, 450);
      return;
    }
    // cardEl не найден — подстраховка (не должно происходить в норме для реально видимой
    // руки), падаем в обычный мгновенный путь ниже, чтобы ход точно не завис.
  }

  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  _resolvePlayedCard(card);
  if(typeof afterResolve==='function') afterResolve();
}

// Вынесено из doPlay() (2026-07-19) — сама логика "что происходит при розыгрыше карты"
// (таргетируемые спеллы ставят фазу выбора цели и ждут клика/aiResolvePendingSpellTarget();
// всё остальное резолвится сразу). Раньше это была нижняя половина тела doPlay() — теперь
// отдельная функция, чтобы doPlay() мог вызвать её либо сразу, либо из колбэка
// playSpellRevealAnimation() (см. needsReveal выше), не дублируя код дважды.
function _resolvePlayedCard(card){
  // Targeted spells pause for a target click instead of resolving instantly —
  // same pattern as shardTarget/sacrificeTarget/healTarget below. The spell
  // card is held in G.pendingSpell until a valid target is clicked (or the
  // player cancels by clicking anything else, same as those other phases).
  if(card.spell&&hasTag(card,'spell_dmg_target')){
    G.pendingSpell=card;G.phase='spellDmgTarget';
    lg(`${card.name}: select an enemy creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_buff_temp')){
    G.pendingSpell=card;G.phase='spellBuffTarget';
    lg(`${card.name}: select an ally creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_armor_temp')){
    G.pendingSpell=card;G.phase='spellArmorTarget';
    lg(`${card.name}: select an ally creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_dispel')){
    G.pendingSpell=card;G.phase='spellDispelTarget';
    lg(`${card.name}: select an enemy creature to dispel.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_untap')){
    G.pendingSpell=card;G.phase='spellUntapTarget';
    lg(`${card.name}: select an ally creature to activate.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_bounce_target')){
    G.pendingSpell=card;G.phase='spellBounceTarget';
    lg(`${card.name}: select any creature on the field.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_bounce_ally_target')){
    // GUST/REVERSE redesign (2026-07-24) — тот же bounce-эффект (doSpellBounceTarget()
    // ниже уже общий для обеих версий), но таргетинг ограничен своей стороной — вся
    // разница живёт в phase-гейте (onClick()) и render.js подсветке, не в самой функции.
    G.pendingSpell=card;G.phase='spellBounceAllyTarget';
    lg(`${card.name}: select an ally creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_execute_half')){
    // JUDGMENT/DEATHBLOW (2026-07-24, по прямому запросу автора) — условный дешёвый
    // килл: только по цели на ПОЛОВИНЕ maxHP или меньше. Реальная фильтрация цели —
    // doSpellExecuteHalfTarget() ниже + onClick()/render.js гейт.
    G.pendingSpell=card;G.phase='spellExecuteHalfTarget';
    lg(`${card.name}: select an enemy creature at half HP or less.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_provoke_break_target')){
    G.pendingSpell=card;G.phase='spellProvokeBreakTarget';
    lg(`${card.name}: select an enemy Provoke creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_dmg_trample_target')){
    G.pendingSpell=card;G.phase='spellDmgTrampleTarget';
    lg(`${card.name}: select an enemy creature.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_destroy_target')){
    G.pendingSpell=card;G.phase='spellDestroyTarget';
    lg(`${card.name}: select the enemy World or Artifact to destroy.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_burn_target')){
    G.pendingSpell=card;G.phase='spellBurnTarget';
    lg(`${card.name}: select an enemy creature to set on fire.`,'hint');
  } else if(card.spell&&hasTag(card,'spell_fear_target')){
    G.pendingSpell=card;G.phase='spellFearTarget';
    lg(`${card.name}: select an enemy creature to Fear.`,'hint');
  } else {
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
  }
  render();
  // checkWin() (2026-07-24, по прямому запросу автора) — раньше тут не было, потому что
  // ни один инстант-эффект без фазы выбора цели не мог напрямую снять HP игроку (все
  // damage-эффекты били только по существам). SCATTERSHOT/SHRAPNEL теперь могут случайно
  // попасть по базе (см. case 'random_spread' в abilities.js) — тот же checkWin(), что
  // уже стоит в конце каждого doSpellXTarget() в этом файле, просто на уровень выше, раз
  // тут нет отдельного резолвера для мгновенных эффектов.
  checkWin();
  // Раньше aiResolvePendingSpellTarget() вызывался СНАРУЖИ, сразу после doPlay(), в
  // aiPlayCardsStep() (ai.js). Теперь, когда doPlay() может уйти в асинхронный колбэк
  // (needsReveal выше), эта проверка централизована здесь — работает одинаково что для
  // мгновенного пути, что и для отложенного, и вызывающему коду (ai.js) больше не нужно
  // помнить об этом отдельно.
  if(G.pendingSpell && isAiTurn()) aiResolvePendingSpellTarget();
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
  card.sleeping=true;card.exhausted=false;card.feared=false;card.burning=false;card.provokeBroken=false;card.interceptUsed=false;card.stealthBroken=false;card.shieldConsumed=false;card.frozen=false;card.frozenTurnsLeft=0;card._frostLeaving=false;card.atkBonus=0;card.tempAtkBonus=0;card.maxHpBonus=0;card.baseMaxHp=null;card.auraMaxHpBonus=0;card.worldMaxHpBonus=0;card.worldMaxHpSet=false;card.squadParam=null;card.squadAtkBonus=0;card.squadMaxHpBonus=0;card.squadArmorBonus=0;card.spellArmorBonus=0;card.armorMax=undefined;card.auraArmorBonus=0;card.worldArmorBonus=0;
  // Инкарнация: если эта карта была пересена рано (spell revive:full / raise:N),
  // ПОКА её собственный incarnTimer ещё тикал в кладбище — тот тик так и не завершился
  // (endTurn()'s incarnTimer-loop его больше не увидит, карта уже не в grave), поэтому
  // само поле нужно погасить явно. incarnUsed НЕ трогаем — эта карта не "потратила"
  // инкарнацию, она была спасена ДРУГИМ эффектом, так что при следующей естественной
  // смерти (killCard()) она снова законно получит полноценный incarnTimer.
  card.incarnTimer=undefined;
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

// ── Боевая последовательность (переписано 2026-07-17, автор — порядок теперь: урон →
// контрудар → on_attack/on_death; закрывает баг с Erase, см. п.6-7) ──────────────────────
// 1. Атакующий наносит урон цели (dmgCard) — резолвится сразу и обычным образом: если это
//    убивает цель, killCard() отрабатывает тут же (труп уходит на кладбище как всегда —
//    Erase, если он есть у атакующего, заберёт его оттуда чуть позже, на шаге 5).
// 2. Считаем РЕАЛЬНО снятый урон (realDmgDealt) — снимок HP цели до/после dmgCard(),
//    а не номинальный ATK: если часть ушла в Броню или удар поглотила Solana Shield,
//    та часть НЕ считается "снятой кровью" — vampiric лечит строго на то, что реально
//    ушло с HP цели, не больше (по прямому запросу автора).
// 3. Контрудар — если цель НЕ была Feared/Exhausted до этого удара (wasFearedBefore/
//    wasExhaustedBefore, снимок ДО shift'а урона) и атакующий не invisible. Резолвится
//    ДАЖЕ на смертельный для цели удар (одновременное разрешение урона, как в MTG/
//    Hearthstone — иначе высокий ATK убивал вообще без риска для атакующего).
//    targetCounterAtk снимается ДО dmgCard()/killCard() цели — иначе killCard() успевает
//    обнулить squadAtkBonus мёртвой карты (и/или dmgCard() выше меняет target.hp, от которого
//    теперь живьём зависит Rage — см. rageAtkBonus() в abilities.js), и контрудар был бы слабее,
//    чем цель реально имела в момент удара. КЛЮЧЕВОЕ ОТЛИЧИЕ от версии 16 июля: смерть САМОГО
//    атакующего от этого контрудара откладывается (dmgCard(att,...,deferDeath=true)) —
//    его HP может уйти в минус, но killCard() для него пока не вызывается.
// 4. Резолвим on_attack-эффекты этого удара (fear/burn/taunt_break/vampiric/draw) — ПОСЛЕ контрудара (не до, как было раньше). Vampiric лечит атакующего на realDmgDealt
//    уже с учётом полученной сдачи — то есть может вытащить его из минуса, если лечения
//    хватает перекрыть входящий контрудар.
// 5. Если удар был смертельным для цели (ctx.target.hp<=0) — резолвим on_kill
//    (necrophage/Erase). Erase выставляет card.hp=card.maxHp — то есть, как и vampiric на
//    шаге 4, может полностью вытащить атакующего из смертельного контрудара: труп цели
//    в любом случае убирается из кладбища в войд, а атакующий "переписывает" свой HP.
// 6. Только теперь — финальная проверка: если att.hp всё ещё <=0 (ни vampiric, ни Erase не
//    спасли), резолвим его настоящую смерть через killCard(att,curK). До 2026-07-16 контрудар
//    не бил по смертельным ударам вообще, 16 июля его вернули, но необходимую сдачу отложенно
//    лечить было НЕЛЬЗЯ (Erase резолвился отдельным timing'ом on_kill_survive и требовал
//    att.hp>0 ДО его собственного лечения) — из-за этого Erase не мог спасти от смертельной
//    контратаки, хотя по замыслу должен был. С 2026-07-17 это единый порядок для обоих
//    источников лечения (vampiric и Erase), никакого отдельного timing'а/спецкейса для
//    necrophage больше нет.
// 7. Fear: контрудар блокируется только если цель БЫЛА feared ДО этого удара (иначе
//    fear-атакующий бил бы первый раз безнаказанно — fear наложился бы этим же ударом и
//    тут же снял бы его собственную контратаку). На следующих атаках по уже feared цели
//    контрудара по-прежнему нет.
function doAttack(att,target){
  const curK=G.turn;
  const oppK=curK==='tea'?'jeet':'tea';
  // Intercept (2026-07-17, Xuiqtr) — третий защитный слой, ниже Bushido/Provoke. Подмена
  // цели происходит ЗДЕСЬ, на входе в резолв — сам выбор в UI игрок делает как обычно
  // (см. getTargetableCards(), которая про Intercept вообще не знает и не должна:
  // атакующий свободно выбирает цель, перехват — это то, что происходит ПОСЛЕ выбора).
  // Если атакующий и так выбрал именно перехватчика — не расходуем перехват (условие
  // автора: "если атакующий сам выбрал это существо целью — перехват не расходуется").
  const interceptor=getInterceptor(G[oppK].field, target);
  if(interceptor && interceptor.id!==target.id){
    interceptor.interceptUsed=true;
    lg(`${interceptor.name} intercepts the attack meant for ${target.name}!`,'imp');
    queueFieldFx(interceptor.id,'INTERCEPTED!','fx-fear'); // переиспользуем готовый fx-класс, тот же "красный всплеск"
    target=interceptor;
  }
  // atk_vs_burning:N (2026-07-19, FAERON — доп. часть Fire Shield по прямому запросу
  // автора): если ЦЕЛЬ УЖЕ горит (target.burning) в момент этого удара — атакующий наносит
  // на N больше урона ЭТИМ ударом. Проверяем состояние цели ДО dmgCard() ниже (снимок
  // урона считается один раз — атакующий не поджигает и тут же не получает бонус тем же
  // ударом, тот же принцип "эффект не отменяет/не усиливает сам себя в этот же тик", что и
  // у wasFearedBefore/wasExhaustedBefore/stealthFirstStrike в этой же функции).
  const burnBonus = (hasTag(att,'atk_vs_burning') && target.burning) ? (getTagVal(att,'atk_vs_burning')||0) : 0;
  // atk_vs_feared:N (2026-07-23, RYVLEN rework, по прямому запросу автора) — тот же
  // принцип, что и atk_vs_burning выше, только по target.feared вместо target.burning.
  const fearBonus = (hasTag(att,'atk_vs_feared') && target.feared) ? (getTagVal(att,'atk_vs_feared')||0) : 0;
  // world_atk_vs_burning:N / world_atk_vs_feared:N (2026-07-23, VALLEY/HUNGER ауры, по
  // прямому запросу автора) — командные версии двух тегов выше: если у атакующего есть
  // активный Мир с таким тегом, бонус применяется КАЖДОМУ своему существу, не только
  // конкретной карте (в отличие от atk_vs_burning/atk_vs_feared, которые сидят на самой
  // карте). Проверяется цель ДО этого удара — тот же принцип "эффект не усиливает сам
  // себя в этот же тик", что и у burnBonus/fearBonus.
  const curWorld=G[curK].world;
  const worldBurnBonus=(curWorld && hasTag(curWorld,'world_atk_vs_burning') && target.burning) ? (getTagVal(curWorld,'world_atk_vs_burning')||0) : 0;
  const worldFearBonus=(curWorld && hasTag(curWorld,'world_atk_vs_feared') && target.feared) ? (getTagVal(curWorld,'world_atk_vs_feared')||0) : 0;
  const atk=att.atk+(att.atkBonus||0)+rageAtkBonus(att)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0)+burnBonus+fearBonus+worldBurnBonus+worldFearBonus;

  // Fear и Burn полностью замещают звук атаки — если этот удар реально применит
  // один из этих эффектов (цель выживает после урона), звук самой атаки не играем.
  const targetSurvives = (target.hp - atk) > 0;
  // 2026-07-27 (автор поймал живьём) — раньше willFear/willBurn проверяли ТОЛЬКО тег
  // атакующего + выживание цели, не саму ВОЗМОЖНОСТЬ дебаффа реально примениться. Из-за
  // этого атака Fear/Burn-существа по цели с Ward (Ward блокирует именно Fear/Burn —
  // см. case 'fear'/'burn' в abilities.js) проходила В ПОЛНОЙ ТИШИНЕ: обычный звук атаки
  // пропускался (считалось, что "сыграет debaf-звук"), а debaf-звук не играл ВООБЩЕ, т.к.
  // Ward блокирует эффект без своего звука. Тот же провал — у замороженной цели (Frost
  // тоже блокирует Fear/Burn целиком, см. тот же case). Теперь debuffBlocked учитывает
  // обе иммунности — если дебафф реально не наложится, играем ОБЫЧНЫЙ звук атаки вместо
  // тишины (по прямому запросу автора: "хоть эффект дебафа и не случился, звук атаки
  // всё равно должен звучать").
  const debuffBlocked = target.frozen || hasTag(target,'ward');
  const willFear = hasTag(att,'fear') && targetSurvives && !debuffBlocked;
  const willBurn = hasTag(att,'burn') && targetSurvives && !debuffBlocked;
  lg(`${att.name} attacks ${target.name}!`,'imp');

  // Снимок ДО on_attack-эффектов этого удара: fear, наложенный ИМЕННО этим ударом, не должен
  // отменять контратаку за этот же удар — иначе fear-существо бьёт первый раз безнаказанно
  // (target.feared уже true к моменту проверки ниже, хотя цель была feared только что, этим
  // же ударом). Дальше, на СЛЕДУЮЩИХ атаках по уже feared цели, контратака как и раньше не идёт.
  const wasFearedBefore = target.feared;
  const wasExhaustedBefore = target.exhausted;
  // Frost (2026-07-27) — тот же принцип "снимок ДО": замороженная цель не контратакует
  // (не может действовать вообще, пока заморожена), но Frost, наложенный ИМЕННО этим
  // ударом, не должен отменять контратаку ЗА ЭТОТ ЖЕ удар — иначе Frost-атакующий бил бы
  // первый раз безнаказанно.
  const wasFrozenBefore = target.frozen;
  // Stealth (2026-07-17, TEANTIST) — anti-invisible пара #2: пока не атаковал ни разу,
  // недостижим вообще (см. getTargetableCards()); в момент первой атаки становится
  // достижимым НАВСЕГДА (см. att.stealthBroken=true ниже), а именно ЭТА первая атака ещё и
  // не получает контрудар — цена за раскрытие. Снимок ДО того, как ниже выставится
  // att.stealthBroken=true — та же защита от "эффект отменяет сам себя в тот же тик", что
  // уже применяется к wasFearedBefore/wasExhaustedBefore выше.
  const stealthFirstStrike = hasTag(att,'stealth') && !att.stealthBroken;
  // 2026-07-16, второй пересмотр боевой последовательности: контрудар возвращён ДАЖЕ если
  // цель гибнет от этого же удара (см. п.5 в шапке файла выше) — поэтому её боевую силу
  // нужно снять СЕЙЧАС, до dmgCard()/killCard(): rageAtkBonus() читает target.hp/target.maxHp
  // ЖИВЬЁМ (2026-07-20 — Rage больше не хранимое поле rageBonus, см. abilities.js), а dmgCard()
  // ниже вот-вот изменит target.hp — если считать контрудар ПОСЛЕ урона, Rage-бонус мог бы
  // неверно исчезнуть/появиться относительно состояния цели РОВНО в момент удара (то же самое
  // одновременное разрешение урона, что в MTG/Hearthstone — обе стороны бьют "как есть на
  // момент боя", а не по очереди, squadAtkBonus та же логика — killCard() обнуляет её у мёртвой
  // карты).
  const targetCounterAtk = target.atk + (target.atkBonus||0) + (target.tempAtkBonus||0) +
                            rageAtkBonus(target) + (target.squadAtkBonus||0);

  const hpBefore=target.hp;
  dmgCard(target,atk,oppK);
  // Foxy Trick (2026-07-27, по прямому запросу автора: "сначала проверка не промахнётся ли
  // атака вообще, потом уже абсорб урона") — звук решается ПОСЛЕ dmgCard(), а не до, потому
  // что флаг промаха (_foxyDodgedThisHit) появляется только внутри неё. На промах — БЕЗ
  // звука вообще (автор добавит отдельный SFX позже), только визуал (queueFieldFx 'MISSED!'
  // уже отыгран самой dmgCard()). Иначе — прежняя логика: обычный звук атаки, если дебафф
  // в итоге не наложится (Ward/Frost), иначе тишина — сыграет debaf-звук чуть ниже.
  if(!target._foxyDodgedThisHit && !willFear && !willBurn) playAttackSfx(att);
  // Math.max(0,target.hp) — если удар был лишним "оверкиллом" (hp ушло в минус), не даём
  // realDmgDealt раздуться сверх того, сколько у цели реально БЫЛО жизни (hpBefore).
  const realDmgDealt=Math.max(0, hpBefore-Math.max(0,target.hp));

  // Контрудар — deferDeath=true: HP атакующего может уйти в минус, но killCard() для него
  // пока НЕ вызывается — vampiric/Erase ниже ещё могут его спасти (см. шапку файла выше).
  if(!hasTag(att,'invisible') && !wasFearedBefore && !wasExhaustedBefore && !stealthFirstStrike && !wasFrozenBefore)
  dmgCard(att, targetCounterAtk, curK, false, true);

  // Thorns / "Огненный Щит" (2026-07-17, FAERON) — анти-invisible пара: вместо того чтобы
  // быть недостижимой (Seeker/invisible), эта карта наказывает того, кто до неё дотянулся.
  // КОНВЕНЦИЯ (уточнено автором 2026-07-19): Fire Shield — это ВСЕГДА пара тегов на карте —
  // thorns:N (эта защитная часть) идёт вместе с atk_vs_burning:N (наступательная часть, см.
  // burnBonus чуть выше в этой же функции) — если даёшь Fire Shield новой карте, вешай ОБА
  // тега сразу, не только thorns.
  // Резолвится вне зависимости от того, выжила ли цель (та же логика "regardless of
  // outcome", что и контрудар выше — deferDeath=true, финальная смерть att разрешится один
  // раз чуть ниже). Пропускается, если этот конкретный удар был полностью поглощён/
  // промазан (target._shieldBlockedThisHit/_frostBlockedThisHit/_foxyDodgedThisHit,
  // последние два добавлены 2026-07-27 по прямому запросу автора — тот же принцип, что уже
  // действует для fear/burn/taunt_break: если атака физически не задела цель, шипы бить в
  // ответ нечему, удар до тела не долетел).
  if(hasTag(target,'thorns') && !target._shieldBlockedThisHit && !target._frostBlockedThisHit && !target._foxyDodgedThisHit){
    const thornsVal=getTagVal(target,'thorns')||1;
    dmgCard(att,thornsVal,curK,true,true); // bypassArmor=true ("огонь" игнорирует броню), deferDeath=true
    lg(`${target.name}'s Fire Shield burns ${att.name} for ${thornsVal}!`,'dmg');
  }

  // Game of Market (2026-07-28, "To the Moon with DHD", ультраредкий Mood-трейт,
  // ico_market.png) — та же гейтинг-логика, что у Thorns чуть выше: пропускается, если
  // этот конкретный удар был полностью поглощён/промазан (shield/frost/foxy). bypassArmor
  // для бонус-урона = false — это "довесок" к обычной физической атаке, уважает броню
  // цели так же, как сама атака (в отличие от Bolt-хука в doBoltTarget() ниже, где бонус
  // магический). Резолвится с задержкой (см. resolveMarketEvent()) — по прямому запросу
  // автора, чтобы бонус/самоурон не сливался в тот же момент, что и сама атака.
  resolveMarketEvent(att, curK, target, oppK, false);
  // NANA (2026-07-29, "Nanas from SMB") — тот же вызов-паттерн, что у Market чуть выше,
  // bypassArmor=false для дамаг-ветки по прямому запросу автора (банан от обычной атаки
  // уважает Armor цели так же, как сама атака).
  resolveNanaEvent(att, curK, target, oppK, false);

  triggerAbilities(att,'on_attack',{target,realDmgDealt});
  if(target.hp<=0) triggerAbilities(att,'on_kill',{target});

  // Финальное разрешение смерти атакующего — только теперь, после того как vampiric/Erase
  // уже успели его подлечить. Если он всё ещё <=0, вот тут он реально умирает.
  if(att.hp<=0) killCard(att,curK);

  // Trample (2026-07-17, MTG-style pierce rework; widened same day per author feedback):
  // originally only fired when pierce was forced onto a Provoke creature (its one carve-out
  // from Provoke being otherwise absolute — see getTargetableCards()/canAttackBase() above).
  // Author's call: it reads more consistent if pierce tramples on ANY enemy creature it
  // attacks, not just Provoke ones — a pierce creature choosing to hit a random 1-HP blocker
  // should still spill the rest into the base, same as it would against a taunt. So this is
  // now gated on attHasPierce alone, no Provoke check.
  // target.hp is deliberately left negative by dmgCard() on a lethal hit (see its comments)
  // specifically so this can read the overkill back off it — killCard() above (called
  // earlier, inside dmgCard()) doesn't touch the corpse's .hp field, so it's still there.
  // A still-shielded target (Solana Shield) leaves target.hp untouched by the whole hit, so
  // overflow is correctly 0 without any separate check.
  const attHasPierce=hasTag(att,'pierce')||(att.squadParam&&att.squadParam.pierce);
  if(attHasPierce){
    const overflow=Math.max(0,-target.hp);
    if(overflow>0){
      G[oppK].hp=Math.max(0,G[oppK].hp-overflow);
      lg(`${att.name} tramples through ${target.name} — ${overflow} overflow dmg to ${oppK.toUpperCase()} base!`,'dmg');
      flashBase('opp','dmg',overflow);
    }
  }

  att.exhausted=true;
  // Stealth — раскрывается после ЛЮБОЙ первой атаки, вне зависимости от исхода (даже если
  // att сам погиб от контрудара выше — не важно, тег одноразовый и это его единственная работа).
  if(hasTag(att,'stealth')) att.stealthBroken=true;
  // Stealth reveal bonus (2026-07-26, по прямому запросу автора) — В ДОПОЛНЕНИЕ к пропуску
  // контрудара (см. stealthFirstStrike выше, объявлен ДО строки att.stealthBroken=true —
  // тот же снимок "до себя же", что и у wasFearedBefore/wasExhaustedBefore) первая атака из
  // стелса ещё и добирает 3 карты владельцу. Срабатывает независимо от того, выжил ли att
  // после Thorns/побочного урона выше — раскрытие уже состоялось этим ударом, тег одноразовый,
  // эффект не привязан к выживанию (та же логика, что у самого att.stealthBroken=true строкой
  // выше). Пустая колода — молчаливый частичный/нулевой добор, без лога-ошибки (тот же
  // паттерн, что у обычного case 'draw' в abilities.js).
  if(stealthFirstStrike){
    const stealthDrawN=3;
    const ownHand=G[att.f].hand, ownDeck=G[att.f].deck;
    let stealthDrawn=0;
    for(let i=0;i<stealthDrawN;i++){ if(ownDeck.length>0){ ownHand.push(ownDeck.shift()); stealthDrawn++; } }
    if(stealthDrawn>0) lg(`${att.name}: reveals from Stealth — draws ${stealthDrawn} card(s).`,'imp');
  }
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
  if(vard.exhausted||vard.frozen){lg(`${vard.name} already acted this turn.`,'dmg');return;}
  playSfx('card_spell_atack');
  const dmgAmt=getTagVal(vard,'aoe')||2;
  lg(`⚡ ${vard.name} — Dark Will: ${dmgAmt} dmg to ALL enemies!`,'imp');
  [...G[oppK].field].forEach(c=>dmgCard(c,dmgAmt,oppK,true));
  const vardId=vard.id;
  vard.exhausted=true;G.sel=null;G.phase='action';
  checkWin();render();
  // Тот же баг-фикс, что и у doBoltTarget() — doUmbAsir() (её "AOE-близнец") уже вызывает
  // activateCard(), а Vardan почему-то нет. Для консистентности всех активок — добавлено.
  activateCard(vardId);
}

// Umbasir v2 — точечный магический урон вместо AOE (см. CLAUDE.md, новая уникальность
// Umbasir после того, как он стал дублем Orbiton). По образцу SHARD (артефакт), но на
// существе — свой Squad-бонус (param:'bolt', см. SQUAD_DEFS), тот же бонус за Feared цель.
function doUmbBolt(){
  const bolt=findC(G.sel);
  if(!bolt||!hasTag(bolt,'bolt')){lg('Select a Bolt card first.','hint');return;}
  if(bolt.exhausted||bolt.frozen){lg(`${bolt.name} already acted this turn.`,'dmg');return;}
  if(G.phase==='boltTarget'){G.phase='action';G.sel=null;render();return;} // повторный клик — отмена
  G.phase='boltTarget';
  lg(`${bolt.name}: select an enemy creature to deal ${(bolt.squadParam&&bolt.squadParam.bolt)||getTagVal(bolt,'bolt')||1} damage.`,'hint');
  render();
}

function doBoltTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const bolt=findC(G.sel);
  if(!bolt){G.phase='action';G.sel=null;render();return;}
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  playSfx('card_spell_atack');
  const dmg=(bolt.squadParam&&bolt.squadParam.bolt)||getTagVal(bolt,'bolt')||1;
  lg(`${bolt.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  queueFieldFx(card.id,'BOLT!','fx-shard'); // тот же плейсхолдер-эффект, что у Shard — переиспользуем, пока нет своего арта
  const boltOwnerK=G.turn;
  dmgCard(card,dmg,oppK,true);
  // Game of Market (2026-07-28) — Umbasir-болтер тоже может нести этот тег (по прямому
  // запросу автора: "болт умбасира может нанести не 1 а 3 урона, либо -2 хп"). Тот же
  // хук, что в doAttack() — bypassArmor=true для бонус-урона здесь, т.к. сам Bolt уже
  // магический (bypassArmor=true чуть выше), бонус наследует ту же природу удара.
  resolveMarketEvent(bolt, boltOwnerK, card, oppK, true);
  // NANA (2026-07-29) — тот же хук, что у Market чуть выше: bypassArmor=true для
  // дамаг-ветки, т.к. сам Bolt уже магический, бонус наследует ту же природу удара.
  resolveNanaEvent(bolt, boltOwnerK, card, oppK, true);
  const boltId=bolt.id;
  bolt.exhausted=true;
  G.phase='action';G.sel=null;
  checkWin();render();
  // Баг-фикс (2026-07-19, автор нашёл живьём): doAttack()/doUmbAsir() уже дают кастующей
  // карте "пульс поднятия" через activateCard() (см. @keyframes cardActivate, styles.css) —
  // ровно тот визуал, который сигналит "эта карта только что подействовала". У Bolt его не
  // было вообще — карта просто гасла в exhausted без какого-либо явного сигнала, что именно
  // ОНА была источником эффекта. Добавлено для консистентности со всеми остальными активками.
  activateCard(boltId);
}

function onBaseClick(faction){
  if(isAiTurn()) return;
  if(faction===G.turn) return;
  if((G.phase==='selectTarget'||G.phase==='action')&&G.sel&&canAttackBase()){
    tryAttackBase();
  }
  if(G.phase==='healTarget'&&G.sel){
    const att=findC(G.sel);
    if(att){ tryAttackBase(); }
  }
}

// Intercept (2026-07-17, Xuiqtr rework — тег заменил provoke на всех 8 картах Кситра,
// см. data.js) — третий, самый младший слой защиты, ПОСЛЕ Bushido и Provoke: если на поле
// нет ни одного, но есть Кситр, ещё не перехватывавший в этот ход, атака автоматически
// перенаправляется на него, кем бы её ни выбрал атакующий (сам выбор цели в UI не
// меняется — подмена происходит только на резолве, см. doAttack()/tryAttackBase()).
// ИЗМЕНЕНО (2026-07-24, по прямому запросу автора — ОТМЕНЯЕТ строку ниже): раньше тут было
// "Sleeping/exhausted/feared НЕ исключают". Теперь exhausted ИСКЛЮЧАЕТ — и Provoke, и
// Intercept "стоят как открытые карты" (та же логика, что у getTargetableCards() выше):
// форсят/перехватывают, только пока сама карта untapped. Sleeping по-прежнему НЕ исключает
// (это не про способность действовать самой, а про то, была ли уже потрачена атакой в этом
// ходу). ИЗМЕНЕНО ЕЩЁ РАЗ (2026-07-25, по прямому запросу автора): feared ТЕПЕРЬ ТОЖЕ
// исключает — испуганная карта не может ни форсить атаку на себя (Provoke), ни перехватывать
// (Intercept), тем же принципом, что и exhausted.
// Порядок между несколькими Кситрами — первый вышедший на поле первым и перехватывает:
// field.push() в doCreature() всегда добавляет новые карты в конец массива, так что
// filter()+[0] по живому полю уже даёт нужный порядок без отдельной сортировки.
function getInterceptor(oppField, target){
  const bushido = oppField.some(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return null;
  // 2026-07-25 — тот же !c.feared, что и везде ниже: испуганный Provoke не блокирует Intercept.
  const provoke = oppField.some(c=>c.tags&&c.tags.includes('provoke')&&!c.provokeBroken&&!c.exhausted&&!c.feared&&!c.frozen);
  if(provoke) return null;
  // Баг-фикс (2026-07-19, автор нашёл живьём): если атакующий и так уже выбрал целью
  // ДРУГОЕ существо с Intercept ("Xuiqtr") — перехват вообще не должен срабатывать.
  // Раньше проверялось только "не перехватываем сами себя" (interceptor.id!==target.id
  // в doAttack()), но это не покрывало случай ДВУХ разных Intercept-существ на поле:
  // при атаке на второго вышедшего Xuiqtr'a первый (раньше вышедший) всё равно
  // подменял собой цель — то есть между собой Intercept-существа воровали удары друг у
  // друга, хотя Intercept задуман как защита "обычных" существ, а не как способ
  // одному Xuiqtr'у переманивать удар с другого.
  // ИСПРАВЛЕНО (2026-07-27, автор поймал живьём): предыдущая версия блокировала защиту
  // ВСЕГДА, когда цель сама несёт intercept — включая случай, когда эта цель уже
  // "закрыта" (exhausted/feared/frozen/уже перехватывала в этот ход), то есть больше НЕ
  // "стоит как открытая карта" и сама перехватывать не может. Баг: открытый Xuiqtr не
  // защищал ЗАКРЫТОГО Xuiqtr — цель оставалась беззащитной, хотя рядом стоял ровно тот
  // же самый защитник, что спас бы любое другое существо того же поля. Правило "не
  // воровать хиты друг у друга" должно применяться, ТОЛЬКО пока цель САМА сейчас
  // способна перехватывать (т.е. reально "стоит открытой") — если цель уже закрыта, она
  // не отличается от любого другого беззащитного существа и ДОЛЖНА получить защиту.
  if(target && hasTag(target,'intercept') && !target.exhausted && !target.feared && !target.frozen && !target.interceptUsed) return null;
  // 2026-07-25 — испуганный Intercept тоже не перехватывает (тот же принцип, что у Provoke выше).
  const candidates = oppField.filter(c=>!c.spell&&!c.world&&!c.artifact&&hasTag(c,'intercept')&&!c.interceptUsed&&!c.exhausted&&!c.feared&&!c.frozen);
  return candidates.length>0 ? candidates[0] : null;
}

function canAttackBase(){
  if(!G.sel) return false;
  const att=findC(G.sel);
  if(!att||att.exhausted||att.sleeping||att.feared||att.frozen) return false;
  const oppK=G.turn==='tea'?'jeet':'tea';
  const opp=G[oppK];
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido) return false;
  // Provoke rework (2026-07-17, автор): pierce больше не обходит Provoke на пути к базе —
  // см. getTargetableCards() выше за общее обоснование. Провокация теперь блокирует базу
  // абсолютно для всех, независимо от pierce.
  // Баг-фикс (2026-07-17, автор нашёл живьём): не хватало `&&!c.provokeBroken` — после
  // EXPOSE/UNMASK (или taunt_break) провокация формально всё ещё "есть" (тег с карты не
  // снимается), просто временно подавлена флагом `provokeBroken`. Без этой проверки база
  // оставалась недоступной ДАЖЕ ПОСЛЕ успешного снятия провокации — ровно тот баг, который
  // и был смыслом самого спелла.
  // Provoke "открытая карта" (2026-07-24, по прямому запросу автора) — та же поправка,
  // что у getTargetableCards() выше: провокация блокирует базу, только пока сама карта
  // не exhausted. + !c.feared (2026-07-25) — испуганная тоже не блокирует.
  const provoke=opp.field.find(c=>c.tags.includes('provoke')&&!c.provokeBroken&&!c.exhausted&&!c.feared&&!c.frozen);
  if(provoke) return false;
  return true;
}

function tryAttackBase(){
  if(G.gameOver) return;
  if(G.phase!=='selectTarget'&&G.phase!=='healTarget'){lg('Select a card to attack with first.','hint');return;}
  const att=findC(G.sel);if(!att)return;
  const oppK=G.turn==='tea'?'jeet':'tea';const opp=G[oppK];
  const atk=att.atk+(att.atkBonus||0)+rageAtkBonus(att)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0);
  const bushido=opp.field.find(c=>c.tags&&c.tags.includes('bushido'));
  if(bushido){lg(`${bushido.name} (Bushido) blocks — must attack it first!`,'hint');return;}
  // Provoke rework (2026-07-17): absolute for everyone now, no pierce exception — see
  // getTargetableCards()/canAttackBase() above. Pierce's overflow-to-base trample instead
  // lives in doAttack() below, since that's now the ONLY path a pierce attacker has left
  // to reach a provoke creature (forced target selection, same as any other attacker).
  // Same provokeBroken fix as canAttackBase() above — see its comment.
  // "Открытая карта" (2026-07-24, по прямому запросу автора) — тот же !c.exhausted, что
  // везде выше. + !c.feared (2026-07-25).
  const provoke=opp.field.find(c=>c.tags.includes('provoke')&&!c.provokeBroken&&!c.exhausted&&!c.feared&&!c.frozen);
  if(provoke){lg(`${provoke.name} has Provoke — attack it first!`,'hint');return;}
  // Intercept (2026-07-17, Xuiqtr) — третий слой, ниже Bushido/Provoke (оба уже проверены
  // и не сработали выше, раз мы досюда дошли). Игрок кликнул по базе — но если есть
  // непотраченный перехватчик, удар вместо базы улетает в него, полноценным разменом
  // через doAttack() (не прямой урон в HP базы). getInterceptor() тут технически
  // передублирует bushido/provoke проверки выше — cheap, безопасно, и держит всю логику
  // "кто может перехватить" в одном месте (см. getInterceptor()).
  const interceptor=getInterceptor(opp.field);
  if(interceptor){
    interceptor.interceptUsed=true; // doAttack() below won't set this itself — its own
    // redirect branch only fires when target!==interceptor, but here target already IS
    // the interceptor (we're calling it directly instead of going through a redirect).
    lg(`${interceptor.name} intercepts the attack aimed at the base!`,'imp');
    doAttack(att,interceptor);
    return;
  }
  playSfx('base_atack');
  lg(`${att.name} hits ${oppK.toUpperCase()} base for ${atk} dmg!`,'dmg');
  opp.hp=Math.max(0,opp.hp-atk);
  // Market/Nana (2026-07-29, баг-фикс по прямому запросу автора) — раньше прямой удар по
  // базе (эта функция) вообще не звал ни один из двух хуков, только doAttack() по
  // существу их вызывал. targetIsBase=true — см. комментарии у самих функций выше
  // (resolveMarketEvent/resolveNanaEvent) за подробностями, чем этот путь отличается от
  // обычного удара по существу.
  resolveMarketEvent(att, G.turn, null, oppK, false, true);
  resolveNanaEvent(att, G.turn, null, oppK, false, true);
  triggerAbilities(att,'on_attack',{target:null});
  att.exhausted=true;G.sel=null;G.phase='action';
  // Stealth (2026-07-17) — атака по базе тоже считается "первой атакой", раскрывает
  // так же, как атака по существу (см. doAttack() выше) — просто тут нечего снимать
  // (контрудара у базы и так не бывает), только фиксируем сам факт.
  if(hasTag(att,'stealth')) att.stealthBroken=true;
  flashBase('opp', 'dmg', atk);
  checkWin();render();
  activateCard(att.id); 
}

// Frost (2026-07-27, "Frost Attack", ultra-rare Mood trait Winter from RGB) — снятие статуса
// (по урону ИЛИ по естественному истечению 2 ходов в endTurn()) откладывается на один
// render-тик с card._frostLeaving=true, чтобы CSS в mkSmallEl() (render.js) успела доиграть
// обратную анимацию исчезновения frost-бокса (тот же трюк, что у .burning-out в руке —
// см. css/styles.css), прежде чем card.frozen реально станет false.
function scheduleFrostRemoval(card){
  // БАГФИКС (2026-07-27, автор поймал живьём): раньше card.frozen становился false ТОЛЬКО
  // внутри setTimeout, ОДНОВРЕМЕННО с _frostLeaving=false — то есть состояние "уже не
  // frozen, но ещё _frostLeaving=true" (единственное, при котором mkSmallEl(), render.js,
  // вообще применяет класс .frost-leaving и проигрывает анимацию сжатия) физически ни разу
  // не рендерилось. Видимый эффект: бокс просто исчезал мгновенно, без анимации, хотя
  // появление (entrance, frostIn) работало нормально. Фикс: frozen становится false СРАЗУ,
  // синхронно, вместе с render() — именно этот тик и показывает "leaving"-состояние;
  // setTimeout ниже только дожидается конца CSS-анимации (0.3с, см. .frost-leaving в
  // css/styles.css) и убирает бокс из DOM насовсем.
  card.frozen=false;
  card.frozenTurnsLeft=0;
  card._frostLeaving=true;
  render();
  setTimeout(()=>{
    card._frostLeaving=false;
    render();
  }, 300);
}

// Game of Market (2026-07-28, "To the Moon with DHD", ультраредкий Mood-трейт,
// ico_market.png) — при каждой атаке/Bolt носителя тега `market` 50/50: либо +2
// бонус-урона по цели, либо -2 HP самому носителю. Гейтинг — та же логика, что у
// Thorns/draw_attack (см. doAttack()): не срабатывает, если этот конкретный удар был
// целиком промазан Foxy Trick (`target._foxyDodgedThisHit`) или поглощён активным
// Solana Shield/заморозкой (`target._shieldBlockedThisHit`/`_frostBlockedThisHit`) —
// удар физически не долетел до цели, разыгрывать рынок не на чем.
//
// Тайминг (по прямому запросу автора, 2026-07-28) — намеренно НЕ синхронно с самим
// ударом: сперва пауза (500мс), затем плашка "MARKET UP"/"MARKET DOWN" (зелёная/
// красная, queueFieldFxReplace на случай если на карте уже висит другая плашка), ещё
// пауза (700мс), и только потом реально прилетает бонус-урон/самоурон — та же интрига
// "не два удара подряд", что и у HIT!→ABSORB и т.п. В headless-симуляторе (sim/
// headless.js) setTimeout выполняется синхронно через очередь (queue.push), так что
// это НЕ ломает детерминизм самоплея — тайминг влияет только на живой браузер.
//
// marketCard — карта с тегом market (атакующий в doAttack() ИЛИ болтер в
// doBoltTarget()); marketFaction — её владелец; targetCard/targetFaction — цель этого
// конкретного удара. bonusBypassArmor — наследует природу урона, который нёс исходный
// удар (false у обычной атаки, true у магического Bolt) — самоурон себе всегда
// bypassArmor=true (тот же принцип "самоокупаемая порча", что у Thorns/самоурона).
//
// targetIsBase (2026-07-29, по прямому запросу автора — баг-фикс: прямой удар по базе
// через tryAttackBase() раньше вообще не звал ни этот хук, ни резолвер Nana) — когда
// удар шёл НЕ по существу, а напрямую по базе (tryAttackBase()): targetCard тогда null,
// targetFaction — фракция самой атакуемой базы. У базы нет Foxy/Shield/Frost — гейтинг на
// targetCard пропускается целиком. На "UP" бонус-урон летит той же базе, которую только
// что ударили (та же цель, что и у самого удара — ровно то же поведение, что у обычной
// цели-существа, просто цель — база); "DOWN" не меняется вообще (самоурон себе не
// завязан на типе цели).
//
// Обе стороны эффекта перепроверяют, что нужная карта ВСЁ ЕЩЁ на поле к моменту
// срабатывания таймера (могла умереть/уйти с поля за прошедшую паузу от контрудара,
// другого Bolt и т.п.) — если карта уже не на поле, соответствующая часть эффекта
// молча пропускается (не воскрешает мёртвых, не бьёт по пустому месту).
function resolveMarketEvent(marketCard, marketFaction, targetCard, targetFaction, bonusBypassArmor, targetIsBase){
  if(!hasTag(marketCard,'market')) return;
  if(!targetIsBase && (targetCard._foxyDodgedThisHit || targetCard._shieldBlockedThisHit || targetCard._frostBlockedThisHit)) return;
  const marketId=marketCard.id, targetId=targetIsBase?null:targetCard.id;
  setTimeout(()=>{
    const mc=G[marketFaction].field.find(c=>c.id===marketId);
    if(!mc) return; // носитель тега уже не на поле — розыгрыш рынка не состоится
    const up=Math.random()<0.5;
    queueFieldFxReplace(marketId, up?'MARKET UP':'MARKET DOWN', up?'fx-market-up':'fx-market-down');
    render();
    setTimeout(()=>{
      const mc2=G[marketFaction].field.find(c=>c.id===marketId);
      if(!mc2) return;
      if(up){
        if(targetIsBase){
          lg(`${mc2.name}: Game of Market rolls UP — ${targetFaction} base takes 2 bonus dmg!`,'imp');
          G[targetFaction].hp=Math.max(0,G[targetFaction].hp-2);
          flashBase(targetFaction,'dmg',2);
        } else {
          const tc=G[targetFaction].field.find(c=>c.id===targetId);
          if(tc){
            lg(`${mc2.name}: Game of Market rolls UP — ${tc.name} takes 2 bonus dmg!`,'imp');
            dmgCard(tc,2,targetFaction,bonusBypassArmor);
          }
        }
      } else {
        lg(`${mc2.name}: Game of Market rolls DOWN — takes 2 dmg!`,'imp');
        dmgCard(mc2,2,marketFaction,true);
      }
      checkWin();
      render();
    },700);
  },500);
}

// Nana (2026-07-29, "Nanas from SMB", ультраредкий Mood-трейт, ico_nana.png) — при каждой
// атаке/Bolt носителя тега `nana` 50/50: либо банан летит в случайного ПРОТИВНИКА (кроме
// того, кого только что ударили — если других нет, летит в базу противника) на 2 урона,
// либо в случайного РАНЕНОГО союзника (нельзя выбрать себя — если раненых союзников нет,
// летит в свою базу на 2 хила). В отличие от Market это НЕ симметричная ставка — self-harm
// ветки нет вообще, поэтому если выпал хил, а лечить абсолютно некого (нет раненых союзников
// И своя база уже полная) — по прямому запросу автора банан не пропадает впустую, а летит
// наносить урон вместо этого (дамаг-ветка всегда имеет валидную цель — своя/чужая база
// никогда не исчезает с поля).
//
// Гейтинг и общий тайминг-принцип — калька с resolveMarketEvent() чуть выше (см. её
// комментарий): пропускается, если этот конкретный удар был промазан Foxy Trick или
// поглощён активным Solana Shield/заморозкой цели, которую ударили (удар физически не
// долетел — разыгрывать банан не на чем). Первая пауза (500мс) — тот же "не сразу вслед за
// самим ударом" эффект, что у Market, но вместо плашки тут carrier получает повторный
// "пульс поднятия" через activateCard() (тот же @keyframes cardActivate, что уже
// сигнализирует "эта карта действует" на самой атаке/Bolt/активках) — по прямому запросу
// автора ("анимация подьема карты, как у нас при действии карт"). Сразу вслед за пульсом
// стартует полёт эмодзи-банана (throwBananaFx(), 450мс) от карты-носителя к выбранной цели
// (карте или базе) — урон/хил применяется только когда банан долетел.
//
// nanaCard/nanaFaction — карта с тегом (атакующий в doAttack() ИЛИ болтер в
// doBoltTarget()); hitTargetCard/hitTargetFaction — цель ИСХОДНОГО удара (нужна только для
// гейтинга и для исключения из пула дамаг-ветки — сама она бананом не поражается второй
// раз). bonusBypassArmor — наследует природу исходного удара, как у Market (false у
// обычной атаки, true у магического Bolt).
//
// targetIsBase (2026-07-29, по прямому запросу автора — тот же баг-фикс, что у Market
// выше: прямой удар по базе через tryAttackBase() раньше вообще не звал этот резолвер) —
// когда удар шёл НЕ по существу, а напрямую по базе: hitTargetCard тогда null,
// hitTargetFaction — фракция самой атакуемой базы. У базы нет Foxy/Shield/Frost —
// гейтинг пропускается целиком. По прямому запросу автора дамаг-ветка в этом случае НЕ
// выбирает случайное вражеское существо — банан летит следом в ТУ ЖЕ базу, которую
// только что ударили (та же логика "продолжение того же удара", что у Market/UP выше);
// хил-ветка не меняется вообще (союзник/своя база — как обычно).
//
// Все точки применения эффекта перепроверяют, что нужные карты ВСЁ ЕЩЁ на поле к моменту
// срабатывания (могли умереть за прошедшую паузу — контрудар, Thorns, второй Bolt и т.п.)
// — тот же принцип, что у Market: если носитель тега уже не на поле, розыгрыш не состоится
// вообще; если успела исчезнуть уже ВЫБРАННАЯ цель банана, эта конкретная порция эффекта
// молча пропускается (не бьёт и не лечит пустое место).
function resolveNanaEvent(nanaCard, nanaFaction, hitTargetCard, hitTargetFaction, bonusBypassArmor, targetIsBase){
  if(!hasTag(nanaCard,'nana')) return;
  if(!targetIsBase && (hitTargetCard._foxyDodgedThisHit || hitTargetCard._shieldBlockedThisHit || hitTargetCard._frostBlockedThisHit)) return;
  const nanaId=nanaCard.id, hitId=targetIsBase?null:hitTargetCard.id, oppFaction=nanaFaction==='tea'?'jeet':'tea';
  setTimeout(()=>{
    const nc=G[nanaFaction].field.find(c=>c.id===nanaId);
    if(!nc) return; // носитель тега уже не на поле (например, умер от контрудара) — розыгрыш не состоится
    activateCard(nanaId);

    let wantHeal=Math.random()<0.5;
    const woundedAllies=G[nanaFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.id!==nanaId&&c.hp<c.maxHp);
    const baseWounded=G[nanaFaction].hp<G[nanaFaction].maxHp;
    if(wantHeal && woundedAllies.length===0 && !baseWounded) wantHeal=false; // некого и нечего лечить — фолбэк на дамаг

    if(wantHeal && woundedAllies.length>0){
      const target=woundedAllies[Math.floor(Math.random()*woundedAllies.length)];
      const targetId=target.id;
      throwBananaFx(nanaId, targetId, null);
      setTimeout(()=>{
        const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
        const t=G[nanaFaction].field.find(c=>c.id===targetId);
        if(!nc2 || !t) return;
        const before=t.hp;
        t.hp=Math.min(t.maxHp,t.hp+2);
        const healed=t.hp-before;
        if(healed>0){
          playSfx('heal');
          lg(`${nc2.name}: 🍌 heals ${t.name} for ${healed}!`,'imp');
          const tId=t.id;
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(tId,`+${healed}`,'heal')));
        }
        checkWin();
        render();
      },450);
    } else if(wantHeal){
      throwBananaFx(nanaId, null, nanaFaction);
      setTimeout(()=>{
        const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
        if(!nc2) return;
        const before=G[nanaFaction].hp;
        G[nanaFaction].hp=Math.min(G[nanaFaction].maxHp,G[nanaFaction].hp+2);
        const healed=G[nanaFaction].hp-before;
        if(healed>0){
          playSfx('heal');
          lg(`${nc2.name}: 🍌 heals the ${nanaFaction} base for ${healed}!`,'imp');
          flashBase(nanaFaction,'heal',healed);
        }
        checkWin();
        render();
      },450);
    } else if(targetIsBase){
      throwBananaFx(nanaId, null, oppFaction);
      setTimeout(()=>{
        const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
        if(!nc2) return;
        lg(`${nc2.name}: 🍌 follows up on the ${oppFaction} base for 2 dmg!`,'imp');
        G[oppFaction].hp=Math.max(0,G[oppFaction].hp-2);
        flashBase(oppFaction,'dmg',2);
        checkWin();
        render();
      },450);
    } else {
      const enemies=G[oppFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.id!==hitId);
      if(enemies.length>0){
        const target=enemies[Math.floor(Math.random()*enemies.length)];
        const targetId=target.id;
        throwBananaFx(nanaId, targetId, null);
        setTimeout(()=>{
          const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
          const t=G[oppFaction].field.find(c=>c.id===targetId);
          if(!nc2 || !t) return;
          lg(`${nc2.name}: 🍌 hits ${t.name} for 2 dmg!`,'imp');
          dmgCard(t,2,oppFaction,bonusBypassArmor);
          checkWin();
          render();
        },450);
      } else {
        throwBananaFx(nanaId, null, oppFaction);
        setTimeout(()=>{
          const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
          if(!nc2) return;
          lg(`${nc2.name}: 🍌 hits the ${oppFaction} base for 2 dmg!`,'imp');
          G[oppFaction].hp=Math.max(0,G[oppFaction].hp-2);
          flashBase(oppFaction,'dmg',2);
          checkWin();
          render();
        },450);
      }
    }
  },500);
}
// throwBananaFx — арт-ассет nana.gif (2026-07-29, заменил эмодзи-плейсхолдер 🍌 по
// прямому запросу автора), физически летящий от карты-носителя тега к выбранной цели
// (карте ИЛИ базе). Тот же приём, что у _flyCardFromDeck() (render.js, полёт карты из
// колоды в руку) — фиксированно позиционированный элемент, left/top анимируются CSS
// transition'ом между координатами двух realtime DOM rect'ов — но сильно проще: одна
// <img>, а не клон целой карты. Размер задаётся в CSS (.nana-banana-fly) через
// calc(var(--card-small-h) * ...) — тот же приём, что у ЛЮБОГО другого размера в игре
// (card-small-*, card-tag-icon и т.п.), НЕ vh/vw напрямую — так размер банана всегда
// остаётся строго пропорционален размеру самой карты на экране (а не вьюпорту), включая
// адаптивный брейкпоинт, где --card-small-h сама переопределяется (см. styles.css,
// :root{--card-small-h: 11.52vh} на узких экранах). toId=null означает, что цель — база,
// тогда baseFaction обязателен (резолвится в нужный stats-бар через
// _statsElIdForFaction(), чтобы попасть в фактически видимый top/bottom бар, а не
// залипнуть на фракции). Если исходную или целевую DOM-ноду не нашли (сцена уже
// перерисована/сменилась) — молча ничего не анимирует, сам урон/хил это не блокирует.
function throwBananaFx(fromId, toId, baseFaction){
  const fromEl=document.querySelector(`.card-small[data-id="${fromId}"]`);
  if(!fromEl) return;
  const toEl = toId ? document.querySelector(`.card-small[data-id="${toId}"]`)
                     : document.getElementById(_statsElIdForFaction(baseFaction));
  if(!toEl) return;
  const fromRect=fromEl.getBoundingClientRect();
  const toRect=toEl.getBoundingClientRect();
  const banana=document.createElement('img');
  banana.className='nana-banana-fly';
  banana.src='img/nana.gif';
  banana.alt='';
  banana.style.left=(fromRect.left+fromRect.width/2)+'px';
  banana.style.top=(fromRect.top+fromRect.height/2)+'px';
  banana.style.transform='translate(-50%,-50%) scale(1) rotate(0deg)';
  document.body.appendChild(banana);
  void banana.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  banana.style.transition='left 420ms ease-in, top 420ms ease-in, transform 420ms ease-in';
  banana.style.left=(toRect.left+toRect.width/2)+'px';
  banana.style.top=(toRect.top+toRect.height/2)+'px';
  banana.style.transform='translate(-50%,-50%) scale(1.3) rotate(360deg)';
  setTimeout(()=>{ if(banana.parentElement) banana.remove(); },450);
}

function dmgCard(card,dmg,faction,bypassArmor,deferDeath,forceLabel,bypassFrost){
  // Сбрасываем ПЕРЕД любым ранним return (включая dmg<=0 ниже) — иначе устаревший true с
  // прошлого удара мог бы утечь в проверку fear/burn/taunt_break этого хода (см. ниже).
  card._shieldBlockedThisHit=false;
  card._foxyDodgedThisHit=false;
  card._frostBlockedThisHit=false; // БАГФИКС (2026-07-27, автор поймал живьём) — раньше этот флаг НИКОГДА не сбрасывался здесь (только выставлялся в true ниже), поэтому один раз замороженный удар мог навсегда "заглушить" debuff-эффекты на ВСЕХ последующих, никак не связанных ударах по этой же карте
  if(dmg<=0)return;
  // Foxy Trick (2026-07-27, "Foxy Trick", ультраредкий Mood-трейт Orange from FFF, ico_fff.png)
  // — ПЕРВАЯ проверка вообще, ДО Frost/Shield/Armor/Ward (по прямому запросу автора: сначала
  // решаем, промахнулась ли атака вообще, и только потом — если не промахнулась — остальной
  // абсорб). 50% шанс, что ЛЮБОЙ входящий удар (атака/контрудар/bolt/spell dmg/AOE — вообще
  // любой вызов dmgCard()) промахивается целиком: 0 урона, Frost/Shield НЕ трогаются и не
  // тратятся (промах — значит удар физически не долетел, нечему поглощать). Один бросок
  // решает ОБА исхода сразу — если атака промахнулась, любой дебафф (Fear/Burn/Frost/
  // Provoke-break), который нёс этот же удар, тоже не применяется (см.
  // `_foxyDodgedThisHit`, тот же паттерн флага "полностью не долетевший удар", что уже
  // используют `_shieldBlockedThisHit`/`_frostBlockedThisHit` — читается в abilities.js
  // case 'fear'/'burn'/'frost'/'taunt_break' и в doSpellFearTarget/doSpellBurnTarget/
  // doSpellProvokeBreakTarget/fear_all/burn_all, где у dmgCard() своего вызова нет вообще —
  // там бросок кидается ЗАНОВО тем же способом, отдельно). Звука пока нет (по прямому
  // запросу автора, добавит позже) — только визуал (queueFieldFx 'MISSED!').
  if(hasTag(card,'foxy') && Math.random()<0.5){
    card._foxyDodgedThisHit=true;
    // queueFieldFxReplace (2026-07-27, автор поймал живьём) — почти каждый вызов dmgCard()
    // приходит от кода, который УЖЕ поставил в очередь свою плашку (DESTROYED/HIT!/BOLT!/
    // т.п.) ДО того, как выяснится, что удар вообще-то промазал мимо Foxy Trick — обычный
    // queueFieldFx() тут дал бы ДВЕ наложенные друг на друга надписи. Та же самая функция,
    // что уже чинит этот класс бага у Solana Shield (ABSORB) — см. её комментарий выше.
    queueFieldFxReplace(card.id,'MISSED!','fx-miss');
    lg(`${card.name}'s Foxy Trick makes the attack miss entirely!`,'imp');
    return;
  }
  // Frost (2026-07-27) — АНАЛОГ Solana Shield: пока card.frozen, следующий ЛЮБОЙ удар (физика
  // или магия, включая контратаку — та же формулировка, что у Shield) поглощается ЦЕЛИКОМ, и
  // Заморозка снимается (см. scheduleFrostRemoval() выше — с анимацией исчезновения). Стоит
  // ДО Shield/Armor/Ward — Frost и Shield на одной карте одновременно не ожидаются в дизайне,
  // но если как-то совпадут, Frost гасит удар первым (порядок значения не имеет на практике).
  // bypassFrost (2026-07-27, по прямому запросу автора) — targeted-destroy спелл
  // (doSpellExecuteHalfTarget/JUDGMENT-DEATHBLOW) и AOE destroy-all (destroy_all_enemies/
  // CATACLYSM-EXTINCTION) ДОЛЖНЫ уничтожать даже замороженную цель — Frost её не спасает
  // вообще (в отличие от Shield/Ward, которые по-прежнему защищают как обычно, проверяются
  // ниже уже без исключений). Сам статус Заморозки при этом НЕ трогаем — если карта каким-то
  // образом переживёт этот конкретный удар (напр. Bolt 1 в первой части JUDGMENT), она
  // просто останется замороженной как была, эта проверка её никак не снимает.
  if(card.frozen && !bypassFrost){
    card._frostBlockedThisHit=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
    lg(`${card.name}'s Frost absorbs the hit entirely and shatters.`,'dmg');
    scheduleFrostRemoval(card);
    return;
  }
  // Solana Shield (World-трейт, 2026-07-13) — абсолютный одноразовый абсорб ПЕРВОГО удара
  // ЛЮБОГО типа (физика И магия, включая контратаку) — в отличие от Брони (только физика)
  // и Ward (только магия), щит стоит ДО обеих проверок и гасит вообще любой источник урона
  // целиком, сколько бы ни было урона. Одноразово на всю игру (как incarnUsed у Инкарнации) —
  // не восстанавливается, `shieldConsumed` навсегда true после первого срабатывания.
  // _shieldBlockedThisHit — транзитный флаг ТОЛЬКО на этот синхронный тик: doAttack() зовёт
  // dmgCard() и triggerAbilities(att,'on_attack',{target}) одним и тем же синхронным блоком,
  // поэтому fear/burn/taunt_break могут проверить его сразу после и понять "удар не долетел
  // — значит и дебафф не вешаем" (по прямому запросу автора — щит блокирует ВСЁ, что несёт
  // с собой этот конкретный удар, не только HP-урон).
  // НЕ перехватывает burn-тик — тот намеренно идёт мимо dmgCard() (см. endTurn()), та же
  // экземпция, что уже есть у Брони: "поджог непробиваем в принципе", щит это не меняет.
  if(hasTag(card,'shield') && !card.shieldConsumed){
    card.shieldConsumed=true;
    card._shieldBlockedThisHit=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
    // ABSORB-плашка (2026-07-27, по прямому запросу автора — была задумана раньше, потерялась
    // по пути) — queueFieldFxReplace() (см. выше) стирает любую уже поставленную звонящим
    // кодом плашку (HIT!/BOLT!/DESTROYED и т.п. — почти все вызовы dmgCard() ставят свою ДО
    // того, как сама dmgCard() решит, поглотит ли щит) и подменяет её на ABSORB — чтобы на
    // экране осталась только ОДНА, точная плашка, а не обе разом друг на друге.
    queueFieldFxReplace(card.id,'ABSORB','fx-absorb');
    lg(`${card.name}'s Solana Shield absorbs the hit entirely — shield spent.`,'dmg');
    return;
  }
  // Ward — магический аналог Брони (тег ico_ward.png уже есть у автора): полный
  // иммунитет именно к тому урону, который bypassArmor=true (AOE-активка/enter_aoe,
  // Shard, точечный урон спеллом) — той же категории, что Броня НЕ блокирует (см.
  // комментарий ниже про bypassArmor). Обычная атака/контратака Ward не блокирует —
  // так же, как Броня не блокирует магию, здесь наоборот: Ward не блокирует физику.
  // Fear/Burn применяются отдельными путями (не через dmgCard) — Ward блокирует их
  // отдельно, в abilities.js (case 'fear'/'burn'/'fear_all'/'burn_all'), 2026-07-18.
  if(bypassArmor && hasTag(card,'ward')){
    requestAnimationFrame(()=>requestAnimationFrame(()=>hitCard(card.id)));
    lg(`${card.name}'s Ward blocks the magic damage entirely.`,'dmg');
    return;
  }
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
    if(absorbed>0){
      // -X Armor float (2026-07-18, по просьбе автора) — зеркало showFloat(...,'dmg') у HP
      // ниже, но у своей позиции (armorloss, привязана к card-small-armor-box в CSS) и без
      // отдельного lg() — лог у брони уже есть чуть ниже (полный/частичный абсорб).
      // Срабатывает в ОБОИХ случаях (полный и частичный абсорб) — armor реально
      // уменьшился в обоих, просто при частичном следом ещё прилетит HP-урон.
      const cardId=card.id;
      requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(cardId,`-${absorbed}`,'armorloss')));
    }
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
  // forceLabel (2026-07-24, по прямому запросу автора) — изначально задумывалось показывать
  // "DESTROYED" ВМЕСТО голого "-999" именно ТУТ, плавающим текстом у HP. Позже (2026-07-27)
  // почти все вызывающие DESTROY-эффекты (VERDICT/DAMNATION/JUDGMENT-добивание/CATACLYSM/
  // EXTINCTION) ДОПОЛНИТЕЛЬНО стали сами ставить в очередь свою большую центральную плашку
  // "DESTROYED" (queueFieldFx, тот же паттерн, что у HIT!/BOLT!/MISSED!/IMMUNE/ABSORB) — и
  // получались ДВЕ надписи "DESTROYED" разом (автор поймал живьём: "рядом с хп ещё одна
  // надпись, кажись дублировано"). Раз центральная плашка уже полностью покрывает "что
  // произошло", плавающий текст у HP при forceLabel теперь просто НЕ показывается —
  // единственная надпись остаётся по центру карты. Обычные (без forceLabel) вызовы dmgCard()
  // ведут себя как раньше — обычное число "-N" по-прежнему всплывает у HP.
  if(!forceLabel){
    requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(cardId,`-${dmgAmt}`,'dmg')));
  }
  lg(`${card.name} takes ${dmg} → ${card.hp}/${card.maxHp} HP.`,'dmg');
  // deferDeath=true (используется контрударом в doAttack()) — HP уходит в минус, но
  // killCard() здесь не вызывается: вызывающий код сам решает, когда резолвить смерть,
  // давая шанс vampiric/Erase и подобным эффектам подлечить карту до того, как её реально
  // уберут с поля.
  if(lethal && !deferDeath) killCard(card,faction);
}

function killCard(card,faction,toVoid=false){
  // REMEMBER EVERYTHING — remember (2026-07-26, по прямому запросу автора) — на ПЕРВУЮ смерть
  // за игру карта вообще не умирает: полностью восстанавливает HP и остаётся на поле, ПОЛНОСТЬЮ
  // "обновляясь" — сбрасываются и баффы (ATK/Armor/maxHP — squadAtkBonus/squadArmorBonus
  // (+armorMax)/squadMaxHpBonus(+maxHp)/squadParam/atkBonus, тот же набор полей, что снимает
  // doSpellDispelTarget()/case 'scheme'), И дебаффы (feared/burning/provokeBroken) — уточнено
  // автором 2026-07-26: "полностью обновляется" значит буквально всё, не только баффы.
  // Проверяется САМОЙ ПЕРВОЙ строкой функции — раньше, чем card вырезается из
  // G[faction].field, потому что при срабатывании карта из поля никуда не уходит (return до
  // этой строки). На ВТОРУЮ смерть эффект уже потрачен (card.rememberUsed стоит от первого
  // раза) — карта умирает как обычно, НО СРАЗУ в Войд (toVoid форсируется), минуя кладбище —
  // тот же принцип "второй раз без пощады", что у Инкарнации ниже по функции. Работает только
  // на существах (не spell/world/artifact). rememberUsed сбрасывается в resetC() (state.js) —
  // если карту сдувают обратно в руку, она "забывает", что уже воскресала, и получает свежий
  // заряд — тот же принцип, что уже применяется к incarnUsed/stealthBroken/shieldConsumed там же.
  if(!card.spell&&!card.world&&!card.artifact&&hasTag(card,'remember')){
    if(!card.rememberUsed){
      card.rememberUsed=true;
      card.feared=false;
      card.burning=false;
      card.provokeBroken=false;
      if(card.atkBonus){card.atkBonus=0;}
      if(card.squadAtkBonus){card.squadAtkBonus=0;}
      if(card.squadMaxHpBonus){card.maxHp-=card.squadMaxHpBonus;card.squadMaxHpBonus=0;}
      if(card.squadArmorBonus){card.armor=Math.min(card.armor,(card.armorMax||0)-card.squadArmorBonus);card.armorMax=(card.armorMax||0)-card.squadArmorBonus;card.squadArmorBonus=0;}
      if(card.squadParam){card.squadParam=null;}
      card.hp=card.maxHp;
      playSfx('heal');
      lg(`${card.name}: Remember Everything — fully restores and stays on the field (all buffs and debuffs reset)!`,'hl');
      const rememberId=card.id;
      requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(rememberId,'REBORN','heal')));
      return;
    } else {
      toVoid=true;
    }
  }
  G[faction].field=G[faction].field.filter(c=>c.id!==card.id);
  card.squadMaxHpBonus=0;
  card.squadAtkBonus=0;
  card.squadArmorBonus=0;
  card.spellArmorBonus=0;
  card.interceptUsed=false;
  card.stealthBroken=false;
  card.armor=0;
  card.armorMax=undefined;
  card.auraArmorBonus=0;
  card.worldArmorBonus=0;
  card.squadParam=null;
  // Инкарнация — одноразовая (как в оригинале): если карта уже воскресала через
  // incarnation:X раньше (card.incarnUsed, ставится в endTurn() в момент revive — см.
  // блок "Инкарнация — тик по кладбищу"), повторная смерть форсирует toVoid=true —
  // карта уходит СРАЗУ в войд, минуя кладбище, таймер по второму разу не запускается.
  // Без этого получился бы вечный респавн каждые X ходов.
  let _incarnSpent=false;
  if(!toVoid && card.incarnUsed && hasTag(card,'incarnation')){
    toVoid=true;
    _incarnSpent=true;
  }
  if(toVoid){
    card.voided=true;
    G[faction].void.push(card);
    if(_incarnSpent){
      lg(`${card.name}: Incarnation already spent — exiled for good.`,'die');
    } else {
      lg(`${card.name} burned to ash — lost forever.`,'die');
    }
  } else {
    G[faction].grave.push(card);
    lg(`${card.name} dies.`,'die');
    // Инкарнация: тег incarnation:X — X = число ПОЛНЫХ ходов владельца ПОСЛЕ смерти
    // (тикает в endTurn(), см. блок "Инкарнация — тик по кладбищу" ниже в этом файле).
    // Только для существ (не spell/world/artifact — у тех своя логика ухода с поля,
    // через killCard обычно не проходят как "существо в кладбище с таймером").
    // ВАЖНО: этот код НЕ достижим при уничтожении в войд (см. ветку toVoid выше) —
    // сожжённая карта уходит в G[faction].void, а не в grave, и тикающий цикл в endTurn()
    // смотрит только в grave, так что "войд отменяет Инкарнацию" получается бесплатно,
    // без отдельной проверки voided.
    if(!card.spell&&!card.world&&!card.artifact&&hasTag(card,'incarnation')){
      card.incarnTimer=getTagVal(card,'incarnation');
      lg(`${card.name}: Incarnation — returns in ${card.incarnTimer} turn(s).`,'hl');
    }
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
    // 2026-07-22 (по прямому запросу автора, sim показал 62.7% winrate у HUNGER) — не
    // больше 1 срабатывания за ход (ключ turn+turnNum уникален на каждый ПОЛУ-ход, не
    // только на полный раунд — turnNum бампается лишь при завершении хода 1-го игрока,
    // см. endTurn()). Раньше AOE-выбивание 3-4 существ за один ход давало 3-4 карты разом.
    const turnKey=G.turn+'-'+G.turnNum;
    if(world&&hasTag(world,'on_own_death')&&world.lastDeathDrawTurnKey!==turnKey){
      const val=getTagVal(world,'on_own_death')||1;
      for(let i=0;i<val;i++) if(G[faction].deck.length>0) G[faction].hand.push(G[faction].deck.shift());
      lg(`${world.name}: ${card.name} died — draw ${val} card(s).`,'hl');
      world.lastDeathDrawTurnKey=turnKey;
    }
  }

  // VALLEY-style on_enemy_death (2026-07-17, anti-HUNGER) — то же самое, что блок выше,
  // но с точностью до наоборот: свой Мир смотрит на смерти ВРАЖЕСКИХ существ, а не своих.
  // Проверяем ОБА Мира на поле (как REAPER-петля ниже проверяет обе стороны на
  // on_enemy_death_base) — сейчас этим тегом владеет только VALLEY (Tea), но сама
  // проверка не завязана на фракцию, сработает для любой стороны, если тег появится там.
  // Автор специально просил без пассивного "тяни каждый ход" — только реактивно, от чужой
  // смерти, чтобы не было чувства "карты сами прилетают бесплатно" — и чтобы это было
  // прямым противовесом ALTAR (жертва себе за ресурс) — теперь чужие потери тоже кормят
  // руку соперника. Тот же creature-only guard, что у HUNGER-блока выше.
  if(!card.spell&&!card.world&&!card.artifact){
    const turnKey=G.turn+'-'+G.turnNum;
    ['tea','jeet'].forEach(f=>{
      if(f===card.f) return; // это НЕ "своя" смерть с точки зрения f — тут как раз и нужно
      const world=G[f].world;
      // 2026-07-22 (по прямому запросу автора, sim показал 60.6% winrate у VALLEY) — тот
      // же cap "1 раз за ход", что и у HUNGER-блока выше, тот же turnKey-паттерн.
      if(world&&hasTag(world,'on_enemy_death')&&world.lastDeathDrawTurnKey!==turnKey){
        const val=getTagVal(world,'on_enemy_death')||1;
        for(let i=0;i<val;i++) if(G[f].deck.length>0) G[f].hand.push(G[f].deck.shift());
        lg(`${world.name}: ${card.name} (enemy) died — draw ${val} card(s).`,'hl');
        world.lastDeathDrawTurnKey=turnKey;
      }
    });
  }

  ['tea','jeet'].forEach(f=>{
    G[f].field.forEach(ally=>{
      const val=getTagVal(ally,'on_enemy_death_base');
      // card.f is the faction of the creature that just died — only heal when it's
      // the OPPONENT of f (i.e. an enemy death from ally's owner's point of view).
      // Nerf 2026-07-17: was on_any_death_base (triggered on own deaths too, making
      // REAPER heal the base even off losing trades) — see AI BALANCE NOTES.md.
      if(val&&card.f!==f&&G[f].hp<G[f].maxHp){
        G[f].hp=Math.min(G[f].maxHp,G[f].hp+val);
        lg(`${ally.name}: ${f} base +${val} HP → ${G[f].hp}/${G[f].maxHp}.`,'hl');
        flashBase(f, 'heal', val);
      }
      // FAERON-style on_own_death_base (2026-07-17, replaces FAERON's old
      // on_play_creature:1 — author call, "anti-REAPER": REAPER profits off the ENEMY's
      // losses, this profits off YOUR OWN losses instead — same death-triggered base-heal
      // shape, opposite trigger side. Exact mirror of the block above, condition flipped
      // (card.f===f instead of !==). Note the dying card itself is already spliced out of
      // G[faction].field at the top of killCard(), so a creature carrying this tag can
      // never trigger off its own death — same natural exclusion REAPER already has.
      const ownVal=getTagVal(ally,'on_own_death_base');
      if(ownVal&&card.f===f&&G[f].hp<G[f].maxHp){
        G[f].hp=Math.min(G[f].maxHp,G[f].hp+ownVal);
        lg(`${ally.name}: ${f} base +${ownVal} HP → ${G[f].hp}/${G[f].maxHp}.`,'hl');
        flashBase(f, 'heal', ownVal);
      }
    });
  });

  const drawTag=getTagVal(card,'draw');
  if(drawTag){G[card.f].extraDraw=Math.max(0,G[card.f].extraDraw-drawTag);}

  // BAMBOO-style death_heal:N (2026-07-26, по прямому запросу автора — замена старой
  // enter_heal:2, которая давала хил ВСЕМ раненым при входе на поле; теперь вместо
  // входа триггер — СВОЯ смерть, и вместо "все раненые" — ОДИН случайный раненый
  // союзник, на фиксированные N=4). В отличие от on_own_death_base выше (который
  // проверяется на ВСЕХ выживших союзниках — реагирует на любую свою смерть), это
  // self-only: тег читается прямо с УМИРАЮЩЕЙ card, а не с окружения. card уже
  // вырезана из G[faction].field строкой в самом начале killCard() — так что при
  // выборе случайного раненого союзника ниже сама умирающая карта естественным
  // образом не попадает в пул кандидатов (то же исключение, что у on_own_death_base).
  // Триггерится независимо от toVoid (сожжение в войд тоже считается "своей
  // смертью") — тот же скоуп, что у on_own_death_base, ради единообразия. Живёт на
  // travelers, зарезервированных под Bamboo World-trait — см. data.js.
  if(!card.spell&&!card.world&&!card.artifact){
    const bambooHeal=getTagVal(card,'death_heal');
    if(bambooHeal){
      const woundedAllies=G[card.f].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.hp<c.maxHp);
      if(woundedAllies.length>0){
        const healTarget=woundedAllies[Math.floor(Math.random()*woundedAllies.length)];
        healTarget.hp=Math.min(healTarget.maxHp,healTarget.hp+bambooHeal);
        playSfx('heal');
        lg(`${card.name}: dies — heals ${healTarget.name} +${bambooHeal} HP → ${healTarget.hp}/${healTarget.maxHp}.`,'hl');
        const healTargetId=healTarget.id;
        requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(healTargetId,`+${bambooHeal}`,'heal')));
      }
    }
  }

  // THUNDER STORM-style death_bolt:N (2026-07-26, по прямому запросу автора) — на СВОЮ
  // смерть наносит N магического урона (dmgCard(...,true) — bypassArmor:
  // Ward блокирует, Броня нет, та же категория, что active AOE/Shard/точечный
  // спелл-урон) случайному вражескому существу. Тот же self-only паттерн, что у
  // death_heal выше — тег читается прямо с умирающей card, а не с окружения.
  // Если у противника нет существ на поле — молча ничего не делает (нет
  // валидной цели, без лога/звука). dmgCard() может рекурсивно вызвать
  // killCard() для boltTarget, если удар окажется смертельным — это ожидаемо
  // и безопасно (та же цепная механика уже есть у enter_aoe/random_spread).
  // ПЕРЕЕХАЛ с трейта Scheme на Pink Clouds (2026-07-27, по прямому запросу автора —
  // Схема отдаёт этот тег/эффект Pink Clouds под именем "Thunder Storm"; сам тег
  // `death_bolt` не переименован, переезжает только его трейт-привязка и иконка —
  // см. TAG_ICONS/TAG_TOOLTIPS ниже, теперь ico_cloud.png). Пока не назначен ни на
  // одного живого traveler — Pink Clouds ждёт ручного ввода карт.
  if(!card.spell&&!card.world&&!card.artifact){
    const stormBolt=getTagVal(card,'death_bolt');
    if(stormBolt){
      const enemyFaction=card.f==='tea'?'jeet':'tea';
      const enemyField=G[enemyFaction].field;
      if(enemyField.length>0){
        const boltTarget=enemyField[Math.floor(Math.random()*enemyField.length)];
        playSfx('card_spell_atack');
        lg(`${card.name}: dies — Bolt ${stormBolt} to ${boltTarget.name}!`,'imp');
        queueFieldFx(boltTarget.id,'HIT!','fx-spell-dmg');
        dmgCard(boltTarget,stormBolt,enemyFaction,true);
      }
    }
  }

  // SCHEME-style death_armor:N (2026-07-27, по прямому запросу автора — НОВЫЙ тег,
  // заменяет death_bolt на трейте Scheme после его переезда на Pink Clouds/Thunder
  // Storm). На СВОЮ смерть даёт N Брони СЛУЧАЙНОМУ союзнику (любому, не обязательно
  // раненому — в отличие от death_heal, тут не важно текущее HP цели). Тот же
  // self-only паттерн, что у death_heal/death_bolt выше — тег читается прямо с
  // умирающей card, а не с окружения; сама умирающая карта уже вырезана из
  // G[faction].field строкой в начале killCard(), так что естественным образом не
  // попадает в пул кандидатов. Бонус реализован через `spellArmorBonus` — тот же
  // "до конца боя" one-time стек, что уже использует BULWARK/CARAPACE
  // (doSpellArmorTarget(), см. выше) — сразу пересчитывается через recalcArmor(),
  // так что видимая Броня цели обновляется в тот же тик. Если союзников на поле нет
  // (сама умершая карта была последней) — молча ничего не делает.
  if(!card.spell&&!card.world&&!card.artifact){
    const schemeArmor=getTagVal(card,'death_armor');
    if(schemeArmor){
      const allyField=G[card.f].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
      if(allyField.length>0){
        const armorTarget=allyField[Math.floor(Math.random()*allyField.length)];
        armorTarget.spellArmorBonus=(armorTarget.spellArmorBonus||0)+schemeArmor;
        recalcArmor(card.f);
        playSfx('baf');
        lg(`${card.name}: dies — ${armorTarget.name} +${schemeArmor} Armor.`,'hl');
        const armorTargetId=armorTarget.id;
        requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(armorTargetId,'+Armor','armoraura')));
      }
    }
  }
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
    // 2026-07-16: сжигание больше НЕ поднимает потолок essMax навсегда — только разовая
    // +1 эссенция на ЭТОТ ход (как ess_add у спеллов). essMax теперь растёт исключительно
    // по обычному приросту хода (+1/ход, см. endTurn()), без "срезания угла" через сжигание —
    // темп игры от этого идёт более планомерно, а не скачками. cur.ess МОЖЕТ временно
    // превысить cur.essMax в рамках этого хода — тот же паттерн, что и у ess_add-эффектов
    // (см. комментарий у ESS_CAP выше): капается потолок, а не разовый всплеск траты.
    cur.ess+=1;
    flashEssenceGain(G.turn);
    lg(`Burned ${card.name} → Essence now ${cur.ess}/${cur.essMax} (+1 this turn only).`,'imp');
    G.phase='action';render();
  }, 450); // держать в синхроне с длительностью .burning-out (styles.css)
}


function applyAuras(faction){
  const cur=G[faction];
  const auraSources=[...cur.field.filter(c=>!c.spell&&!c.world&&!c.artifact)];
  if(cur.world&&hasTag(cur.world,'aura:atk')) auraSources.push(cur.world);
  cur.field.forEach(a=>{
    // Баг-фикс (2026-07-19, автор нашёл живьём — TUBORG рос на +1 ATK КАЖДЫЙ ход после
    // того, как для Tea завели Мир с собственной aura:atk): раньше сброс atkBonus в 0
    // пропускался ИМЕННО для карт, у которых САМИХ есть тег aura:atk (`if(!hasTag(a,
    // 'aura:atk')) a.atkBonus=0`) — по-видимому, попытка "не сбрасывать источнику ауры
    // что-то своё", но atkBonus вообще НИЧЕЙ, кроме этой самой ауры-от-соседей, не
    // хранит (см. resetC()/reviveCard()/killCard() — везде обнуляется одним и тем же
    // полем, никакая другая система его не трогает). Источник своей же ауры и так не
    // получает бонус САМ ОТ СЕБЯ (см. `a.id!==src.id` в цикле ниже) — но он вполне может
    // получать бонус от ДРУГОГО источника ауры (Мир/другая карта с aura:atk), и этот
    // чужой бонус как раз обязан пересчитываться с нуля каждый вызов, а не копиться
    // поверх старого. Ровно тот же класс бага и то же исправление, что раньше уже
    // делали для aura:maxhp (см. auraMaxHpBonus чуть ниже — там сброс всегда
    // безусловный, без каких-либо исключений по тегам самой карты).
    a.atkBonus=0;
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
// Потолок эссенции — экономика не должна расти бесконечно (см. обсуждение "на 15 ходу
// вся рука выкладывается разом"). essMax никогда не растёт выше этого числа; cur.ess
// в рамках одного хода всё ещё может временно превышать essMax (ess_add-эффекты, сжигание
// карты) — капается именно ПОТОЛОК, а не разовый всплеск траты.
const ESS_CAP = 10;

const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'armor', val:1},
  {gtype:'mch', count:3, effect:'atk',   val:1},
  {gtype:'orb', count:3, effect:'armor', val:2},
  {gtype:'umb', count:3, effect:'param', param:'bolt',   val:2},
  {gtype:'szg', count:3, effect:'maxhp', val:1},
  {gtype:'xui', count:3, effect:'atk',   val:1},
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
    // spellArmorBonus (2026-07-17, "BULWARK"/"CARAPACE") — a one-time targeted spell bonus,
    // same lifecycle as squadArmorBonus: persists on the card itself (not re-derived from
    // live board state like aura/world/squad above), added into the total here, zeroed out
    // in killCard()/reviveCard()/resetC() same as every other armor component — "until end
    // of battle" in practice means "until this creature's current life ends," same
    // semantics ARCHIVE's tempAtkBonus already uses for the ATK version of this idea.
    const newMax=(getTagVal(a,'armor')||0)+(a.squadArmorBonus||0)+(a.spellArmorBonus||0)+worldArmorVal+auraBonus;
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
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(aId,'+Armor','armoraura')));
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
      // 2026-07-17 (баг, автор) — тут не хватало showFloat(): существо с aura:armor уже
      // показывало "+Armor" при входе, а Мир с world_armor — только звук и лог, без
      // анимации над картами. Тот же паттерн, что у ветки _auraArmorLog чуть выше.
      affected.forEach(a=>{
        const aId=a.id;
        requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(aId,'+Armor','armoraura')));
      });
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
  const drewCard = cur.deck.length>0;
  if(drewCard) cur.hand.push(cur.deck.shift());
  lg(`${card.name} sacrificed to the Altar! +1 Essence${drewCard?' & 1 card':''}.`,'die');
  queueFieldFx(card.id,'SACRIFICED!','fx-sacrifice'); // плейсхолдер — позже заменится на гифку
  killCard(card,G.turn);
  G.phase='action';
  checkWin();render();
}


// Общий расчёт базового урона Shard-семейства. THE BOOK (Tea) — shard_burn_scale, считает
// горящих врагов. SHARD (Jeet) — shard_fear_scale (2026-07-17, тот же принцип зеркально:
// Jeet исторически прикладывает Fear через своих Дреган/Ксуйктр/Орбитон карт, так же как
// Tea прикладывает Burn — обе надбавки вознаграждают за то, что игрок уже вложился в
// профильный debuff своей фракции). Оба тега взаимоисключающие на практике (по одному
// артефакту на карту), но код не мешает случайно повесить оба сразу — просто сложатся.
function shardBaseDmg(artifact, oppK){
  // 2026-07-23 (по прямому запросу автора, fix): раньше тут был фолбэк `||1`, который
  // тихо превращал shard:0 обратно в 1 (0 — falsy в JS). getTagVal() возвращает null
  // только если тега вообще нет — тогда и подставляем 1 по умолчанию; если тег есть со
  // значением 0, используем именно 0.
  const tagVal=getTagVal(artifact,'shard');
  let dmg=(tagVal===null)?1:tagVal;
  if(!artifact) return dmg;
  if(hasTag(artifact,'shard_burn_scale')){
    dmg+=G[oppK].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.burning).length;
  }
  if(hasTag(artifact,'shard_fear_scale')){
    dmg+=G[oppK].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.feared).length;
  }
  return dmg;
}

function doShard(artifact){
  if(G.phase==='shardTarget'){
    G.phase='action';G.sel=null;render();return;
  }
  G.phase='shardTarget';
  G.sel=artifact.id;
  const oppK=G.turn==='tea'?'jeet':'tea';
  lg(`${artifact.name}: select an enemy creature to deal ${shardBaseDmg(artifact,oppK)} damage.`,'hint');
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
  let dmg=getTagVal(spell,'spell_dmg_target')||3;
  // SPARK/MALICE (2026-07-24, по прямому запросу автора) — условный бонус урона, если у
  // заклинателя на момент каста есть активный Мир ИЛИ Артефакт (любой из двух, не оба
  // разом). Первая карта такого типа в игре — раньше условные бонусы урона были только
  // у существ (atk_vs_burning/atk_vs_feared), не у спеллов. Реюз того же getTagVal-паттерна,
  // что и у draw_on_kill/draw_on_no_kill — отдельный тег-модификатор поверх базового
  // spell_dmg_target, а не отдельная ветка эффекта.
  if(hasTag(spell,'spell_dmg_bonus_world_artifact')){
    const cur=G[G.turn];
    if(cur.world || cur.artifacts.length>0) dmg+=getTagVal(spell,'spell_dmg_bonus_world_artifact')||0;
  }
  // VERDICT/DAMNATION (2026-07-24, по прямому запросу автора) — используют этот же путь
  // с dmg=999 как условность "безусловное убийство". Игрок не должен видеть голое число —
  // ни в логе, ни во всплывающей надписи над картой, ни в плавающем "-999".
  const isInstaKill=dmg>=999;
  playSfx('card_spell_atack');
  if(isInstaKill) lg(`${spell.name} destroys ${card.name}!`,'dmg');
  else lg(`${spell.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  const oppK=G.turn==='tea'?'jeet':'tea';
  queueFieldFx(card.id,isInstaKill?'DESTROYED':'HIT!','fx-spell-dmg'); // плейсхолдер — позже заменится на гифку
  const hpBefore=card.hp;
  // bypassFrost=isInstaKill (2026-07-27, по прямому запросу автора) — VERDICT/DAMNATION это
  // targeted-DESTROY эффект (та же категория, что JUDGMENT/DEATHBLOW и CATACLYSM/EXTINCTION,
  // см. их комментарии) — Frost не должна спасать от него вообще, только Ward/активный
  // Shield (те уже проверены на этапе выбора цели, см. click-хендлер). Обычные (не insta-kill)
  // spell_dmg_target спеллы это условие НЕ трогает — для них Frost по-прежнему абсорбирует
  // как обычно.
  dmgCard(card,dmg,oppK,true,false,isInstaKill?'DESTROYED':null,isInstaKill);
  // draw_on_kill (2026-07-24, "EXECUTE"/"CULL", по прямому запросу автора) — если этот
  // конкретный удар добил цель (была жива ДО удара, после — 0 или меньше), тянем 1 карту.
  // Не трогает обычные JOURNEY/HEX/SPARK/MALICE/Bolt1 — у них просто нет этого тега.
  if(hasTag(spell,'draw_on_kill') && hpBefore>0 && card.hp<=0){
    const cur=G[G.turn];
    if(cur.deck.length>0){ cur.hand.push(cur.deck.shift()); lg(`${spell.name}: kill confirmed — draws 1 card.`,'imp'); }
  }
  // draw_on_no_kill (2026-07-24, "JAB"/"STING", по прямому запросу автора) — зеркальное
  // условие: тянем карту, только если цель ПЕРЕЖИЛА удар (card.hp>0 после) — "промазал
  // мимо килла — вот тебе утешительная карта". hpBefore>0 всё ещё нужен (та же защита от
  // "бил по уже мёртвой карте", которой тут в принципе быть не должно, но для симметрии
  // с draw_on_kill оставлено то же условие).
  if(hasTag(spell,'draw_on_no_kill') && hpBefore>0 && card.hp>0){
    const cur=G[G.turn];
    if(cur.deck.length>0){ cur.hand.push(cur.deck.shift()); lg(`${spell.name}: target survives — draws 1 card.`,'imp'); }
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  // Баг-фикс: таргетируемые спеллы обрывались в doPlay() ДО строки, где триггерится
  // on_play_creature (FAERON и т.п.) — она никогда не срабатывала для JOURNEY/ARCHIVE/
  // dispel/untap. Теперь триггерим здесь же, в момент реального разрешения спелла.
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  checkWin();render();
}

function doSpellBurnTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  // Только звук поджога/блока — БЕЗ общего 'card_spell_atack' (по прямому запросу
  // автора, 2026-07-24) — тот же принцип, что уже применён к SUNDER/BLIGHT.
  // 2026-07-27 (по прямому запросу автора) — Frost/Ward/активный Solana Shield теперь
  // ПОЛНЫЙ иммунитет: клик по такой карте вообще не долетает сюда (см. click-хендлер в
  // onClick() выше — card.frozen/ward/активный shield отфильтрованы там же, до вызова
  // этой функции). Ветки ниже — оставлены defensive-фолбэком на случай другого пути вызова
  // (напр. будущий AI-код) — Shield БОЛЬШЕ НЕ тратится такой попыткой (снять его может
  // только реальный входящий урон, см. dmgCard()), та же логика, что уже у Frost.
  if(card.frozen){
    lg(`${card.name} is frozen — immune to Burn.`,'dmg');
  } else if(hasTag(card,'shield') && !card.shieldConsumed){
    lg(`${card.name}'s Solana Shield blocks the fire entirely.`,'dmg');
  } else if(hasTag(card,'ward')){
    lg(`${card.name}'s Ward blocks the burn entirely.`,'dmg');
  } else if(hasTag(card,'foxy') && Math.random()<0.5){
    // Foxy Trick (2026-07-27) — не идёт через dmgCard() вообще (чистое навешивание
    // статуса, не урон), поэтому бросок кидается ЗДЕСЬ отдельно, тем же способом,
    // что и в dmgCard()/fear_all/burn_all.
    queueFieldFx(card.id,'MISSED!','fx-miss');
    lg(`${card.name}'s Foxy Trick makes it miss entirely!`,'imp');
  } else {
    card.burning=true;
    card.burnTurns=BURN_DURATION;
    playSfx('card_fire_atack');
    lg(`${spell.name}: ${card.name} is on fire!`,'imp');
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  checkWin();render();
}

function doSpellFearTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  // Только звук страха/блока — БЕЗ общего 'card_spell_atack', тот же принцип. См.
  // комментарий в doSpellBurnTarget() выше — та же логика зеркально для Fear.
  if(card.frozen){
    lg(`${card.name} is frozen — immune to Fear.`,'dmg');
  } else if(hasTag(card,'shield') && !card.shieldConsumed){
    lg(`${card.name}'s Solana Shield blocks the fear entirely.`,'dmg');
  } else if(hasTag(card,'ward')){
    lg(`${card.name}'s Ward blocks the fear entirely.`,'dmg');
  } else if(hasTag(card,'foxy') && Math.random()<0.5){
    // Foxy Trick (2026-07-27) — см. комментарий в doSpellBurnTarget() выше.
    queueFieldFx(card.id,'MISSED!','fx-miss');
    lg(`${card.name}'s Foxy Trick makes it miss entirely!`,'imp');
  } else {
    card.feared=true;
    playSfx('debaf');
    lg(`${spell.name}: ${card.name} is Feared!`,'imp');
    queueFieldFx(card.id,'FEARED!','fx-fear');
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  checkWin();render();
}

function doSpellDestroyTarget(cardId){
  const spell=G.pendingSpell;
  if(!spell) return;
  const oppK=G.turn==='tea'?'jeet':'tea';
  const opp=G[oppK];
  let target=null, isWorld=false;
  if(opp.world && String(opp.world.id)===String(cardId)){ target=opp.world; isWorld=true; }
  else {
    const idx=opp.artifacts.findIndex(a=>String(a.id)===String(cardId));
    if(idx>=0) target=opp.artifacts[idx];
  }
  if(!target) return; // safety — onclick только вызывается для валидных id (см. render.js)
  playSfx('card_spell_atack');
  target.voided=true;
  opp.void.push(target);
  if(isWorld){ opp.world=null; } else { opp.artifacts=opp.artifacts.filter(a=>a.id!==target.id); }
  lg(`${spell.name} destroys ${target.name}!`,'imp');
  // Пересчёт ауры/брони, если у уничтоженной карты были такие теги — тот же паттерн, что
  // при обычной замене Мира/Артефакта в doWorld()/doArtifact() выше.
  if(hasTag(target,'aura:atk')||hasTag(target,'aura:maxhp')||hasTag(target,'aura:armor')||
     hasTag(target,'world_atk_vs_burning')||hasTag(target,'world_atk_vs_feared')||
     hasTag(target,'world_maxhp')||hasTag(target,'world_armor')){
    applyAuras(oppK);
    recalcArmor(oppK);
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  checkWin();render();
}

function doSpellBuffTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact){
    lg('Select an ally.','hint');return;
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
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

// BULWARK (Tea) / CARAPACE (Jeet) — +N Armor until end of battle. Same shape as ARCHIVE's ATK
// buff, but Armor isn't a standalone field the way tempAtkBonus is — it's one of several
// components `recalcArmor()` sums into armorMax (own tag + squad + aura + world, see Squad
// System section above), so this spell adds its own `spellArmorBonus` component to that same
// pool instead of introducing a parallel bookkeeping system. "Until end of battle" here means
// "until this creature dies" — spellArmorBonus is zeroed in killCard()/reviveCard()/resetC(),
// same lifecycle every other armor component already has (unlike tempAtkBonus, which
// deliberately does NOT reset on death since a dead card doesn't need it reset for anything).
function doSpellArmorTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  if(!card||card.f!==G.turn||card.spell||card.world||card.artifact){
    lg('Select an ally.','hint');return;
  }
  const val=getTagVal(spell,'spell_armor_temp')||1;
  playSfx('baf');
  card.spellArmorBonus=(card.spellArmorBonus||0)+val;
  recalcArmor(G.turn); // applies the new armorMax immediately — see its own comment on spellArmorBonus
  lg(`${spell.name}: ${card.name} +${val} Armor until end of battle.`,'hl');
  const buffId=card.id;
  setTimeout(()=>showFloat(buffId, '+Armor', 'armoraura'), 50); // reuses the same float style as aura:armor grants
  queueFieldFx(card.id,'ARMORED!','fx-spell-buff'); // reuses the ARCHIVE buff fx class
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

function doSpellDispelTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  playSfx('card_spell_atack');
  const removed=[];
  if(card.feared){card.feared=false;removed.push('fear');}
  if(card.burning){card.burning=false;removed.push('burn');}
  if(card.provokeBroken){card.provokeBroken=false;removed.push('provoke suppression');}
  if(card.atkBonus){card.atkBonus=0;removed.push('atk buff');}
  if(card.squadAtkBonus){card.squadAtkBonus=0;removed.push('squad atk');}
  if(card.squadMaxHpBonus){card.hp=Math.min(card.hp,card.maxHp-card.squadMaxHpBonus);card.maxHp-=card.squadMaxHpBonus;card.squadMaxHpBonus=0;removed.push('squad maxHP');}
  if(card.squadArmorBonus){card.armor=Math.min(card.armor,(card.armorMax||0)-card.squadArmorBonus);card.armorMax=(card.armorMax||0)-card.squadArmorBonus;card.squadArmorBonus=0;removed.push('squad armor');}
  if(card.squadParam){card.squadParam=null;removed.push('squad bonus');}
  lg(`${spell.name}: ${card.name} dispelled${removed.length?' ('+removed.join(', ')+')':' (nothing to remove)'}.`,'imp');
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

// EXPOSE (Tea) / UNMASK (Jeet) — точечная версия taunt_break: снимает Provoke с ОДНОЙ
// выбранной вражеской Provoke-карты до конца этого хода, тем же способом (card.provokeBroken
// = true), что и on_attack эффект taunt_break у существ (см. abilities.js case 'taunt_break')
// — переиспользуем flag и его тайминг снятия целиком (game.js endTurn(), строка с
// c.provokeBroken=false — снимается в конце хода ВЛАДЕЛЬЦА цели, ровно как у существ).
// Разница с существом-носителем taunt_break: тут это не побочный эффект атаки, а сам смысл
// карты — доступно без существа с этим тегом на поле, и цель не обязательно должна быть под
// атакой в этот же момент.
function doSpellProvokeBreakTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  // Ward/Frost/активный Solana Shield (2026-07-27, по прямому запросу автора) — defensive
  // фолбэк (click-хендлер уже фильтрует эти случаи выше, см. onClick()) — та же логика,
  // что в doSpellFearTarget/doSpellBurnTarget.
  if(card.frozen){
    lg(`${card.name} is frozen — immune to Provoke-break.`,'dmg');
  } else if(hasTag(card,'shield') && !card.shieldConsumed){
    lg(`${card.name}'s Solana Shield blocks the effect entirely.`,'dmg');
  } else if(hasTag(card,'ward')){
    lg(`${card.name}'s Ward blocks the effect entirely.`,'dmg');
  } else if(hasTag(card,'foxy') && Math.random()<0.5){
    // Foxy Trick (2026-07-27, по прямому запросу автора — Provoke-break тоже считается
    // дебаффом под уклонение) — та же логика, что в doSpellFearTarget/doSpellBurnTarget.
    queueFieldFx(card.id,'MISSED!','fx-miss');
    lg(`${card.name}'s Foxy Trick makes it miss entirely!`,'imp');
  } else {
    playSfx('debaf');
    card.provokeBroken=true;
    lg(`${spell.name}: ${card.name}'s Provoke is suppressed!`,'imp');
    queueFieldFx(card.id,'EXPOSED!','fx-fear'); // тот же fx, что у taunt_break на существах
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

// BREACH (Tea) / RUPTURE (Jeet) — Overkill Strike: целевой магический урон, и если хватает
// на убийство — остаток сверх HP+Брони перекидывается на вражескую базу. Та же trample-
// математика, что и у pierce в doAttack() выше (dmgCard() намеренно уводит .hp в минус на
// летальном ударе именно для того, чтобы вызывающий код мог прочитать overkill постфактум —
// см. комментарии в dmgCard()/doAttack()). В отличие от pierce это не завязано на Provoke
// вообще — работает по ЛЮБОЙ вражеской карте-существу, Provoke тут ни при чём.
function doSpellDmgTrampleTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  const dmg=getTagVal(spell,'spell_dmg_trample_target')||5;
  playSfx('card_spell_atack');
  lg(`${spell.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  const oppK=G.turn==='tea'?'jeet':'tea';
  queueFieldFx(card.id,'HIT!','fx-spell-dmg');
  dmgCard(card,dmg,oppK,true);
  const overflow=Math.max(0,-card.hp);
  if(overflow>0){
    G[oppK].hp=Math.max(0,G[oppK].hp-overflow);
    lg(`${spell.name}: overkill carries ${overflow} dmg into the ${oppK.toUpperCase()} base!`,'dmg');
    flashBase('opp','dmg',overflow);
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  checkWin();render();
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
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

// ПОРЫВ (Tea) / REVERSE (Jeet) — точечный баунс, "bounce на минималках": в отличие от
// полного `bounce` (UNSEEN — ВСЕ карты с поля обеих сторон разом), тут ОДНА выбранная
// карта, и цель может быть как своя, так и вражеская (card.f определяет владельца — куда
// именно она вернётся, не обязательно в руку кастера). ownerK берётся из card.f, а не
// G.turn, специально для этого.
function doSpellBounceTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  const ownerK=card.f;
  playSfx('wind_card'); // тот же звук, что у полного bounce (UNSEEN) — тематически один жест
  lg(`${spell.name}: ${card.name} blown back to ${ownerK==='tea'?'Tea':'Jeet'}'s hand.`,'imp');
  G[ownerK].field=G[ownerK].field.filter(c=>c.id!==card.id);
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render(); // немедленный рендер — карта пропадает с поля, rZone(zone:'field') сам подхватывает
            // "умирание" (класс dying + удаление через 400мс), см. комментарий там же в render.js
  setTimeout(()=>{
    resetC(card);
    G[ownerK].hand.push(card);
    render();
  },400); // та же задержка, что у полного bounce — карта не появляется в руке ДО того,
          // как её "призрак" на поле закончил гаснуть
}

function doSpellExecuteHalfTarget(card){
  // JUDGMENT/DEATHBLOW rework (2026-07-26, по прямому запросу автора) — раньше это был
  // условный insta-kill (999 dmg), доступный ТОЛЬКО если цель уже была ≤50% maxHP (гейт на
  // этапе выбора цели). Теперь цель — ЛЮБОЕ вражеское существо: спелл сперва наносит Bolt 1
  // (магический урон, тот же dmgCard(...,true), что у doBoltTarget() — bypassArmor,
  // блокируется Ward), и ТОЛЬКО ЕСЛИ у цели после этого удара осталось ≤50% maxHP
  // (округление ВНИЗ, Math.floor — с 5 maxHP умирает уже на 2 HP, не на 2.5/3) — добивает
  // (999 dmg, тот же bypassArmor+forceLabel 'DESTROYED', что и раньше). Если цель осталась
  // выше половины — спелл просто наносит 1 урона, никакого килла.
  // deferDeath=true на болте — если ОН САМ оказался смертельным (низкий maxHP), не резолвим
  // смерть тут же: добиваем условие ниже по актуальному hp (которое dmgCard() намеренно
  // оставляет отрицательным на летальном попадании, см. её комментарии), killCard() вызывается
  // явно один раз, без риска дважды прогнать одну и ту же карту через смерть.
  const spell=G.pendingSpell;
  if(!spell) return;
  const oppK=card.f;
  playSfx('card_spell_atack');
  lg(`${spell.name}: Bolt 1 to ${card.name}!`,'dmg');
  queueFieldFx(card.id,'BOLT!','fx-shard');
  // bypassFrost=true (2026-07-27, по прямому запросу автора) — JUDGMENT/DEATHBLOW это
  // targeted-DESTROY эффект, Frost её не спасает вообще (только Shield-активный/Ward, они
  // и так уже проверены на этапе выбора цели — см. click-хендлер выше). На обоих ударах
  // (Bolt 1 и финальный добивающий), иначе замороженная цель просто поглотила бы Bolt 1,
  // не получила урона и никогда не дошла бы до порога добивания.
  dmgCard(card,1,oppK,true,true,undefined,true);
  if(card.hp<=0){
    killCard(card,oppK);
  } else if(card.hp<=Math.floor(card.maxHp/2)){
    lg(`${spell.name} destroys ${card.name}!`,'dmg');
    queueFieldFx(card.id,'DESTROYED','fx-spell-dmg');
    dmgCard(card,999,oppK,true,false,'DESTROYED',true);
  }
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

function doShardTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  playSfx('card_spell_atack');
  const artifact=G[G.turn].artifacts.find(a=>hasTag(a,'shard'));
  // 2026-07-17: the old "+1 dmg if THIS target is feared" bonus is gone — folded into
  // shard_fear_scale's count-based scaling instead (which already counts this very target
  // if it's feared), so keeping both would have double-counted. Keeps SHARD and THE BOOK
  // symmetric: base value, scaled purely by their own family's live board count, no extra
  // per-target-condition bonus on top.
  const dmg=shardBaseDmg(artifact,oppK);
  lg(`${artifact.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  // THE BOOK gets its own fx label (thematically "burned by the page") — same fx-shard
  // visual system as SHARD itself, per author request ("сделать всё как у Шард").
  const fxLabel=hasTag(artifact,'shard_burn_scale')?'SCORCH!':'SHARD!';
  queueFieldFx(card.id,fxLabel,'fx-shard'); // плейсхолдер — позже заменится на гифку
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
  if(G.gameOver) return;
  if(isAiTurn()&&!G._aiIsEnding) return; // человек не может завершить ход ИИ
  // 2026-07-24 (баг, автор) — см. подробный комментарий у G._pendingInstantSpellResolve
  // в doPlay(): если игрок кликает End Turn ДО того, как 450мс-анимация вылета
  // только что сыгранного instant-спелла долистала до реального резолва эффекта,
  // просто ждём (поллинг раз в 100мс), вместо того чтобы флипать G.turn прямо сейчас —
  // иначе эффект спелла резолвится уже под ЧУЖИМ ходом.
  if(G._pendingInstantSpellResolve>0){
    // Защита в глубину (2026-07-24) — сверх try/finally в doPlay(): если счётчик всё же
    // застрял (мало ли по какой ещё причине), не ждём вечно. 50 попыток по 100мс = 5
    // секунд — с запасом больше любой реальной анимации/резолва. После лимита форсим ход
    // всё равно и сбрасываем счётчик, чтобы игра не осталась мёртвой намертво.
    G._endTurnWaitCount=(G._endTurnWaitCount||0)+1;
    if(G._endTurnWaitCount<50){
      setTimeout(endTurn,100);
      return;
    }
    console.warn('endTurn(): _pendingInstantSpellResolve stuck at', G._pendingInstantSpellResolve, '— forcing turn through anyway.');
    G._pendingInstantSpellResolve=0;
  }
  G._endTurnWaitCount=0;
  playSfx('yellow_buttom');
  G.sel=null;G.phase='action';G.previewCard=null;
  const next=G.turn==='tea'?'jeet':'tea';

  // sleeping/feared — снимаются у ВЫХОДЯЩЕГО игрока сразу (т.е. к ходу соперника его карты
  // уже не "спят" — полноценно отвечают на атаки). tempAtkBonus теперь НЕ здесь — часть
  // бафов (см. ARCHIVE, "до конца боя") должны пережить ход соперника, снимаются в начале
  // СЛЕДУЮЩЕГО хода владельца (см. блок армор-рефилла ниже в этой же функции).
  // exhausted — намеренно НЕ здесь по умолчанию: см. ниже, снимается только к СВОЕМУ
  // следующему ходу владельца, чтобы уставшая карта весь ход соперника оставалась
  // уязвима без ответки (см. AI BALANCE NOTES / CLAUDE.md "Version 1.01", п.11).
  // Исключение — тег `untamed` («Неукротимость», Anime pink Mood, см. Lore/Trait
  // mapping): такое существо снимает exhausted уже ЗДЕСЬ, в момент когда его
  // собственный ход заканчивается и начинается ход соперника — намеренный override
  // общего правила для конкретных редких карт, не баг.
  // provokeBroken — БЫЛО здесь (снималось у выходящего игрока), убрано 2026-07-17 по
  // прямому запросу автора: снятие Provoke имеет смысл ТОЛЬКО во время хода того, кто его
  // снял (это ОН атакует мимо провокации) — держать debuff весь следующий ход владельца
  // цели было чистым мёртвым временем, сама провок-карта на своём ходу не атакует, ей эта
  // подавленная провокация ничем не мешает и ничем не помогает. Теперь снимается в начале
  // хода ВЛАДЕЛЬЦА цели — см. `cur.field.forEach` чуть ниже в этой же функции.
  G[G.turn].field.forEach(c=>{
    c.sleeping=false;c.feared=false;
    // Frost (2026-07-27) — держится 2 СВОИХ хода владельца (не 1, как Fear): тикаем
    // frozenTurnsLeft тем же событием, что снимает Fear выше (конец хода ВЫХОДЯЩЕГО
    // игрока = конец его же собственного хода), но снимаем сам статус только когда
    // счётчик дойдёт до 0 — т.е. переживает ДВА своих хода подряд, а не один.
    if(c.frozen){
      c.frozenTurnsLeft=(c.frozenTurnsLeft===undefined?2:c.frozenTurnsLeft)-1;
      if(c.frozenTurnsLeft<=0) scheduleFrostRemoval(c);
    }
    if(hasTag(c,'untamed')) c.exhausted=false;
  });
  G[G.turn].artifacts.forEach(a=>{a.sleeping=false;});
  G.turn=next;
  // Спектаторский режим (оба игрока — ИИ, см. isAiTurn()/startAiVsAiSpectator()):
  // ai.js весь построен вокруг "G.aiFaction — это я, G.humanFaction — противник"
  // как фиксированной пары; здесь эта пара просто переворачивается на каждый ход,
  // чтобы та же самая логика без изменений принимала решения за ОБЕ стороны по очереди.
  if(G.spectatorMode){
    G.aiFaction=G.turn;
    G.humanFaction=G.turn==='tea'?'jeet':'tea';
  }

  // Разделение endTurn() на "конец старого хода" (выше, сразу) и "начало нового хода"
  // (_runTurnStartEffects() ниже — раньше было прямым продолжением этой же функции)
  // (2026-07-27, по прямому запросу автора — геймдизайн-фикс: в хотсите весь "старт хода"
  // (тик горения/инкарнации, добор карты и fatigue-предупреждение, эссенция, экран "Turn N")
  // раньше отыгрывался СРАЗУ, пока на экране висел pass-device оверлей "передайте
  // устройство" — игрок слышал звуки, но не видел ничего, и предупреждение о пустой
  // колоде (см. showDeckEmptyWarning(), ui.js) пряталось за этим же оверлеем, оставаясь
  // незамеченным. Теперь в хотсите старт хода откладывается до момента, когда следующий
  // игрок нажмёт "Ready" на pass-device экране (см. showPassScreen()/passReady(), ui.js —
  // тот же cb-механизм, что уже использовался для стартового муллиган-хэндоффа tea→jeet) —
  // и увидит/услышит всё сам, в свой момент. В vs-AI (и AI vs AI spectator) хэндоффа нет
  // вообще — там всё как раньше, без задержки.
  const showHandoff = (G.mode!=='vsai') && !G.gameOver;
  if(showHandoff && typeof showPassScreen==='function'){
    showPassScreen(G.turn, _runTurnStartEffects);
  } else {
    _runTurnStartEffects();
  }
}

function _runTurnStartEffects(){
  if(G.gameOver) return; // защита: игра могла закончиться, пока висел pass-device экран
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
    // provokeBroken (taunt_break/EXPOSE/UNMASK) — снимается ЗДЕСЬ, в начале хода владельца
    // цели (2026-07-17, см. комментарий в блоке выше про удаление отсюда старого места
    // снятия). Никакого лога/fx — это тихий housekeeping-сброс, не игровое событие для
    // самого владельца (провокация и так не помогала бы ему на его собственном ходу).
    c.provokeBroken=false;
    // interceptUsed (Intercept, Xuiqtr, 2026-07-17) — тот же принцип: "сработал один раз
    // за ход" имеет смысл именно на ходу АТАКУЮЩЕГО (это его атаки перехватывает), так что
    // сбрасывается здесь же, в начале хода владельца перехватчика — готов перехватывать
    // снова с первой же вражеской атаки в их следующий ход.
    c.interceptUsed=false;
    // tempAtkBonus (ARCHIVE и т.п.) — НЕ сбрасываем здесь. Автор уточнил: баф должен
    // быть постоянным (живёт, пока существо не умрёт), а не "переживает один ход
    // соперника и гаснет к следующему своему ходу" — предыдущая версия сбрасывала
    // его именно тут каждый раз, когда начинался ход владельца, что и обрезало баф
    // ровно через один круг. Единственные места сброса теперь — смерть/уход с поля
    // (killCard()→resetC(), reviveCard(), raise-эффект) и инициализация свежей карты
    // (mkCard()) — то есть баф действительно живёт до смерти существа.
    if(c.armorMax>0){
      if(c.armor<c.armorMax) lg(`${c.name}'s armor refills to ${c.armorMax}.`,'imp');
      c.armor=c.armorMax;
    }
  });
  cur.artifacts.forEach(a=>{a.exhausted=false;});

  // Снимок поля ДО тика Инкарнации — используется ниже вместо cur.field для on_turn-триггера
  // (баг 2026-07-17, автор: Плегмор воскресал через свою же Инкарнацию и тут же поднимал
  // существо с кладбища своей активкой raise:1/on_turn в тот же момент — хотя он только что
  // вошёл на поле Спящим и по правилам не должен успевать подействовать в этот ход). Причина:
  // reviveCard() пушит карту в cur.field ПРЯМО в этом же блоке (несколькими строками ниже), а
  // общий цикл `[...cur.field].forEach(c=>triggerAbilities(c,'on_turn'))` шёл ПОСЛЕ и честно
  // подхватывал уже добавленную свежевоскрешённую карту вместе со всеми остальными. Фикс не
  // специфичен для raise/Плегмора — общее правило: любая on_turn-абилка (regen и т.п.) не
  // должна срабатывать в тот же ход, когда карта воскресла через Инкарнацию, тем же принципом,
  // что и обычный вход на поле Спящим не даёт подействовать в свой первый ход.
  const fieldBeforeIncarnation=[...cur.field];

  // Инкарнация — тик по СВОЕМУ кладбищу в начале СВОЕГО хода (тот же принцип, что и
  // Броня/exhausted чуть выше — "раз в свой ход"). X = число полных ходов владельца
  // ПОСЛЕ смерти: тикнуло X раз подряд — воскресло на полном HP. Итерируем копию массива
  // (`[...cur.grave]`), т.к. reviveCard() пушит карту обратно в cur.field, а не трогает
  // grave напрямую — сам вырезаем воскресшую из grave ниже, до вызова reviveCard.
  [...cur.grave].forEach(c=>{
    if(c.incarnTimer==null) return;
    if(c.incarnTimer>0) c.incarnTimer--;
    if(c.incarnTimer<=0){
      // 2026-07-16: лимит поля 6 существ — если место занято ровно в момент, когда
      // инкарнация должна была завершиться, НЕ форсим 7-ю карту на поле. Таймер
      // остаётся на 0 (не уходит в минус — c.incarnTimer>0 выше не даёт декрементить
      // дальше), и на КАЖДОМ следующем ходу владельца снова проверяем место — как
      // только освобождается, воскрешение доигрывается как обычно.
      if(cur.field.length>=6){
        lg(`${c.name}: Incarnation ready, but the battleground is full — waiting.`,'hint');
        return;
      }
      cur.grave=cur.grave.filter(x=>x.id!==c.id);
      c.incarnTimer=undefined;
      c.incarnUsed=true; // одноразовость — см. killCard(): вторая смерть уйдёт сразу в войд
      reviveCard(c,G.turn);
      playSfx('rest'); // тот же звук, что у обычного revive-заклинания (см. case 'revive' в abilities.js)
      lg(`${c.name}: Incarnation complete — rises again!`,'hl');
    }
  });

  cur.burned=false;
  if(G.secondFirstTurn&&G.turn===G.secondFaction){
    cur.essMax=1;cur.ess=1;G.secondFirstTurn=false;
  } else {
    cur.essMax=Math.min(ESS_CAP, cur.essMax+1);cur.ess=cur.essMax;
  }
  flashEssenceGain(G.turn);
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(cur.world) triggerAbilities(cur.world,'on_turn');
  cur.artifacts.forEach(a=>triggerAbilities(a,'on_turn'));
  applyAuras(G.turn);
  checkSquadBonuses(G.turn);
  recalcArmor(G.turn);

  // Burn-тик (2026-07-19, автор нашёл живьём — Плегмор-баг): ДОЛЖЕН резолвиться (включая
  // летальную смерть) ДО цикла on_turn-триггеров существ чуть ниже, а не после. Раньше
  // порядок был обратный: сперва on_turn (Плегмор успевал сработать своим raise:1 —
  // поднять существо с кладбища), и только СЛЕДОМ шёл этот burn-тик, который его и убивал.
  // Итог: карта, уже получившая летальный урон в НАЧАЛЕ этого самого хода, всё равно
  // успевала подействовать своей активкой в тот же ход — концептуально то же самое
  // нарушение, что чинил комментарий про "fieldBeforeIncarnation" чуть выше (Спящая карта
  // не должна успевать подействовать в свой первый ход) — только тут наоборот, "мёртвая"
  // карта не должна успевать подействовать в ход своей же смерти. Теперь burn убивает
  // ПЕРВЫМ, а fieldBeforeIncarnation ниже дополнительно фильтруется по актуальному
  // cur.field — сгоревшая карта уже вырезана из него killCard() и не попадёт в on_turn.
  [...G[G.turn].field].forEach(card=>{
    if(card.burning&&!card.spell&&!card.world&&!card.artifact){
      // Burn deliberately bypasses armor (author call, 2026-07-10) — it always
      // hits HP directly, unlike every other damage source which goes through
      // dmgCard()'s armor-absorbs-first math. Burn is meant to be a reliable,
      // un-mitigatable ongoing HP loss.
      card.hp-=1;
      // 2026-07-25 — Burn теперь ограничен BURN_DURATION ходами (см. константу выше),
      // а не бессрочен: считаем тик и снимаем флаг сам собой на нуле, как Fear.
      card.burnTurns=(card.burnTurns===undefined?BURN_DURATION:card.burnTurns)-1;
      if(card.burnTurns<=0) card.burning=false;
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
        // Звук (2026-07-19, автор нашёл живьём — смерть от поджога была ПОЛНОСТЬЮ
        // беззвучной). card_burn — это другой, несвязанный звук (сжигание карты ИЗ РУКИ
        // за эссенцию, doBurnCard() — см. render.js), а не про статус-эффект горения.
        // card_fire_atack уже играет один раз в МОМЕНТ поджога (case 'burn'/'burn_all',
        // abilities.js) — переиспользуем тот же звук и здесь, в момент смерти от него,
        // не на каждый обычный тик (иначе повторялся бы каждый ход владельца, пока
        // существо просто горит, не умирая — навязчиво).
        playSfx('card_fire_atack');
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

  // Фильтр по актуальному cur.field (2026-07-19, см. комментарий у burn-тика выше) —
  // если карта сгорела до смерти ЭТИМ же burn-тиком (только что, прямо над этой строкой),
  // killCard() уже вырезал её из G[G.turn].field, так что она отсеется здесь и не
  // получит on_turn-триггер (Плегмор и любая другая on_turn-абилка). Карты, которые
  // просто не были burning, само собой остаются в cur.field и проходят фильтр как обычно.
  fieldBeforeIncarnation.forEach(c=>{
    if(cur.field.includes(c)) triggerAbilities(c,'on_turn');
  });
  checkWin();

  const skipDraw=(G.turn===G.secondFaction&&G.turnNum===1);
  if(!skipDraw){
    const n=1+cur.extraDraw;
    for(let i=0;i<n;i++){
      if(cur.deck.length>0){
        cur.hand.push(cur.deck.shift());
      } else {
        // Fatigue (2026-07-21, автор — живой баг: партии, где колода кончалась рано,
        // просто зависали на много ходов "зомби-состояния" без карт и без штрафа, см.
        // разбор в CLAUDE.md). Каждая ПРОПУЩЕННАЯ попытка добора (колода пуста) считается —
        // на 3-ю подряд/суммарную такую попытку игрок проигрывает немедленно. Счётчик
        // НЕ сбрасывается (колода только убывает, никогда не пополняется в этой игре).
        cur.emptyDrawCount=(cur.emptyDrawCount||0)+1;
        lg(`${G.turn.toUpperCase()}'s deck is empty — no card to draw! (${cur.emptyDrawCount}/3)`,'dmg');
        // Предупреждение о пустой колоде (2026-07-27, по прямому запросу автора —
        // геймдизайн-нюанс, см. showDeckEmptyWarning()/ui.js) — только если ЭТА попытка ещё
        // не добила до проигрыша (тот случай ниже уже показывает свою модалку победы).
        if(cur.emptyDrawCount<3 && typeof showDeckEmptyWarning==='function'){
          showDeckEmptyWarning(3-cur.emptyDrawCount);
        }
        if(cur.emptyDrawCount>=3 && !G.gameOver){
          G.gameOver=true;
          const winner=G.turn==='tea'?'jeet':'tea';
          lg(`${G.turn.toUpperCase()} has no cards left after 3 failed draws — ${winner.toUpperCase()} wins by fatigue!`,'imp');
          // 2026-07-24 (баг, автор): render() тут раньше стоял ДО showWin(), и если render()
          // по любой причине кидал исключение (например что-то в руке/поле не рендерится
          // корректно в этот самый момент), showWin() просто никогда не вызывался — игра
          // молча "замирала", в логе оставалась только строка о проигрыше, без самой
          // модалки победы. try/catch гарантирует, что showWin() сработает в любом случае.
          try{ render(); } catch(e){ console.error('render() failed during fatigue win:', e); }
          showWin(winner);
          return; // не продолжаем обычную концовку хода (AI-ход и т.п.)
        }
      }
    }
  }

  if(G.turn===G.firstFaction)G.turnNum++;
  logTurnSnapshot(G.turn);
  lg(`─ Turn ${G.turnNum}: ${G.turn.toUpperCase()} · ${cur.ess}/${cur.essMax} Essence ─`,'trn');
  const lp=document.getElementById('logPanel');if(lp)lp.classList.remove('open');
  render();

  // showPassScreen() больше НЕ вызывается здесь — теперь это забота вызывающей стороны
  // (endTurn() выше передаёт _runTurnStartEffects саму в качестве onReady-колбэка
  // showPassScreen() для хотсита, см. комментарий там) — эта функция либо запускается
  // СРАЗУ (vs-AI/spectator), либо уже ПОСЛЕ того, как игрок нажал "Ready" (хотсит), так что
  // здесь остаётся только собственно AI-ход.
  if(isAiTurn()&&typeof runAiTurn==='function'){
    setTimeout(()=>runAiTurn(),600);
  }
}

// ── WIN / MULLIGAN / UTILS ─────────────────────────────────
function checkWin(){
  if(G.gameOver) return;
  // 2026-07-24 (защита в глубину, автор) — тот же принцип, что и у fatigue-пути выше:
  // showWin() должен показаться, даже если что-то ДО него (в теории) кинет исключение.
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

// Spacebar: ends the turn, OR (if the pass-device "Hand the device over" screen is open)
// confirms it — nothing else. Modal check runs first so the two shortcuts never both fire
// at once.
//
// ИСТОРИЯ (2026-07-27, автор сам поймал причину серии "необъяснимых вылетов на лендинг" в
// хотсите): это была НЕ ошибка и НЕ краш вообще — двойное нажатие Space "по привычке"
// (первое — передать ход, второе — сразу же подтвердить pass-device экран) ИНОГДА
// накладывалось на момент, когда игра ЗАКАНчивалась по истощению колоды (fatigue win) —
// вместо pass-device экрана внезапно всплывал WIN MODAL, и то самое "второе" нажатие Space
// (уже по привычке, не глядя) тут же подтверждало ЕГО — автор пропускал победный экран, не
// успев его увидеть, и решал, что это краш. Раньше Space также подтверждал `winModal` и
// `mulliganScreen` — теперь ОБА убраны из списка: Space отныне работает ТОЛЬКО для (1) конца
// хода без модалок и (2) кнопки "Ready" на pass-device экране — победный экран и муллиган
// требуют осознанного клика/тапа, чтобы больше никогда не проскакивать мимо них вслепую.
document.addEventListener('keydown',(e)=>{
  if(e.code!=='Space') return;
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA') return; // don't hijack Space while typing (e.g. catalog search)

  // confirmModal (2026-07-27, по прямому запросу автора — исходно заподозренная, но НЕ
  // подтвердившаяся причина той же серии "вылетов" — см. историю выше, настоящая причина
  // оказалась в winModal/mulliganScreen). Логика по-прежнему верна и остаётся: этот модал
  // переиспользуется для askMenu()/"Yes, Exit" и askRestart()/"Yes, Restart" — обе
  // деструктивны и необратимы, Space по нему не должен делать ничего.
  const confirmModal=document.getElementById('confirmModal');
  if(confirmModal && !confirmModal.classList.contains('hidden')){
    e.preventDefault();
    return;
  }
  // winModal/mulliganScreen (2026-07-27) — Space по ним теперь ничего не делает (см.
  // историю выше), но само их присутствие всё равно должно ГЛУШИТЬ Space целиком — иначе
  // не найдя совпадения в modalButtons ниже, обработчик провалился бы дальше и вызвал
  // endTurn() поверх открытого модала (endTurn() сам по себе безопасен при G.gameOver —
  // см. ранний return в начале функции, — но во время mulliganScreen такой защиты нет,
  // финиш хода в разгар муллигана — путаное, ненужное состояние).
  const winModal=document.getElementById('winModal');
  const mulliganScreen=document.getElementById('mulliganScreen');
  if((winModal && !winModal.classList.contains('hidden')) ||
     (mulliganScreen && !mulliganScreen.classList.contains('hidden'))){
    e.preventDefault();
    return;
  }

  const modalButtons=[
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
// queueFieldFxReplace (2026-07-27, по прямому запросу автора) — Solana Shield: звонящий код
// (doAttack()/doBoltTarget()/doSpellDmgTarget() и т.п.) почти всегда СНАЧАЛА ставит в очередь
// свою "HIT!"/"BOLT!"-плашку, и только ПОТОМ зовёт dmgCard() — которая уже решает, поглотит
// ли щит удар. Обычный queueFieldFx() тут не годится — вторая плашка легла бы РЯДОМ с первой
// (обе абсолютно спозиционированы в центр карты — наложились бы друг на друга нечитаемо), а
// не заменила бы её. Эта функция вместо этого вычищает все ещё не отрисованные fx-записи
// для той же самой карты из очереди, прежде чем добавить новую — так что к моменту рендера
// на карте гарантированно окажется только ОДНА, самая точная плашка ("ABSORB" вместо
// "HIT!"/"BOLT!"), а не обе разом.
function queueFieldFxReplace(cardId, label, cls){
  if(!G._pendingFieldFx) G._pendingFieldFx=[];
  G._pendingFieldFx=G._pendingFieldFx.filter(fx=>String(fx.cardId)!==String(cardId));
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
