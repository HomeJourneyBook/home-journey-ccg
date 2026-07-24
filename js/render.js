// Spells tagged with any of these pause for a target click instead of
// resolving immediately (see doPlay() in game.js) — their OWN resolver
// (doSpellDmgTarget/doSpellBuffTarget/doSpellDispelTarget/doSpellUntapTarget)
// plays the spell sound when the target is actually picked. Used to skip the
// redundant second sound that used to also play immediately on the "Play"
// click itself — previously targeted spells played the sound twice (once on
// Play, once on target select), non-targeted spells (draw/essence/revive/
// bounce) only ever needed the one on Play, since they resolve instantly.
function _isTargetedSpell(card){
  return !!card.spell && (
    hasTag(card,'spell_dmg_target') || hasTag(card,'spell_buff_temp') ||
    hasTag(card,'spell_dispel') || hasTag(card,'spell_untap') || hasTag(card,'spell_bounce_target') ||
    // 2026-07-17: три спелла, добавленные позже, не попали в этот список при заводе —
    // без него общий 'card_spell_atack' на клик Play проигрывался ДО выбора цели, а потом
    // ещё раз (или другой звук) при резолве — двойной/ранний звук. BULWARK/CARAPACE и
    // BREACH/RUPTURE и EXPOSE/UNMASK — все три сюда просто забыли вписать.
    hasTag(card,'spell_armor_temp') || hasTag(card,'spell_dmg_trample_target') ||
    hasTag(card,'spell_provoke_break_target') ||
    // 2026-07-24 (баг, автор): SUNDER/BLIGHT забыли вписать при заводе — общий
    // 'card_spell_atack' на клик Play проигрывался ДО выбора цели, а затем ещё раз при
    // реальном уничтожении (doSpellDestroyTarget) — та же двойная/ранняя история, что и
    // у остальных таргетируемых спеллов в этом списке.
    hasTag(card,'spell_destroy_target') ||
    // CINDER/DREAD (2026-07-24) — та же история сразу при заводе: только звук поджога/
    // страха на резолве, никакого общего звука на Play.
    hasTag(card,'spell_burn_target') || hasTag(card,'spell_fear_target')
  );
}

// Спеллы, у которых свой отдельный, узнаваемый звук эффекта (revive → 'rest',
// draw → 'new_card' через анимацию прилёта карты в руку, bounce → 'wind_card') —
// общий 'card_spell_atack' на клик "Play" их перебивает/заглушает, поэтому для них его не играем.
function _spellHasOwnSfx(card){
  return !!card.spell && (hasTag(card,'revive') || hasTag(card,'draw') || hasTag(card,'bounce') || hasTag(card,'spell_bounce_target') ||
    // 2026-07-21 (баг, автор): board-wide AOE-спеллы (spell_burn_all/WILDFIRE, spell_fear_all/
    // NIGHTMARE, spell_aoe_count/RECKONING-SWARM CULL) резолвятся МГНОВЕННО (не через
    // TARGETED_SPELL_TAGS — у них нет фазы выбора цели, бьют по всему вражескому полю сразу),
    // поэтому _isTargetedSpell() их не ловит и общий 'card_spell_atack' на клик "Play" играл
    // ПЕРЕД настоящим звуком эффекта (case 'burn_all'→card_fire_atack, 'fear_all'→debaf,
    // 'aoe_count'→card_spell_atack — см. abilities.js triggerAbilities()) — двойной звук,
    // а у aoe_count оба звука вообще совпадали, что звучало как один и тот же щелчок дважды
    // подряд. Тот же принцип, что и revive/draw/bounce выше: у эффекта уже есть свой звук
    // на резолве, ранний общий проигрывать не нужно.
    hasTag(card,'spell_burn_all') || hasTag(card,'spell_fear_all') || hasTag(card,'spell_aoe_count') ||
    // 2026-07-24 (баг, автор, доп. заход): та же история у трёх ещё карт.
    // MULTITUDE/LEGION (spell_draw_scale) вообще не играют собственного звука на резолве —
    // так что тут просто убираем общий звук целиком, тишина и есть "свой звук" по факту.
    // CATACLYSM/EXTINCTION (spell_destroy_all_enemies) — та же ситуация, что у aoe_count
    // (см. блок выше): 'card_spell_atack' на резолве совпадал с общим звуком на Play.
    // FORGET-ME-NOT/MINDROT (lose) — эффект 'lose' в abilities.js уже играет свой 'debaf'.
    hasTag(card,'spell_draw_scale') || hasTag(card,'spell_destroy_all_enemies') || hasTag(card,'lose') ||
    // 2026-07-24 (баг, автор): та же история с двумя новыми instant-эффектами — оба играют
    // СВОЙ звук на резолве (random_spread → 'card_spell_atack' в момент удара по целям,
    // heal_all/heal_base → 'heal'), общий звук на Play был лишним/дублирующим для первого
    // (тот же звук дважды подряд) и просто неуместным для второго (должен быть только 'heal').
    hasTag(card,'spell_random_spread') || hasTag(card,'spell_heal_all'));
}

// ГЛАВНАЯ функция перерисовки экрана игры. Вызывается после каждого действия (ход, атака, игра карты и т.д.)
// Обновляет: счётчики хода/HP/Essence/колоды/кладбища, поля боя, руки обоих игроков (своя — открыта, чужая — рубашками),
// персистентную зону (Worlds/Artifacts), z-index рук, подсветку "можно бить по базе", текст подсказки текущей фазы.
function render(){
  const cur=G[G.turn];
  document.getElementById('turnNum').textContent=G.turnNum;
  document.getElementById('turnPlayer').textContent=G.turn.toUpperCase();
  ['tea','jeet'].forEach(f=>{
    const p=G[f];
    document.getElementById(f+'Hp').textContent=p.hp;
    document.getElementById(f+'Ess').textContent=p.ess;
    const hc=document.getElementById(f+'HandCount');
    if(hc)hc.textContent=p.hand.length;
    // Stats bar counters
    const dc=document.getElementById(f+'DeckCountStat');
    if(dc)dc.textContent=p.deck.length;
    const gc=document.getElementById(f+'GraveCountStat');
    if(gc)gc.textContent=p.grave.length;
    // Bottom bar badges
    const graveBadge=document.getElementById(f+'GraveBadge');
    if(graveBadge)graveBadge.textContent=p.grave.length;
    const deckBadge=document.getElementById(f+'DeckBadge');
    if(deckBadge)deckBadge.textContent=p.deck.length;
  });
  rZone('teaField',G.tea.field,'field');
  rZone('jeetField',G.jeet.field,'field');
  if(G.mode==='vsai'){
    const hf=G.humanFaction,af=G.aiFaction;
    const hEl=document.getElementById(hf+'Hand');
    if(hEl) hEl.className='hand';
    rZone(hf+'Hand',G[hf].hand,'hand');
    rHiddenHand(af+'Hand',G[af].hand,af);
  } else if(G.turn==='tea'){
    const th=document.getElementById('teaHand');
    if(th) th.className='hand';
    rZone('teaHand',G.tea.hand,'hand');
    rHiddenHand('jeetHand',G.jeet.hand,'jeet');
  } else {
    const jh=document.getElementById('jeetHand');
    if(jh) jh.className='hand';
    rZone('jeetHand',G.jeet.hand,'hand');
    rHiddenHand('teaHand',G.tea.hand,'tea');
  }
  rPersist('teaPersist',G.tea);
  reorderZones();
  rPersist('jeetPersist',G.jeet);
  ['teaHand','jeetHand'].forEach(hid=>{
    const hel=document.getElementById(hid);
    if(hel)hel.style.zIndex=G.previewCard?'500':'50';
  });
  requestAnimationFrame(()=>{ adjustHandOverlap(); requestAnimationFrame(adjustHandOverlap); });

  const sfx=G.turn==='tea'?'T':'J';
  updateMulliganBtn(G.turn);

  const inactSB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'SidebarBtns');
  if(inactSB)inactSB.style.display='none';
  const actSB=document.getElementById(G.turn+'SidebarBtns');
  if(actSB)actSB.style.display='flex';

  if(G.mode==='vsai'){
    const humanBB=document.getElementById(G.humanFaction+'BottomBar');
    const aiBB=document.getElementById(G.aiFaction+'BottomBar');
    if(aiBB)aiBB.style.display='none';
    // Панель человека теперь видна ВСЕГДА в vsai, даже во время хода ИИ —
    // на время хода ИИ у нее просто подменяется кнопка End Turn (см. updateEndTurnBtn ниже).
    if(humanBB)humanBB.style.display='flex';
  } else {
    const inactBB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'BottomBar');
    if(inactBB)inactBB.style.display='none';
    const actBB=document.getElementById(G.turn+'BottomBar');
    if(actBB)actBB.style.display='flex';
  }

  const oppKey=G.mode==='vsai'?G.aiFaction:(G.turn==='tea'?'jeet':'tea');
  const oppZoneEl=document.getElementById('oppStats');
  if(oppZoneEl){
    const canHitBase=(G.phase==='selectTarget'||G.phase==='healTarget')&&G.sel&&canAttackBase();
    const oppNameBox=oppZoneEl.querySelector('.player-name-box');
    if(oppNameBox) oppNameBox.classList.toggle('base-targetable', canHitBase);
  }
  const playerStatsEl=document.getElementById('playerStats');
  if(playerStatsEl){
    const playerNameBox=playerStatsEl.querySelector('.player-name-box');
    if(playerNameBox) playerNameBox.classList.remove('base-targetable');
  }

  const hitEl=document.getElementById('hitBase'+sfx);if(hitEl)hitEl.style.display='none';

  updateEndTurnBtn();

  const hints={
    action:'',
    selectTarget:'Select enemy or tap their base.',
    burn:'Select card to burn.',
    healTarget:'Select ally to heal or enemy to attack.',
    spellProvokeBreakTarget:'Select an enemy Provoke creature.',
    spellDmgTrampleTarget:'Select an enemy creature.',
    spellArmorTarget:'Select an ally creature.',
    spellDestroyTarget:'Select an enemy World or Artifact to destroy.',
    spellBurnTarget:'Select an enemy creature to set on fire.',
    spellFearTarget:'Select an enemy creature to Fear.',
    spellBounceAllyTarget:'Select an ally creature.',
    spellExecuteHalfTarget:'Select an enemy creature at half HP or less.',
  };
  const hintEl2=document.getElementById('hint'+sfx+'2');
  if(hintEl2)hintEl2.textContent=hints[G.phase]||'';
  // Target-prompt overlay — для точечных заклинаний (OBLIVION/dispel/dmg/buff), активки
  // лечения (healTarget) и, с 2026-07-17, для Shard/Bolt (shardTarget/boltTarget) — раньше
  // эти два были сознательно исключены (см. историю правки — целятся с поля, у них уже
  // есть своя подсветка targetable/aim-target прямо на картах), но подсветка и оверлей не
  // взаимоисключающие: spellDmgTarget уже получает ОБА слоя одновременно (см. чуть выше,
  // строка с 'targetable','aim-target'), так что добавление оверлея сюда — просто
  // выравнивание UX, не конфликт с существующей подсветкой мишени.
  // НЕ для selectTarget/sacrificeTarget — те по-прежнему только с подсветкой на картах.
  // Клик по оверлею вызывает cancelPendingSpell() — для shardTarget/boltTarget/healTarget
  // G.pendingSpell пуст, так что рефанда не происходит, просто чистый сброс фазы
  // (G.phase='action', G.sel=null).
  const targetPromptOverlay=document.getElementById('targetPromptOverlay');
  if(targetPromptOverlay){
    const showTargetPrompt=(
      G.phase==='spellDmgTarget'||G.phase==='spellBuffTarget'||
      G.phase==='spellDispelTarget'||G.phase==='spellUntapTarget'||
      G.phase==='spellBounceTarget'||G.phase==='healTarget'||
      G.phase==='shardTarget'||G.phase==='boltTarget'||
      G.phase==='spellProvokeBreakTarget'||G.phase==='spellDmgTrampleTarget'||
      G.phase==='spellArmorTarget'||G.phase==='spellDestroyTarget'||
      G.phase==='spellBurnTarget'||G.phase==='spellFearTarget'||
      G.phase==='spellBounceAllyTarget'||G.phase==='spellExecuteHalfTarget'
    );
    targetPromptOverlay.classList.toggle('hidden',!showTargetPrompt);
  }
  if(typeof _applyPendingFlash==='function') _applyPendingFlash();
  if(typeof _applyPendingEssGlitch==='function') _applyPendingEssGlitch();
  if(typeof _applyPendingFieldFx==='function') _applyPendingFieldFx();
}

