# Home’s Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet, each defending a 20 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

-----

## Session Workflow — как мы работаем

*Прочитать в начале КАЖДОЙ новой сессии, прежде чем предлагать шаги.*

- **Старт сессии**: автору достаточно написать “Привет” и приложить архив проекта (zip) —
  этот файл (`CLAUDE.md`) поддерживается в актуальном состоянии специально для этого и должен
  давать полную картину: архитектуру, что уже сделано, и приоритизированный backlog того,
  что нет.
- **Как присылать ПРАВКИ автору**: НЕ архивом. Изменённые/исправленные файлы присылать прямо
  в чат как `.txt` (даже если исходный файл `.js`/`.css`/`.html`) — автор сам импортирует их
  под нужным расширением на своей стороне. Исключение — **новые** файлы, которых раньше не
  было в проекте: их можно присылать сразу с их настоящим расширением, автор загрузит их как
  есть.
- **Плейсхолдеры под будущий арт кнопок** (уточнено автором 2026-07-08): для кнопки без
  готовой картинки — В HTML класс `placeholder` (даёт рамку/фон/эмодзи-фолбэк, см.
  `.modal-icon-btn.placeholder` в styles.css), а `background-image:url(...)` под три
  состояния (idle/hover/active — конвеншн автора: `btn_XXX1.png`/`btn_XXXH.png`/
  `btn_XXX2.png`) прописывается СРАЗУ, некомментированным — несуществующий файл просто не
  подгружается (фон остаётся прозрачным), плейсхолдер-стили поверх всё равно видны. Когда
  автор кладёт реальные файлы — достаточно убрать класс `placeholder` из HTML, в CSS
  ничего дораскомментировать не нужно (см. пример: Classic/Rush/Import/Export/OK/Back
  кнопки). Для НЕ-`.modal-icon-btn` элементов (как `.fab-btn.heal`, см. Backlog — Code) тот
  же принцип, но фолбэк пишется вручную (цвет фона + `::after` с эмодзи/символом), раз
  общего `.placeholder`-класса там нет.
- **Конец сессии**: перед тем как автор уходит спать, он попросит “сверить итог” — в этот
  момент нужно: (1) свериться с реальными изменениями, сделанными за сессию, (2) обновить
  чеклисты/Done-список/Backlog в этом файле, (3) прислать обновлённый `CLAUDE.md` тем же
  способом (`.txt` в чат). В течение самой сессии обновлять `CLAUDE.md` НЕ нужно — только по
  явному запросу в конце.

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
`worlds`/`arts`. This list feeds BOTH Classic mode (`buildDeck()`) and the Rush deckbuilder’s
pool (`getRushPool()`) — no separate registration needed for Rush.

### Deck modes (`DECK_CONFIGS` in deck.js)

Two modes, picked via the “Choose Your Deck” modal shown before Hot Seat/VS AI
(see `openDeckPicker()`/`chooseDeckConfig()` in ui.js):

|Mode     |What happens                                                                                                                                                                                                                                                                                       |
|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`classic`|Fixed 1st-edition starter — `buildDeck(f,'classic')` builds all 6 archetypes + all 5 legendaries + 3 copies of each spell (~45/46 Tea/Jeet). This is “every currently-implemented card” and is expected to keep changing size as balance testing continues — see `DECK_CONFIGS.classic` in deck.js.|
|`rush`   |No fixed list. The human player(s) build their own (min. `RUSH_MIN`=28 cards) via the deckbuilder screen (`js/deckbuilder.js`) — see below. The AI’s Rush deck (VS AI only) is `buildAiRushDeck()`: a random RUSH_MIN-card sample of the same pool a human would pick from.                        |

`getRushPool(f)` returns the Rush deckbuilder’s pool — the exact same card list Classic uses
(`_composeDeckList(f, DECK_CONFIGS.classic)`), deduped into `{key, max}` entries (`max` is 1 for
everything except spells, which can be picked up to `spellCopies` times, same as Classic). This
means the Rush pool always tracks whatever Classic currently contains — no separate list to keep
in sync when cards are added/rebalanced.

The Unseen bonus card (2nd-player-only, currently always Jeet) is NOT part of the pickable
pool in Rush — it’s appended automatically after the player finishes picking, same as
Classic’s `buildDeck()` already does for Jeet.

The choice is stored on `G.deckConfig` (‘classic’/‘rush’); for Rush, the actual finalized
deck lists are also stashed on `G.rushDecks` so “Restart (same setup)” (`resetGame()`) can
reshuffle the exact same picks instead of re-opening the deckbuilder.

### Rush deckbuilder flow (`js/deckbuilder.js`)

Entry point `startRushBuild(flow, opts)`, called from `ui.js` once Rush is picked (and, for
VS AI, the human’s faction is chosen):

- **Hot Seat**: runs twice — Tea, then Jeet — with the existing “pass the device” screen
  (`showPassScreen()`) between them, same pattern used for the hotseat mulligan handoff.
- **VS AI**: runs once, for the human’s faction only. The AI’s deck is `buildAiRushDeck()` —
  no deckbuilder UI for it.

Each step shows `#deckBuilderModal` (a wide modal, not the narrow `.modal` default — see
`#deckBuilderModal .modal` inline style in index.html) with a grid of that faction’s pool
(`getRushPool()`), reusing `.cat-card`’s markup/CSS from the Catalog (smaller size — see
`.db-card` in styles.css, which locally overrides `--card-w`/`--card-h` the same way the
mobile Catalog grid does). Single-copy cards toggle on/off by clicking the whole card;
multi-copy cards (spells) get a −/+ stepper (`dbSetQty()`). The “Start Game”/“Next” button
is disabled until the running total (`_dbTotal()`) reaches `RUSH_MIN`. `_finishRushBuild()`
assembles `rushDecks` and calls `initState()` exactly like the Classic-mode entry points do.

#### Deck JSON export / import (`dbExportDeck()`/`dbImportDeck()`/`_applyImportedDeck()`)

Testers can save the deck they’re assembling to a `.json` file and load one back in later
(or hand it to someone else) — same spirit as the existing battle-log export workflow. Buttons
live in `#deckBuilderModal`‘s footer; import only replaces the CURRENT step’s picks (this
faction, this step) — it doesn’t skip the flow or touch the other faction in Hot Seat, and
there’s no “load deck” shortcut on the earlier Classic/Rush picker (by design, for now).

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
that could make an older saved deck file (or battle log — it’s also stamped into
`downloadBattleLog()`‘s JSON, see `game.js`/`ui.js`) no longer match reality (card renamed,
removed, rebalanced, etc). `_applyImportedDeck()` compares the file’s `version` against the
current `GAME_VERSION` and — if they differ — shows a non-blocking notice (“saved from an
older version, double-check the build”) rather than silently trusting a stale file. It also
always: rejects files for the wrong faction outright, and skips+reports (rather than
silently dropping) any card `key` no longer in the current pool, or any `qty` above what’s
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

|Tag          |Effect                                                               |
|-------------|---------------------------------------------------------------------|
|`draw:N`     |Draw N cards immediately                                             |
|`revive:full`|Revive last creature from graveyard at full HP                       |
|`bounce`     |Return all field cards to hands (delayed — see Targeted Spells below)|
|`ess_add:N`  |+N Essence this turn                                                 |
|`ess_max:N`  |+N to Essence max                                                    |

**Targeted spells (pause for a click, like Shard):**

|Tag                 |Targets|Effect                                                                                                              |
|--------------------|-------|--------------------------------------------------------------------------------------------------------------------|
|`spell_dmg_target:N`|enemy  |N damage to the chosen enemy creature (ARCHIVE→removed this, now JOURNEY)                                           |
|`spell_buff_temp:N` |ally   |+N ATK until end of turn (`tempAtkBonus`, see below) — ARCHIVE                                                      |
|`spell_untap`       |ally   |Removes sleeping/exhausted, can act again this turn — OBLIVION                                                      |
|`spell_dispel`      |enemy  |Strips fear/burn/atk-buffs/squad bonuses — coded (`doSpellDispelTarget`) but not currently assigned to any live card|

See “Targeted Spell System” section below for how these pause/resolve/cancel.

**Active (button/click):**

|Tag        |Effect                                                                |
|-----------|----------------------------------------------------------------------|
|`aoe:N`    |N damage to all enemies (button on card)                              |
|`heal:N`   |Heal ally N HP + remove debuffs (creature)                            |
|`sacrifice`|Altar: kill one of your creatures, +1 Essence                         |
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

