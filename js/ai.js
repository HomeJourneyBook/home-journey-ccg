// ══════════════════════════════════════════════════════════════════
// AI MODULE (режим "VS AI") — простой правило-ориентированный бот.
// НИЧЕГО не меняет в существующей игровой логике: только читает G и
// вызывает уже существующие функции (doPlay/doAttack/tryAttackBase/
// endTurn), то есть ИИ physически не может нарушить правила, которые
// не нарушает и человек в хотсите.
//
// Активируется только когда G.mode==='vsai' и наступает G.turn===G.aiFaction.
// Не вызывается и не влияет ни на что при обычном Hot Seat режиме.
// ══════════════════════════════════════════════════════════════════

const AI_STEP_DELAY = 550; // мс между действиями ИИ — чтобы ходы были "видны" человеку

// ── ВЕСА ОЦЕНКИ (тюнинг-панель) ───────────────────────────────────
// Все "магические числа", которыми ИИ взвешивает карты и решения, собраны
// здесь в одном месте — вместо того чтобы бампать AI_VERSION и переписывать
// формулы внутри функций, для большинства правок баланса ИИ достаточно
// поменять число тут и посмотреть на следующий battle_log. Это НЕ обучаемые
// веса (нет градиентного спуска/самообучения) — это те самые "коэффициенты
// важности", просто на уровне тегов/архетипов, а не 75 отдельных карт: новая
// карта с тегом 'provoke' автоматически наследует его вес, ничего добавлять
// в эту таблицу не нужно, пока не понадобится тег, которого тут ещё нет.
const AI_WEIGHTS = {
  atkVsHpRatio: 1.3,     // вклад ATK относительно HP в базовую эффективность существа
  tagBonus: { // безусловный бонус тега, независимо от ситуации на поле
    provoke:0.4, pierce:0.3, vanguard:0.3, rage:0.5, bushido:0.5, invisible:0.6,
    fear:0.5, burn:0.4, regen:0.3, draw_attack:0.6, heal:0.4, aoe:0.4, enter_aoe:0.4,
    // Добавлено при аудите ai.js (см. CLAUDE.md "AI version tracking") — эти теги
    // существовали в движке, но не были оценены ИИ вообще (0 влияния на выбор карты):
    armor:0.4,       // Броня — доп. живучесть, сопоставимо по весу с provoke
    untamed:0.3,     // отвечает контратакой весь ход соперника — доп. надёжность
    incarnation:0.5, // существо не теряется по-настоящему при обычной смерти — дороже, чем кажется по статам
    ward:0.5,        // полный иммунитет к магии (AOE/Shard/bolt/точечный спелл) — сильная защита от removal-тяжёлых колод
    bolt:0.4,        // активка точечного магического урона (аналог aoe/heal по весу)
    // Второй проход аудита (2026-07-16, вместе с рефакторингом HP-баланса/лимита поля) —
    // ещё 5 тегов из движка, тоже стоявшие на 0 (карта с ними оценивалась как "голые статы"):
    vampiric:0.4,    // лайфстил при атаке — сопоставимо с regen/heal по весу
    necrophage:0.6,  // килл: существо полностью восстанавливается ДО maxHP + труп цели стирается
                      // из графьярда навсегда (не поднимется Raise/Revive) — сустейн и антиграв в одном теге,
                      // вес выше vampiric/regen намеренно
    taunt_break:0.3, // ситуативно — снимает provoke ТОЛЬКО у цели, у которой он есть; условный тег,
                      // вес ниже безусловных defensive-тегов вроде provoke/armor
    shield:0.6,       // Solana Shield — абсолютный одноразовый full-absorb ПЕРВОГО удара за цикл сна/
                      // пробуждения (см. dmgCard() в game.js) — сильнее ward (тот блокирует только магию),
                      // блокирует физическую атаку целиком, вес соответствующий
    draw:0.6,         // "On turn: draw 1 card" (напр. TEANTIST) — стабильное преимущество в картах КАЖДЫЙ
                      // ход, в отличие от draw_attack (нужно ещё и успешно атаковать) — вес того же порядка
    // Третий проход аудита (2026-07-18, в рамках общей ревизии ИИ по запросу автора) —
    // ещё 3 тега, найденные при полном сравнении списка тегов в data.js против tagBonus:
    intercept:0.35,  // Xuiqtr — архетипная сигнатура (как provoke/pierce у Dreegan/Mechird), но
                      // ОДНОРАЗОВАЯ на существо (getInterceptor(), interceptUsed) — весит чуть
                      // меньше безусловного provoke(0.4), но выше "истощаемого" taunt_break(0.3)
    stealth:0.3,      // TEANTIST — недостижим ТОЛЬКО до первой собственной атаки (в отличие от
                      // invisible, который отменяется числом соседей, а не действием самой карты) —
                      // разовая защита, вес ниже invisible(0.6)
    thorns:0.3,       // FAERON — урон в ответ атакующему при получении удара; ситуативный контр-дэмag,
                      // тот же уровень, что и taunt_break/stealth
    // Четвёртый проход того же аудита — ETB-триггеры (on_enter, срабатывают ОДИН раз при
    // розыгрыше, не оценивались вообще при выборе карты из руки, хотя цикл ниже уже
    // применяет tagBonus к ЛЮБОМУ тегу карты автоматически — просто не было записи):
    enter_draw:0.5,   // добор 1 карты при входе — разовая версия постоянного draw(0.6), чуть ниже
    enter_heal:0.3,   // хил всем союзникам при входе — разовая версия постоянного heal(0.4), ниже
    enter_lose:0.5,   // соперник сбрасывает карту при входе — разовая версия discard-эффекта,
                      // тот же порядок ценности, что и enter_draw (обе меняют размер руки на 1)
  },
  permanentBuffBonus: 1.0, // spell_buff_temp (ARCHIVE) теперь живёт до смерти существа, а не до конца хода —
                           // старая оценка (только "текущий урон + грубый лефал-чек") недооценивала его, т.к.
                           // раньше это была одноразовая выгода за ход, а теперь постоянное усиление на все
                           // оставшиеся атаки существа. См. CLAUDE.md — ARCHIVE rework.
  // Доп. вес СВЕРХ tagBonus, включается только в соответствующем состоянии
  // гонки (см. aiRaceState()) — т.е. "рискнуть vs сыграть стабильнее".
  stabilizeTagBonus: { provoke:0.5, heal:0.5, regen:0.4 }, // когда 'behind'
  aggroTagBonus:     { fear:0.3, pierce:0.3, burn:0.2, rage:0.2 }, // когда 'ahead'
  squadCompleteBonus: 1.0, // эта копия — 3-я того же gtype на поле → включает Squad-бонус ВСЕЙ группе
  squadBuildBonus: 0.3,    // 1-я/2-я копия — прогресс к Squad-бонусу, но ещё не включает его
  worldArtifactBase: 0.9,
  spellBase: 1.0,
  bounceAheadPenalty: -2,  // не отменять своё же преимущество на поле
  bounceBehindBonus: 2,
  removalKillBonus: 1.0,           // спелл урона реально убивает цель
  removalKillTargetAtkWeight: 0.3, // + за то, НАСКОЛЬКО опасную цель убивает
  removalChipMult: 0.6,            // спелл урона никого не добивает — просто "заполнитель"
  removalChipBehindBonus: 0.5,     // чуть ценнее, если мы уже 'behind' (любой урон помогает)
  buffTargetAtkWeight: 0.2,
  buffLethalBonus: 2.0,            // грубая (без учёта provoke/bushido) оценка "может добить в лицо"
  reviveEmptyGraveyardScore: -0.5,
  reviveEffWeight: 0.5,
  loseEmptyHandScore: -0.5,      // (2026-07-17) зеркало reviveEmptyGraveyardScore — цели нет, карта впустую
  loseHandSizeWeight: 0.25,      // за каждую карту в руке соперника сверх минимума — крупнее рука, ценнее сброс
  aoeCountEmptyBoardScore: -0.5, // (2026-07-17) Board Purge на пустом поле соперника — то же самое, что revive
  aoeCountPerTargetWeight: 0.6,  // за каждое вражеское существо на поле — карта одновременно бьёт СИЛЬНЕЕ (dmg=count) и ШИРЕ (тел больше), отсюда вес выше, чем у loseHandSizeWeight
  provokeBreakStuckAtkWeight: 0.35, // (2026-07-17) EXPOSE/UNMASK — за суммарный effAtk своих существ, которых сейчас форсит вражеский Provoke
  provokeBreakNoStuckScore: -0.5,   // (2026-07-18) ничего из нашего поля СЕЙЧАС не форсится этим Provoke — по прямому запросу автора: не разыгрывать taunt_break "просто так" в качестве неопределённой заготовки, только когда реально нужно обойти танк прямо сейчас
  trampleOverflowWeight: 0.3,       // (2026-07-17) BREACH/RUPTURE — доп. вес за гарантированный перелив в базу сверх обычного removal-килла
  fearAllEmptyBoardScore: -0.5,     // (2026-07-17) Mass Sap на пустом поле соперника — то же самое, что revive/aoe_count
  fearAllPerTargetWeight: 0.5,      // за каждое вражеское существо, которое лишится хода
  fearAllBehindBonus: 1.5,          // доп. ценность, когда мы уже 'behind' — чистый tempo/stabilize эффект
  burnAllEmptyBoardScore: -0.5,     // (2026-07-18) WILDFIRE на пустом поле соперника — зеркало fearAllEmptyBoardScore
  burnAllPerTargetWeight: 0.5,      // за каждое вражеское существо — тот же вес, что у fearAllPerTargetWeight:
                                     // Burn не отнимает ход сразу (это DOT, а не action-denial), но со временем
                                     // либо убивает, либо форсит противника тратить ресурс на Clean — первая
                                     // прикидка, ждёт отдельного баланс-прохода по всем спеллам (см. backlog)
  burnAllBehindBonus: 1.0,          // чуть меньше, чем fearAllBehindBonus (1.5) — DOT не даёт немедленного
                                     // "перевести дыхание" как снятие хода Fear'ом, эффект отложенный
  raceHpBehindThreshold: -4,     // моё HP - вражеское <= это ⇒ 'behind'
  raceHpAheadThreshold: 4,
  racePowerBehindThreshold: -3,  // сумма effAtk моего поля - вражеского
  racePowerAheadThreshold: 3,
};