// Возвращает путь к картинке типа карты (мир/уникальный/артефакт/заклинание/существо) —
// именно эта картинка ставится фоном в .card-type-dot (значок в правом верхнем углу карты).
function getTypeDotImg(card){
  if(card.world) return 'img/type_world.png';
  if(card.unique) return 'img/type_unique.png';
  if(card.artifact) return 'img/type_artifact.png';
  if(card.spell) return 'img/type_spell.png';
  return 'img/type_creature.png';
}

// Человекочитаемое название типа для тултипа на .card-type-dot.
function getTypeDotLabel(card){
  if(card.world) return 'World';
  if(card.unique) return 'Unique';
  if(card.artifact) return 'Artifact';
  if(card.spell) return 'Spell';
  return 'Traveler';
}

// ── Общий механизм "увеличенного превью" карты по центру экрана: рисуется НЕ поверх
// оригинального элемента, а отдельным клоном (mkEl(...,'preview')) поверх всего экрана —
// поэтому не зависит от того, что происходит с оригиналом (перерисовки поля/руки,
// анимации карусели и т.п. ему не мешают).
// Используется в двух местах с разными триггерами открытия/закрытия:
//   1) mkSmallEl (карты поля боя) — открывается долгим нажатием, закрывается отпусканием кнопки/пальца.
//   2) mkEl (кнопка Zoom в руке) — открывается кликом по кнопке, закрывается тапом в любом месте экрана.
//
// РЕГУЛИРОВКА РАЗМЕРА: конечный масштаб карты — последний аргумент scale в вызове
// showFieldCardPreview(...) ниже по коду (два места: mkSmallEl для поля и zoomHandCardFly
// для руки), а также константы FIELD_PREVIEW_SCALE/HAND_ZOOM_SCALE прямо под этим комментарием —
// меняй любую из них независимо, вторую не затронет.
const FIELD_PREVIEW_SCALE = 2.08; // во сколько раз увеличивается карта поля при долгом нажатии (было 1.6; +75% пробовали 2026-07-19, автор откатил — многовато; пересчитано на +30%)
const HAND_ZOOM_SCALE     = 1.6; // во сколько раз увеличивается карта руки по кнопке Zoom (отдельная фича, не трогали)
// Масштаб анимации раскрытия спелла ИИ в центре поля (playSpellRevealAnimation ниже) —
// раньше буквально равнялся FIELD_PREVIEW_SCALE (см. комментарий внутри функции, "того же
// размера, что и увеличенная карта поля"), но по запросу автора (2026-07-19) уменьшен на 15%
// и теперь СВОЯ отдельная константа — правка FIELD_PREVIEW_SCALE (зум поля по долгому нажатию)
// больше не задевает эту анимацию, и наоборот.
const SPELL_REVEAL_SCALE = FIELD_PREVIEW_SCALE * 0.85; // 2.08 → 1.768

let fieldPreviewEl=null;
let statusPanelEl=null;

