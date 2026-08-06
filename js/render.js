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
    hasTag(card,'spell_burn_target') || hasTag(card,'spell_fear_target') ||
    // 2026-07-24 (баг, автор, ещё заход): GUST/REVERSE-редизайн (spell_bounce_ally_target)
    // и JUDGMENT/DEATHBLOW (spell_execute_half) — оба новые targeted-теги, забытые в этом
    // списке при заводе, та же самая история, что и у всех остальных выше.
    hasTag(card,'spell_bounce_ally_target') || hasTag(card,'spell_execute_half')
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
    hasTag(card,'spell_random_spread') || hasTag(card,'spell_heal_all') ||
    // 2026-07-24 (баг, автор, ещё заход): RENEWAL/AMNESIA (spell_refresh_hand) и MUSE/
    // SCAVENGE (spell_loot) — оба резолвятся МГНОВЕННО и молча (никакого playSfx в
    // execution-кейсах 'refresh_hand'/'loot' в abilities.js — автор позже добавит свой
    // звук отдельно), так что общий 'card_spell_atack' на Play был единственным звуком,
    // но неверным по смыслу (это не удар/урон). Тишина сейчас и есть "свой звук" по факту,
    // тот же принцип, что у MULTITUDE/LEGION выше.
    hasTag(card,'spell_refresh_hand') || hasTag(card,'spell_loot'));
}