// ── КОНТЕКСТ ХОДА ─────────────────────────────────────────────────
// 'ahead' / 'even' / 'behind' — по разнице HP баз И суммарной боевой мощи
// полей (не только HP, т.к. можно быть здоровым, но без board presence —
// это тоже "behind" с точки зрения того, что произойдёт в следующие ходы).
function aiRaceState(){
  const w=AI_WEIGHTS;
  const me=G[G.aiFaction], opp=G[G.humanFaction];
  if(!me||!opp) return 'even';
  const myPower=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact).reduce((s,c)=>s+effAtk(c),0);
  const oppPower=opp.field.filter(c=>!c.spell&&!c.world&&!c.artifact).reduce((s,c)=>s+effAtk(c),0);
  const hpDiff=me.hp-opp.hp, powerDiff=myPower-oppPower;
  if(hpDiff<=w.raceHpBehindThreshold || powerDiff<=w.racePowerBehindThreshold) return 'behind';
  if(hpDiff>=w.raceHpAheadThreshold && powerDiff>=w.racePowerAheadThreshold) return 'ahead';
  return 'even';
}

// Сколько существ данного gtype УЖЕ на поле у faction — используется, чтобы
// понять, доиграет ли эта карта группу до Squad-порога (count:3, см.
// SQUAD_DEFS в game.js) прямо сейчас, а не просто быть "ещё одним телом".
function aiGtypeCount(faction, gtype){
  return G[faction].field.filter(c=>
    !c.spell&&!c.world&&!c.artifact&&getTagVal(c,'gtype')===gtype
  ).length;
}

// ── ВЕРСИЯ ИИ ─────────────────────────────────────────────────────
// AI_VERSION формат: "<GAME_VERSION>.<ревизия мозгов>". Префикс (major.minor)
// должен совпадать с GAME_VERSION (js/data.js) — он означает "против какой
// версии игры ai.js последний раз проходил аудит". Третья цифра — ревизия
// самой логики ИИ и бампается при КАЖДОМ улучшении ai.js без изменения игры
// (это происходит чаще, чем меняются карты/механики — см. AI BALANCE NOTES).
// Она попадает в battle_log_*.json как aiVersion, чтобы при разборе лога было
// видно, какие именно "мозги" принимали эти решения.
// Если ПРЕФИКС разошёлся с GAME_VERSION — это сигнал (в консоли и в игровом
// логе), что ИИ мог не узнать о недавних правках игры; ревизия сама по себе
// предупреждение не вызывает.
const AI_VERSION = "1.03.1";
// v1.3.1 (аудит по запросу автора, 2026-07-18, вместе с bump'ом GAME_VERSION до 1.03) —
// полная сверка ai.js против всех правок этой большой сессии (рефактор классик-колоды,
// новые теги/карты, Bolt-фикс, Ward-фикс). Что исправлено:
//   1. Bounce (spell_bounce_target) выбирал цель по effAtk по убыванию — на живой партии
//      это привело к тому, что ИИ сдул дешёвого высокого-ATK Кситра вместо дорогого
//      низкого-ATK TEANTIST (draw-engine), хотя именно TEANTIST болезненнее пересыграть.
//      Bounce — чистый темп-урон "плати за карту заново", приоритет теперь по card.cost
//      (effAtk — только tie-break при равном cost), см. aiResolvePendingSpellTarget().
//   2. Видимость (invisible/нераскрытый stealth) вообще не проверялась ни у одного
//      точечного спелла/активки (Bolt/Shard/spell_dmg_target/spell_bounce_target/
//      spell_provoke_break_target/spell_dmg_trample_target/spell_dispel) — ИИ (и человек,
//      см. game.js onClick()) мог выбрать целью карту, которую физически не видно на
//      поле. Добавлена isSpellTargetable() (game.js) и применена везде, где спелл выбирает
//      цель на вражеской половине поля; для Bounce по СВОЕЙ карте видимость не проверяется
//      (игрок всегда знает, где его собственная invisible/stealth карта).
//   3. taunt_break (EXPOSE/UNMASK) без реально застрявших атакующих (никто из своего поля
//      сейчас не форсится этим Provoke) всё равно получал положительную оценку "неплохая
//      заготовка на будущее" (cost*0.5) — по прямому запросу автора теперь явный минус
//      (provokeBreakNoStuckScore), карта не разыгрывается "просто так".
//   4. spell_fear_all/spell_burn_all считали ВСЕХ вражеских существ целями, включая уже
//      feared/burning (оба булевы и не стакаются — burning вдобавок персистентный, тикает
//      каждый ход, пока не снимут) — ИИ мог переиграть второй экземпляр спелла на поле,
//      которое сам же час назад зафирил/зажёг, без всякой новой пользы. Теперь считаются
//      только НОВЫЕ цели (не ward, ещё не под этим статусом).
//   5. tagBonus не оценивал intercept (архетипная сигнатура Xuiqtr — тот же уровень, что
//      provoke/pierce у других архетипов, но почему-то отсутствовал), stealth/thorns
//      (легендарки TEANTIST/FAERON), и все три ETB-триггера enter_draw/enter_heal/
//      enter_lose (одноразовый эффект при входе на поле, раньше 0 влияния на выбор карты
//      из руки). Добавлены веса всем шести. enter_lose также добавлен в
//      aiWorthBouncingOwn() — та же категория ретриггера при пересыгрыше, что у
//      enter_aoe/enter_heal/enter_draw.
// v1.0.2 (аудит по запросу автора, эта сессия) — движок успел уйти вперёд ai.js на
// несколько сессий без сверки (Броня, Ward, Неукротимость, Инкарнация, Bolt, перманентный
// ARCHIVE, ALTAR-рефилл картой), см. полный разбор в чате/CLAUDE.md. Что исправлено:
//   1. Ward полностью игнорировался — ИИ мог тратить AOE/Shard/точечный урон-спелл на
//      цель, у которой этот урон не сработал бы вообще (см. dmgCard() bypassArmor+ward
//      в game.js). Добавлены проверки во всех четырёх местах (aiTryUseAoe/aiTryUseShard/
//      aiScoreCard spell_dmg_target/aiResolvePendingSpellTarget), плюс aiSpellHasValidTarget().
//   2. Броня не учитывалась в бою — обычная атака НЕ игнорирует Броню (это делают только
//      AOE-активка/Shard/Bolt/точечный спелл), а aiActWithCreature() сравнивал atk только
//      с hp цели, не с hp+armor — мог решить, что удар добивает, хотя часть урона уходила
//      в Броню. Поправлено.
//   3. `bolt:N` (Umbasir, добавлено в движок 2026-07-12) был вообще не знаком ИИ — такие
//      существа просто атаковали как обычные. Добавлен aiTryUseBolt().
//   4. tagBonus не оценивал armor/untamed/incarnation/ward/bolt вообще (0 влияния на выбор
//      карты) — часть этого была прямо отмечена как известный пробел в CLAUDE.md ("Known
//      boundary"). Добавлены веса всем пяти.
//   5. spell_buff_temp (ARCHIVE) теперь постоянный баф (живёт до смерти существа, не до
//      конца хода) — старая оценка карты этого не учитывала, добавлен permanentBuffBonus.
function _warnIfAiVersionStale(){
  if(AI_VERSION===GAME_VERSION || AI_VERSION.startsWith(GAME_VERSION+'.')) return;
  console.warn(`[AI] ai.js was last audited for game v${AI_VERSION}, but this build is v${GAME_VERSION} — the AI's card/mechanic knowledge may be out of date. See CLAUDE.md "AI version tracking".`);
  lg(`⚠ AI logic last verified for v${AI_VERSION} (game is v${GAME_VERSION}) — some AI decisions may not account for recent changes.`, 'hint');
}