// ── Легенда бафов/дебафов под зумленной картой ──────────────────────────
// showFieldCardPreview() строит ВИЗУАЛ карты из "чистой" копии (sleeping/exhausted/
// feared/burning сброшены — см. cleanCard там), поэтому статусы для этой панели
// нужно читать ИЗ ОРИГИНАЛЬНОГО card, а не из cleanCard/DOM. Экрана дебафов у нас
// пока два (Fear, Burn) + Sleeping до кучи; бафов четыре: аура (ATK и/или maxHP —
// см. atkBonus/worldMaxHpBonus), боевой трюк (tempAtkBonus — spell_buff_temp),
// накопленная Rage (2026-07-20: больше не хранимое rageBonus, а живая проверка ран — см.
// rageAtkBonus() в abilities.js) и бонус отряда (squadAtkBonus/squadMaxHpBonus/
// squadParam). Формулировки текста взяты из экрана Rules (index.html), кроме
// бонуса отряда — под него нет отдельного предложения в правилах, текст свой,
// собран из фактических полей карты.
// Иконки: Fear/Burn переиспользуют существующий арт способностей (ico_fear/
// ico_burn.png), Rage — туда же (ico_rage.png, тот же смысл, просто в другом
// месте карточки). Для ауры/боевого трюка/отряда/сна кастомного арта пока нет —
// эмодзи-плейсхолдеры, как договаривались.
function _squadBonusText(card){
  const parts=[];
  if(card.squadAtkBonus) parts.push(`+${card.squadAtkBonus} ATK`);
  if(card.squadMaxHpBonus) parts.push(`+${card.squadMaxHpBonus} maxHP`);
  if(card.squadArmorBonus) parts.push(`+${card.squadArmorBonus} Armor`);
  const sp=card.squadParam;
  if(sp){
    if(sp.heal) parts.push(`heals ${sp.heal} on activation`);
    if(sp.aoe) parts.push(`+${sp.aoe} AOE damage`);
    if(sp.pierce) parts.push('Pierce');
    if(sp.regen) parts.push(`Regen ${sp.regen}`);
  }
  return `Squad bonus active${parts.length?': '+parts.join(', '):''} — 3+ same-type Travelers on the field.`;
}
function _cardStatusEntries(card){
  const entries=[];
  // Дебафы
  if(card.feared) entries.push({icon:'img/ico_fear.png', text:'Feared — skips its next turn and deals no counter-attack damage.'});
  if(card.burning) entries.push({icon:'img/ico_burn.png', text:'Burning — loses 1 HP at the start of each of its turns until it dies.'});
  if(card.provokeBroken) entries.push({icon:'img/ico_tb.png', text:'Provoke suppressed — can be attacked freely, bypassing Provoke, until the start of its owner\'s next turn.'});
  if(card.interceptUsed) entries.push({icon:'img/ico_intercept.png', text:'Intercept triggered — already redirected an attack this turn.'});
  if(hasTag(card,'shield')&&!card.shieldConsumed) entries.push({icon:'img/solana_shield.png', text:'Solana Shield — absorbs the next hit entirely from any source, one time only.'});
  if(card.sleeping) entries.push({icon:'img/zzz.png', text:'Sleeping — entered the field this turn, wakes up at the start of your next turn.'});
  if(hasTag(card,'invisible')) entries.push({icon:'img/ico_invis.png', text:'Invisible — cannot be targeted by attacks or spells while a non-invisible ally is still on the field. Also deals no counter-attack damage when it is attacked.'});
  if(hasTag(card,'stealth')&&!card.stealthBroken) entries.push({icon:'img/ico_stealth.png', text:'Stealth — cannot be targeted by attacks or spells until it attacks for the first time. That first attack deals no counter-damage. One-time only.'});
  // Бафы
  if(card.atkBonus) entries.push({icon:'img/attack.png', text:`+${card.atkBonus} ATK from an aura on the battlefield.`});
  if(card.auraMaxHpBonus) entries.push({icon:'img/heart.png', text:`+${card.auraMaxHpBonus} Max HP from an aura on the battlefield.`});
  if(card.worldMaxHpBonus) entries.push({icon:'img/heart.png', text:`+${card.worldMaxHpBonus} Max HP from the World card.`});
  if(card.auraArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.auraArmorBonus} Armor from an aura on the battlefield.`});
  if(card.worldArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.worldArmorBonus} Armor from the World card.`});
  if(card.spellArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.spellArmorBonus} Armor from a spell until gone from battlefield.`});
  if(card.tempAtkBonus) entries.push({icon:'img/attack.png', text:`+${card.tempAtkBonus} ATK from a spell until gone from battlefield.`});
  if(rageAtkBonus(card)) entries.push({icon:'img/ico_rage.png', text:`+${rageAtkBonus(card)} ATK from Rage — wounded to half HP or below (floor(maxHP/2)). Heals off once above the threshold.`});
  if(card.squadAtkBonus||card.squadMaxHpBonus||card.squadArmorBonus||card.squadParam) entries.push({icon:'img/armor.png', text:_squadBonusText(card)});
  return entries;
}
function _buildStatusPanel(entries){
  const panel=document.createElement('div');
  panel.className='card-status-panel';
  entries.forEach(entry=>{
    const row=document.createElement('div');
    row.className='card-status-row';
    const icon=document.createElement('div');
    icon.className='card-status-icon';
    icon.innerHTML=entry.icon?`<img src="${entry.icon}" alt="">`:entry.emoji;
    const text=document.createElement('div');
    text.className='card-status-text';
    text.textContent=entry.text;
    row.appendChild(icon);
    row.appendChild(text);
    panel.appendChild(row);
  });
  return panel;
}

// Ограничение масштаба под размер экрана (2026-07-19, автор нашёл живьём на мобильном
// вьюпорте, 390px шириной: после того как FIELD_PREVIEW_SCALE подняли на 75% (1.6→2.8),
// увеличенная карта поля стала ШИРЕ самого экрана телефона и вылезала за оба края; позже
// автор откатил 75% и попросил пересчитать на +30% — FIELD_PREVIEW_SCALE сейчас 2.08 — но
// сам клэмп остаётся полезной страховкой независимо от того, какое значение стоит сейчас).
// Используется и в showFieldCardPreview(), и в playSpellRevealAnimation() — оба места
// зумят карту до одного и того же целевого масштаба и оба должны одинаково защищаться от
// переполнения. 92vw/85vh — тот же принцип отступа, что и у .card-detail-scaled в
// styles.css (68vw/52vh для СВОЕГО другого контекста показа карты), просто здесь это
// transform:scale() поверх фиксированного .card, а не CSS-переменные, так что считаем
// вручную по фактическому натуральному размеру (targetRect) элемента.
function _clampPreviewScale(desiredScale, targetRect){
  const maxByWidth=(window.innerWidth*0.92)/targetRect.width;
  const maxByHeight=(window.innerHeight*0.85)/targetRect.height;
  return Math.min(desiredScale, maxByWidth, maxByHeight);
}

function showFieldCardPreview(card, originEl, scale=FIELD_PREVIEW_SCALE){
  closeFieldCardPreview();
  const originRect=originEl.getBoundingClientRect();
  // "Чистая" копия карты для превью: сбрасываем игровые состояния (устала/спит/страх/горит/выбрана),
  // чтобы в увеличенном виде была видна сама карта, а не её текущий статус на поле.
  // Реальный объект в G не трогаем — копия одноразовая, только для рендера превью.
  // ВАЖНО: статусы для легенды-панели (см. _cardStatusEntries выше) читаются из
  // ОРИГИНАЛЬНОГО card, ДО этой очистки — иначе легенда всегда была бы пустой.
  const statusEntries=_cardStatusEntries(card);
  const cleanCard=Object.assign({}, card, {exhausted:false, sleeping:false, feared:false, burning:false});
  const el=mkEl(cleanCard,'preview'); // zone!=='hand' → без кнопок Play/Burn/Zoom, чистая карта для чтения
  el.classList.remove('selected','burning','sleeping','exhausted','feared'); // на случай если G.sel===card.id
  el.classList.add('field-preview-card');
  el.style.position='fixed';
  el.style.margin='0';
  el.style.zIndex='6000';
  el.style.pointerEvents='none';
  document.body.appendChild(el);

  // Сама карта остаётся pointer-events:none (клик по ней должен "проваливаться" сквозь неё —
  // см. zoomHandCardFly/backdrop), но точечно включаем pointer-events на элементах, у которых
  // есть тултип (способности + cost/type/hp/atk — см. TOOLTIP_TRIGGER_SELECTOR/_tooltipDataFor
  // в ui.js), чтобы наведение на них в зум-режиме тоже ловилось. Раньше тут был только
  // .card-tag-icon — из-за этого в зуме подсказка показывалась ТОЛЬКО у способностей, а
  // cost/type/hp/atk молчали (баг-репорт). Клик по любому из них всё равно всплывает и
  // закрывает зум — тут включается только hover, не click-behaviour.
  el.querySelectorAll('.card-tag-icon, .card-cost, .card-type-dot, .card-hp-box, .card-atk-box, .card-armor-box').forEach(icon=>{ icon.style.pointerEvents='auto'; });

  const targetRect=el.getBoundingClientRect(); // естественный размер .card из CSS (--card-w/--card-h)
  const scaleX=originRect.width/targetRect.width;
  const scaleY=originRect.height/targetRect.height;
  const cx=originRect.left+originRect.width/2;
  const cy=originRect.top+originRect.height/2;

  el.style.left=cx+'px';
  el.style.top=cy+'px';
  el.style.transform=`translate(-50%,-50%) scale(${scaleX},${scaleY})`;
  el.style.transition='none';
  void el.offsetWidth; // форсируем reflow — иначе старт и финиш анимации "склеятся" в один кадр
  el.style.transition='left .25s cubic-bezier(.22,.9,.32,1), top .25s cubic-bezier(.22,.9,.32,1), transform .25s cubic-bezier(.22,.9,.32,1)';
  el.style.left='50%';
  el.style.top='46%';
  const finalScale=_clampPreviewScale(scale, targetRect);
  el.style.transform=`translate(-50%,-50%) scale(${finalScale})`;

  fieldPreviewEl=el;

  // Панель-легенда бафов/дебафов — отдельный fixed-элемент, позиционируется ПОД
  // финальным прямоугольником карты. Строим/показываем её ПОСЛЕ того как долетит
  // анимация карты (те же .25s, что и transition выше) — до этого момента итоговый
  // getBoundingClientRect() карты ещё даёт стартовые (originRect) координаты, а не
  // финальные, и панель встала бы не в то место.
  if(statusEntries.length){
    setTimeout(()=>{
      if(fieldPreviewEl!==el) return; // зум успели закрыть/сменить карту, пока ждали — не показываем
      const panel=_buildStatusPanel(statusEntries);
      panel.style.position='fixed';
      panel.style.zIndex='6000';
      document.body.appendChild(panel);
      const cardRect=el.getBoundingClientRect();
      panel.style.left=(cardRect.left+cardRect.width/2)+'px';
      panel.style.top=(cardRect.bottom+10)+'px';
      panel.style.transform='translateX(-50%)';
      statusPanelEl=panel;
      requestAnimationFrame(()=>{ if(statusPanelEl===panel) panel.classList.add('card-status-panel-visible'); });
    },250);
  }
}

// Раскрытие спелла ИИ (2026-07-19, по прямому запросу автора — только VS AI режим,
// НЕ хотсит и НЕ AI vs AI спектатор, см. needsReveal-условие в doPlay(), game.js):
// человек до этого момента видел только рубашку в oppHandZone (см. rHiddenHand() выше) —
// этот эффект один раз показывает НАСТОЯЩЕЕ лицо только что сыгранной карты-спелла,
// вылетающей из ЦЕНТРА прямоугольника скрытой руки (не из конкретного слота — автор
// подтвердил, что rHiddenHand() не хранит id по рубашкам, только их количество, и что
// для наглядности достаточно центра всей зоны) к центру поля, задерживается там ~0.4с
// лицом кверху (тайминг уменьшен с 0.6с по просьбе автора, 2026-07-19, второй заход),
// затем растворяется синим дисолвом (revealVanish, styles.css — та же техника, что и
// burnCard, но в холодных тонах, чтобы не путать с сжиганием карты).
// onDone вызывается ПОСЛЕ того как клон убран из DOM — вызывающий код (doPlay()) должен
// отложить РЕАЛЬНОЕ резолвление эффекта карты до этого колбэка, чтобы игрок физически
// успел прочитать, что это была за карта, прежде чем она подействует. Если по каким-то
// причинам зона руки не найдена в DOM — сразу зовём onDone(), не блокируя ход ИИ.
const SPELL_REVEAL_FLY_MS = 250;   // вылет/увеличение до размера поля
const SPELL_REVEAL_HOLD_MS = 400;  // "зависание" лицом кверху (было 600, автор попросил короче)
const SPELL_REVEAL_VANISH_MS = 450; // длительность revealVanish (см. styles.css)
function playSpellRevealAnimation(card, onDone){
  const origin=document.getElementById('oppHandZone');
  if(!origin){ onDone(); return; }
  const originRect=origin.getBoundingClientRect();
  const cx0=originRect.left+originRect.width/2;
  const cy0=originRect.top+originRect.height/2;

  // "Чистая" копия — сбрасываем игровые статусы, как и в showFieldCardPreview(), карта
  // ещё не сыграна с точки зрения этих флагов (эффект резолвится только в колбэке).
  const cleanCard=Object.assign({}, card, {exhausted:false, sleeping:false, feared:false, burning:false});
  const el=mkEl(cleanCard,'preview'); // preview zone — без кнопок Play/Burn/Zoom
  el.classList.remove('selected','previewed','affordable','entering');
  el.classList.add('spell-reveal-clone');
  el.style.position='fixed';
  el.style.margin='0';
  el.style.pointerEvents='none';
  document.body.appendChild(el);

  const targetRect=el.getBoundingClientRect(); // натуральный размер .card из CSS

  // Масштаб старта — как размер рубашки в руке (card-mini), если хоть одна ещё осталась
  // на экране; иначе примерный фолбэк-масштаб, просто чтобы был виден "вылет", а не
  // мгновенное появление в полный размер.
  const miniEl=origin.querySelector('.card-mini');
  const miniRect=miniEl?miniEl.getBoundingClientRect():null;
  const scaleX0=miniRect?(miniRect.width/targetRect.width):0.3;
  const scaleY0=miniRect?(miniRect.height/targetRect.height):0.3;

  // Целевая точка — РЕАЛЬНАЯ граница между полями (2026-07-19, багфикс: раньше был
  // хардкод left:50%/top:46% от всего viewport, "на глаз" скопированный из
  // showFieldCardPreview() — но та функция зумит карту ИГРОКА и её якорь никогда не
  // сверялся с фактической геометрией поля. Проверил живьём: середина между
  // oppFieldZone.bottom и playerFieldZone.top даёт настоящий "шов" полей, а 46% от
  // высоты экрана оказывается заметно НИЖЕ него — отсюда и жалоба "ниже и левее места
  // где карта оказывается"). Считаем от .field-zone контейнеров, а не от viewport —
  // тогда одинаково верно на любом экране/ориентации, без подгонки процентов руками.
  const oppFieldEl=document.getElementById('oppFieldZone');
  const playerFieldEl=document.getElementById('playerFieldZone');
  let targetCx, targetCy;
  if(oppFieldEl && playerFieldEl){
    const oppR=oppFieldEl.getBoundingClientRect();
    const playerR=playerFieldEl.getBoundingClientRect();
    targetCx=(oppR.left+oppR.right)/2;
    targetCy=(oppR.bottom+playerR.top)/2; // ровно шов между двумя полями
  } else {
    // Фолбэк, если разметка почему-то не найдена — центр экрана лучше, чем ничего.
    targetCx=window.innerWidth/2;
    targetCy=window.innerHeight/2;
  }

  el.style.left=cx0+'px';
  el.style.top=cy0+'px';
  el.style.transform=`translate(-50%,-50%) scale(${scaleX0},${scaleY0})`;
  el.style.transition='none';
  void el.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  el.style.transition=`left ${SPELL_REVEAL_FLY_MS}ms cubic-bezier(.22,.9,.32,1), top ${SPELL_REVEAL_FLY_MS}ms cubic-bezier(.22,.9,.32,1), transform ${SPELL_REVEAL_FLY_MS}ms cubic-bezier(.22,.9,.32,1)`;
  el.style.left=targetCx+'px';
  el.style.top=targetCy+'px';
  // Размер (2026-07-19, по прямому запросу автора): карта в центре при раскрытии спелла —
  // своя SPELL_REVEAL_SCALE (см. константу выше — раньше жёстко равнялась FIELD_PREVIEW_SCALE,
  // "того же размера, что увеличенная карта поля при долгом нажатии", но по отдельному
  // запросу автора уменьшена ещё на 15% и отвязана от неё), но так же ограничена
  // _clampPreviewScale() (см. эту функцию выше в файле — багфикс от того же дня: на мобильном
  // вьюпорте увеличенный масштаб мог сделать карту шире экрана).
  // Итоговый scale пишем ЕЩЁ И в CSS custom property --reveal-scale на самом элементе —
  // @keyframes revealVanish (styles.css) читают её через calc(var(--reveal-scale) * X), а
  // не хардкодят число, именно чтобы растворение не "дёргалось" в размере, если clamp у
  // конкретного игрока сработал (экран уже, чем требуется для полного SPELL_REVEAL_SCALE)
  // — тот же принцип, что и с translate(-50%,-50%) в этих же кадрах (см. соседний
  // комментарий в styles.css). Благодаря этому же механизму revealVanish автоматически
  // подхватывает новый уменьшенный масштаб — её отдельно трогать не пришлось.
  const revealScale=_clampPreviewScale(SPELL_REVEAL_SCALE, targetRect);
  el.style.setProperty('--reveal-scale', revealScale);
  el.style.transform=`translate(-50%,-50%) scale(${revealScale})`;

  setTimeout(()=>{
    if(!el.parentElement){ onDone(); return; } // сцена сменилась, пока летели — не виснем
    setTimeout(()=>{
      if(!el.parentElement){ onDone(); return; }
      el.classList.add('vanishing');
      setTimeout(()=>{
        el.remove();
        onDone();
      }, SPELL_REVEAL_VANISH_MS);
    }, SPELL_REVEAL_HOLD_MS);
  }, SPELL_REVEAL_FLY_MS);
}

function closeFieldCardPreview(){
  if(statusPanelEl){
    const panel=statusPanelEl;
    statusPanelEl=null;
    panel.classList.remove('card-status-panel-visible');
    setTimeout(()=>{ if(panel.parentElement) panel.remove(); },150);
  }
  if(!fieldPreviewEl) return;
  const el=fieldPreviewEl;
  fieldPreviewEl=null;
  el.style.transition='opacity .15s ease-out, transform .15s ease-out';
  el.style.opacity='0';
  el.style.transform+=' scale(0.85)';
  setTimeout(()=>{ if(el.parentElement) el.remove(); },160);
}

// Рисует МАЛЕНЬКУЮ карту (.card-small) — это ВСЕ существа на боевом поле (battlefield), и только они.
// Сюда же навешиваются игровые состояния: selected (выбрана), sleeping (спит), exhausted (устала),
// feared (в страхе), burning (горит), targetable (можно выбрать целью в текущей фазе), healable (можно вылечить).
// aim-target/aim-heal (2026-07-13, автор): доп. классы ТОЛЬКО для точечных заклинаний/активных
// кнопок/артефактов (shard, bolt, sacrifice, spellDmg/Dispel/Buff/Untap) — рисуют мишень
// (img/mishen_red.png для aim-target, img/mishen_green.png для aim-heal, см. styles.css)
// поверх карты-цели. НЕ вешаются на обычное выделение цели атаки (selectTarget, а также
// enemy-ветка healTarget — это атака хилером, а не спелл/кнопка) — там остаётся только
// исходная красная подсветка targetable без мишени, по просьбе автора.
// Это единственный рендерер поля боя — .card (mkEl) сюда никогда не попадает.
// Броня для рендера — на поле armorMax уже посчитан recalcArmor() (own+squad+aura+world,
// может быть >0 даже без своего тега armor). В РУКЕ recalcArmor() ни разу не запускался
// для этой карты (он бежит только по cur.field) — armorMax===undefined там всегда, даже
// если у карты есть свой тег armor:N (баг, найденный автором 2026-07-10: NABUNAGI с armor:2
// не показывал бокс в руке, только после выхода на поле). Для карт вне поля просто
// показываем "полную" собственную броню по тегу — squad/aura всё равно не действуют, пока
// карта не сыграна, ничего не потеряно.
function _armorDisplay(card){
  if(card.armorMax>0) return {cur:card.armor, max:card.armorMax};
  if(card.armorMax===undefined){
    const own=getTagVal(card,'armor');
    if(own) return {cur:own, max:own};
  }
  return null;
}
function mkSmallEl(card){
  const d=document.createElement('div');
  d.className=`card-small ${card.f}-card`;
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='Invis';
    d.appendChild(inv);
    d.classList.add('invisible-visual');
  }
  // Stealth — полупрозрачность только пока эффект ещё активен (не сработал ни разу).
  // card.stealthBroken выставляется в true при первой атаке (см. game.js doAttack/hitCard) —
  // это одноразовый эффект на всю игру, дальше карта выглядит как обычно.
  if(hasTag(card,'stealth')&&!card.stealthBroken){
    d.classList.add('stealth-visual');
  }
  if(card.feared)d.classList.add('feared');
  if(card.burning)d.classList.add('burning');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable','aim-target');
  if(G.phase==='selectTarget'&&card.f!==G.turn){
    const oppField=G[card.f].field;
    const attS=G.sel?findC(G.sel):null;
    const targetableS=getTargetableCards(oppField,attS);
    if(targetableS.includes(card.id))d.classList.add('targetable'); // обычная атака — без мишени, только красная подсветка (см. aim-target ниже)
  }
  // Видимость (invisible/нераскрытый stealth, 2026-07-19) — раньше эти четыре подсветки
  // вообще не фильтровали по isSpellTargetable(), то есть на invisible/скрытой stealth-
  // карте мишень всё равно рисовалась, хотя клик по ней потом молча блокировался
  // click-хендлером в game.js (isSpellTargetable там уже проверялся). Теперь оба места
  // используют ОДНУ и ту же функцию с ОДНИМ и тем же контекстом поля (G[card.f].field —
  // card.f тут всегда вражеская сторона, т.к. card.f!==G.turn), включая fallback
  // "все враги invisible → все становятся видимой целью", как и у обычной атаки.
  if(G.phase==='shardTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='boltTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDmgTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  // CINDER/DREAD (2026-07-24) — тот же паттерн подсветки, что у spellDmgTarget.
  if((G.phase==='spellBurnTarget'||G.phase==='spellFearTarget')&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDispelTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellBuffTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  if(G.phase==='spellArmorTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  if(G.phase==='spellUntapTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&(card.sleeping||card.exhausted)) d.classList.add('healable','aim-heal');
  // spellProvokeBreakTarget (EXPOSE/UNMASK) — только реальные Provoke-цели подсвечиваются
  // как валидные, как и у spellUntapTarget выше (нет смысла подсвечивать то, по чему клик
  // всё равно молча проигнорируется — см. click-хендлер в game.js).
  if(G.phase==='spellProvokeBreakTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&hasTag(card,'provoke')&&!card.provokeBroken&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDmgTrampleTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='healTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&(card.hp<card.maxHp||card.burning||card.feared||card.provokeBroken))d.classList.add('healable','aim-heal');
  if(G.phase==='healTarget'&&card.f!==G.turn){
    const oppField2=G[card.f].field;
    const attH=G.sel?findC(G.sel):null;
    const targetableH=getTargetableCards(oppField2,attH);
    if(targetableH.includes(card.id))d.classList.add('targetable'); // атака хилером — не спелл/кнопка/артефакт, без мишени
  }
  if(G.phase==='vardanPick'&&card.f!==G.turn&&!card.sleeping&&!card.exhausted&&!card.feared)d.classList.add('targetable');
  if(G.phase==='vardanAttack'&&card.f===G.turn)d.classList.add('targetable');
  // spellBounceTarget (ПОРЫВ/REVERSE) — цель ЛЮБАЯ сторона (своя или вражеская), поэтому
  // без проверки card.f===/!==G.turn, в отличие от всех остальных targeted-спеллов выше.
  if(G.phase==='spellBounceTarget'&&!card.spell&&!card.world&&!card.artifact&&(card.f===G.turn||isSpellTargetable(card,G[card.f].field))) d.classList.add('targetable','aim-target');
  // GUST/REVERSE redesign (2026-07-24) — тот же bounce, только своя сторона.
  if(G.phase==='spellBounceAllyTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  // JUDGMENT/DEATHBLOW (2026-07-24) — та же формула ≤50% maxHP, что в onClick()/
  // aiSpellHasValidTarget (три независимых места, продублировано намеренно — та же
  // ситуация, что у остальных targeted-спеллов в игре).
  if(G.phase==='spellExecuteHalfTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&card.hp*2<=card.maxHp&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  // Solana Shield (2026-07-13) — визуальная подмена ТОЛЬКО на поле боя (mkSmallEl), не
  // в руке/каталоге/деккбилдере (там просто текст "Solana Shield" в ab, по просьбе автора).
  const shieldActive=hasTag(card,'shield')&&!card.shieldConsumed;
  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
  'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
  'invisible':'<img src="img/ico_invis.png" style="width:60%;height:60%;">',
  'untamed': '<img src="img/ico_untamed.png" style="width:60%;height:60%;">',
  'ward':    '<img src="img/ico_ward.png" style="width:60%;height:60%;">',
  'incarnation': '<img src="img/ico_incarn.png" style="width:60%;height:60%;">',
  'taunt_break': '<img src="img/ico_tb.png" style="width:60%;height:60%;">',
  'vampiric': '<img src="img/ico_vamp.png" style="width:60%;height:60%;">',
  'necrophage': '<img src="img/ico_erase.png" style="width:60%;height:60%;">',
  'intercept': '<img src="img/ico_intercept.png" style="width:60%;height:60%;">',
  'stealth': '<img src="img/ico_stealth.png" style="width:60%;height:60%;">',
  'thorns': '<img src="img/ico_fire_shield.png" style="width:60%;height:60%;">',
  'shield': '<img src="img/ico_solana_shield.png" style="width:60%;height:60%;">',
  'atk_vs_feared': '<img src="img/ico_haunt.png" style="width:60%;height:60%;">', // HAUNT — fear-зеркало Kindle, 2026-07-23
};
const tagIcons=(card.tags||[])
  .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:''}))
  // 'shield' СОЗНАТЕЛЬНО дублируется тут (2026-07-18, по просьбе автора "эстетичнее") —
  // помимо тег-иконки в общем ряду ниже рисуется ЕЩЁ и подмена HP-бокса (shieldActive,
  // см. card-small-hp-box ниже). Тег-иконка при этом статична (по card.tags, не реагирует
  // на card.shieldConsumed) — то есть продолжит показываться и ПОСЛЕ того как щит уже
  // потрачен, в отличие от HP-box-подмены, которая корректно возвращается к обычному HP.
  // Если автор попросит убрать несостыковку — см. предыдущую версию фильтра в истории
  // коммитов (исключала 'shield' именно по этой причине).
  .filter(t=>TAG_ICONS[t.base])
  .map(t=>`<div class="card-tag-icon" data-tag="${t.base}" data-tagval="${t.val}">${TAG_ICONS[t.base]}</div>`)
  .join('');
  const armorDisp=_armorDisplay(card);
  d.innerHTML=`
    <div class="card-dim-overlay"></div>
    <div class="card-small-cost">${card.cost}</div>
    ${armorDisp?`<div class="card-small-armor-box" data-armor="${armorDisp.cur}" data-maxarmor="${armorDisp.max}"><span class="card-small-armor"><img src="./img/armor.png" class="stat-icon">${armorDisp.cur}</span></div>`:''}
    <div class="card-type-dot" data-type="${getTypeDotLabel(card)}" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    ${card.burning?'<div class="card-small-burning"><img src="img/ef_burn.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.feared?'<div class="card-small-feared"><img src="img/ef_fear.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.provokeBroken?'<div class="card-small-tauntbroken"><img src="img/ef_tb.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.sleeping?'<div class="card-zzz"><span>z</span><span>Z</span><span>Z</span></div>':''}
    <div class="card-small-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    <div class="card-small-name-box"><div class="card-small-name">${card.name}</div></div>