// ГЛАВНАЯ функция перерисовки экрана игры. Вызывается после каждого действия (ход, атака, игра карты и т.д.)
// Обновляет: счётчики хода/HP/Essence/колоды/кладбища, поля боя, руки обоих игроков (своя — открыта, чужая — рубашками),
// персистентную зону (Worlds/Artifacts), z-index рук, подсветку "можно бить по базе", текст подсказки текущей фазы.
function render(){
  const cur=G[G.turn];
  document.getElementById('turnNum').textContent=G.turnNum;
  document.getElementById('turnPlayer').textContent=G.turn.toUpperCase();
  // reorderZones() ПЕРВЫМ (2026-08-04, автор поймал живьём — см. её комментарий про
  // _seenHandCardIds выше по файлу): переставляет oppFieldZone/playerFieldZone и
  // oppHandZone/playerHandZone (кто сейчас "противник", а кто "игрок") ДО того, как
  // rZone() ниже наполнит их картами и измерит позиции для анимации прилёта из колоды.
  // Раньше reorderZones() стоял в конце render() — при передаче хода в хотсите рука
  // нового игрока рендерилась (и её restRect мерялся) ПОКА её контейнер ещё физически
  // сидел в СТАРОЙ зоне (там, где была видна как чужая свёрнутая рука) — клон улетал не
  // в реальную конечную позицию карты, а туда, где эта позиция ошибочно измерилась в
  // неправильном контейнере (визуально — "улетает наверх, к противнику").
  reorderZones();
  ['tea','jeet'].forEach(f=>{
    const p=G[f];
    document.getElementById(f+'Hp').textContent=p.hp;
    document.getElementById(f+'Ess').textContent=p.ess;
    const hc=document.getElementById(f+'HandCount');
    if(hc)hc.textContent=p.hand.length;
    // Stats bar counters
    const dc=document.getElementById(f+'DeckCountStat');
    if(dc){
      dc.textContent=p.deck.length;
      // Мигание красным при 0 картах в колоде (2026-07-27, по прямому запросу автора —
      // геймдизайн-нюанс: fatigue-проигрыш иначе абсолютно неочевиден игроку). Тот же
      // mishenBlink, что уже использует мишень атаки/.pcard.aim-target — "не сильно
      // быстрое" мигание, 1.1с цикл.
      dc.classList.toggle('deck-count-empty', p.deck.length===0);
    }
    const gc=document.getElementById(f+'GraveCountStat');
    if(gc)gc.textContent=p.grave.length;
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

  // Показ активной кнопки End Turn (2026-08-03: раньше переключался целый bottom-bar,
  // теперь оба #teaEndTurnBtn/#jeetEndTurnBtn сидят в одном слоте .arena-endturn-slot —
  // видна только кнопка активного игрока, та же логика show/hide, что была у бара.
  if(G.mode==='vsai'){
    const humanBtn=document.getElementById(G.humanFaction+'EndTurnBtn');
    const aiBtn=document.getElementById(G.aiFaction+'EndTurnBtn');
    if(aiBtn)aiBtn.style.display='none';
    // Кнопка человека видна ВСЕГДА в vsai, даже во время хода ИИ —
    // на время хода ИИ у неё просто подменяется вид (см. updateEndTurnBtn ниже).
    if(humanBtn)humanBtn.style.display='flex';
  } else {
    const inactBtn=document.getElementById((G.turn==='tea'?'jeet':'tea')+'EndTurnBtn');
    if(inactBtn)inactBtn.style.display='none';
    const actBtn=document.getElementById(G.turn+'EndTurnBtn');
    if(actBtn)actBtn.style.display='flex';
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
    gustAllyTarget:'Select an ally creature to return to hand.',
    spellExecuteHalfTarget:'Select an enemy creature.',
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
      G.phase==='shardTarget'||G.phase==='boltTarget'||G.phase==='shotTarget'||
      G.phase==='spellProvokeBreakTarget'||G.phase==='spellDmgTrampleTarget'||
      G.phase==='spellArmorTarget'||G.phase==='spellDestroyTarget'||
      G.phase==='spellBurnTarget'||G.phase==='spellFearTarget'||
      G.phase==='spellBounceAllyTarget'||G.phase==='spellExecuteHalfTarget'||G.phase==='gustAllyTarget'
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
  // Golden Travelers (2026-07-30) — та же поправка, что у getCardType()/DB_FILTERS выше:
  // unique БЕЗ gtype (TEANTIST/RYVLEN/...) — 'Unique'. unique+gtype (золотые
  // путешественники, та же архетипная механика, просто золотые) — 'Traveler', золотость
  // и так видна по золотому фону карты, бэйдж не должен её перекрывать/дублировать.
  const hasGtype=(card.tags||[]).some(t=>t.startsWith('gtype:'));
  if(card.unique&&!hasGtype) return 'Unique';
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
// 2026-08-04 (по прямому запросу автора — зум карты в руке выглядел заметно мельче зума
// карты поля): оказалось, что ОБА места (showFieldCardPreview для поля, zoomHandCardFly
// для руки) уже строят один и тот же полноразмерный .card-элемент (mkEl, НЕ mkSmallEl) и
// масштабируют его transform:scale() — то есть "карта в руке изначально больше карты на
// поле" НЕ влияет на конечный зумленный размер вообще, разным был только сам коэффициент
// (2.08 у поля против 1.6 у руки на отдельной константе). Раньше это была "отдельная фича,
// не трогали" — теперь просто ссылка на ту же константу, чтобы больше никогда не разъехались.
const HAND_ZOOM_SCALE      = FIELD_PREVIEW_SCALE; // зум руки = зум поля (тот же итоговый размер)
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
  return `Squad bonus active${parts.length?': '+parts.join(', '):''}.`;
}
function _cardStatusEntries(card){
  const entries=[];
  // Дебафы
  if(card.feared) entries.push({icon:'img/ico_fear.png', text:'Feared — skips its next turn and deals no counter-attack damage.'});
  if(card.burning){
    // 2026-07-25 (по прямому запросу автора) — было "until it dies" (Burn был бессрочным).
    // Теперь Burn ограничен BURN_DURATION ходами (см. game.js) — показываем реальный
    // остаток по card.burnTurns вместо старого текста. Fallback на BURN_DURATION на
    // случай если статус выставлен, а burnTurns почему-то ещё не проставлен (не должно
    // случаться в норме — все места наложения burn ставят оба поля разом).
    const bt = card.burnTurns!==undefined ? card.burnTurns : BURN_DURATION;
    entries.push({icon:'img/ico_burn.png', text:`Burning — loses 1 HP at the start of each of its turns. ${bt} turn${bt===1?'':'s'} left.`});
  }
  if(card.provokeBroken) entries.push({icon:'img/ico_tb.png', text:'Provoke suppressed — can be attacked freely, bypassing Provoke, until the start of its owner\'s next turn.'});
  if(card.frozen){
    const ft = card.frozenTurnsLeft!==undefined ? card.frozenTurnsLeft : 2;
    entries.push({icon:'img/ico_snow.png', text:`Frozen for ${ft} more of its own turn${ft===1?'':'s'} — cannot act at all. Any incoming damage will be blocked entirely and shatter the freeze.`});
  }
  if(card.mekMarked){
    const mt = card.mekMarkTurns!==undefined ? card.mekMarkTurns : 2;
    entries.push({icon:'img/ico_mek.png', text:`Marked — takes +1 damage from all sources. ${mt} turn${mt===1?'':'s'} left.`});
  }
  if(card.interceptUsed) entries.push({icon:'img/ico_intercept.png', text:'Intercept triggered — already redirected an attack this turn.'});
  if(hasTag(card,'shield')&&!card.shieldConsumed) entries.push({icon:'img/solana_shield.png', text:'Solana Shield — absorbs the next hit entirely from any source, one time only.'});
  if(card.sleeping) entries.push({icon:'img/zzz.png', text:'Sleeping — entered the battleground this turn, wakes up at the start of your next turn.'});
  if(hasTag(card,'invisible')) entries.push({icon:'img/ico_invis.png', text:'Invisible — cannot be targeted by attacks or spells while a non-invisible ally is still on the battleground.'});
  if(hasTag(card,'stealth')&&!card.stealthBroken) entries.push({icon:'img/ico_stealth.png', text:'Stealth — cannot be targeted by attacks or spells until it attacks for the first time.'});
  // Инкарнация/Reborn — "уже сработало" статусы (2026-08-05, по прямому запросу автора).
  // Оба поля (incarnUsed/rememberUsed) одноразовые НА ВСЮ ИГРУ (см. killCard()/endTurn() —
  // "Инкарнация — тик по кладбищу" — и REMEMBER EVERYTHING блок в killCard() соответственно),
  // так что показываем их всегда, пока карта несёт тег и уже потратила заряд — независимо от
  // того, только что это случилось или было много ходов назад (нет отдельного таймера, в
  // отличие от Frost/Mek/Burn выше — тут просто константный факт "уже нельзя второй раз").
  if(hasTag(card,'incarnation')&&card.incarnUsed) entries.push({icon:'img/ico_incarn.png', text:'Incarnation already used.'});
  if(hasTag(card,'remember')&&card.rememberUsed) entries.push({icon:'img/ico_remember.png', text:'Reborn already used.'});
  // Бафы
  if(card.atkBonus) entries.push({icon:'img/attack.png', text:`+${card.atkBonus} ATK from an aura on the battleground.`});
  if(card.auraMaxHpBonus) entries.push({icon:'img/heart.png', text:`+${card.auraMaxHpBonus} Max HP from an aura on the battleground.`});
  if(card.worldMaxHpBonus) entries.push({icon:'img/heart.png', text:`+${card.worldMaxHpBonus} Max HP from the World card.`});
  if(card.auraArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.auraArmorBonus} Armor from an aura on the battleground.`});
  if(card.worldArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.worldArmorBonus} Armor from the World card.`});
  if(card.spellArmorBonus) entries.push({icon:'img/armor.png', text:`+${card.spellArmorBonus} Armor from a spell until gone from battleground.`});
  if(card.tempAtkBonus) entries.push({icon:'img/attack.png', text:`+${card.tempAtkBonus} ATK from a spell until gone from battleground.`});
  if(rageAtkBonus(card)) entries.push({icon:'img/ico_rage.png', text:`+${rageAtkBonus(card)} ATK from Rage.`});
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
// Frost overlay (2026-07-27) — mkSmallEl() rebuilds a FRESH DOM node for every card on every
// single render() call (see rZone() above — even already-on-field cards get replaceWith'd),
// so a plain CSS `animation` on the overlay would replay its pop-in on every unrelated
// re-render while the card stays frozen. Same problem _seenPcardPids (below) already solves
// for lore-page reveals — same fix here: a persistent JS-side Set remembers which card ids
// have ALREADY played the entrance this "freeze session", so it only plays once per actual
// freeze event, not once per render tick. Cleared (id removed) the moment the card stops
// being frozen, so a LATER re-freeze plays the entrance fresh again.
// IMMUNE-надпись (2026-07-27, по прямому запросу автора) — списки фаз выбора цели, где
// Ward/Frost/активный Shield могут заблокировать ИМЕННО карту (см. использование в
// mkSmallEl() ниже). Вынесено на уровень модуля, а не внутрь функции — списки не меняются,
// нет смысла пересоздавать литерал массива на каждый вызов mkSmallEl() (render() и так
// пересобирает весь DOM каждый раз, лишняя работа множится на каждую карту на поле).
const DEBUFF_TARGET_PHASES=['spellFearTarget','spellBurnTarget','spellProvokeBreakTarget'];
const DMG_TARGET_PHASES=['spellDmgTarget','spellDmgTrampleTarget','spellExecuteHalfTarget','shardTarget','boltTarget'];
// shotTarget НЕ входит сюда (2026-08-05, багфикс) — Shot физический (bypassArmor=false,
// см. doShotTarget() в game.js), Ward блокирует только bypassArmor=true урон, так что Ward
// не делает цель иммунной к Shot. Раньше shotTarget был включён по аналогии с boltTarget
// (копипаста при заводе механики 2026-08-04) — из-за этого рядом с целью под Ward мигал
// IMMUNE, хотя выстрел по ней бы прошёл: та же цель уже помечена 'targetable'/'aim-target'
// чуть выше (см. отдельное shotTarget-условие БЕЗ ward-исключения), но тут же получала
// противоречивый IMMUNE поверх — теперь immune-target для этой фазы не навешивается вовсе.

const _frostSeenIds = new Set();

function mkSmallEl(card){
  const d=document.createElement('div');
  d.className=`card-small ${card.f}-card${card.golden?' golden':''}`;
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')) d.classList.add('invisible-visual');
  // Stealth — полупрозрачность только пока эффект ещё активен (не сработал ни разу).
  // card.stealthBroken выставляется в true при первой атаке (см. game.js doAttack/hitCard) —
  // это одноразовый эффект на всю игру, дальше карта выглядит как обычно.
  if(hasTag(card,'stealth')&&!card.stealthBroken){
    d.classList.add('stealth-visual');
  }
  if(card.feared)d.classList.add('feared');
  if(card.burning)d.classList.add('burning');
  // Invis/Stealth overlay box (2026-07-27, по прямому запросу автора) — тот же баг и тот же
  // фикс, что у Frost чуть ниже: раньше здесь был d.appendChild() для 'Invis'-текстовой
  // плашки (`inv` span) — но он стоял ДО d.innerHTML=`...` дальше по функции, которое стирает
  // ЛЮБОЙ appendChild, сделанный раньше (см. подробный разбор бага в комментарии у
  // frostBoxHtml ниже) — плашка молча никогда не рендерилась. Теперь вместо неё — HTML-строка
  // (тот же паттерн, что уже используют card-small-burning/-feared/-tauntbroken/frostBoxHtml),
  // вставляется ВНУТРЬ самого шаблона. Условие показа — ТА ЖЕ логика видимости, что уже
  // использует getTargetableCards() (game.js): stealth, пока не раскрылась (card.stealthBroken
  // === false), ИЛИ invisible, пока рядом на своём поле есть хотя бы один ВИДИМЫЙ (не-invisible)
  // союзник (allInvisible — если ВСЕ свои существа invisible разом, сама карта уже
  // targetable, оверлей не нужен).
  let invisBoxHtml='';
  if(hasTag(card,'stealth') && !card.stealthBroken){
    invisBoxHtml='<div class="invis-overlay"></div>';
  } else if(hasTag(card,'invisible')){
    const ownField=G[card.f].field;
    const allInvisible=ownField.length>0 && ownField.every(c=>hasTag(c,'invisible'));
    if(!allInvisible) invisBoxHtml='<div class="invis-overlay"></div>';
  }
  // Mek overlay box (2026-07-30, "MonoMEK" Метка, по прямому запросу автора) — тот же
  // паттерн, что и invisBoxHtml выше: HTML-строка ЗАРАНЕЕ, вставляется внутрь основного
  // innerHTML-шаблона (не appendChild — тот же баг, что чинили у Invis/Frost). НАМЕРЕННО
  // на том же низком z-index, что и .invis-overlay (см. css/styles.css), а НЕ на высоком,
  // как .frost-overlay — по прямому запросу автора остальные дебафф-бэйджи (Fear/Burn/
  // TauntBroken/мишень таргетинга) должны рендериться ПОВЕРХ Метки, не под ней.
  const mekBoxHtml = card.mekMarked ? '<div class="mek-overlay"></div>' : '';
  // Frost overlay box (2026-07-27) — БАГФИКС (автор поймал 2026-07-27): раньше здесь стоял
  // d.appendChild(frostBox) — но чуть ниже по функции есть d.innerHTML=`...` (весь основной
  // шаблон карты), которое полностью ЗАМЕНЯЕТ содержимое d, стирая любой appendChild,
  // сделанный ДО этой строки (тот же баг молча топит и `inv` — Invisible-лейбл выше, — просто
  // никто не заметил, т.к. .invisible-visual и так стилизуется через CSS-класс без текста).
  // Правильный паттерн — тот же, что уже используют card-small-burning/-feared/-tauntbroken
  // чуть ниже: посчитать HTML-строку ЗАРАНЕЕ и вставить её ВНУТРЬ самого innerHTML-шаблона
  // (см. frostBoxHtml, используется в шаблоне ниже), а не создавать отдельный DOM-узел здесь.
  let frostBoxHtml='';
  if(card.frozen||card._frostLeaving){
    const cid=String(card.id);
    let extraClass='', extraStyle='';
    if(!card.frozen && card._frostLeaving){
      extraClass=' frost-leaving';
      _frostSeenIds.delete(cid);
    } else if(_frostSeenIds.has(cid)){
      // Уже видели вход этой заморозки — не переигрываем pop-in на каждый рендер.
      extraStyle=' style="animation:none;"';
    } else {
      _frostSeenIds.add(cid);
    }
    frostBoxHtml=`<div class="frost-overlay${extraClass}"${extraStyle}></div>`;
  } else {
    _frostSeenIds.delete(String(card.id));
  }
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable','aim-target');
  if(G.phase==='selectTarget'&&card.f!==G.turn){
    const oppField=G[card.f].field;
    const attS=G.sel?findC(G.sel):null;
    const targetableS=getTargetableCards(oppField,attS);
    if(targetableS.includes(card.id))d.classList.add('targetable','aim-attack'); // обычная атака — та же красная подсветка, что и у спеллов, + свой оверлей-мишень (swords.png, 2026-08-05, по прямому запросу автора — раньше тут была ТОЛЬКО подсветка, без иконки, см. aim-target у спеллов ниже)
  }
  // Видимость (invisible/нераскрытый stealth, 2026-07-19) — раньше эти четыре подсветки
  // вообще не фильтровали по isSpellTargetable(), то есть на invisible/скрытой stealth-
  // карте мишень всё равно рисовалась, хотя клик по ней потом молча блокировался
  // click-хендлером в game.js (isSpellTargetable там уже проверялся). Теперь оба места
  // используют ОДНУ и ту же функцию с ОДНИМ и тем же контекстом поля (G[card.f].field —
  // card.f тут всегда вражеская сторона, т.к. card.f!==G.turn), включая fallback
  // "все враги invisible → все становятся видимой целью", как и у обычной атаки.
  if(G.phase==='shardTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&(!hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed))&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='boltTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&(!hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed))&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  // Shot (2026-08-04) — та же подсветка, что у Bolt выше, но БЕЗ ward-исключения: Ward не
  // блокирует физический (bypassArmor=false) урон, так что Ward-цели тоже подсвечиваются.
  if(G.phase==='shotTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDmgTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&(!hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed))&&isSpellTargetable(card,G[card.f].field)){
    d.classList.add('targetable','aim-target');
    // Мишень-череп (2026-07-27) — VERDICT/DAMNATION (spell_dmg_target ≥ текущего HP цели,
    // на практике это insta-kill спеллы с фиксированным 999) убивают ЛЮБУЮ валидную цель —
    // череп показывается поголовно на всех подсвеченных целях этой фазы, когда каст именно
    // такого спелла. Обычные (не insta-kill) spell_dmg_target — просто урон, обычная мишень.
    const spellDmg=G.pendingSpell?getTagVal(G.pendingSpell,'spell_dmg_target'):0;
    if(spellDmg>=card.hp) d.classList.add('aim-target-kill');
  }
  // CINDER/DREAD (2026-07-24) — тот же паттерн подсветки, что у spellDmgTarget.
  if((G.phase==='spellBurnTarget'||G.phase==='spellFearTarget')&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&!card.frozen&&!hasTag(card,'ward')&&!(hasTag(card,'shield')&&!card.shieldConsumed)&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDispelTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellBuffTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  if(G.phase==='spellArmorTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  if(G.phase==='spellUntapTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&(card.sleeping||card.exhausted)) d.classList.add('healable','aim-heal');
  // spellProvokeBreakTarget (EXPOSE/UNMASK) — только реальные Provoke-цели подсвечиваются
  // как валидные, как и у spellUntapTarget выше (нет смысла подсвечивать то, по чему клик
  // всё равно молча проигнорируется — см. click-хендлер в game.js).
  if(G.phase==='spellProvokeBreakTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&hasTag(card,'provoke')&&!card.provokeBroken&&!card.frozen&&!hasTag(card,'ward')&&!(hasTag(card,'shield')&&!card.shieldConsumed)&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
  if(G.phase==='spellDmgTrampleTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&(!hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed))&&isSpellTargetable(card,G[card.f].field)) d.classList.add('targetable','aim-target');
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
  // TEANTIST "Return your ally" (2026-07-30, по прямому запросу автора) — тот же
  // .healable/.aim-heal стиль подсветки, что у GUST/REVERSE выше, но card.id!==G.sel —
  // сам кастер не подсвечивается и не кликабелен как цель (не может вернуть себя).
  if(G.phase==='gustAllyTarget'&&card.f===G.turn&&card.id!==G.sel&&!card.spell&&!card.world&&!card.artifact) d.classList.add('healable','aim-heal');
  // JUDGMENT/DEATHBLOW rework (2026-07-26) — цель теперь ЛЮБОЕ вражеское существо, тот же
  // общий гейт видимости, что у spellDmgTarget — эффект (Bolt 1, потом условное добивание)
  // решается внутри doSpellExecuteHalfTarget(), не на этапе выбора цели.
  if(G.phase==='spellExecuteHalfTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact&&(!hasTag(card,'ward')||(hasTag(card,'shield')&&!card.shieldConsumed))&&isSpellTargetable(card,G[card.f].field)){
    d.classList.add('targetable','aim-target');
    // Мишень-череп (2026-08-05, багфикс по прямому запросу автора — заменяет старую формулу
    // 2026-07-27) — JUDGMENT/DEATHBLOW либо наносит Bolt 1, ЛИБО добивает: порог "≤50% maxHP
    // (округление вниз)" проверяется по ТЕКУЩЕМУ HP цели ПРЯМО СЕЙЧАС, до какого-либо урона —
    // не по гипотетическому HP после ещё не нанесённого Bolt 1 (старая формула `card.hp-1`
    // симулировала урон, которого могло вообще не случиться отдельно от добивания — см.
    // doSpellExecuteHalfTarget() для того же исправления и разбора конкретного примера
    // автора: 4/5 карта с текущим hp=3 НЕ должна считаться "уже на половине").
    if(card.hp<=Math.floor(card.maxHp/2)) d.classList.add('aim-target-kill');
  }
  // IMMUNE-надпись (2026-07-27, по прямому запросу автора) — раньше карта, недоступная
  // целью конкретно из-за Ward/Frost/активного Shield, просто оставалась "пустой" (без
  // мишени, без объяснения) — теперь на ней мигает IMMUNE (см. .card-small.immune-target
  // в css/styles.css), чтобы было понятно ПОЧЕМУ нельзя нажать, а не просто "ничего нет".
  // Единая проверка для debuff-фаз (Ward+Frost+Shield все три блокируют) и damage/destroy-
  // фаз (только Ward, с поправкой на ещё активный Shield — тот же принцип, что и у самих
  // aim-target проверок этих фаз выше). НЕ навешивается, если карта и так не была бы
  // валидной целью по ДРУГОЙ причине (не враг/невидима/спелл-мир-артефакт/не-Provoke) —
  // условие isSpellTargetable() ниже уже отсеивает invisible/нераскрытый stealth.
  if(card.f!==G.turn && !card.spell && !card.world && !card.artifact && isSpellTargetable(card,G[card.f].field)){
    const shieldActiveNow=hasTag(card,'shield')&&!card.shieldConsumed;
    if(DEBUFF_TARGET_PHASES.includes(G.phase)){
      const baseOk = G.phase!=='spellProvokeBreakTarget' || (hasTag(card,'provoke') && !card.provokeBroken);
      if(baseOk && (card.frozen || hasTag(card,'ward') || shieldActiveNow)) d.classList.add('immune-target');
    } else if(DMG_TARGET_PHASES.includes(G.phase)){
      if(hasTag(card,'ward') && !shieldActiveNow) d.classList.add('immune-target');
    }
  }
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
  'remember': '<img src="img/ico_remember.png" style="width:60%;height:60%;">', // REMEMBER EVERYTHING — 2026-07-26, замена Erase на живых картах
  'intercept': '<img src="img/ico_intercept.png" style="width:60%;height:60%;">',
  'stealth': '<img src="img/ico_stealth.png" style="width:60%;height:60%;">',
  'thorns': '<img src="img/ico_fire_shield.png" style="width:60%;height:60%;">',
  'shadow_shield': '<img src="img/ico_shadow.png" style="width:60%;height:60%;">',
  'shield': '<img src="img/ico_solana_shield.png" style="width:60%;height:60%;">',
  'draw_attack': '<img src="img/ico_haunt.png" style="width:60%;height:60%;">', // HAUNT — переехал с atk_vs_feared на draw_attack, 2026-07-26
  'death_heal': '<img src="img/ico_bambo.png" style="width:60%;height:60%;">', // BAMBOO — death_heal:N, 2026-07-26
  'death_bolt': '<img src="img/ico_cloud.png" style="width:60%;height:60%;">', // PINK CLOUDS / Thunder Storm — death_bolt:N, переехал со Scheme (2026-07-27)
  'death_armor': '<img src="img/ico_scheme.png" style="width:60%;height:60%;">', // SCHEME (новый тег) — death_armor:N, 2026-07-27, занял иконку/трейт-слот после переезда death_bolt на Pink Clouds
  'frost': '<img src="img/ico_snow.png" style="width:60%;height:60%;">', // FROST ATTACK — Winter from RGB, ультраредкий Mood-трейт, 2026-07-27
  'foxy': '<img src="img/ico_fff.png" style="width:60%;height:60%;">', // FOXY TRICK — Orange from FFF, ультраредкий Mood-трейт, 2026-07-27
  'market': '<img src="img/ico_market.png" style="width:60%;height:60%;">', // GAME OF MARKET — To the Moon with DHD, ультраредкий Mood-трейт, 2026-07-28
  'nana': '<img src="img/ico_nana.png" style="width:60%;height:60%;">', // NANA — Nanas from SMB, ультраредкий Mood-трейт, 2026-07-29
  'dd': '<img src="img/ico_dd.png" style="width:60%;height:60%;">', // DD CLEAVE — DD's Signature, ультраредкий Mood-трейт, 2026-07-29
  'death_atk': '<img src="img/ico_optic.png" style="width:60%;height:60%;">', // OPTIC DOPE — death_atk:N, World-трейт (Optical Dope), 2026-07-29
  'mek': '<img src="img/ico_mek.png" style="width:60%;height:60%;">', // MonoMEK — ультраредкий World-трейт, 2026-07-30
};
const tagIcons=(card.tags||[])
  // val fallback '1', не '' (2026-08-05, багфикс по прямому запросу автора — тултип
  // Regen показывал "?" вместо реального значения) — голый тег без :N (regen без числа —
  // единственный такой в живых данных, см. data.js) реально лечит на 1 HP (getTagVal()
  // возвращает JS-boolean true для голого тега, а true+число в арифметике ведёт себя как
  // 1 — см. case 'regen' в abilities.js), но пустая строка ''||'?' в тултипе (ui.js) не
  // знала об этой договорённости и просто показывала placeholder. '1' тут — не догадка, а
  // тот же дефолт, что уже даёт голому тегу вся остальная игровая логика.
  .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:'1'}))
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
    ${armorDisp?`<div class="card-small-armor-box" data-armor="${armorDisp.cur}" data-maxarmor="${armorDisp.max}"><span class="card-small-armor">${armorDisp.cur}</span></div>`:''}
    <div class="card-type-dot" data-type="${getTypeDotLabel(card)}" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    ${invisBoxHtml}
    ${mekBoxHtml}
    ${card.burning?'<div class="card-small-burning"><img src="img/ef_burn.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.feared?'<div class="card-small-feared"><img src="img/ef_fear.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.provokeBroken?'<div class="card-small-tauntbroken"><img src="img/ef_tb.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${frostBoxHtml}
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
    const isShot=hasTag(card,'shot'); // Mechird Shot (2026-08-04) — физический аналог Bolt, см. doMchShot()
    // Хилер: попап-кнопка "Heal" появляется, если есть кого хилить ИЛИ с кого снять
    // дебафф (burning/feared) — своя не-spell/world/artifact карта с hp<maxHp ИЛИ
    // дебаффом, та же проверка, что и у подсветки .healable ниже в healTarget (лечилка
    // и снимает дебаффы разом, см. onClick() в game.js). Клик по кнопке — и только он —
    // переводит в healTarget с подсветкой целей; сам клик по существу (см. game.js)
    // теперь просто выделяет его как обычную атаку (selectTarget), без прыжка сразу в
    // режим лечения.
    const isHealerAbility=card.tags.some(t=>t.startsWith('heal:'));
    const hasHealTarget=isHealerAbility&&G[card.f].field.some(c=>!c.spell&&!c.world&&!c.artifact&&(c.hp<c.maxHp||c.burning||c.feared));
    // TEANTIST "Return your ally" (2026-07-30, по прямому запросу автора) — тот же паттерн,
    // что у hasHealTarget выше: кнопка появляется, только если есть кого вернуть в руку.
    // c.id!==card.id — по прямому запросу автора карта НЕ может вернуть в руку сама себя,
    // только других союзников.
    const isBounceAlly=hasTag(card,'bounce_ally');
    const hasBounceTarget=isBounceAlly&&G[card.f].field.some(c=>c.id!==card.id&&!c.spell&&!c.world&&!c.artifact);
    if(isUmb||isVard||isBolt||isShot||hasHealTarget||hasBounceTarget){
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
      if(isShot){
        const btn=document.createElement('button');
        const isCancellingShot=G.phase==='shotTarget'&&G.sel===card.id;
        if(isCancellingShot){
          btn.className='fab-btn cancel';
          btn.onclick=(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();};
        } else {
          btn.className='fab-btn mechird'; // своя иконка btn_shot.png (2026-08-04, по прямому запросу автора)
          btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doMchShot();};
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
      if(hasBounceTarget){
        const btn=document.createElement('button');
        // Тот же паттерн переключения в Cancel, что и у Heal выше.
        const isCancellingBounce=G.phase==='gustAllyTarget'&&G.sel===card.id;
        if(isCancellingBounce){
          btn.className='fab-btn cancel';
          btn.onclick=(e)=>{e.stopPropagation();G.phase='action';G.sel=null;render();};
        } else {
          btn.className='fab-btn bounce_ally'; // тот же ассет btn_spell.png, что у Umbasir/Vardan выше
          btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;G.phase='gustAllyTarget';render();};
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
  d.className=`card ${card.f}-card${card.neutral?' neutral-card':''}${card.golden?' golden':''}`;
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
  'remember': '<img src="img/ico_remember.png" style="width:60%;height:60%;">', // REMEMBER EVERYTHING — 2026-07-26, замена Erase на живых картах
  'intercept': '<img src="img/ico_intercept.png" style="width:60%;height:60%;">',
  'stealth': '<img src="img/ico_stealth.png" style="width:60%;height:60%;">',
  'thorns': '<img src="img/ico_fire_shield.png" style="width:60%;height:60%;">',
  'shadow_shield': '<img src="img/ico_shadow.png" style="width:60%;height:60%;">',
  'shield': '<img src="img/ico_solana_shield.png" style="width:60%;height:60%;">',
  'draw_attack': '<img src="img/ico_haunt.png" style="width:60%;height:60%;">', // HAUNT — переехал с atk_vs_feared на draw_attack, 2026-07-26
  'death_heal': '<img src="img/ico_bambo.png" style="width:60%;height:60%;">', // BAMBOO — death_heal:N, 2026-07-26
  'death_bolt': '<img src="img/ico_cloud.png" style="width:60%;height:60%;">', // PINK CLOUDS / Thunder Storm — death_bolt:N, переехал со Scheme (2026-07-27)
  'death_armor': '<img src="img/ico_scheme.png" style="width:60%;height:60%;">', // SCHEME (новый тег) — death_armor:N, 2026-07-27, занял иконку/трейт-слот после переезда death_bolt на Pink Clouds
  'frost': '<img src="img/ico_snow.png" style="width:60%;height:60%;">', // FROST ATTACK — Winter from RGB, ультраредкий Mood-трейт, 2026-07-27
  'foxy': '<img src="img/ico_fff.png" style="width:60%;height:60%;">', // FOXY TRICK — Orange from FFF, ультраредкий Mood-трейт, 2026-07-27
  'market': '<img src="img/ico_market.png" style="width:60%;height:60%;">', // GAME OF MARKET — To the Moon with DHD, ультраредкий Mood-трейт, 2026-07-28
  'nana': '<img src="img/ico_nana.png" style="width:60%;height:60%;">', // NANA — Nanas from SMB, ультраредкий Mood-трейт, 2026-07-29
  'dd': '<img src="img/ico_dd.png" style="width:60%;height:60%;">', // DD CLEAVE — DD's Signature, ультраредкий Mood-трейт, 2026-07-29
  'death_atk': '<img src="img/ico_optic.png" style="width:60%;height:60%;">', // OPTIC DOPE — death_atk:N, World-трейт (Optical Dope), 2026-07-29
  'mek': '<img src="img/ico_mek.png" style="width:60%;height:60%;">', // MonoMEK — ультраредкий World-трейт, 2026-07-30
};
// В кладбище incarnation уже отдельно показана таймер-плашкой (card-incarn-badge, см.
// ниже) — она физически перекрывает верхний угол колонки card-tag-icons (обе сидят в
// одном углу карты), из-за чего обычная тег-иконка incarnation становится недостижимой
// для курсора и её тултип "пропадает" именно в этой зоне. Убираем дубль иконки из общего
// списка только для zone==='grave' (на поле/в руке/превью — иконка остаётся как обычно,
// там плашки нет и перекрывать нечего).
const tagIcons = (card.tags||[])
  // val fallback '1', не '' (2026-08-05, багфикс по прямому запросу автора — тултип
  // Regen показывал "?" вместо реального значения) — голый тег без :N (regen без числа —
  // единственный такой в живых данных, см. data.js) реально лечит на 1 HP (getTagVal()
  // возвращает JS-boolean true для голого тега, а true+число в арифметике ведёт себя как
  // 1 — см. case 'regen' в abilities.js), но пустая строка ''||'?' в тултипе (ui.js) не
  // знала об этой договорённости и просто показывала placeholder. '1' тут — не догадка, а
  // тот же дефолт, что уже даёт голому тегу вся остальная игровая логика.
  .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:'1'}))
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
// Bounce-в-руку (2026-08-05) — cardId → DOMRect полевой позиции карты В МОМЕНТ, когда она
// покинула поле по bounce-эффекту (GUST/REVERSE/TEANTIST, см. doSpellBounceTarget()/
// doGustAbility() в game.js — они пишут сюда СИНХРОННО, ДО того как карта реально уйдёт из
// G[faction].field). rZone() читает и удаляет запись отсюда на рендере зоны руки того же
// render()-прохода (см. её ветку ниже) — используется как origin для _flyCardToHand()
// вместо обычного _deckPlaceholderRect().
const _bounceOriginRects = {};
// Revive-из-кладбища (2026-08-05) — cardId → фракция, ЧЬЁ кладбище было источником (обычно
// совпадает с новым владельцем, но revive-эффект с тегом `any` может поднимать карту из
// ЧУЖОГО кладбища — см. reviveCard()/case 'revive' в abilities.js, они пишут сюда СИНХРОННО
// в момент воскрешения). rZone() читает и удаляет запись отсюда, когда решает анимацию
// появления новой карты в zone==='field' — см. _reviveFlyIfPending() ниже.
const _pendingReviveOrigins = {};
// Полёт из руки на поле (2026-08-05) — cardId → DOMRect позиции карты В РУКЕ, снятый
// doPlay() (game.js) СИНХРОННО, ДО того как карта реально уйдёт из cur.hand. rZone() читает
// и удаляет запись отсюда, когда решает анимацию появления новой карты-существа на поле —
// см. _playFieldFlyIfPending() ниже. Только для существ — Мир/Артефакт не встают в общий
// ряд поля field-small карт, у них этой анимации не предусмотрено.
const _pendingHandOriginRects = {};

// _copyCardSmallVars (2026-08-05, багфикс по прямому запросу автора — "ассеты внутри карты
// сплющены в последний кадр полёта, потом расширяются"). Причина: --card-small-w/-art-h/
// -name-h/-stats-h/-name-fs/-stat-fs заданы И в :root (базовые/фолбэк-значения), И
// ПОВТОРНО внутри .battlefield{...} (media query для portrait/landscape — см. styles.css) —
// у РЕАЛЬНОЙ карты на поле в силе именно battlefield-версия (она ближе по дереву, побеждает
// :root). Клоны для полёта (_reviveFlyIfPending/_playFieldFlyIfPending/_flyCardToGrave)
// физически переезжают в document.body (position:fixed, чтобы лететь поверх всего интерфейса
// по экранным координатам) — а там в силе уже ДРУГОЕ значение (:root или другой media-query
// уровень, см. например :root{--card-small-h:11.52vh} на некоторых брейкпоинтах) — сам
// контейнер клона держит ТОЧНЫЙ px-размер настоящей карты (инлайн style.width/height), но
// его ДЕТИ (арт/имя/статы) считают себя через calc(var(--card-small-*)) от ЭТОГО другого,
// battlefield-НЕсвязанного значения — рассинхрон в несколько процентов между контейнером и
// содержимым и даёт видимый "сплющенный" контент на время полёта. Фикс — скопировать
// вычисленные (уже разрешённые до конкретных px) значения этих переменных с ЖИВОЙ карты
// (пока она ещё физически внутри .battlefield, до клонирования) прямо на сам клон как
// inline custom properties — они перебивают И :root, И любой другой контекст, где клон
// окажется дальше.
const CARD_SMALL_VARS=['--card-small-w','--card-small-h','--card-small-art-h','--card-small-name-h','--card-small-stats-h','--card-small-stats-w','--card-small-name-fs','--card-small-stat-fs'];
function _copyCardSmallVars(sourceEl, clone){
  const cs=getComputedStyle(sourceEl);
  CARD_SMALL_VARS.forEach(v=>{
    const val=cs.getPropertyValue(v);
    if(val) clone.style.setProperty(v, val.trim());
  });
}
// Карты, у которых ПРЯМО СЕЙЧАС идёт play-fly/revive-fly полёт на поле (2026-08-05,
// багфикс по прямому запросу автора — Vanguard-баг с "приземляется не туда, потом резко
// доезжает"). Пока id карты в этом сете, rZone() НЕ трогает её существующий DOM-элемент на
// повторных render() (не делает replaceWith) — он специально спрятан (visibility:hidden) и
// заменяться на свежий видимый узел НЕ должен, пока клон ещё летит. См.
// _playFieldFlyIfPending()/_reviveFlyIfPending() ниже (кладут id при старте полёта, убирают
// в момент его завершения) и ветку `if(!_cardsCurrentlyFlying.has(cid))` внутри rZone().
const _cardsCurrentlyFlying = new Set();
// ── ДИАГНОСТИКА (2026-08-06) ──────────────────────────────────────────────
// Включается вручную в консоли браузера: localStorage.setItem('flyDebug','1') и
// перезагрузить страницу (или просто localStorage.flyDebug='1' и играть дальше —
// проверка идёт при каждом вызове, перезагрузка не обязательна). Пока флаг не
// включён — НИЧЕГО не логирует и не тормозит игру, полностью no-op. Цель — когда
// баг со смещением клона (розыгрыш Vanguard / смерть карты) поймается живьём,
// не нужны скриншоты пары кадров: открыть DevTools → Console, включить флаг,
// повторить баг, скопировать оттуда все строки с префиксом [FLYDEBUG] и прислать
// их текстом — там будут точные координаты старта/цели/финальной синхронизации
// и величина любой коррекции на лету, по которым можно точно понять, что именно
// произошло, вместо гадания по паре скриншотов с разницей в доли секунды.
function _flyDebugOn(){ try{ return localStorage.getItem('flyDebug')==='1'; }catch(e){ return false; } }
// БАГФИКС (2026-08-06, по прямому запросу автора — "в логе нет точной инфы") — раньше сюда
// передавались МНОГО отдельных аргументов, включая вложенные объекты (console.log('...', {x,y})).
// В Safari (и вообще при копировании текстом из большинства консолей) невыделенный вручную
// вложенный объект в момент copy/paste схлопывается в литеральное слово "Object" — реальные
// координаты остаются ТОЛЬКО в живом дереве DevTools, но не попадают в текст, который можно
// прислать. Теперь каждая запись — ОДНА строка, где объекты уже сериализованы в JSON заранее
// (JSON.stringify), так что copy-paste текстом из любой консоли гарантированно сохраняет
// все числа, вообще без необходимости что-то разворачивать мышкой в самом DevTools.
function _flyDebugLog(label, cid, data){
  if(!_flyDebugOn()) return;
  console.log('[FLYDEBUG] '+Math.round(performance.now())+'ms | '+label+' | '+cid+' | '+JSON.stringify(data||{}));
}
// cid → летящий клон (2026-08-06, багфикс по прямому запросу автора — старый Vanguard-баг
// "приземляется не туда, потом резко доезжает" ВЕРНУЛСЯ). Разбор первопричины: guard выше
// (_cardsCurrentlyFlying, добавлен 2026-08-05) не даёт rZone() ЗАМЕНИТЬ спрятанный
// (visibility:hidden) реальный cardEl, пока клон летит — но НЕ защищает от того, что этот
// самый cardEl всё ещё обычный flex-элемент ряда (просто невидимый) и МОЖЕТ физически
// сдвинуться, если за время полёта клона (CARD_FLY_MS+40 ≈ 340мс) в ТОМ ЖЕ ряду что-то ещё
// меняется — типичный случай именно для Vanguard: он не спит и может тем же ходом атаковать,
// а если от этой атаки кто-то умирает (или влетает ещё один Revive/AOE-summon), ряд
// пересчитывает центрирование, и невидимый cardEl реально переезжает на новую позицию — а
// клон при этом продолжает лететь к СТАРОЙ, один раз посчитанной в момент старта, координате
// (`clone.style.left/top` уже закоммичены в transition). Финальная синхронизация
// (freshRect-снап без transition) наступает только через фиксированные 340мс — до этого
// момента клон явно виден в неверном месте, потом резко доезжает. У обычных (спящих) карт
// это не воспроизводится, потому что они физически не могут ничего сделать/спровоцировать
// изменения того же ряда в первые же 340мс своей жизни на поле.
// Фикс: вместо того чтобы просто игнорировать летящую карту на повторных render()
// (см. rZone() ниже), ДОГОНЯЕМ клон — на каждом render(), пока карта ещё летит, берём
// СВЕЖИЙ getBoundingClientRect() спрятанного оригинала (он показывает АКТУАЛЬНУЮ позицию
// с учётом любого пересчёта ряда) и обновляем left/top/width/height клона. Т.к. CSS
// transition уже запущен, браузер сам плавно перенацеливает движение с текущей
// интерполированной точки на новую — без рывка, в отличие от финального жёсткого снапа.
const _flyingClones = {};
function _resyncFlyingCardTarget(cid, cardEl){
  const clone=_flyingClones[cid];
  if(!clone||!cardEl) return;
  const r=cardEl.getBoundingClientRect();
  const prevLeft=parseFloat(clone.style.left)||0, prevTop=parseFloat(clone.style.top)||0;
  const newLeft=r.left+r.width/2, newTop=r.top+r.height/2;
  const dx=Math.round(newLeft-prevLeft), dy=Math.round(newTop-prevTop);
  if(dx!==0||dy!==0) _flyDebugLog('RESYNC (row reflowed mid-flight, retargeting)', cid, {dx,dy,newTarget:{x:Math.round(newLeft),y:Math.round(newTop)}});
  clone.style.width=r.width+'px';
  clone.style.height=r.height+'px';
  // transform, НЕ left/top (2026-08-06, см. подробный разбор у _playFieldFlyIfPending) —
  // left/top у клона больше вообще не трогаются после старта полёта, статичны на якоре
  // ОТПРАВНОЙ точки; всё движение — через translate() внутри transform, композитится
  clone.style.left=newLeft+'px';
  clone.style.top=newTop+'px';
}
// ВАЖНО: клон снимается в rZone ДО того, как на оригинал повесят card-drawn/
// animation-delay (см. вызов ниже) — иначе cloneNode(true) скопировал бы и эти
// инлайн-стили/классы, и клон стартовал бы уже невидимым (opacity:0 от "from"
// кейфрейма cardDrawn).

// Возвращает 'Opp'/'Player' — в какой колонке арены СЕЙЧАС физически отображается
// фракция faction (см. reorderZones() ниже) — тот же принцип, что _statsElIdForFaction
// в game.js, только суффикс под id вида arenaDeckOpp/arenaDeckPlayer. Нужен и здесь
// (render.js грузится раньше game.js, но вызывается уже после полной загрузки, так что
// сама функция ниже переиспользуется прямым вызовом без проблем с порядком).
function _arenaPosForFaction(faction){
  if(G.mode==='vsai'){
    return faction===G.humanFaction ? 'Player' : 'Opp';
  }
  return faction===G.turn ? 'Player' : 'Opp';
}

// Возвращает rect плейсхолдера колоды нужной фракции, ИЛИ null если он сейчас
// не виден (например, скрыт под модалкой муллигана/деколадера) — в этом случае
// полёт просто пропускается, карта появляется как раньше (обычный fade без клона).
// 2026-08-03: раньше — статичные id по фракции (deckPlaceholderT/J) внутри её же
// bottom-bar, который прятался целиком, если не её ход. Теперь колода противника ТОЖЕ
// всегда на экране (см. ARENA COLUMNS) — ищем по текущей Opp/Player-роли, не по фракции.
function _deckPlaceholderRect(faction){
  const deckEl=document.getElementById('arenaDeck'+_arenaPosForFaction(faction));
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

// _flyCardToHand — bounce-полёт (2026-08-05, по прямому запросу автора): карта, снятая с
// поля bounce-эффектом (GUST/REVERSE/TEANTIST-скилл), летит от своей ПОЛЕВОЙ позиции прямо
// в руку. БАГФИКС (2026-08-05, по прямому запросу автора — "странная трансформация из card
// в small card") — раньше width/height анимировались НАПРЯМУЮ (от полевого размера к
// размеру карты в руке), а разметка клона (mkEl, полноразмерная карта) вся завязана на
// CSS-переменные --card-w/--card-h, а не на реальный px-размер контейнера — при насильном
// сжатии контейнера до полевых пропорций внутренние элементы (арт/шрифты/иконки) не
// сжимались вместе с ним, только сам контейнер — получался "плывущий"/перекошенный вид.
// Теперь контейнер клона ВСЮ дорогу держит ЦЕЛЕВОЙ (рука) размер намертво, а масштаб —
// через transform:scale() (тот же приём, что и у _flyCardFromDeck() выше, просто без
// искусственного "нырка" ниже реального стартового масштаба — стартовый scale считается
// от РЕАЛЬНОГО соотношения полевого/ручного размера, не от произвольной константы). Тот же
// кроссфейд в последние CARD_FLY_FADE_MS мс, что и у deck-fly — настоящая карта в руке (уже
// добавлена в DOM с классом card-drawn, см. rZone()) проявляется в этом же окне, пока клон
// тает.
function _flyCardToHand(cloneEl, originRect, targetRect, delayMs){
  cloneEl.classList.remove('selected','previewed','affordable','entering','targetable','aim-attack','hit','activating','dying','dying-hold');
  cloneEl.classList.add('card-fly-clone');
  cloneEl.style.position='fixed';
  cloneEl.style.margin='0';
  cloneEl.style.width=targetRect.width+'px';
  cloneEl.style.height=targetRect.height+'px';
  cloneEl.style.left=(originRect.left+originRect.width/2)+'px';
  cloneEl.style.top=(originRect.top+originRect.height/2)+'px';
  const startScale=originRect.width/targetRect.width;
  cloneEl.style.transform=`translate(-50%,-50%) scale(${startScale})`;
  cloneEl.style.opacity='1';
  document.body.appendChild(cloneEl);
  setTimeout(()=>{
    if(!cloneEl.parentElement) return; // на случай если экран уже перерисован/сцена сменилась
    void cloneEl.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
    cloneEl.style.transition=`left ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), top ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), transform ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), opacity ${CARD_FLY_FADE_MS}ms ease-in ${CARD_FLY_MS-CARD_FLY_FADE_MS}ms`;
    cloneEl.style.left=(targetRect.left+targetRect.width/2)+'px';
    cloneEl.style.top=(targetRect.top+targetRect.height/2)+'px';
    cloneEl.style.transform='translate(-50%,-50%) scale(1)';
    cloneEl.style.opacity='0';
    setTimeout(()=>{ if(cloneEl.parentElement) cloneEl.remove(); }, CARD_FLY_MS+40);
  }, delayMs);
}

// _reviveFlyIfPending — воскрешение из кладбища (2026-08-05, по прямому запросу автора):
// если у появившейся на поле карты (id) есть запись в _pendingReviveOrigins (см. её
// комментарий выше — пишут reviveCard()/game.js), вместо обычного in-place entering-pop
// запускаем клон, летящий ОТ иконки кладбища нужной фракции К реальному месту карты на
// поле, УВЕЛИЧИВАЯСЬ по пути (growth-эффект, обратный deck-fly — там тоже растёт от .35 до
// 1, тут делаем то же самое явно через scale, раз ни origin, ни target тут не связаны с
// шириной руки/поля так тесно, как у _flyCardToHand). Настоящий элемент карты (cardEl) уже
// вставлен вызывающим кодом на своё законное место в DOM/layout — просто прячем его на время
// полёта (visibility, не opacity/display — не сбивает измеренный restRect) и возвращаем
// видимым, когда клон долетает. Возвращает true, если анимация запущена (вызывающий код
// тогда НЕ должен также навешивать обычный .entering), false — если нечего было поднимать
// (не revive) или кладбище сейчас не видно на экране (под модалкой и т.п., тогда просто
// используем старый entering-pop как fallback).
function _reviveFlyIfPending(cardEl, faction){
  const cid=cardEl.dataset.id;
  const graveFaction=_pendingReviveOrigins[cid];
  if(!graveFaction) return false;
  delete _pendingReviveOrigins[cid];
  const graveEl=document.getElementById('arenaGrave'+_arenaPosForFaction(graveFaction));
  if(!graveEl || graveEl.offsetParent===null) return false; // кладбище не на экране — падаем в обычный entering
  const graveRect=graveEl.getBoundingClientRect();
  const restRect=cardEl.getBoundingClientRect(); // cardEl уже вставлен вызывающим кодом — форсит layout
  _flyDebugLog('REVIVE 1-start (home slot = target computed now)', cid, {from:{x:Math.round(graveRect.left),y:Math.round(graveRect.top)}, homeSlot:{x:Math.round(restRect.left),y:Math.round(restRect.top),w:Math.round(restRect.width),h:Math.round(restRect.height)}});
  const clone=cardEl.cloneNode(true);
  _copyCardSmallVars(cardEl, clone); // см. её комментарий выше — без этого контент клона "сплющивается" в document.body
  clone.classList.remove('entering','selected','targetable','aim-attack','hit','activating','dying','dying-hold');
  clone.classList.add('card-fly-clone');
  clone.style.position='fixed';
  clone.style.margin='0';
  clone.style.width=restRect.width+'px';
  clone.style.height=restRect.height+'px';
  clone.style.left=(graveRect.left+graveRect.width/2)+'px';
  clone.style.top=(graveRect.top+graveRect.height/2)+'px';
  clone.style.transform='translate(-50%,-50%) scale(.3)';
  clone.style.opacity='1';
  cardEl.style.visibility='hidden';
  _cardsCurrentlyFlying.add(cid); // см. её комментарий у объявления — блокирует replaceWith этого узла в rZone(), пока клон летит
  _flyingClones[cid]=clone; // см. комментарий у _flyingClones выше — позволяет rZone() догонять клон, если ряд сдвинется, пока он летит
  document.body.appendChild(clone);
  void clone.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  clone.style.transition=`left ${GRAVE_FLY_MS}ms ease-out, top ${GRAVE_FLY_MS}ms ease-out, transform ${GRAVE_FLY_MS}ms ease-out`;
  clone.style.left=(restRect.left+restRect.width/2)+'px';
  clone.style.top=(restRect.top+restRect.height/2)+'px';
  clone.style.transform='translate(-50%,-50%) scale(1)';
  setTimeout(()=>{
    // Финальная точная синхронизация (2026-08-05, багфикс по прямому запросу автора —
    // "финальный размер чуть-чуть отличается, деформация") — restRect измерен ОДИН раз в
    // самом начале полёта; за GRAVE_FLY_MS реальная карта теоретически могла на пиксель-два
    // сместиться (суб-пиксельное округление браузера при долгой transition-интерполяции,
    // либо что-то в раскладке рядом реально шевельнулось) — снимаем СВЕЖИЙ rect прямо перед
    // тем, как открыть настоящую карту, и одним кадром БЕЗ transition доводим клон до него
    // — стык клон→настоящая карта становится незаметным, даже если было небольшое расхождение.
    const cloneRectBeforeSnap=clone.getBoundingClientRect();
    const freshRect=cardEl.getBoundingClientRect();
    _flyDebugLog('REVIVE 2-reveal (clone last screen pos vs home slot now vs home slot at start)', cid, {
      cloneWasAt:{x:Math.round(cloneRectBeforeSnap.left),y:Math.round(cloneRectBeforeSnap.top)},
      homeSlotNow:{x:Math.round(freshRect.left),y:Math.round(freshRect.top)},
      homeSlotAtStart:{x:Math.round(restRect.left),y:Math.round(restRect.top)}
    });
    clone.style.transition='none';
    clone.style.width=freshRect.width+'px';
    clone.style.height=freshRect.height+'px';
    clone.style.left=(freshRect.left+freshRect.width/2)+'px';
    clone.style.top=(freshRect.top+freshRect.height/2)+'px';
    clone.style.transform='translate(-50%,-50%) scale(1)';
    void clone.offsetWidth; // форсируем применение стилей без transition, синхронно, до снятия видимости
    cardEl.style.visibility='';
    _cardsCurrentlyFlying.delete(cid);
    delete _flyingClones[cid];
    if(clone.parentElement) clone.remove();
  }, GRAVE_FLY_MS);
  return true;
}

// _playFieldFlyIfPending — розыгрыш существа из руки (2026-08-05, по прямому запросу
// автора): та же техника, что у _reviveFlyIfPending() выше — клон летит ОТ позиции карты
// в руке (снимок сделан в doPlay(), game.js, см. комментарий у _pendingHandOriginRects выше
// по файлу) К месту существа на поле. БАГФИКС (2026-08-05, по прямому запросу автора —
// "странная трансформация из card в small card") — раньше width/height анимировались
// НАПРЯМУЮ (от размера в руке к полевому), контейнер клона физически сжимался, но
// внутренняя разметка (та же mkSmallEl, что и у финальной карты на поле) завязана на
// CSS-переменные --card-small-*, не на реальный px-размер контейнера — при насильном
// раздутии контейнера ДО стартового (ручного) размера содержимое оставалось в своих
// исходных мелких полевых пропорциях и "плавало"/съезжало внутри слишком большого
// контейнера. Теперь контейнер клона ВСЮ дорогу держит ЦЕЛЕВОЙ (полевой) размер намертво, а
// масштаб — через transform:scale() (тот же приём, что у _reviveFlyIfPending()/
// _flyCardFromDeck() выше, просто стартовый scale считается от РЕАЛЬНОГО соотношения
// ручного/полевого размера, не от произвольной константы, и без искусственного "нырка" —
// та же идея, что и у _flyCardToHand() в обратную сторону). cardEl уже вставлен вызывающим
// кодом на своё законное место в DOM/layout — прячем его на время полёта (visibility),
// возвращаем видимым, когда клон долетает. Возвращает true, если анимация запущена
// (вызывающий код тогда НЕ должен также навешивать обычный .entering).
function _playFieldFlyIfPending(cardEl, faction){
  const cid=cardEl.dataset.id;
  const originRect=_pendingHandOriginRects[cid];
  if(!originRect) return false;
  delete _pendingHandOriginRects[cid];
  const restRect=cardEl.getBoundingClientRect(); // cardEl уже вставлен вызывающим кодом — форсит layout — это "домашний слот", куда карта должна прилететь
  _flyDebugLog('PLAY 1-start (home slot = target computed now)', cid, {from:{x:Math.round(originRect.left),y:Math.round(originRect.top)}, homeSlot:{x:Math.round(restRect.left),y:Math.round(restRect.top),w:Math.round(restRect.width),h:Math.round(restRect.height)}});
  const clone=cardEl.cloneNode(true);
  _copyCardSmallVars(cardEl, clone); // см. её комментарий выше — без этого контент клона "сплющивается" в document.body
  clone.classList.remove('entering','selected','targetable','aim-attack','hit','activating','dying','dying-hold','affordable','previewed');
  clone.classList.add('card-fly-clone');
  clone.style.position='fixed';
  clone.style.margin='0';
  clone.style.width=restRect.width+'px';
  clone.style.height=restRect.height+'px';
  clone.style.left=(originRect.left+originRect.width/2)+'px';
  clone.style.top=(originRect.top+originRect.height/2)+'px';
  const startScale=originRect.width/restRect.width;
  clone.style.transform=`translate(-50%,-50%) scale(${startScale})`;
  clone.style.opacity='1';
  cardEl.style.visibility='hidden';
  _cardsCurrentlyFlying.add(cid); // см. её комментарий у объявления — блокирует replaceWith этого узла в rZone(), пока клон летит
  _flyingClones[cid]=clone; // см. комментарий у _flyingClones выше — позволяет rZone() догонять клон, если ряд сдвинется, пока он летит (Vanguard-баг)
  document.body.appendChild(clone);
  void clone.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  clone.style.transition=`left ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), top ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1), transform ${CARD_FLY_MS}ms cubic-bezier(.25,.85,.35,1)`;
  clone.style.left=(restRect.left+restRect.width/2)+'px';
  clone.style.top=(restRect.top+restRect.height/2)+'px';
  clone.style.transform='translate(-50%,-50%) scale(1)';
  setTimeout(()=>{
    // Финальная точная синхронизация — тот же приём, что у _reviveFlyIfPending() выше, см.
    // её подробный комментарий (2026-08-05, багфикс по прямому запросу автора — "финальный
    // размер чуть-чуть отличается, деформация").
    const cloneRectBeforeSnap=clone.getBoundingClientRect(); // где клон РЕАЛЬНО был на экране в конце transition, ДО жёсткого снапа
    const freshRect=cardEl.getBoundingClientRect(); // "домашний слот" ПРЯМО СЕЙЧАС (может отличаться от homeSlot из PLAY 1-start, если ряд сдвинулся за время полёта)
    const dxFinal=Math.round(freshRect.left-restRect.left), dyFinal=Math.round(freshRect.top-restRect.top);
    _flyDebugLog('PLAY 2-reveal (clone last screen pos vs home slot now vs home slot at start)', cid, {
      cloneWasAt:{x:Math.round(cloneRectBeforeSnap.left),y:Math.round(cloneRectBeforeSnap.top)},
      homeSlotNow:{x:Math.round(freshRect.left),y:Math.round(freshRect.top)},
      homeSlotAtStart:{x:Math.round(restRect.left),y:Math.round(restRect.top)},
      driftSinceStart:{dxFinal,dyFinal}
    });
    clone.style.transition='none';
    clone.style.width=freshRect.width+'px';
    clone.style.height=freshRect.height+'px';
    clone.style.left=(freshRect.left+freshRect.width/2)+'px';
    clone.style.top=(freshRect.top+freshRect.height/2)+'px';
    clone.style.transform='translate(-50%,-50%) scale(1)';
    void clone.offsetWidth; // форсируем применение стилей без transition, синхронно, до снятия видимости
    cardEl.style.visibility='';
    // БАГФИКС (2026-08-06, гипотеза автора — "у Vanguard единственное отличие в том, что она
    // не спит с рождения, копай в эту сторону"). Реальная находка: idle-анимация покачивания
    // поля (.card-small:not(.sleeping):nth-child(4n+N){animation:cardFloatB/C/D...}, см.
    // css/styles.css) матчит карту СРАЗУ, как только снимается visibility:hidden выше — а у
    // 3 из 4 позиций там отрицательный animation-delay (-0.8s/-1.5s/-2.2s), то есть анимация
    // не начинается с нуля, а стартует СРАЗУ с середины цикла. Обычная (спящая) карта этого
    // не получает вообще, пока не проснётся следующим ходом — то самое единственное отличие
    // Vanguard, о котором и была гипотеза. Амплитуда маленькая (2-4px, не объясняет весь
    // масштаб бага из скриншотов), но лишняя, ничем не оправданная здесь — глушим на 1 кадр
    // после появления, чтобы карта успела визуально "осесть" на своей реальной позиции,
    // прежде чем в неё вмешается idle-покачивание.
    cardEl.style.animation='none';
    requestAnimationFrame(()=>{ cardEl.style.animation=''; });
    _cardsCurrentlyFlying.delete(cid);
    delete _flyingClones[cid];
    if(clone.parentElement) clone.remove();
  }, CARD_FLY_MS+40);
  return true;
}

// Смерть на поле — мгновенный полёт/сожжение (2026-08-05, откат по прямому запросу автора —
// раньше тут ЕЩЁ была пауза (DEATH_ANIM_DELAY_MS) перед стартом, чтобы шейк урона и
// всплывающее число успевали доиграть на живой карте; автор попросил убрать — "карта
// как-то слишком долго умирает". Теперь опять мгновенно, как до этой паузы: обычная смерть
// (Grave) — клон улетает к иконке кладбища СВОЕЙ фракции по прямой, уменьшаясь и
// растворяясь (_flyCardToGrave() ниже), сразу на этом же render(); уход в Войд (Инкарнация/
// Remember уже потрачены, "сожжённое" заклинанием) — тот же визуальный приём, что у
// сжигания карты из руки (burnCard/.burning-out), но в ЧЁРНО-СЕРЫХ тонах вместо оранжевых
// (cardVoidBurn/.dying-void, см. styles.css) — карта никуда не летит, просто гаснет на
// своём месте на поле, тоже сразу.
const VOID_BURN_MS = 450; // держать в синхроне с длительностью .dying-void/cardVoidBurn (styles.css)
const GRAVE_FLY_MS = 380; // длительность полёта клона карты к иконке кладбища (по прямой, без дуги — по прямому запросу автора)
const SHRINK_PULSE_MS = 140; // короткая пауза-"вздох" ПЕРЕД полётом на кладбище, см. .dying-pulse ниже
const SHRINK_PULSE_SCALE = 0.82; // во сколько раз карта уже уменьшилась к концу паузы — отсюда клон в _flyCardToGrave() продолжает, а не начинает заново с 1

// Полёт клона умершей карты к иконке кладбища своей фракции — та же техника клонирования
// в position:fixed + JS-driven transition, что у _flyCardFromDeck()/throwBoltFx() выше
// (координаты кладбища динамические — конкретная кнопка меняет физическое положение между
// Opp/Player колонками, см. _arenaPosForFaction(), так что нельзя обойтись статичными
// @keyframes). Клонирует cardEl (см. _copyCardSmallVars() выше — снимает вычисленные
// --card-small-* ПОКА cardEl ещё живой в DOM/.battlefield) и только ПОСЛЕ этого убирает
// cardEl из DOM — вызывающий код (rZone()) вызывает её уже ПОСЛЕ короткой паузы-"вздоха" на месте (.dying-pulse,
// SHRINK_PULSE_MS — см. её комментарий в rZone()), поэтому клон стартует НЕ с полного
// размера, а с того, на котором пауза остановилась (SHRINK_PULSE_SCALE) — иначе был бы
// заметный "скачок" размера в момент передачи эстафеты от паузы к полёту.
//
// pulseOriginRect (2026-08-05, багфикс по прямому запросу автора — "иногда стартует лететь
// ниже и левее своей позиции") — ОБЯЗАТЕЛЬНО передаётся вызывающим кодом, снятый ДО начала
// паузы .dying-pulse, а не измеряется здесь заново через cardEl.getBoundingClientRect().
// Причина: при НЕСКОЛЬКИХ одновременных смертях на кладбище (AOE-вайп/DD Cleave/burn-тик
// сразу по нескольким горящим) каждая карта планирует свой СОБСТВЕННЫЙ setTimeout на
// SHRINK_PULSE_MS — если у двух карт эти таймеры сработали не в один и тот же микротик (что
// обычно так и есть), к моменту, когда ЭТА функция вызывается для карты B, карта A уже
// могла быть удалена из flex-ряда своим собственным вызовом чуть раньше — ряд поля
// реально сдвигается (justify-content-центрирование), и "живое" измерение rect карты B
// В ЭТОТ момент уже отражает ЭТОТ сдвиг, а не то место, где карта B визуально сидела все
// эти SHRINK_PULSE_MS во время своей собственной паузы. Со снимком "на входе в паузу" такого
// рассинхрона нет — клон стартует ровно оттуда, где карта только что была видна.
function _flyCardToGrave(cardEl, faction, pulseOriginRect){
  const rect=pulseOriginRect||cardEl.getBoundingClientRect();
  const graveEl=document.getElementById('arenaGrave'+_arenaPosForFaction(faction));
  if(!graveEl || graveEl.offsetParent===null){ if(cardEl.parentElement) cardEl.remove(); return; } // кладбище сейчас не на экране (напр. под модалкой) — просто убрана, без полёта
  const gRect=graveEl.getBoundingClientRect();
  _flyDebugLog('DEATH 4-flight (clone spawned HERE, flies to grave icon)', cardEl.dataset.id, {usedPulseOriginRect:!!pulseOriginRect, from:{x:Math.round(rect.left),y:Math.round(rect.top),w:Math.round(rect.width),h:Math.round(rect.height)}, to:{x:Math.round(gRect.left),y:Math.round(gRect.top)}});
  const clone=cardEl.cloneNode(true);
  _copyCardSmallVars(cardEl, clone); // см. её комментарий выше — без этого контент клона "сплющивается" в document.body
  if(cardEl.parentElement) cardEl.remove();
  clone.classList.remove('selected','targetable','aim-target','aim-attack','hit','activating','entering','dying','dying-hold','dying-pulse');
  clone.classList.add('card-death-fly');
  clone.style.left=(rect.left+rect.width/2)+'px';
  clone.style.top=(rect.top+rect.height/2)+'px';
  clone.style.width=rect.width+'px';
  clone.style.height=rect.height+'px';
  clone.style.transform=`translate(-50%,-50%) scale(${SHRINK_PULSE_SCALE})`;
  clone.style.opacity='1';
  document.body.appendChild(clone);
  void clone.offsetWidth; // форсируем reflow — иначе старт и финиш анимации склеятся в один кадр
  clone.style.transition=`left ${GRAVE_FLY_MS}ms ease-in, top ${GRAVE_FLY_MS}ms ease-in, transform ${GRAVE_FLY_MS}ms ease-in, opacity ${GRAVE_FLY_MS}ms ease-in`;
  clone.style.left=(gRect.left+gRect.width/2)+'px';
  clone.style.top=(gRect.top+gRect.height/2)+'px';
  clone.style.transform='translate(-50%,-50%) scale(0.05)'; // 2026-08-06, по прямому запросу автора — было 0.15 (почти не уменьшалось к моменту прилёта на кладбище), уменьшил ещё в 3 раза
  clone.style.opacity='0';
  setTimeout(()=>{
    // 'graveyard' — временно переиспользуем звук открытия модалки кладбища (по прямому
    // запросу автора, 2026-08-05 — послушает вживую и решит, менять ли на отдельный ассет).
    playSfx('graveyard');
    if(clone.parentElement) clone.remove();
  }, GRAVE_FLY_MS);
}

function rZone(id,cards,zone){
  const el=document.getElementById(id);
  if(zone==='field'){
    // faction — из id зоны ('teaField'/'jeetField', см. вызовы rZone() выше в этом файле) —
    // нужна, чтобы отличить настоящую смерть (карта реально в G[faction].grave/void прямо
    // сейчас) от любого другого исчезновения с поля (bounce обратно в руку и т.п., которое
    // по-прежнему получает старое мгновенное поведение — см. развилку ниже).
    const faction = id==='teaField' ? 'tea' : 'jeet';
    const dying=[];
    el.querySelectorAll('.card-small').forEach(cardEl=>{
      const stillExists=cards.find(c=>String(c.id)===cardEl.dataset.id);
      if(!stillExists) dying.push(cardEl);
    });
    dying.forEach(cardEl=>{
      const cid=cardEl.dataset.id;
      cardEl.style.pointerEvents='none';
      const wentVoid = G[faction].void.some(c=>String(c.id)===cid);
      const wentGrave = !wentVoid && G[faction].grave.some(c=>String(c.id)===cid);
      if(wentVoid||wentGrave){
        // Мгновенный старт, но с коротким "вздохом" на месте у Grave (2026-08-05, по
        // прямому запросу автора — "выглядит массивом, не успеваешь понять что карта
        // умерла"; DEATH_ANIM_DELAY_MS/dying-hold, убранные раньше в этой сессии, сюда НЕ
        // возвращаются — та пауза была про ожидание шейка/числа урона, это другое: чисто
        // визуальный, короткий SHRINK_PULSE_MS (140мс) "вздох" на своём месте перед
        // полётом). Void — чёрно-серое сожжение на месте (cardVoidBurn/.dying-void,
        // styles.css) без изменений, тоже без выдержки — своя анимация уже достаточно
        // читаема (0.45с, полностью на месте).
        if(wentVoid){
          if(!cardEl.classList.contains('dying-void')){
            cardEl.classList.add('dying','dying-void');
            setTimeout(()=>{ if(cardEl.parentElement) cardEl.remove(); }, VOID_BURN_MS);
          }
        } else if(!cardEl.classList.contains('dying-hit')){
          // СМЕНА ПОДХОДА (2026-08-06, по прямому запросу автора — "пульс(dying-pulse) нам
          // всё ломает, пусть карта просто делает шейк как от урона и потом улетает").
          // Раньше тут был dying-pulse: 140мс scale(1→0.82) через ручной position:fixed на
          // застывших координатах (pulseOriginRect) — несмотря на несколько раундов фиксов
          // (снятие activating/hit ПЕРЕД замером, "прибивание" к текущим координатам), в
          // реальной игре карта всё равно периодически дрейфовала на несколько px за эти
          // 140мс (см. подробный разбор в CLAUDE.md, "Баг с анимациями карт"). Новый подход:
          // используем УЖЕ СУЩЕСТВУЮЩИЙ, годами проверенный hitShake (.card-small.hit,
          // @keyframes hitShake, 250мс) — та же тряска, что при обычном уроне. У неё
          // конечная точка ВСЕГДА translate(0) scale(1) — то есть карта гарантированно
          // возвращается в СВОЮ настоящую позицию к концу анимации, никакого ручного
          // position:fixed/pinning не требуется вообще: карта остаётся нормальным flex-
          // элементом ряда до самого конца тряски, затем _flyCardToGrave() сама меряет
          // getBoundingClientRect() (никакого заранее снятого/протухающего rect).
          cardEl.classList.add('dying','dying-hit');
          {
            const r0=cardEl.getBoundingClientRect();
            _flyDebugLog('DEATH 1-shake-start', cardEl.dataset.id, {x:Math.round(r0.left),y:Math.round(r0.top),w:Math.round(r0.width),h:Math.round(r0.height)});
          }
          setTimeout(()=>{
            if(!cardEl.parentElement) return; // уже убрана каким-то другим путём — не трогаем
            const r1=cardEl.getBoundingClientRect();
            _flyDebugLog('DEATH 2-shake-ended (about to measure fresh rect, no pinning was used)', cardEl.dataset.id, {x:Math.round(r1.left),y:Math.round(r1.top),w:Math.round(r1.width),h:Math.round(r1.height)});
            _flyCardToGrave(cardEl, faction, null); // null — пусть сама измерит текущую (настоящую) позицию
          }, 250); // длительность hitShake (.25s, styles.css) — ждём её полного отыгрыша
        }
      } else if(_bounceOriginRects[cid]){
        // Bounce в руку (2026-08-05, по прямому запросу автора) — снимок позиции уже сделан
        // синхронно в doSpellBounceTarget()/doGustAbility() (game.js) ДО этого render(). Тут
        // поле просто теряет карту мгновенно, без cardDie shrink-fade — сам полёт (клон от
        // этого снимка до места в руке) запускает та же самая функция rZone() чуть ниже, на
        // проходе по зоне 'hand' этого же render(), когда узнает финальную позицию карты.
        if(cardEl.parentElement) cardEl.remove();
      } else if(!cardEl.classList.contains('dying')){
        // Не смерть и не bounce — карта покинула поле по какой-то другой причине —
        // старое мгновенное поведение (cardDie shrink-fade на месте), без паузы.
        cardEl.classList.add('dying');
        setTimeout(()=>{ if(cardEl.parentElement) cardEl.remove(); }, 400);
      }
    });
    if(true){ // всегда unified-путь для поля — dying.length>0 больше не является условием (см. комментарий ниже)
      // Build map of live (non-dying) existing elements
      const existingMap={};
      el.querySelectorAll('.card-small:not(.dying)').forEach(cardEl=>{
        existingMap[cardEl.dataset.id]=cardEl;
      });
      // Update live cards in-place (fixes targetable staying lit), add new ones with entering
      const newFieldEls=[]; // копим новые карты поля — измеряем/запускаем полёт ПОСЛЕ того,
      // как весь ряд уже отрисован (см. комментарий у newFieldEls.forEach ниже)
      cards.forEach(c=>{
        const cid=String(c.id);
        if(existingMap[cid]){
          // БАГФИКС (2026-08-05, по прямому запросу автора — "карты с Vanguard приземляются
          // не на свою позицию, потом резко доезжают") — если у этой карты СЕЙЧАС идёт
          // play-fly/revive-fly (см. _cardsCurrentlyFlying ниже по файлу), её реальный
          // DOM-элемент временно спрятан (visibility:hidden) и НЕ должен трогаться этим
          // render()'ом вообще — раньше тут раньше это применялось только когда dying.length>0
          // (текущая ветка вообще не выполнялась при dying.length===0), а НЕ-dying render()
          // (например: ход ИИ разыграл Vanguard-существо и тут же им же атаковал — атака
          // сама по себе тоже зовёт render(), пока клон входа ещё летит, 300мс) шёл в СТАРЫЙ
          // fallback ниже — тот делал el.innerHTML='' и пересобирал ВСЕ карты с нуля через
          // mkSmallEl(c), в том числе эту — новый (видимый) узел подменял спрятанный старый,
          // и настоящая карта "выскакивала" на своё место, пока клон-полёт ещё летел к
          // прежней цели независимо от него (это отдельный overlay-элемент вне `el`, wipe
          // его не задевал) — отсюда и видимый рассинхрон/скачок именно у Vanguard (только
          // у него игра успевает дёрнуть render() второй раз ДО того, как 300мс полёта
          // закончатся — обычная не-Vanguard карта спит и никаких доп.действий/render() в
          // ближайшие 300мс не провоцирует).
          if(!_cardsCurrentlyFlying.has(cid)){
            existingMap[cid].replaceWith(mkSmallEl(c));
          } else {
            // Карта ещё летит (play-fly/revive-fly) — сам DOM-узел не трогаем (см. комментарий
            // у _cardsCurrentlyFlying выше), но ДОГОНЯЕМ клон до его АКТУАЛЬНОЙ (только что
            // пересчитанной этим же render()) позиции — см. подробный разбор у _flyingClones/
            // _resyncFlyingCardTarget() выше по файлу. Без этого клон долетал бы до координаты,
            // посчитанной один раз в момент старта полёта, и "зависал" бы не в том месте, если
            // ряд успевал сдвинуться (например, что-то ещё умерло на этом же поле), пока
            // Vanguard-карта, только что вошедшая НЕ спящей, тем же ходом уже успела что-то
            // спровоцировать.
            _resyncFlyingCardTarget(cid, existingMap[cid]);
          }
        } else {
          const cardEl=mkSmallEl(c);
          el.appendChild(cardEl);
          newFieldEls.push(cardEl);
        }
      });
      // Полёт/entering — ТОЛЬКО теперь, когда весь forEach выше уже отработал и flex-ряд
      // полностью сформирован (2026-08-05, багфикс по прямому запросу автора — "карты
      // иногда выходят на поле не на свою позицию, а чуть ниже"). Раньше
      // _reviveFlyIfPending()/_playFieldFlyIfPending() мерили getBoundingClientRect() СРАЗУ
      // по вставке КАЖДОЙ карты, ещё посреди этого же forEach — если следом в том же
      // проходе появлялась/менялась ЕЩЁ одна карта в ряду (несколько одновременных
      // revive/AOE-summon и т.п.), flex-раскладка могла сдвинуться ПОСЛЕ уже сделанного
      // замера, и клон летел/приземлялся на уже устаревшую (не финальную) позицию.
      newFieldEls.forEach(cardEl=>{
        // _reviveFlyIfPending (2026-08-05) — воскрешённая из кладбища карта летит оттуда и
        // растёт на место, а не просто хлопком появляется; см. её комментарий выше. Только
        // если она НЕ подошла (не revive, или кладбище сейчас не видно на экране), падаем в
        // старый entering-pop.
        if(!_reviveFlyIfPending(cardEl, faction) && !_playFieldFlyIfPending(cardEl, faction)){
          cardEl.classList.add('entering');
          _flyDebugLog('FALLBACK entering (no tracked flight — plain CSS pop-in, not clone)', cardEl.dataset.id, {});
        }
      });
      return;
    }
  }
  // Ниже — только zone==='hand' (zone==='field' теперь ВСЕГДА возвращается из блока выше,
  // 2026-08-05 — см. его комментарий про Vanguard-баг; отдельная ветка "if(zone==='field')"
  // внутри cards.forEach() тут больше не нужна и убрана как мёртвый код).
  const cardSelector='.card';
  const existingIds=new Set([...el.querySelectorAll(cardSelector)].map(e=>e.dataset.id));
  el.innerHTML='';
  const faction=id.startsWith('tea')?'tea':'jeet'; // для полёта карты из колоды, см. _flyCardFromDeck
  const newHandEls=[]; // копим новые карты руки — меряем rect и запускаем полёт ПОСЛЕ сжатия веера (ниже)
  cards.forEach(c=>{
    {
      const cardEl=mkEl(c,zone);
      // New card in hand (just drawn from deck) — gets the card-drawn entrance
      // animation. Cards already in hand don't replay it on every re-render.
      // 2026-08-04: НЕ existingIds (DOM-based) — рука противника рисуется другими
      // элементами (.card-mini, см. rHiddenHand), при раскрытии чужой руки на смене
      // хода existingIds всегда пуст, и вся рука ложно считалась бы "новой" разом
      // (см. комментарий у _seenHandCardIds выше по файлу). id-based Set переживает
      // смену того, каким DOM-контейнером/элементом рисуется рука.
      const isNew=zone==='hand'&&!_seenHandCardIds.has(String(c.id));
      // Bounce-в-руку (2026-08-05) — карта уже "видена" раньше (_seenHandCardIds), обычный
      // isNew её не поймает, но она всё равно должна прилететь, а не тихо появиться. См.
      // комментарий у _bounceOriginRects выше по файлу — запись пишут doSpellBounceTarget()/
      // doGustAbility() (game.js) синхронно ДО этого render().
      const bounceOriginRect = zone==='hand' ? _bounceOriginRects[String(c.id)] : null;
      if(bounceOriginRect) delete _bounceOriginRects[String(c.id)]; // забираем один раз
      if(zone==='hand') _seenHandCardIds.add(String(c.id));
      el.appendChild(cardEl);
      if(isNew||bounceOriginRect){
        if(bounceOriginRect) cardEl._bounceOriginRect=bounceOriginRect;
        newHandEls.push(cardEl);
      }
    }
  });
  // Полёт/entering для новых карт поля больше не обрабатывается тут — zone==='field' всегда
  // возвращается из блока выше (см. его комментарий), эта функция ниже видит только
  // zone==='hand'.
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
      // bounceOriginRect (2026-08-05) — если карта прилетела bounce-эффектом (см.
      // _bounceOriginRects выше по файлу), у неё уже есть origin — снимок её собственной
      // полевой позиции, снятый в doSpellBounceTarget()/doGustAbility() (game.js). В этом
      // случае НЕ используем _deckPlaceholderRect() — карта явно не из колоды.
      const bounceOriginRect = cardEl._bounceOriginRect;
      const deckRect = bounceOriginRect ? null : _deckPlaceholderRect(faction);
      // Клон снимаем СЕЙЧАС, пока cardEl ещё "чистая" (без card-drawn/animation-delay) —
      // см. комментарий у _flyCardFromDeck выше.
      const flyClone = (deckRect||bounceOriginRect) ? cardEl.cloneNode(true) : null;
      cardEl.classList.add('card-drawn');
      if(deckRect||bounceOriginRect){
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
        const idx=newHandCardIndex;
        // Пропускаем сам полёт клона, если открыто окно муллигана (2026-08-04, автор
        // поймал живьём — клон летящей карты рисовался ПОВЕРХ модалки муллигана,
        // z-index:5500 у .card-fly-clone против z-index:650 у .modal-overlay). Окно
        // муллигана показывает СВОЮ отдельную копию карт через mkEl() (см.
        // startMulliganFor() в ui.js) — настоящей #teaHand/#jeetHand зоне, спрятанной
        // под модалкой, никакой анимации входа сейчас видно не нужно.
        // ПОЧЕМУ ПРОВЕРКА В setTimeout(0), А НЕ ПРЯМО ЗДЕСЬ: initState()->render() (тот
        // самый вызов, что довёл выполнение досюда) и startMulliganFor() (который снимает
        // .hidden с #mulliganScreen) вызываются синхронно один сразу за другим (см.
        // js/ui.js) — на момент ЭТОЙ строки startMulliganFor() ЕЩЁ НЕ УСПЕЛ отработать,
        // #mulliganScreen всё ещё .hidden, синхронная проверка тут всегда солгала бы
        // "муллигана нет". setTimeout(fn,0) гарантированно выполнится ПОСЛЕ того, как весь
        // текущий синхронный стек (включая тот самый startMulliganFor()) уже отработает —
        // там проверка уже видит актуальное состояние модалки.
        setTimeout(()=>{
          const mulliganEl=document.getElementById('mulliganScreen');
          const mulliganShowing = mulliganEl && !mulliganEl.classList.contains('hidden');
          if(!mulliganShowing){
            if(bounceOriginRect) _flyCardToHand(flyClone,bounceOriginRect,restRect,idx*90);
            else _flyCardFromDeck(flyClone,deckRect,restRect,idx*90);
          }
        }, 0);
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

// _seenHandCardIds — тот же принцип, что _seenPcardPids чуть выше, но для карт в руке
// (2026-08-04, автор поймал живьём: при передаче хода в хотсите вся рука нового игрока
// целиком проигрывала анимацию "прилетела из колоды", а не только реально добранная
// карта). Раньше "новая карта или нет" в rZone() определялось по содержимому DOM
// (querySelectorAll('.card')) — но рука ПРОТИВНИКА рисуется другой функцией (rHiddenHand,
// см. ниже), другими элементами (.card-mini, не .card). Когда ход переходит и чужая
// (скрытая) рука впервые раскрывается как своя, DOM-проверка находит 0 .card-элементов
// (там были только .card-mini) — и ВСЕ карты руки, включая давно там лежащие, считаются
// свежедобранными разом. Раньше это ни разу не было видно: колода-плейсхолдер
// неактивного игрока была display:none внутри его bottom-bar (см. историю), и
// _deckPlaceholderRect() возвращал null → полёт молча пропускался. Теперь плейсхолдеры
// колод всегда на экране (см. ARENA SIDE COLUMNS в styles.css) — тот же баг стал видимым.
// Глобальный Set по id карты (не по DOM) — карта анимируется максимум один раз за игру,
// независимо от того, через какой контейнер её рука сейчас рисуется.
const _seenHandCardIds = new Set();

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

  // ARENA COLUMNS — кладбище/колода противника и игрока (2026-08-03, по прямому запросу
  // автора, замена bottom-bar). Те же 2 статичные кнопки на роль (Opp/Player), что раньше
  // были #teaBottomBar/#jeetBottomBar целиком — только теперь ОБЕ роли видны одновременно
  // (кладбище/колода противника — новая фича, раньше её вообще нельзя было посмотреть),
  // так что вместо display:none/flex перевешиваем skin+onclick+data-faction на каждый
  // рендер, тот же приём, что уже работает для oppStats/playerStats выше в этой функции.
  // .arena-pair-* (2026-08-04, по прямому запросу автора) — обёртка-бокс кнопка+каунтер
  // тоже красится в tea/jeet (плейсхолдер-фон, см. .arena-pair.tea/.jeet в styles.css).
  const gravePairOpp=document.getElementById('arenaGravePairOpp');
  const gravePairPlayer=document.getElementById('arenaGravePairPlayer');
  if(gravePairOpp) gravePairOpp.className='arena-pair grave-pair '+(oppK==='jeet'?'jeet':'tea');
  if(gravePairPlayer) gravePairPlayer.className='arena-pair grave-pair '+(playerK==='jeet'?'jeet':'tea');
  const graveOppBtn=document.getElementById('arenaGraveOpp');
  const gravePlayerBtn=document.getElementById('arenaGravePlayer');
  if(graveOppBtn){
    graveOppBtn.className='arena-grave-btn '+(oppK==='jeet'?'jeet':'tea');
    graveOppBtn.dataset.faction=oppK;
    graveOppBtn.onclick=()=>{playSfx('yellow_buttom');openGraveModal(oppK);};
  }
  if(gravePlayerBtn){
    gravePlayerBtn.className='arena-grave-btn '+(playerK==='jeet'?'jeet':'tea');
    gravePlayerBtn.dataset.faction=playerK;
    gravePlayerBtn.onclick=()=>{playSfx('yellow_buttom');openGraveModal(playerK);};
  }
  const graveCounterOpp=document.getElementById('arenaGraveCounterOpp');
  const graveCounterPlayer=document.getElementById('arenaGraveCounterPlayer');
  if(graveCounterOpp){
    graveCounterOpp.textContent=oppP.grave.length;
    graveCounterOpp.className='stat-badge '+(oppK==='jeet'?'jeet':'tea');
  }
  if(graveCounterPlayer){
    graveCounterPlayer.textContent=playerP.grave.length;
    graveCounterPlayer.className='stat-badge '+(playerK==='jeet'?'jeet':'tea');
  }

  const deckPairOpp=document.getElementById('arenaDeckPairOpp');
  const deckPairPlayer=document.getElementById('arenaDeckPairPlayer');
  if(deckPairOpp) deckPairOpp.className='arena-pair deck-pair '+(oppK==='jeet'?'jeet':'tea');
  if(deckPairPlayer) deckPairPlayer.className='arena-pair deck-pair '+(playerK==='jeet'?'jeet':'tea');
  const deckOppEl=document.getElementById('arenaDeckOpp');
  const deckPlayerEl=document.getElementById('arenaDeckPlayer');
  if(deckOppEl) deckOppEl.className='arena-deck-slot '+(oppK==='jeet'?'jeet':'tea');
  if(deckPlayerEl) deckPlayerEl.className='arena-deck-slot '+(playerK==='jeet'?'jeet':'tea');
  const deckCounterOpp=document.getElementById('arenaDeckCounterOpp');
  const deckCounterPlayer=document.getElementById('arenaDeckCounterPlayer');
  if(deckCounterOpp){
    deckCounterOpp.textContent=oppP.deck.length;
    deckCounterOpp.className='stat-badge '+(oppK==='jeet'?'jeet':'tea')+(oppP.deck.length===0?' deck-count-empty':'');
  }
  if(deckCounterPlayer){
    deckCounterPlayer.textContent=playerP.deck.length;
    deckCounterPlayer.className='stat-badge '+(playerK==='jeet'?'jeet':'tea')+(playerP.deck.length===0?' deck-count-empty':'');
  }

  // Скин кнопки лога (2026-08-04, по прямому запросу автора — "повесь ассет
  // btn_log1/H/2_tea/jeet.png") — кнопка одна на двоих (не Opp/Player-слот, сидит в
  // среднем слоте).
  // БАГФИКС (2026-08-04, автор поймал живьём в VS AI — "конец хода корректно уходит в
  // вейтинг, а лог почему-то переключается на фракцию противника, будто хотсит"): раньше
  // красилась по G.turn — а G.turn каждый ход меняется ДАЖЕ в VS AI (это внутреннее
  // состояние "чей ход", не то же самое, что "чей физически экран"). playerK — тот же
  // флаг, что уже держит статбар/руку/грейв-дек игрока стабильными в VS AI (см. выше по
  // функции — playerK=G.humanFaction фиксирован в VS AI, playerK=G.turn в хотсите, где
  // фиксировать нечего, физически меняется, кто сейчас держит устройство).
  // classList.toggle, НЕ className= — className перезаписал бы .placeholder класс из
  // разметки на каждый рендер; когда автор уберёт .placeholder из HTML (реальный ассет
  // готов), это должно остаться убранным, а не вернуться обратно тут же на следующий рендер.
  const logBtn=document.getElementById('arenaLogBtn');
  if(logBtn){
    logBtn.classList.toggle('jeet', playerK==='jeet');
    logBtn.classList.toggle('tea', playerK!=='jeet');
  }
  // .log-panel (2026-08-06, по прямому запросу автора — "свой кастомный фон для баттл
  // лога у джит, всё так же как у чая, log_frame_jeet.png") — тот же playerK-флаг и тот
  // же приём toggle, что у кнопки лога чуть выше (см. её комментарий про VS AI/G.turn).
  const logPanelEl=document.getElementById('logPanel');
  if(logPanelEl){
    logPanelEl.classList.toggle('jeet', playerK==='jeet');
    logPanelEl.classList.toggle('tea', playerK!=='jeet');
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
