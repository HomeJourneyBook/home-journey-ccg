# Home’s Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet, each defending a 20 HP base.
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

Then add the key to the relevant archetype group array in `buildDeck()` (`deck.js`) — `szarg`,
`orb`, `drg`, `umb`, `mch`, `xui` (4 unique cards each, 1 copy), or `legs`/`spells`/`worlds`/`arts`.

### Deck size configs (`DECK_CONFIGS` in deck.js)

`buildDeck(faction, configKey)` builds one of three preset deck sizes, picked via the
"Choose Your Deck" modal shown before Hot Seat/VS AI (see `openDeckPicker()`/`chooseDeckConfig()`
in ui.js):

|Config    |groupCount|groupSize|legCount|spellCopies|Resulting size|
|----------|----------|---------|--------|-----------|--------------|
|`full`    |6         |4        |5       |3          |~45/46 (Tea/Jeet)|
|`compact` |6         |4        |3       |2          |~39/40|
|`mini`    |4         |4        |2       |2          |~30/31|

`groupCount` trims from the 6 archetypes (szarg/orb/drg/umb/mch/xui); `mini` keeps only the first 4
(szarg/orb/drg/umb — not curated by matchup, just array order, revisit if a specific 4 feel better).
The choice is stored on `G.deckConfig` and reused automatically on restart (`resetGame()`).

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
|`bounce`     |Return all field cards to hands (delayed — see Targeted Spells below)|
|`ess_add:N`  |+N Essence this turn                          |
|`ess_max:N`  |+N to Essence max                             |

**Targeted spells (pause for a click, like Shard):**

|Tag                  |Targets|Effect                                                  |
|----------------------|-------|--------------------------------------------------------|
|`spell_dmg_target:N` |enemy  |N damage to the chosen enemy creature (ARCHIVE→removed this, now JOURNEY)|
|`spell_buff_temp:N`  |ally   |+N ATK until end of turn (`tempAtkBonus`, see below) — ARCHIVE|
|`spell_untap`        |ally   |Removes sleeping/exhausted, can act again this turn — OBLIVION|
|`spell_dispel`       |enemy  |Strips fear/burn/atk-buffs/squad bonuses — coded (`doSpellDispelTarget`) but not currently assigned to any live card|

See "Targeted Spell System" section below for how these pause/resolve/cancel.

**Active (button/click):**

|Tag        |Effect                                                                |
|-----------|----------------------------------------------------------------------|
|`aoe:N`    |N damage to all enemies (button on card)                              |
|`heal:N`   |Heal ally N HP + remove debuffs (creature)                            |
|`sacrifice`|Altar: kill one of your creatures, +1 Essence                        |
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

## Targeted Spell System

Spells tagged `spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel` don't resolve
instantly like other spells — `doPlay()` (game.js) intercepts them BEFORE calling `doSpell()`,
deducts cost, removes the card from hand, stores it in `G.pendingSpell`, and sets `G.phase` to
one of `spellDmgTarget` / `spellBuffTarget` / `spellUntapTarget` / `spellDispelTarget`. The next
click is routed by `onClick()` to the matching resolver (`doSpellDmgTarget()`,
`doSpellBuffTarget()`, `doSpellUntapTarget()`, `doSpellDispelTarget()` — all in game.js, same
pattern as `doShardTarget()`). Clicking anything invalid calls `cancelPendingSpell()`, which
**refunds** the cost and returns the card to hand (unlike Shard/Altar, which act on cards already
on the field — a spell's cost was already paid before the pause, so cancelling shouldn't just
waste it).

Visual targeting highlight lives in `mkSmallEl()` (render.js) — enemy-targeting phases
(`spellDmgTarget`/`spellDispelTarget`) get the red `.targetable` class (same as Shard),
ally-targeting (`spellBuffTarget`/`spellUntapTarget`) get the green `.healable` class.

`aiResolvePendingSpellTarget()` (ai.js) auto-resolves these for the AI right after it plays one —
without this the AI would just hang waiting for a click that never comes. `aiSpellHasValidTarget()`
also keeps the AI from picking a targeted spell with literally nothing to target in the first place.