// ── МУЛЛИГАН ──────────────────────────────────────────────────────
// Простая эвристика: если в стартовой руке нет ни одной карты дешевле
// 3 эссенции — берём один муллиган (максимум один, без раздумий).
function aiAutoMulligan(faction){
  _warnIfAiVersionStale();
  const p = G[faction];
  if(!p) return;
  const cheap = p.hand.filter(c => c.cost <= 2).length;
  if(cheap === 0 && G.mulligan[faction].used < 1){
    doMulligan(faction);
  }
}

// ── UI-баннер "ИИ думает" ───────────────────────────────────────────
// ОТКЛЮЧЕНО: по новому ТЗ во время хода ИИ никакой всплывающей надписи в хедере
// не показываем — вместо этого кнопка End Turn у игрока подменяется на
// плейсхолдер ожидания (см. updateEndTurnBtn() в render.js).
function showAiBanner(show){
  // no-op
}

// ── ГЛАВНЫЙ ВХОД ────────────────────────────────────────────────────
function runAiTurn(){
  if(!isAiTurn() || G.gameOver) return;
  showAiBanner(true);
  aiTryBurnCard();
  setTimeout(() => aiPlayCardsStep(0), 450);
}

// ── ЭКОНОМИКА: сжечь карту за эссенцию ──────────────────────────────
// Два триггера (в порядке приоритета):
//
// 1) РАЗБЛОКИРОВКА ХОДА (добавлено после аудита 7 логов, сессия 2026-07-06,
//    см. AI BALANCE NOTES) — если СЕЙЧАС нечего разыграть, но +1 эссенции от
//    сжигания открывает какую-то карту в руке, жжём худшую из НЕ-открываемых.
//    Найдено дважды в одном логе ([9545] T1 и T3): ИИ сидел с полной рукой
//    неаффордабельных карт в 1 эссенции от розыгрыша и не жёг НИЧЕГО, потому
//    что старый триггер смотрел только на "ценность карты при розыгрыше"
//    (worstScore<1.5) — а дорогие неиграбельные карты по этой шкале всегда
//    оцениваются высоко, так что порог не срабатывал именно тогда, когда burn
//    нужнее всего. Тот же принцип "unlock a play", что уже был у Altar
//    (aiTryUseSacrifice) — теперь и у burn.
//
// 2) ЧИСТКА МУСОРА (исходная логика) — рука большая и худшая карта объективно
//    слабая (worstScore<1.5) — жжём её ради роста эссенции.
//
// Общие ограничения прежние: максимум 1 burn/ход (лимит игрока), никогда
// не жжём легендарку, не жжём из руки меньше 4 карт.
function aiTryBurnCard(){
  const me = G[G.aiFaction];
  if(!me || me.burned) return;

  // Триггер 0: "мёртвая рука" — КАЖДАЯ карта в руке оценивается отрицательно
  // (напр. единственный World/Artifact, когда такой уже активен — aiScoreCard()
  // намеренно даёт -1, это не баг сам по себе). Раньше это могло привести к
  // ПОСТОЯННОМУ затыку: карту нельзя ни сыграть (score<0 → aiPickBestCard()
  // её не выберет), ни сжечь (обычный триггер ниже требует hand.length>=4) —
  // рука просто копит бесполезные карты до конца игры. Здесь порог по размеру
  // руки НЕ проверяем — держать мёртвую руку размером хоть в 1 карту строго
  // хуже, чем превратить её в эссенцию. Найдено автором в спектаторских логах
  // ("будто ждёт чего-то") и подтверждено прогоном игр напрямую.
  if(me.hand.length > 0 && me.hand.every(c => c.unique || aiScoreCard(c, me) < 0)){
    const nonUnique = me.hand.filter(c => !c.unique);
    if(nonUnique.length > 0){
      let worst=null, worstScore=Infinity;
      nonUnique.forEach(c=>{
        const s = aiScoreCard(c, me);
        if(s < worstScore){ worstScore = s; worst = c; }
      });
      if(worst){ doBurnCard(worst); return; }
    }
  }

  if(me.hand.length < 4) return; // держим минимум вариантов, не сжигаем из тонкой руки

  // Триггер 1: разблокировка хода.
  const fieldFullForUnlock = me.field.length >= 6;
  const affordableNow = me.hand.some(c => c.cost <= me.ess && aiSpellHasValidTarget(c) && !(fieldFullForUnlock && !c.spell && !c.world && !c.artifact));
  if(!affordableNow){
    const unlockables = me.hand.filter(c => c.cost === me.ess+1 && aiSpellHasValidTarget(c) && !(fieldFullForUnlock && !c.spell && !c.world && !c.artifact));
    if(unlockables.length > 0){
      const unlockIds = new Set(unlockables.map(c=>c.id));
      // Жжём худшую карту среди НЕ-открываемых (открываемые — то, ради чего
      // жжём, их не трогаем). Если вся не-легендарная рука состоит из
      // открываемых (unlikely), жжём худшую из них, кроме единственной
      // оставшейся — сжечь последнюю значило бы сжечь сам смысл действия.
      let cand=null, candScore=Infinity;
      me.hand.forEach(c=>{
        if(c.unique) return;
        if(unlockIds.has(c.id)) return;
        const s = aiScoreCard(c, me);
        if(s < candScore){ candScore = s; cand = c; }
      });
      if(!cand && unlockables.length > 1){
        unlockables.forEach(c=>{
          if(c.unique) return;
          const s = aiScoreCard(c, me);
          if(s < candScore){ candScore = s; cand = c; }
        });
      }
      if(cand){ doBurnCard(cand); return; }
    }
  }

  // Триггер 2: чистка мусора (как было).
  let worst=null, worstScore=Infinity;
  me.hand.forEach(c=>{
    if(c.unique) return; // never burn a legendary, no matter how the formula scores it
    const s = aiScoreCard(c, me);
    if(s < worstScore){ worstScore = s; worst = c; }
  });
  if(!worst) return;
  // Порог ~1.5 — примерно "существо ниже среднего КПД" по шкале aiScoreCard;
  // не жжём карту, если даже худшая в руке выглядит неплохо.
  if(worstScore < 1.5) doBurnCard(worst);
}

// ── ФАЗА 1: розыгрыш карт из руки ────────────────────────────────
function aiPlayCardsStep(iter){
  if(!isAiTurn()){ showAiBanner(false); return; }
  if(iter > 20){ // защита от бесконечного цикла (не должно происходить)
    aiTryUseSacrifice();
    aiRunActivesThenAttack();
    return;
  }
  let card;
  try{
    card = aiPickBestCard();
  }catch(e){
    console.error('AI aiPickBestCard() threw — skipping to attack phase this turn:', e);
    card = null;
  }
  if(!card){
    // Altar can free up exactly the essence needed for a card we were just
    // about to give up on — if it fires, loop back into the play step instead
    // of falling straight through to AOE/Shard/attack, so that essence
    // actually gets spent this turn instead of sitting unused.
    if(aiTryUseSacrifice()){
      setTimeout(() => aiPlayCardsStep(iter + 1), AI_STEP_DELAY);
      return;
    }
    aiRunActivesThenAttack();
    return;
  }
  try{
    doPlay(card);
    // doPlay() may have paused in a targeting phase for the new targeted spells
    // (Archive/Journey/Oblivion) — AI never clicks anything, so resolve it here
    // immediately or the AI turn would hang forever waiting for a target.
    aiResolvePendingSpellTarget();
  }catch(e){
    console.error(`AI doPlay() threw while playing ${card.name} — recovering:`, e);
    // If something died mid-play leaving a spell target phase open, don't let
    // it block the rest of the turn forever.
    if(G.pendingSpell&&typeof cancelPendingSpell==='function') cancelPendingSpell();
  }
  setTimeout(() => aiPlayCardsStep(iter + 1), AI_STEP_DELAY);
}

