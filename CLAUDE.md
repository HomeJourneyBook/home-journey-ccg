# Home’s Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet (Core), each defending a 20 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

-----

## Project Structure

```
index.html          # Markup: landing, game field, rules/lore/catalog screens
css/
  styles.css        # All styles, organized top-to-bottom into sections:
                     #   BASE → LANDING → SCREEN TRANSITIONS → HEADER →
                     #   FIELD & CARDS → HUD → LOG → MODALS → GRAVEYARD MODAL →
                     #   RULES & LORE → CATALOG → ANIMATIONS & MISC
                     # See the table of contents at the top of the file.
                     # Repeated colors (tea/jeet/hp/atk/gold/cream/backgrounds)
                     # live in :root as --color-* variables — reuse them for
                     # any new UI instead of hardcoding hex values.
audio/               # Music + SFX. Only a subset is wired up — see README.md
                     # "Audio" table before adding new sound-related code.
js/
  data.js           # Card definitions — DEFS object + buildDeck()
  abilities.js      # getTagVal(), hasTag(), getAbilities(), triggerAbilities()
  deck.js           # mkCard() — creates card instances from DEFS keys
  state.js          # Game state G, initState(), findC(), resetC(), lg(), hint()
  render.js         # render(), mkEl(), mkSmallEl(), reorderZones()
  game.js           # onClick(), doAttack(), endTurn(), killCard(), applyAuras(),
                    # checkSquadBonuses(), doSacrifice_target(), doShardTarget()...
  catalog.js        # renderCatalog(), filters, openCardDetail()
  ui.js             # startGame(), showScreen(), boot
```

Scripts load in this exact order in `index.html`:
`data → abilities → deck → state → render → game → catalog → ui`

-----

## Adding a New Card

All cards live in `js/data.js` in the `DEFS` object.

```js
trvlr_001: {
  name: "Szarg",       // display name
  cost: 1,             // essence cost to play
  hp: 1,               // starting HP (0 for spells/worlds/artifacts)
  atk: 2,              // attack value (0 for spells/worlds/artifacts)
  art: "🦈",           // emoji placeholder until PNG art is ready
  f: "tea",            // faction: "tea" or "jeet"
  tags: ["vanguard", "gtype:szg"],  // ability tags
  ab: "Vanguard.",     // text shown in catalog and on card preview
  // Optional type flags (omit for creatures):
  // spell: true       — instant, goes to void after use
  // world: true       — permanent passive, one active at a time
  // artifact: true    — permanent, up to 2 active, sleeps first turn
  // unique: true      — legendary, 1 copy per deck
},
```

Then add the key to `buildDeck()` in `deck.js`:

- `weak` — common travelers (×5 copies)
- `legs` — legendaries (×1)
- `spells` — spells (×2)
- `worlds` — worlds (×1)
- `arts` — artifacts (×1)
- `extra` — neutral cards (×1)

-----

## Tag System

Tags are strings in `card.tags`. Simple (`"vanguard"`) or with value (`"heal:2"`).
Multi-segment tags like `"aura:maxhp:1"` are parsed correctly by `getTagVal()`.

### getTagVal(card, tagName)

Returns the value after the tag name. Examples:

- `getTagVal(card, 'heal')` on `"heal:2"` → `2`
- `getTagVal(card, 'aura:maxhp')` on `"aura:maxhp:1"` → `1`
- `getTagVal(card, 'gtype')` on `"gtype:drg"` → `"drg"` (string)
- `getTagVal(card, 'vanguard')` on `"vanguard"` → `true`

### All Tags

**Passive (constant while on field):**

|Tag            |Effect                                                         |
|---------------|---------------------------------------------------------------|
|`vanguard`     |Attacks the turn it enters                                     |
|`provoke`      |All enemy attacks must target this                             |
|`pierce`       |Ignores Provoke                                                |
|`bushido`      |All attacks must target this (overrides Pierce)                |
|`invisible`    |Cannot be targeted while allies exist; no counter when attacked|
|`aura:atk:N`   |All allies except self get +N ATK                              |
|`aura:maxhp:N` |All allies except self get +N maxHP                            |
|`world_maxhp:N`|All allies including aura sources get +N maxHP (world only)    |
|`gtype:xxx`    |Traveler type for squad bonuses (szg/orb/drg/umb/mch/xui)      |

**On Enter:**

|Tag          |Effect                             |
|-------------|-----------------------------------|
|`enter_aoe:N`|N damage to all enemies when played|

**On Turn Start:**