**tempAtkBonus**: the ARCHIVE combat-trick buff lives in its own field, separate from `atkBonus`
(which is aura-driven and gets unconditionally reset to 0 every time `applyAuras()` runs — i.e. on
every card play). Reusing `atkBonus` for the spell buff was an actual shipped bug for one round —
it made the buff vanish the moment any other card was played, not at end of turn as intended.
`tempAtkBonus` is cleared explicitly in `endTurn()`'s per-turn cleanup instead.

-----

## Game State (G)

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'action' | 'selectTarget' | 'healTarget' | 'burn' |
          'sacrificeTarget' | 'shardTarget' |
          'spellDmgTarget' | 'spellBuffTarget' | 'spellUntapTarget' | 'spellDispelTarget',
  sel: cardId | null,
  pendingSpell: Card | null,   // held between doPlay() pausing and the target click resolving it
  previewCard: cardId | null,
  logs: [{msg, cls} | {msg:'', cls:'snapshot', hidden:true, snapshot:{...}}],
  mode: 'hotseat' | 'vsai',
  humanFaction: 'tea' | 'jeet' | null,   // vsai only
  aiFaction: 'tea' | 'jeet' | null,      // vsai only
  deckConfig: 'full' | 'compact' | 'mini',
  gameOver: Boolean,   // set once by checkWin(); guards against the win modal / further attacks re-firing
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
  atkBonus,        // from aura:atk sources — reset to 0 on EVERY applyAuras() call, don't reuse for anything else
  tempAtkBonus,    // from spell_buff_temp (combat tricks) — separate from atkBonus on purpose, cleared at end of turn
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
|`spellDmgTarget` |Targeted-damage spell played, waiting for enemy click|
|`spellBuffTarget`|Combat-trick spell played, waiting for ally click    |
|`spellUntapTarget`|Untap spell played, waiting for ally click          |
|`spellDispelTarget`|Dispel spell played, waiting for enemy click       |

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

## Sound System

Web Audio API, not `<audio>` elements — `playSfx(name)` in `js/ui.js` creates a fresh `BufferSource` per call, so overlapping sounds layer instead of cutting each other off. Buffers are preloaded once via `_initSfxBuffers()` (`SFX_FILES` array) on boot; calling `playSfx()` for a name not in that array silently no-ops.

```js
playSfx('card_atack');           // fire-and-forget, uses default SFX_VOLUME
playSfx('Navigation_Cursor', 0.3); // optional per-call volume override
```

`SFX_THROTTLE` rate-limits spammy sounds (currently just `Navigation_Cursor`, 90ms) — add an entry there if a new hover/repeat sound needs the same treatment.

**Current sound → meaning map** (see README.md "Audio" table for the plain-language version):