${!isSW?`<div class="card-small-stats">
  <div class="card-small-hp-box" data-hp="${card.hp}" data-maxhp="${card.maxHp}">${shieldActive?'<img src="img/solana_shield.png" class="card-small-shield-icon" alt="Shield">':`<span class="card-small-hp">${card.hp}</span>`}</div>
<img src="img/${card.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon">
  <div class="card-small-atk-box" data-base="${card.atk}" data-bonus="${(card.atkBonus||0)+rageAtkBonus(card)+(card.squadAtkBonus||0)+(card.tempAtkBonus||0)}"><span class="card-small-atk">${card.atk+(card.atkBonus||0)+rageAtkBonus(card)+(card.squadAtkBonus||0)+(card.tempAtkBonus||0)}</span></div>
</div>`
:`<div class="card-small-stats" style="justify-content:center;"><img src="img/${card.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon"></div></div>`}`;
  if(card.id===G.sel&&card.f===G.turn&&!card.exhausted&&!card.sleeping&&!card.feared){
    const isUmb=hasTag(card,'aoe')&&!card.unique;
    const isVard=hasTag(card,'aoe')&&card.unique;
    const isBolt=hasTag(card,'bolt'); // Umbasir v2 — точечный магический урон (см. doUmbBolt())
    // Хилер: попап-кнопка "Heal" появляется, если есть кого хилить ИЛИ с кого снять
    // дебафф (burning/feared) — своя не-spell/world/artifact карта с hp<maxHp ИЛИ
    // дебаффом, та же проверка, что и у подсветки .healable ниже в healTarget (лечилка
    // и снимает дебаффы разом, см. onClick() в game.js). Клик по кнопке — и только он —
    // переводит в healTarget с подсветкой целей; сам клик по существу (см. game.js)
    // теперь просто выделяет его как обычную атаку (selectTarget), без прыжка сразу в
    // режим лечения.
    const isHealerAbility=card.tags.some(t=>t.startsWith('heal:'));
    const hasHealTarget=isHealerAbility&&G[card.f].field.some(c=>!c.spell&&!c.world&&!c.artifact&&(c.hp<c.maxHp||c.burning||c.feared));
    if(isUmb||isVard||isBolt||hasHealTarget){
      const pop=document.createElement('div');
      pop.className='field-ability-popup';
      if(isUmb){
        const btn=document.createElement('button');
        btn.className='fab-btn umbasir';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doUmbAsir();};
        pop.appendChild(btn);
      }
      if(isVard){
        const btn=document.createElement('button');
        btn.className='fab-btn vardan';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doVardan();};
        pop.appendChild(btn);
      }
      if(isBolt){
        const btn=document.createElement('button');
        const isCancellingBolt=G.phase==='boltTarget'&&G.sel===card.id;
        if(isCancellingBolt){
          btn.className='fab-btn cancel'; // тот же красный крестик, что и у Heal при отмене
          btn.onclick=(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();};
        } else {
          btn.className='fab-btn umbasir'; // переиспользуем существующий плейсхолдер-класс, пока нет своей иконки
          btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doUmbBolt();};
        }
        pop.appendChild(btn);
      }
      if(hasHealTarget){
        const btn=document.createElement('button');
        // Пока выбираем цель ИМЕННО для этого хилера — кнопка Heal превращается в
        // Cancel (плейсхолдер, автор подключит свою картинку позже), вместо отдельного
        // мигающего текста "click ALLY to heal / click hand to cancel" — цель и так
        // подсвечена через .healable, отменить можно прямо этой же кнопкой.
        const isCancelling=G.phase==='healTarget'&&G.sel===card.id;
        if(isCancelling){
          btn.className='fab-btn cancel';
          btn.onclick=(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();};
        } else {
          btn.className='fab-btn heal'; // плейсхолдер img/btn_heal.png — автор подключит свою картинку позже
          btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;G.phase='healTarget';render();};
        }
        pop.appendChild(btn);
      }
      d.appendChild(pop);
    }
  }
  // Долгое нажатие (мышь/палец) — показать превью большой картой по центру, пока держим.
  // Обычный короткий тап — как раньше, выбор/атака через onClick.
  // ВАЖНО (мышь): раньше закрытие превью висело на 'mouseleave' самой карточки — но у маленьких
  // карт поля это крошечная область, и любое дрожание курсора при удержании кнопки уводило
  // указатель за её пределы, из-за чего превью схлопывалось ещё до отпускания кнопки мыши.
  // Поэтому закрытие по мыши теперь ловим на document через 'mouseup' — превью живёт,
  // пока зажата кнопка, независимо от того, где сейчас курсор, и закрывается ровно в момент отпускания.
  let pressTimer=null, pressStart=null, longPressFired=false;
  const clearPressTimer=()=>{ if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} };
  const endMousePress=()=>{
    clearPressTimer();
    if(longPressFired){ longPressFired=false; closeFieldCardPreview(); }
  };
  d.addEventListener('mousedown',(e)=>{
    if(e.button!==0) return;
    pressStart={x:e.clientX,y:e.clientY}; longPressFired=false; clearPressTimer();
    pressTimer=setTimeout(()=>{longPressFired=true;showFieldCardPreview(card,d);},380);
    document.addEventListener('mouseup', endMousePress, {once:true});
  });
  d.addEventListener('touchstart',(e)=>{
    const t=e.touches[0];
    pressStart={x:t.clientX,y:t.clientY}; longPressFired=false; clearPressTimer();
    pressTimer=setTimeout(()=>{longPressFired=true;showFieldCardPreview(card,d);},380);
  },{passive:true});
  d.addEventListener('touchmove',(e)=>{
    if(!pressTimer) return;
    const t=e.touches[0];
    if(Math.abs(t.clientX-pressStart.x)>10||Math.abs(t.clientY-pressStart.y)>10) clearPressTimer();
  },{passive:true});
  ['touchend','touchcancel'].forEach(evt=>{
    d.addEventListener(evt,()=>{ clearPressTimer(); if(longPressFired){longPressFired=false;closeFieldCardPreview();} });
  });
  d.addEventListener('click',(e)=>{
    if(longPressFired){ e.stopPropagation(); longPressFired=false; return; }
    onClick(card,'field');
  });
  d.addEventListener('mouseenter',()=>playSfx('card_navigation_cursor'));
  return d;
}

// ── Зум карты в руке (кнопка Zoom): используем ТОТ ЖЕ клон-механизм, что и у превью поля
// (showFieldCardPreview/closeFieldCardPreview) — рисуем отдельную увеличенную копию по центру
// экрана, а не двигаем сам элемент руки. Раньше карта "летела" через position:fixed на оригинале,
// но на мобиле карта в момент клика по Zoom ещё имеет класс .previewed, а для него carousel.js
// держит свой @media-стиль с !important (свой transform/opacity/transition) — это перебивало
// анимацию, из-за чего карта не долетала до центра и рендерилась смещённой. Клон не имеет
// класса .previewed и не зависит от того, что происходит с оригиналом в руке (в т.ч. от
// пересборки DOM руки при следующем render()), поэтому центрируется одинаково на любом устройстве.
//
// Пока карта зумлена — поверх игры лежит полупрозрачный бэкдроп (.card-preview-backdrop,
// z-index чуть ниже клона карты, но выше всего остального), который блокирует клики по картам/
// кнопкам "за" увеличенной картой. Сама карта внутри клона pointer-events:none (см.
// showFieldCardPreview), поэтому клик по ней проваливается сквозь неё прямо на бэкдроп —
// а клик по бэкдропу, как и по чему угодно ещё на экране, всплывает до document и закрывает зум
// (единственное исключение — иконки способностей, у них pointer-events:auto ради тултипов,
// но клик по ним тоже долетает до document и тоже закрывает зум).
let previewBackdropEl=null;

function zoomHandCardFly(card, originEl){
  if(previewBackdropEl){ previewBackdropEl.remove(); previewBackdropEl=null; } // на всякий случай
  const backdrop=document.createElement('div');
  backdrop.className='card-preview-backdrop';
  document.body.appendChild(backdrop);
  previewBackdropEl=backdrop;

  showFieldCardPreview(card, originEl, HAND_ZOOM_SCALE);
  setTimeout(()=>{
    document.addEventListener('click', closeZoomHandCard, {once:true});
  }, 0);
}

function closeZoomHandCard(){
  closeFieldCardPreview();
  if(previewBackdropEl){
    const bd=previewBackdropEl;
    previewBackdropEl=null;
    bd.style.opacity='0';
    setTimeout(()=>{ if(bd.parentElement) bd.remove(); },160);
  }
}

// Рисует БОЛЬШУЮ карту (.card) — используется для руки (zone='hand') и кладбища (zone='grave').
// На боевое поле НЕ попадает (поле всегда рисует mkSmallEl, см. rZone). Внутри есть отдельная
// ранняя ветка для card.world (Миры выглядят иначе: без арта/статов, с особым фоном текстового блока) —
// она строит свой innerHTML и сразу делает return; всё что ниже (строка с обычным innerHTML) —
// для всех остальных типов карт: существ, заклинаний, артефактов.
function mkEl(card,zone){
  const d=document.createElement('div');
  d.className=`card ${card.f}-card${card.neutral?' neutral-card':''}`;
  d.style.flexShrink='0';
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.burning)d.classList.add('burning');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='👻 Invis';
    d.appendChild(inv);
  }
  if(card.feared)d.classList.add('feared');
  // Affordable-hand highlight: только для СВОЕЙ руки в СВОЙ ход (чужая рука
  // рисуется рубашками через другой путь, никогда через mkEl с реальными
  // данными карты — утечки информации нет). См. .hand .card.affordable в
  // styles.css — слабый золотой пульс, ~1/3 интенсивности silverPulse у
  // .previewed.
  if(zone==='hand'&&card.f===G.turn&&card.cost<=G[card.f].ess) d.classList.add('affordable');
  // ВНИМАНИЕ: блоки про targetable/healable с проверкой zone==='field' раньше были тут,
  // но удалены — mkEl() никогда не вызывается с zone='field' (см. rZone ниже: поле всегда рисует mkSmallEl).
  // Если в будущем захочешь дать персистентным/ручным картам подсветку targetable — добавляй проверки сюда заново,
  // но без условия zone==='field', а под актуальную зону (например zone==='hand' или отдельный 'persist').

  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
  'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
  'invisible':'<img src="img/ico_invis.png" style="width:60%;height:60%;">',
  'untamed': '<img src="img/ico_untamed.png" style="width:60%;height:60%;">',
  'ward':    '<img src="img/ico_ward.png" style="width:60%;height:60%;">',
  'incarnation': '<img src="img/ico_incarn.png" style="width:60%;height:60%;">',
  'taunt_break': '<img src="img/ico_tb.png" style="width:60%;height:60%;">',
  'vampiric': '<img src="img/ico_vamp.png" style="width:60%;height:60%;">',
  'necrophage': '<img src="img/ico_erase.png" style="width:60%;height:60%;">',
  'intercept': '<img src="img/ico_intercept.png" style="width:60%;height:60%;">',
  'stealth': '<img src="img/ico_stealth.png" style="width:60%;height:60%;">',
  'thorns': '<img src="img/ico_fire_shield.png" style="width:60%;height:60%;">',
  'shield': '<img src="img/ico_solana_shield.png" style="width:60%;height:60%;">',
  'atk_vs_feared': '<img src="img/ico_haunt.png" style="width:60%;height:60%;">', // HAUNT — fear-зеркало Kindle, 2026-07-23
};
// В кладбище incarnation уже отдельно показана таймер-плашкой (card-incarn-badge, см.
// ниже) — она физически перекрывает верхний угол колонки card-tag-icons (обе сидят в
// одном углу карты), из-за чего обычная тег-иконка incarnation становится недостижимой
// для курсора и её тултип "пропадает" именно в этой зоне. Убираем дубль иконки из общего
// списка только для zone==='grave' (на поле/в руке/превью — иконка остаётся как обычно,
// там плашки нет и перекрывать нечего).
const tagIcons = (card.tags||[])
  .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:''}))
  .filter(t=>TAG_ICONS[t.base])
  .filter(t=>!(zone==='grave' && t.base==='incarnation' && card.incarnTimer!=null))
  .map(t=>`<div class="card-tag-icon" data-tag="${t.base}" data-tagval="${t.val}">${TAG_ICONS[t.base]}</div>`)
  .join('');
  // ── Ветка для карт-Миров И визуально-полноартовых карт (fullArt:true, напр. UNSEEN) ──
  // fullArt — ЧИСТО визуальный флаг, не путать с card.world: механика (doPlay/таргетинг/
  // персистентный слот) продолжает работать по card.spell/card.world как раньше, эта ветка
  // только выбирает вёрстку (без card-art/card-stats, свой фон) — см. CLAUDE.md Version 1.01 п.1.
  if(card.world||card.fullArt){
  d.classList.add('world-card');
  if(card.img){
    d.style.cssText += ';background-image:url(\'img/cards/'+card.img+'\')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;';
  }
  d.innerHTML=`
    <div class="card-dim-overlay"></div>
    <div class="card-cost">${card.cost}</div>
    <div class="card-type-dot" data-type="${getTypeDotLabel(card)}" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    <div class="card-ability-box">${gateLabelHtml(card)}<div class="card-ability">${formatAbilityText(card.ab)}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const cur=G[G.turn];
    // Play — попап по центру сверху карты (как было)
    if(cur.ess>=card.cost){
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();if(card.spell&&!_isTargetedSpell(card)&&!_spellHasOwnSfx(card))playSfx('card_spell_atack');else if(!card.spell&&!card.world&&!card.artifact)playSfx('yellow_buttom');G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
      d.appendChild(popup);
    } else {
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const noEss=document.createElement('div');
      noEss.className='cap-no-ess';
      noEss.innerHTML='Not enough <img src="img/ess.png" class="cap-no-ess-icon">';
      popup.appendChild(noEss);
      d.appendChild(popup);
    }
    // Burn — отдельный попап СПРАВА от карты
    if(!cur.burned){
      const burnPopup=document.createElement('div');
      burnPopup.className='card-actions-popup-right';
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();playSfx('card_burn');G.previewCard=null;doBurnCard(card);};
      burnPopup.appendChild(burnBtn);
      d.appendChild(burnPopup);
    }
    // Zoom — отдельный попап СЛЕВА от карты: клик показывает увеличенный клон карты по центру
    // экрана (zoomHandCardFly), повторный тап/клик в любом месте экрана убирает клон обратно
    const zoomPopup=document.createElement('div');
    zoomPopup.className='card-actions-popup-left';
    const zoomBtn=document.createElement('button');
    zoomBtn.className='cap-btn zoom';
    zoomBtn.onclick=(e)=>{e.stopPropagation();playSfx('yellow_buttom');zoomHandCardFly(card,d);};
    zoomPopup.appendChild(zoomBtn);
    d.appendChild(zoomPopup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  d.addEventListener('mouseenter',()=>{ if(zone==='hand') playSfx('card_navigation_cursor'); });
  return d;
}
  // ── Обычная разметка (существа/заклинания/артефакты): арт, статы, способность ──
  const armorDisp=_armorDisplay(card);
  d.innerHTML=`
    <div class="card-dim-overlay"></div>
    <div class="card-cost">${card.cost}</div>
    ${(zone==='grave'&&card.incarnTimer!=null)?`<div class="card-incarn-badge" data-incarn-timer="${card.incarnTimer}"><img src="./img/ico_incarn.png" class="card-incarn-icon" style="width:70%;height:auto;">${card.incarnTimer}</div>`:''}
    ${armorDisp?`<div class="card-armor-box" data-armor="${armorDisp.cur}" data-maxarmor="${armorDisp.max}"><span class="card-armor"><img src="./img/armor.png" class="stat-icon">${armorDisp.cur}</span></div>`:''}
    <div class="card-type-dot" data-type="${getTypeDotLabel(card)}" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${card.burning?'<div class="burning-icon"></div>':''}
    <div class="card-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    ${!isSW?`<div class="card-stats">
      <div class="card-hp-box" data-hp="${card.hp}" data-maxhp="${card.maxHp}"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${card.maxHp}</span></div>