// Резолвит таргетинг спелла, который AI только что сыграл (doPlay поставил
// G.phase в одну из spellXTarget фаз и ждёт клика — которого от AI не будет).
function aiResolvePendingSpellTarget(){
  const humanF=G.humanFaction;
  if(G.phase==='spellDmgTarget'){
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
    if(targets.length===0){ cancelPendingSpell(); return; }
    const dmg=getTagVal(G.pendingSpell,'spell_dmg_target')||3;
    const killable=targets.filter(c=>dmg>=(c.hp+(c.feared?0:0)));
    const pool=killable.length>0?killable:targets;
    pool.sort((a,b)=>effAtk(b)-effAtk(a));
    doSpellDmgTarget(pool[0]);
    return;
  }
  if(G.phase==='spellBuffTarget'){
    const mine=G[G.aiFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted&&!c.feared);
    if(mine.length===0){ cancelPendingSpell(); return; }
    mine.sort((a,b)=>effAtk(b)-effAtk(a)); // buff the hardest hitter that can still act
    doSpellBuffTarget(mine[0]);
    return;
  }
  if(G.phase==='spellArmorTarget'){
    const mine=G[G.aiFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.feared);
    if(mine.length===0){ cancelPendingSpell(); return; }
    // Приоритет — самый живучий/опасный союзник, не обязательно готовый к действию в этот
    // же ход (в отличие от spell_buff_temp): броня — защитный, а не темповый бонус, ценнее
    // всего именно на существе, которое и дальше будет держать удар.
    mine.sort((a,b)=>effAtk(b)-effAtk(a));
    doSpellArmorTarget(mine[0]);
    return;
  }
  if(G.phase==='spellDispelTarget'){
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&isSpellTargetable(c));
    if(targets.length===0){ cancelPendingSpell(); return; }
    targets.sort((a,b)=>effAtk(b)-effAtk(a));
    doSpellDispelTarget(targets[0]);
    return;
  }
  if(G.phase==='spellUntapTarget'){
    const candidates=G[G.aiFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&(c.sleeping||c.exhausted));
    if(candidates.length===0){ cancelPendingSpell(); return; }
    candidates.sort((a,b)=>effAtk(b)-effAtk(a)); // reactivate the hardest hitter
    doSpellUntapTarget(candidates[0]);
    return;
  }
  if(G.phase==='spellBounceTarget'){
    // Приоритет — бounce САМОЙ ДОРОГОЙ (по cost) карты человека, а не самой атакующей.
    // 2026-07-18 (по прямому запросу автора, поймано на живой партии — ИИ сдул дешёвого
    // Кситра вместо дорогого Тентиста): Bounce — это чистый темп-урон "плати за карту
    // заново", ценность которого прямо пропорциональна TCG-стоимости карты (сколько
    // эссенции придётся отдать повторно), а НЕ её боевой силе — низкий-ATK/высокий-cost
    // "движковый" юнит типа TEANTIST (draw-engine) намного болезненнее пересыграть, чем
    // дешёвого атакующего с большим ATK. effAtk остаётся tie-break при равном cost.
    // Видимость (invisible/нераскрытый stealth) проверяется ТОЛЬКО для вражеской стороны.
    const enemyTargets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&isSpellTargetable(c));
    if(enemyTargets.length>0){
      enemyTargets.sort((a,b)=>(b.cost-a.cost)||(effAtk(b)-effAtk(a)));
      doSpellBounceTarget(enemyTargets[0]);
      return;
    }
    const ownTargets=G[G.aiFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact && aiWorthBouncingOwn(c));
    if(ownTargets.length===0){ cancelPendingSpell(); return; }
    // Среди подходящих — сперва vanguard-редетаплой (сразу доп.атака тем же ходом),
    // затем среди прочих (on-enter эффект) подешевле — меньше жалко пересыграть.
    ownTargets.sort((a,b)=>{
      const va=hasTag(a,'vanguard')&&a.exhausted, vb=hasTag(b,'vanguard')&&b.exhausted;
      if(va!==vb) return va?-1:1;
      return a.cost-b.cost;
    });
    doSpellBounceTarget(ownTargets[0]);
    return;
  }
  if(G.phase==='spellProvokeBreakTarget'){
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&c.tags.includes('provoke')&&!c.provokeBroken&&isSpellTargetable(c));
    if(targets.length===0){ cancelPendingSpell(); return; }
    // Только одна Provoke-цель обычно и бывает разом (см. aiSpellHasValidTarget) — если
    // вдруг больше одной, берём самую опасную (effAtk), как и везде выше.
    targets.sort((a,b)=>effAtk(b)-effAtk(a));
    doSpellProvokeBreakTarget(targets[0]);
    return;
  }
  if(G.phase==='spellDmgTrampleTarget'){
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
    if(targets.length===0){ cancelPendingSpell(); return; }
    const dmg=getTagVal(G.pendingSpell,'spell_dmg_trample_target')||5;
    const killable=targets.filter(c=>dmg>=(c.hp+(c.armor||0)));
    const pool=killable.length>0?killable:targets;
    pool.sort((a,b)=>effAtk(b)-effAtk(a)); // strongest killable, or just strongest chip target
    doSpellDmgTrampleTarget(pool[0]);
    return;
  }
}

// ── АКТИВКА: AOE (Umbasir) ───────────────────────────────────────
// AI никогда не использовал эту активку — существо просто атаковало как
// обычное, хотя у него есть "Active: AOE dmg" по всем врагам сразу.
// Стоит того, если убивает хотя бы одного, или бьёт 2+ целей сразу.
// Возвращает true, если хотя бы одно существо реально сработало — вызывающий
// код (aiRunActivesThenAttack) использует это, чтобы поставить паузу перед
// следующим действием ТОЛЬКО если это действие реально произошло.
function aiTryUseAoe(){
  const me=G[G.aiFaction];
  const humanF=G.humanFaction;
  const enemyField=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
  if(enemyField.length===0) return false;
  // Ward — полный иммунитет именно к этой категории урона (bypassArmor=true, см.
  // dmgCard() в game.js) — считаем ценность AOE только по НЕ-warded целям.
  const vulnerableField=enemyField.filter(c=>!hasTag(c,'ward'));
  if(vulnerableField.length===0) return false; // всё поле противника под Ward — активка ничего не даст
  const aoeCreatures=me.field.filter(c=>hasTag(c,'aoe')&&!c.exhausted&&!c.sleeping&&!c.feared&&!c.spell&&!c.world&&!c.artifact);
  let used=false;
  aoeCreatures.forEach(umb=>{
    if(umb.exhausted) return; // could've been used by a squad-shared check already
    const dmgAmt=(umb.squadParam&&umb.squadParam.aoe)||getTagVal(umb,'aoe')||1;
    const kills=vulnerableField.filter(c=>c.hp<=dmgAmt).length;
    if(kills>0||vulnerableField.length>=2){
      G.sel=umb.id;
      doUmbAsir();
      used=true;
    }
  });
  return used;
}

// ── АРТЕФАКТ: SHARD (прямой урон) ────────────────────────────────
// AI никогда этим не пользовался. Бьём, если можем добить существо (учитывая
// +1 урона от feared), иначе — самую опасную цель по эффективному ATK.
function aiTryUseShard(){
  const me=G[G.aiFaction];
  const shard=me.artifacts.find(a=>hasTag(a,'shard')&&!a.exhausted&&!a.sleeping);
  if(!shard) return false;
  const humanF=G.humanFaction;
  // Ward блокирует Shard целиком (тоже bypassArmor=true) — не тратим активку на них.
  // Видимость (2026-07-18): invisible/нераскрытый stealth тоже нельзя выбрать целью.
  const enemyField=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
  if(enemyField.length===0) return false;
  const baseDmg=shardBaseDmg(shard,humanF);
  // 2026-07-17: no more per-target feared bonus on top — shardBaseDmg() already folds
  // that into shard_fear_scale's count (see game.js comment on doShardTarget). dmg is now
  // the SAME flat number for every candidate, so this is really just picking the most
  // dangerous killable target — kept as a map for minimal diff against the pre-existing
  // killable/sort logic below.
  const withDmg=enemyField.map(c=>({c, dmg: baseDmg}));
  const killable=withDmg.filter(x=>x.dmg>=x.c.hp);
  let target;
  if(killable.length>0){
    killable.sort((a,b)=>effAtk(b.c)-effAtk(a.c));
    target=killable[0].c;
  } else {
    withDmg.sort((a,b)=>effAtk(b.c)-effAtk(a.c));
    target=withDmg[0].c;
  }
  doShard(shard);
  doShardTarget(target);
  return true;
}

