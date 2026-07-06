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
  data.js           # Card definitions — DEFS object
  abilities.js      # getTagVal(), hasTag(), getAbilities(), triggerAbilities()
  deck.js           # buildDeck(), getRushPool(), buildAiRushDeck(), mkCard()
  state.js          # Game state G, initState(), findC(), resetC(), lg(), hint()
  render.js         # render(), mkEl(), mkSmallEl(), reorderZones()
  game.js           # onClick(), doAttack(), endTurn(), killCard(), applyAuras(),
                    # checkSquadBonuses(), doSacrifice_target(), doShardTarget()...
  catalog.js        # renderCatalog(), filters, openCardDetail()
  deckbuilder.js    # startRushBuild(), deckBuilderConfirm() — Rush mode deckbuilder
  ui.js             # startGame(), showScreen(), boot
```

Scripts load in this exact order in `index.html`:
`data → abilities → deck → state → render → game → catalog → deckbuilder → ui`

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

Then add the key to the relevant archetype group array in `_composeDeckList()` (`deck.js`) —
`szarg`, `orb`, `drg`, `umb`, `mch`, `xui` (4 unique cards each, 1 copy), or `legs`/`spells`/
`worlds`/`arts`. This list feeds BOTH Classic mode (`buildDeck()`) and the Rush deckbuilder's
pool (`getRushPool()`) — no separate registration needed for Rush.

### Deck modes (`DECK_CONFIGS` in deck.js)

Two modes, picked via the "Choose Your Deck" modal shown before Hot Seat/VS AI
(see `openDeckPicker()`/`chooseDeckConfig()` in ui.js):

|Mode      |What happens                                                                              |
|----------|-------------------------------------------------------------------------------------------|
|`classic` |Fixed 1st-edition starter — `buildDeck(f,'classic')` builds all 6 archetypes + all 5 legendaries + 3 copies of each spell (~45/46 Tea/Jeet). This is "every currently-implemented card" and is expected to keep changing size as balance testing continues — see `DECK_CONFIGS.classic` in deck.js. |
|`rush`    |No fixed list. The human player(s) build their own (min. `RUSH_MIN`=28 cards) via the deckbuilder screen (`js/deckbuilder.js`) — see below. The AI's Rush deck (VS AI only) is `buildAiRushDeck()`: a random RUSH_MIN-card sample of the same pool a human would pick from. |

`getRushPool(f)` returns the Rush deckbuilder's pool — the exact same card list Classic uses
(`_composeDeckList(f, DECK_CONFIGS.classic)`), deduped into `{key, max}` entries (`max` is 1 for
everything except spells, which can be picked up to `spellCopies` times, same as Classic). This
means the Rush pool always tracks whatever Classic currently contains — no separate list to keep
in sync when cards are added/rebalanced.

The Unseen bonus card (2nd-player-only, currently always Jeet) is NOT part of the pickable
pool in Rush — it's appended automatically after the player finishes picking, same as
Classic's `buildDeck()` already does for Jeet.

The choice is stored on `G.deckConfig` ('classic'/'rush'); for Rush, the actual finalized
deck lists are also stashed on `G.rushDecks` so "Restart (same setup)" (`resetGame()`) can
reshuffle the exact same picks instead of re-opening the deckbuilder.

### Rush deckbuilder flow (`js/deckbuilder.js`)

Entry point `startRushBuild(flow, opts)`, called from `ui.js` once Rush is picked (and, for
VS AI, the human's faction is chosen):

- **Hot Seat**: runs twice — Tea, then Jeet — with the existing "pass the device" screen
  (`showPassScreen()`) between them, same pattern used for the hotseat mulligan handoff.
- **VS AI**: runs once, for the human's faction only. The AI's deck is `buildAiRushDeck()` —
  no deckbuilder UI for it.

Each step shows `#deckBuilderModal` (a wide modal, not the narrow `.modal` default — see
`#deckBuilderModal .modal` inline style in index.html) with a grid of that faction's pool
(`getRushPool()`), reusing `.cat-card`'s markup/CSS from the Catalog (smaller size — see
`.db-card` in styles.css, which locally overrides `--card-w`/`--card-h` the same way the
mobile Catalog grid does). Single-copy cards toggle on/off by clicking the whole card;
multi-copy cards (spells) get a −/+ stepper (`dbSetQty()`). The "Start Game"/"Next" button
is disabled until the running total (`_dbTotal()`) reaches `RUSH_MIN`. `_finishRushBuild()`
assembles `rushDecks` and calls `initState()` exactly like the Classic-mode entry points do.

