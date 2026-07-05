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

// ── МУЛЛИГАН ──────────────────────────────────────────────────────
// Простая эвристика: если в стартовой руке нет ни одной карты дешевле
// 3 эссенции — берём один муллиган (максимум один, без раздумий).
function aiAutoMulligan(faction){
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
    aiTryUseShard();
    aiAttackStep(getAiCreatureQueue(), 0);
    return;
  }
  const card = aiPickBestCard();
  if(!card){
    aiTryUseShard();
    aiAttackStep(getAiCreatureQueue(), 0);
    return;
  }
  doPlay(card);
  // doPlay() may have paused in a targeting phase for the new targeted spells
  // (Archive/Journey/Oblivion) — AI never clicks anything, so resolve it here
  // immediately or the AI turn would hang forever waiting for a target.
  aiResolvePendingSpellTarget();
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
    const mine=G[G.aiFaction].field.filter(c=>!c.spell&&!c.world&&!c.artifact&&!c.sleeping&&!c.exhausted);
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

// ── АРТЕФАКТ: SHARD (прямой урон) ────────────────────────────────
// AI никогда этим не пользовался. Бьём, если можем добить существо (учитывая
// +1 урона от feared), иначе — самую опасную цель по эффективному ATK.
function aiTryUseShard(){
  const me=G[G.aiFaction];
  const shard=me.artifacts.find(a=>hasTag(a,'shard')&&!a.exhausted&&!a.sleeping);
  if(!shard) return;
  const humanF=G.humanFaction;
  const enemyField=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact);
  if(enemyField.length===0) return;
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
}

function aiPickBestCard(){
  const me = G[G.aiFaction];
  const affordable = me.hand.filter(c => c.cost <= me.ess);
  if(affordable.length === 0) return null;
  let best = null, bestScore = -Infinity;
  affordable.forEach(c => {
    const s = aiScoreCard(c, me);
    if(s > bestScore){ bestScore = s; best = c; }
  });
  if(bestScore < 0) return null; // нет смысла играть (напр. второй Мир/Артефакт)
  return best;
}

// Простая оценка карты: существа — эффективность (HP+ATK)/стоимость + бонус за
// полезные теги; заклинания — почти всегда неплохи (расходуем как заполнитель);
// Миры/Артефакты — играем только если своего пока нет (иначе он просто заменит
// уже стоящий и будет потрачен впустую).
function aiScoreCard(card, me){
  if(card.world)    return me.world ? -1 : (card.cost * 0.9 + 1);
  if(card.artifact) return (me.artifacts && me.artifacts.length > 0) ? -1 : (card.cost * 0.9 + 1);
  if(card.spell){
    if(hasTag(card,'bounce')){
      // Bounce sends EVERY creature (both sides) back to hand — only good for
      // the side that's currently behind on board. Previously scored the same
      // as any other spell, so the AI would happily bounce away its own lead.
      const humanF=G.humanFaction;
      const myBoard=me.field.filter(c=>!c.spell&&!c.world&&!c.artifact).length;
      const theirBoard=G[humanF].field.filter(c=>!c.spell&&!c.world&&!c.artifact).length;
      return theirBoard>myBoard+1 ? (card.cost*1.0+2) : -2;
    }
    return card.cost * 1.0 + 0.5;
  }

  let eff = (card.hp + card.atk * 1.3) / Math.max(1, card.cost);
  const tagBonus = { provoke:0.4, pierce:0.3, vanguard:0.3, rage:0.3, bushido:0.5, invisible:0.4 };
  (card.tags || []).forEach(t => {
    const base = t.split(':')[0];
    if(tagBonus[base] !== undefined) eff += tagBonus[base];
    if(base === 'heal') eff += 0.4;
    if(base === 'aoe' || base === 'enter_aoe') eff += 0.4;
  });
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
  aiActWithCreature(stillThere);
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
  return c.atk + (c.atkBonus||0) + (c.rageBonus||0) + (c.squadAtkBonus||0);
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