// ── АКТИВКА: BOLT (Umbasir, точечный магический урон существом) ─
// Добавлено 2026-07-12 в движок (см. CLAUDE.md), но ИИ об этом не знал вообще —
// такие Umbasir просто атаковали как обычные существа. В отличие от Shard/AOE
// (артефакт/бесплатная активка), использование Bolt тратит атаку этого же
// существа за ход — так что это НЕ безусловно "лучше", это выбор между двумя
// взаимоисключающими действиями. Используем Bolt ТОЛЬКО когда обычная атака
// этим же существом не даёт того же килла — либо потому что Provoke/Bushido
// заставили бы бить другую цель, либо потому что собственного ATK не хватает
// там, где хватает Bolt-урона.
function aiTryUseBolt(){
  const me=G[G.aiFaction];
  const humanF=G.humanFaction;
  const oppField=G[humanF].field;
  // Ward блокирует Bolt целиком (тоже bypassArmor=true) — исключаем warded цели.
  // Видимость (2026-07-18): invisible/нераскрытый stealth тоже нельзя выбрать целью.
  const enemyField=oppField.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
  if(enemyField.length===0) return false;
  const boltCreatures=me.field.filter(c=>hasTag(c,'bolt')&&!c.exhausted&&!c.sleeping&&!c.feared&&!c.spell&&!c.world&&!c.artifact);
  let used=false;
  boltCreatures.forEach(bolt=>{
    if(bolt.exhausted) return; // could've acted already earlier in this same pass
    const baseDmg=(bolt.squadParam&&bolt.squadParam.bolt)||getTagVal(bolt,'bolt')||1;
    const withDmg=enemyField.map(c=>({c, dmg: baseDmg}));
    const killable=withDmg.filter(x=>x.dmg>=x.c.hp);
    // 0-ATK bolt bodies (e.g. TRAVELER #52/#6/#54 — pure Umbasir utility, atk:0):
    // a normal attack from these does NOTHING (0 dmg, and a full counter-attack
    // eaten for free if Provoke/Bushido forces a creature fight) — Bolt's chip
    // damage is strictly better even without a guaranteed kill, so these don't
    // need the "killable" gate at all.
    if(effAtk(bolt)<=0){
      if(enemyField.length===0) return;
      const pool=killable.length>0?killable:withDmg;
      pool.sort((a,b)=>effAtk(b.c)-effAtk(a.c));
      G.sel=bolt.id;
      doUmbBolt();
      doBoltTarget(pool[0].c);
      used=true;
      return;
    }
    if(killable.length===0){
      // Чиповый Bolt без килла (2026-07-18, по просьбе автора) — раньше функция
      // тут просто выходила, и существо шло в обычную атаку через aiAttackStep().
      // Но если ATK этого Umbasir'а НЕ БОЛЬШЕ урона от Bolt — обычная атака не
      // дала бы никакого преимущества в уроне (то же самое 1 dmg, или меньше),
      // зато ловит контратаку на ровном месте — Bolt магический, ответки не
      // бывает в принципе. В этом случае лучше потыкать Bolt'ом самую опасную
      // вражескую карту (сортировка по effAtk, тот же принцип, что и в killable-
      // ветке ниже), вместо бессмысленного размена жизнью. Если ATK строго
      // БОЛЬШЕ baseDmg — оставляем как было (return ниже, ничего не делаем
      // здесь) — там обычная атака реально сильнее и Bolt лучше поберечь.
      if(effAtk(bolt)<=baseDmg && enemyField.length>0){
        const pool=[...withDmg];
        pool.sort((a,b)=>effAtk(b.c)-effAtk(a.c));
        G.sel=bolt.id;
        doUmbBolt();
        doBoltTarget(pool[0].c);
        used=true;
      }
      return; // не тратим ход на чип-урон, когда атака и так была бы сильнее
    }
    killable.sort((a,b)=>effAtk(b.c)-effAtk(a.c));
    const target=killable[0].c;
    // Provoke rework (2026-07-17): pierce no longer exempt from forced-target (see
    // canAttackBase()/getTargetableCards() in game.js) — the `!hasTag(bolt,'pierce')`
    // exception here was leftover from before that rework and never updated, same bug
    // class as the provokeBroken miss just below (found + fixed together, 2026-07-17).
    const forced = oppField.some(c=>hasTag(c,'bushido')) ||
      oppField.some(c=>c.tags.includes('provoke') && !c.provokeBroken);
    const normalWouldKillSameTarget = !forced && effAtk(bolt)>=target.hp;
    if(!normalWouldKillSameTarget){
      G.sel=bolt.id;
      doUmbBolt();
      doBoltTarget(target);
      used=true;
    }
  });
  return used;
}

// Раньше AOE и Shard активки, а следом первая атака в очереди — все три —
// срабатывали в одном синхронном тике, без единой паузы между ними (в отличие
// от паузы AI_STEP_DELAY, которая всегда стоит между розыгрышем карт и между
// последующими атаками). Из-за этого выглядело, будто ИИ делает два действия
// разом: анимация атаки только начиналась, а существо уже добито активкой —
// см. фидбек 2026-07-xx ("два действия за раз"). Эта функция — единая точка
// входа вместо разрозненных вызовов aiTryUseAoe()/aiTryUseShard()/
// aiAttackStep() — ставит AI_STEP_DELAY между шагами, но ТОЛЬКО если шаг
// реально что-то сделал (не ждём просто так, если активки не было).
// ИЗВЕСТНОЕ УПРОЩЕНИЕ: если на поле несколько AOE-существ одновременно,
// aiTryUseAoe() всё ещё активирует их все в одном тике (см. её собственный
// forEach) — это редкий кейс (нужно 2+ Umbasir одновременно), не покрыт этим
// фиксом, оставлен как есть.
function aiRunActivesThenAttack(){
  const usedAoe=aiTryUseAoe();
  setTimeout(()=>{
    const usedShard=aiTryUseShard();
    setTimeout(()=>{
      const usedBolt=aiTryUseBolt();
      setTimeout(()=>{
        aiAttackStep(getAiCreatureQueue(), 0);
      }, usedBolt?AI_STEP_DELAY:0);
    }, usedShard?AI_STEP_DELAY:0);
  }, usedAoe?AI_STEP_DELAY:0);
}

// ── АРТЕФАКТ: ALTAR (жертва существа за эссенцию) ────────────────
// AI никогда этим не пользовался — точно тот же класс пробела, что раньше
// был у AOE/Shard: рабочая Active-способность, которую ничто в игровом цикле
// ИИ не вызывало (активация Altar — это не отдельная doXxx()-функция, а
// просто G.sel/G.phase='sacrificeTarget', см. onClick() в game.js). Жертвуем,
// только если это реально освобождает эссенцию под карту, которую иначе
// в этот ход не разыграть, и только худшим по aiScoreCard существом (никогда
// легендарку, никогда — если это оставит поле пустым). Возвращает true, если
// сработало — aiPlayCardsStep() в этом случае возвращается к розыгрышу карт,
// а не сразу к атаке, чтобы освободившаяся эссенция не пропала впустую.
function aiTryUseSacrifice(){
  const me=G[G.aiFaction];
  const altar=me.artifacts.find(a=>hasTag(a,'sacrifice')&&!a.exhausted&&!a.sleeping);
  if(!altar) return false;
  const creatures=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact);
  if(creatures.length<2) return false; // никогда не жертвуем последнее существо

  const unlocked=me.hand.some(c=>c.cost===me.ess+1 && aiSpellHasValidTarget(c));
  if(!unlocked) return false; // +1 эссенции сейчас ничего не открывает — не трогаем Altar

  let worst=null, worstScore=Infinity;
  creatures.forEach(c=>{
    if(c.unique) return; // легендарку в жертву не приносим ни при каком счёте
    const s=aiScoreCard(c,me);
    if(s<worstScore){ worstScore=s; worst=c; }
  });
  if(!worst || worstScore>=1.2) return false; // на поле нет явно слабого существа

  G.sel=altar.id;
  G.phase='sacrificeTarget';
  doSacrifice_target(worst);
  return true;
}

// Проверяет, есть ли у целевого спелла хотя бы одна допустимая цель ПРЯМО
// сейчас — если нет, aiPickBestCard() не должен его вообще рассматривать,
// иначе он будет выбран как "лучшая карта", разыгран, тут же отменён
// (cancelPendingSpell — нет цели) и выбран СНОВА на следующей итерации —
// до 20 раз подряд, не давая ИИ дойти до других карт в руке в принципе.
// 2026-07-16: раньше AI баунсил СВОЮ дешёвую карту просто чтобы не "потратить спелл
// впустую", когда у врага не было целей — само по себе это чистый минус (теряешь тело
// с поля, платишь за карту заново без всякой пользы). Стоит того ТОЛЬКО если повторный
// розыгрыш реально что-то даёт: on-enter эффект (draw/heal/aoe при входе — retrigger)
// или vanguard, который уже отходил в этот ход и может ударить СНОВА (vanguard
// игнорирует sleeping — редетаплой = дополнительная атака тем же ходом).
function aiWorthBouncingOwn(c){
  return hasTag(c,'enter_aoe') || hasTag(c,'enter_heal') || hasTag(c,'enter_draw') ||
         hasTag(c,'enter_lose') ||
         (hasTag(c,'vanguard') && c.exhausted);
}