|Tag             |Who                  |Effect                                     |
|----------------|---------------------|-------------------------------------------|
|`draw:N`        |world/artifact/unique|Draw N cards                               |
|`heal:N`        |artifact             |Heal all allies N HP                       |
|`regen:N`       |creature             |Restore N HP to self                       |
|`raise:N`       |creature             |Revive top graveyard card at N HP          |
|`ess_add:N`     |world/artifact       |Add N Essence                              |
|`ess_max:N`     |world/artifact       |+N to Essence max permanently              |
|`world_maxhp:N` |world                |Handled in applyAuras, not triggerAbilities|
|`on_own_death:N`|world                |Draw N when your creature dies (Hunger)    |

**On Attack:**

|Tag            |Effect                                   |
|---------------|-----------------------------------------|
|`fear`         |Target skips next turn, no counter-attack|
|`burn`         |Target takes 1 dmg each turn start       |
|`rage`         |Self gets +1 ATK permanently             |
|`draw_attack:N`|Draw N cards                             |

**On Kill / Death:**

|Tag                  |Effect                                    |
|---------------------|------------------------------------------|
|`on_kill_base:N`     |+N HP to own base on kill                 |
|`on_any_death_base:N`|+N HP to own base on any creature death   |
|`on_play_creature:N` |+N HP to own base when you play a creature|

**Instant (spells):**

|Tag          |Effect                                        |
|-------------|----------------------------------------------|
|`draw:N`     |Draw N cards immediately                      |
|`revive:full`|Revive last creature from graveyard at full HP|
|`bounce`     |Return all field cards to hands               |
|`ess_add:N`  |+N Essence this turn                          |
|`ess_max:N`  |+N to Essence max                             |

**Active (button/click):**

|Tag        |Effect                                                                |
|-----------|----------------------------------------------------------------------|
|`aoe:N`    |N damage to all enemies (button on card)                              |
|`heal:N`   |Heal ally N HP + remove debuffs (creature)                            |
|`sacrifice`|Altar: kill one of your creatures                                     |
|`shard:N`  |N damage to any enemy creature (+1 if Feared), ignores Provoke/Bushido|

-----

## Ability System

### getAbilities(card) → [{timing, effect, val, …}]

Parses tags and returns ability objects. Each has `timing`, `effect`, `val`.

### Timings

|Timing            |When it fires                                               |
|------------------|------------------------------------------------------------|
|`passive`         |Constant (provoke, pierce, invisible, vanguard, aura, gtype)|
|`_manual`         |Handled directly in game.js, not via triggerAbilities       |
|`instant`         |On play (spells)                                            |
|`on_enter`        |When played to field                                        |
|`on_turn`         |Start of owner’s turn                                       |
|`on_attack`       |On each attack                                              |
|`on_kill`         |When this card kills an enemy                               |
|`on_any_death`    |When any creature dies                                      |
|`on_play_creature`|When you play any creature                                  |
|`active`          |Manual player activation                                    |

### triggerAbilities(card, timing, ctx)

Called from game.js. Filters abilities by timing and executes effects.
`ctx` = `{target}` for attacks/heals.

Key call sites:

- `triggerAbilities(card, 'instant')` — spell played
- `triggerAbilities(card, 'on_turn')` — in endTurn for worlds/artifacts/field cards
- `triggerAbilities(card, 'on_enter')` — creature enters (Faeron, Maltor AOE)
- `triggerAbilities(card, 'on_attack', {target})` — after attack
- `triggerAbilities(card, 'on_play_creature')` — after creature played (Faeron)

-----

## Aura System

### applyAuras(faction)

Called after any field change. Handles both `aura:atk` and `aura:maxhp`.
Sources include field creatures AND world (if world has aura tag).

- `aura:atk` — resets all `atkBonus` to 0, then each source adds its val to all others
- `aura:maxhp` — resets to `baseMaxHp + squadMaxHpBonus`, then each source adds val to all others
- `world_maxhp` — applied separately, buffs ALL including aura sources themselves

### baseMaxHp

Stored on card to track original maxHP before any aura bonuses.
Used by applyAuras to recalculate correctly each turn.

-----

## Squad System

### SQUAD_DEFS (in game.js)

```js
const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'atk',   val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'param', param:'pierce', val:true},
  {gtype:'xui', count:3, effect:'param', param:'regen',  val:2},
];
```

### checkSquadBonuses(faction)

Called after every field change (doCreature, killCard, reviveCard, endTurn).
Must be called AFTER applyAuras to avoid maxHp conflicts.

Effects:

- `maxhp` — adds `squadMaxHpBonus` to card
- `atk` — adds `squadAtkBonus` to card
- `param` — sets `card.squadParam = {param: val}` (read by heal/aoe/regen/pierce logic)

