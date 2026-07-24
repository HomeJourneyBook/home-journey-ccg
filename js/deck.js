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
// (EXPOSE/UNMASK) и ess_add (SCHEME/BLACK MAGIC) — исключены полностью в ЭТОЙ конкретной
// печатной classic-колоде (решение по вкусу/теме, не по механическому дублированию —
// см. поправку ниже); все остальные 10 пар — по 1 копии. См. полный разбор ролей в
// CLAUDE.md/сессионной записи.
// ИСПРАВЛЕНО (2026-07-24, автор поймал устаревшую причину в этом же комментарии): здесь
// раньше было написано, что ess_add исключён, потому что "эссенция уже выдаётся 2-му
// игроку отдельным Unseen-бонусом" — неверно вдвойне. Во-первых, бонус 2-го игрока
// (`grantUnseenBonus()`, ui.js) с 2026-07-23 — это НАСТОЯЩАЯ 6-я карта из собственной
// колоды игрока, а не эссенция и не карта UNSEEN. Во-вторых, сам UNSEEN (до 2026-07-23
// бывший механизмом бонуса) — это bounce-спелл, тоже не эссенция. Ни один из двух
// реальных вариантов бонуса никогда не выдавал эссенцию — старая формулировка путала
// сразу оба. exclusion SCHEME/BLACK MAGIC в classic остаётся в силе (это решение по теме/
// балансу колоды, см. выше), просто не по этой причине.
// 2026-07-24 (по прямому запросу автора — полная замена под новую 35-карточную сборку):
// раньше эта таблица держала квоты под старый 16-спелловый набор. Теперь набор сильно уже —
// только 10 спеллов на фракцию (2 добор + 2 хил + 2 эссенция + 6 прочих), всё остальное на 0.
const SPELL_COPIES = {
  // Tea
  t_sp1:0,  // ARCHIVE (combat-trick +1 ATK) — исключён
  t_sp2:0,  // VERDICT (bolt 999) — исключён
  t_sp3:0,  // SHEN'S CALL (revive full) — исключён (по прямому запросу автора: без воскрешения)
  t_sp4:2,  // SCHEME (ess_add:4) — эссенция ×2
  t_sp5:1,  // GUST (bounce any)
  t_sp6:0,  // RECKONING (aoe count) — исключён
  t_sp7:0,  // FORGET-ME-NOT (discard 2) — исключён (срезан ради лимита 35 карт)
  t_sp8:0,  // EXPOSE (anti-provoke tech) — исключён
  t_sp9:1,  // BREACH (bolt 5 + trample)
  t_sp10:1, // WILDFIRE (burn_all) — АОЕ-поджог, добавлен по прямому запросу автора
  t_sp11:0, // REKINDLE (untap) — исключён
  t_sp12:0, // BULWARK (combat-trick +1 Armor) — исключён
  t_sp13:2, // INSIGHT (draw 2) — добор ×2
  t_sp14:1, // GLIMPSE (draw 1 + heal base 2)
  t_sp15:0, // SPARK (bolt 2) — исключён
  t_sp16:2, // SANCTUARY (heal all 2 + heal base 2) — хил ×2
  t_sp17:1, // JAB (bolt 1)
  t_sp18:1, // SCATTERSHOT (3 random spread)
  t_sp19:0, // MULTITUDE (scaling draw) — исключён
  t_sp20:1, // EXECUTE (bolt3 + draw on kill)
  t_sp21:0, // SUNDER (destroy world/artifact) — исключён
  t_sp22:0, // CATACLYSM (destroy all enemies) — исключён
  t_sp23:1, // CINDER (single-target burn) — точечный поджог, добавлен по прямому запросу автора
  // Jeet
  j_sp1:2,  // JEET WAVE (draw 2) — добор ×2
  j_sp2:0,  // OBLIVION (untap) — исключён
  j_sp3:0,  // FORGETTING (revive full) — исключён (без воскрешения)
  j_sp4:2,  // BLACK MAGIC (ess_add:4) — эссенция ×2
  j_sp5:1,  // REVERSE (bounce any)
  j_sp6:0,  // SWARM CULL (aoe count) — исключён
  j_sp7:0,  // MINDROT (discard 2) — исключён (срезан ради лимита 35 карт)
  j_sp8:0,  // UNMASK (anti-provoke tech) — исключён
  j_sp9:1,  // RUPTURE (bolt 5 + trample)
  j_sp10:1, // NIGHTMARE (fear_all) — АОЕ-фир, добавлен по прямому запросу автора
  j_sp11:0, // FRENZY (combat-trick +1 ATK) — исключён
  j_sp12:0, // CARAPACE (combat-trick +1 Armor) — исключён
  j_sp13:0, // DAMNATION (bolt 999) — исключён
  j_sp14:1, // OMEN (draw 1 + heal base 2)
  j_sp15:0, // MALICE (bolt 2) — исключён
  j_sp16:2, // VIGIL (heal all 2 + heal base 2) — хил ×2
  j_sp17:1, // STING (bolt 1)
  j_sp18:1, // SHRAPNEL (3 random spread)
  j_sp19:0, // LEGION (scaling draw) — исключён
  j_sp20:1, // CULL (bolt3 + draw on kill)
  j_sp21:0, // BLIGHT (destroy world/artifact) — исключён
  j_sp22:0, // EXTINCTION (destroy all enemies) — исключён
  j_sp23:1, // DREAD (single-target fear) — точечный фир, добавлен по прямому запросу автора
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

  // 2026-07-24 (по прямому запросу автора — полная замена предыдущего дизайна классик-
  // колоды): раньше Classic держал ВСЕ 6 архетипов симметрично 4/4/4/4/4/4 (Tea=szg/orb/drg
  // + umb/mch/xui в резерве темы, Jeet наоборот). Теперь обе фракции играют ОДНИМ и тем же
  // набором архетипов — szg/orb/drg/xui — umb/mch в Classic больше не участвуют вообще
  // (пустые массивы ниже; сами карты остаются в data.js/каталоге, просто не в этой сборке).
  // Распределение по cost внутри архетипа задано явно автором:
  //   szg/orb: cost1×2, cost2×1, cost3×1 (4 карты)
  //   drg/xui: cost2×2, cost3×1, cost4×1 (4 карты)
  // Тег-зеркалирование Jeet(fear)/Tea(burn) выдержано на cost3 у всех четырёх архетипов,
  // где для этого была тегованная карта на этом cost (иначе — где возможно, идентичные
  // теги, см. Dreegan cost4 — оба untamed).
  const szarg  = t ? ['t_trvl33_w','t_trvl870_w','t_trvl55_w','t_trvl57_w']
                   : ['j_trvl12_w','j_trvl971_w','j_trvl7_w','j_trvl1008_w'];

  const orb    = t ? ['t_trvl503_w','t_trvl433_w','t_trvl218_w','t_trvl10_w']
                   : ['j_trvl170_w','j_trvl429_w','j_trvl457_w','j_trvl523_w'];

  const drg    = t ? ['t_trvl14_w','t_trvl58_w','t_trvl605_w','t_trvl388_w']
                   : ['j_trvl41_w','j_trvl27_w','j_trvl36_w','j_trvl163_w'];

  // umb/mch — не участвуют в этой сборке Classic (см. комментарий выше).
  const umb    = [];
  const mch    = [];

  const xui    = t ? ['t_trvl39_w','t_trvl42_w','t_trvl972_w','t_trvl847_w']
                   : ['j_trvl50_w','j_trvl37_w','j_trvl579_w','j_trvl806_w'];

  // Уники — только 3 на фракцию (было все 5): Tea меняет TEANTIST→FAERON (burn-тема,
  // подхватывает atk_vs_burning), ASLEX не участвует; Jeet меняет RYVLEN→SEEKER
  // (fear-тема), REAPER не участвует.
  const legs   = t ? ['t_tuborg','t_faeron','t_nab']
                   : ['j_phleg','j_mal','j_vard'];

  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4','t_sp5','t_sp6','t_sp7','t_sp8','t_sp9','t_sp10','t_sp11','t_sp12','t_sp13','t_sp14','t_sp15','t_sp16','t_sp17','t_sp18','t_sp19','t_sp20','t_sp21','t_sp22','t_sp23']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4','j_sp5','j_sp6','j_sp7','j_sp8','j_sp9','j_sp10','j_sp11','j_sp12','j_sp13','j_sp14','j_sp15','j_sp16','j_sp17','j_sp18','j_sp19','j_sp20','j_sp21','j_sp22','j_sp23'];

  // Мир/Артефакт — только ОДИН на фракцию (было оба): Tea IGNEON(было DOMUS)+SCORCH(было
  // FOUNTAIN), Jeet HUNGER(было NORRIA)+SHARD(было ALTAR) — вторые версии каждой пары.
  const worlds = t ? ['t_w1'] : ['j_w1'];
  const arts   = t ? ['t_a1'] : ['j_a1'];

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

