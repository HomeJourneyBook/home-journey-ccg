// Bump this whenever card data (DEFS) or game mechanics change in a way that
// could make an older saved Rush-deck JSON (js/deckbuilder.js) or battle log
// no longer match reality — e.g. a card renamed/removed/rebalanced. Read by
// dbExportDeck()/_applyImportedDeck() (deck JSON) and downloadBattleLog()
// (ui.js), so old exports can be flagged instead of silently misapplied.
const GAME_VERSION = "1.04";
  
const DEFS = {
  // ── TEA CREATURES ───────────────────────────────────────────────

  // Szarg Tea
  t_trvl25_w:   {name:"TRAVELER #25",   cost:3,hp:3,atk:4,art:"🦈", img:"25.png",   f:"tea",tags:["untamed","gtype:szg"],                  ab:"Squad +1 maxHP."},
  t_trvl33_w:   {name:"TRAVELER #33",   cost:1,hp:1,atk:2,art:"🦈", img:"33.png",   f:"tea",tags:["gtype:szg"],                  ab:"Squad +1 maxHP."},
  t_trvl34_w:   {name:"TRAVELER #34",   cost:3,hp:3,atk:4,art:"🦈", img:"34.png",   f:"tea",tags:["regen","gtype:szg"],           ab:"Squad +1 maxHP."},
  t_trvl694_w:  {name:"TRAVELER #694",  cost:3,hp:3,atk:4,art:"🦈", img:"694.png",  f:"tea",tags:["vanguard","gtype:szg"],            ab:"Squad +1 maxHP."},
  t_trvl57_w:  {name:"TRAVELER #57",  cost:3,hp:3,atk:4,art:"🦈", img:"57.png",  f:"tea",tags:["burn","gtype:szg"],           ab:"Squad +1 maxHP."},
  // +2 (2026-07-19, ребаланс кривой под ход 1) — по шаблону TRAVELER #33 выше (тот же
  // 1/2 болван, gtype:szg, идентичная Squad-абилка), см. AI BALANCE NOTES.
  t_trvl870_w: {name:"TRAVELER #870", cost:1,hp:1,atk:2,art:"🦈", img:"870.png", f:"tea",tags:["gtype:szg"],                  ab:"Squad +1 maxHP."},
  t_trvl890_w: {name:"TRAVELER #890", cost:1,hp:1,atk:2,art:"🦈", img:"890.png", f:"tea",tags:["gtype:szg"],                  ab:"Squad +1 maxHP."},

  // Orbiton Tea
  // Ребаланс HP (2026-07-20, по прямому запросу автора) — Orbiton/Umbasir были
  // заметно жирнее Szarg на том же cost'е; срезано до кривой hp≈cost, как у
  // Szarg (см. Szarg Tea/Jeet выше) — ATK/теги (heal/bolt) не тронуты.
  t_trvl10_w:   {name:"TRAVELER #10",   cost:3,hp:3,atk:1,art:"👁️", img:"10.png",   f:"tea",tags:["heal:2","burn","gtype:orb"],             ab:"Active Heal 2 and Clean. Squad Heal 4."},
  t_trvl398_w:  {name:"TRAVELER #398",  cost:4,hp:4,atk:1,art:"👁️", img:"398.png",  f:"tea",tags:["heal:2","vanguard","untamed","gtype:orb"],         ab:"Active Heal 2 and Clean. Squad Heal 4."},
  t_trvl433_w:  {name:"TRAVELER #433",  cost:1,hp:1,atk:1,art:"👁️", img:"433.png",  f:"tea",tags:["heal:2","gtype:orb"],                   ab:"Active Heal 2 and Clean. Squad Heal 4."},
  t_trvl218_w:  {name:"TRAVELER #218",  cost:2,hp:2,atk:1,art:"👁️", img:"218.png",  f:"tea",tags:["heal:2","gtype:orb"],                   ab:"Active Heal 2 and Clean. Squad Heal 4."},
  t_trvl1034_w: {name:"TRAVELER #1034", cost:1,hp:1,atk:1,art:"👁️", img:"1034.png", f:"tea",tags:["heal:2","gtype:orb"],                   ab:"Active Heal 2 and Clean. Squad Heal 4."},
  // +1 (2026-07-19, ребаланс кривой под ход 1) — по шаблону TRAVELER #433/#1034 выше.
  t_trvl503_w:  {name:"TRAVELER #503",  cost:1,hp:1,atk:1,art:"👁️", img:"503.png",  f:"tea",tags:["heal:2","gtype:orb"],                   ab:"Active Heal 2 and Clean. Squad Heal 4."},

  // Dreegan Tea
  t_trvl1_w:    {name:"TRAVELER #1",    cost:3,hp:6,atk:1,art:"🌳", img:"1.png",    f:"tea",tags:["provoke","enter_heal:2","gtype:drg"],                   ab:"On play Heal 2 all allies. Squad +1 Armor."},
  t_trvl31_w:   {name:"TRAVELER #31",   cost:3,hp:6,atk:1,art:"🌳", img:"31.png",   f:"tea",tags:["provoke","burn","gtype:drg"],             ab:"Squad +1 Armor."},
  t_trvl605_w:  {name:"TRAVELER #605",  cost:3,hp:6,atk:1,art:"🌳", img:"605.png",  f:"tea",tags:["provoke","shield","gtype:drg"],            ab:"Squad +1 Armor."},
  t_trvl388_w:  {name:"TRAVELER #388",  cost:4,hp:8,atk:1,art:"🌳", img:"388.png",  f:"tea",tags:["provoke","untamed","enter_draw:1","gtype:drg"],            ab:"On play Draw 1. Squad +1 Armor."},
  t_trvl14_w:   {name:"TRAVELER #14",   cost:2,hp:4,atk:1,art:"🌳", img:"14.png",   f:"tea",tags:["provoke","gtype:drg"],                   ab:"Squad +1 Armor."},

  // Umbasir Tea (HP ребаланс 2026-07-20 — см. комментарий у Orbiton Tea выше)
    t_trvl583_w:    {name:"TRAVELER #583",  cost:4,hp:4,atk:1,art:"🌀", img:"583.png",  f:"tea",tags:["bolt:1","regen","enter_heal:2","gtype:umb"],              ab:"On play Heal 2 all allies. Active Bolt 1. Squad Bolt 2."},
      t_trvl2_w:    {name:"TRAVELER #2",    cost:3,hp:3,atk:1,art:"🌀", img:"2.png",    f:"tea",tags:["bolt:1","untamed","gtype:umb"],                     ab:"Active Bolt 1. Squad Bolt 2."},
     t_trvl52_w:    {name:"TRAVELER #52",   cost:1,hp:1,atk:1,art:"🌀", img:"52.png",   f:"tea",tags:["bolt:1","gtype:umb"],                     ab:"Active Bolt 1. Squad Bolt 2."},
      t_trvl6_w:    {name:"TRAVELER #6",    cost:3,hp:3,atk:1,art:"🌀", img:"6.png",    f:"tea",tags:["bolt:1","enter_draw:1","gtype:umb"],                     ab:"On play Draw 1. Active Bolt 1. Squad Bolt 2."},
      t_trvl387_w:  {name:"TRAVELER #387",  cost:5,hp:5,atk:2,art:"🌀", img:"387.png",  f:"tea",tags:["bolt:1","burn","necrophage","gtype:umb"],                     ab:"Active Bolt 1. Squad Bolt 2."},
      t_trvl137_w:  {name:"TRAVELER #137",  cost:3,hp:3,atk:1,art:"🌀", img:"137.png",  f:"tea",tags:["bolt:1","shield","gtype:umb"],                     ab:"Active Bolt 1. Squad Bolt 2."},

  // Mechird Tea
  // Ребаланс (2026-07-20, по прямому запросу автора) — ATK срезан (было завышено
  // относительно Szarg на том же cost'е), HP приведён к кривой hp≈cost, как у
  // Szarg (см. комментарий у Orbiton Tea выше) — та же логика, другая ось.
  t_trvl38_w:   {name:"TRAVELER #38",   cost:3,hp:3,atk:2,art:"🤖", img:"38.png",   f:"tea",tags:["pierce","rage","gtype:mch"],              ab:"Squad +1 ATK."},
  t_trvl18_w:   {name:"TRAVELER #18",   cost:2,hp:2,atk:1,art:"🤖", img:"18.png",   f:"tea",tags:["pierce","gtype:mch"],                    ab:"Squad +1 ATK."},
  t_trvl35_w:   {name:"TRAVELER #35",   cost:2,hp:2,atk:1,art:"🤖", img:"35.png",   f:"tea",tags:["pierce","gtype:mch"],                    ab:"Squad +1 ATK."},
  t_trvl11_w:   {name:"TRAVELER #11",   cost:3,hp:3,atk:2,art:"🤖", img:"11.png",   f:"tea",tags:["pierce","enter_heal:2","gtype:mch"],                    ab:"On play Heal 2 all allies. Squad +1 ATK."},
  t_trvl921_w:  {name:"TRAVELER #921",  cost:3,hp:3,atk:2,art:"🤖", img:"921.png",  f:"tea",tags:["pierce","burn","gtype:mch"],           ab:"Squad +1 ATK."},
  t_trvl128_w:  {name:"TRAVELER #128",  cost:6,hp:5,atk:4,art:"🤖", img:"128.png",  f:"tea",tags:["pierce","draw_attack:1","incarnation:4","gtype:mch"],           ab:"On attack Draw 1. Squad +1 ATK."}, // откат статов 2026-07-22 (по прямому запросу автора) — hp6/atk5 тестировалось в sim и стало СИЛЬНЕЕ (68.2% против 56.6%), возвращено на hp5/atk4, cost остаётся 6

  // Xuiqtr Tea
  // Ребаланс (2026-07-20, по прямому запросу автора) — на cost 1-3 HP поднят до
  // уровня Dreegan на том же cost'е (см. Dreegan Tea/Jeet выше, ATK не тронут —
  // Xuiqtr остаётся заметно ударнее Dreegan там же); с cost 4+ упор смещён на
  // рост ATK вместо продолжения HP-кривой Dreegan (та у cost 4-6 уходит в
  // 8-13 HP) — HP растёт медленно (+1 за cost), ATK быстро (+1 за cost).
    t_trvl402_w:    {name:"TRAVELER #402",  cost:4,hp:6,atk:2,art:"🐙", img:"402.png",  f:"tea",tags:["intercept","regen","rage","gtype:xui"],                   ab:"Squad +1 ATK."},
     t_trvl26_w:    {name:"TRAVELER #26",   cost:3,hp:5,atk:2,art:"🐙", img:"26.png",   f:"tea",tags:["intercept","taunt_break","gtype:xui"],            ab:"Squad +1 ATK."},
     t_trvl39_w:    {name:"TRAVELER #39",   cost:2,hp:3,atk:1,art:"🐙", img:"39.png",   f:"tea",tags:["intercept","gtype:xui"],                   ab:"Squad +1 ATK."},
     t_trvl972_w:    {name:"TRAVELER #972",  cost:3,hp:5,atk:2,art:"🐙", img:"972.png",  f:"tea",tags:["intercept","burn","gtype:xui"],          ab:"Squad +1 ATK."},

  // ── TEA LEGENDARIES ─────────────────────────────────────────────
  // Ребаланс 2026-07-19 (по прямому запросу автора) — стоимость легендарок поднята с
  // диапазона 4-6 в 6-9 ("если уж уникальный — пусть будет праздник"). Статы пересчитаны
  // от реальной кривой рядовых карт (см. AI BALANCE NOTES/чат) с небольшой премией за
  // уникальность; ATK почти не тронут (максимум +1), основной вес добавки — в HP и по
  // ОДНОМУ новому тегу на карту, чтобы не раздувать чистые цифры без текстуры.
  t_tean:      {name:"TEANTIST",   cost:6,hp:9,atk:3,art:"🧙", img:"002_Teantist.png", f:"tea",tags:["unique","draw_attack:1","stealth"],            ab:"On attack Draw 1.",unique:true}, // ward убран (2026-07-22, по прямому запросу автора — draw_attack всё равно оставался горячим под защитой, теперь карта полностью открыта для спелов/AOE)
  t_aslex:     {name:"ASLEX",      cost:6,hp:10,atk:3,art:"🍵", img:"008_Aslex.png",    f:"tea",tags:["unique","on_own_death_base:1","shield"],      ab:"When your creature dies: Heal base 1 HP.",unique:true},
  t_tuborg:    {name:"TUBORG",     cost:7,hp:11,atk:3,art:"👑", img:"011_Tuborg.png",   f:"tea",tags:["unique","aura:atk:1","untamed","armor:1"],       ab:"Aura: +1 ATK.",unique:true}, // ward убран (2026-07-22, по прямому запросу автора — untamed+armor+ward+aura стакал слишком много защиты разом)
  // FAERON — Fire Shield — тег состоит из ДВУХ парных частей, оба нужны на карте разом
  // (уточнено автором 2026-07-19): 'thorns:N' (защитная часть — урон атакующему при
  // получении удара, см. doAttack() в game.js) + 'atk_vs_burning:N' (наступательная часть —
  // сама карта наносит +N атаки, если ЕЁ цель уже горит). Если в будущем захочешь дать
  // Fire Shield ещё одной карте — вешай ОБА тега вместе, не только thorns.
  t_faeron:    {name:"FAERON",     cost:5,hp:8,atk:2,art:"🔥", img:"010_Faeron.png",   f:"tea",tags:["unique","burn","thorns:2","untamed","atk_vs_burning:1","enter_aoe:1"], ab:"On play AOE 1. \“Yet another one burned.\”",unique:true},
  t_nab:       {name:"NABUNAGI",   cost:8,hp:13,atk:3,art:"⛩️", img:"009_Oda.png",     f:"tea",tags:["unique","bushido","armor:1"], ab:"\"Bushido\": All attacks must target him.",unique:true}, // ward убран (2026-07-22, по прямому запросу автора — bushido+armor+ward стакал тройную защиту, теперь спелл/AOE-урон снова его достаёт)


  // ── TEA SPELLS ──────────────────────────────────────────────────
  // ARCHIVE/FRENZY нерф (2026-07-21 вечер, по прямому запросу автора, на данных
  // sim-прогона 1000 партий: FRENZY 63.7% winrate-when-played — топ-3 спелл Jeet;
  // перманентный до смерти существа +2 ATK за 3 оказался слишком дешёвым свингом):
  // +2 ATK → +1 ATK, цена 3 → 2. Оба зеркала правятся вместе — эффект и цена
  // остаются симметричными. aiScoreCard() читает величину через getTagVal — правок ИИ
  // не требуется.
  t_sp1:       {name:"ARCHIVE",     cost:2,hp:0,atk:0,art:"📜", img:"1_Archive.png", f:"tea",tags:["spell","spell_buff_temp:1"],     ab:"Target ally: +1 ATK until end of battle.",spell:true},
  t_sp2:       {name:"JOURNEY",     cost:3,hp:0,atk:0,art:"🌌", img:"1_Journey.png", f:"tea",tags:["spell","spell_dmg_target:3"],     ab:"Bolt 3.",spell:true},
  t_sp3:       {name:"SHEN'S CALL", cost:3,hp:0,atk:0,art:"✨", img:"1_Shen.png",    f:"tea",tags:["spell","revive:full"],ab:"Revive top creature from your graveyard.",spell:true},
  t_sp4:       {name:"SCHEME",      cost:0,hp:0,atk:0,art:"🗺️", img:"1_Sheme.png",   f:"tea",tags:["spell","ess_add:1"], ab:"Get 1 essence.",spell:true},
  t_sp5:       {name:"GUST",        cost:2,hp:0,atk:0,art:"💨", img:"1_windy.png",   f:"tea",tags:["spell","spell_bounce_target"], ab:"Return 1 target creature.",spell:true},
  t_sp6:       {name:"RECKONING",   cost:4,hp:0,atk:0,art:"⚖️", img:"1_Reckoning.png", f:"tea",tags:["spell","spell_aoe_count"], ab:"AOE equal to how many creatures are on the battleground.",spell:true},
  t_sp7:       {name:"FORGET-ME-NOT", cost:4,hp:0,atk:0,art:"🥀", img:"1_ForgetMeNot.png", f:"tea",tags:["spell","lose:2"], ab:"Lose 2.",spell:true},
  t_sp8:       {name:"EXPOSE",     cost:1,hp:0,atk:0,art:"👁️", img:"1_Expose.png", f:"tea",tags:["spell","spell_provoke_break_target"], ab:"Taunt Breake to enemy Provoke creature.",spell:true},
  t_sp9:       {name:"BREACH",     cost:5,hp:0,atk:0,art:"💥", img:"1_Breach.png", f:"tea",tags:["spell","spell_dmg_trample_target:5"], ab:"Bolt 5. If creature dies, overkill damage carries over to the enemy base.",spell:true},
  t_sp10:      {name:"WILDFIRE",  cost:5,hp:0,atk:0,art:"🔥", img:"1_Wildfire.png", f:"tea",tags:["spell","spell_burn_all"], ab:"All enemy creatures are Burned.",spell:true},
  t_sp11:      {name:"REKINDLE",   cost:2,hp:0,atk:0,art:"🕯️", img:"1_Rekindle.png", f:"tea",tags:["spell","spell_untap"], ab:"Target ally creature becomes active.",spell:true},
  t_sp12:      {name:"BULWARK",    cost:2,hp:0,atk:0,art:"🛡️", img:"1_Bulwark.png", f:"tea",tags:["spell","spell_armor_temp:1"], ab:"Target ally: +1 Armor until end of battle.",spell:true},
  t_sp13:      {name:"INSIGHT",    cost:2,hp:0,atk:0,art:"🔮", img:"1_Insight.png", f:"tea",tags:["spell","draw:2"], ab:"Draw 2.",spell:true},
  t_sp14:      {name:"GLIMPSE",    cost:1,hp:0,atk:0,art:"✨", img:"1_Glimpse.png", f:"tea",tags:["spell","draw:1"], ab:"Draw 1.",spell:true},
  t_sp15:      {name:"SPARK",      cost:2,hp:0,atk:0,art:"⚡", img:"1_Spark.png", f:"tea",tags:["spell","spell_dmg_target:2"], ab:"Bolt 2.",spell:true},

  // ── TEA WORLDS & ARTIFACTS ──────────────────────────────────────
  t_w1:        {name:"VALLEY",     cost:4,hp:0,atk:0,art:"", img:"1_Valley.png", f:"tea",tags:["world","on_enemy_death:1"],       ab:"When an enemy creature dies: Draw 1.",world:true}, // откат 2026-07-22 (по прямому запросу автора) — версия-копия HUNGER (on_own_death) тестировалась в sim и стала СИЛЬНЕЕ (62.5% против 56.9%), возвращено на оригинальный on_enemy_death
  t_w2:        {name:"DOMUS",      cost:6,hp:0,atk:0,art:"", img:"1_Domus.png",  f:"tea",tags:["world","world_armor:1"],ab:"Aura: +1 Armor.",world:true},
  t_a1:        {name:"THE BOOK",   cost:5,hp:0,atk:0,art:"", img:"1_Book.png",   f:"tea",tags:["artifact","shard:1","shard_burn_scale"],   ab:"Active Bolt 1 (+1 for each currently burning enemy creature).",artifact:true},
  t_a2:        {name:"FOUNTAIN", cost:4,hp:0,atk:0,art:"", img:"1_Fontan.png", f:"tea",tags:["artifact","heal:1"],   ab:"On turn Heal 1 all allies.",artifact:true}, // cost 5→4 (2026-07-22, по прямому запросу автора — sim-данные 1000 партий)

  // ── JEET CREATURES ──────────────────────────────────────────────

  // Szarg Jeet
  j_trvl12_w:  {name:"TRAVELER #12",  cost:1,hp:1,atk:2,art:"🦈", img:"12.png",  f:"jeet",tags:["gtype:szg"],                 ab:"Squad +1 maxHP."},
  j_trvl49_w:  {name:"TRAVELER #49",  cost:1,hp:1,atk:2,art:"🦈", img:"49.png",  f:"jeet",tags:["gtype:szg"],                 ab:"Squad +1 maxHP."},
  j_trvl551_w: {name:"TRAVELER #551", cost:3,hp:3,atk:4,art:"🦈", img:"551.png", f:"jeet",tags:["incarnation:4","gtype:szg"],      ab:"Squad +1 maxHP."},
  j_trvl971_w: {name:"TRAVELER #971", cost:1,hp:1,atk:2,art:"🦈", img:"971.png", f:"jeet",tags:["gtype:szg"],      ab:"Squad +1 maxHP."},
  // +1 (2026-07-19, ребаланс кривой под ход 1) — по шаблону #12/#49/#971 выше.
  j_trvl740_w: {name:"TRAVELER #740", cost:1,hp:1,atk:2,art:"🦈", img:"740.png", f:"jeet",tags:["gtype:szg"],      ab:"Squad +1 maxHP."},
  j_trvl434_w:  {name:"TRAVELER #434",  cost:6,hp:6,atk:6,art:"🦈", img:"434.png",  f:"jeet",tags:["fear","incarnation:4","gtype:szg"],            ab:"Squad +1 maxHP."}, // cost 5→6, hp5→6/atk5→6 (2026-07-22, по прямому запросу автора — зеркало переезда #128 у Tea, чинит симметрию кривой 5:1/6:1 обеих фракций)

  // Orbiton Jeet (HP ребаланс 2026-07-20 — см. комментарий у Orbiton Tea выше)
  j_trvl170_w: {name:"TRAVELER #170", cost:1,hp:1,atk:1,art:"👁️", img:"170.png", f:"jeet",tags:["heal:2","gtype:orb"],                  ab:"Active Heal 2 and Clean. Squad Heal 4."},
  j_trvl429_w: {name:"TRAVELER #429", cost:1,hp:1,atk:1,art:"👁️", img:"429.png", f:"jeet",tags:["heal:2","gtype:orb"],                  ab:"Active Heal 2 and Clean. Squad Heal 4."},
  j_trvl454_w: {name:"TRAVELER #454", cost:3,hp:3,atk:1,art:"👁️", img:"454.png", f:"jeet",tags:["heal:2","regen","gtype:orb"],           ab:"Active Heal 2 and Clean. Squad Heal 4."},
  j_trvl523_w: {name:"TRAVELER #523", cost:3,hp:3,atk:1,art:"👁️", img:"523.png", f:"jeet",tags:["heal:2","fear","gtype:orb"],            ab:"Active Heal 2 and Clean. Squad Heal 4."},

  // Dreegan Jeet
  j_trvl36_w:   {name:"TRAVELER #36",   cost:3,hp:6,atk:1,art:"🌳", img:"36.png",   f:"jeet",tags:["provoke","untamed","gtype:drg"],               ab:"Squad +1 Armor."},
  j_trvl41_w:   {name:"TRAVELER #41",   cost:2,hp:4,atk:1,art:"🌳", img:"41.png",   f:"jeet",tags:["provoke","gtype:drg"],               ab:"Squad +1 Armor."},
  j_trvl1015_w: {name:"TRAVELER #1015", cost:4,hp:8,atk:1,art:"🌳", img:"1015.png", f:"jeet",tags:["provoke","regen","vanguard","gtype:drg"],        ab:"Squad +1 Armor."},
  j_trvl859_w:  {name:"TRAVELER #859",  cost:5,hp:10,atk:2,art:"🌳", img:"859.png",  f:"jeet",tags:["provoke","fear","vanguard","gtype:drg"],ab:"Squad +1 Armor."},
  j_trvl775_w:  {name:"TRAVELER #775",  cost:3,hp:6,atk:1,art:"🌳", img:"775.png",  f:"jeet",tags:["provoke","vampiric","gtype:drg"],ab:"Squad +1 Armor."},

  // Umbasir Jeet (HP ребаланс 2026-07-20 — см. комментарий у Orbiton Tea выше)
    j_trvl550_w:    {name:"TRAVELER #550",  cost:4,hp:4,atk:1,art:"🌀", img:"550.png",  f:"jeet",tags:["bolt:1","fear","taunt_break","gtype:umb"],           ab:"Active Bolt 1. Squad Bolt 2."},
     j_trvl53_w:    {name:"TRAVELER #53",   cost:3,hp:3,atk:1,art:"🌀", img:"53.png",   f:"jeet",tags:["bolt:1","enter_lose:1","gtype:umb"],                  ab:"On play Lose 1. Active Bolt 1. Squad Bolt 2."},
     j_trvl54_w:    {name:"TRAVELER #54",   cost:1,hp:1,atk:1,art:"🌀", img:"54.png",   f:"jeet",tags:["bolt:1","gtype:umb"],                  ab:"Active Bolt 1. Squad Bolt 2."},
     j_trvl934_w:   {name:"TRAVELER #934",  cost:2,hp:2,atk:1,art:"🌀", img:"934.png",  f:"jeet",tags:["bolt:1","gtype:umb"],                  ab:"Active Bolt 1. Squad Bolt 2."},
     j_trvl20_w:    {name:"TRAVELER #20",   cost:4,hp:4,atk:1,art:"🌀", img:"20.png",   f:"jeet",tags:["bolt:1","vanguard","untamed","gtype:umb"],        ab:"Active Bolt 1. Squad Bolt 2."},
     j_trvl248_w:   {name:"TRAVELER #248",  cost:5,hp:5,atk:2,art:"🌀", img:"248.png",  f:"jeet",tags:["bolt:1","shield","ward","gtype:umb"],        ab:"Active Bolt 1. Squad Bolt 2."},

  // Mechird Jeet (ребаланс 2026-07-20 — см. комментарий у Mechird Tea выше)
  j_trvl22_w:   {name:"TRAVELER #22",   cost:3,hp:3,atk:2,art:"🤖", img:"22.png",   f:"jeet",tags:["pierce","untamed","gtype:mch"],                 ab:"Squad +1 ATK."},
  j_trvl724_w:  {name:"TRAVELER #724",  cost:2,hp:2,atk:1,art:"🤖", img:"724.png",  f:"jeet",tags:["pierce","gtype:mch"],                 ab:"Squad +1 ATK."},
  j_trvl804_w:  {name:"TRAVELER #804",  cost:3,hp:3,atk:2,art:"🤖", img:"804.png",  f:"jeet",tags:["pierce","regen","gtype:mch"],          ab:"Squad +1 ATK."},
  j_trvl663_w:  {name:"TRAVELER #663",  cost:4,hp:4,atk:3,art:"🤖", img:"663.png",  f:"jeet",tags:["pierce","fear","enter_heal:2","gtype:mch"],          ab:"On play Heal 2 all allies. Squad +1 ATK."},
  j_trvl320_w:  {name:"TRAVELER #320",  cost:4,hp:4,atk:3,art:"🤖", img:"320.png",  f:"jeet",tags:["pierce","necrophage","untamed","gtype:mch"],          ab:"Squad +1 ATK."},

  // Xuiqtr Jeet (ребаланс 2026-07-20 — см. комментарий у Xuiqtr Tea выше)
    j_trvl579_w:    {name:"TRAVELER #579",  cost:3,hp:5,atk:2,art:"🐙", img:"579.png",  f:"jeet",tags:["intercept","fear","gtype:xui"],          ab:"Squad +1 ATK."},
     j_trvl50_w:    {name:"TRAVELER #50",   cost:2,hp:3,atk:1,art:"🐙", img:"50.png",   f:"jeet",tags:["intercept","gtype:xui"],                 ab:"Squad +1 ATK."},
     j_trvl37_w:    {name:"TRAVELER #37",   cost:2,hp:3,atk:1,art:"🐙", img:"37.png",   f:"jeet",tags:["intercept","gtype:xui"],                 ab:"Squad +1 ATK."},
     j_trvl720_w:   {name:"TRAVELER #720",  cost:3,hp:5,atk:2,art:"🐙", img:"720.png",  f:"jeet",tags:["intercept","draw_attack:1","gtype:xui"],                 ab:"On attack Draw 1. Squad +1 ATK."},
     j_trvl951_w:   {name:"TRAVELER #951",  cost:3,hp:5,atk:2,art:"🐙", img:"951.png",  f:"jeet",tags:["intercept","regen","gtype:xui"],                 ab:"Squad +1 ATK."},
     j_trvl704_w:    {name:"TRAVELER #704",  cost:5,hp:8,atk:3,art:"🐙", img:"704.png",  f:"jeet",tags:["intercept","fear","shield","gtype:xui"],             ab:"Squad +1 ATK."},

  // ── JEET LEGENDARIES ────────────────────────────────────────────
  // Ребаланс 2026-07-19 — см. подробный комментарий у TEA LEGENDARIES выше, тот же принцип.
  j_reap:      {name:"REAPER",      cost:7,hp:11,atk:3,art:"☠️", img:"004_Reaper.png",      f:"jeet",tags:["unique","on_enemy_death_base:1","enter_aoe:1"],        ab:"On play AOE 1. Enemy creature death: restore base 1 HP.",unique:true},
  j_ryv:       {name:"RYVLEN",      cost:6,hp:9,atk:3,art:"🎭", img:"007_Ryvlen.png",      f:"jeet",tags:["unique","draw_attack:1","enter_lose:1"],        ab:"On play Lose 1. On attack Draw 1.",unique:true}, 
  j_mal:       {name:"ABYSSWALKER", cost:6,hp:10,atk:3,art:"🗡️", img:"001_Abysswalker.png", f:"jeet",tags:["unique","aura:atk:1","armor:1"],          ab:"Aura: +1 ATK.",unique:true}, 
  j_phleg:     {name:"PHLEGMOR",    cost:8,hp:13,atk:3,art:"💀", img:"005_Phelgmor.png",    f:"jeet",tags:["unique","raise:1","incarnation:3","regen:2"],                     ab:"On turn \"Necromancy\": Revive top graveyard card at 1 HP.",unique:true},
  j_vard:      {name:"SEEKER",      cost:5,hp:8,atk:2,art:"🌑", img:"003_Seeker.png",      f:"jeet",tags:["unique","invisible","fear"],    ab:"\"Seek, and ye shall find.\"",unique:true}, 

  // ── JEET SPELLS ─────────────────────────────────────────────────
  j_sp1:       {name:"JEET WAVE",  cost:2,hp:0,atk:0,art:"🌊", img:"1_Wave.png",      f:"jeet",tags:["spell","draw:2"],     ab:"Draw 2.",spell:true},
  j_sp2:       {name:"OBLIVION",   cost:2,hp:0,atk:0,art:"🌀", img:"1_Oblivion.png",  f:"jeet",tags:["spell","spell_untap"],     ab:"Target ally creature becomes active.",spell:true},
  j_sp3:       {name:"FORGETTING", cost:3,hp:0,atk:0,art:"🖤", img:"1_Forgetting.png",f:"jeet",tags:["spell","revive:full"],ab:"Revive top creature from your graveyard.",spell:true},
  j_sp4:       {name:"BLACK MAGIC",cost:0,hp:0,atk:0,art:"⚫", img:"1_Spell1.png",    f:"jeet",tags:["spell","ess_add:1"], ab:"Get 1 essence.",spell:true},
  j_sp5:       {name:"REVERSE",    cost:2,hp:0,atk:0,art:"🔄", img:"1_revers.png",    f:"jeet",tags:["spell","spell_bounce_target"], ab:"Return 1 target creature.",spell:true},
  j_sp6:       {name:"SWARM CULL", cost:4,hp:0,atk:0,art:"🩸", img:"1_SwarmCull.png", f:"jeet",tags:["spell","spell_aoe_count"], ab:"AOE equal to how many creatures are on the battleground.",spell:true},
  j_sp7:       {name:"MINDROT",    cost:4,hp:0,atk:0,art:"🧠", img:"1_Mindrot.png", f:"jeet",tags:["spell","lose:2"], ab:"Lose 2.",spell:true},
  j_sp8:       {name:"UNMASK",     cost:1,hp:0,atk:0,art:"🎭", img:"1_Unmask.png", f:"jeet",tags:["spell","spell_provoke_break_target"], ab:"Taunt Breake to enemy Provoke creature.",spell:true},
  j_sp9:       {name:"RUPTURE",    cost:5,hp:0,atk:0,art:"🗡️", img:"1_Rupture.png", f:"jeet",tags:["spell","spell_dmg_trample_target:5"], ab:"Bolt 5. If creature dies, overkill damage carries over to the enemy base.",spell:true},
  j_sp10:      {name:"NIGHTMARE",  cost:5,hp:0,atk:0,art:"👹", img:"1_Nightmare.png", f:"jeet",tags:["spell","spell_fear_all"], ab:"All enemy creatures are Feared.",spell:true},
  j_sp11:      {name:"FRENZY",     cost:2,hp:0,atk:0,art:"😤", img:"1_Frenzy.png", f:"jeet",tags:["spell","spell_buff_temp:1"], ab:"Target ally: +1 ATK until end of battle.",spell:true}, // нерф 2026-07-21 — см. ARCHIVE (t_sp1) выше, зеркально
  j_sp12:      {name:"CARAPACE",   cost:2,hp:0,atk:0,art:"🪲", img:"1_Carapace.png", f:"jeet",tags:["spell","spell_armor_temp:1"], ab:"Target ally: +1 Armor until end of battle.",spell:true},
  j_sp13:      {name:"HEX",        cost:3,hp:0,atk:0,art:"💀", img:"1_Hex.png", f:"jeet",tags:["spell","spell_dmg_target:3"], ab:"Bolt 3.",spell:true},
  j_sp14:      {name:"OMEN",       cost:1,hp:0,atk:0,art:"🌑", img:"1_Omen.png", f:"jeet",tags:["spell","draw:1"], ab:"Draw 1.",spell:true},
  j_sp15:      {name:"MALICE",     cost:2,hp:0,atk:0,art:"⚔️", img:"1_Malice.png", f:"jeet",tags:["spell","spell_dmg_target:2"], ab:"Bolt 2.",spell:true},

  // ── JEET WORLDS & ARTIFACTS ─────────────────────────────────────
  j_w1:        {name:"HUNGER", cost:4,hp:0,atk:0,art:"", img:"1_Hunger.png", f:"jeet",tags:["world","on_own_death:1"], ab:"When your creature dies: Draw 1.",world:true},
  j_w2:        {name:"NORRIA", cost:6,hp:0,atk:0,art:"", img:"1_Norria.png", f:"jeet",tags:["world","world_armor:1"],     ab:"Aura: +1 Armor.",world:true},
  j_a1:        {name:"SHARD",  cost:5,hp:0,atk:0,art:"", img:"1_Shard.png",  f:"jeet",tags:["artifact","shard:1","shard_fear_scale"],     ab:"Active Bolt 1 (+1 for each currently Feared enemy creature).",artifact:true},
  j_a2:        {name:"ALTAR",  cost:4,hp:0,atk:0,art:"", img:"1_Altar.png",  f:"jeet",tags:["artifact","sacrifice"],   ab:"Sacrifice: Get 1 essence and Draw 1.",artifact:true}, // cost 5→4 (2026-07-22, по прямому запросу автора — была слабейшей в sim, 42.5%)

  // ── NEUTRAL ─────────────────────────────────────────────────────
  // UNSEEN — 2026-07-21: больше НЕ выдаётся вторым игроком (см. grantUnseenBonus() в ui.js —
  // теперь там фракционные SCHEME/BLACK MAGIC). Цена поднята 0→6: полный масс-баунс обеих
  // сторон — эффект уровня дорогого нейтрального спелла, а не бесплатной стартовой карты.
  // В деках его пока нет вообще (не входит ни в один список deck.js) — живёт в каталоге.
  unseen:      {name:"UNSEEN", cost:6,hp:0,atk:0,art:"👁️", img:"113_Unseen.png", f:"jeet",tags:["spell","bounce"], ab:"Return All creatures.",spell:true,fullArt:true,neutral:true},
};

