// Deck presets:
//  classic — печатная 1st-edition колода (с 2026-07-22, финальная версия): все 6 Врат в
//            игре на каждой фракции, асимметрия фаворитов сохранена (родные Врата мин.5,
//            остальные мин.3 — см. archetypeSizes) — 24 рядовых/фракцию (TRAVELER #128 и
//            #434, единственные cost6-карты, убраны из classic целиком — стабильно горячие
//            в sim, см. комментарий у archetypeSizes), кривая маны 1:5/2:5/3:9/4:4/5:1
//            идентична у обеих фракций, тематические теги сохранены (Tea burn:
//            #57/#10/#921/#972/#387, Jeet fear: #523/#859/#550/#579). + all 5 legendaries
//            (cost 4-8) + 16 спеллов (см. SPELL_COPIES) + 2 worlds + 2 artifacts = ровно 49
//            карт/фракция (98 + 2 общие Unseen-бонус карты второму игроку = 100 на печать).
//            (Держи в уме, что при следующей правке archetypeSizes/SPELL_COPIES/worlds/
//            arts этот комментарий и число тоже надо поправить, само по себе не сверяется.)
//  rush    — no fixed list: the human player assembles it themselves in the
//            deckbuilder (js/deckbuilder.js) by picking quantities out of the
//            SAME pool `classic` uses (see getRushPool() below), minimum RUSH_MIN
//            cards. The AI's own Rush deck (vsAI mode) is a random RUSH_MIN-card
//            sample of that same pool — see buildAiRushDeck().
const RUSH_MIN = 28;

// Копии каждого спелла в Classic — раньше было плоских 3 копии на все 13 спеллов сразу
// (39/фракция), теперь подобрано по значимости для темы Врат (2026-07-18, по прямому
// запросу автора): 3 — дешёвые "чистая польза" (ess/draw/bounce) + сигнатурный
// mass-payoff темы (burn_all/fear_all); 2 — сильные, но не сигнатурные; 1 — узкие/
// ситуативные/дорогой топ-энд. Ключ — по каждой карте отдельно (Tea/Jeet спеллы НЕ
// идут в одном порядке между фракциями, см. комментарий у SPELL_COPIES ниже), не по
// индексу в массиве.
// 2026-07-21 (вечер, стартеры "3 Врат против 3 Врат", дека 35): спеллы ужаты 17→12 на
// фракцию — соотношение тел поднято до 60% (21/35), жанровая норма для существо-центричного
// вин-кондишена (см. аудит). Что резалось и почему:
//   Tea: GUST/EXPOSE/FORGET-ME-NOT → 0. EXPOSE (анти-провок) стал почти мёртвым техом —
//   у Jeet после разъезда архетипов провока на рядовых нет вообще (только ABYSSWALKER);
//   баунс/дискард — наименее сигнатурные слоты. Tea держит 4 слота прямого урона
//   (SPARK/JOURNEY×2/BREACH) — это ЕДИНСТВЕННЫЙ не-боевой урон фракции: Umbasir-болтеры
//   уехали к Jeet, THE BOOK один.
//   Jeet: MALICE/REVERSE/MINDROT → 0. Jeet-ремувал теперь частично живёт на телах
//   (6 Umbasir-болтеров + SHARD) — спеллов урона нужно меньше (HEX×2/RUPTURE); UNMASK
//   наоборот сохранён — единственный взлом Dreegan-стены Tea, критичный теперь матчап-тех.
//   SWARM CULL сохранён — Tea стала wide-фракцией (5 однодропов + сквады), Jeet без
//   масс-ответа в этом матчапе нельзя.
// 2026-07-22 (по прямому запросу автора, печатная classic-колода, 16 спеллов/фракцию):
// draw:1 / draw:2 / bounce_target — по 2 копии каждой (обе фракции); anti-provoke
// (EXPOSE/UNMASK) и ess_add (SCHEME/BLACK MAGIC) — исключены полностью (эссенция уже
// выдаётся 2-му игроку отдельным Unseen-бонусом, ess_add дублирует эту роль); все
// остальные 10 пар — по 1 копии. См. полный разбор ролей в CLAUDE.md/сессионной записи.
const SPELL_COPIES = {
  // Tea
  t_sp1:1,  // ARCHIVE (combat-trick +1 ATK)
  t_sp2:1,  // JOURNEY (bolt 3)
  t_sp3:1,  // SHEN'S CALL (revive full)
  t_sp4:0,  // SCHEME (ess_add) — исключён
  t_sp5:2,  // GUST (bounce any)
  t_sp6:1,  // RECKONING (aoe count)
  t_sp7:1,  // FORGET-ME-NOT (discard 2)
  t_sp8:0,  // EXPOSE (anti-provoke tech) — исключён
  t_sp9:1,  // BREACH (bolt 5 + trample)
  t_sp10:1, // WILDFIRE (burn_all — сигнатурный payoff темы)
  t_sp11:1, // REKINDLE (untap)
  t_sp12:1, // BULWARK (combat-trick +1 Armor)
  t_sp13:2, // INSIGHT (draw 2)
  t_sp14:2, // GLIMPSE (draw 1)
  t_sp15:1, // SPARK (bolt 2)
  // Jeet
  j_sp1:2,  // JEET WAVE (draw 2)
  j_sp2:1,  // OBLIVION (untap)
  j_sp3:1,  // FORGETTING (revive full)
  j_sp4:0,  // BLACK MAGIC (ess_add) — исключён
  j_sp5:2,  // REVERSE (bounce any)
  j_sp6:1,  // SWARM CULL (aoe count)
  j_sp7:1,  // MINDROT (discard 2)
  j_sp8:0,  // UNMASK (anti-provoke tech) — исключён
  j_sp9:1,  // RUPTURE (bolt 5 + trample)
  j_sp10:1, // NIGHTMARE (fear_all — сигнатурный payoff темы)
  j_sp11:1, // FRENZY (combat-trick +1 ATK)
  j_sp12:1, // CARAPACE (combat-trick +1 Armor)
  j_sp13:1, // HEX (bolt 3)
  j_sp14:2, // OMEN (draw 1)
  j_sp15:1, // MALICE (bolt 2)
};