<img src="img/${card.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon">
      <div class="card-atk-box" data-base="${card.atk}" data-bonus="${(card.atkBonus||0)+rageAtkBonus(card)+(card.squadAtkBonus||0)+(card.tempAtkBonus||0)}"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${card.atk+(card.atkBonus||0)+rageAtkBonus(card)+(card.squadAtkBonus||0)+(card.tempAtkBonus||0)}</span></div>
    </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/${card.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon"></div>`}
    <div class="card-ability-box">${gateLabelHtml(card)}<div class="card-ability">${formatAbilityText(card.ab)}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const cur=G[G.turn];
    // Play — попап по центру сверху карты (как было)
    // 2026-07-16: лимит поля (6 существ) проверяем ТОЛЬКО для чистых существ (не spell/world/
    // artifact — те не трогают cur.field, см. doPlay()) — если он упёрт, Play-кнопка уступает
    // место такому же по стилю индикатору "Battleground is full", как у "Not enough essence".
    // Спеллы с тегом revive — отдельный случай: они ТОЖЕ сажают карту на cur.field (см.
    // reviveCard()), так что при полном поле для них действует та же блокировка.
    const fieldFull = ((!card.spell&&!card.world&&!card.artifact) || (card.spell&&hasTag(card,'revive'))) && cur.field.length>=6;
    if(cur.ess>=card.cost && !fieldFull){
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();if(card.spell&&!_isTargetedSpell(card)&&!_spellHasOwnSfx(card))playSfx('card_spell_atack');else if(!card.spell&&!card.world&&!card.artifact)playSfx('yellow_buttom');G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
      d.appendChild(popup);
    } else if(fieldFull){
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const noRoom=document.createElement('div');
      noRoom.className='cap-no-ess cap-field-full';
      noRoom.textContent='Battleground is full';
      popup.appendChild(noRoom);
      d.appendChild(popup);
    } else {
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const noEss=document.createElement('div');
      noEss.className='cap-no-ess';
      noEss.innerHTML='Not enough <img src="img/ess.png" class="cap-no-ess-icon">';
      popup.appendChild(noEss);
      d.appendChild(popup);
    }
    // Burn — отдельный попап СПРАВА от карты
    if(!cur.burned){
      const burnPopup=document.createElement('div');
      burnPopup.className='card-actions-popup-right';
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();playSfx('card_burn');G.previewCard=null;doBurnCard(card);};
      burnPopup.appendChild(burnBtn);
      d.appendChild(burnPopup);
    }
    // Zoom — отдельный попап СЛЕВА от карты: клик показывает увеличенный клон карты по центру
    // экрана (zoomHandCardFly), повторный тап/клик в любом месте экрана убирает клон обратно
    const zoomPopup=document.createElement('div');
    zoomPopup.className='card-actions-popup-left';
    const zoomBtn=document.createElement('button');
    zoomBtn.className='cap-btn zoom';
    zoomBtn.onclick=(e)=>{e.stopPropagation();playSfx('yellow_buttom');zoomHandCardFly(card,d);};
    zoomPopup.appendChild(zoomBtn);
    d.appendChild(zoomPopup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  d.addEventListener('mouseenter',()=>{ if(zone==='hand') playSfx('card_navigation_cursor'); });
  return d;
}