Spells tagged `spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel` don’t resolve
instantly like other spells — `doPlay()` (game.js) intercepts them BEFORE calling `doSpell()`,
deducts cost, removes the card from hand, stores it in `G.pendingSpell`, and sets `G.phase` to
one of `spellDmgTarget` / `spellBuffTarget` / `spellUntapTarget` / `spellDispelTarget`. The next
click is routed by `onClick()` to the matching resolver (`doSpellDmgTarget()`,
`doSpellBuffTarget()`, `doSpellUntapTarget()`, `doSpellDispelTarget()` — all in game.js, same
pattern as `doShardTarget()`). Clicking anything invalid calls `cancelPendingSpell()`, which
**refunds** the cost and returns the card to hand (unlike Shard/Altar, which act on cards already
on the field — a spell’s cost was already paid before the pause, so cancelling shouldn’t just
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
`tempAtkBonus` is cleared explicitly in `endTurn()`’s per-turn cleanup instead.

-----

## AI Module (`js/ai.js`) — VS AI opponent

A simple rule-based bot that only reads `G` and calls the SAME functions a human
click would (`doPlay`/`doAttack`/`tryAttackBase`/`doSacrifice_target`/etc.) — it can’t
break any rule a hotseat human couldn’t also break. Runs only when
`G.mode==='vsai' && G.turn===G.aiFaction` (`runAiTurn()`).

### `AI_VERSION` vs `GAME_VERSION` — keeping the AI’s card knowledge in sync

`AI_VERSION` (top of ai.js) is a separate constant from `GAME_VERSION` (js/data.js), pinned
to whichever game version ai.js was last audited against. **Bump `AI_VERSION` to match
`GAME_VERSION` only after actually re-checking ai.js against whatever changed** — new cards,
new tags/mechanics, a new type of Active ability, a rebalance that changes what a “good” play
looks like. If you bump `GAME_VERSION` (new card, mechanic, or balance change) and DON’T touch
`AI_VERSION`, that’s a real signal the AI might now be blind to something — it’ll:

- log a `console.warn` on the very first AI turn of any VS AI game, and
- print one line to the in-game log (`⚠ AI logic last verified for v...`) at game start,

both from `_warnIfAiVersionStale()`, called once from `aiAutoMulligan()`. This is
non-blocking by design (nothing stops the AI from playing) — it’s purely so a stale-AI
situation is visible during testing instead of discovered by “huh, the AI didn’t know what
to do with the new card.”

As of `AI_VERSION`/`GAME_VERSION` `"1.0"`, the AI can legally play every card in the game
(every creature, every spell, world, and artifact — `aiPickBestCard()`/`aiScoreCard()` handle
all four types generically, not a hardcoded per-card list) and knows how to trigger every
**Active** ability that exists in the current card pool:

|Active ability        |Cards                      |AI function                                                                       |
|----------------------|---------------------------|----------------------------------------------------------------------------------|
|AOE damage            |Umbasir archetype creatures|`aiTryUseAoe()`                                                                   |
|Heal                  |Orb archetype creatures    |`aiActWithCreature()` (heals a wounded ally instead of attacking, when one exists)|
|Shard (direct dmg)    |SHARD artifact             |`aiTryUseShard()`                                                                 |
|Sacrifice (+1 essence)|ALTAR artifact             |`aiTryUseSacrifice()`                                                             |

Targeted spells (`spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel` — see
“Targeted Spell System” above) are auto-resolved by `aiResolvePendingSpellTarget()`.
Everything else that reads like a “mechanic” (provoke/bushido/pierce/fear/invisible/rage/
regen/burn/squad bonuses/auras/on-play/on-death/on-attack triggers) is enforced by the core
game functions themselves (`doAttack`, `applyAuras`, `checkSquadBonuses`, `triggerAbilities`,
…) regardless of whether AI or a human triggered them — there’s nothing extra for the AI to
“know” there, only for genuinely player-facing CHOICES (which of several legal targets/actions
to take), which is what the table above and `aiActWithCreature()`’s targeting priority
(kill > hit base > forced target) cover.

**If a new card introduces a genuinely new Active ability or targeted-choice mechanic**, it
needs its own `aiTry...()` (mirroring `aiTryUseAoe`/`aiTryUseShard`/`aiTryUseSacrifice`) wired
into `aiPlayCardsStep()`, or its own case in `aiResolvePendingSpellTarget()`/
`aiSpellHasValidTarget()` if it’s a targeted spell — then bump `AI_VERSION`. A new PASSIVE
mechanic (no choice involved — an aura, an on-trigger effect) generally needs nothing here.

### Card evaluation (`aiScoreCard()`) and `AI_WEIGHTS`

This is NOT machine learning — there’s no training data, no self-play, no gradient descent.
It’s a hand-written scoring formula, same as any other game code; “improving the AI” means
editing these numbers/conditions and checking the result against a `battle_log_*.json`
(same workflow as AI BALANCE NOTES.md already uses for creature/spell balance). Every tunable
number the formula uses lives in one place, `AI_WEIGHTS` (top of ai.js) — tag bonuses, squad
bonuses, race thresholds, spell-value multipliers — so most tuning passes are “change a number
in `AI_WEIGHTS`, replay, compare” rather than editing the scoring logic itself.

`aiScoreCard(card, me)` scores a hand card using, beyond its raw stats:

- **Squad synergy** (`aiGtypeCount()`) — a creature that would complete an archetype’s
  3-of-a-kind Squad threshold (see `SQUAD_DEFS`, “Squad System” above) scores a large bonus
  (`squadCompleteBonus`); the 1st/2nd copy toward that threshold gets a smaller one
  (`squadBuildBonus`) — the AI now actively tries to finish squads instead of spreading
  itself thin across archetypes by pure chance.
- **Race state** (`aiRaceState()`) — `'ahead'`/`'even'`/`'behind'`, from HP difference AND
  board-power difference (`effAtk` sum) together, not HP alone. When `'behind'`, stabilizing
  tags (provoke/heal/regen) get extra weight (`stabilizeTagBonus`); when `'ahead'`,
  closing-out tags (fear/pierce/burn/rage) do (`aggroTagBonus`) — this is the “risk vs play it
  safe” lever: same card, different value depending on how the game currently looks.
- **Removal spells** (`spell_dmg_target`) now score based on the actual best target they can
  kill (`removalKillBonus` + a cut of the killed creature’s own `effAtk` — killing the
  opponent’s best attacker is worth more than killing a vanilla 1/1), not a flat “spells are
  fine” score. If nothing dies, it’s scored as chip damage only, worth a bit more when already
  `'behind'`.
- **Buff spells** (`spell_buff_temp`) get a rough (provoke/bushido-blind — it’s a scoring
  estimate, the actual attack still resolves through the normal forced-target rules either
  way) lethal check: if the buffed creature’s `effAtk` would meet-or-beat the opponent’s
  current HP, that’s a large bonus (`buffLethalBonus`).
- **Revive spells** (`revive`) check the actual graveyard instead of assuming “a spell is
  always fine to play” — an empty graveyard scores negative (`reviveEmptyGraveyardScore`,
  since it’d just log “graveyard empty” and waste the card), a strong body back scores well.

**Known boundary, by design for now**: this is still a single-turn greedy evaluator — no
lookahead, no resource-holding across turns (the AI always spends everything it can afford
this turn rather than saving essence to combo two cards next turn), no full minimax on combat
math (removal/buff scoring above are targeted heuristics for those two spell shapes
specifically, not a general “simulate the rest of combat” solver). Worth revisiting if
playtesting shows the AI making a specific class of mistake these heuristics don’t cover —
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

|Phase              |Description                                          |
|-------------------|-----------------------------------------------------|
|`action`           |Normal turn                                          |
|`selectTarget`     |Creature selected, waiting for attack target         |
|`healTarget`       |Orbiton selected, waiting for heal/attack target     |
|`burn`             |Waiting for hand card to burn                        |
|`sacrificeTarget`  |Altar activated, waiting for creature to sacrifice   |
|`shardTarget`      |Shard activated, waiting for enemy creature to damage|
|`spellDmgTarget`   |Targeted-damage spell played, waiting for enemy click|
|`spellBuffTarget`  |Combat-trick spell played, waiting for ally click    |
|`spellUntapTarget` |Untap spell played, waiting for ally click           |
|`spellDispelTarget`|Dispel spell played, waiting for enemy click         |

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
  traveler’s Gate visually on its card (waiting on a design decision, see Art backlog).
  **Author calls travelers by their Gate name in conversation** (e.g. “Orbiton”, “Merchird”) —
  Claude should recognize these. Six gates, `gtype:xxx` tag → mechanical identity:
  
  |Gate name|`gtype:` tag|Mechanical tags (typical)       |Ability                             |
  |---------|------------|--------------------------------|------------------------------------|
  |Szarg    |`szg`       |`vanguard` (+regen/fear/burn)   |Squad: Pierce.                      |
  |Orbiton  |`orb`       |`heal:1` (+vanguard/fear/burn)  |Active: Heal 1 HP. Squad: Heal 2.   |
  |Dreegan  |`drg`       |`provoke` (+regen/fear/vanguard)|Squad: +1 HP.                       |
  |Umbasir  |`umb`       |`aoe:1` (+regen/fear/vanguard)  |Active: AOE 1 dmg. Squad: AOE 2 dmg.|
  |Merchird |`mch`       |`pierce` (+rage/regen/burn)     |Squad: +1 ATK.                      |
  |Xuiqtr   |`xui`       |`regen:1` (+fear/burn/aoe:1)    |Squad: Regen 2.                     |
  
  Each traveler carries its Gate’s core mechanical tag + `gtype:xxx`, plus sometimes one extra
  flavor tag (regen/fear/burn/vanguard/rage) justified by its NFT Mood trait (see below). The
  Squad line is each Gate’s 3-same-Gate-on-field bonus (see Squad System); Umbasir/Orbiton
  additionally get an Active (button) ability regardless of squad count.
- **Mood** (the eye/face area) — justifies extra ability tags. Example: a skull Mood is the
  lore reason a traveler carries the `fear` tag. When adding/rebalancing traveler cards,
  check the actual NFT’s traits — a tag should have a visible trait justifying it.
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

> **Universe Primer** *(заполнить автору — 10-20 строк ключевых фактов вселенной из Архива:
> кто такие Путешественники, что такое Таверна и Ядро, кем являются Tea и Jeet, что за
> событие породило конфликт, какие сущности существуют помимо Путешественников).*

-----

## Art Integration (Implemented)

PNGs live in `/img/cards/` (107 files as of writing, named `NNN_Name.png` or plain `N.png`).

Card art is **not** put in the `art` field (that’s reserved for the emoji fallback). Instead, add an `img` key to the card def in `data.js`:

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

**Current sound → meaning map** (see README.md “Audio” table for the plain-language version):

|Sound                                          |Fires from                                                                                                                                                                                                                                                                                               |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`card_atack` / `card_fire_atack` / `debaf`     |`playAttackSfx()` + the `willFear`/`willBurn` prediction in `doAttack()` (game.js) — attack sound is suppressed when Fear or Burn will actually land on a surviving target; `card_fire_atack` plays instead from the `case 'burn':` handler in abilities.js, `debaf` from `case 'fear':`                 |
|`card_spell_atack`                             |Playing a spell (`render.js` play button), `case 'aoe':` in abilities.js (covers both active AOE buttons and on-enter AOE), `doShardTarget()`/`doSacrifice_target()` in game.js                                                                                                                          |
|`open_door`                                    |`openGates()`, `doWorld()`/`doArtifact()`, `toggleHamburger()` (only when opening)                                                                                                                                                                                                                       |
|`baf`                                          |Rage (abilities.js), active heal-ally (inline in `onClick()`’s `healTarget` branch in game.js — **not** the `hp_add`/`ctx.target` case in abilities.js, that branch is currently unreachable dead code), regen tick (abilities.js), aura buff in `applyAuras()` (game.js, delayed 150ms via `setTimeout`)|
|`yellow_buttom_play_endturn_menu_gravyard_loop`|The default “generic button” sound — if you add a new plain UI button, this is almost certainly what it should use                                                                                                                                                                                       |

If a sound isn’t firing, check in order: (1) is the name spelled identically to the file, minus `.wav`/`.mp3`? (2) is it in `SFX_FILES`? (3) is the call actually on the code path that runs (e.g. active-ability flows are sometimes implemented twice — once as a generic `abilities.js` case, once as a bespoke inline handler in `game.js` — only one of them is actually wired to the UI).

-----

## Tooltip System

One shared `<div id="card-tooltip">` (bottom of `index.html`), driven by a single delegated `mousemove` listener in `js/ui.js`. Desktop-only by design — built on mouse events, not touch; any tooltip that appears on mobile via tap is an incidental browser hover-simulation, not supported behavior.

- `TOOLTIP_TRIGGER_SELECTOR` — CSS selector listing every hoverable target (tags, cost, type-dot, essence bar, etc.)
- `_tooltipDataFor(el)` — returns `{name, desc}` for a given hovered element; `name` may be `''` to render only the `desc` line
- Delay: `TOOLTIP_SHOW_DELAY` (500ms) — a per-element timer starts on entering a new target and is cancelled if the cursor leaves before it fires, so brief mouse-throughs never flash a tooltip
- Reveal animation: `.card-tooltip.tt-visible` scales in from its own center (`transform:scale(0.85)→scale(1)` + opacity), not a plain fade

To add a new tooltip target: add the selector to `TOOLTIP_TRIGGER_SELECTOR`, add a case to `_tooltipDataFor()`, and if the content is dynamic, stash it in a `data-*` attribute on the element when it’s rendered (see `.card-type-dot`’s `data-type` or `.stat-ess-box`’s `data-max` for the pattern) rather than trying to compute it inside the tooltip handler itself.

**Gotcha:** an element needs actual pointer events to be hoverable — `pointer-events:none` silently breaks its tooltip (this happened to `.card-type-dot` and looked like a JS bug but was pure CSS).

-----

## Planned Features

Done since this doc was first written — kept here so it isn’t re-proposed:

- [x] AI opponent (`js/ai.js` — `runAiTurn()`, `aiPlayCardsStep()`, hooked up via `startGameVsAI()`)
- [x] PNG card art integration (107 files in `img/cards/`, `img` field on card defs)
- [x] Background music + full SFX set (`js/ui.js` — `toggleMusic()`, `playSfx()`; attack/spell/buff/debuff/UI sounds wired across `game.js` and `abilities.js`)
- [x] Hand-zone side rails (`hands_border.png`/`hands_border2.png`) — player’s rail width tracks the Zoom/Burn button size (`--card-action-btn-w`), opponent’s is fixed; mobile drops to a fixed-width variant on both (carousel scrolls under it, no reserved padding there)
- [x] Squad threshold lowered 3→2 (was rarely achievable with 1 copy of each of 4 unique cards per archetype)
- [x] Screen-edge glow + zone-shake on base dmg/heal — scoped to the actual *viewer* (human in vsAI, regardless of whose turn; G.turn in hotseat), not G.turn naively — this distinction was a real bug (vsAI human never saw their own base’s feedback)
- [x] Base HP visual tiers 1-5 (`hpTier()` in state.js) — drives both the full stats-bar panel background (`bg_statbar_<faction><1-5>.png`) and (currently placeholder, same art all 5 tiers) the base “portal” icon
- [x] Lore page redesign — `lore_pages.png` frame, readable sepia ink color, halved line-height, centered headers, weaker glitch, arena starfield background
- [x] AI: burns cards for essence ramp, uses Shard’s active ability, uses Umbasir’s AOE active, evaluates Unseen/bounce against board state instead of always playing it, defensive try/catch around card-play and attack steps so one bad interaction can’t silently freeze the rest of the AI’s turn
- [x] Targeted spells — ARCHIVE (combat trick, +2 ATK ally), JOURNEY (3 dmg to enemy creature), OBLIVION (untap ally) — see “Targeted Spell System” section
- [x] THE BOOK reworked from draw:1/turn → ess_add:1/turn (Tea had 3 stacked unconditional draw engines: Teantist+Valley+Book)
- [x] ALTAR sacrifice gives a baseline +1 Essence now, not just synergy-or-nothing with Hunger/Reaper
- [x] PHLEGMOR’s raise restricted to own graveyard (used to also pull from the opponent’s)
- [x] Deck size picker — `full`/`compact`/`mini` via `DECK_CONFIGS` (see Deck size configs above)
- [x] Battle log: hidden per-turn snapshots (hand/field/essence) for balance analysis, save-to-JSON button on the win modal, cleared properly on restart (wasn’t before)
- [x] Space bar confirms whichever modal is open (mulligan/pass/win/confirm) before falling back to End Turn
- [x] Pass-the-device screen now shows after every hotseat turn, not just the initial Tea→Jeet handoff
- [x] Win modal no longer re-fires after the base is already dead (AI would sometimes keep attacking/re-triggering it)
- [x] Restart button on the win modal — replays with the same mode/faction/deckConfig, no need to go through the landing again
- [x] Deck picker: `Full`/`Compact`/`Mini` collapsed to `Classic`/`Rush` — Compact removed, Full renamed Classic (unchanged composition), Mini’s fixed list replaced by the Rush deckbuilder (below)
- [x] Rush deckbuilder screen (`js/deckbuilder.js`) — human picks own min-28 deck from the Classic-sized pool (`getRushPool()`); AI gets an auto-sampled Rush deck (`buildAiRushDeck()`) in VS AI
- [x] Rush deck JSON export/import (`dbExportDeck()`/`dbImportDeck()` in deckbuilder.js) + `GAME_VERSION` constant (`js/data.js`, currently `"1.0"`) stamped into both deck exports and battle logs, so a stale save can be flagged instead of silently misapplied
- [x] AI card/mechanic audit + `AI_VERSION` pinned to `GAME_VERSION` (both `"1.0"`) — see “AI Module” section above. Found and fixed one real gap: the AI never used the ALTAR artifact’s sacrifice-for-essence Active ability (`aiTryUseSacrifice()` in ai.js); AOE/Shard/Heal were already covered. Drift between `AI_VERSION` and `GAME_VERSION` now surfaces automatically (console + in-game log) at the start of a VS AI game instead of silently going stale.
- [x] AI card evaluation rework (`aiScoreCard()`/`AI_WEIGHTS` in ai.js) — board-aware Squad-completion bonus, HP+board-power race state driving risk-vs-stable tag weighting, removal/buff/revive spells scored against actual board state instead of a flat “spells are fine” number. Verified against mock game states (see commit notes) rather than a live playtest — worth a real VS AI session to confirm it “feels” better, not just numerically sound.
- [x] ARCHIVE (spell_buff_temp) can no longer target sleeping/exhausted/feared allies — click routing (game.js), `.healable` highlight (render.js), and all 3 AI-side checks (ai.js) now agree on the same eligibility (`!sleeping&&!exhausted&&!feared`). Previously any own creature was clickable during the dimmed-targeting overlay, which was easy to misclick.
- [x] Targeted-spell sound played twice (once on the “Play” click, once again on target select) — fixed by skipping the immediate Play-click sound for spells that pause for a target (`_isTargetedSpell()` in render.js); their own resolver’s sound is now the only one.
- [x] Found and fixed the real cause of the stats-bar background “flashing” the real art only during the damage-shake animation, staying solid-black otherwise: `.stats-bar` needs its own explicit `z-index` (not just `position:relative`) for its `::before` art layer’s `z-index:-1` to stay correctly scoped to it — without one, `.stats-bar` only ever accidentally established a stacking context WHILE `.zone-shake`/`.zone-shake-up`’s `transform` was actively running (any non-`none` `transform` always creates a stacking context), which is exactly why the art seemed to “flash in” only mid-animation. Fixed both factions (this was never faction-specific). Also switched the opponent-slot mirror from vertical-only (`scaleY(-1)`) to a full 180° flip (`scale(-1,-1)`, both axes) on `#oppStats::before` and `#oppStats .player-name-box`, per updated art direction.
- [x] Stray extra click sound between deck-choice and faction modal — `openVsAiPicker()` replayed the button sound the deck button’s own onclick had already played 315ms earlier; removed the duplicate.
- [x] Remaining pre-mulligan flicker (classic vsAI, and identically in all other start paths) — every game-start path revealed `#game` then waited 50ms before `startMulliganFor()` raised the next solid-black overlay, leaving the bare arena visible for a frame between two black screens. The earlier `render()` fix made the flashed CONTENT correct but didn’t close the GAP; now `startMulliganFor()` is called synchronously in all 6 start paths (ui.js ×4, deckbuilder.js ×2).
- [x] **Modal “обвес”-футер, переделано на настоящую архитектуру** (`.modal-stack`/`.modal-footer-plate` in styles.css) — первая версия (`.modal-plated`, вчера) держала футер ВНУТРИ `.modal` через absolute+padding-hack, из-за чего контент визуально “толкало вверх” (сообщено на скриншоте). Теперь футер — полноценный СОСЕД `.modal`, оба висят в общей обёртке `.modal-stack`; `.modal` больше не трогается (`overflow:hidden` как обычно), контент центрируется по вертикали внутри зарезервированного отступа под плиту (`.modal-stack .modal-body`). Применено к confirmModal + winModal.
- [x] **Win-модалка: все кнопки квадратные** (`.modal-win-sq`) — Home/Repeat/Save одного формата и размера, сейчас эмодзи-плейсхолдеры (тот же визуальный язык, что раньше был только у Save), с готовыми закомментированными слотами под финальный арт `btn_home/save/repeat` 1/H/2.png (тот же конвеншн, что у yes/cancel/lore/catalog). Старый разнородный набор (текстовая art-кнопка + ham-item текст + один квадрат) убран.
- [x] Sleeping-card darkening унифицирован с exhausted (тот же `brightness(.55)`, было `.75`) + zZZ передвинут ближе к вертикальному центру карты (было у самого верхнего края) + анимация появления карты (`cardEnter`) синхронизирована с переходом на затемнение — раньше заканчивалась на `opacity:0.45` (старый вид спящей карты), теперь на `opacity:1` + `brightness(.55)`.
- [x] Подсветка доступных по эссенции карт в руке (`.hand .card.affordable`, mkEl() в render.js) — слабый золотой пульс (~1/3 интенсивности эффекта `.previewed`), только для своей руки в свой ход.
- [x] **Modal-stack: реальная причина зазора найдена и исправлена** — вчерашняя `.modal-footer-plate` версия резервировала место через `--modal-border-w` (54px, толщина ОСНОВНОЙ рамки модалки — переменная, никак не связанная с высотой самой плиты), из-за чего под текст резервировалось ~60-65px лишних (сообщено на скриншоте). Плита теперь позиционируется через `bottom:0` + `translateY(50%)` относительно `.modal-stack` (без привязки к какой-либо border-переменной вообще — центр плиты всегда точно на нижней кромке `.modal`, для любой высоты кнопок), а резерв под неё в `.modal-body` сведён к ~3px (по прямому запросу — у плиты свой непрозрачный фон, лёгкое наложение снизу ожидаемо).
- [x] Тот же `.modal-stack`/`.modal-footer-plate` паттерн распространён на `deckPickerModal`, `vsAiPickerModal`, `passScreen` (сейчас plated: confirm/win + эти три). `mulliganScreen`/`deckBuilderModal` сознательно НЕ переведены — оба скроллятся внутри (`overflow-y:auto` на самом `.modal`), тот же риск, что раньше исключил `deckBuilderModal` из вчерашней версии.
- [x] **Синхронизация pop-in/pop-out анимации плиты с рамкой** — пока футер был потомком `.modal`, анимация `.modal` тащила его за собой автоматически; после переезда на независимый `.modal-footer-plate` (сосед, не потомок) это перестало происходить само — плита мгновенно появлялась/исчезала без анимации (регрессия, появившаяся ещё во вчерашней версии, просто не была замечена). Добавлены `_modalPopIn()`/`_modalPopOut()` (ui.js) — единая точка, анимирующая `.modal` И `.modal-footer-plate` (если есть) синхронно одним классом; заменены все 10 разрозненных мест в ui.js/deckbuilder.js, ранее круглые каждое своим copy-paste блоком.
- [x] Deckbuilder: обрезание outline у выбранных карт по краям сетки — `.db-grid` паддинг по горизонтали был 2px, а `.db-selected` outline+offset выступают на ~4px за карту; `.modal`’s `overflow:hidden` обрезал выступ у крайних столбцов. Паддинг увеличен до 6px.
- [x] Affordable-hand подсветка усилена вдвое от исходной интенсивности (по запросу).
- [x] **Реальная причина “плита улетела вправо и не свисает”** (скриншот 2026-07-06, вечер) — конфликт `transform`: `.modal-pop-in`/`.modal-pop-out` (общие анимации попапа) задают `transform:scale(...)`, а `.modal-footer-plate` держит центрирование через СВОЙ статичный `transform:translate(-50%,50%)` — у элемента может быть только один `transform`, и анимация (даже с `forwards`) полностью перебивала статичное значение. Раз в ту же сессию плита стала получать те же поп-классы, что и `.modal` (синхронизация анимации, см. выше) — центрирование пропадало сразу же. Фикс: отдельные кадры `modalPlatePopIn`/`modalPlatePopOut` с `translate(-50%,50%)`, запечённым в каждый шаг, плюс более специфичное правило `.modal-footer-plate.modal-pop-in/out`, перебивающее общее.
- [x] Тот же `.modal-stack`/`.modal-footer-plate` паттерн распространён также на `mulliganScreen` и `deckBuilderModal` — оказалось безопасно и для скроллящихся модалок: раз плита теперь СОСЕД `.modal`, а не потомок, её собственный `overflow-y:auto` для внутреннего скролла контента вообще не пересекается с плитой (сняло опасение из вчерашней версии, когда footer ещё был потомком и требовал `overflow:visible` на самой модалке).
- [x] Affordable-hand подсветка усилена ещё раз (“чуть насыщенней” по запросу) — сейчас пики blur 9/18px, alpha 88/55.
- [x] **Обобщённая система иконок-кнопок для модалок** (`.modal-icon-btn` — `.sq` квадрат / `.wide` 2:1, styles.css) — раньше `.modal-win-sq` был только под win-модалку; теперь тот же формат (эмодзи-плейсхолдер + закомментированные слоты под 1/H/2-арт) используют: win-модалка (Home/Repeat/Save, было), футер дек-билдера (Import/Export/OK, было текстом), футер выбора деки (Classic/Rush, было текстом). Готовые слоты под будущий арт: `btn_home/save/repeat/imp/exp/ok/classic/rush` — все 1/H/2.png. `deckBuilderNextBtn` теперь иконка без видимого текста — статус “Next: Jeet”/“Start Game” ушёл в `title`-тултип вместо `textContent`.
- [x] **Sleeping/exhausted card states reworked** — transparency replaced with brightness darkening (sleeping .75 + animated “z Z Z” overlay in mkSmallEl, exhausted .55); the old opacity made the targeting shade itself transparent, which was the reported problem. `.pcard.sleeping` (persistent zone) still uses text opacity — left as-is deliberately, scope was battlefield cards.
- [x] Deck-picker → next-screen transition gap (“stars” flash) — `chooseDeckConfig()` was waiting only 250ms (the modal’s own pop-out) before hiding the modal, then `startGame()`/`openVsAiPicker()` each waited a FRESH 315ms on top of that before showing the next screen — landing’s own 315ms fade (started at the same moment as the modal pop-out) had long since finished, leaving a ~250ms window where nothing covered the bare `.stars` background. Fixed by waiting the full 315ms (matching landing’s transition exactly) before hiding the modal, so the next screen can appear immediately with no additional delay.
- [x] **VS AI landing button — no click sound** — `art-btn-vsai`’s `onclick` was missing the
  `playSfx('yellow_buttom_play_endturn_menu_gravyard_loop')` call that `art-btn-hotseat` right
  next to it already had (index.html). Simple omission, not a delegated-listener bug — added.
- [x] **Иллюминатор налезал на бокс кнопок на низких экранах** — `.landing-porthole` сайзился
  только от `72vw` (ширина), `.landing-porthole-slot`(`flex:1`) центрирует контент, но НЕ сжимает
  его — на коротких viewport (альбомная ориентация телефона и т.п.) иллюминатор физически не
  помещался в оставшееся место и наезжал на `.landing-box` (у которой фиксированная px-высота,
  не vh). Добавлен третий потолок в `min()`: `min(273.6px, 72vw, 34vh)` — теперь иллюминатор
  ограничен и по высоте экрана тоже. Группировку `.landing-porthole-slot`+`.landing-box` в один
  flex-контейнер НЕ делали (риск переверстать весь лендинг ради одного бага) — если 34vh
  когда-нибудь окажется мало на совсем экстремальном экране, можно потом уменьшить.

Still open (не привязано к конкретной версии):

- [ ] Remaining traveler cards + art (60 planned total, ~75 defs exist but not all have unique art matched — verify against `img/cards/`)

-----

## Backlog — Code (prioritized 2026-07-06, реорганизовано 2026-07-07)

*Единый взвешенный список: сюда слиты бывший Feedback Backlog 2026-07-05, заметки художника
по коду и задачи сессии 2026-07-06. Начиная с 2026-07-07 P1 ниже — просто журнал сделанного
(Done), открытые задачи живут в “Приоритет — завтра” под ним; всё, что касается баланса/
механик, переехало в отдельный Roadmap (Version 1.01/2.0) сразу за этим разделом.*

### P1 — сделано (журнал)

- [x] ~**Спящие карты**: вместо прозрачности — индикатор «z Z Z»~ — сделано 2026-07-06
  (см. Done list): brightness-затемнение вместо прозрачности + анимированный zZZ; уставшие
  затемняются сильнее. `.pcard` в персистентной зоне не трогали.
- [x] ~**Подсветка доступных карт в руке**~ — сделано 2026-07-06 (см. Done list): слабый
  золотой пульс, ~1/3 интенсивности `.previewed`.
- [x] ~**Untap (OBLIVION) фидбек**~ — сделано 2026-07-07 вместе с Targeted-spell UX ниже (тот
  же оверлей закрывает оба пункта: OBLIVION — это `spellUntapTarget`, один из 4 фаз, которые
  теперь показывают оверлей).
- [x] ~**Targeted-spell UX**~ — сделано 2026-07-07: `#targetPromptOverlay` (index.html,
  внутри `.player-hand-zone`) перекрывает всю зону руки на время `spellDmgTarget`/
  `spellBuffTarget`/`spellDispelTarget`/`spellUntapTarget` (см. `render()` в render.js) —
  надпись “CHOOSE TARGET” + “CLICK HERE TO CANCEL” на пульсирующем красном фоне. Клик по
  оверлею вызывает `cancelPendingSpell()` — тот же цикл отмены с рефандом, что и раньше
  срабатывал при клике по карте в руке; поведение не сломано, просто явное. `stopPropagation`
  не даёт клику улететь в `handleGameClick()`. ДОРАБОТАНО в этой же сессии по фидбеку: размер
  шрифта был завязан на vh (высоту `.player-hand-zone`) — на узких телефонах не влезало в
  строку; переведено на vw (ширина экрана, у `.game` нет max-width) с px-потолком. Заодно
  приглушены фон (был насыщенно-красный) и мигание (было `steps(1,end)` — жёсткий флик,
  заменено на плавную ease-in-out пульсацию 1↔0.55) — по фидбеку выглядело слишком агрессивно.
  ЕЩЁ РАЗ доработано в этой же сессии (второй заход): размер шрифта переведён с vh на vw (был
  всё ещё “слишком широким” на телефоне после первого фикса), фон сделан в разы бледнее,
  мигание смягчено (плавная пульсация вместо резкого флика). Автор ещё думает над рамкой/
  подложкой под текст — см. “На подумать” ниже.
- [x] ~**OBLIVION можно было впустую нажать на не спящую/уставшую карту**~ — сделано
  2026-07-08 (исправлено повторно по уточнению автора — первая версия фикса трогала не то:
  зумленную карту трогать не нужно было, там и так поведение как у обычной маленькой карты,
  специально ничего не делали). Реальная проблема была в `onClick()` (game.js, фаза
  `spellUntapTarget`): клик по своей карте засчитывался целью независимо от того, спит/устала
  ли она — можно было случайно потратить заклинание на карту, которая и так уже может
  действовать. Добавлено условие `(card.sleeping||card.exhausted)` — клик по активной своей
  карте теперь просто отменяет применение (как клик по любой другой невалидной цели), как и
  остальные точечные заклинания. AI (`ai.js`) уже фильтровал кандидатов так же — трогать не
  пришлось.
- [x] ~**Фон подсказок бафов/дебафов на зумленной карте**~ — сделано 2026-07-08: `.card-status-row`
  (styles.css) приведён к тому же виду, что и обычный тултип по наведению (`.card-tooltip`) —
  `#0c0c18ee` фон, рамка `#9B937F`, тень `#CBBE9A66`, вместо отдельного более тёмного/золотого
  варианта.
- [x] ~**Фон/рамка под “CHOOSE TARGET”/“CLICK HERE TO CANCEL”**~ — сделано 2026-07-08: текст
  обёрнут в `.target-prompt-box` (index.html + styles.css) — тёмная полупрозрачная подложка +
  тонкая рамка в цвет текста, существующая пульсация фона/текста не тронута. Закрывает пункт
  из “На подумать” ниже.
- [x] ~**Подсказки (тултипы) периодически всплывали на телефоне**~ — сделано 2026-07-08:
  подсказки и раньше были задуманы desktop-only (завязаны на `mousemove`), но некоторые
  мобильные браузеры после тапа всё равно шлют синтетическое mousemove — из-за этого подсказка
  иногда мелькала и мешала визуалу (фидбек автора). Добавлен жёсткий флаг `IS_TOUCH_DEVICE`
  (`'ontouchstart' in window || navigator.maxTouchPoints>0`) в ui.js — обработчик `mousemove`
  теперь сразу выходит на тач-устройствах, плюс `touchstart` принудительно гасит подсказку,
  если она всё же успела показаться. На устройствах с реальной мышью поведение не изменилось.
- [x] ~**Анимация полёта карты из колоды в руку**~ — сделано 2026-07-08: `_flyCardFromDeck()`
  - `_deckPlaceholderRect()` (render.js) — при появлении новой карты в СВОЕЙ открытой руке
    (`rZone`, zone===‘hand’) от плейсхолдера колоды (`#deckPlaceholderT`/`#deckPlaceholderJ`)
    до места карты летит спрайт-рубашка (`runaha.png`, новый `.card-fly-sprite` в styles.css),
    тает в последние ~140мс полёта (300мс, `CARD_FLY_MS`). Настоящая карта на это время спрятана
    (`animation-delay`+`fill-mode:both` на уже существующем `.card-drawn`) и проявляется своим
    обычным fade ровно к моменту, когда спрайт исчезает — иллюзия единого “прилёта”. Несколько
    карт разом (начало партии/большой добор) — вылетают со сдвигом 90мс друг за другом, а не
    одновременно. Если плейсхолдер колоды сейчас не виден (`offsetParent===null`, напр. скрыт
    под модалкой муллигана/деколадера) — полёт просто пропускается, карта появляется как раньше,
    обычным fade без спрайта. ОБЛАСТЬ: только своя открытая рука; чужая скрытая рука
    (`rHiddenHand`, рубашки без данных) не анимирована — не диффит новые/старые элементы по id,
    добавление аккуратного отслеживания туда не входило в этот заход, при необходимости можно
    сделать отдельным пунктом.
- [x] ~**Подложка “CHOOSE TARGET” была полупрозрачной**~ — сделано 2026-07-08: `.target-prompt-box`
  (styles.css) — фон сделан полностью непрозрачным (`rgba(10,4,4,1)`), рамка/тень не тронуты.
- [x] ~**OBLIVION: клик по активной карте отменял заклинание**~ — сделано 2026-07-08, по
  уточнению автора: раньше клик по своей уже активной (не спящей/уставшей) карте отменял
  заклинание целиком (рефанд). Теперь такой клик просто ничего не делает — заклинание остаётся
  в ожидании валидной цели; отмена по-прежнему доступна через `#targetPromptOverlay` (клик
  “CLICK HERE TO CANCEL”) или клик по чужой карте/другой недопустимой цели.
- [x] ~**Всплывающие тексты-плейсхолдеры для ещё не покрытых эффектов**~ — сделано 2026-07-08,
  через существующий `queueFieldFx()` (тот же механизм, что уже дал SQUAD!/FEARED!/-SQUAD/
  CLEANED — см. Art backlog “Анимации”, автор потом заменит текст на гифки): OBLIVION успешно
  активировал карту → “AWAKENED!” (`fx-untap`); карта принесена в жертву Алтарю → “SACRIFICED!”
  (`fx-sacrifice`); урон от Shard-артефакта → “SHARD!” (`fx-shard`); точечный урон от
  заклинания (`spell_dmg_target`) → “HIT!” (`fx-spell-dmg`), рядом с уже существующей цифрой
  урона; точечный баф от заклинания (`spell_buff_temp`) → “BUFFED!” (`fx-spell-buff`), рядом с
  уже существующей цифрой `+ATK`. Все пять — новые CSS-классы в styles.css рядом с
  `fx-cleaned`/`fx-fear`.
- [x] ~**Хил → попап с кнопкой**~ — сделано 2026-07-08, доработано в этой же сессии по
  фидбеку (первая версия была неверной — хил всё ещё запускался сразу по клику на существо,
  просто с оверлеем поверх). Теперь хилер ведёт себя как Umbasir/Vardan (AOE): клик по
  существу просто выделяет его (`selectTarget`, как у любого другого атакующего — можно сразу
  бить врага/базу напрямую), и ТОЛЬКО ЕСЛИ есть кого хилить (своя не-spell/world/artifact карта
  с hp<maxHp), над ним всплывает попап-кнопка (`.fab-btn.heal`, тот же `.field-ability-popup`,
  что и у AOE-кнопки). Клик по НЕЙ — и только по ней — переводит в `healTarget` с уже готовым
  паттерном (подсветка целей + оверлей `#targetPromptOverlay` для отмены по зоне руки).
  Плейсхолдер картинки — `img/btn_heal.png` (файла пока нет, автор подключит свой позже, как
  и `btn_spell.png` для AOE).
  ДОБАВЛЕНО в этой же сессии по фидбегу: кнопка технически появлялась, но была НЕВИДИМА —
  `background-image` с несуществующим путём рендерится пустым местом, а не “битой картинкой”,
  и у `.fab-btn` больше не было своего фона/рамки. Добавлен видимый фолбэк на `.fab-btn.heal`
  (зелёная заливка + рамка + сердечко `::after`) — как только появится реальный
  `img/btn_heal.png`, он ляжет НАД этим фолбэком (два `background-image` через запятую,
  картинка первая), фолбэк можно будет убрать отдельным пунктом.
- [x] ~**Зеркалирование X/Y для остальных декоративных плейсхолдеров**~ — сделано 2026-07-08,
  переделано в этой же сессии по фидбеку (первая версия отражала каждый плейсхолдер НА СВОЁМ
  МЕСТЕ — только контент/ориентация, позиция на панели не менялась; автор указал, что нужно
  СВЕТ, а не просто зеркало на месте: объект из правого верхнего угла у нас должен оказаться в
  левом нижнем у оппонента, т.е. вся панель разворачивается на 180° вокруг центра — меняются
  местами И позиция, И ориентация одновременно). Исправлено:
  — pcard (Мир/Артефакт) + hp-placeholder + statbar-extra — обычные flex-элементы в потоке,
  их новая позиция теперь получается ПРОСТЫМ РАЗВОРОТОМ ПОРЯДКА всего ряда (`_mkStatsBarHtml`
  в render.js, `[...].reverse()`) — этого одного достаточно, чтобы автоматически расставить их
  по противоположным сторonам, как при повороте на 180°. pcard остаётся нечитаемым для
  зеркала контентом — не трогаем; hp-placeholder/statbar-extra дополнительно отражаются
  transform’ом в styles.css (позиция уже верная через reverse, отражается только содержимое).
  — HP-box/Essence-box ВНУТРИ `statbar-core` — reverse() всего ряда не заглядывает внутрь
  одного блока, поэтому их порядок (`hp-name-ess` ↔ `ess-name-hp`) по-прежнему флипается
  отдельным условием на `mirrored`, как и раньше.
  — `.statbar-edge-left/-right/-right-2` — `position:absolute`, порядок в разметке на их
  позицию не влияет никак, поэтому им прописаны ЯВНЫЕ зеркальные координаты в styles.css
  (`#oppStats .statbar-edge-*`): left↔right меняются местами (не просто “тот же left/right,
  но контент перевёрнут”, как было раньше), а tea-шный угловой край (`top:0;right:0`,
  art trubi1.png) теперь уходит в буквально противоположный угол панели (`bottom:0;left:0`).

### Приоритет — завтра

- [x] ~**Кнопка “назад” во всех модалках до муллигана**~ — сделано 2026-07-08. mulliganScreen
  подтверждённо БЕЗ кнопки. Финальные позиция/размер/арт (несколько раз менялись за день) —
  см. консолидированную запись “Красивая модалка декбилдера” чуть ниже, там же и навигация:
  — `backFromDeckPicker()`/`backFromVsAiPicker()` (ui.js), `backFromDeckBuilder()`
  (deckbuilder.js, черновик Rush аннулируется целиком, независимо от шага).
- [x] ~**Красивая модалка декбилдера (2 этапа + доводка)**~ — сделано 2026-07-08, финальное
  состояние ниже (по ходу дела несколько раз переделывались зум и позиция кнопки “назад» —
  тут только итог, не история промежуточных попыток):
  — **Два окна**: слева выбранная колода (`#deckBuilderChosenGrid`), справа весь пул
  (`#deckBuilderPoolGrid`) — клик по карте в пуле перебрасывает её в выбранное и наоборот.
  Заклинания с несколькими копиями (`max>1` в `getRushPool()`) рисуются одной “стопкой”
  (`_dbStackEl()` в deckbuilder.js) — верхняя карта + 1-2 тени-слоя со сдвигом
  (`.db-stack-layer`, `--layer-i`), БЕЗ рамок/подсветок и БЕЗ цифр-бейджей — только тени.
  — **Хедер** (не скроллится, отдельный flex-ребёнок `.modal`, вне `.modal-body`):
  заголовок → разделитель → вторая строка (статистика+кривая маны слева, фильтры справа,
  разделитель между ними). На мобильном (`≤600px`) фильтры уходят на ТРЕТЬЮ строку через
  `flex-wrap` (без изменения HTML/DOM), у стата+кривой равномерные отступы
  (`justify-content:space-evenly`).
  — **Статичный размер**: `#deckBuilderModal .modal` — `width:95vw;height:88vh` (жёстко, не
  auto-по-контенту — раньше “прыгала” при смене фильтра и не растягивалась на широких
  экранах из-за того, что `.modal` — flex-item без `flex-grow`, а `width:auto` для него
  значит “ужаться по контенту”, а не “занять всё доступное”). Рамка тоньше стандартной
  (`--modal-border-w:27px` вместо 54px, `border-image-slice:54` вместо 108) — своя, не
  трогает остальные модалки. Арт рамки — `bg_modal_deck.png` (уже подключен).
  — **Сетка карт**: 3 колонки везде (было пробовали 5/4 — на телефоне слишком тесно, карта
  ломается). Размер карты — `min(cqw-формула, var(--cat-card-w))`, тот же приём, что у
  Каталога, с потолком в каталожный дефолтный размер. Отступы на десктопе НЕсимметричные
  (по просьбе автора) — `row-gap:10px` (2×), `column-gap:2.5px` (0.5×); на телефоне
  обычный симметричный `gap:5px`.
  — **Мобильная раскладка (`≤600px`)**: НЕ лево/право (тесно), а верх/низ — сверху весь пул,
  снизу выбранное, каждая половина на всю ширину экрана СО СВОИМ независимым скроллом
  (`.db-pane{overflow-y:auto}` у каждой панели отдельно, а не общий скролл на
  `.modal-body`). Визуальный порядок — через `order` (CSS), DOM не трогали.
  — **Зум по долгому нажатию**: после трёх неудачных попыток (клонирование теряло cqw-размеры;
  копирование “готовых” значений через `getComputedStyle` тоже не работало — незарегистрированные
  custom-свойства без `@property` отдают через `getComputedStyle` СЫРОЙ ТЕКСТ формулы, а не
  число в px) — решение: **не** пытаться перенести cqw-размеры вообще, а переиспользовать
  готовый `showFieldCardPreview()`/`closeFieldCardPreview()` из render.js (тот же зум, что у
  карт поля/руки в игре) — он строит карту заново через `mkEl()` на обычных vh-переменных
  `:root`, которые всегда резолвятся корректно вне зависимости от DOM-контекста.
  `_dbPreviewCard(faction,key,def)` в deckbuilder.js собирает “карту” из `DEFS[key]` с
  синтетическим id (плюс `maxHp:def.hp`, т.к. mkEl ждёт `card.maxHp`, а в DEFS только `.hp`).
  Масштаб — `1.6` (тот же `HAND_ZOOM_SCALE`, что и в игре). Долгое нажатие открывает,
  отпускание закрывает — тот же паттерн, что и у зума карт поля (не свой backdrop с кликом).
  — **Подсказки при наведении** — уже работали “из коробки” на большинстве атрибутов
  (глобальный `mousemove`-слушатель в ui.js), но у `.card-tag-icon` не было `data-tag`, а у
  `.card-hp-box` не было `data-hp`/`data-maxhp` (показывало “undefined/undefined HP”) —
  добавлены в `_dbCardEl()`. Заодно та же дыра нашлась и почищена в Каталоге
  (`js/catalog.js`, и сетка, и `openCardDetail()` — там ЕЩЁ и `pointer-events:none` на
  обёртке мешал, убрано).
  — **CRT-экран** (`.modal-crt-screen` в styles.css) добавлен на все модалки с “просто
  текстом” (deckPicker/vsAiPicker/confirm/win) и на mulliganScreen/passScreen — тёмно-зелёный
  фон + толстые (3px) линии скана + виньетка, тот же стиль перенесён и на боевой лог (`.log`,
  было 2px линии — стало тоже 3px, единый вид). У мулигана карты (`#mulliganCards`)
  ПОДНЯТЫ над полосами (`z-index:3`) — на картах полосы смотрелись плохо, на тексте это и
  есть задуманная стилизация. `padding:0` на `.modal-body` этих модалок — иначе CRT-экран не
  доходил до края рамки (не растягивался на всю плитку).
  — **Кнопка “назад”**: в deckPicker/vsAiPicker — угловая, `position:absolute` СИБЛИНГ внутри
  `.modal-stack` (НЕ потомок `.modal` — иначе обрезает `overflow:hidden/auto` у `.modal`, та
  же история, что у `.modal-footer-plate`), в нижнем левом углу (`bottom:0;left:0`), размер —
  РОВНО толщина рамки (`--modal-border-w`, был сначала вдвое меньше). Свой арт
  `btn_back_corner1/H/2.png` (класс `.btn-back-corner`, ОТДЕЛЬНЫЙ от футерного `.btn-back`).
  В deckBuilderModal — этой угловой кнопки НЕТ вообще, “назад” переехала в общий ряд кнопок
  футера, первой по счёту, тот же `.sq` размер, что Clear/Import/Export/OK (арт для неё пока
  `btn_back1/H/2.png` на плейсхолдере — ждём).
  — **Мана-кривая**: цвет по фракции (`#5BDF7A` Tea / `#b44fd4` Jeet, класс `tea-curve`/
  `jeet-curve` на `#deckBuilderCurve`, ставится в `_renderDbCurve()`), квадратная (не
  растянута на всю ширину футера), высота = высоте блока статистики рядом.
  — **Кнопка “Очистить”** — первая в футере (после back), сбрасывает `_db.picks[faction]`
  целиком.
  — **Разные попутные фиксы**: `<html>` не имел `overflow-x:hidden` (только `<body>`) — на
  мобильном Safari `<html>` часто и есть реальный скроллящийся элемент, добавлено (плюс
  `overflow:hidden` на `.modal-overlay` подстраховкой). Classic/Rush кнопки были
  `aspect-ratio:2/1` — почти вдвое выше кнопки Yes (`3/1`) — приведены к `3/1`.
  Стиль (не логика): скопирован конвеншн плейсхолдеров — `background-image` под три
  состояния (idle/hover/active) можно прописывать НЕзакомментированным сразу (несуществующий
  файл просто не подгружается, класс `.placeholder` даёт видимую заглушку) — когда автор
  кладёт реальные файлы, достаточно убрать `placeholder` из HTML, CSS трогать не надо.
- [x] ~**Подключить звуки от Муры**~ — сделано 2026-07-08 (сессия автора), актуализировано
  2026-07-09: все файлы подключены, чеклист ниже полностью отмечен. Три НОВЫХ звука ждём
  отдельно (не от старой пачки) — см. Sound checklist ниже, свежая пометка “жду от Муры”.
- [x] ~**Анимация перехода “ворота открываются”**~ — идея с воротами снята автором
  2026-07-09 (арт для неё так и не понадобился), вместо неё сделан отдельный переход
  муллиган → арена, целиком на коде, без арта:
  — Верхняя полоса (статус оппонента + его рука) выезжает сверху вниз ЕДИНЫМ блоком, нижняя
  (рука игрока + его статус + активный `teaBottomBar`/`jeetBottomBar`) — снизу вверх, тоже
  единым блоком. “Единый блок” — не общий DOM-контейнер, а одинаковая пиксельная дистанция
  (CSS-переменная `--slide-dist`, считается в JS как суммарная высота группы) для всех
  элементов группы при `delay:0`; если бы каждый элемент ехал на свои `100%` высоты, разные
  по росту полосы двигались бы с разной скоростью и группа “тянулась” бы визуально.
  — Поля боя (`oppFieldZone`/`playerFieldZone`) в этой анимации НЕ едут — внутри них живут
  декоративные `.field-star` (см. `spawnStars()`), которые как прямые дети контейнера иначе
  ехали бы вертикально вместе с ним поверх собственного мерцания (смотрелось странно).
  Вместо этого звёзды получают отдельный “вырост из точки” (`.field-star-grow-in`,
  `starGrowIn` keyframe — scale 0→1, transform-origin по умолчанию центр).
  — Поверх всего один раз выезжает надпись “Battle begins!” (`#battleBeginsText`/
  `#battleBeginsInner`) — вырастает из центра (scale 0→1) в точке шва между
  `oppFieldZone`/`playerFieldZone` (не центр экрана, чуть выше), держится и пульсирует 1с
  красным, затем уходит в fade. Font-size не захардкожен — меряется фактическая ширина
  отрисованного текста и подгоняется под 40% ширины окна (шрифт `MEK` кастомный, точные
  метрики глифов заранее неизвестны).
  — Вся логика — `playArenaRevealAnimation()`/`_playFieldStarsGrowIn()`/
  `_playBattleBeginsText()` в `ui.js`, вызывается из обеих точек `readyFromMulligan()`
  (vsAI и hotseat-ветка) вместо старого плоского `game-fade-in`. Новые keyframes/классы —
  `styles.css`, рядом со старым `.game-fade-in` (оставлен как есть, просто больше не
  используется в этих двух местах).

-----

## Roadmap — версии (реорганизовано 2026-07-07)

*По прямому запросу автора: механики/баланс сознательно НЕ трогаем прямо сейчас — копятся
списком на потом (Version 1.01). Крупные технически самостоятельные блоки — ещё дальше
(Version 2.0), к ним не возвращаемся, пока не решим всё остальное.*

### Version 1.01 — контент и баланс (начали делать, перебивать версию игру на 1.01 еще рано,
но 1.0 уже не до конца честные)