#### Deck JSON export / import (`dbExportDeck()`/`dbImportDeck()`/`_applyImportedDeck()`)

Testers can save the deck they're assembling to a `.json` file and load one back in later
(or hand it to someone else) — same spirit as the existing battle-log export workflow. Buttons
live in `#deckBuilderModal`'s footer; import only replaces the CURRENT step's picks (this
faction, this step) — it doesn't skip the flow or touch the other faction in Hot Seat, and
there's no "load deck" shortcut on the earlier Classic/Rush picker (by design, for now).

File shape:
```json
{
  "game": "homes-journey-ccg", "kind": "rush-deck", "version": "1.0",
  "faction": "jeet", "total": 28,
  "cards": [ { "key": "j_trvl12_w", "name": "TRAVELER #12", "qty": 1 }, ... ]
}
```
`key` is the source of truth on import; `name` is purely for human readability of the file
(ignored on import). `version` is `GAME_VERSION` (`js/data.js`) at export time.

**`GAME_VERSION`** (`js/data.js`) — bump it whenever `DEFS` or game mechanics change in a way
that could make an older saved deck file (or battle log — it's also stamped into
`downloadBattleLog()`'s JSON, see `game.js`/`ui.js`) no longer match reality (card renamed,
removed, rebalanced, etc). `_applyImportedDeck()` compares the file's `version` against the
current `GAME_VERSION` and — if they differ — shows a non-blocking notice ("saved from an
older version, double-check the build") rather than silently trusting a stale file. It also
always: rejects files for the wrong faction outright, and skips+reports (rather than
silently dropping) any card `key` no longer in the current pool, or any `qty` above what's
currently available (capped, reported, not rejected).


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

## AI Module (`js/ai.js`) — VS AI opponent

A simple rule-based bot that only reads `G` and calls the SAME functions a human
click would (`doPlay`/`doAttack`/`tryAttackBase`/`doSacrifice_target`/etc.) — it can't
break any rule a hotseat human couldn't also break. Runs only when
`G.mode==='vsai' && G.turn===G.aiFaction` (`runAiTurn()`).

### `AI_VERSION` vs `GAME_VERSION` — keeping the AI's card knowledge in sync

`AI_VERSION` (top of ai.js) is a separate constant from `GAME_VERSION` (js/data.js), pinned
to whichever game version ai.js was last audited against. **Bump `AI_VERSION` to match
`GAME_VERSION` only after actually re-checking ai.js against whatever changed** — new cards,
new tags/mechanics, a new type of Active ability, a rebalance that changes what a "good" play
looks like. If you bump `GAME_VERSION` (new card, mechanic, or balance change) and DON'T touch
`AI_VERSION`, that's a real signal the AI might now be blind to something — it'll:
- log a `console.warn` on the very first AI turn of any VS AI game, and
- print one line to the in-game log (`⚠ AI logic last verified for v...`) at game start,

both from `_warnIfAiVersionStale()`, called once from `aiAutoMulligan()`. This is
non-blocking by design (nothing stops the AI from playing) — it's purely so a stale-AI
situation is visible during testing instead of discovered by "huh, the AI didn't know what
to do with the new card."

As of `AI_VERSION`/`GAME_VERSION` `"1.0"`, the AI can legally play every card in the game
(every creature, every spell, world, and artifact — `aiPickBestCard()`/`aiScoreCard()` handle
all four types generically, not a hardcoded per-card list) and knows how to trigger every
**Active** ability that exists in the current card pool:

|Active ability      |Cards                          |AI function            |
|---------------------|--------------------------------|------------------------|
|AOE damage            |Umbasir archetype creatures      |`aiTryUseAoe()`         |
|Heal                  |Orb archetype creatures          |`aiActWithCreature()` (heals a wounded ally instead of attacking, when one exists) |
|Shard (direct dmg)    |SHARD artifact                   |`aiTryUseShard()`       |
|Sacrifice (+1 essence)|ALTAR artifact                   |`aiTryUseSacrifice()`   |

Targeted spells (`spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel` — see
"Targeted Spell System" above) are auto-resolved by `aiResolvePendingSpellTarget()`.
Everything else that reads like a "mechanic" (provoke/bushido/pierce/fear/invisible/rage/
regen/burn/squad bonuses/auras/on-play/on-death/on-attack triggers) is enforced by the core
game functions themselves (`doAttack`, `applyAuras`, `checkSquadBonuses`, `triggerAbilities`,
...) regardless of whether AI or a human triggered them — there's nothing extra for the AI to
"know" there, only for genuinely player-facing CHOICES (which of several legal targets/actions
to take), which is what the table above and `aiActWithCreature()`'s targeting priority
(kill > hit base > forced target) cover.

**If a new card introduces a genuinely new Active ability or targeted-choice mechanic**, it
needs its own `aiTry...()` (mirroring `aiTryUseAoe`/`aiTryUseShard`/`aiTryUseSacrifice`) wired
into `aiPlayCardsStep()`, or its own case in `aiResolvePendingSpellTarget()`/
`aiSpellHasValidTarget()` if it's a targeted spell — then bump `AI_VERSION`. A new PASSIVE
mechanic (no choice involved — an aura, an on-trigger effect) generally needs nothing here.

### Card evaluation (`aiScoreCard()`) and `AI_WEIGHTS`

This is NOT machine learning — there's no training data, no self-play, no gradient descent.
It's a hand-written scoring formula, same as any other game code; "improving the AI" means
editing these numbers/conditions and checking the result against a `battle_log_*.json`
(same workflow as AI BALANCE NOTES.md already uses for creature/spell balance). Every tunable
number the formula uses lives in one place, `AI_WEIGHTS` (top of ai.js) — tag bonuses, squad
bonuses, race thresholds, spell-value multipliers — so most tuning passes are "change a number
in `AI_WEIGHTS`, replay, compare" rather than editing the scoring logic itself.

`aiScoreCard(card, me)` scores a hand card using, beyond its raw stats:

- **Squad synergy** (`aiGtypeCount()`) — a creature that would complete an archetype's
  3-of-a-kind Squad threshold (see `SQUAD_DEFS`, "Squad System" above) scores a large bonus
  (`squadCompleteBonus`); the 1st/2nd copy toward that threshold gets a smaller one
  (`squadBuildBonus`) — the AI now actively tries to finish squads instead of spreading
  itself thin across archetypes by pure chance.
- **Race state** (`aiRaceState()`) — `'ahead'`/`'even'`/`'behind'`, from HP difference AND
  board-power difference (`effAtk` sum) together, not HP alone. When `'behind'`, stabilizing
  tags (provoke/heal/regen) get extra weight (`stabilizeTagBonus`); when `'ahead'`,
  closing-out tags (fear/pierce/burn/rage) do (`aggroTagBonus`) — this is the "risk vs play it
  safe" lever: same card, different value depending on how the game currently looks.
- **Removal spells** (`spell_dmg_target`) now score based on the actual best target they can
  kill (`removalKillBonus` + a cut of the killed creature's own `effAtk` — killing the
  opponent's best attacker is worth more than killing a vanilla 1/1), not a flat "spells are
  fine" score. If nothing dies, it's scored as chip damage only, worth a bit more when already
  `'behind'`.
- **Buff spells** (`spell_buff_temp`) get a rough (provoke/bushido-blind — it's a scoring
  estimate, the actual attack still resolves through the normal forced-target rules either
  way) lethal check: if the buffed creature's `effAtk` would meet-or-beat the opponent's
  current HP, that's a large bonus (`buffLethalBonus`).
- **Revive spells** (`revive`) check the actual graveyard instead of assuming "a spell is
  always fine to play" — an empty graveyard scores negative (`reviveEmptyGraveyardScore`,
  since it'd just log "graveyard empty" and waste the card), a strong body back scores well.

**Known boundary, by design for now**: this is still a single-turn greedy evaluator — no
lookahead, no resource-holding across turns (the AI always spends everything it can afford
this turn rather than saving essence to combo two cards next turn), no full minimax on combat
math (removal/buff scoring above are targeted heuristics for those two spell shapes
specifically, not a general "simulate the rest of combat" solver). Worth revisiting if
playtesting shows the AI making a specific class of mistake these heuristics don't cover —
same iterative process as everything else here: `battle_log_*.json` → identify the pattern →
add/adjust a term in `aiScoreCard()`/`AI_WEIGHTS`, not a rewrite.

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

### Lore & Universe context — Home Travelers (Solana NFT)

The game is directly tied to **Home Travelers**, a generative NFT collection on the Solana
blockchain. This connection is MECHANICAL, not just thematic — traits on the NFTs map to
game tags:

- **Gates** (the body) — maps to the archetype/gtype grouping. A future task: show each
  traveler's Gate visually on its card (waiting on a design decision, see Art backlog).
- **Mood** (the eye/face area) — justifies extra ability tags. Example: a skull Mood is the
  lore reason a traveler carries the `fear` tag. When adding/rebalancing traveler cards,
  check the actual NFT's traits — a tag should have a visible trait justifying it.
- **World** (the background) — connects to the World card type / world mechanics.
- **Rare and legendary traits** — how exactly они синхронизируются с игрой ещё НЕ решено;
  это открытая дизайн-задача (см. backlog). Не придумывать связь на лету — спросить автора.
- **1/1s** — множество уникальных 1/1 из коллекции ещё НЕ использовано в игре. Это резерв
  для будущих карт и, возможно, новых типов существ.

**«Архив» (The Archive)** — внешний лор-репозиторий вселенной. На лендинге планируется
иконка-книга со ссылкой на него (см. backlog). Ключевое правило: **расширение состава
существ на поле (кто-либо кроме Путешественников и 1/1) требует лорного обоснования из
Архива ДО реализации** — механика не должна опережать вселенную.

**Как давать Claude контекст вселенной в новой сессии** (решение, принятое 2026-07-06):
держать краткий пример («Universe Primer») прямо в этом файле — см. заготовку ниже, автор
заполняет выдержками из Архива. Полный zip Архива прикладывать только к сессиям, где работа
идёт именно над лором/новыми существами; ссылки сами по себе ненадёжны (Claude не всегда
может их открыть, и контент меняется). Этот раздел — единственный источник, который
гарантированно виден в каждой сессии.

> **Universe Primer** _(заполнить автору — 10-20 строк ключевых фактов вселенной из Архива:
> кто такие Путешественники, что такое Таверна и Ядро, кем являются Tea и Jeet, что за
> событие породило конфликт, какие сущности существуют помимо Путешественников)._


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
- [x] Deck picker: `Full`/`Compact`/`Mini` collapsed to `Classic`/`Rush` — Compact removed, Full renamed Classic (unchanged composition), Mini's fixed list replaced by the Rush deckbuilder (below)
- [x] Rush deckbuilder screen (`js/deckbuilder.js`) — human picks own min-28 deck from the Classic-sized pool (`getRushPool()`); AI gets an auto-sampled Rush deck (`buildAiRushDeck()`) in VS AI
- [x] Rush deck JSON export/import (`dbExportDeck()`/`dbImportDeck()` in deckbuilder.js) + `GAME_VERSION` constant (`js/data.js`, currently `"1.0"`) stamped into both deck exports and battle logs, so a stale save can be flagged instead of silently misapplied
- [x] AI card/mechanic audit + `AI_VERSION` pinned to `GAME_VERSION` (both `"1.0"`) — see "AI Module" section above. Found and fixed one real gap: the AI never used the ALTAR artifact's sacrifice-for-essence Active ability (`aiTryUseSacrifice()` in ai.js); AOE/Shard/Heal were already covered. Drift between `AI_VERSION` and `GAME_VERSION` now surfaces automatically (console + in-game log) at the start of a VS AI game instead of silently going stale.
- [x] AI card evaluation rework (`aiScoreCard()`/`AI_WEIGHTS` in ai.js) — board-aware Squad-completion bonus, HP+board-power race state driving risk-vs-stable tag weighting, removal/buff/revive spells scored against actual board state instead of a flat "spells are fine" number. Verified against mock game states (see commit notes) rather than a live playtest — worth a real VS AI session to confirm it "feels" better, not just numerically sound.
- [x] ARCHIVE (spell_buff_temp) can no longer target sleeping/exhausted/feared allies — click routing (game.js), `.healable` highlight (render.js), and all 3 AI-side checks (ai.js) now agree on the same eligibility (`!sleeping&&!exhausted&&!feared`). Previously any own creature was clickable during the dimmed-targeting overlay, which was easy to misclick.
- [x] Targeted-spell sound played twice (once on the "Play" click, once again on target select) — fixed by skipping the immediate Play-click sound for spells that pause for a target (`_isTargetedSpell()` in render.js); their own resolver's sound is now the only one.
- [x] Found and fixed the real cause of the stats-bar background "flashing" the real art only during the damage-shake animation, staying solid-black otherwise: `.stats-bar` needs its own explicit `z-index` (not just `position:relative`) for its `::before` art layer's `z-index:-1` to stay correctly scoped to it — without one, `.stats-bar` only ever accidentally established a stacking context WHILE `.zone-shake`/`.zone-shake-up`'s `transform` was actively running (any non-`none` `transform` always creates a stacking context), which is exactly why the art seemed to "flash in" only mid-animation. Fixed both factions (this was never faction-specific). Also switched the opponent-slot mirror from vertical-only (`scaleY(-1)`) to a full 180° flip (`scale(-1,-1)`, both axes) on `#oppStats::before` and `#oppStats .player-name-box`, per updated art direction.
- [x] Stray extra click sound between deck-choice and faction modal — `openVsAiPicker()` replayed the button sound the deck button's own onclick had already played 315ms earlier; removed the duplicate.
- [x] Remaining pre-mulligan flicker (classic vsAI, and identically in all other start paths) — every game-start path revealed `#game` then waited 50ms before `startMulliganFor()` raised the next solid-black overlay, leaving the bare arena visible for a frame between two black screens. The earlier `render()` fix made the flashed CONTENT correct but didn't close the GAP; now `startMulliganFor()` is called synchronously in all 6 start paths (ui.js ×4, deckbuilder.js ×2).
- [x] Deck-picker → next-screen transition gap ("stars" flash) — `chooseDeckConfig()` was waiting only 250ms (the modal's own pop-out) before hiding the modal, then `startGame()`/`openVsAiPicker()` each waited a FRESH 315ms on top of that before showing the next screen — landing's own 315ms fade (started at the same moment as the modal pop-out) had long since finished, leaving a ~250ms window where nothing covered the bare `.stars` background. Fixed by waiting the full 315ms (matching landing's transition exactly) before hiding the modal, so the next screen can appear immediately with no additional delay.

Still open:

- [ ] Remaining traveler cards + art (60 planned total, ~75 defs exist but not all have unique art matched — verify against `img/cards/`)
- [ ] Web3: NFT ownership verification
- [ ] Online multiplayer
- [ ] Random first-turn pick (currently always Tea first / Jeet always gets the Unseen 2nd-player bonus — see `_finishRushBuild()` in deckbuilder.js and `buildDeck()` in deck.js, both hardcode "jeet" as the 2nd player)

-----

## Backlog — Code (prioritized 2026-07-06)

_Единый взвешенный список: сюда слиты бывший Feedback Backlog 2026-07-05, заметки художника
по коду и задачи сессии 2026-07-06. Приоритет = ценность/усилия с учётом зависимостей от
арта и дизайн-решений._

### P1 — быстрые победы, без зависимости от арта

- [ ] **Спящие карты**: вместо прозрачности — индикатор «z Z Z» (анимация); **уставшие** —
  затемнение вместо прозрачности. Важно: при таргетинге шейд поверх прозрачной карты сам
  становится прозрачным и выглядит плохо — это главная причина правки, не только эстетика.
- [ ] **Подсветка доступных карт в руке** — слегка выделять карты, на которые сейчас хватает
  эссенции (render.js, сравнение cost vs G[turn].ess при каждом render).
- [ ] **Untap (OBLIVION) фидбек** — анимация или звуковой сигнал, сейчас эффект легко не заметить.
- [ ] **Targeted-spell UX**: экранная подсказка что происходит и как отменить, пока спелл ждёт
  цель (сейчас только hint-бар).

### P2 — механики и фичи (нужны небольшие дизайн-решения)

- [ ] **Хил → попап с кнопкой** — перевести активку лечения на тот же паттерн подтверждения,
  что у остальных таргетируемых действий.
- [ ] **Точечная активка-«спелл»** _(нужна расшифровка от автора)_: «спелл нажатие, но не
  только АОЕ, а ещё и точечная атака» — понято как: активные способности существ с
  ОДИНОЧНОЙ целью (сейчас активки только AOE/хил), по клику с выбором цели. Уточнить перед
  реализацией: это новый тег для существ или новый тип спелл-карт?
- [ ] **Новый тег-идея: +X ATK за каждое сыгранное заклинание** — решить рамки (за ход или
  за игру, свои спеллы или все), затем: тег в data.js + обработчик + строка в Tag System.
- [ ] **Анимация полёта карты из колоды в руку** — спрайт из `runaha.png` (ассет уже в img/),
  создаётся у плейсхолдера колоды, летит вверх, исчезает — тайминг под существующий fade
  появления карты в руке, создавая иллюзию прилёта.
- [ ] **Зеркалирование X/Y для остальных декоративных плейсхолдеров** (статус-бары уже
  сделаны). НЕ зеркалятся только: pcard и каунтеры HP/эссенции (там текст). Вместо зеркала —
  менять pcard и каунтеры МЕСТАМИ, сохраняя правило «мир и HP слева от базы» → в зеркальном
  виде справа.
- [ ] **THE BOOK** (`ess_add:1`/ход) — слишком просто/слабо, пересмотреть механику.
- [ ] **ALTAR** — базовый пейофф (+1 эссенция за жертву) шаг в нужную сторону, но не финал.
- [ ] **Low-HP «лампа»**: красный фонарь < 5 HP + слабая пульсация по краю экрана
  (персистентный индикатор состояния, не разовая вспышка). Идея: фонарь декоративно у
  бургер-кнопки, у каждого игрока свой. Частично зависит от арта (сам фонарь).
- [ ] **Jeet: плотность воскрешений** (FORGETTING, PHLEGMOR raise, REAPER) — глянуть на
  пересечение эффектов.
- [ ] **ИИ: перекос шкалы оценки** саппорт vs существа — см. AI BALANCE NOTES, сессия
  2026-07-06 (вечер). Очередь: после обкатки aiVersion 1.0.1.

### P3 — крупные блоки

- [ ] **Апгрейд дизайна окна декбилдера** — сюда же складываются старые пункты: карты слишком
  мелкие на лаптопе (breakpoints в CSS-секции DECKBUILDER MODAL), степпер спеллов не читается
  как интерактив; и идея «один тайл на каждую копию спелла» вместо степпера (прототипировать
  оба варианта). Частично блокировано артом (скин окна).
- [ ] **Тренировочная игра** — заскриптованная обучающая партия с комментариями и анимациями
  для новичков. БОЛЬШОЙ блок: скриптовый движок поверх game.js + контент сценария.
- [ ] **Расширение состава существ на поле** (кроме Путешественников и 1/1) — БЛОКИРОВАНО
  лором: сначала обоснование из Архива (см. Lore-раздел выше), потом дизайн, потом код.
- [ ] **Лор-страница**: иконка-книга → ссылка на Архив + дизайн страницы. **Правила** и
  **Каталог** — доработка дизайна и вёрстки. Все три — в основном дизайн/арт-задачи.
- [ ] **ИИ «пожёстче»** — тактические дырки залатаны (burn/Shard/AOE/Altar/веса), общая
  сложность не пересматривалась. Канал: battle_log + AI BALANCE NOTES.

### Отдельно: на паузе у автора

- Ссылки Discord/Twitter внизу лендинга — после завершения лендинга целиком.

-----

## Backlog — Art assets (systematized 2026-07-06)

_Реорганизованный список художника (бывший «Artist's Notes», формулировки сохранены) +
новые пункты. Группировка по зонам._

**База Tea:** Gate of Tavern; details on bottom; bar = front of Tavern + damaged 4 steps;
rechange buttons; win modal + bg for modal; bg for hand?; more schemes and figures on details.

**База Jeet:** kinda void; new modal skin (window, graveyard, battle log, win) + bg for
modal; all buttons; bottom bar + bar (damaged 4 steps); heart is black; fix AI button;
bg for hand?; think about card design after.

**Лендинг:** behind kinda room inside Tavern; at front table and panel; buttons for lore,
rules, catalog as part of table; window for buttons above (close look on pages, notebook
etc); fix sound buttons; music on background even we close page.

**Карты:** ВСЕ арты карт (!); каждое Врата (Gate) визуально на карте — ждёт дизайн-решения
куда и как.

**Анимации:** кастомные для отряда и страха (сейчас текстовые плейсхолдеры
"SQUAD!"/"FEARED!"/"-SQUAD"/"CLEANED"); полёт карты из колоды (runaha.png — ассет готов,
код в P2).

**Интерфейс:** скин окна декбилдера; фонарь Low-HP (см. P2); иконка-книга для лор-страницы.

-----

## Sound checklist — ждём от друга автора (записано 2026-07-06)

_Список у него; продублировано здесь на случай, если что-то не доделает — перепроверить и
напомнить. Отмечать по мере получения файлов._

- [ ] Кнопка кладбища
- [ ] Кнопка лога (скрин монитора)
- [ ] Воскрешение
- [ ] Хил
- [ ] Баф (сделать громче)
- [ ] Дебаф (погромче)
- [ ] Звук «тык» (чуть-чуть громче)
- [ ] Новая карта из колоды в руку (заменить шаркающий звук)
- [ ] Сдувание карты с поля обратно в руку (bounce)
- [ ] Спец-звук удара по базе
- [ ] Победа — фанфары при появлении win-модалки
- [ ] 3-4 запасных SFX
