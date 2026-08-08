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
          lg(bushido?`Must attack ${bushido.name} (Bushido) first!`:`Must attack the Tree Wall card first!`,'hint');
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
  if(G.phase==='shotTarget'){
    if(zone==='field'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact){
      // В отличие от boltTarget выше — НЕТ ward-гейта: Shot физический (bypassArmor=false),
      // Ward блокирует только bypassArmor=true урон (см. dmgCard()), так что Ward-цели
      // остаются полностью валидными для Shot (это и есть весь смысл тега — контра на Ward,
      // по прямому запросу автора). Invisible/нераскрытый stealth — та же логика, что и
      // везде (isSpellTargetable), клик по невидимой цели просто игнорируется.
      if(isSpellTargetable(card,G[opp].field)){
        doShotTarget(card);return;
      }
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
    // РЕДИЗАЙН (2026-08-06, по прямому запросу автора — ELIXIRS/OBLIVION cost2→3, теперь
    // помимо активации ещё и Clean, тем же набором, что снимает Orbiton-хил (burning/
    // feared/provokeBroken), НЕ трогает mekMarked). Раньше цель была валидна ТОЛЬКО если
    // card.sleeping||card.exhausted — теперь ДОПОЛНИТЕЛЬНО валидна карта с дебаффом для
    // очистки, даже если она уже активна (не спит и не устала). frozen — явное
    // исключение по прямому запросу автора: замороженную карту выбрать нельзя вообще,
    // даже если она параллельно ещё и sleeping/exhausted/дебаффнута — тот же паттерн, что
    // уже используется для других own-creature target-фаз в этом файле (см. активацию
    // способности чуть ниже, card.frozen блокирует её точно так же).
    if(zone==='field'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&!card.frozen){
      if(card.sleeping||card.exhausted||card.burning||card.feared||card.provokeBroken){
        doSpellUntapTarget(card);return;
      }
      // Клик по своей карте, которая и так уже активна и ничего не несёт для очистки —
      // заклинанию нечего делать. По просьбе автора это НЕ считается отменой (раньше любой
      // такой клик отменял заклинание с рефандом) — просто игнорируем клик и ждём валидную
      // цель, чтобы случайный тап не по той карте не срывал применение.
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
  if(G.phase==='gustAllyTarget'){
    // TEANTIST active skill "Return your ally" (2026-07-30, по прямому запросу автора) —
    // тот же bounce-эффект, что у spellBounceAllyTarget выше, но доставлен активкой
    // существа на поле, а не спеллом (см. doGustAbility() — кастер НЕ топится в void,
    // остаётся на поле и exhausted'ится). card.id!==G.sel — по прямому запросу автора
    // карта не может вернуть в руку сама себя, только других союзников. cancelPendingSpell()
    // тут безопасен без рефанда — G.pendingSpell для этой фазы всегда пуст (нет спелла).
    if(zone==='field'&&card.f===G.turn&&card.id!==G.sel&&!card.spell&&!card.world&&!card.artifact){
      doGustAbility(card);return;
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
      playSfx('card_select_traveler'); // 2026-08-08, по прямому запросу автора — тот же звук, что при выборе/превью карты в руке (см. zone==='hand' на 3 строки выше), теперь и при выборе своей карты на поле для действия
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
        else lg(`Must attack the Tree Wall card first!`,'hint');
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

// БАГФИКС (2026-08-01, "ИИ виснет намертво после SHRAPNEL/SCATTERSHOT" — автор поймал
// живьём, повторно, ПОСЛЕ уже нескольких предыдущих заходов на эту же тему).
//
// Настоящая причина, которую предыдущие попытки не трогали: G._pendingInstantSpellResolve
// (см. её комментарий у doPlay()/endTurn()) корректно защищает ПЕРЕКЛЮЧЕНИЕ ХОДА (endTurn()
// ждёт, пока счётчик не опустеет), но НИЧЕГО не защищало продолжение самого AI-степ-цикла
// (aiPlayCardsStep() в ai.js) — все три места ниже, где раньше стояло голое
// `if(typeof afterResolve==='function') afterResolve();`, звали колбэк СРАЗУ по факту
// СИНХРОННОГО возврата из _resolvePlayedCard(), а не по факту реального завершения эффекта
// карты. Для большинства карт разницы нет (эффект и правда резолвится синхронно). Но
// random_spread (SHRAPNEL/SCATTERSHOT) специально бросает 3 снаряда ОДИН ЗА ДРУГИМ с
// задержкой (см. case 'random_spread', abilities.js, ~1.5-2с суммарно на весь залп) —
// _resolvePlayedCard() успевает лишь ЗАПУСТИТЬ эту очередь (fireShot(0)) и тут же
// возвращается, оставляя G._pendingInstantSpellResolve>0 ещё почти на две секунды. Старый
// код в этот момент уже звал afterResolve() → aiPlayCardsStep(iter+1) (ai.js) уходил в
// следующую карту/фазу атаки, ПОКА Shrapnel ещё реально бил по G[oppK].field где-то в
// глубине setTimeout-цепочки — та же гонка, что теоретически есть и у Bolt-спеллов (JAB/
// STING/SPARK/MALICE/EXECUTE/CULL, doBoltTarget) и spellDmgTarget-цепочек, просто у них
// залп из одного снаряда и окно гонки настолько узкое (420мс), что почти никогда не
// успевало реально сломаться — у Shrapnel окно почти в 2 секунды, ловится стабильно.
// Симулятор (sim/headless.js) эту гонку в принципе не может поймать — там весь каскад
// setTimeout-колбэков выполняется синхронно одной очередью без реальных задержек (см.
// makeSandbox() в headless.js), поэтому "next step после afterResolve" там всегда честно
// идёт ПОСЛЕ того, как все внутренние setTimeout уже отработали — гонки просто нет, только
// в реальном браузере с настоящими таймерами.
// Фикс: тот же поллинг-паттерн (100мс, до 50 попыток = 5с потолок), что уже был у
// endTurn() — просто теперь применяется и к afterResolve() тоже, а не только к
// переключению G.turn. Раз счётчик общий (используется ЛЮБЫМ отложенным эффектом карты,
// не только Shrapnel), это закрывает весь класс гонки разом, а не только этот один спелл.
function deferAfterResolve(afterResolve, tries){
  if(typeof afterResolve!=='function') return;
  if(G._pendingInstantSpellResolve>0 && (tries||0)<50){
    setTimeout(()=>deferAfterResolve(afterResolve,(tries||0)+1),100);
    return;
  }
  afterResolve();
}

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

  // isPlainInstantSpell — поднято сюда, наверх doPlay() (2026-08-05), было объявлено ниже
  // (см. старое место чуть дальше по функции, у spell-cast-out анимации) — понадобилось
  // РАНЬШЕ needsReveal-ветки тоже, чтобы звук magic.wav срабатывал одинаково что для
  // человека, что для спелла ИИ, раскрываемого через playSpellRevealAnimation() (см. ниже).
  // "Простой" instant-спелл — эффект, разыгранный без фазы выбора цели через клик (draw/
  // ess_add/aoe/discard/т.п.) — единственная категория, для которой звучит magic.wav.
  const isPlainInstantSpell = card.spell && !TARGETED_SPELL_TAGS.some(t=>hasTag(card,t));
  // magic.wav (2026-08-05, по прямому запросу автора) — играет в момент розыгрыша ЛЮБОГО
  // не-таргетируемого спелла, до того как реально резолвится сам эффект (добор/эссенция/
  // AOE/discard и т.п.) — единая точка входа что для анимированного сгорания карты в руке
  // (см. spell-cast-out ниже), что для мгновенного пути (cardEl не найден/no-DOM резолв),
  // что для скрытой руки ИИ (needsReveal).
  if(isPlainInstantSpell) playSfx('magic');

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
      // БАГФИКС (2026-07-30, автор поймал живьём — ИИ вис намертво после каста спелла,
      // напр. SHRAPNEL): та же защита, что уже стоит у isPlainInstantSpell чуть ниже
      // (добавлена туда 2026-07-24 за идентичный класс бага), просто её забыли
      // продублировать сюда при добавлении reveal-анимации. Без try/finally — если
      // _resolvePlayedCard() кидает исключение, afterResolve() никогда не вызывается,
      // и aiPlayCardsStep() (ai.js) виснет навсегда в ожидании колбэка, которого не
      // будет. Теперь afterResolve() гарантированно срабатывает в любом случае, даже
      // если сам эффект спелла упал с ошибкой (та ошибка уйдёт в консоль, ход — нет).
      try{
        _resolvePlayedCard(card);
      } catch(e){
        console.error('Spell resolution failed (AI reveal path):', card.name, e);
      } finally {
        deferAfterResolve(afterResolve);
      }
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
        deferAfterResolve(afterResolve);
      }, 450);
      return;
    }
    // cardEl не найден — подстраховка (не должно происходить в норме для реально видимой
    // руки), падаем в обычный мгновенный путь ниже, чтобы ход точно не завис.
  }

  // Полёт из руки на поле (2026-08-05, по прямому запросу автора) — снимок текущей позиции
  // карты В РУКЕ, ДО того как она реально уйдёт оттуда. Только для существ (card.spell/
  // world/artifact идут другими путями — Мир/Артефакт не встают в общий ряд поля, спеллы
  // либо уже обработаны выше отдельными ветками, либо не летят вообще). rZone() (render.js)
  // подхватит этот снимок на рендере зоны поля этим же вызовом render() внутри
  // _resolvePlayedCard()→doCreature() — см. _pendingHandOriginRects/_playFieldFlyIfPending()
  // там же, тот же приём, что и у _bounceOriginRects (полёт в обратную сторону).
  if(!card.spell&&!card.world&&!card.artifact){
    const handEl=document.querySelector(`.hand .card[data-id="${card.id}"]`);
    if(handEl){
      _pendingHandOriginRects[card.id]=handEl.getBoundingClientRect();
    } else {
      // Скрытая рука (2026-08-05, багфикс по прямому запросу автора — "у противника из его
      // руки карты тоже надо чтоб летели") — в VS AI режиме рука ИИ ВСЕГДА рисуется
      // рубашками (rHiddenHand(), .card-mini, без реальных .card[data-id] элементов —
      // querySelector выше в принципе не может найти карту ИИ), так что раньше для хода ИИ
      // origin просто не находился, и существо тихо появлялось на поле без полёта вообще.
      //
      // БАГФИКС (2026-08-05, повторный заход по прямому запросу автора — "летит откуда-то
      // сверху, а не из руки") — первая версия фолбэка брала rect ВСЕЙ зоны руки целиком
      // (`handZoneEl.getBoundingClientRect()`), а зона руки — это на всю ширину экрана
      // (~1280×50px), совсем не размера карты. _playFieldFlyIfPending() (render.js) считает
      // стартовый scale как `originRect.width/restRect.width` — при origin-width~1280px и
      // restRect (маленькая карта на поле) ~120px это давало startScale≈10 — гигантский
      // клон, схлопывающийся до нормального размера за 300мс, визуально совсем не похоже на
      // "вылет из руки", скорее на "что-то падает откуда-то сверху". Теперь вместо всей зоны
      // берём rect РЕАЛЬНОЙ рубашки (`.card-mini`, тот же элемент, что уже использует
      // playSpellRevealAnimation() для scale-референса при раскрытии AI-спеллов) — она
      // физически card-sized, так что startScale получается в разумных пределах (~1), а сам
      // вылет визуально стартует именно оттуда, где нарисованы рубашки скрытой руки.
      // Рубашек может не быть вообще (рука пуста) — тогда используем прежний
      // whole-zone-rect фолбэк (лучше кривой старт, чем вообще без анимации).
      const handZoneEl=document.getElementById(_arenaPosForFaction(G.turn)==='Opp'?'oppHandZone':'playerHandZone');
      if(handZoneEl){
        const miniEl=handZoneEl.querySelector('.card-mini');
        _pendingHandOriginRects[card.id]=(miniEl||handZoneEl).getBoundingClientRect();
      }
    }
  }
  cur.hand=cur.hand.filter(c=>c.id!==card.id);
  _resolvePlayedCard(card);
  deferAfterResolve(afterResolve);
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
    lg(`${card.name}: select any creature on the battleground.`,'hint');
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
    lg(`${card.name}: select an enemy Tree Wall creature.`,'hint');
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

// Founder of Saga (KREATIV, 2026-08-06, по прямому запросу автора) — "все карты с Saga
// имеют максимальный эффект", пока KREATIV жив. РЕАЛИЗОВАНО как мгновенный, ПОСТОЯННЫЙ
// форс до sagaStage=3 (не временный визуальный оверрайд) — по прямому решению автора:
// карта физически не может быть на поле одновременно с KREATIV и стоять на промежуточной
// стадии, поэтому эффект просто СРАЗУ доначисляет карте недостающие бонусы вплоть до 3 и
// запоминает это в её собственных полях (sagaStage/sagaArmorBonus/sagaAtkBonus) — теми же
// путями, что и обычный по-ходовой тик (см. wake-up блок в endTurn() ниже). Если KREATIV
// потом умирает — ничего физически не откатывается, потому что бонусы уже реально
// начислены на карте, а не просто "показывались как 3" поверх настоящего меньшего числа.
// Идемпотентна — безопасно звать повторно на карте, уже стоящей на 3 (no-op).
function _forceSagaMax(card){
  if(!hasTag(card,'saga')) return;
  while((card.sagaStage||0)<3){
    card.sagaStage=(card.sagaStage||0)+1;
    if(card.sagaStage===1){ card.maxHp+=1; card.hp+=1; }
    else if(card.sagaStage===2){ card.sagaArmorBonus=(card.sagaArmorBonus||0)+1; recalcArmor(card.f); }
    else if(card.sagaStage===3){ card.sagaAtkBonus=(card.sagaAtkBonus||0)+1; }
  }
}

function doCreature(card){
  const cur=G[G.turn];
  card.sleeping=!card.tags.includes('vanguard');
  card.exhausted=false;
  cur.field.push(card);
  lg(`${G.turn.toUpperCase()} plays ${card.name}.`,'imp');

  // Founder of Saga (KREATIV) — см. подробный комментарий у _forceSagaMax() выше. Две
  // стороны одного правила: (1) эта карта САМА несёт Saga, а на поле уже стоит KREATIV —
  // форсим сразу; (2) эта карта — САМ KREATIV — форсим ВСЕХ, кто уже на поле с Saga.
  // Логируем ОДИН раз на карту (не по стадиям, как обычный по-ходовой тик выше в
  // endTurn()) — тот же принцип, что уже применяют обычные aura:atk/aura:maxhp при входе
  // источника: "аура появилась на поле, залогировали факт, без пошагового спама".
  if(hasTag(card,'saga') && cur.field.some(c=>c.id!==card.id&&hasTag(c,'founder_of_saga'))){
    _forceSagaMax(card);
    lg(`${card.name}: Founder of Saga — instantly at Saga 3.`,'hl');
    queueFieldFx(card.id,'Saga Up','fx-sagaup');
  }
  if(hasTag(card,'founder_of_saga')){
    const affected=cur.field.filter(c=>c.id!==card.id&&hasTag(c,'saga')&&(c.sagaStage||0)<3);
    if(affected.length>0){
      affected.forEach(c=>_forceSagaMax(c));
      lg(`${card.name}: Founder of Saga — ${affected.map(a=>a.name).join(', ')} instantly at Saga 3.`,'hl');
      affected.forEach(a=>{
        queueFieldFx(a.id,'Saga Up','fx-sagaup');
      });
    }
  }

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

function reviveCard(card,toF,graveFaction){
  const def=DEFS[card.key];
  if(def){card.hp=def.hp;card.maxHp=def.hp;}
  card.sleeping=true;card.exhausted=false;card.feared=false;card.burning=false;card.provokeBroken=false;card.interceptUsed=false;card.stealthBroken=false;card.shieldConsumed=false;card.frozen=false;card.frozenTurnsLeft=0;card._frostLeaving=false;card.mekMarked=false;card.mekMarkTurns=0;card.atkBonus=0;card.tempAtkBonus=0;card.maxHpBonus=0;card.baseMaxHp=null;card.synergyMaxHpBonus=0;card.auraMaxHpBonus=0;card.worldMaxHpBonus=0;card.worldMaxHpSet=false;card.squadParam=null;card.squadAtkBonus=0;card.squadMaxHpBonus=0;card.squadArmorBonus=0;card.spellArmorBonus=0;card.armorMax=undefined;card.auraArmorBonus=0;card.worldArmorBonus=0;
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
  // Полёт из кладбища (2026-08-05, по прямому запросу автора) — карта "вылетает" из иконки
  // кладбища ТОЙ фракции, откуда реально была поднята (graveFaction — обычно совпадает с
  // toF, но `revive`-спелл с тегом `any` может поднимать карту из ЧУЖОГО кладбища, отсюда
  // отдельный параметр, а не всегда toF), увеличиваясь по пути до родного размера поля —
  // rZone() (render.js) подхватывает это по dataset.id при следующем render(), когда решает,
  // какую анимацию появления дать новому существу на поле (обычный entering-pop или полёт).
  _pendingReviveOrigins[card.id]=graveFaction||toF;

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
  const atk=att.atk+(att.atkBonus||0)+rageAtkBonus(att)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0)+(att.sagaAtkBonus||0)+burnBonus+fearBonus+worldBurnBonus+worldFearBonus;

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
  // Frost Attack (2026-08-04, звук по прямому запросу автора) — та же логика "звук атаки
  // замещается debuff-звуком", что у willFear/willBurn выше, НО не через debuffBlocked:
  // Frost, в отличие от Fear/Burn, применяется ДАЖЕ на уже замороженную цель (просто
  // обновляет длительность — см. case 'frost' в abilities.js, там нет ветки на
  // ctx.target.frozen), единственное, что его блокирует — Ward.
  const willFrost = hasTag(att,'frost') && targetSurvives && !hasTag(target,'ward');
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
                            rageAtkBonus(target) + (target.squadAtkBonus||0) + (target.sagaAtkBonus||0);

  const hpBefore=target.hp;
  dmgCard(target,atk,oppK,undefined,undefined,undefined,undefined,att);
  // Foxy Trick (2026-07-27, по прямому запросу автора: "сначала проверка не промахнётся ли
  // атака вообще, потом уже абсорб урона") — звук решается ПОСЛЕ dmgCard(), а не до, потому
  // что флаг промаха (_foxyDodgedThisHit) появляется только внутри неё. На промах — свой
  // отдельный звук (miss.wav, dmgCard()), не card_atack — см. проверку ниже. Иначе — прежняя
  // логика: обычный звук атаки, если дебафф в итоге не наложится (Ward/Frost), иначе тишина —
  // сыграет debaf-звук чуть ниже.
  // _shieldBlockedThisHit (2026-08-05, багфикс по прямому запросу автора) — добавлена сюда,
  // раньше её тут не было: Solana Shield абсорбирует удар целиком (dmgCard() уже играет свой
  // absorb.wav и return'ится ДО HP-урона), но эта строка не проверяла флаг вообще, поэтому
  // card_atack всё равно звучал ПОВЕРХ absorb.wav — ровно тот случай "не должен звучать
  // никакой другой звук, кроме absorb", который автор попросил починить.
  // _frostBlockedThisHit (2026-08-06, тот же класс бага, автор поймал живьём отдельно —
  // "при разбивании заморозки должен быть звук только один") — раньше не проверялась и
  // тут: замороженная цель поглощает удар целиком (dmgCard() уже играет свой icebreake.wav
  // и return'ится ДО HP-урона), но card_atack всё равно звучал следом поверх него.
  if(!target._foxyDodgedThisHit && !target._shieldBlockedThisHit && !target._frostBlockedThisHit && !willFear && !willBurn && !willFrost) playAttackSfx(att);
  // Math.max(0,target.hp) — если удар был лишним "оверкиллом" (hp ушло в минус), не даём
  // realDmgDealt раздуться сверх того, сколько у цели реально БЫЛО жизни (hpBefore).
  const realDmgDealt=Math.max(0, hpBefore-Math.max(0,target.hp));

  // Контрудар — deferDeath=true: HP атакующего может уйти в минус, но killCard() для него
  // пока НЕ вызывается — vampiric/Erase ниже ещё могут его спасти (см. шапку файла выше).
  if(!hasTag(att,'invisible') && !wasFearedBefore && !wasExhaustedBefore && !stealthFirstStrike && !wasFrozenBefore)
  dmgCard(att, targetCounterAtk, curK, false, true, undefined, undefined, target);

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
  // shadow_shield:N (2026-08-06, KEZARION, по прямому запросу автора — "зеркальная копия
  // Fire Shield, только тег/иконка другие") — ТОЧНО та же логика, что thorns выше (те же 3
  // гейт-проверки: полностью поглощённый/промазанный удар шипы бить не должны), просто
  // отдельный тег/иконка (ico_shadow.png) + свой лог-текст. Наступательная часть ("+1 урона
  // по фир-целям") НЕ отдельный тег — переиспользует уже существующий atk_vs_feared (тот же
  // паттерн, что у FAERON: thorns+atk_vs_burning — см. её комментарий/тултип).
  if(hasTag(target,'shadow_shield') && !target._shieldBlockedThisHit && !target._frostBlockedThisHit && !target._foxyDodgedThisHit){
    const shadowVal=getTagVal(target,'shadow_shield')||1;
    dmgCard(att,shadowVal,curK,true,true); // bypassArmor=true, deferDeath=true — тот же принцип, что thorns
    lg(`${target.name}'s Cloak of Shadows strikes ${att.name} for ${shadowVal}!`,'dmg');
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
  // DD CLEAVE (2026-07-29, "DD's Signature", по прямому запросу автора) — только обычная
  // атака, НЕ Bolt (в отличие от Market/Nana). Синхронно, без задержки/анимации.
  resolveDdCleave(att, curK, target, oppK, false);

  triggerAbilities(att,'on_attack',{target,realDmgDealt});
  if(target.hp<=0) triggerAbilities(att,'on_kill',{target});

  // Финальное решение о смерти атакующего — только теперь, после того как vampiric/Erase
  // уже успели его подлечить (через on_attack/on_kill выше). Сам killCard() ОТКЛАДЫВАЕМ до
  // конца функции, после activateCard() (2026-08-05, багфикс по прямому запросу автора —
  // "при смерти от контрудара карта перестала подниматься для удара"): раньше killCard()
  // срабатывал прямо тут, СРАЗУ убирая атакующего с поля/запуская полёт на кладбище — так
  // что к моменту activateCard(att.id) в конце функции элемента уже не было в DOM вообще
  // (или, в промежуточной версии с паузой смерти, .dying-hold конфликтовал по CSS-
  // специфичности с .activating и гасил cardActivate — тот же класс бага, что чинили у
  // .hit). Теперь атакующий сначала честно доигрывает СВОЙ "подъём для удара" (0.5с,
  // cardActivate) на живом элементе, и только потом реально умирает и улетает — это его
  // СОБСТВЕННАЯ анимация действия, она не должна обрываться тем, что этим же ударом его
  // достал контрудар.
  const attDies = att.hp<=0;

  // Trample (2026-07-17, MTG-style pierce rework; widened same day per author feedback):
  // originally only fired when pierce was forced onto a Provoke creature (its one carve-out
  // from Provoke being otherwise absolute — see getTargetableCards()/canAttackBase() above).
  // Author's call: it reads more consistent if pierce tramples on ANY enemy creature it
  // attacks, not just Provoke ones — a pierce creature choosing to hit a random 1-HP blocker
  // should still spill the rest into the base, same as it would against a taunt. So this is
  // now gated on attHasPierce alone, no Provoke check.
  // target.hp is deliberately left negative by dmgCard() on a lethal hit (see its comments)
  // specifically so this can read the overkill back off it — killCard() for the TARGET
  // already ran earlier, inside its own dmgCard() call, and doesn't touch the corpse's .hp
  // field, so it's still there. A still-shielded target (Solana Shield) leaves target.hp
  // untouched by the whole hit, so overflow is correctly 0 without any separate check.
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
  if(attDies){
    // 500мс — держать в синхроне с длительностью cardActivate (.card-small.activating,
    // styles.css). После неё атакующий реально уходит с поля — killCard() тут же запускает
    // обычный полёт на кладбище/сожжение в Войд (см. rZone(), render.js), теперь мгновенный
    // (без своей доп. паузы — см. её комментарий).
    setTimeout(()=>{
      killCard(att,curK);
      checkWin();
      render();
    }, 500);
  }
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

// Полёт снаряда (2026-07-30, bolt.gif, по прямому запросу автора — тот же приём, что у
// Nana/throwBananaFx() выше, с направленным поворотом вместо кручения, см. throwBoltFx()).
// Урон/лог/Market/Nana теперь ЖДУТ, пока снаряд визуально долетит (420мс, тот же тайминг,
// что throwBoltFx()) — до этого момента бить нечем, разряд ещё в полёте. Само состояние
// хода (exhausted/phase/sel/пульс поднятия) выставляется СРАЗУ при запуске — ход не
// блокируется на время полёта, ровно как у обычной атаки (только сама механика Bolt внутри
// стала отложенной, сам факт "карта подействовала" — нет).
function doBoltTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const bolt=findC(G.sel);
  if(!bolt){G.phase='action';G.sel=null;render();return;}
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  // Звук на ЗАПУСК (2026-07-30, по прямому запросу автора) — раньше тут стоял
  // 'card_spell_atack' (звук импакта/магии), теперь он переехал на момент приземления
  // (см. setTimeout ниже). На запуск — 'wind_card', тот же звук полёта, что уже
  // используют bounce-спеллы (GUST/REVERSE/UNSEEN, см. doSpellBounceTarget()/
  // abilities.js case 'bounce') — тематически подходит: "что-то унеслось", а не "что-то
  // ударило".
  playSfx('wind_card');
  const dmg=(bolt.squadParam&&bolt.squadParam.bolt)||getTagVal(bolt,'bolt')||1;
  const boltOwnerK=G.turn;
  const boltId=bolt.id, targetId=card.id;

  throwBoltFx(boltId, targetId, null);

  bolt.exhausted=true;
  G.phase='action';G.sel=null;
  // Баг-фикс (2026-07-19, автор нашёл живьём; порядок ИСПРАВЛЕН 2026-07-30, автор поймал
  // живьём второй раз): doAttack()/doUmbAsir() дают кастующей карте "пульс поднятия" через
  // activateCard() (@keyframes cardActivate, styles.css) ПОСЛЕ render() — render() у нас
  // синхронно перестраивает DOM (innerHTML), так что если позвать activateCard() ДО него,
  // класс 'activating' вешается на элемент, который тут же уничтожается перестройкой DOM —
  // класс стирается раньше, чем браузер успевает нарисовать хоть один кадр анимации, пульс
  // пропадает полностью. Раньше (до реворка Bolt на снаряд) activateCard() тут стоял ПОСЛЕ
  // render() и всё работало; при переписывании на throwBoltFx() порядок случайно
  // перепутался — restored к рабочему порядку.
  render();
  activateCard(boltId);

  setTimeout(()=>{
    const boltC=G[boltOwnerK].field.find(c=>c.id===boltId);
    const targetC=G[oppK].field.find(c=>c.id===targetId);
    if(!boltC || !targetC) return; // носитель или цель успели уйти с поля за время полёта — бить нечем
    // Звук на ПРИЗЕМЛЕНИЕ (2026-07-30, по прямому запросу автора) — "магический" звук,
    // который раньше играл сразу при нажатии кнопки, теперь звучит именно в момент
    // нанесения урона, когда снаряд визуально долетел до цели.
    // queueFieldFx(targetC.id,'BOLT!','fx-shard') убран (2026-08-06, по прямому запросу
    // автора) — текстовый плейсхолдер больше не нужен, у Bolt Умбасира уже есть свой
    // визуал снаряда (throwBoltFx() выше, bolt.gif).
    dmgCard(targetC,dmg,oppK,true,undefined,undefined,undefined,boltC);
    // Звук и лог — ПОСЛЕ dmgCard() и только если удар реально дошёл (2026-08-06, багфикс по
    // прямому запросу автора — "лишний звук срабатывает при промахе по Foxy Trick") —
    // раньше card_spell_atack игрался БЕЗУСЛОВНО до dmgCard(), так что при Foxy-уклонении/
    // Frost-поглощении/Solana Shield играли ДВА звука разом (свой + miss.wav/icebreake.wav/
    // absorb.wav изнутри dmgCard()). Тот же паттерн, что уже есть у лога чуть ниже
    // (MISSED!/ABSORB/Frost-shatter уже логируют/озвучивают себя сами внутри dmgCard()).
    if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
      playSfx('card_spell_atack');
      lg(`${boltC.name}: ${targetC.name} takes ${dmg} damage!`,'dmg');
    }
    // Game of Market (2026-07-28) — Umbasir-болтер тоже может нести этот тег (по прямому
    // запросу автора: "болт умбасира может нанести не 1 а 3 урона, либо -2 хп"). Тот же
    // хук, что в doAttack() — bypassArmor=true для бонус-урона здесь, т.к. сам Bolt уже
    // магический (bypassArmor=true чуть выше), бонус наследует ту же природу удара.
    resolveMarketEvent(boltC, boltOwnerK, targetC, oppK, true);
    // NANA (2026-07-29) — тот же хук, что у Market чуть выше: bypassArmor=true для
    // дамаг-ветки, т.к. сам Bolt уже магический, бонус наследует ту же природу удара.
    resolveNanaEvent(boltC, boltOwnerK, targetC, oppK, true);
    checkWin();
    render();
  },420);
}

// Mechird Shot (2026-08-04, Szarg<->Mechird archetype swap, по прямому запросу автора) —
// физический близнец doUmbBolt()/doBoltTarget() выше: та же логика 1-в-1 (point-damage
// активка, тот же полёт снаряда/тайминг 420мс), но:
//  · dmgCard(...,false) — bypassArmor=false, застревает в Броне (в отличие от Bolt)
//  · target-фильтр НЕ исключает Ward (Ward блокирует только bypassArmor=true урон)
//  · арт снаряда — bullet.gif вместо bolt.gif (свой throwShotFx(), тот же приём, что throwBoltFx())
//  · звук запуска — '8bit_gunloop_explosion' вместо 'wind_card'
//  · звук попадания — 'card_atack' (тот же, что у обычной атаки, playAttackSfx()), а НЕ
//    'card_spell_atack' (тот магический, что у Bolt) — Shot физический, не магический
function doMchShot(){
  const shot=findC(G.sel);
  if(!shot||!hasTag(shot,'shot')){lg('Select a Shot card first.','hint');return;}
  if(shot.exhausted||shot.frozen){lg(`${shot.name} already acted this turn.`,'dmg');return;}
  if(G.phase==='shotTarget'){G.phase='action';G.sel=null;render();return;} // повторный клик — отмена
  G.phase='shotTarget';
  lg(`${shot.name}: select an enemy creature to deal ${(shot.squadParam&&shot.squadParam.shot)||getTagVal(shot,'shot')||1} physical damage.`,'hint');
  render();
}

function doShotTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  const shot=findC(G.sel);
  if(!shot){G.phase='action';G.sel=null;render();return;}
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  playSfx('8bit_gunloop_explosion'); // звук на ЗАПУСК, тот же принцип что у Bolt (wind_card)
  const dmg=(shot.squadParam&&shot.squadParam.shot)||getTagVal(shot,'shot')||1;
  const shotOwnerK=G.turn;
  const shotId=shot.id, targetId=card.id;

  throwShotFx(shotId, targetId, null);

  shot.exhausted=true;
  G.phase='action';G.sel=null;
  render();
  activateCard(shotId);

  setTimeout(()=>{
    const shotC=G[shotOwnerK].field.find(c=>c.id===shotId);
    const targetC=G[oppK].field.find(c=>c.id===targetId);
    if(!shotC || !targetC) return; // носитель или цель успели уйти с поля за время полёта
    // queueFieldFx(targetC.id,'SHOT!','fx-shard') убран (2026-08-06, по прямому запросу
    // автора) — текстовый плейсхолдер больше не нужен, у выстрела Мехирда уже есть свой
    // визуал снаряда (throwShotFx()/bullet-fly выше).
    dmgCard(targetC,dmg,oppK,false,undefined,undefined,undefined,shotC); // bypassArmor=false — физический урон, режется Бронёй, проходит по Варду
    if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
      playAttackSfx(shotC); // звук ПОПАДАНИЯ — тот же, что у обычной атаки (card_atack)
      lg(`${shotC.name}: ${targetC.name} takes ${dmg} physical damage!`,'dmg');
    }
    // Game of Market (2026-08-05, багфикс по прямому запросу автора) — этот хук просто
    // забыли добавить при заводе Shot-механики (2026-08-04), в отличие от Nana чуть ниже,
    // которую починили в прошлой сессии. Тот же паттерн, что у Bolt (doBoltTarget()) и
    // обычной атаки (doAttack()): bonusBypassArmor=false, т.к. сам Shot физический
    // (bypassArmor=false, см. dmgCard() выше), бонус наследует ту же природу удара.
    resolveMarketEvent(shotC, shotOwnerK, targetC, oppK, false);
    // NANA (2026-08-05) — тот же хук, что у Bolt (doBoltTarget()) — Shot-носитель тоже может
    // нести тег nana. bonusBypassArmor=false, т.к. сам Shot физический (bypassArmor=false,
    // см. dmgCard() выше) — в отличие от Bolt (true). На практике сама функция всё равно
    // жёстко бьёт bypassArmor=false в дамаг-ветке банана независимо от этого параметра (см.
    // комментарий 2026-07-29 внутри resolveNanaEvent()), но передаём честное значение для
    // консистентности сигнатуры с остальными вызовами (doAttack()/doBoltTarget()).
    resolveNanaEvent(shotC, shotOwnerK, targetC, oppK, false);
    checkWin();
    render();
  },420);
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
  const atk=att.atk+(att.atkBonus||0)+rageAtkBonus(att)+(att.squadAtkBonus||0)+(att.tempAtkBonus||0)+(att.sagaAtkBonus||0);
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
  if(provoke){lg(`${provoke.name} has Tree Wall — attack it first!`,'hint');return;}
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
  // DD CLEAVE (2026-07-29) — тот же баг-фикс: прямой удар по базе тоже должен запускать
  // Cleave, см. комментарий у resolveDdCleave() выше.
  resolveDdCleave(att, G.turn, null, oppK, true);
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
            // Лог — ПОСЛЕ dmgCard() и только если реально не промах/не поглощение
            // (2026-07-29, тот же баг-фикс, что и у Nana — см. её комментарий): раньше
            // "takes 2 bonus dmg!" писался ДО вызова dmgCard(), поэтому при Foxy/Shield/
            // Frost на цели в лог противоречиво улетали ОБЕ строки подряд.
            dmgCard(tc,2,targetFaction,bonusBypassArmor,undefined,undefined,undefined,mc2);
            if(!tc._foxyDodgedThisHit && !tc._shieldBlockedThisHit && !tc._frostBlockedThisHit){
              lg(`${mc2.name}: Game of Market rolls UP — ${tc.name} takes 2 bonus dmg!`,'imp');
            }
          }
        }
      } else {
        // Тот же баг-фикс, что у UP-ветки выше — применяется и к самоурону: ЕСЛИ
        // носитель тега сам несёт Foxy/Shield/Frost (см. напр. TRAVELER #179 —
        // market+shield на одной карте), самонаказание может промахнуться/поглотиться
        // точно так же, как любой другой входящий удар (dmgCard() не делает исключений
        // для "урона самому себе") — лог должен отражать это, а не утверждать урон
        // безусловно.
        dmgCard(mc2,2,marketFaction,true);
        if(!mc2._foxyDodgedThisHit && !mc2._shieldBlockedThisHit && !mc2._frostBlockedThisHit){
          lg(`${mc2.name}: Game of Market rolls DOWN — takes 2 dmg!`,'imp');
        }
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
// раз). bonusBypassArmor — принимается для симметрии сигнатуры с resolveMarketEvent() и
// совместимости с вызовами из doAttack()/doBoltTarget(), но БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ внутри
// (2026-07-29, баг-фикс по прямому запросу автора — см. комментарий прямо у dmgCard() в
// дамаг-ветке ниже): банан всегда bypassArmor=false, независимо от природы исходного
// удара — так и Armor уважает (по прежнему решению автора), и Ward НИКОГДА не блокирует
// банан (Ward в dmgCard() блокирует только bypassArmor=true урон) — раньше на
// Bolt-триггере (bonusBypassArmor=true) банан внезапно становился "магическим" и Ward его
// блокировал целиком, хотя дизайн прямо требовал обратного.
//
// targetIsBase (2026-07-29, по прямому запросу автора — тот же баг-фикс, что у Market
// выше: прямой удар по базе через tryAttackBase() раньше вообще не звал этот резолвер) —
// когда удар шёл НЕ по существу, а напрямую по базе: hitTargetCard тогда null,
// hitTargetFaction — фракция самой атакуемой базы. У базы нет Foxy/Shield/Frost —
// гейтинг пропускается целиком. Дамаг-ветка в этом случае — ОБЫЧНЫЙ пул случайных
// вражеских существ (hitId=null ничего не исключает — атакованной картой была сама
// база, исключать нечего), с тем же фолбэком на базу, если существ на поле нет: если у
// противника есть хоть кто-то на поле, банан может улететь в него так же, как в любой
// другой момент; в базу — только если противник вообще пуст (уточнено автором
// 2026-07-29, отменяет более раннюю версию, где банан после удара по базе ВСЕГДА летел
// в базу — это было неверно). Хил-ветка не меняется вообще (союзник/своя база — как
// обычно).
//
// Все точки применения эффекта перепроверяют, что нужные карты ВСЁ ЕЩЁ на поле к моменту
// срабатывания (могли умереть за прошедшую паузу — контрудар, Thorns, второй Bolt и т.п.)
// — тот же принцип, что у Market: если носитель тега уже не на поле, розыгрыш не состоится
// вообще; если успела исчезнуть уже ВЫБРАННАЯ цель банана, эта конкретная порция эффекта
// молча пропускается (не бьёт и не лечит пустое место).
//
// Хил-ветки (2026-07-29, баг-фикс — автор поймал живьём: банан периодически "долетал" до
// уже полностью вылеченного союзника и визуально ничего не делал) — HP теперь меняется
// СРАЗУ, в момент выбора цели (тот же тик, что и сам выбор — самое свежее состояние,
// без временнОго зазора), а не 450мс спустя, когда банан долетает. Раньше между выбором
// цели и применением эффекта проходило 450мс полёта, и если за это время ДРУГОЙ
// одновременный эффект (например, вторая Nana/heal-карта, атаковавшая чуть раньше в той
// же серии атак хода) успевал долечить того же союзника — банан всё равно долетал, но
// хилить уже было нечего: 0 хила, без лога/цифры, визуально "впустую". Теперь гонки нет:
// решение "кого лечить" и само изменение HP происходят одновременно, полёт банана —
// чисто визуальная задержка перед логом/всплывающей цифрой, к тому моменту эффект уже
// гарантированно применён. Дамаг-веток это не касается — там применение сознательно
// сохранено НА МОМЕНТ приземления (см. существующие комментарии выше), это не то, на
// что жаловался автор.
//
// NANA_WINDUP_MS (2026-07-30, по прямому запросу автора — "занос руки" перед броском) —
// activateCard(nanaId) чуть ниже даёт карте ВТОРОЙ пульс подъёма (@keyframes cardActivate,
// 0.5с: пик высоты приходится на 40% = 200мс). Раньше throwBananaFx() стартовал В ТОТ ЖЕ
// момент, что и сам пульс, — банан улетал, пока карта только-только начала подниматься, к
// пику полёт был уже наполовину пройден: жест читался как "начала вставать и одновременно
// уже метнула", а не "занесла руку — и в пике броска кинула". NANA_WINDUP_MS — небольшая
// пауза МЕЖДУ стартом второго пульса и стартом самого броска (звук+вылет банана), чтобы
// вылет совпадал с пиком подъёма карты, а не с его началом.
const NANA_WINDUP_MS = 180;
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
      const before=target.hp;
      target.hp=Math.min(target.maxHp,target.hp+2); // применяется сразу — см. комментарий у функции выше
      const healed=target.hp-before;
      setTimeout(()=>{
        // Звук на ЗАПУСК (2026-07-30, по прямому запросу автора) — 'wind_card', тот же
        // звук полёта, что у bounce-спеллов (GUST/REVERSE/UNSEEN) — играет в момент, когда
        // банан физически появляется и стартует, а не когда долетает (см. звук удара ниже).
        playSfx('wind_card');
        throwBananaFx(nanaId, targetId, null);
        setTimeout(()=>{
          const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
          if(!nc2) return;
          if(healed>0){
            playSfx('heal');
            lg(`${nc2.name}: 🍌 heals ${target.name} for ${healed}!`,'imp');
            requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(targetId,`+${healed}`,'heal')));
          }
          checkWin();
          render();
        },450);
      }, NANA_WINDUP_MS);
    } else if(wantHeal){
      const before=G[nanaFaction].hp;
      G[nanaFaction].hp=Math.min(G[nanaFaction].maxHp,G[nanaFaction].hp+2); // применяется сразу, см. выше
      const healed=G[nanaFaction].hp-before;
      setTimeout(()=>{
        playSfx('wind_card');
        throwBananaFx(nanaId, null, nanaFaction);
        setTimeout(()=>{
          const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
          if(!nc2) return;
          if(healed>0){
            playSfx('heal');
            lg(`${nc2.name}: 🍌 heals the ${nanaFaction} base for ${healed}!`,'imp');
            flashBase(nanaFaction,'heal',healed);
          }
          checkWin();
          render();
        },450);
      }, NANA_WINDUP_MS);
    } else {
      // Невидимость/нераскрытый stealth (2026-07-30, по прямому запросу автора — тот же
      // пересмотр, что и у SCATTERSHOT/SHRAPNEL, см. abilities.js/case 'random_spread'):
      // случайный выбор ОДНОЙ жертвы — это targeting, просто рандом вместо игрока/ИИ
      // решает кого, значит Invisible/нераскрытый Stealth должны от него защищать так же,
      // как от прицельного спелла. Если пул опустеет (все враги невидимы/скрыты) —
      // enemies.length===0 ниже уже обрабатывается (банан просто не летит в этот раз).
      const enemies=G[oppFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.id!==hitId&&isSpellTargetable(c,G[oppFaction].field));
      if(enemies.length>0){
        const target=enemies[Math.floor(Math.random()*enemies.length)];
        const targetId=target.id;
        setTimeout(()=>{
          playSfx('wind_card');
          throwBananaFx(nanaId, targetId, null);
          setTimeout(()=>{
            const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
            const t=G[oppFaction].field.find(c=>c.id===targetId);
            if(!nc2 || !t) return;
            // bypassArmor ЖЁСТКО false, НЕ bonusBypassArmor (2026-07-29, баг-фикс по прямому
            // запросу автора) — банан физический и ДОЛЖЕН всегда игнорировать Ward
            // (dmgCard() блокирует Wardʼом только bypassArmor=true урон). Раньше сюда
            // протекал bonusBypassArmor, унаследованный от исходного удара (как у Market) —
            // и на Bolt-триггере (Umbasir #151, несёт и bolt:1, и nana сразу) банан внезапно
            // становился "магическим", и Ward начинал его блокировать целиком, хотя дизайн
            // прямо требовал "Ward банан не блокирует никогда, при любом раскладе".
            dmgCard(t,2,oppFaction,false,undefined,undefined,undefined,nc2);
            // Лог + звук — ПОСЛЕ dmgCard() и только если реально не промах/не поглощение
            // (2026-07-30, звук добавлен по прямому запросу автора — раньше банан бил по
            // существу вообще беззвучно; 'card_atack' — тот же звук, что у обычной атаки по
            // карте, см. playAttackSfx()). Раньше "hits X for 2 dmg!" писался ДО вызова
            // dmgCard(), поэтому при уклонении по Foxy (или полном поглощении Shield/Frost)
            // в лог противоречиво улетали ОБЕ строки подряд — наша "hits for 2 dmg!" и
            // следом своя у dmgCard() ("Foxy Trick makes the attack miss entirely!"/"Solana
            // Shield absorbs..."/"Frost absorbs..."). Те три случая уже логируют себя сами —
            // тут просто не дублируем поверх них (и не проигрываем звук удачного попадания
            // поверх их собственной звуковой/визуальной обратной связи).
            if(!t._foxyDodgedThisHit && !t._shieldBlockedThisHit && !t._frostBlockedThisHit){
              playSfx('card_atack');
              lg(`${nc2.name}: 🍌 hits ${t.name} for 2 dmg!`,'imp');
            }
            checkWin();
            render();
          },450);
        }, NANA_WINDUP_MS);
      } else {
        setTimeout(()=>{
          playSfx('wind_card');
          throwBananaFx(nanaId, null, oppFaction);
          setTimeout(()=>{
            const nc2=G[nanaFaction].field.find(c=>c.id===nanaId);
            if(!nc2) return;
            playSfx('base_atack'); // 2026-07-30, по прямому запросу автора — тот же звук, что у обычного удара по базе
            lg(`${nc2.name}: 🍌 hits the ${oppFaction} base for 2 dmg!`,'imp');
            G[oppFaction].hp=Math.max(0,G[oppFaction].hp-2);
            flashBase(oppFaction,'dmg',2);
            checkWin();
            render();
          },450);
        }, NANA_WINDUP_MS);
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

// throwBoltFx — арт bolt.gif (2026-07-30, Umbasir Bolt, по прямому запросу автора), летящий
// от карты-кастера к цели. Тот же приём, что throwBananaFx() чуть выше (position:fixed +
// left/top-transition между координатами двух realtime DOM rect'ов, тот же тайминг 420мс),
// но с ОДНИМ отличием: bolt.gif нарисован направленно (голова кометы вверх, хвост вниз,
// 2:1 — см. .bolt-fly в styles.css), поэтому вместо кручения (rotate 0→360, как у банана —
// банан визуально симметричен, ему всё равно, куда он "смотрит") спрайт поворачивается
// РОВНО ОДИН РАЗ, под угол между источником и целью, и держит этот угол весь полёт (не
// крутится по пути) — так голова всегда указывает в сторону движения, а хвост тянется
// назад, как у кометы.
//
// fromId=null (2026-07-30, по прямому запросу автора — те же снаряды у Bolt-спеллов
// JAB/STING/SPARK/MALICE/EXECUTE/CULL/JUDGMENT/DEATHBLOW/BREACH/RUPTURE, см.
// doSpellDmgTarget()/doSpellDmgTrampleTarget()/doSpellExecuteHalfTarget()) — у заклинаний,
// в отличие от Умбасира, нет своей карты на поле, откуда мог бы вылететь снаряд (спелл уже
// ушёл в войд к моменту резолва). По прямому запросу автора снаряд в этом случае вылетает
// из БАЗЫ игрока-кастера — fromBaseFaction обязателен вместо fromId, резолвится тем же
// _statsElIdForFaction(), что и toId=null у банана/у самого болта ниже.
//
// Математика поворота: angle = atan2(dy,dx) в градусах (dx,dy — вектор ОТ источника К
// цели в экранных координатах, где +y вниз) даёт направление "0°=вправо, 90°=вниз,
//180°/-180°=влево, -90°=вверх" — стандартный atan2. Дефолтная ориентация спрайта (голова
// вверх, до применения rotate) соответствует -90° в этой системе. Чтобы повернуть "вверх"
// точно на угол `angle`, нужно добавить +90° (rotate(angle+90deg) переводит вектор из -90°
// ровно в angle) — если МЫ (или следующий человек) поменяем арт на "голова вниз", это
// смещение надо будет заменить на angle-90 (или добавить rotate(180deg) поверх текущего).
// asset (2026-08-05, по прямому запросу автора) — опциональный 5-й параметр, путь к
// картинке снаряда. Раньше был жёстко захардкожен 'img/bolt.gif' для ЛЮБОГО вызова; теперь
// часть спеллов различает арт по силе/типу удара (SPARK/MALICE — bolt1.gif/bolt2.gif в
// зависимости от того, сработал ли бонус-урон от Мира/Артефакта; EXECUTE/CULL — bolt1.gif;
// JUDGMENT/DEATHBLOW — bolt1.gif на простой Bolt 1, bolt2.gif на добивающий выстрел;
// BREACH/RUPTURE — всегда bolt2.gif, см. их вызовы в doSpellDmgTarget()/
// doSpellExecuteHalfTarget()/doSpellDmgTrampleTarget()). Остальные вызовы (JAB/STING/
// VERDICT/DAMNATION/Umbasir Bolt) продолжают получать дефолт — их арт не трогали.
function throwBoltFx(fromId, toId, baseFaction, fromBaseFaction, asset){
  const fromEl = fromId ? document.querySelector(`.card-small[data-id="${fromId}"]`)
                        : document.getElementById(_statsElIdForFaction(fromBaseFaction));
  if(!fromEl) return;
  const toEl = toId ? document.querySelector(`.card-small[data-id="${toId}"]`)
                     : document.getElementById(_statsElIdForFaction(baseFaction));
  if(!toEl) return;
  const fromRect=fromEl.getBoundingClientRect();
  const toRect=toEl.getBoundingClientRect();
  const fromX=fromRect.left+fromRect.width/2, fromY=fromRect.top+fromRect.height/2;
  const toX=toRect.left+toRect.width/2, toY=toRect.top+toRect.height/2;
  const angle=Math.atan2(toY-fromY, toX-fromX)*180/Math.PI + 90;
  const bolt=document.createElement('img');
  bolt.className='bolt-fly';
  bolt.src=asset||'img/bolt.gif';
  bolt.alt='';
  bolt.style.left=fromX+'px';
  bolt.style.top=fromY+'px';
  bolt.style.transform=`translate(-50%,-50%) rotate(${angle}deg) scale(1)`;
  document.body.appendChild(bolt);
  void bolt.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  bolt.style.transition='left 420ms ease-in, top 420ms ease-in, transform 420ms ease-in';
  bolt.style.left=toX+'px';
  bolt.style.top=toY+'px';
  // Поворот НЕ меняется между стартом и финишем (angle тот же) — только позиция и лёгкий
  // "удар" через scale, чтобы приземление читалось. Прямая линия полёта → угол постоянный
  // весь путь, кометы не нужно доворачивать на лету.
  bolt.style.transform=`translate(-50%,-50%) rotate(${angle}deg) scale(1.15)`;
  setTimeout(()=>{ if(bolt.parentElement) bolt.remove(); },450);
}

// Mechird Shot (2026-08-04) — точный клон throwBoltFx() выше, отличается только классом/
// артом снаряда (.bullet-fly / bullet.gif вместо .bolt-fly / bolt.gif, см. css/styles.css —
// bullet-fly в 2 раза уже bolt-fly). Тайминг/угол/приземление — та же логика 1-в-1.
function throwShotFx(fromId, toId, baseFaction, fromBaseFaction){
  const fromEl = fromId ? document.querySelector(`.card-small[data-id="${fromId}"]`)
                        : document.getElementById(_statsElIdForFaction(fromBaseFaction));
  if(!fromEl) return;
  const toEl = toId ? document.querySelector(`.card-small[data-id="${toId}"]`)
                     : document.getElementById(_statsElIdForFaction(baseFaction));
  if(!toEl) return;
  const fromRect=fromEl.getBoundingClientRect();
  const toRect=toEl.getBoundingClientRect();
  const fromX=fromRect.left+fromRect.width/2, fromY=fromRect.top+fromRect.height/2;
  const toX=toRect.left+toRect.width/2, toY=toRect.top+toRect.height/2;
  const angle=Math.atan2(toY-fromY, toX-fromX)*180/Math.PI + 90;
  const bullet=document.createElement('img');
  bullet.className='bullet-fly';
  bullet.src='img/bullet.gif';
  bullet.alt='';
  bullet.style.left=fromX+'px';
  bullet.style.top=fromY+'px';
  bullet.style.transform=`translate(-50%,-50%) rotate(${angle}deg) scale(1)`;
  document.body.appendChild(bullet);
  void bullet.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  bullet.style.transition='left 420ms ease-in, top 420ms ease-in, transform 420ms ease-in';
  bullet.style.left=toX+'px';
  bullet.style.top=toY+'px';
  bullet.style.transform=`translate(-50%,-50%) rotate(${angle}deg) scale(1.15)`;
  setTimeout(()=>{ if(bullet.parentElement) bullet.remove(); },450);
}

// throwIconFx — снаряд-иконка для death-триггеров с случайной целью (2026-08-05, по
// прямому запросу автора — "как болт вылетает у Thunder Storm, только для Бамбука/Оптика/
// Схемы"). Тот же приём position:fixed + left/top-transition, что у throwBoltFx()/
// throwShotFx() выше, но БЕЗ поворота — иконки статов (attack.png/heart.png/armor.png —
// ИМЕННО тот стат, который реально получит цель, а не иконка самого трейта/тега, см.
// багфикс 2026-08-05: раньше тут летели ico_bambo/ico_optic/ico_scheme — иконки способности
// автор попросил заменить на иконки конкретного бонуса) не направленные "кометы", как
// bolt.gif/bullet.gif, разворачивать их под угол незачем. Размер — тот же класс
// .bullet-fly, что у выстрела Мехирда (по прямому запросу автора: "размером как у
// bullet.gif ассета"). Без звука на вылет (только на приземление — его играет вызывающий
// код внутри своего setTimeout, ПОСЛЕ того как этот полёт завершится, см. death_heal/
// death_armor/death_atk в killCard() ниже).
function throwIconFx(fromId, toId, iconSrc){
  const fromEl = document.querySelector(`.card-small[data-id="${fromId}"]`);
  if(!fromEl) return;
  const toEl = document.querySelector(`.card-small[data-id="${toId}"]`);
  if(!toEl) return;
  const fromRect=fromEl.getBoundingClientRect();
  const toRect=toEl.getBoundingClientRect();
  const fromX=fromRect.left+fromRect.width/2, fromY=fromRect.top+fromRect.height/2;
  const toX=toRect.left+toRect.width/2, toY=toRect.top+toRect.height/2;
  const icon=document.createElement('img');
  icon.className='bullet-fly';
  icon.src=iconSrc;
  icon.alt='';
  icon.style.left=fromX+'px';
  icon.style.top=fromY+'px';
  icon.style.transform='translate(-50%,-50%) scale(1)';
  document.body.appendChild(icon);
  void icon.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  icon.style.transition='left 420ms ease-in, top 420ms ease-in, transform 420ms ease-in';
  icon.style.left=toX+'px';
  icon.style.top=toY+'px';
  icon.style.transform='translate(-50%,-50%) scale(1.15)';
  setTimeout(()=>{ if(icon.parentElement) icon.remove(); },450);
}

// DD Cleave (2026-07-29, "DD's Signature", ультраредкий Mood-трейт, ico_dd.png, по
// прямому запросу автора) — при ОБЫЧНОЙ атаке (НЕ Bolt — по прямому запросу автора,
// в отличие от Market/Nana) носитель тега `dd` наносит 1 физический урон (bypassArmor=
// false, уважает Armor цели, как сама атака) ВСЕМ ОСТАЛЬНЫМ картам противника на поле —
// кроме той, что была только что атакована ею самой основным ударом (эта уже получила
// свой урон отдельно, от самого доAttack()/dmgCard() выше). Никакой случайности (в
// отличие от Market/Nana) — срабатывает каждый раз безусловно, если основной удар
// долетел. Резолвится СИНХРОННО, без задержки/анимации (по прямому запросу автора, в
// отличие от отложенных Market/Nana) — сразу в тот же тик, что и сам удар.
//
// Гейтинг — тот же принцип, что у Market/Nana (по прямому запросу автора): если этот
// конкретный удар был целиком промазан Foxy Trick или поглощён активным Solana
// Shield/заморозкой цели — Cleave тоже не срабатывает (удар физически не долетел,
// раскидывать нечем).
//
// targetIsBase — тот же баг-фикс, что у Market/Nana: прямой удар по базе
// (tryAttackBase()) тоже должен запускать Cleave. hitTargetCard тогда null (гейтинг
// пропускается — у базы нет Foxy/Shield/Frost), hitId=null ничего не исключает из пула
// (атакованной "картой" была сама база, исключать среди существ нечего) — Cleave просто
// бьёт вообще ВСЕХ существ противника на 1.
function resolveDdCleave(ddCard, ddFaction, hitTargetCard, hitTargetFaction, targetIsBase){
  if(!hasTag(ddCard,'dd')) return;
  if(!targetIsBase && (hitTargetCard._foxyDodgedThisHit || hitTargetCard._shieldBlockedThisHit || hitTargetCard._frostBlockedThisHit)) return;
  const oppFaction=ddFaction==='tea'?'jeet':'tea';
  const hitId=targetIsBase?null:hitTargetCard.id;
  const others=G[oppFaction].field.filter(c=>c.id!==hitId);
  if(others.length===0) return;
  lg(`${ddCard.name}: DD Cleave — 1 dmg to all other enemies!`,'imp');
  others.forEach(c=>dmgCard(c,1,oppFaction,false,undefined,undefined,undefined,ddCard));
}

// avenge_foxy_miss (2026-08-06, по прямому запросу автора — второй Jeet-уник, синергия с
// Foxy Trick) — "пока эта карта на поле, при каждом промахе (уклонении) Foxy Trick
// противник получает 1 урон по базе". Централизованный хук: Foxy-бросок кидается в 6
// РАЗНЫХ независимых местах по кодовой базе (dmgCard() — обычный урон; doSpellBurnTarget/
// doSpellFearTarget/doSpellProvokeBreakTarget — точечные дебафф-спеллы; fear_all/burn_all
// в abilities.js — массовые), и раньше не было ни одной общей точки для "что-то произошло
// на факте промаха" — каждое место просто ставило свой queueFieldFx('MISSED!') отдельно.
// Эта функция вызывается ИЗ КАЖДОГО из этих 6 мест сразу после подтверждённого промаха.
// dodgedCard — та самая Foxy-карта, что увернулась; ищем уника с avenge_foxy_miss на ЕЁ ЖЕ
// фракции (уник и Foxy-карта — союзники), бьём по базе ПРОТИВНИКА (той стороны, что
// пыталась атаковать/дебаффнуть и промазала).
// avenge_foxy_miss (2026-08-06, ПЕРЕСМОТРЕНО по прямому запросу автора — исходная версия
// била по БАЗЕ противника, автор уточнил: должна бить по САМОЙ КАРТЕ-АТАКУЮЩЕМУ, той что
// промазала. "Thug Asteanaut" — второй Jeet-уник, синергия с Foxy Trick: "пока эта карта на
// поле, промазавший по Foxy-цели противник получает 1 урон". Требует attackerCard —
// конкретную карту-источник урона (атака/контратака/Bolt/Shot/Nana-банан/DD Cleave/AOE-
// поджог-при-входе — ВСЁ, что реально исходит от существа на поле). НЕ применяется к
// спеллам, разыгранным из руки (CINDER/DREAD/EXPOSE-UNMASK/WILDFIRE/NIGHTMARE) — по прямому
// решению автора: спелл не карта-существо, бить там физически нечего, attackerCard для этих
// путей просто не передаётся (undefined), функция тихо не делает ничего.
// bypassArmor=true — тот же принцип, что thorns/shadow_shield (урон-в-ответ), броня
// атакующего не должна спасать его от собственного промаха. deferDeath=true — тот же
// принцип, что контрудар/thorns чуть ниже по файлу: резолвится независимо от исхода
// основной атаки, реальная смерть атакующего (если "мстительный" урон её вызовет)
// разрешится один раз в общем потоке doAttack(), не тут же на месте.
function _triggerFoxyAvenge(dodgedCard, attackerCard){
  if(typeof _flyDebugLog==='function') _flyDebugLog('FOXY-AVENGE called', dodgedCard?dodgedCard.id:'?', {dodgedCardF:dodgedCard?dodgedCard.f:'?', hasAttackerCard:!!attackerCard, attackerCardId:attackerCard?attackerCard.id:null, attackerCardF:attackerCard?attackerCard.f:null});
  if(!attackerCard) return;
  const ownerF=dodgedCard.f;
  const avenger=G[ownerF].field.find(c=>!c.spell&&!c.world&&!c.artifact&&hasTag(c,'avenge_foxy_miss'));
  if(typeof _flyDebugLog==='function') _flyDebugLog('FOXY-AVENGE avenger search', dodgedCard.id, {ownerF, avengerFound:!!avenger, avengerId:avenger?avenger.id:null, fieldOnOwnerF:G[ownerF].field.map(c=>({id:c.id,name:c.name,tags:c.tags}))});
  if(!avenger) return;
  const attackerF=attackerCard.f;
  // bypassArmor=false (2026-08-06, по прямому запросу автора — "это физический урон, броня
  // должна принимать его первой, Ward не должен блокировать") — было true (магический
  // стиль, игнорирует Armor, блокируется Ward). Теперь ровно наоборот: Armor поглощает как
  // обычно, Ward НЕ блокирует (dmgCard() блокирует Ward'ом только bypassArmor=true урон —
  // тот же принцип, что уже у Shot/банана/DD Cleave в этом файле). Solana Shield всё ещё
  // может поглотить целиком — это не зависит от bypassArmor, щит блокирует любой урон.
  // Урон 1→2 (2026-08-08, по прямому запросу автора — "усилить наказание за промах")
  const hpBeforeAvenge=attackerCard.hp;
  dmgCard(attackerCard,2,attackerF,false,true);
  // Звук + лог — ПОСЛЕ dmgCard() и только на подтверждённом попадании (не промах/не щит/
  // не заморозка У ATTACKERCARD — это ОН тут получатель урона, не dodgedCard), тот же
  // паттерн, что уже применяют Shot/Bolt/Nana/DD Cleave в этом файле (2026-08-06, по
  // прямому запросу автора — "звук как при обычной атаке" + "в логе чтоб писалось, что
  // Астронавт именно задамажил карту").
  if(!attackerCard._foxyDodgedThisHit && !attackerCard._shieldBlockedThisHit && !attackerCard._frostBlockedThisHit){
    playAttackSfx(avenger);
    lg(`${avenger.name} damages ${attackerCard.name} for 2!`,'dmg');
  }
  // Визуальный "подъём" (2026-08-06, по прямому запросу автора — "чтобы Thug Asteanaut
  // приподнимался в этот момент, как будто это он ранит карту") — тот же activateCard()
  // пульс, что уже используют атака/Bolt/Shot при действии. Отложено через
  // requestAnimationFrame — эта функция срабатывает ГЛУБОКО внутри dmgCard(), ДО render()
  // этого хода; звать activateCard() синхронно здесь означало бы повесить класс на узел,
  // который вот-вот перестроит ближайший render() — класс стёрся бы раньше, чем браузер
  // успел бы нарисовать хоть один кадр (тот же класс бага, что уже описан у
  // doBoltTarget()/doShotTarget() в этом файле).
  const avengerId=avenger.id;
  requestAnimationFrame(()=>requestAnimationFrame(()=>activateCard(avengerId)));
  // БАГФИКС (2026-08-08, найдено по прямому запросу автора — "наказывая за промах двумя
  // урона, этот дамаг не может быть смертельным, там не внедрена проверка на смерть") —
  // dmgCard() тут вызывается с deferDeath=true (та же семантика, что у контрудара в
  // doAttack(): HP может уйти в минус, но killCard() ВЫЗЫВАЮЩИЙ КОД обязан резолвить сам,
  // не dmgCard() автоматически — см. её комментарий у lethal&&!deferDeath). Раньше эта
  // функция НИКОГДА не резолвила отложенную смерть — карта застревала на поле с
  // отрицательным HP навсегда (видно на скриншотах автора: "TRAVELER #420 -1/4 HP",
  // "TRAVELER #60 -1/6 HP"). Тот же паттерн, что уже использует doAttack() для контрудара
  // (500мс — синхронно с длительностью cardActivate, .card-small.activating, styles.css —
  // тот самый пульс activateCard() чуть выше): если урон оказался летальным, резолвим
  // смерть с той же задержкой, что и остальные подобные "побочные" смерти в игре.
  if(hpBeforeAvenge>0 && attackerCard.hp<=0){
    setTimeout(()=>{
      if(G[attackerF].field.includes(attackerCard)) killCard(attackerCard,attackerF);
      checkWin();
      render();
    }, 500);
  }
}

function dmgCard(card,dmg,faction,bypassArmor,deferDeath,forceLabel,bypassFrost,attackerCard){
  // Сбрасываем ПЕРЕД любым ранним return (включая dmg<=0 ниже) — иначе устаревший true с
  // прошлого удара мог бы утечь в проверку fear/burn/taunt_break этого хода (см. ниже).
  card._shieldBlockedThisHit=false;
  card._foxyDodgedThisHit=false;
  card._frostBlockedThisHit=false; // БАГФИКС (2026-07-27, автор поймал живьём) — раньше этот флаг НИКОГДА не сбрасывался здесь (только выставлялся в true ниже), поэтому один раз замороженный удар мог навсегда "заглушить" debuff-эффекты на ВСЕХ последующих, никак не связанных ударах по этой же карте
  if(dmg<=0)return;
  // MonoMEK Метка (2026-07-30) — +1 к ЛЮБОМУ входящему урону из ЛЮБОГО источника, пока
  // card.mekMarked. Единственная choke-point точка для этого эффекта (в отличие от Foxy/
  // Frost/Shield ниже, которые бинарные "промах/абсорб всё", Метка — простой числовой
  // модификатор dmg ДО брони, поэтому броня по-прежнему поглощает свой номинал как обычно,
  // а Метка "пробивает" ровно то, что бронёй не покрыто — см. обсуждение с автором,
  // сессия 2026-07-30). Стоит ПОСЛЕ раннего return на dmg<=0 — Метка не создаёт урон из
  // ничего, только усиливает уже существующий удар.
  if(card.mekMarked) dmg+=1;
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
  // там бросок кидается ЗАНОВО тем же способом, отдельно). Звук miss.wav добавлен
  // 2026-08-05 (по прямому запросу автора — раньше был только визуал, queueFieldFx 'MISSED!').
  if(hasTag(card,'foxy') && Math.random()<0.5){
    card._foxyDodgedThisHit=true;
    playSfx('miss'); // (2026-08-05, по прямому запросу автора — раньше звука не было вообще)
    _triggerFoxyAvenge(card,attackerCard);
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
    playSfx('icebreake'); // (2026-08-04, по прямому запросу автора)
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
    // absorb.wav (2026-08-05, по прямому запросу автора) — ЕДИНСТВЕННЫЙ звук на этом ударе.
    // Ничего дополнительно глушить не пришлось: playAttackSfx()/'card_spell_atack' и
    // остальные "звук попадания" в doAttack()/doBoltTarget()/doShotTarget()/AOE/Shard уже
    // все до одного проверяют `_shieldBlockedThisHit` (см. грep по флагу выше) ДО того, как
    // сыграть свой звук — раз флаг выставлен здесь синхронно раньше их проверки, они сами
    // молча не сработают, отдельно ничего гасить не нужно.
    playSfx('absorb');
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
  // Шейк на летальном ударе УБРАН ОБРАТНО (2026-08-05, по прямому запросу автора — "как и
  // раньше без шейка она просто улетела сразу", тот же откат, что и у DEATH_ANIM_DELAY_MS
  // в rZone()/render.js, см. её комментарий: с паузой между уроном и полётом карта "слишком
  // долго умирает"). Раньше (см. историю этого файла) шейк ненадолго вернули СПЕЦИАЛЬНО под
  // эту паузу — без неё смысла в нём снова нет: смерть теперь опять мгновенная, шейк и fade
  // играли бы поверх друг друга.
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
      lg(`${card.name}: Remember Everything — fully restores and stays on the battleground (all buffs and debuffs reset)!`,'hl');
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
  // Saga (2026-08-06, по прямому запросу автора) — умирая, карта теряет весь накопленный
  // прогресс, тот же принцип "смерть стирает временные накопления", что у squad-бонусов
  // выше — Saga не переживает смерть/воскрешение, начинается заново с sagaStage=0, если
  // карта снова окажется на поле (revive/raise/bounce+replay).
  card.sagaStage=0;
  card.sagaArmorBonus=0;
  card.sagaAtkBonus=0;
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
  // raisedByPhlegmor (2026-08-06, по прямому запросу автора) — тот же принцип, что incarnUsed
  // чуть выше: карта, однажды раскопанная Плегмором (см. abilities.js, case 'raise'), при
  // ЛЮБОЙ следующей смерти уходит СРАЗУ в Войд, минуя кладбище — не даёт бесконечно гонять
  // одну и ту же карту по кругу raise→смерть→raise. Не завязано на то, жив ли сам Плегмор.
  let _phlegmorSpent=false;
  if(!toVoid && card.raisedByPhlegmor){
    toVoid=true;
    _phlegmorSpent=true;
  }
  if(toVoid){
    card.voided=true;
    G[faction].void.push(card);
    if(_incarnSpent){
      lg(`${card.name}: Incarnation already spent — exiled for good.`,'die');
    } else if(_phlegmorSpent){
      lg(`${card.name}: raised by Phlegmor once already — exiled for good.`,'die');
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
        // Снаряд-иконка (2026-08-05, по прямому запросу автора — "как болт у Thunder Storm")
        // — ico_bambo.png летит от умирающей карты к цели, размером как bullet.gif, БЕЗ
        // звука на вылет (throwIconFx() ниже намеренно его не играет). Сам эффект (хил +
        // звук + текст) теперь резолвится ТОЛЬКО по приземлении, тем же 420мс таймингом,
        // что у Thunder Storm — см. её комментарий ниже за подробным разбором тайминга DOM.
        const dyingId=card.id, dyingName=card.name, healTargetId=healTarget.id, healFaction=card.f;
        throwIconFx(dyingId, healTargetId, 'img/heart.png');
        setTimeout(()=>{
          const t=G[healFaction].field.find(c=>c.id===healTargetId);
          if(!t) return; // цель успела уйти с поля за время полёта — лечить некого
          t.hp=Math.min(t.maxHp,t.hp+bambooHeal);
          playSfx('heal');
          lg(`${dyingName}: dies — heals ${t.name} +${bambooHeal} HP → ${t.hp}/${t.maxHp}.`,'hl');
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(healTargetId,`+${bambooHeal}`,'heal')));
          render();
        },420);
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
  // см. TAG_ICONS/TAG_TOOLTIPS ниже, теперь ico_cloud.png). Живые карты: #250 (tea,
  // death_bolt:4) и #481 (jeet, death_bolt:4) — поймал себя на устаревшем комментарии
  // здесь (2026-07-30, раньше писал "ещё не назначен ни на одного traveler" — неправда,
  // не сверился с data.js напрямую перед тем как написать это).
  //
  // Снаряд (2026-07-30, по прямому запросу автора — "тот же ассет, та же скорость, тот же
  // звук", что у остальных Bolt-эффектов этой сессии) — throwBoltFx(dyingId, targetId,...)
  // летит ПРЯМО ОТ УМИРАЮЩЕЙ КАРТЫ (та же карточная, а не базовая, версия функции, что у
  // Bolt Умбасира) к случайно выбранной цели. Field-массив уже почищен от этой карты чуть
  // выше по функции (см. самое начало killCard()), НО render() ещё не звался — DOM-элемент
  // с её последней отрисованной позицией физически ещё на месте, throwBoltFx() успевает
  // его найти и взять координаты ДО того, как следующий render() сотрёт/пересоберёт узел.
  // wind_card на запуск, card_spell_atack + сам урон — на приземление (420мс), тот же
  // тайминг, что у Bolt-спеллов (doSpellDmgTarget() и т.д., см. её комментарий).
  if(!card.spell&&!card.world&&!card.artifact){
    const stormBolt=getTagVal(card,'death_bolt');
    if(stormBolt){
      const enemyFaction=card.f==='tea'?'jeet':'tea';
      // Невидимость/нераскрытый stealth (2026-07-30, по прямому запросу автора — третье
      // место с тем же пробелом, что уже чинили у SCATTERSHOT/SHRAPNEL и Nana: случайный
      // выбор ОДНОЙ жертвы — это targeting, значит должен уважать ту же targetability, что
      // и обычный таргетируемый спелл). Этот случай не всплыл вместе с теми двумя, потому
      // что срабатывает только при смерти носителя тега, а не на атаке/болте.
      const enemyField=G[enemyFaction].field.filter(c=>isSpellTargetable(c,G[enemyFaction].field));
      if(enemyField.length>0){
        const boltTarget=enemyField[Math.floor(Math.random()*enemyField.length)];
        const dyingId=card.id, dyingName=card.name, targetId=boltTarget.id;
        playSfx('wind_card');
        throwBoltFx(dyingId, targetId, null);
        setTimeout(()=>{
          const t=G[enemyFaction].field.find(c=>c.id===targetId);
          if(!t) return; // цель успела уйти с поля за время полёта — бить нечем
          // queueFieldFx(t.id,'HIT!','fx-spell-dmg') убран (2026-08-06, по прямому запросу
          // автора) — текстовый плейсхолдер больше не нужен, Thunder Storm уже кидает
          // настоящий снаряд (throwBoltFx() выше).
          dmgCard(t,stormBolt,enemyFaction,true);
          // Звук и лог — ПОСЛЕ dmgCard() и только если удар реально дошёл (2026-08-06,
          // тот же класс бага, что у Bolt/spell_dmg_target — см. их комментарии, "лишний
          // звук срабатывает при промахе по Foxy Trick"): раньше card_spell_atack играл
          // БЕЗУСЛОВНО до dmgCard().
          if(!t._foxyDodgedThisHit && !t._shieldBlockedThisHit && !t._frostBlockedThisHit){
            playSfx('card_spell_atack');
            lg(`${dyingName}: dies — Bolt ${stormBolt} to ${t.name}!`,'imp');
          }
          checkWin();
          render();
        },420);
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
        // Снаряд-иконка (2026-08-05, тот же приём/причина, что у death_heal выше) —
        // ico_scheme.png летит к цели, эффект (Броня + звук + текст) резолвится по
        // приземлении, 420мс.
        const dyingId=card.id, dyingName=card.name, armorTargetId=armorTarget.id, armorFaction=card.f;
        throwIconFx(dyingId, armorTargetId, 'img/armor.png');
        setTimeout(()=>{
          const t=G[armorFaction].field.find(c=>c.id===armorTargetId);
          if(!t) return; // цель успела уйти с поля за время полёта — некому давать Броню
          t.spellArmorBonus=(t.spellArmorBonus||0)+schemeArmor;
          recalcArmor(armorFaction);
          playSfx('baf');
          lg(`${dyingName}: dies — ${t.name} +${schemeArmor} Armor.`,'hl');
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(armorTargetId,'+Armor','armoraura')));
          render();
        },420);
      }
    }
  }

  // OPTIC DOPE-style death_atk:N (2026-07-29, ico_optic.png, по прямому запросу автора) —
  // тот же self-only паттерн, что у death_heal/death_bolt/death_armor выше: тег читается
  // прямо с УМИРАЮЩЕЙ card. На СВОЮ смерть даёт N ATK СЛУЧАЙНОМУ союзнику (любому, не
  // обязательно раненому — как у death_armor, HP цели тут ни при чём).
  //
  // ВАЖНЫЙ нюанс (ради которого стоило спросить "а точно всё так просто?"): бонус ЖИВЁТ в
  // `tempAtkBonus`, а НЕ в `atkBonus`/`squadAtkBonus`, хотя те и выглядят более "напрямую
  // относящимися к ATK". Причина — `atkBonus` целиком принадлежит ауре соседей
  // (aura:atk — applyAuras() обнуляет и пересчитывает его С НУЛЯ при КАЖДОМ пересчёте
  // аур, см. её комментарии), а `squadAtkBonus` — сквад-бонусу архетипа (тоже
  // пересчитывается с нуля). Присвой мы туда — бонус исчезал бы почти сразу же, при
  // первом же пересчёте ауры/сквада от вообще не связанного события (другая карта вышла
  // на поле, кто-то ещё умер и т.п.) — тот же баг, что уже словил автор на
  // doSpellBuffTarget()/ARCHIVE ("Dedicated field — NOT atkBonus... reusing it here made
  // the trick's bonus vanish the instant ANY other card was played", см. её комментарий
  // выше). `tempAtkBonus` — несмотря на обманчивое имя — это и есть тот самый "живёт,
  // пока карта не умрёт/не возродится/не будет рассеяна" аккумулятор (endTurn() его
  // намеренно НЕ трогает, см. её комментарий), и он уже прошит ВЕЗДЕ, где считается
  // эффективный ATK: doAttack()/tryAttackBase() (атака и контрудар), render.js (обе
  // карточные вьюхи), ai.js (оценка позиции), state.js (дебаг-дамп), dispel-эффекты
  // (снимают его вместе с atkBonus как единый "buff"). Заведи мы вместо этого НОВОЕ поле
  // (напр. deathAtkBonus) — пришлось бы вручную продублировать его в КАЖДОМ из этих мест,
  // и любое пропущенное стало бы тихим, малозаметным багом (бонус либо не считался бы в
  // бою, либо не отражался бы в UI/ИИ-оценке). Поэтому переиспользуем tempAtkBonus.
  if(!card.spell&&!card.world&&!card.artifact){
    const opticAtk=getTagVal(card,'death_atk');
    if(opticAtk){
      const allyField=G[card.f].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
      if(allyField.length>0){
        const atkTarget=allyField[Math.floor(Math.random()*allyField.length)];
        // Снаряд-иконка (2026-08-05, тот же приём/причина, что у death_heal/death_armor
        // выше) — ico_optic.png летит к цели, эффект (ATK + звук + текст) резолвится по
        // приземлении, 420мс.
        const dyingId=card.id, dyingName=card.name, atkTargetId=atkTarget.id, atkFaction=card.f;
        throwIconFx(dyingId, atkTargetId, 'img/attack.png');
        setTimeout(()=>{
          const t=G[atkFaction].field.find(c=>c.id===atkTargetId);
          if(!t) return; // цель успела уйти с поля за время полёта — некому давать ATK
          t.tempAtkBonus=(t.tempAtkBonus||0)+opticAtk;
          playSfx('baf');
          lg(`${dyingName}: dies — ${t.name} +${opticAtk} ATK.`,'hl');
          requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(atkTargetId,`+${opticAtk}`,'atk')));
          render();
        },420);
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

  // alone_samurai (LAST KIIRO, 2026-08-06, по прямому запросу автора) — +2 ATK, ПОКА на
  // поле своей фракции нет ни одного ДРУГОГО существа. Переиспользует atkBonus — то же
  // поле, что уже используется для "внешних" аур-от-соседа выше (aura:atk) — а НЕ заводит
  // отдельное поле, потому что atkBonus уже единственное подключено ко ВСЕМ формулам
  // боевого урона в игре (doAttack()/контратака здесь же, effAtk()/effAtkVsTarget() в
  // ai.js, resetC()/killCard() сброс) — новое отдельное поле пришлось бы вручную
  // прописывать в каждой из этих формул, с риском забыть одну и получить рассинхрон
  // между тем, что видит человек и что считает ИИ. Пересчитывается с нуля КАЖДЫЙ вызов
  // applyAuras() (условие живое — исчезает в момент, когда на поле появляется хоть один
  // другой союзник, и включается обратно, если поле снова опустело) — та же механика
  // "не одноразовый эффект, а постоянно живой пересчёт", что у самих aura:atk выше.
  cur.field.forEach(a=>{
    if(a.spell||a.world||a.artifact) return;
    if(!hasTag(a,'alone_samurai')) return;
    const others=cur.field.filter(c=>c.id!==a.id&&!c.spell&&!c.world&&!c.artifact);
    const wasActive=!!a._aloneSamuraiWasActive;
    const isActive=others.length===0;
    if(isActive){
      a.atkBonus=(a.atkBonus||0)+2;
      // "Stand Alone" (2026-08-06, по прямому запросу автора) — всплывающий текст, только
      // на ПЕРЕХОДЕ неактивен→активен (не на каждом вызове applyAuras(), который срабатывает
      // очень часто и без этого флага спамил бы текст даже когда состояние не менялось
      // вообще). field-fx-popup стиль (позиция/размер как у MARKET UP), белый цвет — см.
      // .fx-sagaup, css/styles.css.
      if(!wasActive){
        queueFieldFx(a.id,'Stand Alone','fx-sagaup');
      }
    }
    a._aloneSamuraiWasActive=isActive;
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

  // BAN'KAI / COPE GUARDIAN (2026-08-06, по прямому запросу автора — БАГФИКС того же дня:
  // первая версия жила в СЕРЕДИНЕ этой функции и переиспользовала baseMaxHp — тот же кусок
  // состояния, что чуть выше безусловно обнуляет "if(!auraSources.some(aura:maxhp))
  // {baseMaxHp=null}", если на поле нет классической aura:maxhp-карты. Моя правка
  // срабатывала раньше в файле, тот сброс — позже, в ТОМ ЖЕ вызове applyAuras() — бонус
  // выставлялся и тут же стирался несуществующей на первый взгляд связью. Теперь: (1) стоит
  // в самом конце функции, ПОСЛЕ вообще всех остальных пересчётов maxHp; (2) использует
  // СВОЁ отдельное поле synergyMaxHpBonus, никем больше не тронутое — сначала явно снимаем
  // СВОЙ прошлый вклад с maxHp/hp, потом считаем заново и применяем целиком).
  cur.field.forEach(a=>{
    if(a.spell||a.world||a.artifact) return;
    const prevBonus=a.synergyMaxHpBonus||0;
    if(prevBonus){
      a.maxHp-=prevBonus;
      a.hp=Math.min(a.hp,a.maxHp);
      a.synergyMaxHpBonus=0;
    }
    let countTag=null;
    if(hasTag(a,'synergy_saga_count')) countTag='saga';
    else if(hasTag(a,'synergy_foxy_count')) countTag='foxy';
    if(!countTag) return;
    const n=Math.min(3, cur.field.filter(c=>!c.spell&&!c.world&&!c.artifact&&hasTag(c,countTag)).length);
    if(n<=0) return;
    // БАГФИКС (2026-08-08, по прямому запросу автора — "было 5/5, стало 5/6, должно
    // стать 6/6") — та же проверка, что уже есть у обычного Squad maxHP-бонуса чуть выше
    // (checkSquadBonuses(), effect==='maxhp': "if(card.hp===card.maxHp-squad.val) card.hp+=
    // squad.val"): если карта ещё НЕ была ранена (текущий hp всё ещё равен старому maxHp,
    // до добавления n), рост maxHp тоже поднимает текущий hp на ту же величину — иначе
    // maxHp растёт, а сам hp остаётся прежним, будто карта уже потеряла эту разницу.
    // Раненой карте (hp < старый maxHp) бонус НЕ доливает недостающее — только увеличивает
    // потолок, как и должно быть.
    const wasFullHp=(a.hp===a.maxHp);
    a.maxHp+=n;
    if(wasFullHp) a.hp+=n;
    a.synergyMaxHpBonus=n;
    a.atkBonus=(a.atkBonus||0)+n;
  });
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
  {gtype:'mch', count:3, effect:'param', param:'shot',   val:2}, // Szarg<->Mechird archetype swap (2026-08-04, по прямому запросу автора) — Mechird теряет старый +1 ATK squad-бонус, становится физическим аналогом Umbasir (Shot вместо Bolt, param-бонус вместо stat-бонуса)
  {gtype:'orb', count:3, effect:'armor', val:2},
  {gtype:'umb', count:3, effect:'param', param:'bolt',   val:2},
  {gtype:'szg', count:3, effect:'maxhp', val:1}, // Squad-бонус НЕ менялся при свопе (2026-08-04, по прямому запросу автора) — Szarg сохраняет +1 maxHP, меняются только базовые статы/pierce
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
    const newMax=(getTagVal(a,'armor')||0)+(a.squadArmorBonus||0)+(a.spellArmorBonus||0)+(a.sagaArmorBonus||0)+worldArmorVal+auraBonus;
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
// БАГФИКС/РЕДИЗАЙН (2026-08-06, по прямому запросу автора — упростили механику): раньше
// урон был 0 базой + N (кол-во горящих/испуганных ВРАГОВ НА ВСЁМ ПОЛЕ). Теперь: 1 базовый
// магический урон ВСЕГДА, +1 (не масштабируется дальше), если у КОНКРЕТНОЙ выбранной цели
// уже есть debuff своей семьи (burning для shard_burn_scale/THE BOOK, feared для
// shard_fear_scale/SHARD) — не по всему полю противника, только по самой цели. target
// опционален (undefined до выбора цели) — тогда возвращается голая база (1), для превью-
// текста в doShard() до клика по карте; финальный расчёт в doShardTarget() ниже всегда
// вызывает с реальной целью.
function shardBaseDmg(artifact, oppK, target){
  let dmg=1;
  if(!artifact) return dmg;
  if(!target) return dmg; // цель ещё не выбрана — превью базового значения без бонуса
  if(hasTag(artifact,'shard_burn_scale') && target.burning) dmg+=1;
  if(hasTag(artifact,'shard_fear_scale') && target.feared) dmg+=1;
  return dmg;
}

function doShard(artifact){
  if(G.phase==='shardTarget'){
    G.phase='action';G.sel=null;render();return;
  }
  G.phase='shardTarget';
  G.sel=artifact.id;
  const oppK=G.turn==='tea'?'jeet':'tea';
  lg(`${artifact.name}: select an enemy creature to deal ${shardBaseDmg(artifact,oppK)} damage (+1 if it's already burning/feared).`,'hint');
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
  let sparkBonusApplied=false;
  if(hasTag(spell,'spell_dmg_bonus_world_artifact')){
    const cur=G[G.turn];
    if(cur.world || cur.artifacts.length>0){ dmg+=getTagVal(spell,'spell_dmg_bonus_world_artifact')||0; sparkBonusApplied=true; }
  }  // VERDICT/DAMNATION (2026-07-24, по прямому запросу автора) — используют этот же путь
  // с dmg=999 как условность "безусловное убийство". Игрок не должен видеть голое число —
  // ни в логе, ни во всплывающей надписи над картой, ни в плавающем "-999".
  const isInstaKill=dmg>=999;
  const oppK=G.turn==='tea'?'jeet':'tea';
  const casterFaction=G.turn;

  if(isInstaKill){
    // VERDICT/DAMNATION (2026-07-30, по прямому запросу автора) — НЕ снаряд. Тематически
    // это "спавн разрушения прямо на карте", не что-то летящее — та же категория, что и у
    // SHARD/FIERY ALTAR (doShardTarget() ниже). Своя анимация будет нарисована отдельно
    // позже; пока — прежнее мгновенное разрешение, без полёта/доп.паузы.
    playSfx('card_spell_atack');
    queueFieldFx(card.id,'DESTROYED','fx-spell-dmg'); // плейсхолдер — позже заменится на гифку
    // bypassFrost=true — VERDICT/DAMNATION это targeted-DESTROY эффект (та же категория,
    // что JUDGMENT/DEATHBLOW и CATACLYSM/EXTINCTION, см. их комментарии) — Frost не должна
    // спасать от него вообще, только Ward/активный Shield (те уже проверены на этапе
    // выбора цели, см. click-хендлер).
    dmgCard(card,dmg,oppK,true,false,'DESTROYED',true);
    if(!card._foxyDodgedThisHit && !card._shieldBlockedThisHit && !card._frostBlockedThisHit){
      lg(`${spell.name} destroys ${card.name}!`,'dmg');
    }
    G[casterFaction].void.push(spell);
    spell.voided=true;
    G.pendingSpell=null;G.phase='action';G.sel=null;
    G[casterFaction].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
    checkWin();render();
    return;
  }

  // Обычный Bolt-спелл (JAB/STING/SPARK/MALICE/EXECUTE/CULL, 2026-07-30, по прямому запросу
  // автора) — тот же снаряд, что у Bolt Умбасира (throwBoltFx(), bolt.gif — арт временный,
  // используется для всех, пока не нарисованы уникальные под каждый спелл; логика от этого
  // не изменится, замена будет чисто визуальной). У спелла, в отличие от Умбасира, нет
  // своей карты на поле — снаряд вылетает из БАЗЫ кастера (fromId=null). Полёт стартует
  // СРАЗУ по входу в эту функцию, а вызывается она только ПОСЛЕ того, как карта уже
  // "сгорела" из руки (человек — карта покидает руку мгновенно ещё на Play, до фазы выбора
  // цели; ИИ — уже после playSpellRevealAnimation(), см. doPlay()) — так что "полёт
  // начинается после сжигания карты" соблюдается самой последовательностью вызовов, без
  // нужды в отдельном таймере на это.
  const targetId=card.id;
  playSfx('wind_card');
  // Арт снаряда (2026-08-05, по прямому запросу автора) — SPARK/MALICE: bolt2.gif, когда
  // сработал бонус-урон от Мира/Артефакта (реально летит на 4, не на 2), иначе bolt1.gif;
  // EXECUTE/CULL (draw_on_kill): всегда bolt1.gif. Остальные (JAB/STING/VERDICT/DAMNATION)
  // не тронуты — throwBoltFx() без 5-го параметра сама подставит дефолтный 'img/bolt.gif'.
  let dmgSpellAsset;
  if(hasTag(spell,'spell_dmg_bonus_world_artifact')) dmgSpellAsset = sparkBonusApplied ? 'img/bolt2.gif' : 'img/bolt1.gif';
  else if(hasTag(spell,'draw_on_kill')) dmgSpellAsset = 'img/bolt1.gif';
  throwBoltFx(null, targetId, null, casterFaction, dmgSpellAsset);
  G[casterFaction].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[casterFaction].field.forEach(c=>triggerAbilities(c,'on_play_creature'));
  render();

  // Счётчик endTurn() (2026-07-24, тот же паттерн, что у "простых" instant-спеллов в
  // doPlay() — см. её комментарий у G._pendingInstantSpellResolve) — не даёт ходу
  // переключиться, пока снаряд ещё в полёте: иначе урон применился бы уже под ЧУЖИМ
  // G.turn, если игрок успеет нажать End Turn за эти 420мс.
  G._pendingInstantSpellResolve=(G._pendingInstantSpellResolve||0)+1;
  setTimeout(()=>{
    try{
      const targetC=G[oppK].field.find(c=>c.id===targetId);
      if(!targetC) return; // цель успела уйти с поля за время полёта — бить нечем
      // queueFieldFx(targetC.id,'HIT!','fx-spell-dmg') убран (2026-08-06, по прямому
      // запросу автора) — текстовый плейсхолдер больше не нужен, у этих спеллов уже есть
      // свой визуал снаряда (throwBoltFx() выше).
      const hpBefore=targetC.hp;
      dmgCard(targetC,dmg,oppK,true);
      // Звук и лог — ПОСЛЕ dmgCard() и только если удар реально дошёл (2026-08-06, багфикс
      // по прямому запросу автора — "лишний звук срабатывает при промахе по Foxy Trick") —
      // раньше card_spell_atack игрался БЕЗУСЛОВНО до dmgCard(), так что при Foxy-уклонении/
      // Frost-поглощении/Solana Shield играли ДВА звука разом. Тот же паттерн, что уже есть
      // у лога чуть ниже (MISSED!/ABSORB/Frost-shatter уже логируют/озвучивают себя сами
      // внутри dmgCard()).
      if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
        playSfx('card_spell_atack');
        lg(`${spell.name}: ${targetC.name} takes ${dmg} damage!`,'dmg');
      }
      // draw_on_kill (2026-07-24, "EXECUTE"/"CULL", по прямому запросу автора) — если этот
      // конкретный удар добил цель (была жива ДО удара, после — 0 или меньше), тянем 1
      // карту. Не трогает обычные JOURNEY/HEX/SPARK/MALICE/Bolt1 — у них просто нет этого
      // тега.
      if(hasTag(spell,'draw_on_kill') && hpBefore>0 && targetC.hp<=0){
        const cur=G[casterFaction];
        if(cur.deck.length>0){ cur.hand.push(cur.deck.shift()); lg(`${spell.name}: kill confirmed — draws 1 card.`,'imp'); }
      }
      // draw_on_no_kill (2026-07-24, "JAB"/"STING", по прямому запросу автора) — зеркальное
      // условие: тянем карту, только если цель ПЕРЕЖИЛА удар (card.hp>0 после) — "промазал
      // мимо килла — вот тебе утешительная карта".
      if(hasTag(spell,'draw_on_no_kill') && hpBefore>0 && targetC.hp>0){
        const cur=G[casterFaction];
        if(cur.deck.length>0){ cur.hand.push(cur.deck.shift()); lg(`${spell.name}: target survives — draws 1 card.`,'imp'); }
      }
      checkWin();
      render();
    } finally {
      G._pendingInstantSpellResolve--;
    }
  },420);
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
    playSfx('miss'); // БАГФИКС (2026-08-06, по прямому запросу автора) — забыт при первой
    // реализации 2026-07-27; dmgCard() получил этот же звук на день позже (2026-08-05), но
    // сюда его тогда не перенесли, хотя комментарий и предупреждал "не идёт через dmgCard()".
    // avenge_foxy_miss (Thug Asteanaut) НЕ применяется здесь — спелл, разыгранный из руки,
    // не карта-существо, бить в ответ физически нечего (по прямому решению автора).
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
    playSfx('miss'); // БАГФИКС (2026-08-06, по прямому запросу автора) — тот же пропуск, что у doSpellBurnTarget выше
    // avenge_foxy_miss НЕ применяется — тот же принцип, что у CINDER выше (спелл, не существо).
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
    lg(`${card.name} is frozen — immune to Taunt Break.`,'dmg');
  } else if(hasTag(card,'shield') && !card.shieldConsumed){
    lg(`${card.name}'s Solana Shield blocks the effect entirely.`,'dmg');
  } else if(hasTag(card,'ward')){
    lg(`${card.name}'s Ward blocks the effect entirely.`,'dmg');
  } else if(hasTag(card,'foxy') && Math.random()<0.5){
    // Foxy Trick (2026-07-27, по прямому запросу автора — Provoke-break тоже считается
    // дебаффом под уклонение) — та же логика, что в doSpellFearTarget/doSpellBurnTarget.
    playSfx('miss'); // БАГФИКС (2026-08-06, по прямому запросу автора) — тот же пропуск, что у остальных point-таргет спеллов
    // avenge_foxy_miss НЕ применяется — тот же принцип, что у CINDER/DREAD выше.
    queueFieldFx(card.id,'MISSED!','fx-miss');
    lg(`${card.name}'s Foxy Trick makes it miss entirely!`,'imp');
  } else {
    playSfx('debaf');
    card.provokeBroken=true;
    lg(`${spell.name}: ${card.name}'s Tree Wall is suppressed!`,'imp');
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
  const oppK=G.turn==='tea'?'jeet':'tea';
  const casterFaction=G.turn;
  const targetId=card.id;

  // Снаряд (2026-07-30, по прямому запросу автора — тот же паттерн, что у
  // doSpellDmgTarget()/Bolt Умбасира, см. её подробный комментарий): вылетает из
  // БАЗЫ кастера, полёт стартует сразу по входу в функцию (после того, как карта уже
  // сгорела/раскрылась — см. doPlay()). Арт — bolt2.gif (2026-08-05, по прямому запросу
  // автора: BREACH/RUPTURE — самый тяжёлый point-damage удар в этой семье, всегда 5 урона +
  // overkill-trample, так что всегда "тяжёлый" снаряд, без условной ветки на bolt1.gif).
  playSfx('wind_card');
  throwBoltFx(null, targetId, null, casterFaction, 'img/bolt2.gif');
  G[casterFaction].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[casterFaction].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();

  G._pendingInstantSpellResolve=(G._pendingInstantSpellResolve||0)+1;
  setTimeout(()=>{
    try{
      const targetC=G[oppK].field.find(c=>c.id===targetId);
      if(!targetC) return; // цель успела уйти с поля за время полёта — бить нечем
      // queueFieldFx(targetC.id,'HIT!','fx-spell-dmg') убран (2026-08-06, по прямому
      // запросу автора) — текстовый плейсхолдер больше не нужен, у BREACH/RUPTURE уже есть
      // свой визуал снаряда (throwBoltFx() выше).
      dmgCard(targetC,dmg,oppK,true);
      // Звук и лог — ПОСЛЕ dmgCard() и только если удар реально дошёл (2026-08-06, багфикс
      // по прямому запросу автора — "лишний звук срабатывает при промахе по Foxy Trick") —
      // раньше card_spell_atack игрался БЕЗУСЛОВНО до dmgCard(), так что при Foxy-уклонении/
      // Frost-поглощении/Solana Shield играли ДВА звука разом.
      if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
        playSfx('card_spell_atack');
        lg(`${spell.name}: ${targetC.name} takes ${dmg} damage!`,'dmg');
      }
      const overflow=Math.max(0,-targetC.hp);
      if(overflow>0){
        G[oppK].hp=Math.max(0,G[oppK].hp-overflow);
        lg(`${spell.name}: overkill carries ${overflow} dmg into the ${oppK.toUpperCase()} base!`,'dmg');
        flashBase(oppK,'dmg',overflow);
      }
      checkWin();
      render();
    } finally {
      G._pendingInstantSpellResolve--;
    }
  },420);
}

function doSpellUntapTarget(card){
  const spell=G.pendingSpell;
  if(!spell) return;
  playSfx('baf');
  const wasReady=!card.sleeping&&!card.exhausted;
  card.sleeping=false;card.exhausted=false;
  // Clean (2026-08-06, по прямому запросу автора — тот же набор, что снимает Orbiton-хил,
  // см. onClick()/healTarget выше: burning/feared/provokeBroken). НЕ трогает mekMarked —
  // по прямому запросу автора это исключение специально оставлено недостижимым для этого
  // спелла, ровно как оно уже недостижимо для heal.
  const debuffs=[];
  if(card.burning){card.burning=false;debuffs.push('fire');}
  if(card.feared){card.feared=false;debuffs.push('fear');}
  if(card.provokeBroken){card.provokeBroken=false;debuffs.push('provoke suppression');}
  if(debuffs.length) queueFieldFx(card.id,'CLEANED','fx-cleaned');
  lg(`${spell.name}: ${card.name} is active${wasReady?' (was already active)':''}!${debuffs.length?' Removes '+debuffs.join(' & ')+'.':''}`,'hl');
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
  // Полёт в руку (2026-08-05, по прямому запросу автора) — снимок ТЕКУЩЕЙ полевой позиции
  // карты, ДО того как она реально уйдёт с поля. rZone() (render.js) подхватит этот снимок
  // на рендере зоны руки этим же вызовом render() ниже и погонит клон от него к месту в
  // руке — БЕЗ эффекта уменьшения (клон растёт/сжимается плавно от родного полевого размера
  // к размеру карты в руке, без искусственного "нырка" вниз по масштабу), крест-фейдится с
  // настоящей картой в руке в конце — тот же приём, что у _flyCardFromDeck(), см.
  // _flyCardToHand() в render.js. Раньше тут была искусственная пауза в 400мс между
  // "картинка гаснет на поле" и "картинка появляется в руке" — с непрерывным полётом она
  // больше не нужна, обе стороны укладываются в один и тот же render().
  const fieldEl=document.querySelector(`.card-small[data-id="${card.id}"]`);
  if(fieldEl) _bounceOriginRects[card.id]=fieldEl.getBoundingClientRect();
  G[ownerK].field=G[ownerK].field.filter(c=>c.id!==card.id);
  resetC(card);
  G[ownerK].hand.push(card);
  // БАГФИКС (2026-08-06, по прямому запросу автора — "у LAST KIIRO бонус атаки не
  // пересчитался сразу после того, как сдули союзную карту"). killCard()/reviveCard()/
  // doCreature() уже вызывают applyAuras()+recalcArmor() после любого изменения состава
  // поля — эта функция единственная не вызывала, оставляя alone_samurai (и вообще ЛЮБую
  // aura-зависимую карту) с устаревшим числом до следующего естественного триггера
  // пересчёта (следующий ход/смерть/розыгрыш). Тот же принцип "поле изменилось — сразу
  // пересчитать", что уже применяется везде в этом файле.
  applyAuras(ownerK);
  recalcArmor(ownerK);
  G[G.turn].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();
}

function doGustAbility(target){
  // TEANTIST active skill "Return your ally" (2026-07-30, по прямому запросу автора) —
  // тот же bounce-эффект и звук, что у GUST/REVERSE (doSpellBounceTarget() выше), но
  // доставлен активным скилом СУЩЕСТВА на поле, а не спеллом: кастер (TEANTIST) НЕ топится
  // в void — остаётся на поле и exhausted'ится (тот же паттерн, что у Хилки/Болта, healer.
  // exhausted=true в onClick()/healTarget выше), плюс activateCard() — тот же "подъём"
  // эффект, что у остальных активок при использовании. Цель — ТОЛЬКО другой союзник, не
  // сам кастер (гейт уже на клике, см. onClick() выше).
  const caster=findC(G.sel);
  if(!caster) return;
  const ownerK=target.f;
  playSfx('wind_card'); // тот же звук, что у GUST/REVERSE/UNSEEN — тематически один жест
  lg(`${caster.name}: ${target.name} blown back to ${ownerK==='tea'?'Tea':'Jeet'}'s hand.`,'imp');
  // Полёт в руку — тот же приём и та же причина отказа от 400мс-паузы, что у
  // doSpellBounceTarget() выше (см. её комментарий).
  const fieldEl=document.querySelector(`.card-small[data-id="${target.id}"]`);
  if(fieldEl) _bounceOriginRects[target.id]=fieldEl.getBoundingClientRect();
  G[ownerK].field=G[ownerK].field.filter(c=>c.id!==target.id);
  resetC(target);
  G[ownerK].hand.push(target);
  // БАГФИКС (2026-08-06) — тот же пропуск, что у doSpellBounceTarget() выше, см. её
  // подробный комментарий.
  applyAuras(ownerK);
  recalcArmor(ownerK);
  caster.exhausted=true;
  G.phase='action';G.sel=null;
  G[G.turn].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // тот же паттерн, что у doSpellBounceTarget/doSpellDmgTarget — пересчёт Squad-бонусов после ухода карты с поля
  render();
  activateCard(caster.id); // TEANTIST визуально "приподнимается", как и другие активки
}

function doSpellExecuteHalfTarget(card){
  // JUDGMENT/DEATHBLOW rework (2026-07-26, по прямому запросу автора) — раньше это был
  // условный insta-kill (999 dmg), доступный ТОЛЬКО если цель уже была ≤50% maxHP (гейт на
  // этапе выбора цели). Теперь цель — ЛЮБОЕ вражеское существо: спелл либо наносит Bolt 1,
  // ЛИБО добивает — исключительно одно из двух, не оба сразу.
  //
  // БАГФИКС (2026-08-05, по прямому запросу автора) — старая версия ошибочно решала между
  // "просто Bolt 1" и "добивание" ПОСЛЕ уже нанесённого Bolt 1 (т.е. фактически считала
  // условие ≤50% с учётом урона, которого могло не быть отдельно от добивания — пример
  // автора: карта 4/5 с текущим hp=4 получала Bolt 1 → hp=3 → 3<=floor(5/2)=2 было FALSE,
  // так что баг был не в этом примере, а в обратную сторону: карта уже НЕ на половине (hp=3
  // из 5, что ВЫШЕ floor(5/2)=2) добивалась бы, если бы hp было 3 ДО удара — 3-1=2<=2 TRUE,
  // хотя 3 из 5 ещё не считается "половиной" сама по себе). Верная механика: смотрим на
  // ТЕКУЩЕЕ hp цели ДО какого-либо действия этого каста — если оно УЖЕ ≤floor(maxHP/2),
  // спелл добивает НАПРЯМУЮ (без отдельного Bolt 1 поверх); если ещё выше половины — спелл
  // просто наносит Bolt 1, добивания в этом случае не происходит вообще, даже если Bolt 1
  // опускает цель до/ниже половины по итогу. Округление — ВНИЗ (Math.floor): 5 maxHP →
  // порог 2 (не 2.5/3), 4 maxHP → порог 2, 3 maxHP → порог 1.
  //
  // Решение "будет ли это добивание" принимается СРАЗУ (по card.hp/card.maxHp на момент
  // клика — ДО каких-либо изменений), чтобы синхронно выбрать арт снаряда (bolt2.gif на
  // добивание, bolt1.gif на простой Bolt 1) — сам полёт стартует ДО setTimeout-резолва,
  // так что later-вычисленное решение было бы уже поздно для выбора спрайта.
  //
  // Снаряд (2026-07-30) — тот же паттерн, что у doSpellDmgTarget()/Bolt Умбасира: летит из
  // БАЗЫ кастера, это единственный снаряд на весь каст — финальное добивание (999, если
  // сработал порог) НЕ отдельный снаряд, а мгновенный "спавн разрушения на карте" сразу по
  // приземлении (та же категория, что у VERDICT/DAMNATION в doSpellDmgTarget()).
  const spell=G.pendingSpell;
  if(!spell) return;
  const oppK=card.f;
  const casterFaction=G.turn;
  const targetId=card.id;
  const willDestroy = card.hp<=Math.floor(card.maxHp/2);

  playSfx('wind_card');
  // Арт снаряда (2026-08-05, уточнено автором) — схема по урону: bolt.gif=1, bolt1.gif=2+,
  // bolt2.gif=4+. Простой Bolt 1 (willDestroy=false) — это ровно 1 урона, значит дефолтный
  // bolt.gif (throwBoltFx() сама подставит его без 5-го параметра); добивание — bolt2.gif
  // (тематически "тяжёлый" удар, не про буквальный урон 4+, а про сам факт добивания).
  throwBoltFx(null, targetId, null, casterFaction, willDestroy?'img/bolt2.gif':undefined);
  G[casterFaction].void.push(spell);
  spell.voided=true;
  G.pendingSpell=null;G.phase='action';G.sel=null;
  G[casterFaction].field.forEach(c=>triggerAbilities(c,'on_play_creature')); // см. фикс выше у doSpellDmgTarget
  render();

  G._pendingInstantSpellResolve=(G._pendingInstantSpellResolve||0)+1;
  setTimeout(()=>{
    try{
      const targetC=G[oppK].field.find(c=>c.id===targetId);
      if(!targetC) return; // цель успела уйти с поля за время полёта — бить нечем
      if(willDestroy){
        // Добивание НАПРЯМУЮ — БЕЗ отдельного Bolt 1 поверх (см. комментарий выше:
        // либо-либо, не накопительно). bypassFrost=true — тот же targeted-DESTROY
        // принцип, что у VERDICT/DAMNATION/CATACLYSM: Frost не спасает, только Ward/
        // активный Shield (уже проверены на этапе выбора цели).
        queueFieldFx(targetC.id,'DESTROYED','fx-spell-dmg');
        dmgCard(targetC,999,oppK,true,false,'DESTROYED',true);
        // Звук и лог — ПОСЛЕ dmgCard() (2026-08-06, багфикс по прямому запросу автора —
        // "лишний звук срабатывает при промахе по Foxy Trick") — раньше card_spell_atack
        // играл БЕЗУСЛОВНО до dmgCard(), так что при Foxy-уклонении/Solana Shield играли
        // ДВА звука разом (Frost тут физически не может сработать — bypassFrost=true — но
        // Foxy/Shield всё ещё могут).
        if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
          playSfx('card_spell_atack');
          lg(`${spell.name}: ${targetC.name} was already at half HP or below — destroyed outright!`,'dmg');
        }
      } else {
        // queueFieldFx(targetC.id,'BOLT!','fx-shard') убран (2026-08-06, по прямому
        // запросу автора) — текстовый плейсхолдер больше не нужен, JUDGMENT/DEATHBLOW уже
        // кидают настоящий снаряд (throwBoltFx() выше).
        // bypassFrost=true — тот же принцип, что и у ветки добивания выше: Frost не должна
        // просто поглотить Bolt 1 без последствий на эту targeted-механику.
        dmgCard(targetC,1,oppK,true,false,undefined,true);
        // Звук и лог — ПОСЛЕ dmgCard() (2026-08-06, багфикс по прямому запросу автора —
        // тот же класс бага, что у ветки добивания выше).
        if(!targetC._foxyDodgedThisHit && !targetC._shieldBlockedThisHit && !targetC._frostBlockedThisHit){
          playSfx('card_spell_atack');
          lg(`${spell.name}: Bolt 1 to ${targetC.name}!`,'dmg');
        }
      }
      render();
    } finally {
      G._pendingInstantSpellResolve--;
    }
  },420);
}

function doShardTarget(card){
  const oppK=G.turn==='tea'?'jeet':'tea';
  if(card.f===G.turn||card.spell||card.world||card.artifact){
    lg('Select an enemy creature.','hint');return;
  }
  const artifact=G[G.turn].artifacts.find(a=>hasTag(a,'shard'));
  // 2026-08-06 (по прямому запросу автора, редизайн — см. подробный комментарий у
  // shardBaseDmg() выше): бонус снова завязан именно на ЭТУ цель (burning/feared у неё
  // самой), а не на подсчёт по всему полю противника, как было раньше (2026-07-17→08-06).
  const dmg=shardBaseDmg(artifact,oppK,card);
  // THE BOOK gets its own fx label (thematically "burned by the page") — same fx-shard
  // visual system as SHARD itself, per author request ("сделать всё как у Шард").
  const fxLabel=hasTag(artifact,'shard_burn_scale')?'SCORCH!':'SHARD!';
  queueFieldFx(card.id,fxLabel,'fx-shard'); // плейсхолдер — позже заменится на гифку
  dmgCard(card,dmg,oppK,true);
  // Звук и лог — ПОСЛЕ dmgCard() и только если удар реально дошёл (2026-08-06, багфикс по
  // прямому запросу автора — "лишний звук срабатывает при промахе по Foxy Trick", тот же
  // класс бага, что у Bolt/spell_dmg_target — см. их комментарии) — раньше card_spell_atack
  // и лог играли/писались БЕЗУСЛОВНО ДО dmgCard(), так что при Foxy-уклонении/Frost-
  // поглощении/Solana Shield на цели играли ДВА звука разом (свой + miss.wav/icebreake.wav/
  // absorb.wav изнутри dmgCard()).
  if(!card._foxyDodgedThisHit && !card._shieldBlockedThisHit && !card._frostBlockedThisHit){
    playSfx('card_spell_atack');
    lg(`${artifact.name}: ${card.name} takes ${dmg} damage!`,'dmg');
  }
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

  // Подсветка кнопки, открывшей это кладбище (2026-08-03: раньше модалка ещё и физически
  // прилипала к этой кнопке через left/bottom — по прямому запросу автора теперь просто
  // центрируется как обычная модалка через родительский .modal-overlay (см. index.html),
  // кнопка только подсвечивается классом .open, как и раньше).
  document.querySelectorAll('.arena-grave-btn').forEach(b=>b.classList.toggle('open', b.dataset.faction===faction));

  const innerModal = modal.querySelector('.grave-modal');
  modal.classList.remove('hidden');
  if(innerModal){
    // .tea/.jeet (2026-08-06, по прямому запросу автора) — у джит теперь свой ассет для
    // 9-слайса рамки модалки (grav_frame_jeet.png) и полоски костей снизу (bones_jeet.png),
    // см. их подключение в CSS (.grave-modal.jeet/.grave-modal.jeet .grave-modal-footer).
    // Раньше .grave-modal была общая для обеих фракций (без faction-класса вообще).
    innerModal.classList.remove('tea','jeet');
    innerModal.classList.add(faction);
    innerModal.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void innerModal.offsetWidth;
    innerModal.classList.add('modal-pop-in-fast');
  }
}

function closeGraveModal(){
  document.querySelectorAll('.arena-grave-btn').forEach(b=>b.classList.remove('open'));
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
    // MonoMEK Метка (2026-07-30) — держится 2 СВОИХ хода владельца, тот же тайминг/паттерн
    // декремента, что и Frost чуть выше (конец хода ВЫХОДЯЩЕГО игрока = конец его же
    // собственного хода). Никакого урона тут не тикает (в отличие от Burn) — просто счётчик,
    // снимается сам собой на нуле.
    if(c.mekMarked){
      c.mekMarkTurns=(c.mekMarkTurns===undefined?2:c.mekMarkTurns)-1;
      if(c.mekMarkTurns<=0) c.mekMarked=false;
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
    // Saga (2026-08-06, тег from Krtv, Tea-эксклюзив) — БАГФИКС той же даты (по прямому
    // запросу автора, живой репорт: "тикает на ходу противника вместо своего, и Saga3
    // бонус не долетает"). Раньше этот блок ошибочно сидел в endTurn() у ВЫХОДЯЩЕГО
    // игрока (тот же forEach, что снимает sleeping/feared там) — по факту это НЕ "начало
    // моего хода", а "конец моего хода/подготовка соперника". Корректное место — именно
    // здесь, в _runTurnStartEffects(): `cur=G[G.turn]` уже флипнут на игрока, чей ход
    // РЕАЛЬНО начинается (см. комментарий у exhausted=false чуть выше в этой же функции).
    // Таймлайн, подтверждённый автором: карта разыграна → sagaStage=0 ("Сага ещё не
    // началась", status-текст см. render.js) → проходит ход соперника, ничего не меняется
    // → на СВОЁМ следующем ходу владельца (вот этот момент) → sagaStage=1, "Saga 1: +1
    // Max HP" → и так далее до потолка на 3. Двоеточие в тексте, не тире (тоже фикс по
    // прямому запросу автора).
    if(hasTag(c,'saga') && (c.sagaStage||0)<3){
      c.sagaStage=(c.sagaStage||0)+1;
      let bonusText='', bonusFloatType='';
      if(c.sagaStage===1){
        c.maxHp+=1; c.hp+=1;
        bonusText='+1 Max HP';
        bonusFloatType='maxhp'; // тот же тип, что у +N maxHP от аур/World (см. showFloat() ниже по файлу)
      } else if(c.sagaStage===2){
        c.sagaArmorBonus=(c.sagaArmorBonus||0)+1;
        recalcArmor(c.f);
        bonusText='+1 Armor';
        bonusFloatType='armoraura'; // тот же тип, что у +Armor от аур/BULWARK/CARAPACE
      } else if(c.sagaStage===3){
        c.sagaAtkBonus=(c.sagaAtkBonus||0)+1;
        bonusText='+1 ATK';
        bonusFloatType='atk'; // тот же тип, что у +N ATK от аур/ARCHIVE
      }
      lg(`${c.name}: Saga ${c.sagaStage}: ${bonusText}.`,'hl');
      const sagaId=c.id;
      requestAnimationFrame(()=>requestAnimationFrame(()=>showFloat(sagaId,bonusText,bonusFloatType)));
      // "Saga Up" — field-fx-popup стиль/позиция как у MARKET UP, белый цвет (по прямому
      // запросу автора, 2026-08-06) — см. .fx-sagaup, css/styles.css.
      queueFieldFx(sagaId,'Saga Up','fx-sagaup');
    }
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
        // Анимация смерти (2026-08-05, багфикс по прямому запросу автора — "при смерти от
        // поджога не было вообще никакой анимации") — раньше ТУТ был свой хардкод (.dying
        // класс + ручной setTimeout(remove,400)), написанный ДО того, как в rZone()
        // появилась общая логика смерти (полёт на кладбище/сожжение в Войд, см. её
        // комментарий в render.js) — тот старый хардкод молча убивал элемент через 400мс,
        // не дожидаясь общей анимации, из-за чего либо конфликтовал с ней (карта исчезала
        // раньше, чем успевала долететь/сгореть), либо (в версии с паузой смерти) обрывал
        // её на середине. Убрал полностью — killCard() ниже сам уводит карту в Войд
        // (toVoid=true), а общий diff-механизм в rZone() САМ подхватывает пропажу карты из
        // G[faction].field на ближайшем render() (endTurn() зовёт его чуть ниже по функции)
        // и запускает нужную анимацию — тот же путь, что уже работает для ЛЮБОЙ другой
        // смерти в игре (обычная атака/контрудар/Bolt/Shot/спеллы), без дублирования кода.
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
          showDeckEmptyWarning(3-cur.emptyDrawCount, G.turn);
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
    const teaBtn=document.getElementById('teaEndTurnBtn');
    const jeetBtn=document.getElementById('jeetEndTurnBtn');
    if(teaBtn&&teaBtn.style.display!=='none') endTurn();
    else if(jeetBtn&&jeetBtn.style.display!=='none') endTurn();
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
  // Джиттер для 'dmg' (2026-08-06, по прямому запросу автора — "две цифры урона в кашу,
  // например контрудар + месть Thug Asteanaut почти одновременно") — небольшой случайный
  // сдвиг через CSS-переменные (см. .float-number.dmg, css/styles.css), позиция базы
  // перенесена ближе к HP (между уже существующими опорными точками armorloss), чтобы не
  // попасть в кашу и с минус-бронёй тоже. Другие типы (heal/atk/maxhp/armoraura) обычно не
  // спавнятся по двое почти одновременно на одной карте — джиттер им не нужен, не трогаем.
  if(type==='dmg'){
    const jx=Math.round((Math.random()-0.5)*24); // ±12px по горизонтали
    const jy=Math.round((Math.random()-0.5)*14); // ±7px по вертикали
    num.style.setProperty('--dmg-jitter-x', jx+'px');
    num.style.setProperty('--dmg-jitter-y', jy+'px');
  }
  el.appendChild(num);
  setTimeout(()=>num.remove(), 900);
}
function activateCard(cardId){
  // Пропускаем пульс, если карта СЕЙЧАС ещё летит на поле (2026-08-05, багфикс по прямому
  // запросу автора — "Vanguard-карта после розыгрыша+немедленной атаки приземляется не на
  // свою позицию"). _cardsCurrentlyFlying (render.js) — тот же сет, что уже блокирует
  // replaceWith() спрятанного элемента, пока летит его клон (см. её комментарий в rZone()).
  // Vanguard может действовать в тот же ход, что и разыгран — быстрая AI/игрок-атака сразу
  // после розыгрыша может вызвать activateCard() (пульс атакующего) на элементе, который
  // ФИЗИЧЕСКИ ещё visibility:hidden (ждёт своего входного клона) — конкурирующая CSS-
  // анимация (@keyframes cardActivate, тоже двигает transform) начинает играть параллельно
  // с ожиданием, и в момент, когда карта наконец становится видимой, браузер может
  // отрисовать её ПОСЕРЕДИНЕ chужой transform-анимации — ровно тот "не туда приземлилась,
  // потом резко доехала" эффект. Раз карта всё равно невидима, а её собственная entrance-
  // анимация уже даёт достаточно обратной связи "что-то произошло" — пульс просто не нужен
  // в этом окне, безопаснее пропустить.
  if(typeof _cardsCurrentlyFlying!=='undefined' && _cardsCurrentlyFlying.has(String(cardId))) return;
  const el = document.querySelector(`.card-small[data-id="${cardId}"]`);
  if(!el) return;
  el.classList.remove('activating');
  void el.offsetWidth;
  el.classList.add('activating');
  // Токен вместо голого таймера (2026-07-30, баг-фикс автор поймал живьём — "у Умбасира
  // при болте пропал подъём"): activateCard() на одну и ту же карту может вызываться ДВАЖДЫ
  // подряд в пределах 500мс — например, атака сама даёт пульс сразу, а потом Nana даёт ЕЩЁ
  // ОДИН пульс ~500мс спустя (см. resolveNanaEvent). Раньше старый setTimeout от ПЕРВОГО
  // вызова слепо снимал класс через 500мс — если он срабатывал ПОСЛЕ того, как второй вызов
  // только что заново навесил 'activating', это стирало свежую анимацию, даже не дав ей
  // проиграться. Токен решает: у каждого вызова свой номер, таймер снимает класс, только
  // если это всё ещё ЕГО номер (никто не перезапустил анимацию заново после него) — старые
  // таймеры от предыдущих вызовов теперь молча ничего не делают, если их обогнал новый.
  const token = (el._activateToken = (el._activateToken||0) + 1);
  setTimeout(()=>{
    if(el._activateToken === token) el.classList.remove('activating');
  }, 500);
}
function hitCard(cardId){
  // См. подробный комментарий у того же чека в activateCard() выше — тот же класс бага,
  // тот же фикс: не трогаем ещё невидимую, летящую на поле карту конкурирующей анимацией.
  if(typeof _cardsCurrentlyFlying!=='undefined' && _cardsCurrentlyFlying.has(String(cardId))) return;
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
        // arenaGravePairPlayer/arenaDeckPairPlayer (2026-08-04, по прямому запросу
        // автора — "раз уж мы теперь видим боксы кладбища/деки как часть интерфейса,
        // можно завязать их на шейк при ударе по базе"): те же боксы, что сидят
        // вплотную к playerStats снизу/сверху колонки — трясутся вместе с рукой/статбаром.
        [document.getElementById('playerHandZone'), bar,
         document.getElementById('arenaGravePairPlayer'), document.getElementById('arenaDeckPairPlayer')]
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
      [document.getElementById('oppHandZone'), bar,
       document.getElementById('arenaGravePairOpp'), document.getElementById('arenaDeckPairOpp')]
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
    // 2026-08-05, багфикс по прямому запросу автора — раньше плашка добавлялась ВНУТРЬ
    // hpBox, потомка .stats-bar (position:relative;z-index:0 — свой локальный stacking
    // context). Хотя у самой плашки z-index:9999, это сравнение оставалось ЛОКАЛЬНЫМ
    // внутри контекста .stats-bar — соседняя зона руки (.opp-hand-zone/.player-hand-zone)
    // всё равно перекрывала плашку, когда та улетала вверх анимацией floatUp (цифра урона
    // визуально уходила ПОД карты в руке соперника вместо того чтобы подняться над ними и
    // исчезнуть). Теперь плашка — position:fixed на реальных экранных координатах hpBox
    // (getBoundingClientRect()) и крепится напрямую к <body>, минуя чужой stacking
    // context между ней и её собственным z-index:9999 целиком.
    if(amount&&hpBox){
      const num=document.createElement('div');
      num.className=`float-number float-number-base ${type==='dmg'?'fnb-dmg':'fnb-heal'}`;
      num.textContent=`${type==='dmg'?'-':'+'}${amount}`;
      const hpRect=hpBox.getBoundingClientRect();
      num.style.position='fixed';
      num.style.left=(hpRect.left+hpRect.width/2)+'px';
      num.style.top=hpRect.top+'px';
      document.body.appendChild(num);
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