- [x] Unseen: cost 0 (сейчас не 0 — см. `data.js`)
- [ ] Случайный выбор кто ходит первым/вторым — момент решения ПЕРЕД муллиганом (сейчас
  жёстко: Tea всегда первый, Jeet всегда второй и получает Unseen). Второй игрок при этом
  должен получать 5 карт + Unseen сразу в стартовую руку (уточнить у автора: обычная стартовая
  рука УЖЕ 5 карт — см. `newPlayer()` в state.js, `hand:d.splice(0,5)` — значит “5 карт +
  Unseen” может значить 6 карт вместе с Unseen, а не 5 включая его; сверить перед реализацией).
  Хардкод “jeet как 2й игрок” сейчас в двух местах: `_finishRushBuild()` (deckbuilder.js) и
  `buildDeck()` (deck.js) — оба надо трогать разом.
- [ ] Точечная активка-спелл: добавить карте способность, которая по клику на кнопку активки
  наносит урон ОДНОЙ выбранной цели (например «3 урона»), не AOE и не хил — сейчас у существ
  активки только этих двух типов. Уточнено автором 2026-07-07.
- [ ] Новый тег: +X ATK за каждое сыгранное заклинание — решить рамки (за ход или за игру,
  свои спеллы или все), затем: тег в `data.js` + обработчик + строка в Tag System.
