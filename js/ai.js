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
  },
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
// AI_VERSION должна бампаться ВМЕСТЕ с GAME_VERSION (js/data.js) каждый раз,
// когда ai.js проходит аудит на предмет новых/изменённых карт и механик — см.
// CLAUDE.md "AI version tracking". Если они расходятся, это НЕ ошибка и ничего
// не блокирует — это просто явный сигнал (в консоли и в игровом логе), что ИИ
// мог не узнать о недавних правках и стоит перепроверить его поведение
// специально, а не полагаться на то, что он "просто разберётся".
const AI_VERSION = "1.0";
function _warnIfAiVersionStale(){
  if(AI_VERSION===GAME_VERSION) return;
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
  if(!(G.mode === 'vsai' && G.turn === G.aiFaction) || G.gameOver) return;
  showAiBanner(true);
  aiTryBurnCard();
  setTimeout(() => aiPlayCardsStep(0), 450);
}

// ── ЭКОНОМИКА: сжечь карту за эссенцию ──────────────────────────────
// AI никогда этого не делал — один из вероятных факторов, почему он иногда
// застревает без разыгрываемых существ, накапливая карты добора вместо
// реального роста эссенции (см. AI_BALANCE_NOTES.md). Сжигаем максимум одну
// карту в начале хода (тот же лимит "1 burn/turn", что и у игрока), и только
// худшую по той же оценке aiScoreCard — чтобы не сжигать реально сильную
// карту просто потому что рука большая.
function aiTryBurnCard(){
  const me = G[G.aiFaction];
  if(!me || me.burned) return;
  if(me.hand.length < 4) return; // держим минимум вариантов, не сжигаем из тонкой руки
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
  if(!(G.mode === 'vsai' && G.turn === G.aiFaction)){ showAiBanner(false); return; }
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
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
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
  if(G.phase==='spellDispelTarget'){
    const targets=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
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
  const aoeCreatures=me.field.filter(c=>hasTag(c,'aoe')&&!c.exhausted&&!c.sleeping&&!c.feared&&!c.spell&&!c.world&&!c.artifact);
  let used=false;
  aoeCreatures.forEach(umb=>{
    if(umb.exhausted) return; // could've been used by a squad-shared check already
    const dmgAmt=(umb.squadParam&&umb.squadParam.aoe)||getTagVal(umb,'aoe')||1;
    const kills=enemyField.filter(c=>c.hp<=dmgAmt).length;
    if(kills>0||enemyField.length>=2){
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
  const enemyField=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
  if(enemyField.length===0) return false;
  const baseDmg=getTagVal(shard,'shard')||2;
  const withDmg=enemyField.map(c=>({c, dmg: baseDmg+(c.feared?1:0)}));
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
      aiAttackStep(getAiCreatureQueue(), 0);
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
function aiSpellHasValidTarget(card){
  if(!card.spell) return true;
  const humanF=G.humanFaction;
  if(hasTag(card,'spell_dmg_target')||hasTag(card,'spell_dispel')){
    return G[humanF].field.some(c=>!c.spell&&!c.world&&!c.artifact);
  }
  if(hasTag(card,'spell_buff_temp')){
    return G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted&&!c.feared);
  }
  if(hasTag(card,'spell_untap')){
    return G[G.aiFaction].field.some(c=>!c.spell&&!c.world&&!c.artifact&&(c.sleeping||c.exhausted));
  }
  return true;
}

function aiPickBestCard(){
  const me = G[G.aiFaction];
  const affordable = me.hand.filter(c => c.cost <= me.ess && aiSpellHasValidTarget(c));
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
      const targets=G[G.humanFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
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
      return card.cost*w.spellBase + effAtk(best)*w.buffTargetAtkWeight + (roughLethal?w.buffLethalBonus:0);
    }

    if(hasTag(card,'revive')){
      const grave=(me.grave||[]).filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.voided);
      if(grave.length===0) return w.reviveEmptyGraveyardScore; // aiSpellHasValidTarget doesn't cover revive — still playable, just wasted
      const target=grave[grave.length-1]; // same "last in graveyard" the actual revive effect uses
      const def=DEFS[target.key];
      const revivedEff=def ? (def.hp + def.atk*w.atkVsHpRatio)/Math.max(1,def.cost) : 1;
      return card.cost*w.spellBase*0.5 + revivedEff*w.reviveEffWeight;
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
  return G[G.aiFaction].field.filter(c =>
    !c.sleeping && !c.exhausted && !c.feared && !c.spell && !c.world && !c.artifact
  );
}

function aiAttackStep(queue, idx){
  if(!(G.mode === 'vsai' && G.turn === G.aiFaction)){ showAiBanner(false); return; }
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
  const provoke = oppField.find(c => c.tags && c.tags.includes('provoke'));
  if(provoke && !creature.tags.includes('pierce') && !(creature.squadParam && creature.squadParam.pierce)) return false;
  return true;
}

function effAtk(c){
  return c.atk + (c.atkBonus||0) + (c.rageBonus||0) + (c.squadAtkBonus||0) + (c.tempAtkBonus||0);
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
  const forced =
    oppField.some(c => hasTag(c,'bushido')) ||
    (oppField.some(c => c.tags.includes('provoke')) &&
      !hasTag(creature,'pierce') && !(creature.squadParam && creature.squadParam.pierce));

  // 1) Если можем убить кого-то без потери существа зря — убиваем самую опасную цель.
  const killable = targetable.filter(t => atk >= t.hp);
  if(killable.length > 0){
    killable.sort((a,b) => effAtk(b) - effAtk(a));
    aiAttack(creature, killable[0]);
    return;
  }

  // 2) Иначе, если ничего не заставляет атаковать конкретную цель — бьём по базе.
  if(!forced && aiCanHitBase(creature, oppField)){
    aiAttack(creature, null);
    return;
  }

  // 3) Принудительная цель (provoke/bushido) — бьём самую слабую из обязательных.
  if(targetable.length > 0){
    targetable.sort((a,b) => effAtk(a) - effAtk(b));
    aiAttack(creature, targetable[0]);
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
  if(!(G.mode === 'vsai' && G.turn === G.aiFaction)) return;
  G._aiIsEnding = true;
  endTurn();
  G._aiIsEnding = false;
}