// Перерисовывает целую зону (поле боя ИЛИ руку) по списку карт.
// Для zone='field': умеет анимировать "умирание" карт (класс dying + удаление через 400мс)
// и обновлять уже существующие элементы на месте (чтобы не сбрасывалась подсветка targetable),
// новые карты получают класс entering для анимации появления. Рисует через mkSmallEl.
// Для остальных зон (zone='hand' и т.п.) — просто очищает контейнер и рисует заново через mkEl.
// ── Полёт карты из колоды в руку (клон РЕАЛЬНОЙ карты, лицом вверх) ──────────
// Настоящая новая карта в руке уже умела fade-появляться (см. .card-drawn ниже
// в rZone) — этого добавляем "физику": клон САМОЙ этой карты (не обезличенная
// рубашка runaha.png — автор попросил 2026-07-13 показывать реальный арт сразу,
// по аналогии с flyClone в dbSetQty(), js/deckbuilder.js) стартует у плейсхолдера колоды
// своей фракции, летит вверх к месту новой карты.
// ── Кроссфейд с картой в руке (2026-07-13, по аналогии с dbSetQty/isNewStack
// в deckbuilder.js) ───────────────────────────────────────────────────────
// Раньше стык был жёсткий: клон гас ПОЛНОСТЬЮ к концу полёта (t=CARD_FLY_MS),
// и только В ЭТОТ ЖЕ момент настоящая карта начинала проявляться — ноль нахлёста,
// ощущался "щелчок"/подмена. Теперь оба процесса делят ОДНО и то же окно —
// последние CARD_FLY_FADE_MS миллисекунд полёта: клон гаснет (opacity 1→0)
// и настоящая карта одновременно проявляется (opacity 0→1), точь-в-точь как
// в деккбилдере destStack.opacity плавно возвращается в 1 в том же окне,
// где ещё тает flyClone (см. dbSetQty: reveal начинается ДО конца transition,
// оба заканчиваются вместе). Оба window'а начинаются и заканчиваются синхронно
// (CARD_FLY_MS-CARD_FLY_FADE_MS → CARD_FLY_MS), поэтому "передача эстафеты"
// выглядит одним плавным перетеканием, а не двумя отдельными шагами.
const CARD_FLY_MS = 300;
const CARD_FLY_FADE_MS = 140; // длина окна кроссфейда — общая для клона (fade-out) и карты в руке (fade-in)
// ВАЖНО: клон снимается в rZone ДО того, как на оригинал повесят card-drawn/
// animation-delay (см. вызов ниже) — иначе cloneNode(true) скопировал бы и эти
// инлайн-стили/классы, и клон стартовал бы уже невидимым (opacity:0 от "from"
// кейфрейма cardDrawn).

// Возвращает rect плейсхолдера колоды нужной фракции, ИЛИ null если он сейчас
// не виден (например, скрыт под модалкой муллигана/деколадера) — в этом случае
// полёт просто пропускается, карта появляется как раньше (обычный fade без клона).
function _deckPlaceholderRect(faction){
  const deckEl=document.getElementById(faction==='tea'?'deckPlaceholderT':'deckPlaceholderJ');
  if(!deckEl || deckEl.offsetParent===null) return null;
  const r=deckEl.getBoundingClientRect();
  if(!r.width || !r.height) return null;
  return r;
}

// cloneEl — уже готовый cloneNode(true) реальной карты (см. вызов в rZone), ЕЩЁ
// не вставленный в DOM и без card-drawn/selected/previewed — этой функции он
// передаётся "чистым", целиком её забота вставить/анимировать/убрать.
function _flyCardFromDeck(cloneEl, deckRect, targetRect, delayMs){
  cloneEl.classList.remove('selected','previewed','affordable','entering');
  cloneEl.classList.add('card-fly-clone');
  cloneEl.style.position='fixed';
  cloneEl.style.margin='0';
  cloneEl.style.width=Math.max(targetRect.width,30)+'px';
  cloneEl.style.height=Math.max(targetRect.height,42)+'px';
  cloneEl.style.left=(deckRect.left+deckRect.width/2)+'px';
  cloneEl.style.top=(deckRect.top+deckRect.height/2)+'px';
  cloneEl.style.transform='translate(-50%,-50%) scale(.35) rotate(-6deg)';
  cloneEl.style.opacity='1';
  document.body.appendChild(cloneEl);
  setTimeout(()=>{
    if(!cloneEl.parentElement) return; // на случай если экран уже перерисован/сцена сменилась
    playSfx('new_card');
    void cloneEl.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
    cloneEl.style.transition=`left ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), top ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), transform ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), opacity ${CARD_FLY_FADE_MS}ms ease-in ${CARD_FLY_MS-CARD_FLY_FADE_MS}ms`;
    cloneEl.style.left=(targetRect.left+targetRect.width/2)+'px';
    cloneEl.style.top=(targetRect.top+targetRect.height/2)+'px';
    cloneEl.style.transform='translate(-50%,-50%) scale(1) rotate(0deg)';
    cloneEl.style.opacity='0';
    setTimeout(()=>{ if(cloneEl.parentElement) cloneEl.remove(); }, CARD_FLY_MS+40);
  }, delayMs);
}

function rZone(id,cards,zone){
  const el=document.getElementById(id);
  if(zone==='field'){
    const dying=[];
    el.querySelectorAll('.card-small').forEach(cardEl=>{
      const stillExists=cards.find(c=>String(c.id)===cardEl.dataset.id);
      if(!stillExists) dying.push(cardEl);
    });
    dying.forEach(cardEl=>{
      cardEl.classList.add('dying');
      cardEl.style.pointerEvents='none';
    });
    if(dying.length>0){
      setTimeout(()=>{
        dying.forEach(cardEl=>{if(cardEl.parentElement)cardEl.remove();});
      }, 400);
      // Build map of live (non-dying) existing elements
      const existingMap={};
      el.querySelectorAll('.card-small:not(.dying)').forEach(cardEl=>{
        existingMap[cardEl.dataset.id]=cardEl;
      });
      // Update live cards in-place (fixes targetable staying lit), add new ones with entering
      cards.forEach(c=>{
        if(existingMap[String(c.id)]){
          existingMap[String(c.id)].replaceWith(mkSmallEl(c));
        } else {
          const cardEl=mkSmallEl(c);
          cardEl.classList.add('entering');
          el.appendChild(cardEl);
        }
      });
      return;
    }
  }
  const cardSelector=zone==='field'?'.card-small':'.card';
  const existingIds=new Set([...el.querySelectorAll(cardSelector)].map(e=>e.dataset.id));
  el.innerHTML='';
  const faction=id.startsWith('tea')?'tea':'jeet'; // для полёта карты из колоды, см. _flyCardFromDeck
  const newHandEls=[]; // копим новые карты руки — меряем rect и запускаем полёт ПОСЛЕ сжатия веера (ниже)
  cards.forEach(c=>{
    if(zone==='field'){
      const cardEl=mkSmallEl(c);
      if(!existingIds.has(String(c.id))) cardEl.classList.add('entering');
      el.appendChild(cardEl);
    } else {
      const cardEl=mkEl(c,zone);
      // New card in hand (just drawn from deck) — gets the card-drawn entrance
      // animation. Cards already in hand don't replay it on every re-render.
      const isNew=zone==='hand'&&!existingIds.has(String(c.id));
      el.appendChild(cardEl);
      if(isNew) newHandEls.push(cardEl);
    }
  });
  // ВАЖНО: restRect для только что добранных карт меряем ТОЛЬКО после того, как веер руки
  // реально сжат (adjustHandOverlap ставит отрицательные margin-right по числу карт) —
  // иначе (см. requestAnimationFrame ниже в render()) при большой руке несжатая раскладка
  // стоит намного правее итоговой (может быть за пределами экрана), и полёт карты целится
  // не в то место. Раньше compression происходил только на следующем кадре — здесь же
  // вызываем adjustHandOverlap() СИНХРОННО сразу после появления новых карт в DOM, чтобы
  // rect уже был актуальным к моменту измерения. Двойной вызов (этот + тот, что ниже в
  // render() через requestAnimationFrame) не проблема — функция идемпотентна.
  if(zone==='hand' && newHandEls.length>0){
    adjustHandOverlap();
    let newHandCardIndex=0;
    newHandEls.forEach(cardEl=>{
      const restRect=cardEl.getBoundingClientRect(); // финальная (уже сжатая) позиция ДО навешивания card-drawn
      const deckRect=_deckPlaceholderRect(faction);
      // Клон снимаем СЕЙЧАС, пока cardEl ещё "чистая" (без card-drawn/animation-delay) —
      // см. комментарий у _flyCardFromDeck выше.
      const flyClone = deckRect ? cardEl.cloneNode(true) : null;
      cardEl.classList.add('card-drawn');
      if(deckRect){
        // Окно проявления настоящей карты = то же окно, где гаснет клон
        // (CARD_FLY_MS-CARD_FLY_FADE_MS → CARD_FLY_MS) — см. комментарий у
        // _flyCardFromDeck выше про кроссфейд.
        cardEl.style.animationDelay=(CARD_FLY_MS-CARD_FLY_FADE_MS)+'ms';
        cardEl.style.animationDuration=CARD_FLY_FADE_MS+'ms';
        cardEl.style.animationFillMode='both';
        // БАГ (найден автором 2026-07-13, фикс уточнён после повторного репорта): animation-
        // delay/duration/fill-mode, поставленные инлайново, НЕ привязаны к конкретному
        // animation-name (cardDrawn) — они продолжают действовать на ЛЮБУЮ анимацию, которая
        // запустится на этом же DOM-узле ПОСЛЕ, пока инлайн-стиль не снят. Карта в руке чаще
        // всего сразу получает класс `affordable` (см. mkEl) со СВОЕЙ анимацией
        // `goldPulseWeak 1.8s` — без очистки она наследует duration:140ms вместо 1.8s и
        // мигает в ~13 раз быстрее задуманного.
        // ПЕРВАЯ попытка фикса (animationend с проверкой e.animationName==='cardDrawn') не
        // сработала для affordable-карт: `.hand .card.affordable` — 3 классовых селектора
        // (специфичность 0,3,0), `.card.card-drawn` — 2 (0,2,0) → у affordable-карт ВЕСЬ
        // animation-шорткод (включая имя) достаётся `goldPulseWeak`, `cardDrawn` для них не
        // играет вообще, и т.к. goldPulseWeak `infinite` — событие 'animationend' для неё
        // никогда не наступает, слушатель молча никогда не срабатывал именно для самого частого
        // случая (affordable-карта в свой ход). Теперь — детерминированный setTimeout на то же
        // окно (CARD_FLY_MS), не зависящий от того, чьё имя анимации реально победило в CSS:
        setTimeout(()=>{
          cardEl.classList.remove('card-drawn');
          cardEl.style.animationDelay='';
          cardEl.style.animationDuration='';
          cardEl.style.animationFillMode='';
        }, CARD_FLY_MS);
        _flyCardFromDeck(flyClone,deckRect,restRect,newHandCardIndex*90);
        newHandCardIndex++;
      }
    });
  }
}

