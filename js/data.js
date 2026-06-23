const DEFS = {
  // TEA CREATURES
  t_szarg_w:   {name:"Szarg",       cost:1,hp:1,atk:2,art:"🦈",f:"tea",tags:["vanguard","gtype:szg"],          ab:""},
  t_orb_w:     {name:"Orbiton",     cost:1,hp:2,atk:1,art:"👁️",f:"tea",tags:["heal:1","gtype:orb"],             ab:"Active: heal ally 1 HP, remove debuffs."},
  t_drig_w:    {name:"Dreegan",     cost:3,hp:4,atk:1,art:"🌳",f:"tea",tags:["provoke","gtype:drg"],            ab:""},
  t_umb_w:     {name:"Umbasir",     cost:2,hp:1,atk:1,art:"🌀",f:"tea",tags:["aoe:1","gtype:umb"],              ab:"Active: deal 1 dmg to ALL enemies."},
  t_meh_w:     {name:"Mechird",     cost:2,hp:2,atk:1,art:"🤖",f:"tea",tags:["pierce","gtype:mch"],             ab:""},
  t_ksi_w:     {name:"Xuitqr",      cost:3,hp:3,atk:1,art:"🐙",f:"tea",tags:["regen:1","gtype:xui"],               ab:""},
  // TEA LEGENDARIES
  t_tean:      {name:"TEANTIST",   cost:4,hp:5,atk:1,art:"🧙",f:"tea",tags:["unique","draw:1"], ab:"Draw 1 extra card each turn.",unique:true},
  t_aslex:     {name:"ASLEX",      cost:5,hp:6,atk:2,art:"🍵",f:"tea",tags:["unique","aura:maxhp:1"], ab:"+1 max HP to all allies while on field.",unique:true},
  t_tuborg:    {name:"TUBORG",     cost:5,hp:6,atk:2,art:"👑",f:"tea",tags:["unique","aura:atk:1"], ab:"+1 ATK to all allies while on field.",unique:true},
  t_faeron:    {name:"FAERON",     cost:4,hp:5,atk:2,art:"🔥",f:"tea",tags:["unique","on_play_creature:1"], ab:"Each time you play a creature, heal your base 1 HP.",unique:true},
  t_nab:       {name:"NABUNAGI",   cost:6,hp:7,atk:2,art:"⛩️",f:"tea",tags:["unique","provoke","bushido"], ab:"Bushido: ALL attacks must target this (incl. Pierce).",unique:true},
  // TEA SPELLS
  t_sp1:       {name:"ARCHIVE",    cost:2,hp:0,atk:0,art:"📜",f:"tea",tags:["spell","draw:2"],              ab:"Draw 2 cards.",spell:true},
  t_sp2:       {name:"INF.JOURNEY",cost:3,hp:0,atk:0,art:"🌌",f:"tea",tags:["spell","draw:3"],              ab:"Draw 3 cards.",spell:true},
  t_sp3:       {name:"SHEN'S CALL",cost:3,hp:0,atk:0,art:"✨",f:"tea",tags:["spell","revive:full"],              ab:"Revive last creature from your graveyard.",spell:true},
  t_sp4:       {name:"SCHEME",     cost:1,hp:0,atk:0,art:"🗺️",f:"tea",tags:["spell","ess_add:2"],              ab:"Get 2 essence for this turn.",spell:true},
  // TEA WORLDS & ARTIFACTS
  t_w1:        {name:"VALLEY",     cost:3,hp:0,atk:0,art:"🏔️",f:"tea",tags:["world","draw:1"],                 ab:"Draw 1 extra card each turn.",world:true},
  t_w2:        {name:"DOMINIA",    cost:3,hp:0,atk:0,art:"🌿",f:"tea",tags:["world","world_maxhp:1"],           ab:"+1 max HP to all allies while active.",world:true},
  t_a1:        {name:"FOUND.BOOK", cost:3,hp:0,atk:0,art:"📖",f:"tea",tags:["artifact","draw:1"],  ab:"Draw 1 extra card per turn.",artifact:true},
  t_a2:        {name:"TEA FOUNT.", cost:3,hp:0,atk:0,art:"⛲",f:"tea",tags:["artifact","heal:1"],  ab:"Heal all allies 1 HP per turn.",artifact:true},

  // JEET CREATURES
  j_szarg_w:   {name:"Szarg",      cost:1,hp:1,atk:2,art:"🦈",f:"jeet",tags:["vanguard","gtype:szg"],         ab:""},
  j_orb_w:     {name:"Orbiton",    cost:1,hp:2,atk:1,art:"🕳️",f:"jeet",tags:["heal:1","gtype:orb"],            ab:"Active: heal ally 1 HP, remove debuffs."},
  j_drig_w:    {name:"Dreegan",    cost:3,hp:4,atk:1,art:"🕸️",f:"jeet",tags:["provoke","gtype:drg"],           ab:""},
  j_umb_w:     {name:"Umbasir",    cost:2,hp:1,atk:1,art:"💜",f:"jeet",tags:["aoe:1","gtype:umb"],             ab:"Active: deal 1 dmg to ALL enemies."},
  j_meh_w:     {name:"Mechird",    cost:2,hp:2,atk:1,art:"⚙️",f:"jeet",tags:["pierce","gtype:mch"],            ab:""},
  j_ksi_w:     {name:"Xuitqr",     cost:3,hp:3,atk:1,art:"🐙",f:"jeet",tags:["regen:1","gtype:xui"],              ab:""},
  // JEET LEGENDARIES
  j_reap:      {name:"REAPER",     cost:4,hp:4,atk:4,art:"☠️",f:"jeet",tags:["unique","on_any_death_base:1"], ab:"Any creature death: restore 1 HP to Jeet base.",unique:true},
  j_ryv:       {name:"RYVLEN",     cost:5,hp:4,atk:2,art:"🎭",f:"jeet",tags:["unique","fear","draw_attack:1"], ab:"Fear on attack. Draw 1 extra card each turn.",unique:true},
  j_mal:       {name:"MALTOR",     cost:4,hp:5,atk:2,art:"👹",f:"jeet",tags:["unique","rage","enter_aoe:1"], ab:"On enter: 1 dmg to all enemies. Rage on attack.",unique:true},
  j_phleg:     {name:"PHLEGMOR",   cost:5,hp:6,atk:1,art:"💀",f:"jeet",tags:["unique","raise:1"],  ab:"Start of turn: raise top graveyard card at 1 HP.",unique:true},
  j_vard:      {name:"BIG VARDAN", cost:4,hp:5,atk:2,art:"🌑",f:"jeet",tags:["unique","fear"],      ab:"On attack: target is Feared.",unique:true},
  // JEET SPELLS
  j_sp1:       {name:"JEET WAVE",  cost:2,hp:0,atk:0,art:"🌊",f:"jeet",tags:["spell","draw:2"],             ab:"Draw 2 cards.",spell:true},
  j_sp2:       {name:"OBLIVION",   cost:3,hp:0,atk:0,art:"🌀",f:"jeet",tags:["spell","draw:3"],             ab:"Draw 3 cards.",spell:true},
  j_sp3:       {name:"FORGETTING", cost:3,hp:0,atk:0,art:"🖤",f:"jeet",tags:["spell","revive:full"],             ab:"Revive last creature from your graveyard.",spell:true},
  j_sp4:       {name:"BLACK MAGIC",cost:1,hp:0,atk:0,art:"⚫",f:"jeet",tags:["spell","ess_add:2"],             ab:"Get 2 essence for this turn.",spell:true},
  // JEET WORLDS & ARTIFACTS
  j_w1:        {name:"WEB",        cost:3,hp:0,atk:0,art:"🕸️",f:"jeet",tags:["world","draw:1"],                ab:"Draw 1 extra card each turn.",world:true},
  j_w2:        {name:"NORRIA",     cost:3,hp:0,atk:0,art:"🌑",f:"jeet",tags:["world","aura:atk:1"],            ab:"+1 ATK to all allies while active.",world:true},
  j_a1:        {name:"DARK WRIT.", cost:3,hp:0,atk:0,art:"📕",f:"jeet",tags:["artifact","draw:1"], ab:"Draw 1 extra card per turn.",artifact:true},
  j_a2:        {name:"ALTAR",      cost:3,hp:0,atk:0,art:"🗿",f:"jeet",tags:["artifact","sacrifice"], ab:"Active: sacrifice one of your creatures to heal Jeet base 2 HP.",artifact:true},
  // NEUTRAL
  unseen:      {name:"UNSEEN",     cost:2,hp:0,atk:0,art:"👁️",f:"jeet",tags:["spell","bounce"],             ab:"Return ALL field cards to their owners hands.",spell:true},
};
