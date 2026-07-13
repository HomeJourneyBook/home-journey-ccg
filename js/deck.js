// Deck presets:
//  classic — 1st-edition starter, all archetypes + all legendaries, "по сути все
//            карты реализованные в игре" (currently ~45/46 — still flexible while
//            we playtest, see CLAUDE.md "Deck size configs")
//  rush    — no fixed list: the human player assembles it themselves in the
//            deckbuilder (js/deckbuilder.js) by picking quantities out of the
//            SAME pool `classic` uses (see getRushPool() below), minimum RUSH_MIN
//            cards. The AI's own Rush deck (vsAI mode) is a random RUSH_MIN-card
//            sample of that same pool — see buildAiRushDeck().
const RUSH_MIN = 28;

const DECK_CONFIGS = {
  // groupSize:5 (было 4) — с 2026-07-13 два архетипа (Tea Szarg, Jeet Dreegan) обзавелись
  // 5-м рядовым (t_trvl734_w/j_trvl775_w, см. ниже). Остальные 10 групп-массивов (5
  // архетипов × 2 фракции) по-прежнему ровно по 4 ключа — `.slice(0,5)` на 4-элементном
  // массиве просто вернёт все 4, безопасный no-op, ничего не сломает нигде, где 5-й карты
  // ещё нет. Когда остальные архетипы тоже получат 5-х — они уже подхватятся автоматически,
  // ничего в этом объекте трогать не придётся.
  classic: { groupCount:6, groupSize:5, legCount:5, spellCopies:3 },
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

  const szarg  = t ? ['t_trvl25_w','t_trvl33_w','t_trvl34_w','t_trvl434_w','t_trvl734_w']
                   : ['j_trvl12_w','j_trvl49_w','j_trvl57_w','j_trvl551_w'];

  const orb    = t ? ['t_trvl10_w','t_trvl398_w','t_trvl433_w','t_trvl1034_w']
                   : ['j_trvl170_w','j_trvl429_w','j_trvl454_w','j_trvl523_w'];

  const drg    = t ? ['t_trvl1_w','t_trvl31_w','t_trvl892_w','t_trvl14_w']
                   : ['j_trvl36_w','j_trvl41_w','j_trvl1015_w','j_trvl859_w','j_trvl775_w'];

  const umb    = t ? ['t_trvl583_w','t_trvl2_w','t_trvl52_w','t_trvl6_w']
                   : ['j_trvl550_w','j_trvl53_w','j_trvl54_w','j_trvl20_w'];

  const mch    = t ? ['t_trvl38_w','t_trvl18_w','t_trvl35_w','t_trvl11_w']
                   : ['j_trvl22_w','j_trvl724_w','j_trvl921_w','j_trvl804_w'];

  const xui    = t ? ['t_trvl187_w','t_trvl704_w','t_trvl26_w','t_trvl39_w']
                   : ['j_trvl579_w','j_trvl972_w','j_trvl50_w','j_trvl37_w'];

  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];

  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4','t_sp5']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4','j_sp5'];

  const worlds = t ? ['t_w1','t_w2'] : ['j_w1','j_w2'];
  const arts   = t ? ['t_a1','t_a2'] : ['j_a1','j_a2'];

  let d = [];
  const allGroups = [szarg,orb,drg,umb,mch,xui];
  allGroups.slice(0, cfg.groupCount).forEach(group => {
    group.slice(0, cfg.groupSize).forEach(k => d.push(k));
  });

  legs.slice(0, cfg.legCount).forEach(k => d.push(k));
  spells.forEach(k => { for(let i=0;i<cfg.spellCopies;i++) d.push(k); });
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
// which appear `spellCopies` times in Classic and so can be picked up to
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
