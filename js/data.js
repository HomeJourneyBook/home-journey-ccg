// Bump this whenever card data (DEFS) or game mechanics change in a way that
// could make an older saved Rush-deck JSON (js/deckbuilder.js) or battle log
// no longer match reality — e.g. a card renamed/removed/rebalanced. Read by
// dbExportDeck()/_applyImportedDeck() (deck JSON) and downloadBattleLog()
// (ui.js), so old exports can be flagged instead of silently misapplied.
const GAME_VERSION = "1.0";

const DEFS = {
  // ── TEA CREATURES ───────────────────────────────────────────────

  // Szarg Tea
  t_trvl25_w:   {name:"TRAVELER #25",   cost:2,hp:2,atk:3,art:"🦈", img:"25.png",   f:"tea",tags:["untamed","gtype:szg"],                  ab:"Squad: +1 maxHP."},
  t_trvl33_w:   {name:"TRAVELER #33",   cost:1,hp:1,atk:2,art:"🦈", img:"33.png",   f:"tea",tags:["gtype:szg"],                  ab:"Squad: +1 maxHP."},
  t_trvl34_w:   {name:"TRAVELER #34",   cost:2,hp:2,atk:3,art:"🦈", img:"34.png",   f:"tea",tags:["regen","gtype:szg"],           ab:"Squad: +1 maxHP."},
  t_trvl434_w:  {name:"TRAVELER #434",  cost:3,hp:2,atk:4,art:"🦈", img:"434.png",  f:"tea",tags:["fear","incarnation:4","gtype:szg"],            ab:"Squad: +1 maxHP."},

  // Orbiton Tea
  t_trvl10_w:   {name:"TRAVELER #10",   cost:2,hp:2,atk:1,art:"👁️", img:"10.png",   f:"tea",tags:["heal:1","burn","gtype:orb"],             ab:"Active: Heal 1 HP. Squad: Heal 2."},
  t_trvl398_w:  {name:"TRAVELER #398",  cost:3,hp:2,atk:1,art:"👁️", img:"398.png",  f:"tea",tags:["heal:1","vanguard","untamed","armor:1","gtype:orb"],         ab:"Active: Heal 1 HP. Squad: Heal 2."},
  t_trvl433_w:  {name:"TRAVELER #433",  cost:1,hp:1,atk:1,art:"👁️", img:"433.png",  f:"tea",tags:["heal:1","gtype:orb"],                   ab:"Active: Heal 1 HP. Squad: Heal 2."},
  t_trvl1034_w: {name:"TRAVELER #1034", cost:1,hp:1,atk:1,art:"👁️", img:"1034.png", f:"tea",tags:["heal:1","gtype:orb"],                   ab:"Active: Heal 1 HP. Squad: Heal 2."},

  // Dreegan Tea
  t_trvl1_w:    {name:"TRAVELER #1",    cost:2,hp:3,atk:1,art:"🌳", img:"1.png",    f:"tea",tags:["provoke","gtype:drg"],                   ab:"Squad: +1 Armor."},
  t_trvl31_w:   {name:"TRAVELER #31",   cost:3,hp:4,atk:1,art:"🌳", img:"31.png",   f:"tea",tags:["provoke","burn","gtype:drg"],             ab:"Squad: +1 Armor."},
  t_trvl892_w:  {name:"TRAVELER #892",  cost:3,hp:5,atk:1,art:"🌳", img:"892.png",  f:"tea",tags:["provoke","regen","gtype:drg"],            ab:"Squad: +1 Armor."},
  t_trvl14_w:   {name:"TRAVELER #14",   cost:2,hp:3,atk:1,art:"🌳", img:"14.png",   f:"tea",tags:["provoke","gtype:drg"],                   ab:"Squad: +1 Armor."},

  // Umbasir Tea
    t_trvl583_w:    {name:"TRAVELER #583",  cost:2,hp:2,atk:1,art:"🌀", img:"583.png",  f:"tea",tags:["bolt:1","regen","gtype:umb"],              ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
      t_trvl2_w:    {name:"TRAVELER #2",    cost:2,hp:2,atk:1,art:"🌀", img:"2.png",    f:"tea",tags:["bolt:1","untamed","gtype:umb"],                     ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
     t_trvl52_w:    {name:"TRAVELER #52",   cost:1,hp:1,atk:0,art:"🌀", img:"52.png",   f:"tea",tags:["bolt:1","gtype:umb"],                     ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
      t_trvl6_w:    {name:"TRAVELER #6",    cost:1,hp:1,atk:0,art:"🌀", img:"6.png",    f:"tea",tags:["bolt:1","gtype:umb"],                     ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},

  // Mechird Tea
  t_trvl38_w:   {name:"TRAVELER #38",   cost:3,hp:3,atk:2,art:"🤖", img:"38.png",   f:"tea",tags:["pierce","rage","gtype:mch"],              ab:"Squad: +1 ATK."},
  t_trvl18_w:   {name:"TRAVELER #18",   cost:2,hp:2,atk:2,art:"🤖", img:"18.png",   f:"tea",tags:["pierce","gtype:mch"],                    ab:"Squad: +1 ATK."},
  t_trvl35_w:   {name:"TRAVELER #35",   cost:2,hp:2,atk:2,art:"🤖", img:"35.png",   f:"tea",tags:["pierce","gtype:mch"],                    ab:"Squad: +1 ATK."},
  t_trvl11_w:   {name:"TRAVELER #11",   cost:2,hp:2,atk:2,art:"🤖", img:"11.png",   f:"tea",tags:["pierce","gtype:mch"],                    ab:"Squad: +1 ATK."},

  // Xuiqtr Tea
    t_trvl187_w:    {name:"TRAVELER #187",  cost:4,hp:5,atk:3,art:"🐙", img:"187.png",  f:"tea",tags:["provoke","untamed","gtype:xui"],                   ab:"Squad: +1 ATK."},
    t_trvl704_w:    {name:"TRAVELER #704",  cost:4,hp:4,atk:3,art:"🐙", img:"704.png",  f:"tea",tags:["provoke","fear","gtype:xui"],             ab:"Squad: +1 ATK."},
     t_trvl26_w:    {name:"TRAVELER #26",   cost:2,hp:2,atk:2,art:"🐙", img:"26.png",   f:"tea",tags:["provoke","gtype:xui"],            ab:"Squad: +1 ATK."},
     t_trvl39_w:    {name:"TRAVELER #39",   cost:2,hp:2,atk:2,art:"🐙", img:"39.png",   f:"tea",tags:["provoke","gtype:xui"],                   ab:"Squad: +1 ATK."},

  // ── TEA LEGENDARIES ─────────────────────────────────────────────
  t_tean:      {name:"TEANTIST",   cost:4,hp:4,atk:1,art:"🧙", img:"002_Teantist.png", f:"tea",tags:["unique","draw:1"],            ab:"On turn: Draw 1 card.",unique:true},
  t_aslex:     {name:"ASLEX",      cost:5,hp:6,atk:1,art:"🍵", img:"008_Aslex.png",    f:"tea",tags:["unique","aura:maxhp:1"],      ab:"Aura: +1 maxHP.",unique:true},
  t_tuborg:    {name:"TUBORG",     cost:5,hp:6,atk:2,art:"👑", img:"011_Tuborg.png",   f:"tea",tags:["unique","aura:atk:1","untamed"],       ab:"Aura: +1 ATK.",unique:true},
  t_faeron:    {name:"FAERON",     cost:4,hp:4,atk:2,art:"🔥", img:"010_Faeron.png",   f:"tea",tags:["unique","burn","on_play_creature:1","untamed"], ab:"Each On play: Heal base 1 HP.",unique:true},
  t_nab:       {name:"NABUNAGI",   cost:6,hp:6,atk:2,art:"⛩️", img:"009_Oda.png",     f:"tea",tags:["unique","bushido","armor:2","ward"], ab:"Bushido: ALL attacks must target him. Ward.",unique:true},

  // ── TEA SPELLS ──────────────────────────────────────────────────
  t_sp1:       {name:"ARCHIVE",     cost:2,hp:0,atk:0,art:"📜", img:"1_Archive.png", f:"tea",tags:["spell","spell_buff_temp:2"],     ab:"Target ally: +2 ATK until end of turn.",spell:true},
  t_sp2:       {name:"JOURNEY",     cost:3,hp:0,atk:0,art:"🌌", img:"1_Journey.png", f:"tea",tags:["spell","spell_dmg_target:3"],     ab:"Deal 3 damage to target enemy creature.",spell:true},
  t_sp3:       {name:"SHEN'S CALL", cost:3,hp:0,atk:0,art:"✨", img:"1_Shen.png",    f:"tea",tags:["spell","revive:full"],ab:"Revive last creature from your graveyard.",spell:true},
  t_sp4:       {name:"SCHEME",      cost:1,hp:0,atk:0,art:"🗺️", img:"1_Sheme.png",   f:"tea",tags:["spell","ess_add:2"], ab:"Get 2 essence.",spell:true},

  // ── TEA WORLDS & ARTIFACTS ──────────────────────────────────────
  t_w1:        {name:"VALLEY",     cost:4,hp:0,atk:0,art:"", img:"1_Valley.png", f:"tea",tags:["world","draw:1"],       ab:"On turn: Draw 1.",world:true},
  t_w2:        {name:"DOMUS",      cost:4,hp:0,atk:0,art:"", img:"1_Domus.png",  f:"tea",tags:["world","world_maxhp:1"],ab:"Aura: +1 maxHP.",world:true},
  t_a1:        {name:"THE BOOK",   cost:4,hp:0,atk:0,art:"", img:"1_Book.png",   f:"tea",tags:["artifact","ess_add:1"],   ab:"On turn: +1 Essence (this turn only).",artifact:true},
  t_a2:        {name:"FOUNTAIN", cost:4,hp:0,atk:0,art:"", img:"1_Fontan.png", f:"tea",tags:["artifact","heal:1"],   ab:"On turn: Restore all allies 1 HP.",artifact:true},

  // ── JEET CREATURES ──────────────────────────────────────────────

  // Szarg Jeet
  j_trvl12_w:  {name:"TRAVELER #12",  cost:1,hp:1,atk:2,art:"🦈", img:"12.png",  f:"jeet",tags:["gtype:szg"],                 ab:"Squad: +1 maxHP."},
  j_trvl49_w:  {name:"TRAVELER #49",  cost:1,hp:1,atk:2,art:"🦈", img:"49.png",  f:"jeet",tags:["gtype:szg"],                 ab:"Squad: +1 maxHP."},
  j_trvl57_w:  {name:"TRAVELER #57",  cost:2,hp:2,atk:2,art:"🦈", img:"57.png",  f:"jeet",tags:["burn","gtype:szg"],           ab:"Squad: +1 maxHP."},
  j_trvl551_w: {name:"TRAVELER #551", cost:2,hp:2,atk:3,art:"🦈", img:"551.png", f:"jeet",tags:["incarnation:4","gtype:szg"],      ab:"Squad: +1 maxHP."},

  // Orbiton Jeet
  j_trvl170_w: {name:"TRAVELER #170", cost:1,hp:1,atk:1,art:"👁️", img:"170.png", f:"jeet",tags:["heal:1","gtype:orb"],                  ab:"Active: Heal 1 HP. Squad: Heal 2."},
  j_trvl429_w: {name:"TRAVELER #429", cost:1,hp:1,atk:1,art:"👁️", img:"429.png", f:"jeet",tags:["heal:1","gtype:orb"],                  ab:"Active: Heal 1 HP. Squad: Heal 2."},
  j_trvl454_w: {name:"TRAVELER #454", cost:2,hp:2,atk:2,art:"👁️", img:"454.png", f:"jeet",tags:["heal:1","regen","gtype:orb"],           ab:"Active: Heal 1 HP. Squad: Heal 2."},
  j_trvl523_w: {name:"TRAVELER #523", cost:2,hp:2,atk:1,art:"👁️", img:"523.png", f:"jeet",tags:["heal:1","fear","gtype:orb"],            ab:"Active: Heal 1 HP. Squad: Heal 2."},

  // Dreegan Jeet
  j_trvl36_w:   {name:"TRAVELER #36",   cost:3,hp:4,atk:2,art:"🌳", img:"36.png",   f:"jeet",tags:["provoke","untamed","gtype:drg"],               ab:"Squad: +1 Armor."},
  j_trvl41_w:   {name:"TRAVELER #41",   cost:2,hp:3,atk:1,art:"🌳", img:"41.png",   f:"jeet",tags:["provoke","gtype:drg"],               ab:"Squad: +1 Armor."},
  j_trvl1015_w: {name:"TRAVELER #1015", cost:3,hp:4,atk:2,art:"🌳", img:"1015.png", f:"jeet",tags:["provoke","regen","gtype:drg"],        ab:"Squad: +1 Armor."},
  j_trvl859_w:  {name:"TRAVELER #859",  cost:4,hp:5,atk:1,art:"🌳", img:"859.png",  f:"jeet",tags:["provoke","fear","vanguard","gtype:drg"],ab:"Squad: +1 Armor."},

  // Umbasir Jeet
    j_trvl550_w:    {name:"TRAVELER #550",  cost:2,hp:2,atk:1,art:"🌀", img:"550.png",  f:"jeet",tags:["bolt:1","fear","gtype:umb"],           ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
     j_trvl53_w:    {name:"TRAVELER #53",   cost:2,hp:1,atk:1,art:"🌀", img:"53.png",   f:"jeet",tags:["bolt:1","invisible","gtype:umb"],                  ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
     j_trvl54_w:    {name:"TRAVELER #54",   cost:1,hp:1,atk:0,art:"🌀", img:"54.png",   f:"jeet",tags:["bolt:1","gtype:umb"],                  ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},
     j_trvl20_w:    {name:"TRAVELER #20",   cost:3,hp:3,atk:2,art:"🌀", img:"20.png",   f:"jeet",tags:["bolt:1","vanguard","untamed","gtype:umb"],        ab:"Active: Bolt 1 dmg. Squad: Bolt 2 dmg."},

  // Mechird Jeet
  j_trvl22_w:   {name:"TRAVELER #22",   cost:3,hp:3,atk:3,art:"🤖", img:"22.png",   f:"jeet",tags:["pierce","untamed","gtype:mch"],                 ab:"Squad: +1 ATK."},
  j_trvl724_w:  {name:"TRAVELER #724",  cost:2,hp:2,atk:2,art:"🤖", img:"724.png",  f:"jeet",tags:["pierce","gtype:mch"],                 ab:"Squad: +1 ATK."},
  j_trvl921_w:  {name:"TRAVELER #921",  cost:3,hp:3,atk:2,art:"🤖", img:"921.png",  f:"jeet",tags:["pierce","burn","gtype:mch"],           ab:"Squad: +1 ATK."},
  j_trvl804_w:  {name:"TRAVELER #804",  cost:3,hp:3,atk:3,art:"🤖", img:"804.png",  f:"jeet",tags:["pierce","regen","gtype:mch"],          ab:"Squad: +1 ATK."},

  // Xuiqtr Jeet
    j_trvl579_w:    {name:"TRAVELER #579",  cost:4,hp:4,atk:3,art:"🐙", img:"579.png",  f:"jeet",tags:["provoke","fear","gtype:xui"],          ab:"Squad: +1 ATK."},
    j_trvl972_w:    {name:"TRAVELER #972",  cost:4,hp:4,atk:3,art:"🐙", img:"972.png",  f:"jeet",tags:["provoke","burn","gtype:xui"],          ab:"Squad: +1 ATK."},
     j_trvl50_w:    {name:"TRAVELER #50",   cost:2,hp:2,atk:2,art:"🐙", img:"50.png",   f:"jeet",tags:["provoke","gtype:xui"],                 ab:"Squad: +1 ATK."},
     j_trvl37_w:    {name:"TRAVELER #37",   cost:2,hp:2,atk:2,art:"🐙", img:"37.png",   f:"jeet",tags:["provoke","gtype:xui"],                 ab:"Squad: +1 ATK."},

  // ── JEET LEGENDARIES ────────────────────────────────────────────
  j_reap:      {name:"REAPER",      cost:5,hp:6,atk:3,art:"☠️", img:"004_Reaper.png",      f:"jeet",tags:["unique","on_any_death_base:1"],        ab:"Any creature death: restore base 1 HP.",unique:true},
  j_ryv:       {name:"RYVLEN",      cost:4,hp:4,atk:2,art:"🎭", img:"007_Ryvlen.png",      f:"jeet",tags:["unique","fear","draw_attack:1"],        ab:"On attack: Draw 1 card.",unique:true},
  j_mal:       {name:"ABYSSWALKER", cost:5,hp:5,atk:2,art:"🗡️", img:"001_Abysswalker.png", f:"jeet",tags:["unique","armor:2","aura:armor:1"],          ab:"Aura: allies +1 Armor.",unique:true},
  j_phleg:     {name:"PHLEGMOR",    cost:6,hp:7,atk:1,art:"💀", img:"005_Phelgmor.png",    f:"jeet",tags:["unique","raise:1","incarnation:3"],                     ab:"On turn: Raise top graveyard card at 1 HP.",unique:true},
  j_vard:      {name:"SEEKER",      cost:4,hp:4,atk:2,art:"🌑", img:"003_Seeker.png",      f:"jeet",tags:["unique","invisible","pierce"],    ab:"\"Seek, and ye shall find.\"",unique:true},

  // ── JEET SPELLS ─────────────────────────────────────────────────
  j_sp1:       {name:"JEET WAVE",  cost:2,hp:0,atk:0,art:"🌊", img:"1_Wave.png",      f:"jeet",tags:["spell","draw:2"],     ab:"Draw 2 cards.",spell:true},
  j_sp2:       {name:"OBLIVION",   cost:3,hp:0,atk:0,art:"🌀", img:"1_Oblivion.png",  f:"jeet",tags:["spell","spell_untap"],     ab:"Target ally creature becomes active (removes sleeping/exhausted).",spell:true},
  j_sp3:       {name:"FORGETTING", cost:3,hp:0,atk:0,art:"🖤", img:"1_Forgetting.png",f:"jeet",tags:["spell","revive:full"],ab:"Revive last creature from your graveyard.",spell:true},
  j_sp4:       {name:"BLACK MAGIC",cost:1,hp:0,atk:0,art:"⚫", img:"1_Spell1.png",    f:"jeet",tags:["spell","ess_add:2"], ab:"Get 2 essence.",spell:true},

  // ── JEET WORLDS & ARTIFACTS ─────────────────────────────────────
  j_w1:        {name:"HUNGER", cost:4,hp:0,atk:0,art:"", img:"1_Hunger.png", f:"jeet",tags:["world","on_own_death:1"], ab:"When your creature dies: draw 1 card.",world:true},
  j_w2:        {name:"NORRIA", cost:4,hp:0,atk:0,art:"", img:"1_Norria.png", f:"jeet",tags:["world","world_armor:1"],     ab:"Aura: allies +1 Armor.",world:true},
  j_a1:        {name:"SHARD",  cost:5,hp:0,atk:0,art:"", img:"1_Shard.png",  f:"jeet",tags:["artifact","shard:2"],     ab:"Active: deal 2 dmg to any enemy.",artifact:true},
  j_a2:        {name:"ALTAR",  cost:4,hp:0,atk:0,art:"", img:"1_Altar.png",  f:"jeet",tags:["artifact","sacrifice"],   ab:"Active: sacrifice 1 of your creatures, +1 Essence & 1 card.",artifact:true},

  // ── NEUTRAL ─────────────────────────────────────────────────────
  unseen:      {name:"UNSEEN", cost:0,hp:0,atk:0,art:"👁️", img:"113_Unseen.png", f:"jeet",tags:["spell","bounce"], ab:"Return ALL field cards to their owners.",spell:true,fullArt:true,neutral:true},
};