// Rush deckbuilder pool — 2026-07-24 (fix, по прямому запросу автора): раньше это было
// `_composeDeckList(f, DECK_CONFIGS.classic)` — буквально то же самое, что уходит в Classic.
// Это молча сломалось, когда classic-массивы архетипов стали "что видишь — то и в деке"
// (без slice, см. рефактор выше): раньше пул архетипа был ШИРЕ, чем срез в деку, и Rush
// через тот же _composeDeckList() случайно видел лишние карты сверху среза. Теперь массив
// = ровно то, что в Classic, и Rush через ту же функцию видел ТОЛЬКО те же карты, что и
// Classic — а весь ростер, что добавлялся в data.js весь день (десятки новых Traveler'ов),
// стал невидим для деккбилдера, хотя это ровно тот пул, ради которого его и наполняли.
// Правильная семантика: Classic — фиксированный кураторский пресет (всегда одна и та же
// дека), Rush — свободный выбор из ВСЕЙ коллекции. Теперь читает прямо из DEFS по фракции,
// не через _composeDeckList/classic вообще.
// 2026-07-24 (по прямому запросу автора): в Rush все спеллы доступны фиксированно по 3
// копии на фракцию, независимо от SPELL_COPIES (та таблица квот — только для Classic,
// Rush её больше не читает вообще для спеллов).
function getRushPool(f){
  // 2026-07-24 (баг, автор): забыл исключить neutral:true (UNSEEN) — та карта f:"jeet"
  // тегом, но по смыслу нейтральная/отложенная (см. историю в data.js), в деккбилдере
  // не должна светиться ни у одной фракции, пока по ней не будет отдельного решения.
  return Object.entries(DEFS)
    .filter(([key,d]) => d.f===f && !d.neutral)
    .map(([key,d]) => ({ key, max: d.spell ? 3 : 1 }));
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