// ── Ability-text formatting helper ──────────────────────────────────────
// Заменяет литеральные префиксы "On play"/"On turn"/"On attack"/"Active"/
// "Squad" в тексте способности карты (card.ab) на иконку — компактнее и
// нагляднее на маленькой карте, чем слово целиком. Двоеточие после этих слов
// убрано из самих текстов карт (2026-07-20, по прямому запросу автора) — иконка
// теперь сама по себе маркер, доп. пунктуация не нужна, поэтому паттерны ниже
// матчат слово БЕЗ хвостового ":" и не дописывают его обратно.
// On play/On turn/On attack встречаются РОВНО один раз и СТРОГО в самом начале
// строки (см. data.js) — ^-якорь без /g достаточен.
// Active/Squad встречаются ЧАЩЕ ОДНОГО РАЗА в одной строке (например у карт с
// префиксом "On play ...") и не обязательно в начале — но, проверено по всему
// data.js (2026-07-18), ВСЕГДА либо в самом начале строки, либо сразу после
// ". " (т.е. начинают новое "предложение" внутри ab) — поэтому паттерн
// (^|\. ) с /g покрывает все случаи, находя каждое вхождение и сохраняя
// префикс (пустую строку или ". ") перед иконкой через $1.
// ВАЖНО: регекс требует после слова ПРОБЕЛ или конец строки (\b(?=\s|$)) —
// это защищает от случайного совпадения с "Active"/"Squad" как частью другого
// слова, но, что важнее здесь, работает именно на "слово без двоеточия" не
// зацепляя более никакой соседний текст, раз двоеточия в самих текстах карт
// больше нет.
// ВАЖНО: применять эту функцию только там, где card.ab вставляется как HTML
// (innerHTML) — например .card-ability в render.js/catalog.js/deckbuilder.js.
// НЕ применять в plain-text контекстах (например title="" у .pcard в
// render.js) — там HTML-теги не рендерятся браузером, картинка не появится,
// останется как есть буквенный текст.
function formatAbilityText(ab){
  if(!ab) return '';
  return ab
    .replace(/^On play\b:?/, '<img src="img/ico_on_play.png" class="ab-icon-trigger" alt="On play">')
    .replace(/^On turn\b:?/, '<img src="img/ico_on_turn.png" class="ab-icon-trigger" alt="On turn">')
    .replace(/^On attack\b:?/, '<img src="img/ico_on_attack.png" class="ab-icon-trigger" alt="On attack">')
    .replace(/(^|\. )Active\b:?/g, '$1<img src="img/ico_active.png" class="ab-icon-trigger" alt="Active">')
    .replace(/(^|\. )Squad\b:?/g, '$1<img src="img/ico_squad.png" class="ab-icon-trigger" alt="Squad">');
}
