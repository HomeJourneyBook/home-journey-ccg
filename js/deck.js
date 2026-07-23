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
  t_sp4:0,  // SCHEME (cost2, ess_add:4 — rebalanced 2026-07-23) — всё ещё исключён из classic, решение включать ли не принято
  t_sp5:2,  // GUST (bounce any)
  t_sp6:1,  // RECKONING (aoe count)
  t_sp7:1,  // FORGET-ME-NOT (discard 2)
  t_sp8:0,  // EXPOSE (anti-provoke tech) — исключён
  t_sp9:1,  // BREACH (bolt 5 + trample)
  t_sp10:1, // WILDFIRE (burn_all — сигнатурный payoff темы)
  t_sp11:1, // REKINDLE (untap)
  t_sp12:1, // BULWARK (combat-trick +1 Armor)
  t_sp13:2, // INSIGHT (draw 2)
  t_sp14:2, // GLIMPSE (draw 1 + heal base 2)
  t_sp15:1, // SPARK (bolt 2)
  t_sp16:1, // SANCTUARY (heal all 2 + heal base 2) — new 2026-07-23
  // Jeet
  j_sp1:2,  // JEET WAVE (draw 2)
  j_sp2:1,  // OBLIVION (untap)
  j_sp3:1,  // FORGETTING (revive full)
  j_sp4:0,  // BLACK MAGIC (cost2, ess_add:4 — rebalanced 2026-07-23) — всё ещё исключён из classic, решение включать ли не принято
  j_sp5:2,  // REVERSE (bounce any)
  j_sp6:1,  // SWARM CULL (aoe count)
  j_sp7:1,  // MINDROT (discard 2)
  j_sp8:0,  // UNMASK (anti-provoke tech) — исключён
  j_sp9:1,  // RUPTURE (bolt 5 + trample)
  j_sp10:1, // NIGHTMARE (fear_all — сигнатурный payoff темы)
  j_sp11:1, // FRENZY (combat-trick +1 ATK)
  j_sp12:1, // CARAPACE (combat-trick +1 Armor)
  j_sp13:1, // HEX (bolt 3)
  j_sp14:2, // OMEN (draw 1 + heal base 2)
  j_sp15:1, // MALICE (bolt 2)
  j_sp16:1, // VIGIL (heal all 2 + heal base 2) — new 2026-07-23
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

  // 2026-07-23 (симметрия 4/4/4/4/4/4, по прямому запросу автора): каждый архетип теперь
  // РОВНО 4 карты на фракцию (было 5/5/5/3/3/3 у Tea против 2/3/4/5/5/5 у Jeet — асимметрия
  // архетипов, не только тем). Burn(Tea)/Fear(Jeet) — ровно 1 карта на архетип с каждой
  // стороны (6 burn = 6 fear суммарно). Кривая по cost выровнена НАСКОЛЬКО возможно без
  // смены тегов — где джитовская fear-карта сидела на другом costе, чем тийская burn-карта
  // в том же архетипе, статы/cost самой карты пересчитаны под пира (см. j_trvl434_w и
  // j_trvl859_w в data.js, оба репрайснуты 2026-07-23 — теги НЕ трогали, только cost/hp/atk).
  // RESERVE (not in deck, still live in data.js/catalog): Tea #890/#694/#7, Jeet
  // #971/#740/#434 (2026-07-23: #1008 заменил #434 в живой деке — тот же cost3/fear
  // слот, но 1 тег вместо 2, см. историю #434 в data.js).
  const szarg  = t ? ['t_trvl33_w','t_trvl870_w','t_trvl57_w','t_trvl34_w']
                   : ['j_trvl12_w','j_trvl49_w','j_trvl1008_w','j_trvl551_w'];

  // RESERVE: Tea #1034/#503, Jeet — весь пул уже используется (только 4 карты всего).
  const orb    = t ? ['t_trvl433_w','t_trvl218_w','t_trvl10_w','t_trvl398_w']
                   : ['j_trvl170_w','j_trvl429_w','j_trvl523_w','j_trvl454_w'];

  // RESERVE: Tea #605, Jeet #1015.
  const drg    = t ? ['t_trvl14_w','t_trvl1_w','t_trvl31_w','t_trvl388_w']
                   : ['j_trvl41_w','j_trvl36_w','j_trvl775_w','j_trvl859_w'];

  // RESERVE: Tea #2/#137, Jeet #20/#248.
  const umb    = t ? ['t_trvl52_w','t_trvl6_w','t_trvl583_w','t_trvl387_w']
                   : ['j_trvl54_w','j_trvl934_w','j_trvl53_w','j_trvl550_w'];

  // RESERVE: Tea #11, Jeet #320/#128 (128 остаётся в резерве Jeet — не был задуман для
  // живой classic-колоды, см. историю).
  const mch    = t ? ['t_trvl18_w','t_trvl35_w','t_trvl921_w','t_trvl38_w']
                   : ['j_trvl724_w','j_trvl22_w','j_trvl804_w','j_trvl663_w'];

  // RESERVE: Tea #26, Jeet #720/#704.
  const xui    = t ? ['t_trvl39_w','t_trvl972_w','t_trvl402_w','t_trvl26_w']
                   : ['j_trvl50_w','j_trvl37_w','j_trvl579_w','j_trvl951_w'];

  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];

  // +GLIMPSE/OMEN (2026-07-19, ребаланс кривой под ход 1) — см. SPELL_COPIES выше.
  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4','t_sp5','t_sp6','t_sp7','t_sp8','t_sp9','t_sp10','t_sp11','t_sp12','t_sp13','t_sp14','t_sp15','t_sp16']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4','j_sp5','j_sp6','j_sp7','j_sp8','j_sp9','j_sp10','j_sp11','j_sp12','j_sp13','j_sp14','j_sp15','j_sp16'];

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