const DECK_CONFIGS = {
  // 2026-07-18: было плоское groupSize:5 на все 6 архетипов сразу. Теперь у каждого
  // архетипа свой целевой размер НА ФРАКЦИЮ (тема Врат: Джит гуще берёт Umbasir/Mechird/
  // Xuiqtr, Чай — Szarg/Dreegan/Orbiton, ровно наоборот) — см. archetypeSizes и полный
  // разбор в CLAUDE.md "Рефактор классик-колоды под тему Врат". Итог: по 18 рядовых
  // существ на фракцию (полный симметричный расклад 4+4+4+2+2+2 против 2+2+2+4+4+4).
  classic: {},
};

function shuffleArr(d){
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

// Builds the raw (unshuffled, no Unseen bonus card) card-key list for a given
// faction + config — shared by buildDeck() and getRushPool(). Kept separate so
// the Rush deckbuilder's pool is always exactly "whatever Classic currently
// contains", with zero duplicated card-list logic to keep in sync.
function _composeDeckList(f, cfg){
  const t = f==='tea';

  // 2026-07-20 (по прямому запросу автора, размер колоды 46→~42): szarg-квота срезана —
  // Tea теряет 2 из 3 полностью безтеговых "ванильных" клонов (#33/#890, оставлен #870 —
  // сохраняет разнообразие имён без потери механики) и untamed-вариант #25 (тег untamed
  // и так представлен на других картах — Faeron/Tuborg). #57 (burn!) и #694 (уникальный
  // статлайн) остаются нетронуты — Tea burn-count не изменился. Jeet теряет 2 из 4
  // безтеговых клонов (#740/#971 срезаны, #12/#49 остаются).
  // 2026-07-21 (полный ребаланс кривой, см. archetypeSizes выше): массивы переписаны так,
  // чтобы первые N элементов (N = archetypeSizes) были ИМЕННО тем набором, который посчитан
  // под целевую кривую 5/7/9/8/7/2/1/1 (cost1-8). Хвост каждого массива (после явно
  // отрезанных size) оставлен как "резерв" на случай будущего расширения квоты — не удалён,
  // просто не попадает в срез.
  // 2026-07-21 (вечер, стартеры "3 Врат против 3 Врат" — см. archetypeSizes выше):
  // массивы переупорядочены так, чтобы первые N (N = archetypeSizes) были ИМЕННО целевым
  // набором фокус-стартера с осмысленной кривой. Хвост после среза — резерв на расширение
  // квот / Starter Set 2 (для "чужой" фракции архетипа квота 0 — весь массив в резерве,
  // карты живы в DEFS и каталоге, из Classic/Rush-пула они просто не попадают в срез).
  // Tea Szarg 6: два однодропа (#33/#870) + четыре трёхдропа (#25 untamed, #57 burn —
  // тема!, #694 vanguard, #34 regen). #890 (третий ванильный однодроп) → резерв по данным
  // sim-прогона 1000 партий (2026-07-21, baseline_v104: winrate-when-played 39.9% —
  // худшее тело Tea; Tea в целом 42.8% — мидгейм-тело вместо третьей ваниллы).
  // 2026-07-22 (симметричная кривая 5/5/9/4/2, см. archetypeSizes выше): Tea 5 держит все
  // 3 однодропа + оба burn/regen трёхдропа (57 burn — тема!, 34 regen); #694 (vanguard) →
  // резерв (дублирующий тег, уже есть на Faeron/Tuborg). Jeet 3 — #12/#49 (два из четырёх
  // идентичных однодропов) + #434 (fear — тема! + incarnation топ-энд).
  // RESERVE (not in deck, still live in data.js/catalog): Tea #694/#890, Jeet
  // #434/#971/#740/#551.
  const szarg  = t ? ['t_trvl33_w','t_trvl870_w','t_trvl25_w','t_trvl34_w','t_trvl57_w']
                   : ['j_trvl12_w','j_trvl49_w'];

  // Tea Orbiton 5: два однодропа + #218 (cost2) + #10 (burn, тема) + #398 (vanguard+untamed).
  // #1034 (третий идентичный однодроп) — резерв.
  // 2026-07-22 (симметричная кривая): Tea 5 держит #433/#1034 (однодропы) + #218 (cost2) +
  // #10 (burn — тема!) + #398 (vanguard+untamed топ-энд); #503 (третий идентичный
  // однодроп) → резерв. Jeet 3 — #170/#429 (однодропы) + #523 (fear — тема!).
  // RESERVE: Tea #503, Jeet #454.
  const orb    = t ? ['t_trvl433_w','t_trvl1034_w','t_trvl218_w','t_trvl10_w','t_trvl398_w']
                   : ['j_trvl170_w','j_trvl429_w','j_trvl523_w'];

  // Tea Dreegan 5: вся стена целиком — #14 (cost2) + #1 (enter_heal) + #31 (burn, тема) +
  // #605 (shield) + #388 (enter_draw).
  // Tea Dreegan 5 — родной архетип, полный пул без изменений (стена: #14 cost2 + #1
  // enter_heal + #31 burn-тема + #605 shield + #388 enter_draw).
  // 2026-07-22 (симметричная кривая): Jeet Dreegan 4 (нелюбимый, был quota:0) — #41 (cost2)
  // + #36 (cost3) + #775 (cost3) + #859 (fear — тема! + provoke + vanguard, cost5 топ-энд);
  // #1015 (cost4) → резерв.
  // RESERVE: Jeet #1015.
  const drg    = t ? ['t_trvl14_w','t_trvl1_w','t_trvl31_w','t_trvl605_w','t_trvl388_w']
                   : ['j_trvl41_w','j_trvl36_w','j_trvl775_w','j_trvl859_w'];

  // Jeet Umbasir 6: #54 (единственный однодроп Jeet!) + #934 (cost2) + #53 (enter_lose) +
  // #550 (fear+taunt_break — оба про тему и про взлом Tea-стены) + #20 (vanguard) + #248
  // (shield+ward топ-энд).
  // 2026-07-22 (симметричная кривая): Tea Umbasir 3 (нелюбимый, был quota:0) — #52 (cost1,
  // единственный однодроп пула) + #583 (cost4, enter_heal) + #387 (cost5, топ-энд); #2/#6/
  // #137 (три cost3-варианта) → резерв. Jeet Umbasir 5 — родной архетип, #54 (единственный
  // однодроп!) + #934 (cost2) + #53 (cost3) + #550 (fear+taunt_break — тема!) + #20
  // (vanguard); #248 (shield+ward топ-энд) → резерв.
  // RESERVE: Tea #2/#6/#137, Jeet #248.
  const umb    = t ? ['t_trvl52_w','t_trvl583_w','t_trvl387_w']
                   : ['j_trvl54_w','j_trvl934_w','j_trvl53_w','j_trvl550_w','j_trvl20_w'];

  // Jeet Mechird 5: полный pierce-пакет — #724 (cost2) + #22 + #804 (regen) + #663
  // (fear, тема) + #320 (necrophage).
  // 2026-07-22 (симметричная кривая): Tea Mechird 4 (нелюбимый, был quota:0) — #18/#35
  // (оба cost2 pierce-ванилла) + #921 (burn — тема!) + #128 (cost5, incarnation топ-энд);
  // #38 (rage) / #11 (enter_heal) → резерв.
  // Jeet Mechird 5 — родной архетип, полный пул без изменений (весь pierce-пакет: #724
  // cost2 + #22 + #804 regen + #663 fear-тема! + #320 necrophage).
  // RESERVE: Tea #38/#11, Jeet #128 (moved Tea→Jeet 2026-07-23, stays in reserve — was
  // never meant to be in the live classic deck to begin with, see history above).
  const mch    = t ? ['t_trvl18_w','t_trvl35_w','t_trvl921_w']
                   : ['j_trvl724_w','j_trvl22_w','j_trvl804_w','j_trvl663_w','j_trvl320_w'];

  // Jeet Xuiqtr 5: темповый низ — #50/#37 (cost2) + #579 (fear, тема) + #720 (draw_attack) +
  // #951 (regen). #704 (cost5 3/8 fear+shield) — резерв: топ-энд Jeet и так плотный
  // (#248/уники), кривую вниз держим сознательно.
  // 2026-07-22 (симметричная кривая): Tea Xuiqtr 3 (нелюбимый, был quota:0) — #39 (cost2) +
  // #972 (burn — тема!) + #402 (cost4, intercept/regen/rage); #26 (taunt_break) → резерв.
  // Jeet Xuiqtr 5 — родной архетип, полный набор без изменений (темповый низ: #50/#37
  // cost2 + #579 fear-тема! + #720 draw_attack + #951 regen); #704 (топ-энд) → резерв.
  // RESERVE: Tea #26, Jeet #704.
  const xui    = t ? ['t_trvl39_w','t_trvl972_w','t_trvl402_w']
                   : ['j_trvl50_w','j_trvl37_w','j_trvl579_w','j_trvl720_w','j_trvl951_w'];

  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];

  // +GLIMPSE/OMEN (2026-07-19, ребаланс кривой под ход 1) — см. SPELL_COPIES выше.
  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4','t_sp5','t_sp6','t_sp7','t_sp8','t_sp9','t_sp10','t_sp11','t_sp12','t_sp13','t_sp14','t_sp15']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4','j_sp5','j_sp6','j_sp7','j_sp8','j_sp9','j_sp10','j_sp11','j_sp12','j_sp13','j_sp14','j_sp15'];

  // 2026-07-22 (по прямому запросу автора, печатная classic-колода) — оба Мира и оба
  // Артефакта на фракцию снова в игре (VALLEY/HUNGER возвращены, несмотря на прежний баг
  // с разгоном руки через JEET WAVE/OMEN — при 16 спеллах/16 существах на фракцию в
  // 50-карточной колоде та же связка уже не выбивает колоду насухо так быстро, как било
  // на старой 40-карточной; если повторится на игровых логах — придётся точечно резать
  // draw-плотность, а не сам Мир).
  const worlds = t ? ['t_w2','t_w1'] : ['j_w2','j_w1'];
  const arts   = t ? ['t_a1','t_a2'] : ['j_a1','j_a2'];

  let d = [];
  const namedGroups = { szarg, orb, drg, umb, mch, xui };
  Object.entries(namedGroups).forEach(([name, group]) => {
    group.forEach(k => d.push(k));
  });

  legs.forEach(k => d.push(k));
  spells.forEach(k => { const copies = SPELL_COPIES[k] !== undefined ? SPELL_COPIES[k] : 1; for(let i=0;i<copies;i++) d.push(k); });
  worlds.forEach(k => d.push(k));
  arts.forEach(k => d.push(k));

  return d;
}

