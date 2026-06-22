const DEFS = {
  // TEA CREATURES
  t_szarg_w:   {name:"Szarg",       cost:1,hp:5,atk:2,art:"🦈",f:"tea",tags:["rage","vanguard","traveler","gate:szg"],          ab:""},
  t_orb_w:     {name:"Orbiton",     cost:1,hp:2,atk:1,art:"👁️",f:"tea",tags:["heal:1","traveler","gate:orb"],             ab:"Active: heal ally 1 HP, remove debuffs."},
  t_drig_w:    {name:"Dreegan",     cost:3,hp:4,atk:1,art:"🌳",f:"tea",tags:["provoke","traveler","gate:drg"],            ab:""},
  t_umb_w:     {name:"Umbasir",     cost:2,hp:1,atk:1,art:"🌀",f:"tea",tags:["aoe:1","traveler","gate:umb"],              ab:"Active: deal 1 dmg to ALL enemies."},
  t_meh_w:     {name:"Mechird",     cost:2,hp:2,atk:1,art:"🤖",f:"tea",tags:["pierce","traveler","gate:mch"],             ab:""},
  t_ksi_w:     {name:"Xuitqr",      cost:3,hp:3,atk:1,art:"🐙",f:"tea",tags:["fear","traveler","gate:xui"],               ab:""},
  // TEA LEGENDARIES
  t_tean:      {name:"TEANTIST",   cost:4,hp:5,atk:1,art:"🧙",f:"tea",tags:["unique","draw:1"], ab:"Draw 1 extra card each turn.",unique:true},
  t_aslex:     {name:"ASLEX",      cost:5,hp:6,atk:2,art:"🍵",f:"tea",tags:["unique","aura:maxhp:1"], ab:"+1 maxHP to all allies each turn.",unique:true},
  t_tuborg:    {name:"TUBORG",     cost:5,hp:6,atk:3,art:"👑",f:"tea",tags:["unique","aura:atk:1"], ab:"+1 ATK to all allies while on field.",unique:true},
  t_faeron:    {name:"FAERON",     cost:5,hp:5,atk:2,art:"🔥",f:"tea",tags:["unique","burn","enter_aoe:2"], ab:"On enter: 2 dmg to all. Attacks set target on fire.",unique:true},
  t_nab:       {name:"NABUNAGI",   cost:6,hp:7,atk:2,art:"⛩️",f:"tea",tags:["unique","provoke","bushido"], ab:"Bushido: ALL attacks must target this (incl. Pierce).",unique:true},
  // TEA SPELLS
  t_sp1:       {name:"ARCHIVE",    cost:2,hp:0,atk:0,art:"📜",f:"tea",tags:["spell","draw:2"],              ab:"Draw 2 cards.",spell:true},
  t_sp2:       {name:"INF.JOURNEY",cost:3,hp:0,atk:0,art:"🌌",f:"tea",tags:["spell","draw:3"],              ab:"Draw 3 cards.",spell:true},
  t_sp3:       {name:"SHEN'S CALL",cost:3,hp:0,atk:0,art:"✨",f:"tea",tags:["spell","revive:full"],              ab:"Revive last creature from your graveyard.",spell:true},
  t_sp4:       {name:"SCHEME",     cost:2,hp:0,atk:0,art:"🗺️",f:"tea",tags:["spell","draw:2"],              ab:"Draw 2 cards.",spell:true},
  // TEA WORLDS & ARTIFACTS
  t_w1:        {name:"VALLEY",     cost:3,hp:0,atk:0,art:"🏔️",f:"tea",tags:["world","draw:1"],                 ab:"Draw 1 extra card each turn.",world:true},
  t_w2:        {name:"DOMINIA",    cost:3,hp:0,atk:0,art:"🌿",f:"tea",tags:["world","maxhp_add:1"],              ab:"+1 HP to all allies on field.",world:true},
  t_a1:        {name:"FOUND.BOOK", cost:3,hp:0,atk:0,art:"📖",f:"tea",tags:["artifact","draw:1"],  ab:"Draw 1 extra card per turn.",artifact:true},
  t_a2:        {name:"TEA FOUNT.", cost:3,hp:0,atk:0,art:"⛲",f:"tea",tags:["artifact","heal:1"],  ab:"Heal all allies 1 HP per turn.",artifact:true},

  // JEET CREATURES
  j_szarg_w:   {name:"Szarg",      cost:1,hp:1,atk:2,art:"🦈",f:"jeet",tags:["vanguard","dark_traveler","dgate:szg"],         ab:""},
  j_orb_w:     {name:"Orbiton",    cost:1,hp:2,atk:1,art:"🕳️",f:"jeet",tags:["heal:1","dark_traveler","dgate:orb"],            ab:"Active: heal ally 1 HP, remove debuffs."},
  j_drig_w:    {name:"Dreegan",    cost:3,hp:4,atk:1,art:"🕸️",f:"jeet",tags:["provoke","dark_traveler","dgate:drg"],           ab:""},
  j_umb_w:     {name:"Umbasir",    cost:2,hp:1,atk:1,art:"💜",f:"jeet",tags:["aoe:1","dark_traveler","dgate:umb"],             ab:"Active: deal 1 dmg to ALL enemies."},
  j_meh_w:     {name:"Mechird",    cost:2,hp:2,atk:1,art:"⚙️",f:"jeet",tags:["pierce","dark_traveler","dgate:mch"],            ab:""},
  j_ksi_w:     {name:"Xuitqr",     cost:3,hp:3,atk:1,art:"🐙",f:"jeet",tags:["fear","dark_traveler","dgate:xui"],              ab:""},
  // JEET LEGENDARIES
  j_reap:      {name:"REAPER",     cost:4,hp:4,atk:4,art:"☠️",f:"jeet",tags:["unique","on_kill_base:2"], ab:"On kill: restore 2 HP to Jeet base.",unique:true},
  j_ryv:       {name:"RYVLEN",     cost:4,hp:4,atk:3,art:"🎭",f:"jeet",tags:["unique","fear","draw:1"], ab:"Fear on attack. Draw 1 card on every attack.",unique:true},
  j_mal:       {name:"MALTOR",     cost:4,hp:5,atk:2,art:"👹",f:"jeet",tags:["unique","fear","enter_aoe:1"], ab:"On enter: 1 dmg to all enemies. Fear on attack.",unique:true},
  j_phleg:     {name:"PHLEGMOR",   cost:5,hp:6,atk:2,art:"💀",f:"jeet",tags:["unique"],            ab:"Start of turn: raise top graveyard card at 1 HP.",unique:true},
  j_vard:      {name:"BIG VARDAN", cost:4,hp:5,atk:3,art:"🌑",f:"jeet",tags:["unique","aoe:2"],    ab:"Active: deal 2 dmg to ALL enemies.",unique:true},
  // JEET SPELLS
  j_sp1:       {name:"JEET WAVE",  cost:2,hp:0,atk:0,art:"🌊",f:"jeet",tags:["spell","draw:2"],             ab:"Draw 2 cards.",spell:true},
  j_sp2:       {name:"OBLIVION",   cost:3,hp:0,atk:0,art:"🌀",f:"jeet",tags:["spell","draw:3"],             ab:"Draw 3 cards.",spell:true},
  j_sp3:       {name:"FORGETTING", cost:3,hp:0,atk:0,art:"🖤",f:"jeet",tags:["spell","revive:full","revive:any"],             ab:"Revive last creature from any graveyard.",spell:true},
  j_sp4:       {name:"BLACK MAGIC",cost:2,hp:0,atk:0,art:"⚫",f:"jeet",tags:["spell","draw:2"],             ab:"Draw 2 cards.",spell:true},
  // JEET WORLDS & ARTIFACTS
  j_w1:        {name:"WEB",        cost:3,hp:0,atk:0,art:"🕸️",f:"jeet",tags:["world","draw:1"],                ab:"Draw 1 extra card each turn.",world:true},
  j_w2:        {name:"NORRIA",     cost:3,hp:0,atk:0,art:"🌑",f:"jeet",tags:["world","maxhp_add:1"],             ab:"+1 HP to all allies on field.",world:true},
  j_a1:        {name:"DARK WRIT.", cost:3,hp:0,atk:0,art:"📕",f:"jeet",tags:["artifact","draw:1"], ab:"Draw 1 extra card per turn.",artifact:true},
  j_a2:        {name:"WORMHOLE",   cost:3,hp:0,atk:0,art:"🌀",f:"jeet",tags:["artifact","heal:1"], ab:"Heal all Jeet allies 1 HP per turn.",artifact:true},
  // NEUTRAL
  unseen:      {name:"UNSEEN",     cost:2,hp:0,atk:0,art:"👁️",f:"jeet",tags:["spell","bounce"],             ab:"Return ALL field cards to their owners hands.",spell:true},
};