- [ ] Заклинание, дающее +урон НАВСЕГДА (постоянный бонус урона, не до конца хода как
  `spell_buff_temp`) — уточнить у автора: это баф существу (постоянный ATK-бонус, отдельный от
  разового боевого трюка) или что-то ещё; после уточнения решить, отдельный это тег/эффект или
  вариант существующего `spell_buff_temp` без сброса в конце хода.
- [ ] THE BOOK (`ess_add:1`/ход) — слишком просто/слабо, пересмотреть механику.
- [ ] ALTAR — базовый пейофф (+1 эссенция за жертву) шаг в нужную сторону, но не финал.
- [ ] Механика «Броня».
- [ ] Потолок эссенции — ограничить 10? (вопрос баланса — см. темп партий в AI BALANCE NOTES)
- [ ] Макс HP базы — поднять до 30? (тот же вопрос темпа)
- [x] Протестить механику: если существо уставшее, то не должно давать “ответку” (встречный урон себе-в-атакующего),
  и карта подействовашая в свой ход, не перестает быть уставшей в течение хода противника.

### Version 2.0 — большие блоки, не возвращаться пока

- [ ] Тренировочная игра (демо) — заскриптованная обучающая партия с комментариями и
  анимациями для новичков. Скриптовый движок поверх game.js + контент сценария.