// Рисует ЧУЖУЮ руку — карты рубашкой вверх (картинка runaha.png), без данных о содержимом.
// Количество "рубашек" = реальное количество карт у оппонента, сами карты не раскрываются.
// ВАЖНО: id контейнера (#teaHand/#jeetHand) переиспользуется и под открытую руку (через rZone/.card),
// и под скрытую (через эту функцию/.card-mini) — в зависимости от того, чей сейчас ход.
// Поэтому сначала проверяем, что внутри уже лежат корректные .card-mini (а не "осиротевшие" .card
// от прошлого хода, когда этот же контейнер был открытой рукой) — если нет, делаем полный ребилд.
// Если тип верный — только дозаполняем/обрезаем по количеству, не трогая лишний раз DOM (анти-дёрганье).
// Рисует ЧУЖУЮ руку — карты рубашкой вверх, без анимации/звука прилёта (по прямому запросу
// автора, 2026-07-10 — раньше тут был playSfx('new_card')+класс 'entering' на каждую новую
// карту, как у своей открытой руки, но это создавало отдельный баг: в hotseat при КАЖДОЙ
// передаче хода этот же контейнер целиком меняет тип разметки (открытая рука соперника через
// rZone → скрытая через эту функцию, и наоборот) — `wrongType` ниже почти всегда true на
// каждой передаче, контейнер полностью вайпится и пересоздаётся с нуля, и ВСЯ рука (не только
// реально новые карты) заново проигрывала анимацию+звук. Раз уж для скрытой чужой руки
// анимация не нужна вообще — сняли её здесь целиком, а не пытались чинить диффинг.
function rHiddenHand(id,cards,faction){
  const el=document.getElementById(id);
  el.className='hand-mini';
  const wrongType = [...el.children].some(c=>!c.classList.contains('card-mini'));
  if(wrongType){
    el.innerHTML='';
  }
  const have=el.children.length;
  const need=cards.length;
  if(have>need){
    for(let i=0;i<have-need;i++) el.lastElementChild.remove();
  } else if(need>have){
    for(let i=0;i<need-have;i++){
      const d=document.createElement('div');
      d.className=`card-mini ${faction}-mini`;
      d.style.backgroundImage="url('img/runaha.png')";
      d.style.backgroundSize='cover';
      d.style.backgroundPosition='bottom';
      el.appendChild(d);
    }
  }
}

// Рисует персистентную зону игрока (.persist) — уже СЫГРАННЫЕ Мир и Артефакты под полем боя.
// ВАЖНО: рендерится НЕ через mkEl/.card, а отдельной упрощённой разметкой .pcard (просто текст
// иконка+название в рамке) — поэтому у Worlds/Artifacts на поле нет арта/статов, как у обычных карт.
// Также здесь живёт игровая логика щитов/кликов для активных артефактов с тегами 'shard' (можно
// активировать раз за ход) и 'sacrifice' (требует жертвы существа для активации).
// rPersist — pcards перенесены в stats bar (_mkPcardHtml).
// Зоны persist на поле оставляем пустыми.
function rPersist(id,player){
  const el=document.getElementById(id);
  if(el) el.innerHTML='';
}