|Sound|Fires from|
|---|---|
|`card_atack` / `card_fire_atack` / `debaf`|`playAttackSfx()` + the `willFear`/`willBurn` prediction in `doAttack()` (game.js) — attack sound is suppressed when Fear or Burn will actually land on a surviving target; `card_fire_atack` plays instead from the `case 'burn':` handler in abilities.js, `debaf` from `case 'fear':`|
|`card_spell_atack`|Playing a spell (`render.js` play button), `case 'aoe':` in abilities.js (covers both active AOE buttons and on-enter AOE), `doShardTarget()`/`doSacrifice_target()` in game.js|
|`open_door`|`openGates()`, `doWorld()`/`doArtifact()`, `toggleHamburger()` (only when opening)|
|`baf`|Rage (abilities.js), active heal-ally (inline in `onClick()`'s `healTarget` branch in game.js — **not** the `hp_add`/`ctx.target` case in abilities.js, that branch is currently unreachable dead code), regen tick (abilities.js), aura buff in `applyAuras()` (game.js, delayed 150ms via `setTimeout`)|
|`yellow_buttom_play_endturn_menu_gravyard_loop`|The default "generic button" sound — if you add a new plain UI button, this is almost certainly what it should use|

If a sound isn't firing, check in order: (1) is the name spelled identically to the file, minus `.wav`/`.mp3`? (2) is it in `SFX_FILES`? (3) is the call actually on the code path that runs (e.g. active-ability flows are sometimes implemented twice — once as a generic `abilities.js` case, once as a bespoke inline handler in `game.js` — only one of them is actually wired to the UI).

-----

## Tooltip System

One shared `<div id="card-tooltip">` (bottom of `index.html`), driven by a single delegated `mousemove` listener in `js/ui.js`. Desktop-only by design — built on mouse events, not touch; any tooltip that appears on mobile via tap is an incidental browser hover-simulation, not supported behavior.

- `TOOLTIP_TRIGGER_SELECTOR` — CSS selector listing every hoverable target (tags, cost, type-dot, essence bar, etc.)
- `_tooltipDataFor(el)` — returns `{name, desc}` for a given hovered element; `name` may be `''` to render only the `desc` line
- Delay: `TOOLTIP_SHOW_DELAY` (500ms) — a per-element timer starts on entering a new target and is cancelled if the cursor leaves before it fires, so brief mouse-throughs never flash a tooltip
- Reveal animation: `.card-tooltip.tt-visible` scales in from its own center (`transform:scale(0.85)→scale(1)` + opacity), not a plain fade

To add a new tooltip target: add the selector to `TOOLTIP_TRIGGER_SELECTOR`, add a case to `_tooltipDataFor()`, and if the content is dynamic, stash it in a `data-*` attribute on the element when it's rendered (see `.card-type-dot`'s `data-type` or `.stat-ess-box`'s `data-max` for the pattern) rather than trying to compute it inside the tooltip handler itself.

**Gotcha:** an element needs actual pointer events to be hoverable — `pointer-events:none` silently breaks its tooltip (this happened to `.card-type-dot` and looked like a JS bug but was pure CSS).

-----

## Planned Features

Done since this doc was first written — kept here so it isn't re-proposed:

- [x] AI opponent (`js/ai.js` — `runAiTurn()`, `aiPlayCardsStep()`, hooked up via `startGameVsAI()`)
- [x] PNG card art integration (107 files in `img/cards/`, `img` field on card defs)
- [x] Background music + full SFX set (`js/ui.js` — `toggleMusic()`, `playSfx()`; attack/spell/buff/debuff/UI sounds wired across `game.js` and `abilities.js`)
- [x] Hand-zone side rails (`hands_border.png`/`hands_border2.png`) — player's rail width tracks the Zoom/Burn button size (`--card-action-btn-w`), opponent's is fixed; mobile drops to a fixed-width variant on both (carousel scrolls under it, no reserved padding there)
- [x] Squad threshold lowered 3→2 (was rarely achievable with 1 copy of each of 4 unique cards per archetype)
- [x] Screen-edge glow + zone-shake on base dmg/heal — scoped to the actual *viewer* (human in vsAI, regardless of whose turn; G.turn in hotseat), not G.turn naively — this distinction was a real bug (vsAI human never saw their own base's feedback)
- [x] Base HP visual tiers 1-5 (`hpTier()` in state.js) — drives both the full stats-bar panel background (`bg_statbar_<faction><1-5>.png`) and (currently placeholder, same art all 5 tiers) the base "portal" icon
- [x] Lore page redesign — `lore_pages.png` frame, readable sepia ink color, halved line-height, centered headers, weaker glitch, arena starfield background
- [x] AI: burns cards for essence ramp, uses Shard's active ability, uses Umbasir's AOE active, evaluates Unseen/bounce against board state instead of always playing it, defensive try/catch around card-play and attack steps so one bad interaction can't silently freeze the rest of the AI's turn
- [x] Targeted spells — ARCHIVE (combat trick, +2 ATK ally), JOURNEY (3 dmg to enemy creature), OBLIVION (untap ally) — see "Targeted Spell System" section
- [x] THE BOOK reworked from draw:1/turn → ess_add:1/turn (Tea had 3 stacked unconditional draw engines: Teantist+Valley+Book)
- [x] ALTAR sacrifice gives a baseline +1 Essence now, not just synergy-or-nothing with Hunger/Reaper
- [x] PHLEGMOR's raise restricted to own graveyard (used to also pull from the opponent's)
- [x] Deck size picker — `full`/`compact`/`mini` via `DECK_CONFIGS` (see Deck size configs above)
- [x] Battle log: hidden per-turn snapshots (hand/field/essence) for balance analysis, save-to-JSON button on the win modal, cleared properly on restart (wasn't before)
- [x] Space bar confirms whichever modal is open (mulligan/pass/win/confirm) before falling back to End Turn
- [x] Pass-the-device screen now shows after every hotseat turn, not just the initial Tea→Jeet handoff
- [x] Win modal no longer re-fires after the base is already dead (AI would sometimes keep attacking/re-triggering it)
- [x] Restart button on the win modal — replays with the same mode/faction/deckConfig, no need to go through the landing again

Still open:

- [ ] Remaining traveler cards + art (60 planned total, ~75 defs exist but not all have unique art matched — verify against `img/cards/`)
- [ ] Deckbuilder screen
- [ ] Web3: NFT ownership verification
- [ ] Online multiplayer

-----

## Artist's Notes — Open Items

_Unsorted working list, kept verbatim as written. Completed items are removed as they're closed
out (see "Planned Features" above for what that closing-out actually was) rather than checked off
in place, to keep this list short and current._

**New insides:**

Base of Tea:
- Gate of Tavern;
- Details on bottom;
- Bar is like front of Tavern + damaged 4 steps;
- Rechange buttons;
- Win modal + bg for modal;
- Bg for hand?
- More schemes and figures on details;

Base of Jeet:
- kinda void;
- New modal skin (window, graveyard, battle log, win) + bg for modal;
- All buttons;
- Bottom bar + bar (damaged 4 steps)
- Heart is black;
- Fix AI button;
- Bg for hand?
- Think about card design after

Landing:
- behind kinda room inside Tavern;
- At front we see table and panel:
- Buttons for lore, rules, catalog are part of table;
- Window for buttons above like close look on pages, notebook etc;
- Fix sound buttons;
- Music on background even we close page;

**Код:**
- Ссылки снизу (Discord/Twitter — на паузе, автор доделает после лендинга целиком)
- Каждое Врата визуально на карте (ждёт дизайн-решения — куда на карте и как выглядит)

**ИИ:**
- Сделать пожёстче (тактические дырки залатаны — burn/Shard/AOE/Unseen-оценка — но общая "сила"/сложность ИИ не пересматривалась)
- Отчёты по балансу — идёт через `AI_BALANCE_NOTES.md` + присылаемые `battle_log_*.json`

**Арт:**
- Все Арт для карт (!)
- Кастомные анимации (отряд, страх — сейчас текстовые плейсхолдеры "SQUAD!"/"FEARED!"/"-SQUAD"/"CLEANED")

**Звук:**
- Хил
- Бафы (аура)
- Кладбища кнопка с другим звуком лог звук
- Воскрешение
- Спец звук когда атака по базе (и хил?)
- Когда добор карт звук
- Звук победы
- Звуки для декора

-----

## Feedback Backlog — 2026-07-05 (design/balance, not yet actioned)

_Raw notes from playtesting the new spell/artifact mechanics — needs a decision before implementing, not a straightforward bugfix._

- **THE BOOK** (`ess_add:1`/turn) feels too simple/low-impact now — reconsider the mechanic again.
- **ALTAR**'s new baseline payoff (+1 Essence on sacrifice) is a step in the right direction but not fully settled — revisit.
- **Jeet has a lot of revival effects** (FORGETTING, PHLEGMOR's raise, REAPER-adjacent death payoffs) — density/overlap worth a look.
- **Untap (OBLIVION)** needs clearer feedback that something happened — an animation or sound cue, since right now it's easy to miss.
- **Targeted-spell UX** needs more polish:
  - The "play" sound currently fires twice — once on clicking Play (before a target is even chosen), once again when the spell actually resolves on the target. Should only fire once, on resolution.
  - Needs an on-screen hint of what's happening and how to cancel while waiting for a target (currently relies on the hint-bar text alone).
- **Low-HP warning**: a red lantern/light that turns on below 5 HP, plus a faint pulsing glow around the screen edge (separate from the existing dmg/heal flash — this one should be a persistent low-HP state indicator, not a one-shot event flash). Idea: put the lantern decoratively near the hamburger button; each player's lantern lights independently based on their own HP. Stat bar HP number could also pulse/blink at low HP.