- [ ] Онлайн-мультиплеер
- [ ] Web3 / NFT-интеграция (проверка владения NFT)
- [ ] Расширение состава существ на поле (кроме Путешественников и 1/1) — БЛОКИРОВАНО лором:
  сначала обоснование из Архива (см. Lore-раздел выше), потом дизайн, потом код.

-----

## На подумать (без решения, не приоритизировано)

- [ ] Тип Врат (Gate) — куда и как визуально разместить на карте. Пересекается с Lore-разделом
  выше и с пунктом “Карты” в Art backlog ниже.
- [ ] Лор-страница, Правила, Каталог — доработка дизайна и вёрстки. В основном дизайн/арт-задачи.

### Отдельно: на паузе у автора

- Ссылки Discord/Twitter внизу лендинга — после завершения лендинга целиком.

-----

## Backlog — Art assets (systematized 2026-07-06)

*Реорганизованный список художника (бывший «Artist’s Notes», формулировки сохранены) +
новые пункты. Группировка по зонам.*

**База Tea:** Gate of Tavern; details on bottom; bar = front of Tavern + damaged 4 steps;
rechange buttons; win modal + bg for modal; bg for hand?; more schemes and figures on details.

**База Jeet:** kinda void; new modal skin (window, graveyard, battle log, win) + bg for
modal; all buttons; bottom bar + bar (damaged 4 steps); heart is black; fix AI button;
bg for hand?; think about card design after.