function buildDeck(f, configKey) {
  const cfg = DECK_CONFIGS[configKey] || DECK_CONFIGS.classic;
  let d = _composeDeckList(f, cfg);
  // Unseen (2nd-player bonus card) is NOT part of the deck — it's granted
  // directly to whichever faction the dice-roll made the 2nd player, straight
  // into their hand right after the mulligan ends (grantUnseenBonus() in
  // ui.js). Keeping it out of the deck means it can never appear in — or be
  // discarded during — the mulligan itself. See CLAUDE.md "Version 1.01".
  return shuffleArr(d);
}

// Rush deckbuilder pool — same composition as Classic, unshuffled, WITHOUT the
// Unseen bonus card (that's granted automatically to whoever the dice-roll
// makes the 2nd player — see grantUnseenBonus() in ui.js). Returned as unique
// {key,max} entries: max is
// almost always 1 (one physical copy in the "collection"), except spells,
// which appear `SPELL_COPIES[key]` times in Classic and so can be picked up to
// that many times here.
function getRushPool(f){
  const list = _composeDeckList(f, DECK_CONFIGS.classic);
  const counts = {};
  list.forEach(k => { counts[k] = (counts[k]||0) + 1; });
  return Object.keys(counts).map(key => ({ key, max: counts[key] }));
}