// Генерирует HTML-строку для pcard в стат-баре.
// isPlayer=true — добавляет onclick-обработчики для активных артефактов текущего игрока.
function _mkPcardHtml(card, isPlayer){
  if(!card) return '';
  const faction=card.f;
  const cls=faction==='tea'?'tcp':'jcp';
  const isActivatable=hasTag(card,'shard')||hasTag(card,'sacrifice');
  const sleepCls=(isActivatable&&card.sleeping)?' sleeping':'';
  // isMyTurn — isPlayer только говорит "это бар человека" (в vsAI он ВСЕГДА true для своей
  // стороны, даже во время хода ИИ, т.к. playerK=G.humanFaction фиксирован — см. reorderZones()).
  // Без явной проверки G.turn===faction активация Shard/Altar оставалась кликабельной прямо
  // во время хода ИИ (баг, найденный автором 2026-07-24) — onclick тут вешается напрямую,
  // в обход onClick()/isAiTurn() в game.js, у которых такая проверка уже есть.
  const isMyTurn=G.turn===faction;
  const readyCls=(isPlayer&&isMyTurn&&isActivatable&&!card.sleeping&&!card.exhausted)?' pcard-active':'';
  // "Устал"/"спит" — прозрачность вешаем только на текст (.pcard-text ниже), а не на весь .pcard,
  // иначе вместе с текстом гаснет и фон-рамка со спрайтом створок, что выглядит как баг.
  const textExhaustedStyle=(isActivatable&&card.exhausted)?'opacity:0.5;':'';

  let onclick='';
  // pcard-targeting: карта в режиме "выбери цель для активации" (shardTarget/sacrificeTarget).
  // Раньше в этот момент подменялся весь border на плоский 2px solid — рамка со спрайтом створок
  // пропадала и визуально "усаживалась". Теперь рамка не трогается вообще, меняется только текст
  // (см. .pcard-targeting .pcard-text в styles.css — белый цвет + медленное мигание).
  let targetingCls='';
  if(isPlayer&&isMyTurn&&!card.sleeping&&!card.exhausted){
    if(hasTag(card,'shard')){
      if(G.phase==='shardTarget'){
        targetingCls=' pcard-targeting';
        onclick=`onclick="event.stopPropagation();playSfx('yellow_buttom');doShard(G[G.turn].artifacts[0])"`;
      } else if(G.phase==='action'){
        onclick=`onclick="event.stopPropagation();playSfx('yellow_buttom');doShard(G[G.turn].artifacts[0])"`;
      }
    }
    if(hasTag(card,'sacrifice')){
      if(G.phase==='sacrificeTarget'){
        targetingCls=' pcard-targeting';
        onclick=`onclick="event.stopPropagation();G.phase='action';G.sel=null;render()"`;
      } else if(G.phase==='action'){
        onclick=`onclick="event.stopPropagation();playSfx('yellow_buttom');G.phase='sacrificeTarget';G.sel='${card.id}';lg('Altar: select a creature to sacrifice.','hint');render()"`;
      }
    }
  }
  // spell_destroy_target (2026-07-24, по прямому запросу автора) — независимо от isPlayer
  // (тот флаг означает "своя сторона для активации Shard/Altar", не связан с тем, кто сейчас
  // ходит): цель — Мир/Артефакт ПРОТИВНИКА текущего хода (card.f!==G.turn), НЕ своя карта.
  // Та же красная подсветка-таргет, что у существ (aim-target, см. styles.css).
  if(card.f!==G.turn&&G.phase==='spellDestroyTarget'&&!isAiTurn()){
    targetingCls+=' pcard-targeting aim-target';
    onclick=`onclick="event.stopPropagation();doSpellDestroyTarget('${card.id}')"`;
  }
  const safeAb=(card.ab||'').replace(/"/g,"'");
  return `<div class="pcard pcard-inline ${cls}${sleepCls}${readyCls}${targetingCls}" data-pid="${card.id}" title="${safeAb}" ${onclick}><span class="pcard-text" style="${textExhaustedStyle}">${card.art||''} ${card.name}</span></div>`;
}

// Слот Мир/Артефакт в стат-баре: если карта уже сыграна — обычный pcard (см. _mkPcardHtml выше),
// если нет — постоянный плейсхолдер с фоном фракции (pcard_tea_bg.png слева от HP у Tea,
// pcard_jeet_bg.png справа от эссенции у Jeet, и наоборот у оппонента), той же ширины/высоты.
// ВАЖНО: раньше при отсутствии карты слот вообще не рендерился (пустая строка) — из-за этого
// стат-бар при розыгрыше Мира/Артефакта "прыгал" (слот появлялся и всё вокруг сдвигалось),
// а потом ещё раз перевыравнивался при розыгрыше второго слота. Плейсхолдер держит место
// зарезервированным с самого начала партии, поэтому появление реальной карты слот не двигает —
// она просто подставляется на уже занятое место.
function _mkPcardSlotHtml(card, faction, isPlayer){
  if(card) return _mkPcardHtml(card, isPlayer);
  const cls=faction==='tea'?'tcp':'jcp';
  return `<div class="pcard pcard-inline pcard-placeholder ${cls}"></div>`;
}

// ── Долгое нажатие/удержание на pcard (уже сыгранный Мир/Артефакт в стат-баре) — то же превью
// большой картой по центру экрана, что и у карт поля боя (showFieldCardPreview, см. mkSmallEl).
// Реализовано через делегирование на document, а не через addEventListener на самом .pcard —
// потому что стат-бар целиком пересоздаётся (innerHTML) на каждый render(), и вешать/снимать
// листенеры на каждый элемент заново было бы дороже и легко потерять при перерисовке во время
// самого удержания (например, если что-то в игре обновится, пока палец/кнопка ещё зажаты).
function findPersistCardById(id){
  for(const f of ['tea','jeet']){
    const p=G[f];
    if(p.world&&String(p.world.id)===String(id)) return p.world;
    const art=(p.artifacts||[]).find(a=>String(a.id)===String(id));
    if(art) return art;
  }
  return null;
}

let pcardPressTimer=null, pcardPressStart=null, pcardLongPressFired=false, pcardPressEl=null;
let suppressNextPcardClick=false; // гасит клик-активацию (shard/sacrifice) сразу после удержания
const clearPcardPressTimer=()=>{ if(pcardPressTimer){clearTimeout(pcardPressTimer);pcardPressTimer=null;} };
const endPcardPress=()=>{
  clearPcardPressTimer();
  if(pcardLongPressFired){
    pcardLongPressFired=false;
    closeFieldCardPreview();
    suppressNextPcardClick=true;
  }
  pcardPressEl=null;
};

document.addEventListener('mousedown',(e)=>{
  if(e.button!==0) return;
  const pcardEl=e.target.closest('.pcard[data-pid]'); // у плейсхолдера нет data-pid — он не участвует
  if(!pcardEl) return;
  const card=findPersistCardById(pcardEl.dataset.pid);
  if(!card) return;
  pcardPressEl=pcardEl; pcardPressStart={x:e.clientX,y:e.clientY}; pcardLongPressFired=false; clearPcardPressTimer();
  pcardPressTimer=setTimeout(()=>{pcardLongPressFired=true;showFieldCardPreview(card,pcardEl);},380);
  // Закрытие по mouseup на document (не на самом .pcard) — та же причина, что и у карт поля:
  // маленький элемент, курсор легко "убегает" за его пределы при удержании.
  document.addEventListener('mouseup', endPcardPress, {once:true});
});
document.addEventListener('touchstart',(e)=>{
  const pcardEl=e.target.closest('.pcard[data-pid]');
  if(!pcardEl) return;
  const card=findPersistCardById(pcardEl.dataset.pid);
  if(!card) return;
  const t=e.touches[0];
  pcardPressEl=pcardEl; pcardPressStart={x:t.clientX,y:t.clientY}; pcardLongPressFired=false; clearPcardPressTimer();
  pcardPressTimer=setTimeout(()=>{pcardLongPressFired=true;showFieldCardPreview(card,pcardEl);},380);
},{passive:true});
document.addEventListener('touchmove',(e)=>{
  if(!pcardPressTimer||!pcardPressEl) return;
  const t=e.touches[0];
  if(Math.abs(t.clientX-pcardPressStart.x)>10||Math.abs(t.clientY-pcardPressStart.y)>10) clearPcardPressTimer();
},{passive:true});
['touchend','touchcancel'].forEach(evt=>{
  document.addEventListener(evt,()=>{
    if(!pcardPressEl) return;
    clearPcardPressTimer();
    if(pcardLongPressFired){ pcardLongPressFired=false; closeFieldCardPreview(); suppressNextPcardClick=true; }
    pcardPressEl=null;
  });
});
// Фаза capture — успевает перехватить клик ДО того, как сработает inline onclick самого .pcard
// (активация shard/sacrifice артефакта), чтобы отпускание после удержания не активировало карту.
document.addEventListener('click',(e)=>{
  if(!suppressNextPcardClick) return;
  suppressNextPcardClick=false;
  if(e.target.closest('.pcard[data-pid]')){ e.stopPropagation(); e.preventDefault(); }
},true);

// Переставляет DOM-элементы местами в Hot Seat режиме: чужие зоны (поле/рука/статбар) — наверх экрана,
// свои — вниз, в зависимости от того, чей сейчас ход (G.turn). Физически перемещает существующие
// .field/.persist/.hand элементы между контейнерами, а не пересоздаёт их — поэтому быстро и без потери стейта.
//
// _seenPcardPids — pid Мира/Артефакта, для которых анимация входа (pcard-entering) уже была
// проиграна хотя бы раз. ВАЖНО: раньше "уже видели или нет" определялось по содержимому конкретного
// DOM-контейнера (#oppStats/#playerStats) на прошлом рендере — но при смене хода эти контейнеры
// физически меняют, какую фракцию показывают (см. oppK/playerK ниже), поэтому давно сыгранная
// карта каждый ход "внезапно" оказывалась в контейнере, где её раньше не было, и анимация входа
// проигрывалась заново. Глобальный Set не привязан к контейнеру — карта анимируется один раз за игру.
const _seenPcardPids = new Set();

// Подмена кнопки End Turn на плейсхолдер ожидания (btn_wait.gif) во время хода ИИ
// в режиме VS AI. Панель у человека при этом НЕ скрывается (см. render()/reorderZones()) —
// меняется только сама кнопка, клик по ней недоступен на время хода ИИ.
function updateEndTurnBtn(){
  // 2026-07-16: раньше здесь брали ТОЛЬКО G.humanFaction+'EndTurnBtn' — а в hotseat
  // G.humanFaction всегда null (см. initState()), так что document.getElementById
  // возвращал null и функция была тихим no-op. Кнопки #teaEndTurnBtn/#jeetEndTurnBtn —
  // статичные DOM-элементы, переживающие между партиями, поэтому если предыдущий матч
  // был VS AI и закончился ИМЕННО в момент хода ИИ (класс btn-waiting уже добавлен),
  // следующая hotseat-партия эту иконку снять не могла — виснет "ожидание" насовсем,
  // хотя ход спокойно переключается (пробел дёргает endTurn() напрямую, мимо
  // pointer-events:none кнопки). Поэтому сперва чистим ОБЕ кнопки безусловно, потом
  // вешаем класс обратно только туда, где он действительно нужен прямо сейчас.
  const teaBtn=document.getElementById('teaEndTurnBtn');
  const jeetBtn=document.getElementById('jeetEndTurnBtn');
  if(teaBtn) teaBtn.classList.remove('btn-waiting');
  if(jeetBtn) jeetBtn.classList.remove('btn-waiting');
  const activeFaction = G.mode==='vsai' ? G.humanFaction : G.turn;
  const btn=document.getElementById(activeFaction+'EndTurnBtn');
  if(!btn) return;
  const aiTurn = isAiTurn();
  btn.classList.toggle('btn-waiting', aiTurn);
}

// Строит HTML статус-бара одной фракции. mirrored=true — для бара, который сейчас сидит
// СВЕРХУ (оппонент): вся панель должна выглядеть как РАЗВЁРНУТАЯ НА 180° копия нижней —
// объект, что был у нас в правом верхнем углу, у оппонента оказывается в левом нижнем
// (не просто "отражён на месте", а физически переезжает на противоположную сторону).
// Для элементов, участвующих в обычном flex-потоке (extra/hp-placeholder/pcard/core) это
// делается разворотом ПОРЯДКА всего ряда — простой .reverse() уже даёт нужную перестановку
// позиций. pcard/HP/Essence — текст/арт с читаемым содержимым — при этом перемещаются, но
// НЕ зеркалятся по контенту (иначе стали бы нечитаемы); зато порядок HP/база/Essence ВНУТРИ
// statbar-core флипается отдельно (mirrored ? ess-name-hp : hp-name-ess), т.к. reverse()
// всего ряда не заглядывает внутрь одной строки-блока.
// Декоративные edge-элементы (statbar-edge-left/right/right-2) вне потока — position:absolute,
// на них .reverse() не действует (порядок в DOM для absolute неважен), поэтому их зеркальные
// координаты прописаны явно в styles.css (#oppStats .statbar-edge-*), см. комментарий там.
// isPlayerSide — как раньше у _mkPcardSlotHtml: включает onclick для активации
// Shard/Altar, актуально только для СВОЕЙ стороны (playerStats), не для оппонента.
function _mkStatsBarHtml(faction, mirrored, isPlayerSide){
  const p=G[faction];
  const edgeLeft='<span class="statbar-edge-left"></span>';
  const edgeRight2=faction==='jeet'?'<span class="statbar-edge-right-2"></span>':'';
  const worldSlot=_mkPcardSlotHtml(p.world, faction, false);
  const artifactSlot=_mkPcardSlotHtml(p.artifacts[0]||null, faction, isPlayerSide);
  const hpBox=`<span class="stat stat-hp-box ${faction}-hp-box"><img src="./img/hp_${faction}.png" class="stat-icon"> <span class="stat-val hp-val" id="${faction}Hp">${p.hp}</span></span>`;
  const nameBox=`<span class="player-name-box ${faction}-name-box hp-tier-${hpTier(p.hp)}" role="img" aria-label="${faction==='jeet'?'JEET':'TAVERN'}" onclick="event.stopPropagation();onBaseClick('${faction}')"></span>`;
  const essBox=`<span class="stat stat-ess-box ${faction}-ess-box" data-max="${p.essMax}"><img src="./img/ess${faction==='jeet'?'_jeet':''}.png" class="stat-icon"> <span class="ess-val" id="${faction}Ess">${p.ess}</span></span>`;
  const core=mirrored
    ? `<span class="statbar-core">${essBox}${nameBox}${hpBox}</span>`
    : `<span class="statbar-core">${hpBox}${nameBox}${essBox}</span>`;
  const inFlow=[
    '<span class="statbar-extra"></span>',
    '<span class="hp-placeholder"></span>',
    worldSlot,
    core,
    artifactSlot,
    '<span class="statbar-extra"></span>',
  ];
  const orderedInFlow=(mirrored?inFlow.slice().reverse():inFlow).join('\n  ');
  return `
  ${edgeLeft}
  ${orderedInFlow}
  ${edgeRight2}
  <span class="statbar-edge-right"></span>`;
}

function reorderZones(){
  let oppK,playerK;
  if(G.mode==='vsai'){
    playerK=G.humanFaction;
    oppK=G.aiFaction;
  } else {
    oppK=G.turn==='tea'?'jeet':'tea';
    playerK=G.turn;
  }
  const oppP=G[oppK];
  const playerP=G[playerK];

  const oppStats=document.getElementById('oppStats');
  const playerStats=document.getElementById('playerStats');
  if(oppStats){
    oppStats.className='stats-bar '+(oppK==='jeet'?'jeet':'tea')+' hp-tier-'+hpTier(oppP.hp);
    oppStats.innerHTML=_mkStatsBarHtml(oppK, true, false);
    oppStats.querySelectorAll('[data-pid]').forEach(el=>{
      const pid=el.dataset.pid;
      if(!_seenPcardPids.has(pid)){ _seenPcardPids.add(pid); el.classList.add('pcard-entering'); }
    });
  }
  if(playerStats){
    playerStats.className='stats-bar '+(playerK==='jeet'?'jeet':'tea')+' hp-tier-'+hpTier(playerP.hp);
    playerStats.innerHTML=_mkStatsBarHtml(playerK, false, true);
    playerStats.querySelectorAll('[data-pid]').forEach(el=>{
      const pid=el.dataset.pid;
      if(!_seenPcardPids.has(pid)){ _seenPcardPids.add(pid); el.classList.add('pcard-entering'); }
    });
  }

  const oppFieldZone=document.getElementById('oppFieldZone');
  const playerFieldZone=document.getElementById('playerFieldZone');
  const jeetField=document.getElementById('jeetField');
  const jeetPersist=document.getElementById('jeetPersist');
  const teaField=document.getElementById('teaField');
  const teaPersist=document.getElementById('teaPersist');

  if(oppFieldZone&&playerFieldZone){
    if(oppK==='jeet'){
      if(jeetField&&jeetField.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetPersist);
      if(teaField&&teaField.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaPersist);
    } else {
      if(teaField&&teaField.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaPersist);
      if(jeetField&&jeetField.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetPersist);
    }
  }

  const oppHandZone=document.getElementById('oppHandZone');
  const playerHandZone=document.getElementById('playerHandZone');
  const jeetHand=document.getElementById('jeetHand');
  const teaHand=document.getElementById('teaHand');
  // Фон/рамка руки — по фракции, которая СЕЙЧАС физически занимает эту позицию (см.
  // .opp-hand-zone.jeet/.tea, .player-hand-zone.jeet/.tea в styles.css). Та же схема,
  // что уже работает для oppStats/playerStats чуть выше — className выставляется заново
  // каждый вызов, не только при реальной смене родителя ниже.
  if(oppHandZone) oppHandZone.className='opp-hand-zone '+(oppK==='jeet'?'jeet':'tea');
  if(playerHandZone) playerHandZone.className='player-hand-zone '+(playerK==='jeet'?'jeet':'tea');
  if(oppHandZone&&playerHandZone){
    if(oppK==='jeet'){
      if(jeetHand&&jeetHand.parentElement!==oppHandZone) oppHandZone.appendChild(jeetHand);
      if(teaHand&&teaHand.parentElement!==playerHandZone) playerHandZone.appendChild(teaHand);
    } else {
      if(teaHand&&teaHand.parentElement!==oppHandZone) oppHandZone.appendChild(teaHand);
      if(jeetHand&&jeetHand.parentElement!==playerHandZone) playerHandZone.appendChild(jeetHand);
    }
  }

  const teaBB=document.getElementById('teaBottomBar');
  const jeetBB=document.getElementById('jeetBottomBar');
  if(G.mode==='vsai'){
    const humanBB=document.getElementById(G.humanFaction+'BottomBar');
    const aiBB=document.getElementById(G.aiFaction+'BottomBar');
    if(aiBB) aiBB.style.display='none';
    if(humanBB) humanBB.style.display='flex';
  } else {
    if(teaBB) teaBB.style.display=G.turn==='tea'?'flex':'none';
    if(jeetBB) jeetBB.style.display=G.turn==='jeet'?'flex':'none';
  }
}

// Динамически считает отрицательный margin между картами в руке, чтобы они "веером" перекрывали друг
// друга и помещались в ширину контейнера, если карт много. Отдельно считает для .card (полноразмерные
// карты в открытой руке) и .card-mini (рубашки в чужой скрытой руке).
// ВАЖНО: ширину меряем у РОДИТЕЛЯ (el.parentElement = .opp-hand-zone/.player-hand-zone), а не у самого el —
// el сам по себе сжимается вместе со своими отрицательными margin (раз элементы переиспользуются между
// рендерами, а не пересоздаются), и измерение его собственной ширины создавало цикл само-сжатия
// ("карты схлопываются к центру" с каждым рендером всё туже). Родительская зона на margin детей не влияет,
// поэтому даёт стабильное число каждый раз.
// ПРИМЕЧАНИЕ: ищет родителя с классом .player-hand-wrap — такого класса сейчас нет в разметке
// (зона руки называется .player-hand-zone), поэтому wrap всегда null и используется запасной вариант —
// ширина el.parentElement. Если когда-нибудь понадобится именно .player-hand-wrap —
// переименуй класс в разметке либо поменяй селектор здесь на актуальный.
function adjustHandOverlap(){
  ['teaHand','jeetHand'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const wrap=el.closest('.player-hand-wrap');
    let containerW=wrap?wrap.getBoundingClientRect().width:el.parentElement.getBoundingClientRect().width;
    const zoneStyle=getComputedStyle(el.parentElement);
    const zonePad=(parseFloat(zoneStyle.paddingLeft)||0)+(parseFloat(zoneStyle.paddingRight)||0);
    containerW=Math.floor(containerW)-zonePad;
    if(containerW<=20) containerW=window.innerWidth-90-24;
    if(containerW<=20)return;

    const cards=el.querySelectorAll('.card');
    if(cards.length>0){
      const cardW=cards[0].getBoundingClientRect().width||parseFloat(getComputedStyle(cards[0]).width)||118;
      const total=cards.length;
      let margin=0;
      if(total>1){
        const totalW=cardW*total + (total-1)*8;
        if(totalW>containerW){
          margin=-Math.ceil((totalW-containerW)/(total-1));
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      cards.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        if(!G.previewCard||card.dataset.id!==G.previewCard){
          card.style.zIndex=String(i+1);
        } else {
          card.style.zIndex='';
        }
        card.style.flexShrink='0';
      });
    }

    const mini=el.querySelectorAll('.card-mini');
    if(mini.length>0){
      const cardW=mini[0].getBoundingClientRect().width||parseFloat(getComputedStyle(mini[0]).width)||36;
      const total=mini.length;
      let margin=-8;
      if(total>1){
        const needed=cardW*total;
        if(needed>containerW){
          margin=-Math.floor((needed-containerW)/(total-1))-1;
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      mini.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        card.style.zIndex=String(i+1);
      });
    }
  });
}