-----

## Game State (G)

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'action' | 'selectTarget' | 'healTarget' | 'burn' |
          'sacrificeTarget' | 'shardTarget',
  sel: cardId | null,
  previewCard: cardId | null,
  logs: [{msg, cls}],
  tea: PlayerState,
  jeet: PlayerState,
}

PlayerState = {
  hp, maxHp,
  ess, essMax,
  hand: [Card],
  field: [Card],
  deck: [Card],
  grave: [Card],     // creatures only — can be revived
  void: [Card],      // spells, replaced worlds, burned — gone forever
  world: Card | null,
  artifacts: [Card],
  extraDraw: Number,
  burned: Boolean,
  _auraAtkLog: cardId | null,   // flag to log ATK aura on enter
  _auraMaxLog: cardId | null,   // flag to log maxHP aura on enter
}
```

### Card Instance Fields

Beyond DEFS values, each card instance has:

```js
{
  id, key, name, cost, hp, maxHp, atk, art, f, tags, ab,
  spell, world, artifact, unique,
  sleeping, exhausted, feared, burning,
  atkBonus,        // from aura:atk sources
  rageBonus,       // accumulated from rage tag
  maxHpBonus,      // legacy, kept for compatibility
  baseMaxHp,       // original maxHp before aura buffs
  worldMaxHpBonus, // bonus from world_maxhp
  worldMaxHpSet,   // flag to prevent re-applying each turn
  squadAtkBonus,   // from squad atk bonus
  squadMaxHpBonus, // from squad maxhp bonus
  squadParam,      // {heal:2} or {aoe:2} or {pierce:true} or {regen:2}
}
```

-----

## Game Phases

|Phase            |Description                                          |
|-----------------|-----------------------------------------------------|
|`action`         |Normal turn                                          |
|`selectTarget`   |Creature selected, waiting for attack target         |
|`healTarget`     |Orbiton selected, waiting for heal/attack target     |
|`burn`           |Waiting for hand card to burn                        |
|`sacrificeTarget`|Altar activated, waiting for creature to sacrifice   |
|`shardTarget`    |Shard activated, waiting for enemy creature to damage|

-----

## Graveyard Rules

- Creatures → `grave` (revivable)
- Spells → `void` after cast
- Replaced worlds → `void`
- Burned cards → `void`
- Cards in `void` have `voided: true` and are excluded from raise/revive

-----

## Traveler Structure (NFT)

60 total travelers planned. Each is a unique card (`trvlr_001` through `trvlr_060`).
All share base mechanics of their type but may have additional tags.

Example:

```js
trvlr_001: {name:"Szarg #001", cost:1, hp:1, atk:2, tags:["vanguard","gtype:szg"], ...},
trvlr_042: {name:"Szarg #042", cost:2, hp:1, atk:2, tags:["vanguard","gtype:szg","burn"], ...},
```

Deck composition per starter: 30 travelers + 5 legendaries + 8 spells + 2 worlds + 2 artifacts + extras.

-----

## Art Integration (Implemented)

PNGs live in `/img/cards/` (107 files as of writing, named `NNN_Name.png` or plain `N.png`).

Card art is **not** put in the `art` field (that's reserved for the emoji fallback). Instead, add an `img` key to the card def in `data.js`:

```js
trvlr_001: {
  name: "Szarg",
  art: "🦈",              // emoji fallback, shown if img is missing
  img: "001_Abysswalker.png", // actual PNG, resolved as img/cards/<img>
  ...
}
```

`catalog.js` and `render.js` check `card.img` first and render an `<img>` from `img/cards/${img}`; they fall back to the `art` emoji only when `img` is absent. `ui.js` also preloads `img/cards/${def.img}` on boot for smoother rendering.

-----

## Planned Features

Done since this doc was first written — kept here so it isn't re-proposed:

- [x] AI opponent (`js/ai.js` — `runAiTurn()`, `aiPlayCardsStep()`, hooked up via `startGameVsAI()`)
- [x] PNG card art integration (107 files in `img/cards/`, `img` field on card defs)
- [x] Background music + core SFX (`js/ui.js` — `toggleMusic()`, `playSfx()`)

Still open:

- [ ] Remaining traveler cards + art (60 planned total, ~75 defs exist but not all have unique art matched — verify against `img/cards/`)
- [ ] Wire up the unused audio files — see README.md "Audio" table for the 8 files sitting in `audio/` with no call site
- [ ] Deckbuilder screen
- [ ] Web3: NFT ownership verification
- [ ] Online multiplayer