**Лендинг:** behind kinda room inside Tavern; at front table and panel; buttons for lore,
rules, catalog as part of table; window for buttons above (close look on pages, notebook
etc); fix sound buttons; music on background even we close page.

**Карты:** ВСЕ арты карт (!); каждое Врата (Gate) визуально на карте — ждёт дизайн-решения
куда и как (см. “На подумать” выше).

**Анимации:** кастомные для отряда и страха (сейчас текстовые плейсхолдеры
“SQUAD!”/“FEARED!”/”-SQUAD”/“CLEANED”), заклинания точечного урона и Шард; 

**Декбилдер (Rush) — окно выбора карт:** добавлено 2026-07-08, нужно добавить арт вместо декор плейсхолдеров

**Персонажи:** концепт Шен (маскот) — добавлено 2026-07-07. Идея с самим маскотом и
всплывающими подсказками, возможно только к версии 2.0.

**Интерфейс:** скин окна декбилдера (см. отдельный пункт выше, детализировано
2026-07-08); фонарь Low-HP (висит здесь, пока не будет арта); иконка-книга для
лор-страницы.

-----

## Sound checklist — от Муры, файлы на руках (записано 2026-07-06, обновлено 2026-07-09)

*Файлы уже у автора. Вся пачка из этого чеклиста подключена (последнее — 2026-07-08, автор
подтвердил 2026-07-09 “вчера уже все подключили”). Заодно обновлены на более свежие версии от
Муры: `card_navigation_cursor` (вместо старого `Navigation_Cursor`), `card_burn` (вместо
`Burn_Card`), `yellow_buttom` (вместо `yellow_buttom_play_endturn_menu_gravyard_loop`),
`card_select_traveler` (вместо `Click_Cursor` на превью карты в руке), и фоновая музыка
`main_theme.mp3` (вместо `Main_theme.mp3` — Мура что-то подкрутил в свежей версии).*