function aiSpellHasValidTarget(card){
  if(!card.spell) return true;
  const humanF=G.humanFaction;
  if(hasTag(card,'spell_dmg_target')){
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
  }
  if(hasTag(card,'spell_dispel')){
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact&&isSpellTargetable(c));
  }
  if(hasTag(card,'spell_buff_temp')){
    return G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted&&!c.feared);
  }
  if(hasTag(card,'spell_armor_temp')){
    // Та же relaxed-таргетинг правка, что и у spell_buff_temp (2026-07-15) — sleeping/
    // exhausted валидны, только feared исключён.
    return G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact&&!c.feared);
  }
  if(hasTag(card,'spell_untap')){
    return G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact&&(c.sleeping||c.exhausted));
  }
  if(hasTag(card,'spell_bounce_target')){
    // Цель любая сторона — но СВОЮ карту бaунсить валидно только если это реально того
    // стоит (aiWorthBouncingOwn), а не просто "чтобы не потратить спелл впустую". Видимость
    // (invisible/нераскрытый stealth) проверяется ТОЛЬКО для вражеской стороны — свою карту
    // ИИ всегда "видит" (2026-07-18).
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact&&isSpellTargetable(c)) ||
           G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact && aiWorthBouncingOwn(c));
  }
  if(hasTag(card,'spell_provoke_break_target')){
    // Только реальные непогашенные Provoke-цели — как и click-хендлер в game.js, тут нет
    // смысла "промахиваться" мимо любой другой карты.
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact&&c.tags.includes('provoke')&&!c.provokeBroken&&isSpellTargetable(c));
  }
  if(hasTag(card,'spell_dmg_trample_target')){
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&isSpellTargetable(c));
  }
  if(hasTag(card,'revive')){
    // 2026-07-16: воскрешённая карта всегда идёт на СВОЁ поле кастующего (см. reviveCard()
    // в game.js) — лимит 6 существ поэтому проверяем только у AI, независимо от того, чьё
    // кладбище (a.any позволяет тянуть и из чужого). Без этой проверки AI раз за разом
    // пытался бы скастовать спелл, который тут же физзлит (см. doPlay() в game.js).
    return G[G.aiFaction].field.length < 6;
  }
  return true;
}

function aiPickBestCard(){
  const me = G[G.aiFaction];
  // 2026-07-16: лимит поля 6 существ (см. doPlay() в game.js) — существо сверх лимита
  // просто не сыграется (essence не спишется, карта останется в руке), поэтому при
  // полном поле его вообще нельзя пускать в число "доступных" кандидатов: иначе AI
  // раз за разом выбирает ЭТУ ЖЕ карту (aiScoreCard её не штрафует за нехватку места),
  // doPlay() молча ничего не делает, и цикл aiPlayCardsStep впустую крутится до
  // iter>20 (до ~11 секунд по AI_STEP_DELAY), вместо того чтобы сразу пойти
  // разыгрывать заклинания/Мир/Артефакт или переходить к атаке.
  const fieldFull = me.field.length >= 6;
  const affordable = me.hand.filter(c => c.cost <= me.ess && aiSpellHasValidTarget(c) && !(fieldFull && !c.spell && !c.world && !c.artifact));
  if(affordable.length === 0) return null;
  let best = null, bestScore = -Infinity;
  affordable.forEach(c => {
    const s = aiScoreCard(c, me);
    if(s > bestScore){ bestScore = s; best = c; }
  });
  if(bestScore < 0) return null; // нет смысла играть (напр. второй Мир/Артефакт)
  return best;
}

