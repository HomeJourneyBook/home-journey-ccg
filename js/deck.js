// Deck presets:
//  classic — 1st-edition starter, all 6 archetypes (27 creatures/faction, включая
//            новых Путешественников 2026-07-18) + all 5 legendaries + per-spell copy
//            counts (см. SPELL_COPIES ниже, тема "Чай=Burn / Джит=Fear") + 2 worlds +
//            2 artifacts = 62 карты/фракция. Раньше было "по копии 3х на все 13
//            спеллов сразу" (73 карты) — см. CLAUDE.md "Рефактор классик-колоды под
//            тему Врат" за полную историю решений.
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
const SPELL_COPIES = {
  // Tea (13 итого) — восстановлено 2026-07-18: реальный итог без этих 3 был 37, а не 40,
  // так что свободных слотов ровно 3 — возвращаем BREACH/SHEN'S CALL/2-ю копию SCHEME.
  t_sp1:1,  // ARCHIVE (+2 ATK temp — Tea's combat-trick бонус)
  t_sp2:1,  // JOURNEY (bolt 3)
  t_sp3:1,  // SHEN'S CALL (revive full)
  t_sp4:2,  // SCHEME (ess_add)
  t_sp5:1,  // GUST (bounce any)
  t_sp6:1,  // RECKONING (aoe count)
  t_sp7:1,  // FORGET-ME-NOT (discard 2)
  t_sp8:0,  // EXPOSE (anti-provoke tech — исключён полностью)
  t_sp9:1,  // BREACH (bolt 5 + trample)
  t_sp10:2, // WILDFIRE (burn_all — сигнатурный payoff темы)
  t_sp11:0, // REKINDLE (untap — исключён)
  t_sp12:0, // BULWARK (+1 armor temp — чужой бонус для Tea, исключён)
  t_sp13:2, // INSIGHT (draw 2)
  // Jeet (13 итого)
  j_sp1:2,  // JEET WAVE (draw 2)
  j_sp2:0,  // OBLIVION (untap — исключён)
  j_sp3:1,  // FORGETTING (revive full)
  j_sp4:2,  // BLACK MAGIC (ess_add)
  j_sp5:1,  // REVERSE (bounce any)
  j_sp6:1,  // SWARM CULL (aoe count)
  j_sp7:1,  // MINDROT (discard 2)
  j_sp8:0,  // UNMASK (anti-provoke tech — исключён полностью)
  j_sp9:1,  // RUPTURE (bolt 5 + trample)
  j_sp10:2, // NIGHTMARE (fear_all — сигнатурный payoff темы)
  j_sp11:0, // FRENZY (+2 ATK temp — чужой бонус для Jeet, исключён)
  j_sp12:1, // CARAPACE (+1 armor temp — Jeet's combat-trick бонус)
  j_sp13:1, // HEX (bolt 3)
};

const DECK_CONFIGS = {
  // 2026-07-18: было плоское groupSize:5 на все 6 архетипов сразу. Теперь у каждого
  // архетипа свой целевой размер НА ФРАКЦИЮ (тема Врат: Джит гуще берёт Umbasir/Mechird/
  // Xuiqtr, Чай — Szarg/Dreegan/Orbiton, ровно наоборот) — см. archetypeSizes и полный
  // разбор в CLAUDE.md "Рефактор классик-колоды под тему Врат". Итог: по 18 рядовых
  // существ на фракцию (полный симметричный расклад 4+4+4+2+2+2 против 2+2+2+4+4+4).
  classic: { legCount:5,
    archetypeSizes: {
      // Финал (2026-07-18): 18 существ/фракцию, кривая по costу 1-5 идентична у обеих
      // фракций (3/3/4/5/3) — см. полный разбор в CLAUDE.md "Рефактор классик-колоды под
      // тему Врат". Архетипные квоты сохраняют тему: Tea гуще Szarg/Orb/Drg (по 3-3-4,
      // раньше было 4/4/4 — сократили под кривую), Jeet гуще Umb/Mch/Xui (4/4/3).
      szarg: { tea:4, jeet:2 },
      orb:   { tea:4, jeet:2 },
      drg:   { tea:4, jeet:2 },
      umb:   { tea:2, jeet:4 },
      mch:   { tea:2, jeet:4 },
      xui:   { tea:2, jeet:4 },
    },
  },
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

  const szarg  = t ? ['t_trvl57_w','t_trvl33_w','t_trvl694_w','t_trvl25_w','t_trvl34_w']
                   : ['j_trvl971_w','j_trvl12_w','j_trvl49_w','j_trvl434_w','j_trvl551_w'];

  const orb    = t ? ['t_trvl10_w','t_trvl398_w','t_trvl433_w','t_trvl1034_w']
                   : ['j_trvl523_w','j_trvl170_w','j_trvl429_w','j_trvl454_w'];

  const drg    = t ? ['t_trvl1_w','t_trvl31_w','t_trvl605_w','t_trvl388_w','t_trvl14_w']
                   : ['j_trvl859_w','j_trvl775_w','j_trvl41_w','j_trvl1015_w','j_trvl36_w'];

  const umb    = t ? ['t_trvl387_w','t_trvl137_w','t_trvl52_w','t_trvl2_w','t_trvl583_w','t_trvl6_w']
                   : ['j_trvl550_w','j_trvl53_w','j_trvl20_w','j_trvl248_w','j_trvl54_w'];

  const mch    = t ? ['t_trvl921_w','t_trvl128_w','t_trvl18_w','t_trvl38_w','t_trvl35_w','t_trvl11_w']
                   : ['j_trvl22_w','j_trvl724_w','j_trvl663_w','j_trvl320_w','j_trvl804_w'];

  const xui    = t ? ['t_trvl972_w','t_trvl402_w','t_trvl26_w','t_trvl39_w']
                   : ['j_trvl704_w','j_trvl579_w','j_trvl37_w','j_trvl951_w','j_trvl50_w','j_trvl720_w'];

  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];

  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4','t_sp5','t_sp6','t_sp7','t_sp8','t_sp9','t_sp10','t_sp11','t_sp12','t_sp13']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4','j_sp5','j_sp6','j_sp7','j_sp8','j_sp9','j_sp10','j_sp11','j_sp12','j_sp13'];

  const worlds = t ? ['t_w1','t_w2'] : ['j_w1','j_w2'];
  const arts   = t ? ['t_a1','t_a2'] : ['j_a1','j_a2'];

  let d = [];
  const namedGroups = { szarg, orb, drg, umb, mch, xui };
  Object.entries(namedGroups).forEach(([name, group]) => {
    const size = cfg.archetypeSizes ? cfg.archetypeSizes[name][f] : group.length;
    group.slice(0, size).forEach(k => d.push(k));
  });

  legs.slice(0, cfg.legCount).forEach(k => d.push(k));
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