- [x] Кнопка кладбища — `graveyard.wav`, `openGraveModal()` в game.js
- [x] Кнопка лога (скрин монитор) — `screen_monitor.wav`, только при ОТКРЫТИИ
  (`toggleLog()` в ui.js теперь сам решает open/close звук)
- [x] Воскрешение — `rest.wav`, повешен на `revive` (полное воскрешение) И на `raise`
  (подъём из кладбища скиллом Плегмора) в abilities.js
- [x] Хил — `heal.wav`, повешен на: реген (`hp_add self`), активный хил существа/спелла
  (`hp_add ctx.target` + healTarget-клик в game.js), фонтан-тип (`hp_add target:'all'`
  и ранее беззвучная fallback-ветка), и хил базы (`hp_base`)
- [x] Баф (сделать громче) — файл `baf.wav` не менялся, громкость не трогал — отдельная
  правка `SFX_VOLUME`/индивидуальной громкости, скажи если нужно сделать сейчас
- [x] Дебаф (погромче) — аналогично, громкость не трогал
- [x] Звук «тык» (чуть-чуть громче) — не трогал громкость
- [x] Новая карта из колоды в руку — `new_card.wav`, играет на КАЖДУЮ карту в
  `_flyCardFromDeck()` (render.js), уже стаггерится вместе с анимацией вылета карт
  (по 90мс на карту), так что 2-3 карты подряд дадут 2-3 отдельных звука