// Оценка карты — теперь смотрит не только на саму карту, но и на контекст:
// что уже на поле (Squad-прогресс), на счёт гонки (risk vs stable), и, для
// таргетированных спеллов, на РЕАЛЬНУЮ лучшую цель, а не только на факт
// "цель существует" (это отдельно проверяет aiSpellHasValidTarget).
function aiScoreCard(card, me){
  const w=AI_WEIGHTS;

  if(card.world)    return me.world ? -1 : (card.cost * w.worldArtifactBase + 1);
  if(card.artifact) return (me.artifacts && me.artifacts.length > 0) ? -1 : (card.cost * w.worldArtifactBase + 1);

  if(card.spell){
    if(hasTag(card,'bounce')){
      // Bounce sends EVERY creature (both sides) back to hand — only good for
      // the side that's currently behind on board, never for the one ahead.
      const humanF=G.humanFaction;
      const myBoard=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact).length;
      const theirBoard=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact).length;
      return theirBoard>myBoard+1 ? (card.cost*w.spellBase+w.bounceBehindBonus) : w.bounceAheadPenalty;
    }

    if(hasTag(card,'spell_dmg_target')){
      const dmg=getTagVal(card,'spell_dmg_target')||3;
      const targets=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward'));
      if(targets.length===0) return -1; // aiSpellHasValidTarget should already exclude this case
      const killable=targets.filter(t=>dmg>=t.hp);
      if(killable.length>0){
        // Value scales with HOW dangerous the thing we can kill is, not just
        // "a kill exists" — removal on a vanilla 1/1 is much weaker than the
        // same removal on the opponent's best attacker.
        const best=killable.reduce((a,b)=>effAtk(b)>effAtk(a)?b:a);
        return card.cost*w.spellBase + w.removalKillBonus + effAtk(best)*w.removalKillTargetAtkWeight;
      }
      // Can't finish anything off this turn — still chip damage/setup, worth
      // more when we're already behind and need any pressure we can get.
      const race=aiRaceState();
      return card.cost*w.spellBase*w.removalChipMult + (race==='behind'?w.removalChipBehindBonus:0);
    }

    if(hasTag(card,'spell_buff_temp')){
      const buffAmt=getTagVal(card,'spell_buff_temp')||2;
      const mine=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted&&!c.feared);
      if(mine.length===0) return -1; // aiSpellHasValidTarget should already exclude this
      const best=mine.reduce((a,b)=>effAtk(b)>effAtk(a)?b:a);
      const opp=G[G.humanFaction];
      // Rough lethal check — ignores provoke/bushido forced-target rules on
      // purpose (this is a scoring estimate, not the actual attack, which
      // still resolves through the normal forced-target logic either way).
      const roughLethal = opp && (effAtk(best)+buffAmt) >= opp.hp;
      return card.cost*w.spellBase + effAtk(best)*w.buffTargetAtkWeight + w.permanentBuffBonus + (roughLethal?w.buffLethalBonus:0);
    }

    if(hasTag(card,'revive')){
      const grave=(me.grave||[]).filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.voided);
      if(grave.length===0) return w.reviveEmptyGraveyardScore; // aiSpellHasValidTarget doesn't cover revive — still playable, just wasted
      const target=grave[grave.length-1]; // same "last in graveyard" the actual revive effect uses
      const def=DEFS[target.key];
      const revivedEff=def ? (def.hp + def.atk*w.atkVsHpRatio)/Math.max(1,def.cost) : 1;
      return card.cost*w.spellBase*0.5 + revivedEff*w.reviveEffWeight;
    }

    if(hasTag(card,'lose')){
      // (2026-07-17, "SWARM CULL"-adjacent discard spell) Mirrors revive's empty-graveyard
      // handling: an empty opponent hand means this card would resolve as a pure whiff
      // (see 'lose' execution case in abilities.js — silently no-ops on empty hand), so
      // score it same as an empty-graveyard revive rather than the flat generic baseline.
      // Otherwise scales a little with how big the opponent's hand currently is — ripping
      // 2 cards out of a stacked 6-card hand is worth more than doing it to a hand of 1.
      const oppHandSize=G[G.humanFaction].hand.length;
      if(oppHandSize===0) return w.loseEmptyHandScore;
      return card.cost*w.spellBase + Math.min(oppHandSize,getTagVal(card,'lose')||1)*w.loseHandSizeWeight;
    }

    if(hasTag(card,'spell_aoe_count')){
      // Board Purge (2026-07-17) — self-balancing by design (dmg = enemy creature count,
      // see abilities.js case 'aoe_count'), so its score has to scale the same way instead
      // of the flat generic fallback below, or the AI will happily fire it into an empty
      // board for a guaranteed whiff, or hold it back against a packed one.
      const enemyCount=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact).length;
      if(enemyCount===0) return w.aoeCountEmptyBoardScore;
      return card.cost*w.spellBase + enemyCount*w.aoeCountPerTargetWeight;
    }

    if(hasTag(card,'spell_armor_temp')){
      // BULWARK/CARAPACE (2026-07-17) — same shape as spell_buff_temp's scoring, minus the
      // lethal-check (armor doesn't threaten the opponent's face) and using effAtk as a proxy
      // for "worth protecting" rather than "worth buffing offensively" — a defensive bonus is
      // most valuable on the creature that's both dangerous AND likely to keep tanking hits.
      const mine=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.feared);
      if(mine.length===0) return -1; // aiSpellHasValidTarget should already exclude this case
      const best=mine.reduce((a,b)=>effAtk(b)>effAtk(a)?b:a);
      return card.cost*w.spellBase + effAtk(best)*w.buffTargetAtkWeight + w.permanentBuffBonus;
    }

    if(hasTag(card,'spell_provoke_break_target')){
      // EXPOSE/UNMASK (2026-07-17) — aiSpellHasValidTarget() already guarantees a live
      // Provoke target exists, so no empty-check needed here (unlike lose/aoe_count, which
      // can legally resolve into a no-op the AI itself chooses to walk into). Value comes
      // entirely from how much of OUR OWN board is currently forced onto that Provoke
      // creature instead of reaching the enemy base/better targets — the more/stronger our
      // stuck attackers, the more this is worth clearing right now instead of later.
      const stuck=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted&&!c.feared);
      if(stuck.length===0) return w.provokeBreakNoStuckScore; // ничего сейчас не форсится этим Provoke — нет причины трогать его именно сейчас
      const totalStuckAtk=stuck.reduce((sum,c)=>sum+effAtk(c),0);
      return card.cost*w.spellBase + totalStuckAtk*w.provokeBreakStuckAtkWeight;
    }

    if(hasTag(card,'spell_dmg_trample_target')){
      // BREACH/RUPTURE (2026-07-17) — same shape as spell_dmg_target's scoring above, plus
      // the overflow makes even an already-lethal kill worth a little extra (the excess
      // isn't wasted like a plain spell_dmg_target overkill would be).
      const dmg=getTagVal(card,'spell_dmg_trample_target')||5;
      const targets=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward'));
      if(targets.length===0) return -1; // aiSpellHasValidTarget should already exclude this case
      const killable=targets.filter(t=>dmg>=(t.hp+(t.armor||0)));
      if(killable.length>0){
        const best=killable.reduce((a,b)=>effAtk(b)>effAtk(a)?b:a);
        const overflow=Math.max(0,dmg-(best.hp+(best.armor||0)));
        return card.cost*w.spellBase + w.removalKillBonus + effAtk(best)*w.removalKillTargetAtkWeight + overflow*w.trampleOverflowWeight;
      }
      const race=aiRaceState();
      return card.cost*w.spellBase*w.removalChipMult + (race==='behind'?w.removalChipBehindBonus:0);
    }

    if(hasTag(card,'spell_fear_all')){
      // STILLNESS/NIGHTMARE (2026-07-17, "Mass Sap") — reuses the Fear engine board-wide
      // (see abilities.js case 'fear_all'), so like aoe_count its value scales with the
      // enemy board rather than a flat baseline: denying 1 creature's turn is a minor
      // tempo play, denying 4-5 is close to a one-sided board wipe for a turn. Extra bump
      // when we're 'behind' — this is a pure defensive/stabilizing tempo card, worth more
      // exactly when we need a turn to breathe.
      // 2026-07-18 (по прямому запросу автора): считаем только НОВЫХ целей — исключаем
      // ward (иммунны, эффект их вообще не заденет) И уже-feared (recast поверх уже
      // испуганной цели ничего не добавляет, card.feared — булев флаг, не стакается).
      // Без этого фильтра ИИ повторно кастовал mass-fear на поле, которое он же сам
      // только что зафировал, оценивая это так же высоко, как первый каст.
      const enemies=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&!c.feared);
      if(enemies.length===0) return w.fearAllEmptyBoardScore;
      const race=aiRaceState();
      return card.cost*w.spellBase + enemies.length*w.fearAllPerTargetWeight + (race==='behind'?w.fearAllBehindBonus:0);
    }

    if(hasTag(card,'spell_burn_all')){
      // WILDFIRE (2026-07-18) — Tea's burn-flavored counterpart to NIGHTMARE, reusing the
      // Burn engine board-wide (see abilities.js case 'burn_all') instead of Fear. Same
      // per-target scaling shape as spell_fear_all above, smaller 'behind' bonus (see
      // burnAllBehindBonus comment — DOT, not immediate tempo relief).
      // 2026-07-18: тот же фильтр "только новые цели", что и у fear_all выше — burning
      // ТОЖЕ булев и персистентный (тикает каждый ход владельца, не снимается само по
      // себе, см. game.js) — recast на уже горящую цель абсолютно ничего не добавляет.
      const enemies=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!hasTag(c,'ward')&&!c.burning);
      if(enemies.length===0) return w.burnAllEmptyBoardScore;
      const race=aiRaceState();
      return card.cost*w.spellBase + enemies.length*w.burnAllPerTargetWeight + (race==='behind'?w.burnAllBehindBonus:0);
    }

    // Draw / essence / untap / dispel / anything else generic — flat baseline,
    // these don't have a meaningfully variable "how good was that" per-play.
    return card.cost * w.spellBase + 0.5;
  }

  // ── Creature ──────────────────────────────────────────────────
  let eff = (card.hp + card.atk * w.atkVsHpRatio) / Math.max(1, card.cost);

  (card.tags || []).forEach(t => {
    const base = t.split(':')[0];
    if(w.tagBonus[base] !== undefined) eff += w.tagBonus[base];
  });

  // Squad synergy: is this the copy that COMPLETES the archetype's Squad
  // threshold (count:3), or just progress toward it?
  const gtype=getTagVal(card,'gtype');
  if(gtype){
    const already=aiGtypeCount(G.aiFaction, gtype);
    if(already===2) eff += w.squadCompleteBonus;
    else if(already<2) eff += w.squadBuildBonus;
    // already>=3: Squad bonus is already live for the group — this copy is
    // still a fine body (base efficiency above already covers that), just no
    // extra synergy bonus for triggering something that's already triggered.
  }

  // Risk vs stable: extra weight on stabilizing tags when behind, on
  // closing-out tags when ahead — same tag can matter more or less
  // depending on whether we're racing to survive or racing to finish.
  const race=aiRaceState();
  const situational = race==='behind' ? w.stabilizeTagBonus : (race==='ahead' ? w.aggroTagBonus : null);
  if(situational){
    (card.tags || []).forEach(t => {
      const base = t.split(':')[0];
      if(situational[base] !== undefined) eff += situational[base];
    });
  }

  return eff;
}

// ── ФАЗА 2: атаки ───────────────────────────────────────────────
function getAiCreatureQueue(){
  const queue = G[G.aiFaction].field.filter(c =>
    !c.sleeping && !c.exhausted && !c.feared && !c.spell && !c.world && !c.artifact
  );
  // Shield-pop ordering (2026-07-17): dmgCard() lets an unconsumed Solana Shield (`shield`
  // tag) absorb the FIRST hit against its owner COMPLETELY, regardless of how much dmg
  // that hit carries — so spending a strong attacker on a still-shielded target wastes
  // its damage on what a 1-ATK creature could've popped just as well. If the opponent has
  // such a target right now, send our weakest attacker first (queue ascending by effAtk)
  // so it eats the shield, leaving stronger attackers to act afterward once it's gone.
  // Known boundary: this is a blunt whole-queue sort, not a per-target plan — it reorders
  // even when not every attacker is actually going to target that creature. Harmless
  // (no-op) when no unconsumed shield exists, and cheap since it only fires 0-2 times a
  // game (one card currently carries `shield`, see AI_WEIGHTS.tagBonus.shield in ai.js).
  const humanF = G.humanFaction;
  const shieldTarget = G[humanF].field.find(c => hasTag(c,'shield') && !c.shieldConsumed);
  if(shieldTarget) queue.sort((a,b) => effAtk(a) - effAtk(b));
  return queue;
}

function aiAttackStep(queue, idx){
  if(!isAiTurn()){ showAiBanner(false); return; }
  if(idx >= queue.length){ finishAiTurn(); return; }
  const stillThere = G[G.aiFaction].field.find(c => c.id === queue[idx].id);
  if(!stillThere || stillThere.exhausted || stillThere.sleeping || stillThere.feared){
    aiAttackStep(queue, idx + 1);
    return;
  }
  try{
    aiActWithCreature(stillThere);
  }catch(e){
    console.error(`AI aiActWithCreature() threw for ${stillThere.name} — skipping it:`, e);
  }
  setTimeout(() => aiAttackStep(queue, idx + 1), AI_STEP_DELAY);
}