// AI's automatic Rush deck (vsAI mode only — the AI never goes through the
// deckbuilder UI): a random RUSH_MIN-card sample of the same pool a human
// would be picking from, so the AI's deck is roughly "one plausible Rush
// build" rather than a separately hand-tuned preset.
function buildAiRushDeck(f){
  let slots = [];
  getRushPool(f).forEach(({key,max}) => { for(let i=0;i<max;i++) slots.push(key); });
  shuffleArr(slots);
  let d = slots.slice(0, RUSH_MIN);
  // No 'unseen' push here either — see buildDeck() above.
  return shuffleArr(d);
}

let UID=0;
function mkCard(key){
  const def=DEFS[key];
  if(!def)return null;
  UID++;
  return{id:'c'+UID,key,name:def.name,cost:def.cost,hp:def.hp,maxHp:def.hp,atk:def.atk,art:def.art,img:def.img||null,
    f:def.f,tags:[...(def.tags||[])],ab:def.ab||'',
    spell:!!def.spell,world:!!def.world,artifact:!!def.artifact,unique:!!def.unique,
    fullArt:!!def.fullArt,neutral:!!def.neutral,
    sleeping:false,exhausted:false,feared:false,burning:false,provokeBroken:false,atkBonus:0,tempAtkBonus:0,
    armor:0,shieldConsumed:false}; // Armor — see game.js dmgCard()/doCreature()/endTurn() for the actual mechanic
}