- [x] Сдувание карты с поля обратно в руку (bounce) — `wind_card.wav`, повешен на эффект
  `bounce` в abilities.js, синхронизирован с моментом фактического появления карт в руке
  (после 400мс fade)
- [x] Спец-звук удара по базе — `base_atack.wav`, только в `tryAttackBase()`, обычные
  атаки существ по существам остались на `card_atack`
- [x] ~Победа — фанфары при появлении win-модалки~ — закрыто как отдельный пункт, см.
  ниже: автор просит его пересобрать в составе новой тройки, файла по-прежнему нет.
- [ ] 3-4 запасных SFX — сознательно не трогал (`sfx_buttom*.wav`), по просьбе автора это
  на потом, под будущий арт-интерактив

**Новый заход (записано 2026-07-09) — ждём от Муры 3 новых файла, ещё не подключены:**

- [ ] Победа — фанфары/стинг при появлении win-модалки (`showWin()` в ui.js)
- [ ] Начало боя — звук на старте самого сражения (естественная точка подключения —
  туда же, где сейчас крутится новая анимация `playArenaRevealAnimation()`/“Battle begins!”
  в `readyFromMulligan()`, ui.js — см. выше в Backlog — Code)
- [ ] Урон по базе Джит конкретно (не обобщённый `base_atack.wav`, который уже играет на
  ЛЮБой удар по любой базе, — отдельный акцентный звук именно для урона по базе Jeet;
  куда именно вешать по факту зависит от того, должен ли он звучать вместо `base_atack`
  для этого случая или поверх него — уточнить у автора при подключении)

Также заменено попутно (не было в чеклисте явно, но было прямо запрошено):

- [x] Превью карты в руке (клик чтобы увидеть крупную версию) — `card_select_traveler.wav`
  вместо `Click_Cursor.wav`

-----