function aiCanHitBase(creature, oppField){
  const bushido = oppField.find(c => c.tags && c.tags.includes('bushido'));
  if(bushido) return false;
  // Provoke rework (2026-07-17): absolute for everyone now, no pierce exception — see
  // getTargetableCards()/canAttackBase() in game.js for the full reasoning. Pierce's only
  // remaining perk is the trample overflow inside doAttack() when it's forced onto a
  // provoke creature and kills it with excess damage.
  // Same provokeBroken bug-fix as canAttackBase()/tryAttackBase() (game.js) — a suppressed
  // Provoke was still blocking the base here too, since this check never looked at the flag.
  const provoke = oppField.find(c => c.tags && c.tags.includes('provoke') && !c.provokeBroken);
  if(provoke) return false;
  return true;
}

function effAtk(c){
  return c.atk + (c.atkBonus||0) + (c.rageBonus||0) + (c.squadAtkBonus||0) + (c.tempAtkBonus||0);
}

// (2026-07-18, по просьбе автора) — "нет смысла бить его картой 1/1 существо с бронёй 1,
// чтобы тупо получить ответку и умереть". Полностью бесполезный размен: наш физический
// урон целиком гасится бронёй цели (Броня поглощает первой, см. dmgCard()) — 0 реального
// урона по HP, притом цель ЖИВА и контратакует (контрудар в doAttack() бьёт независимо от
// того, дошёл ли наш удар — см. shieldConsumed/wasFeared/wasExhausted — брони среди условий
// пропуска контрудара НЕТ). Если этот контрудар убивает нашего атакующего — чистая потеря
// тела за 0 прогресса. НЕ считаем реальный kill-размен (armor меньше atk) сюда — там урон
// реально проходит, это нормальная атака.
function aiIsWastefulArmorTrade(attacker, target){
  const atk = effAtk(attacker);
  const targetArmor = target.armor||0;
  if(atk > targetArmor) return false; // хоть что-то реально прошло бы по HP — не бесполезно
  const counterDmg = effAtk(target);
  const ourArmor = attacker.armor||0;
  const realCounterDmg = Math.max(0, counterDmg-ourArmor);
  return realCounterDmg >= attacker.hp; // контрудар нас убивает — за 0 урона
}

// Единственная законная причина всё равно пойти на "бесполезный" размен выше — если на
// поле есть эффект, реагирующий на смерть СВОЕГО существа (HUNGER-стиль on_own_death на
// Мире, ASLEX-стиль on_own_death_base на существе) — тогда сама смерть атакующего приносит
// реальную пользу (карта/хил базы), и трейд уже не "за просто так".
function aiHasOwnDeathBenefit(){
  const me = G[G.aiFaction];
  if(me.world && (hasTag(me.world,'on_own_death')||hasTag(me.world,'on_own_death_base'))) return true;
  return me.field.some(c => hasTag(c,'on_own_death')||hasTag(c,'on_own_death_base'));
}

function aiActWithCreature(creature){
  const humanF = G.humanFaction;
  const oppField = G[humanF].field;

  // Лекарь: если есть раненый союзник — лечим вместо атаки.
  const isHealer = (creature.tags || []).some(t => t.startsWith('heal:'));
  if(isHealer){
    const wounded = G[G.aiFaction].field.filter(c =>
      !c.spell && !c.world && !c.artifact && c.id !== creature.id && c.hp < c.maxHp
    );
    if(wounded.length > 0){
      wounded.sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp)); // самый раненый первым
      aiHeal(creature, wounded[0]);
      return;
    }
  }

  const atk = effAtk(creature);
  const targetableIds = getTargetableCards(oppField, creature);
  const targetable = oppField.filter(c => targetableIds.includes(c.id));
  // Provoke rework (2026-07-17): pierce no longer exempt — forced is now just
  // "is there a bushido or provoke creature over there", full stop.
  const forced =
    oppField.some(c => hasTag(c,'bushido')) ||
    oppField.some(c => c.tags.includes('provoke') && !c.provokeBroken);

  // 1) Если можем убить кого-то без потери существа зря — убиваем самую опасную цель.
  // Броня поглощает физический урон ПЕРВОЙ (обычная атака её не игнорирует — см.
  // dmgCard()/bypassArmor в game.js), поэтому реальный урон-до-смерти — hp + armor,
  // не просто hp. Раньше это не учитывалось: ИИ мог решить, что удар добивает цель,
  // хотя часть урона на самом деле уходила в Броню.
  // 2026-07-17: то же самое было верно для Solana Shield (`shield` тег) — оно поглощает
  // ПЕРВЫЙ удар ЦЕЛИКОМ (game.js dmgCard()), независимо от atk, но killable вообще не
  // проверял shieldConsumed — ИИ мог "убить" щит-цель ударом, который на деле снимался в 0.
  // Теперь такая цель не считается killable, пока щит ещё цел (см. также getAiCreatureQueue()
  // — порядок атакующих теперь сам подставляет слабое существо под щит первым).
  const stillShielded = t => hasTag(t,'shield') && !t.shieldConsumed;
  const killable = targetable.filter(t => !stillShielded(t) && atk >= t.hp + (t.armor||0));
  // Не считаем "нужным" килл на цели, которая и так умрёт от собственного burn'а
  // в начале хода ЕЁ владельца (endTurn(), тикает раньше её controller-а), если
  // вместо этого можно бить прямо по базе — тратить атаку на гарантированно
  // обречённую цель при доступном лице чистая потеря урона. Provoke/Bushido
  // здесь не при чём — при forced=true целью всё равно распоряжается не ИИ.
  const worthKilling = forced ? killable : killable.filter(t => !(t.burning && t.hp<=1));
  if(worthKilling.length > 0){
    worthKilling.sort((a,b) => effAtk(b) - effAtk(a));
    aiAttack(creature, worthKilling[0]);
    return;
  }

  // 2) Иначе, если ничего не заставляет атаковать конкретную цель — бьём по базе.
  if(!forced && aiCanHitBase(creature, oppField)){
    aiAttack(creature, null);
    return;
  }

  // Единственные доступные "киллы" были обречённые burn-цели, а по базе ударить
  // нельзя (Provoke без Pierce и т.п.) — тогда всё же добиваем их, лучше чем простой.
  if(killable.length > 0){
    killable.sort((a,b) => effAtk(b) - effAtk(a));
    aiAttack(creature, killable[0]);
    return;
  }

  // 3) Принудительная цель (provoke/bushido) — бьём самую слабую из обязательных.
  // (2026-07-18) — но не если ЛЮБОЙ доступный вариант из них — бесполезный размен
  // (см. aiIsWastefulArmorTrade) — и при этом есть, чем ещё заняться (другие существа
  // на поле) и нет причины умирать нарочно (aiHasOwnDeathBenefit). В этом случае лучше
  // придержать существо, чем гарантированно потерять его за 0 урона.
  if(targetable.length > 0){
    targetable.sort((a,b) => effAtk(a) - effAtk(b));
    const otherCreatures = G[G.aiFaction].field.some(c => c.id!==creature.id && !c.spell&&!c.world&&!c.artifact);
    const canAffordToSkip = otherCreatures && !aiHasOwnDeathBenefit();
    const viable = canAffordToSkip ? targetable.filter(t => !aiIsWastefulArmorTrade(creature,t)) : targetable;
    if(viable.length === 0) return; // все варианты — бесполезный размен, придерживаем существо
    aiAttack(creature, viable[0]);
    return;
  }

  // 4) Нет доступных целей и нельзя бить по базе — существо простаивает.
}

// Атака — просто временно выставляем G.sel/G.phase и вызываем РЕАЛЬНЫЕ функции
// игры (doAttack/tryAttackBase), чтобы ИИ играл по тем же правилам, что и человек.
function aiAttack(creature, target){
  G.sel = creature.id;
  G.phase = 'selectTarget';
  if(target) doAttack(creature, target);
  else tryAttackBase();
}

// Лечение — та же логика, что в onClick() для фазы healTarget (game.js), но
// вызывается напрямую, без прохождения через клики.
function aiHeal(healer, target){
  const healAmt = (healer.squadParam && healer.squadParam.heal) || getTagVal(healer,'heal') || 1;
  target.hp = Math.min(target.maxHp, target.hp + healAmt);
  const healedId = target.id;
  setTimeout(() => showFloat(healedId, `+${healAmt}`, 'heal'), 50);
  const debuffs = [];
  if(target.burning){ target.burning = false; debuffs.push('fire'); }
  if(target.feared){ target.feared = false; debuffs.push('fear'); }
  lg(`${healer.name}: +${healAmt} HP to ${target.name}${debuffs.length ? ', removes '+debuffs.join(' & ') : ''}.`, 'hl');
  healer.exhausted = true;
  G.sel = null; G.phase = 'action';
  render();
  activateCard(healer.id);
}

// ── ЗАВЕРШЕНИЕ ХОДА ИИ ───────────────────────────────────────────
function finishAiTurn(){
  showAiBanner(false);
  if(!isAiTurn() || G.gameOver) return;
  G._aiIsEnding = true;
  endTurn();
  G._aiIsEnding = false;
}
