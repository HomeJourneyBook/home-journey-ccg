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
|`aura:armor:N` |All allies except self get +N Armor (see `recalcArmor()`, Squad System section — stacks with squad-armor and `world_armor`). Added 2026-07-10, test-live on ABYSSWALKER (`aura:armor:1`).|
|`world_maxhp:N`|All allies including aura sources get +N maxHP (world only)    |
|`world_armor:N`|All allies get +N Armor (world only — mirrors `world_maxhp` naming, not `aura:armor`, since a World card isn't a creature and has no self-exclusion question). Added 2026-07-10, infrastructure only — no World card uses it yet.|
|`gtype:xxx`    |Traveler type for squad bonuses (szg/orb/drg/umb/mch/xui)      |
|`armor:N`      |A creature's OWN contribution to its `armorMax` total (own tag + squad + aura-from-ally + world — see `recalcArmor()`, Squad System section, added 2026-07-10). Extra HP-like buffer, absorbed BEFORE hp — but ONLY on PHYSICAL damage (the two `dmgCard()` calls inside `doAttack()`: the attack itself + its counter-attack) AND `enter_aoe` (on-enter AOE burst — author call 2026-07-10: not considered "magic" for this purpose, unlike the rest of the AOE family). Magic damage bypasses armor entirely — AOE active (`doUmbAsir()`/`doVardan()`), Shard (`doShardTarget()`), and targeted-spell damage (`doSpellDmgTarget()`) all call `dmgCard(card,dmg,faction,true)` — the 4th `bypassArmor` param; `enter_aoe` deliberately does NOT pass it (same `case 'aoe':` in `abilities.js` handles only `enter_aoe` in practice — `triggerAbilities(card,'active')` is never actually called, active AOE has its own dedicated code path in `doUmbAsir()`/`doVardan()`). Burn also bypasses it, via its own separate code path (see `burn` above) — armor is purely an anti-physical defense (author call, 2026-07-10). Refills to `armorMax` (NOT just its own tag value anymore — see `recalcArmor()`) at the start of the OWNER's own turn (`endTurn()`), NOT the opponent's. Reset to 0/`undefined` when a card leaves field/gets reshuffled (`resetC()`/`killCard()`). Added 2026-07-10, live on NABUNAGI/ABYSSWALKER (`armor:2`) — see Version 1.01.|
|`untamed`      |"Неукротимость" — this creature's `exhausted` clears already when ITS OWN turn ends (i.e. already usable/counter-attacking during the opponent's turn), instead of waiting for its owner's next turn like every other creature. Deliberate override of the normal exhausted-clears-on-owner's-turn rule (`endTurn()`) — Mood trait justification: Anime pink (see Lore/Trait mapping). Added 2026-07-10, live on FAERON/TUBORG (`untamed`). Renders as `ico_untamed.png` (author-supplied) via the same `TAG_ICONS`/`TAG_TOOLTIPS` pattern as fear/burn/etc — no longer spelled out in `ab` text on those two cards, same convention as every other tag icon.|

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
// Szarg's squad bonus was Pierce (param) before 2026-07-10 — shelved by author request
// (not deleted from the game's vocabulary — the 'param'/pierce branch in
// checkSquadBonuses() still knows how to handle it if it ever comes back).
const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'armor', val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'atk',   val:1},
  {gtype:'xui', count:3, effect:'param', param:'regen',  val:2},
];
```

Note the swap (2026-07-10, author call): Merchird used to give ATK, Szarg used to give Pierce
— now Merchird gives Armor and Szarg gives ATK. `count:3` for all six (not 2 — see backlog
below, this had regressed to 2 in a past session and was restored).

### checkSquadBonuses(faction)

Called after every field change (doCreature, killCard, reviveCard, endTurn).
Must be called AFTER applyAuras to avoid maxHp conflicts. **Must ALSO be immediately followed
by `recalcArmor(faction)`** at every one of its own call sites (search for
`checkSquadBonuses(` — `recalcArmor(` follows every single one) — squad-armor
(`squadArmorBonus`) is only a flag here, same as `squadAtkBonus`; the actual armor math lives
entirely in `recalcArmor()`, see below.

Effects:

- `maxhp` — adds `squadMaxHpBonus` to card, mutates `maxHp`/`hp` directly (with the same
  "was-at-cap → grows with it" headroom rule as aura:maxhp — see `applyAuras()`)
- `atk` — adds `squadAtkBonus` to card (flag only — actual ATK total is computed on the fly
  wherever it's displayed/used: `atk+atkBonus+rageBonus+squadAtkBonus+tempAtkBonus`)
- `armor` — adds `squadArmorBonus` to card (flag only, same pattern as `atk` — actual math in
  `recalcArmor()`)
- `param` — sets `card.squadParam = {param: val}` (read by heal/aoe/regen/pierce logic)

### recalcArmor(faction) — Armor stacking (own tag + squad + world + aura-from-ally)

Added 2026-07-10, mirrors `applyAuras()`'s maxHp stacking model but is meaningfully simpler:
armor's "own" contribution is always freely re-derivable from the card's own `armor:N` tag (a
fixed DEFS value that never mutates at runtime) — unlike maxHp, whose own value ISN'T
tag-derived and needs a stored `baseMaxHp` snapshot to reconstruct. So `recalcArmor()` just
recomputes each card's full total fresh on every pass:

```
newMax = ownArmorTag + squadArmorBonus + worldArmorVal + auraFromAllies
```

...and diffs against the card's stored `armorMax` from last pass to decide what happens to
current `armor`:

- **First time ever seen** (`armorMax===undefined` — just entered/revived/raised): starts at
  full, `armor=armorMax=newMax`.
- **Max grew, card was AT cap**: current grows by the same delta too (2/2 → 3/3).
- **Max grew, card was BELOW cap** (already took a hit): current stays the same NUMBER — the
  new headroom is only usable after the next refill, at the start of the owner's own turn
  (1/2 → 1/3, not 2/3). Same rule the author specified for this exact scenario.
- **Max shrank** (aura source died, squad broke, world changed): current is clamped down to
  fit (`Math.min`).

Three sources, all stacking automatically through the same formula:
- **Own tag** — `armor:N` directly on a creature (e.g. NABUNAGI/ABYSSWALKER, `armor:2`).
- **Aura from an ally on the field** — `aura:armor:N` tag on a creature (e.g. ABYSSWALKER also
  carries `aura:armor:1` as a 2026-07-10 test — see below). Same self-exclusion rule as
  `aura:atk`/`aura:maxhp`: a source never buffs itself, only OTHER creatures on the same field.
- **World** — `world_armor:N` tag on a World card (separate tag name from `aura:armor`,
  mirroring `world_maxhp` vs `aura:maxhp` — a World card isn't a creature, so there's no
  self-exclusion question, and it's simpler to keep the two tag families visually distinct in
  DEFS). **Not yet used by any World card** — pure infrastructure, ready for whenever one is
  added; `doWorld()` already wires the `_worldArmorLog` flag and `recalcArmor()` call needed.

Refill (`endTurn()`, start of the OWNER's own turn) now checks `card.armorMax>0` instead of
`hasTag(card,'armor')` — a creature can have armor from squad/aura/world alone, with no
`armor:N` tag of its own, and still needs to refill to its (externally-granted) cap.

Render (`.card-armor-box`/`.card-small-armor-box`, see below) shows/hides based on the same
`card.armorMax>0` check, not `hasTag(card,'armor')` — so a Merchird-squad member or an
ABYSSWALKER-aura target that has NO armor tag of its own still gets the box once it's actually
carrying armor from an external source.

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

`armor:N` and `untamed` (added 2026-07-10, now live on NABUNAGI/ABYSSWALKER and
FAERON/TUBORG respectively — see Tag System + Version 1.01 roadmap) are both this last
category: pure passive damage-math/timing modifiers enforced by `dmgCard()`/`endTurn()`
themselves, no player-facing choice for the AI to make. No `AI_VERSION` bump needed per the
rule above. The one soft gap: `aiScoreCard()`'s weights don't specifically account for either
tag when the AI is choosing WHAT to play, so it may slightly under/overvalue these 4 cards
relative to others — not a legality bug, just an untuned weight, worth a look once there's
actual playtest data on these two mechanics.

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
- **1/1s** — множество уникальных 1/1 из коллекции ещё НЕ использовано в игре. Это резерв
  для будущих карт и, возможно, новых типов существ.

### Trait → mechanic mapping (Mood + World) — записано автором 2026-07-10, черновик

**Каждый Traveler несёт РОВНО 3 трейта: Gate + Mood + World.** Gate уже полностью
механически привязан (таблица выше). Ниже — полный список значений Mood и World,
как их прислал автор, с текущим статусом привязки к тегам движка (см. Tag System).
Это ЧЕРНОВИК списка — используется как рабочий источник правды для дальнейшего дизайна,
не менять/добавлять записи без прямого запроса автора (список может не совпадать 1:1 с
тем, что реально в коллекции — автор перепроверяет вручную).

**Mood — common** (без бонуса, просто фиксируем для полноты): `2`, `4`, `6`, `10`, `Circle`,
`Triangle`, `Square`, `Snakes`, `Dots`, `Cross`, `Dot`.

**Mood — rare:**

|Значение     |Привязка                                                                                |
|-------------|-----------------------------------------------------------------------------------------|
|Anime blue   |НЕ назначено                                                                            |
|Anime green  |НЕ назначено                                                                            |
|Anime mono   |НЕ назначено                                                                            |
|Anime pink   |Новая механика **«Неукротимость»** (`untamed`) — будучи уставшим (exhausted), traveler возвращается к силам В ХОД ПРОТИВНИКА (снимает exhausted раньше обычного/даёт контратаку несмотря на exhausted). ⚠️ Это ПРЯМОЕ исключение из недавно закреплённого правила "уставшее существо не даёт ответку" (см. Version 1.01 бэклог, пункт "Протестить механику... не должно давать ответку") — осознанный override для этой конкретной редкой карты, не баг. Тег `untamed` УЖЕ РЕАЛИЗОВАН в движке (2026-07-10, см. Tag System + roadmap выше), тестово висит на FAERON/TUBORG с иконкой `ico_untamed.png` — окончательная привязка к конкретному Mood-трейту ещё не финализирована.|
|Love         |`regen:1` — уже есть в движке, готов к использованию как есть.                          |

Anime blue/green/mono сгруппированы с Anime pink (все 4 — вариант одного "глаза"-трейта
Anime), но бонус пока прописан только для pink — три другие цвета ждут решения автора
(может быть, тот же `untamed` для всех четырёх Anime-цветов, а не только pink — уточнить).

**Mood — legendary:**

|Значение|Привязка (предложено 2026-07-10, ждёт подтверждения автора)|
|--------|-------------|
|Candle  |Предложено: `on_kill_base:N` — свеча в окне, маяк, ведущий домой; тег нигде больше не занят, тема "дом/база" центральна для игры.|
|Flame   |`burn` (on-attack, уже есть в движке) — прямое совпадение "flame"↔burn, готов как есть.|
|Solana  |Предложено: `draw_attack:N` (draw при атаке этим существом, тег сейчас нигде не занят). НЕ `ess_max`/`ess_add` — технически мертво на creature-карте, см. тех.заметку ниже.|

**World — common** (без бонуса): `blue`, `galaxy blue`, `galaxy green`, `galaxy mono`,
`galaxy pink`, `galaxy red`, `green`, `mono`, `pink`, `red`.

**World — rare:**

|Значение              |Привязка (предложено 2026-07-10, ждёт подтверждения автора)|
|-----------------------|----------------------|
|Ancient                |Предложено: `on_play_creature:N` (древняя родословная — призыв нового существа усиливает базу); НЕ `raise` — зарезервирован под unique 1/1 (см. правило ниже).|
|Bamboo                 |Предложено: `aura:maxhp:N` — устойчивый рост, бафает союзникам HP; тег нигде не занят.|
|Net                    |Предложено: `aura:atk:N` — сеть/связь усиливает союзников по атаке; тег нигде не занят.|
|Pink clouds             |Предложено: `invisible` — туманно, трудно прицелиться; тег нигде не занят.|
|Remember everything     |Предложено: `draw:N` — всезнание = карты. Технически работает и на обычном существе (on_attack draw, тот же паттерн, что у Ryvlen) — код это уже поддерживает.|
|Sands of time            |`vanguard` — уже есть в движке, готов как есть.|
|Scheme                 |Предложено: `shard:N` (active) — точный расчётливый удар, игнорирует Provoke/Bushido.|

**World — legendary:**

|Значение             |Привязка (предложено 2026-07-10, ждёт подтверждения автора)|
|----------------------|--------------------|
|Blood                 |`rage` — уже есть в движке, готов как есть.|
|Optical dope           |Предложено: `fear` — психоделия/дезориентация пугает.|
|Solana home             |Предложено: `on_any_death_base:N` — Solana + "дом", прямая связь с центральной механикой базы.|
|Unforgotten            |Предложено (слабее уверенность): `enter_aoe:N` — "незабытая обида бьёт всех при возвращении". Альтернатив пока не нашёл, которая не пересекалась бы с `raise`/`on_own_death` (оба недоступны, см. ниже) — стоит подумать вместе с автором отдельно.|
|Valley of Tea Dragon      |Предложено: `aura:maxhp:2` — усиленная версия Bamboo (`aura:maxhp:1`), долина как защищённая территория под присмотром дракона; тот же тег, что и Bamboo, но выше номинал (легендарка сильнее редкой) — предпочтительно паре Gate-механик, где Squad-бонус тоже "тот же тег, выше номинал".|

**Технические ограничения, которые сузили список предложений выше:**
- `world_maxhp` и `on_own_death` в игровом движке жёстко читаются ТОЛЬКО с `cur.world`
  (экипированная World-карта игрока, `game.js`), а не с любой карты, у которой есть тег —
  на creature-карте (Traveler) эти два тега сейчас ничего не делают (мёртвый тег без
  доработки кода). Поэтому они исключены из предложений для Mood/World-трейтов на существах.
- `ess_add`/`ess_max` на creature-карте парсятся как `timing:'instant'`
  (`abilities.js`), а `instant`-эффекты триггерятся ТОЛЬКО из `doSpell()` — то есть тоже
  мертвы на обычном существе без доработки кода. Дал альтернативы там, где раньше предлагал их.
- `draw:N`, `on_kill_base`, `on_any_death_base`, `on_play_creature`, `aura:atk`,
  `aura:maxhp`, `invisible`, `shard`, `fear`, `burn`, `enter_aoe` — все ПОЛНОСТЬЮ generic,
  реально читаются с любой карты по тегу (`hasTag(card,...)`), без ограничений по типу —
  безопасны для Mood/World-привязок на существах как есть, без доработки кода.

**Правило: `bushido` и `raise` зарезервированы под unique 1/1** — подтверждено автором
2026-07-10. Оба тега сейчас используются РОВНО одним 1/1-легендарным traveler'ом каждый
(`t_nab` NABUNAGI → `bushido`, `j_phleg` PHLEGMOR → `raise:1`, оба `unique:true` в data.js) —
не раздавать их через обычные Mood/World-трейты, которые может унаследовать любой массовый
(не 1/1) traveler. Если конкретный Mood/World-трейт логически просится на `raise`/`bushido`
(как было с Ancient выше) — искать другой тег, не занятый под уникальность.

**Открытые вопросы дизайна (не решать без автора):**
- Mood и World — НЕЗАВИСИМЫЕ слоты одного travelera: один и тот же traveler может
  одновременно иметь, например, Love (regen:1 от Mood) И Sands of time (vanguard от World).
  Это значит один traveler потенциально получает ДВА бонусных тега разом (сверх базового
  Gate-тега) — не только один "extra flavor tag", как было в старой (уже неактуальной)
  формулировке выше. Нужно решить: это ок (2 бонуса на редкой комбинации трейтов — часть
  того, почему она редкая), или должен быть кап/приоритет (например, только САМЫЙ редкий
  из двух трейтов даёт бонус, второй — чисто визуальный)?
- Если один и тот же тег назначен и Mood, и World по отдельности (например, если бы оба
  давали `regen:1`) — они СТЕКАЮТСЯ на одном traveler'е с обоими трейтами? Пока ни одной
  такой коллизии в списке выше нет, но при добавлении новых привязок это надо держать в уме.
- `untamed` (Anime pink) — реализован в движке 2026-07-10 (см. Tag System + roadmap выше),
  тестово повешен на FAERON и TUBORG (реальный Mood-трейт этих карт может не совпадать —
  это чисто тестовая привязка тега, не финальное лорное решение).
- World-трейт — подтверждено автором 2026-07-10: это просто фон NFT, механика не завязана
  на тип карты World в игре. Единственное исключение по флейвору (не по правилу): если у
  трейта есть тематическое пересечение с уже существующей World-картой (например "Valley"
  как World-трейт travelera и потенциальная будущая World-карта "Долина Ти-Дракона") —
  можно намеренно синхронизировать тему/бонус, но это не обязательное правило, просто
  приятное совпадение при случае.


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

## Mechanic ideas backlog (brainstorm 2026-07-10, НИЧЕГО не закреплено)

Контекст: дек-билдер уже снял ограничение "стартер = весь пул карт" — можно думать
архетипами (механика ↔ пачка карт под неё ↔ отдельный играбельный стиль), а не
разрозненными одиночными абилками. В резерве 35 ещё не использованных 1/1 — большой
потенциал под именно колодообразующие механики. Подход по словам автора: НЕ переделывать
существующие 35 1/1 разом (большая задача) — постепенно вносить новые механики, смотреть на
баланс уже существующих карт по стоимости/параметрам, потихоньку нерфить/бафать, и каждый
раз прокачивать AI вслед за патчами (как уже делается — см. `AI_VERSION` дисциплина выше).

Ничего из списка ниже НЕ реализовано и НЕ висит ни на одной карте (кроме `armor`/`untamed` —
те уже в движке, см. Tag System и roadmap выше, но тоже пока без карты). Список — рабочая
память для будущих сессий, а не готовые к реализации спеки.

- **Инкарнация X** — существо само возрождается из своего кладбища через X ходов на полном
  HP. Отдельная механика от уже существующих `raise`/`revive:full` (те — чужой/один-раз
  триггер с другого существа; Инкарнация — свой отложенный self-revive по таймеру). Не решено:
  считать ходы чьи (свои ходы владельца или ходы вообще), что при уничтожении "в войд" (burn) —
  Инкарнация должна не работать, т.к. войд обычно означает "потеряно навсегда"?
- **Броня — синергия** — свежедобавленный `armor:N` хорошо усилит 1/1 И подойдёт некоторым
  travelers через Mood/World трейт (конкретный трейт — решить позже, эстетичнее по смыслу).
- **`reflect:N`** — при получении удара атакующий получает N урона в ответ, НЕЗАВИСИМО от
  обычной контратаки (та завязана на "не уставший", reflect — всегда). Танк-архетип, компаньон
  Брони.
- **`taunt_break`** — снимает Provoke/Bushido с вражеского существа на 1 ход. Контрплей
  против танк-колод.
- **`poison`** — вместо плоского `burn:1`/ход, каждое новое применение СТАКАЕТСЯ
  (+1 dmg/ход за стак) — растущая угроза, другой темп по сравнению с burn.
- **`overkill`** — избыточный урон при убийстве уходит соседнему врагу (cleave).
- **`double_strike`** — атакует дважды за ход. Мощная, дорогая редкость.
- **`ess_steal:N`** (on_attack) — ворует N эссенции у соперника при атаке. Ресурсное давление;
  тематически ближе Jeet, у которого пока нет своего "экономического" архетипа (у Tea он уже
  есть через draw-engines — Teantist/Valley/Book, см. историю ребаланса выше).
- **`discard:N`** (on_attack) — соперник сбрасывает N карт из руки.
- **`scry:N`** — посмотреть верхние N карт своей колоды, одну оставить сверху, остальные вниз.
  Мягкий контроль над топдеком.
- **`prophecy:N`** (из ККИ Берсерк, «Пророчество X») — вариант `scry`, но проще: посмотреть
  верхние N карт колоды, применить эффект (например добор/урон по одной из них), ВСЕ
  показанные карты уходят вниз колоды (без выбора порядка/оставить сверху, в отличие от
  `scry` выше) — более простой в реализации родственник, не факт что нужны оба сразу.
- **`vampiric`** (из ККИ Берсерк, «Вампиризм») — при уроне ОБЫЧНОЙ атакой (не магией)
  существо лечится на нанесённый урон (не больше, чем не хватает до maxHP). Ложится на ту
  же ветку `doAttack()`, что и `rage`/контратака — простой в реализации, взаимодействует
  с Ward ниже (Ward блокирует магию, но не обычную атаку — vampiric работает через
  обычную атаку, так что Ward его не остановит).
- **`necrophage`** (из ККИ Берсерк, «Трупоедство») — при убийстве вражеского существа:
  изгнать его труп с кладбища противника (сразу в его `void`, минуя `grave`) + самому
  полностью вылечиться + снять с себя `burning`(аналог их "снять отравление"). Естественная
  контра нашей `incarnation` — убил Инкарнатора некрофагом → труп изгнан, воскреснуть уже
  не из чего.
- **`grave_scale:atk:N`** — +N ATK за каждую карту в СВОЁМ кладбище. Скейлящийся статтик,
  тема "чем дольше игра — тем я сильнее". Углубляет кладбищенскую тему (сейчас там только
  `raise`/`revive:full`/`on_own_death`). **Уже было записано** (автор спрашивал 2026-07-10,
  писали ли мы это — да, эта же строчка, с прошлой сессии; повторно подтверждено как желаемое
  автором в этой сессии — приоритет вырос, хочется воплотить).
- **Переосмыслить `pierce`** — идея от автора 2026-07-10: вместо текущего "игнорирует Provoke +
  можно бить базу напрямую" (см. Tag System — `pierce`, единственный потребитель —
  `getTargetableCards()`/`canAttackBase()` в game.js) сделать его "игнорирует Броню" (та же
  категория, что уже есть у AOE-активки/Shard/targeted-spell урона — `dmgCard(...,true)`).
  ⚠️ Открытый конфликт: pierce — core-тег Merchird (`gtype:mch`, "проникновение" по лору), и
  сейчас именно pierce даёt Merchird архетипу его identity — "продавливает" Provoke-стену.
  Если pierce полностью переопределить на "игнор брони", у Merchird пропадает механический
  ответ на Provoke — нужно либо решить, что это ок (Merchird становится анти-танк архетипом,
  не анти-Provoke), либо придумать Provoke-бypass отдельным новым тегом, чтобы не терять обе
  функции разом. Не решено, чисто идея на подумать.
- **Заклинание: дать +X Брони до конца ИГРЫ (не до конца хода)** — новая идея, 2026-07-10.
  Нужен новый персистентный "перманентный" бонус-канал для брони, отдельно от `armorMax`'а,
  который не сбрасывается на `endTurn()`/`applyAuras()`-подобных пересчётах (broня и так уже
  многослойная — own+squad+aura+world, см. Squad System — добавление ещё и "постоянного
  спелл-бонуса" потребует аккуратно встроить его в `recalcArmor()`, как ещё один слагаемый
  `newMax`, не путая с temporary-механиками вроде `tempAtkBonus`).
- **ARCHIVE (`spell_buff_temp:2`, +2 ATK до конца ХОДА) → сделать бессрочным** — автор:
  фактически то же самое, что "заклинание +X ATK до конца игры" уже почти реализовано, просто
  надо поменять ARCHIVE с temporary (`tempAtkBonus`, обнуляется в конце хода — см. "Targeted
  Spell System"/`tempAtkBonus` в Tag System) на постоянный эффект. Нужен новый персистентный
  ATK-канал (НЕ `atkBonus` — тот аура-only и полностью пересчитывается с нуля на каждом
  `applyAuras()`, постоянный спелл-бонус туда лезть не должен) — свежее поле вроде
  `permAtkBonus`, не трогаемое существующей аура-математикой. Хорошая пара с идеей про
  перманентную Броню выше — возможно, стоит решать оба сразу одним и тем же паттерном
  ("перманентный спелл-бонус" как отдельная категория, четвёртая рядом с own/squad/aura/world).
- **`sacrifice_draw`** — ЧАСТИЧНО реализовано другим путём 2026-07-10: базовый пейофф Altar
  расширен до "И эссенция, И карта" (было только эссенция) — см. Version 1.01 roadmap выше.
  Изначальная идея была "карта ВМЕСТО эссенции" (альтернативный режим/отдельный тег) — то,
  что реализовано, это "карта В ДОПОЛНЕНИЕ" (просто усиление базового Altar). Если позже
  понадобится именно альтернативный режим (выбор между картой и эссенцией, а не оба сразу) —
  это всё ещё открытая для дизайна идея.
- **`evolve:N`** — после N выживших ходов на поле необратимо апгрейдится (+ATK/+HP или новый
  тег). Хорошая тема для 1/1 с уникальным артом под "финальную форму".
- **`spell_dispel` — повесить наконец на реальную карту.** Тег уже полностью закодирован
  (`doSpellDispelTarget`, см. Targeted Spell System) но НЕ используется ни одной картой в игре
  — готовый неиспользуемый крючок. Снятие баффов/дебаффов точечным ударом — хороший контрплей
  против rage/aura-стекинга.
- **Невосприимчивость** (working name: `warded`) — добавлено в список 2026-07-10, по прямому
  запросу автора, НЕ реализовано. Существо: (1) не получает урона от магии — та же категория
  "магического" урона, которую только что от `armor` отвязали в другую сторону (AOE-активка,
  Shard, targeted-spell урон, возможно и burn — уточнить у автора, входит ли burn сюда же, раз
  он уже трактуется как отдельная от armor категория), (2) не подвержено `fear` (тег не
  применяется), (3) не подвержено `burn`/поджогу (тег не применяется, "поджог" в формулировке
  автора). По сути — зеркальная пара к armor: `armor` блокирует физическое, `warded` блокирует
  магическое + два конкретных статуса. Открытые вопросы: считать ли Shard-урон "магией" тут же
  (Shard формально предмет, но урон уже трактуется как магический для armor-бypass — вероятно
  да, для консистентности); нужна ли отдельная реакция на попытку применить fear/burn к
  warded-существу (просто no-op, или отдельное лог-сообщение "X is warded — Fear has no
  effect"?).

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

- [x] **Случайный выбор первого хода — дайс-модалка (`orderRollModal`)** — реализовано
  2026-07-10, roadmap Version 1.01 пункт 2. Новый шаг между выбором режима/фракции и
  мулиганом/дек-билдером, во ВСЕХ 4 комбинациях (hotseat×{classic,rush}, vsai×{classic,rush}):
  два кубика (плейсхолдер — цифры 1-6 в рамке, реальный арт граней подключит автор),
  ~1.4с случайного перебора чисел с обеих сторон одновременно (`_rollOrderDice()` в ui.js),
  затем фиксация результата; ничья → пауза 0.9с → автоматический повторный бросок, без ручной
  кнопки reroll. Победитель (больше цифра) визуально подсвечивается (`.order-roll-winner`),
  результат допечатывается посимвольно (`_typeOrderResult()`, тот же CRT-стиль, что у
  остальных модалок). `btn_ready` неактивна до фиксации результата; `btn_back_corner`
  возвращает на шаг назад (vsAiPickerModal для vsai, deckPickerModal для hotseat — ОДИН шаг
  назад, как у остальных модалок в цепочке, а не сразу на два).
  — Дек-билдер (Rush) в hotseat теперь строит колоды в порядке результата броска
  (`buildOrder` в `startRushBuild()`, deckbuilder.js), а не всегда Tea→Jeet — у игрока за 2-й
  ход теперь есть возможность собрать другую колоду под эту роль.
  — `backFromDeckBuilder()` теперь возвращает к ПЕРЕброску (снова открывает orderRollModal),
  а не сразу к vsAiPickerModal/deckPickerModal — раньше между ними не было дайс-модалки,
  теперь один "назад" = один шаг назад и здесь тоже.
  — Хардкод "jeet = второй игрок" убран из четырёх мест: `G.turn`/`G.mulliganTurn` в
  `initState()` (были захардкожены на `'tea'`), `G.jeetFirstTurn` → переименовано в
  `G.secondFirstTurn` + условие в `endTurn()` (game.js) теперь на `G.secondFaction`,
  `skipDraw`/`turnNum++` в том же `endTurn()` — на `G.firstFaction`/`G.secondFaction`,
  и хардкод мулиган-цепочки Tea→Jeet в `readyFromMulligan()` (ui.js) — теперь на
  `G.firstFaction`/`G.secondFaction`. Restart (win-модалка) переигрывает с ТЕМ ЖЕ
  `firstFaction`, что и завершившийся матч (не новый бросок).
  — UNSEEN (бонус 2-го игрока) убран из самой колоды (был `buildDeck()`/`buildAiRushDeck()`
  в deck.js, шёл в общий шаффл — то есть раньше МОГ попасться в стартовой руке до муллигана,
  что автор не хотел) и теперь выдаётся напрямую в руку `G.secondFaction`-игрока 6-й картой
  (`grantUnseenBonus()`, ui.js) в момент, когда фаза муллигана реально заканчивается
  (`phase='action'` в `readyFromMulligan()` — единая точка схождения для всех 4 комбинаций
  режим×конфиг колоды, поэтому один вызов покрывает их все).
  — Арт граней кубика подключён 2026-07-10 (тот же день) — автор добавил `dice_1.png`…`dice_6.png`
  в `img/`; `.order-roll-die` заменён с бордер-рамки+цифра на `background-image` (JS-хелпер
  `_setDieFace(el,n)` в ui.js подставляет `img/dice_${n}.png`), тот же размер бокса
  (`clamp(46px,12vw,58px)`), подсветка победителя — `drop-shadow` вместо рамки/box-shadow
  (у самого арта уже есть форма кубика, рамка была нужна только для цифры-плейсхолдера).

- [x] **Три доп. правки к order-roll/deckbuilder** — 2026-07-10, тот же день.
  — `dice_1..6.png` добавлены в `preloadAssets()` (ui.js), отдельным блоком рядом с
  остальным art для этой модалки.
  — Тайпинг-эффект (тот же, что у результата броска) вынесен в переиспользуемые хелперы
  `_typeText(el,text,charMs,onDone)` (обычный текст) и `_typeHtmlLine(el,segments,charMs,onDone)`
  (текст с инлайн `<strong>`, посимвольно, без поломки тега) — теперь используется ещё в
  двух местах: deckPickerModal (`_playDeckPickerTyping()` — две строки Classic/Rush печатаются
  последовательно) и vsAiPickerModal (`_playVsAiPickerTyping()` — одна строка). Обе модалки
  переигрывают тайпинг при КАЖДОМ показе, не только при первом открытии — весь код показа
  этих модалок стянут в `_showDeckPickerModal()`/`_showVsAiPickerModal()` (единая точка входа
  вместо четырёх разбросанных `classList.remove('hidden')+_modalPopIn`), чтобы это не пришлось
  дублировать на каждом "назад".
  — Кнопка "назад" в дек-билдере (Rush) — раньше вела на пере-ролл кубиков (см. вчерашнюю
  запись), теперь по прямому запросу автора ведёт сразу на landing (главное меню), минуя
  faction/deck-config пикеры и order-roll целиком — черновик колоды всё так же не сохраняется.
  Иконка сменена с `btn_back1/2/H` на `btn_home1/2/H` (те же файлы, что у win-модалки).

- [x] **Тайпинг-эффект распространён на confirmModal + winModal** — 2026-07-10. Тот же
  `_typeText()` (см. запись выше), теперь ещё в двух местах: `showConfirm()` печатает
  тело сообщения (Restart/Main Menu confirmations В ТОМ ЧИСЛЕ — тот же showConfirm() и у
  них; заодно и у deckbuilder.js import-notices, бесплатно, тот же вызов) вместо мгновенного
  `textContent`; `showWin()` печатает флейвор-строку под "VICTORY"/"DEFEAT". Заголовки (`h2`)
  остаются мгновенными везде — тот же паттерн, что уже был у order-roll/deckPicker/vsAiPicker.

- [x] **Баг: Unseen у Tea не кликалась** — 2026-07-10, найдено автором в тесте. Причина:
  `DEFS.unseen.f` в data.js захардкожен на `"jeet"` (наследие тех времён, когда Unseen всегда
  доставался Джиту) — `card.f` при этом используется ПОВСЮДУ как "чья это карта" (клик по
  руке — `card.f===G.turn` в `game.js`, `.affordable`-подсветка, рендер своей/чужой руки), так
  что когда `grantUnseenBonus()` кладёт карту в руку Tea (Tea выиграла бросок и стала 2-м
  игроком), сама карта физически лежит в `G.tea.hand`, но `card.f` всё ещё `'jeet'` — клик по
  ней проваливает проверку `card.f===G.turn` и ничего не происходит. Исправлено в
  `grantUnseenBonus()` (ui.js): после `mkCard('unseen')` явно переставляется `card.f=second`
  (фактический владелец по броску), а не то, что лежит в DEFS. `DEFS.unseen.f` сам не тронут —
  это просто дефолт для любого места, читающего его ДО назначения реального владельца
  (например каталог).

- [x] **Механики `armor:N` и `untamed` — реализованы в движке** — 2026-07-10, первые две
  механики Version 1.01, закрепляющие саму версию (см. roadmap выше для полной технической
  спецификации). Ни одна из двух пока не висит ни на одной живой карте — карта/трейт-привязка
  и визуал (иконка щита, автор рисует отдельно) сознательно отложены на потом. Заодно записан
  большой бэклог идей архетипов/механик (Инкарнация X, reflect, poison, ess_steal, evolve и
  т.д. — см. новый раздел "Mechanic ideas backlog" выше Backlog — Code) — чисто брейншторм,
  ничего из него не реализовано.

- [x] **Баг: кнопка активного хила не появлялась для дебаффнутой-но-полной-HP цели** —
  2026-07-10, найдено автором в тесте. `hasHealTarget` (render.js, попап-кнопка Heal) и
  подсветка `.healable` (render.js) проверяли только `hp<maxHp`, хотя сама резолюция клика
  (`onClick()` в game.js, `G.phase==='healTarget'`) УЖЕ умела снимать `burning`/`feared` даже
  без изменения HP — просто клик по такой цели физически не проходил гейт `card.hp<card.maxHp`
  на входе. Все три места (кнопка/подсветка/клик) теперь читают
  `hp<maxHp || burning || feared` одинаково.
- [x] **Баг: тултип ATK не показывался на маленькой карте** — 2026-07-10, найдено автором.
  `.card-atk-box` (зумленная/большая карта) давно имел `data-base`/`data-bonus` и попадал в
  `TOOLTIP_TRIGGER_SELECTOR`; `.card-small-atk-box` (мини-карта в руке/на поле) не имел ни
  того, ни другого — тултип с разбивкой бонуса физически не мог сработать. Добавлены те же
  `data-base`/`data-bonus` на мини-карту (render.js) + класс в селектор + case в
  `_tooltipDataFor()` (ui.js, тот же кусок кода обслуживает оба класса).

- [x] **Броня vs магический урон + доп. тестовые привязки untamed** — 2026-07-10, по
  прямому запросу автора (см. полную техническую спецификацию в roadmap выше, Version 1.01):
  `armor` теперь блокирует ТОЛЬКО физический урон (атака+контратака), магия (AOE/Shard/
  targeted-spell/burn) бьёт напрямую — `dmgCard()` получил 4-й параметр `bypassArmor`.
  `untamed` — тестово ещё на 7 обычных travelers (#25/#398/#2/#187/#36/#20/#22) плюс у #26
  убран лишний `aoe:1`. Найден и исправлен баг: иконка `untamed` не рендерилась в Каталоге —
  оказалось, `TAG_ICONS`-подобных копий по всему проекту не 2 (render.js), а 5 (+2 в
  catalog.js, +1 в deckbuilder.js) — везде своя дублирующаяся копия списка тег→иконка вместо
  одного общего источника. Добавлено во все 5. Новая идея в бэклог — «Невосприимчивость»
  (`warded`, working name): иммунитет к магическому урону + fear + burn, не реализовано.

- [x] **5 точечных правок по запросу автора** — 2026-07-10.
  1. **Squad-порог вернули на 3** (было ошибочно 2 в живом `game.js`, хотя и в этом же
     `CLAUDE.md` — "Squad System" выше — и в `ai.js` (`aiGtypeCount`/`squadCompleteBonus`)
     давно уже документирован и посчитан именно порог 3 — то есть `game.js` был единственным
     местом, где значение реально разъехалось с остальным проектом). `SQUAD_DEFS`
     (`count:2`→`count:3` во всех 6 записях) — единственное место, которое меняли, ИИ трогать
     не пришлось, его веса уже были рассчитаны на 3.
  2. **Модалки с тайпингом больше не растут по ходу печати.** `_typeText()`/`_typeHtmlLine()`
     (ui.js) теперь измеряют высоту ПОЛНОГО (готового) текста ДО начала анимации и фиксируют
     её через `min-height`, а не только потом — печать идёт уже внутри готового по размеру
     блока. Намеренно `scrollHeight`, а не `getBoundingClientRect().height` — в момент вызова
     модалка может ещё доигрывать pop-in анимацию (`transform:scale()`, см.
     `.modal-pop-in`/`@keyframes modalPopIn` в styles.css), а `getBoundingClientRect()`
     чувствителен к transform родителя (вернул бы уже отмасштабированный, неверный размер);
     `scrollHeight` — чисто layout-свойство, transform на него не влияет.
  3. **Disabled-версия кнопки мулигана больше не "прозрачная".** Причина — общий dimming-
     фильтр `.modal-art-btn:disabled{filter:brightness(0.5) saturate(0.4)}` (добавлен в сессии
     с order-roll для его Ready-кнопки, у которой не было своего disabled-арта) каскадом
     применялся и к `.btn-mulligan`, у которой СВОЙ готовый спрайт (`btn_mulliganD.png`) —
     фильтр поверх готового спрайта и выглядел как лишняя прозрачность/тусклость. Добавлен
     override `.modal-art-btn.btn-mulligan:disabled{filter:none;}` (styles.css).
  4. **`enter_aoe` больше не игнорирует броню** — armor/magic-bypass правку (прошлая сессия)
     пришлось разделить: активная AOE-кнопка (Umbasir/Vardan, `doUmbAsir()`/`doVardan()` в
     game.js) — отдельный код-путь, магия, по-прежнему игнорирует; а `enter_aoe:N` идёт через
     ОБЩИЙ `case 'aoe':` в `abilities.js` (единственный потребитель — `triggerAbilities(card,
     'on_enter')`, вызывается из `doCreature()`; `triggerAbilities(card,'active')` вообще
     нигде не вызывается, тот код мёртв) — этому пути `bypassArmor` убрали, по прямому запросу
     автора ("enter_aoe — не магический урон").
  5. **ALTAR теперь даёт и карту, и эссенцию за жертву** (было — только эссенция) — см.
     Version 1.01 roadmap выше.

- [x] **Рендер Брони на карте** — 2026-07-10. `.card-armor-box`/`.card-small-armor-box`
  (styles.css): позиция — слева, под cost (`left` совпадает с `.card-cost`, `top` сразу под
  его нижним краем), высота бокса = высоте `.card-tag-icon` (`calc(var(--card-h)*0.108)` /
  `calc(var(--card-small-h)*0.13)`), ширина = высота×2 (ратио 2:1, задан явно через
  `calc(...*2)`, не через `aspect-ratio`, для консистентности с остальными calc-based
  размерами карты). Фон — `armor_bg.png`, иконка — `armor.png` (оба файла — автор, добавлены
  в `preloadAssets()`). Паддинги/font-size — скопированы буквально с `.card-hp-box`/`.card-hp`
  (`padding:1px 1px 4.5px 1px`, `font-size:calc(var(--card-h)*0.11)`), иконка — существующий
  общий класс `.stat-icon` (уже был `em`-based, автоматически подхватывает и полный, и
  мини-размер через существующее правило `.card-small .stat-icon{width:0.6em;...}` — ничего
  добавлять для этого не пришлось). Показывается ТОЛЬКО если `hasTag(card,'armor')` — как и
  тег-иконки, не резервирует место, если тега нет.
  — **Добавлено во ВСЕ рендер-контексты** (6 мест, отдельно от общего
  `TAG_ICONS`-дублирования — тут отдельная вставка markup, а не общий список иконка↔тег):
  render.js (полноразмерная карта + мини-карта), catalog.js (сетка + модалка деталей),
  deckbuilder.js (пул Rush-подбора). Зум-режим (`zoomHandCardFly`→`showFieldCardPreview`)
  использует тот же `mkEl()`, что и обычный рендер — отдельно ничего чинить не пришлось,
  кроме списка `pointerEvents='auto'` для зум-клона (та же строка, что чинили для ATK на
  мини-карте в прошлой сессии) — `.card-armor-box` туда тоже добавлен, иначе наведение в
  зуме не ловилось бы (клон целиком `pointer-events:none`, кроме явно перечисленных детей).
  — **Тултип** — `_tooltipDataFor()` (ui.js), новый case на `data-armor`/`data-maxarmor` →
  `"N/M Armor"` (тот же формат, что и у HP-бокса). Для живых карт (render.js) — `data-armor`
  реальный текущий пул (может быть меньше max, если часть уже поглощена в этом ходу);
  для превью вне игры (catalog.js/deckbuilder.js, там нет живого `card`, только `def`) —
  `data-armor`===`data-maxarmor` всегда (просто показывает базовое значение тега).

- [x] **Аура Брони (`aura:armor`) + `world_armor` + переработка Squad-бонусов Merchird/Szarg**
  — 2026-07-10, полная спецификация в разделах "Squad System"/"Tag System" выше, кратко:
  — Новая функция `recalcArmor(faction)` (game.js) — тот же принцип, что у `applyAuras()` для
  maxHp (own tag + squad + aura-от-союзника + world, все три стекуются), но проще: own-часть
  всегда пересчитывается с нуля из тега `armor:N` (он не мутирует в рантайме, в отличие от
  maxHp), поэтому не нужен `baseMaxHp`-подобный снэпшот — просто diff нового total против
  сохранённого `card.armorMax` с прошлого прохода. Headroom-правило автора: на кэпе — кэп
  растёт (2/2→3/3); не на кэпе — текущее число не меняется, новый запас доступен только со
  следующего рефилла (1/2→1/3, не 2/3). Вызывается СРАЗУ после каждого `checkSquadBonuses()`
  (все call sites, включая `abilities.js` raise-эффект).
  — Merchird squad-бонус: было ATK+1 → стало Armor+1. Szarg squad-бонус: было Pierce (param) →
  стало ATK+1 (забрал старый бонус Merchird). Старый Szarg-бонус (Pierce) НЕ удалён из кода —
  просто убран из `SQUAD_DEFS`, ветка `param`/pierce в `checkSquadBonuses()` по-прежнему на
  месте, если понадобится вернуть. Текст `ab` у всех 16 карт (8 mch + 8 szg) обновлён.
  — `world_armor:N` — по аналогии с `world_maxhp` (не `aura:armor` — у World-карты нет вопроса
  самобаффа). Чистая инфраструктура, ни одна World-карта пока его не использует —
  `doWorld()` уже целиком готов (лог-флаг `_worldArmorLog`, вызов `recalcArmor()`).
  — Тестовая аура: ABYSSWALKER (`j_mal`) получил `aura:armor:1` В ДОПОЛНЕНИЕ к своему
  `armor:2` — как и остальные ауры, себя не бафает, но может получать бонус от других
  источников (например будущего Мира с `world_armor`).
  — Рендер (`.card-armor-box`) переведён с `hasTag(card,'armor')` на `card.armorMax>0` —
  теперь бокс брони показывается и у карт БЕЗ собственного тега `armor`, если они получают её
  извне (Merchird-сквад без своего armor-тега, союзник ABYSSWALKER и т.д.); `data-maxarmor`
  тоже теперь `card.armorMax`, а не голый тег. Рефилл в `endTurn()` — та же замена условия.
  — Везде, где раньше сбрасывались `squadMaxHpBonus`/`squadAtkBonus`/`squadParam`
  (`killCard()`, `reviveCard()`, raise-эффект, `resetC()`, `doSpellDispelTarget()`) — рядом
  добавлен сброс `squadArmorBonus`/`armorMax`.

- [x] **4 бага в системе Брони — найдены автором в тесте, исправлены** — 2026-07-10.
  1. **0/0 → 0/1 вместо 1/1 при появлении нового источника бонуса.** Реальный сценарий: 2
     Merchird стоят на поле без брони (легитимно 0/0 — своего тега armor нет, squad ещё не
     активен), заходит 3-й — squad срабатывает, у ВСЕХ троих должно стать 1/1. Свежевошедший
     получил верно (свой первый проход через `recalcArmor()` — `armorMax===undefined` branch).
     Два УЖЕ стоявших — получили 0/1 вместо 1/1. Причина: `wasFull` в `recalcArmor()` требовал
     `armorMax>0`, а у них `armorMax` было легитимным 0 (не `undefined` — они уже проходили
     через recalcArmor раньше, при своём собственном входе на поле, с нулевым результатом) —
     0/0 не считалось "на кэпе" из-за `>0`, хотя логически 0 из 0 доступных — это тоже "полно".
     Убрал `&&a.armorMax>0` из условия — теперь `wasFull=(a.armor||0)===a.armorMax`, работает
     для 0/0 так же, как для 2/2. Тот же баг был у ABYSSWALKER (аура давала союзникам 0/1
     вместо 1/1) — один и тот же код, один и тот же фикс.
  2. **Squad-бонус брони не отображался в статус-панели существа** (при наведении/зуме) — у
     Merchird с активным squad не было видно "+1 Armor" среди баффов. `_squadBonusText()`/
     `_cardStatusEntries()` (render.js) проверяли только `squadAtkBonus`/`squadMaxHpBonus`/
     `squadParam`, про `squadArmorBonus` забыли. Добавлено в оба места.
  3. **Аура-бонус брони (от ABYSSWALKER/будущего Мира) тоже не отображался в статус-панели**
     союзников, которые её получают — в отличие от ATK-ауры и maxHP-ауры (у обеих есть
     персистентные поля `atkBonus`/`worldMaxHpBonus`, которые `_cardStatusEntries()` уже умеет
     показывать), для брони такого персистентного поля не было вообще — `recalcArmor()`
     считал aura/world-вклад только "на лету" внутри `reduce()`, никуда не сохраняя. Добавлены
     два новых персистентных поля — `card.auraArmorBonus` (от союзника) и
     `card.worldArmorBonus` (от Мира), заполняются в `recalcArmor()` на каждом проходе,
     показываются в статус-панели тем же паттерном, что и `atkBonus`/`worldMaxHpBonus`.
     Сброс этих полей добавлен везде, где сбрасывается `armorMax` (`killCard()`,
     `reviveCard()`, raise-эффект, `resetC()`).
  4. **Броня NABUNAGI (свой тег `armor:2`) не рендерилась в руке** — только после выхода на
     поле. Причина: рендер-условие было `card.armorMax>0`, а `armorMax` вычисляется ТОЛЬКО
     внутри `recalcArmor()`, которая проходит исключительно по `cur.field` — карта в руке
     никогда через неё не проходит, `armorMax` там всегда `undefined`, даже если у карты
     есть собственный тег armor. Добавлен хелпер `_armorDisplay(card)` (render.js): если
     `armorMax>0` — показывает живое поле-значение (как раньше); если `armorMax===undefined`
     (карта вне поля) — показывает СОБСТВЕННЫЙ тег как "полный" (2/2) — squad/aura всё равно
     не действуют, пока карта не сыграна, показывать нечего кроме своего базового значения.
     Используется в обоих местах рендера (`mkSmallEl()`/`mkEl()`), тултип не потребовал
     изменений — те же `data-armor`/`data-maxarmor` атрибуты, только источник значений другой.

- [x] **5 правок по фидбеку автора** — 2026-07-10.
  1. ~~**Звук/анимация добора карты вне обычного хода (Hunger/Altar/spell-draw/Ryvlen
     on-attack)**~~ — ⚠️ ПОПЫТКА ФИКСА НЕ СРАБОТАЛА, ОТКАЧЕНА тем же днём (см. запись ниже,
     "Откат попыток фикса"). Гипотеза была: `render()` обновлял видимость `SidebarBtns`/
     `BottomBar` (внутри которого физически лежит `deckPlaceholderT`/`J`) ПОСЛЕ вызовов
     `rZone()` для рук, из-за чего `_deckPlaceholderRect()` видел устаревшее состояние —
     переставил блок видимости выше вызовов `rZone()`. Автор протестировал — эффекта не дало,
     проблема осталась ровно такой же. Реальная причина всё ещё НЕ найдена — см. Backlog.
  2. **Аура maxHP от карты (не Мира) не показывалась в статус-панели.** Та же природа, что
     чинили для брони в прошлой сессии — у `worldMaxHpBonus` (Мир) есть персистентное поле,
     у ATK-ауры есть `atkBonus`, а у maxHP-ауры ОТ СУЩЕСТВА такого поля не было вообще — её
     вклад считался только "на лету" внутри `baseMaxHp`-математики в `applyAuras()`, никуда
     не сохраняясь. Завёл `card.auraMaxHpBonus` (сбрасывается и пересчитывается в
     `applyAuras()` на каждом проходе, тот же цикл, что уже трогает `baseMaxHp`), добавил
     отдельную строку в `_cardStatusEntries()` (render.js) — теперь ДВЕ разные строки:
     "+N Max HP from an aura on the battlefield" (от карты) и "+N Max HP from the World card"
     (от Мира, было и раньше, просто уточнил формулировку под пару). Сброс поля добавлен
     везде, где сбрасывается `atkBonus`/`baseMaxHp` (`resetC()`, `reviveCard()`, raise-эффект).
  3. **Убран текст "Armor: N" из `ab` NABUNAGI/ABYSSWALKER** — визуальный бокс брони на
     карте уже показывает это число, дублировать в тексте способности не нужно (та же логика,
     по которой раньше убрали текст про Untamed, когда завели ему иконку). У ABYSSWALKER текст
     про ауру ("Aura: allies +1 Armor.") остался — для эффекта, который карта даёт СОЮЗНИКАМ,
     визуального индикатора нет (бокс брони показывает только собственное текущее значение).
  4. **Ложная "+1 HP" анимация при чистом clean-хиле.** Клик хилером на дебаффнутую, но уже
     полную по HP цель (легитимный кейс — снять fear/burn без реального лечения, см. прошлую
     сессию) корректно снимал дебафф, но всё равно показывал плавающую "+1 HP", хотя HP не
     менялось. Посчитал фактическое исцеление (`actualHeal = card.hp - oldHp`, с учётом cap по
     maxHp) — floating-текст теперь показывается, только если `actualHeal>0`; лог-сообщение
     тоже адаптировано ("cleanses X" вместо "+0 HP to X", если реального хила не было).
  5. **Косметика: бокс брони подвинут** так, что его низ теперь совпадает с низом арта карты
     (`top: calc(var(--card-pad) + var(--card-art-size) - <высота бокса>)` для полной карты,
     аналогично для мини — через `--card-small-art-h`), вместо раньше произвольно подобранного
     отступа. Использует те же CSS-переменные, что и сам `.card-art`, так что останется верным
     автоматически, даже если размеры карты позже поменяются.

- [x] **Откат попыток фикса анимации добора — рабочим остался только один кусок** —
  2026-07-10, автор протестировал предыдущую запись выше и оба фикса из неё, результат:
  ничего не изменилось для Hunger/Altar/Ryvlen/spell-draw, они как молчали, так и молчат.
  1. **Оставлено (реально помогло): скрытая рука соперника больше НЕ "летит" со звуком при
     каждой передаче хода в hotseat.** Причина была отдельная от анимации добора и не связана
     с ней — контейнер руки в hotseat каждый ход меняет РАЗМЕТКУ целиком (открытая через
     `rZone` ↔ скрытая через `rHiddenHand`), `wrongType`-проверка в `rHiddenHand()`
     срабатывала почти на каждой передаче, контейнер вайпился целиком и ВСЯ рука (не только
     реально новые карты) переигрывала анимацию+звук. По прямому запросу автора анимация/звук
     для скрытой чужой руки убраны ПОЛНОСТЬЮ (`rHiddenHand()`, render.js) — это ОСТАЛОСЬ в
     силе, автор подтвердил, что хотя бы это не мешает.
  2. **Откачено (не помогло, не давало эффекта): всё остальное.** И реордеринг видимости
     `SidebarBtns`/`BottomBar` внутри `render()` (см. пункт 1 записи выше — восстановлен
     исходный порядок), и весь механизм `drawCardsAnimated()`/`G._pendingDrawFx` (принудительная
     постановка добранных карт в очередь на анимацию в обход `existingIds`-диффинга в `rZone()`)
     — удалены целиком из `game.js`/`render.js`/`abilities.js`. Оба захода на проблему
     оказались основаны на гипотезах, не подтверждённых тестом — раз реального движения нет,
     решили не оставлять недоказанный код "на всякий случай", а откатить и разобраться заново
     позже с более прицельным подходом (возможно — с логированием прямо в браузере автора,
     раз статический разбор кода дважды не попал в причину).
  — **См. Backlog — Code, новый пункт "Добор карт вне начала хода — без анимации/звука"** —
  реальная причина всё ещё не найдена, откладываем на отдельную сессию.

### Итог сессии 2026-07-10 (разбор дня целиком)

Очень длинная сессия, от Version 1.01 turn-order UI до целой новой механики Брони. Кратко,
что реально доехало до рабочего состояния (детали — в записях журнала выше по датам):

**Доехало и подтверждено автором:**
- Дайс-модалка порядка хода (order-roll) — полностью, все 4 комбинации hotseat/vsai×
  classic/rush, включая реальный арт граней от автора.
- Тайпинг-эффект — размножен на все модалки (deckPicker/vsAiPicker/confirm/win), не растёт
  по ходу печати (фикс через `scrollHeight`, устойчиво к pop-in transform).
- Баг с Unseen у Tea (не кликалась) — найден и исправлен.
- Механика **Брони** (`armor:N`) целиком: own tag + squad (`effect:'armor'`) + aura
  (`aura:armor:N`) + world (`world_armor:N`, инфраструктура без карты) — все три стекуются
  через единый `recalcArmor()`, headroom-правило (на кэпе растёт вместе с бонусом, не на
  кэпе — не растёт до следующего рефилла), полный визуальный рендер во ВСЕХ контекстах
  (рука/поле/зум/каталог/декбилдер), тултипы, статус-панель. Прошла через 2 раунда багфиксов
  по фидбеку автора (0/0→0/1 баг, отсутствие в статус-панели, руки без рендера, позиция бокса).
- Механика **Неукротимость** (`untamed`) — снимает exhausted уже в ход соперника, иконка
  подключена во все 5 мест дублирования тег→иконка (найдено и исправлено, что их не 2, а 5).
- Squad-система: порог вернули на 3 (регрессия), Merchird↔Szarg поменялись бонусами местами
  (armor↔atk), тестовые привязки untamed на 7 travelers.
- ALTAR даёт и карту, и эссенцию. `enter_aoe` больше не игнорирует броню (в отличие от
  остальной AOE-семьи — осознанное разделение). Куча мелких UI-фиксов (disabled-кнопка
  мулигана, ATK-тултип на мини-карте, ложная "+1 HP" при чистом clean-хиле, отдельная
  статус-строка для aura-maxHP vs world-maxHP).
- Записан объёмный бэклог трейтов NFT-коллекции (Mood/World → механики) и бэклог идей новых
  механик архетипов (см. секции выше).

**НЕ доехало — осталось открытым:**
- Анимация/звук добора карт вне начала хода (Hunger/Altar/spell-draw/Ryvlen) — см. пункт
  прямо под этим разбором, вероятная причина теперь есть (рассинхрон измерения позиции с
  сжатием веера руки), но фикс ещё не написан и не проверен.
- Все идеи в "Mechanic ideas backlog" — бумажный список, ничего оттуда не реализовано.
- Trait mapping (Mood/World → теги) — тоже пока черновик, автор не финализировал привязки.

**Естественные кандидаты на следующую сессию** (не приоритизировано, просто то, что уже
готово к реализации без доп. решений от автора):
- Фикс анимации добора — см. следующий пункт, направление уже нащупано.
- `spell_dispel` — тег закодирован, готов, просто ни на одной карте не висит — можно взять
  почти любую идею из Mechanic ideas backlog и привесить, чтобы наконец заработал.
- Инкарнация X — единственная механика-идея с более-менее чёткой спецификацией из брейншторма
  (кроме двух вопросов про подсчёт ходов и взаимодействие с burn/войдом), можно начинать
  проектировать первой из необсуждённых.

### Приоритет — завтра

- [ ] **Добор карт вне начала хода — без анимации/звука (Hunger/Altar/spell draw "draw N
  cards"/Ryvlen on-attack draw).** Открыто с 2026-07-10, автор нашёл в тесте. Обычный добор в
  начале хода (`endTurn()`) анимируется и звучит нормально — эти 4 источника молчат. Две
  попытки фикса за 2026-07-10 (реордеринг видимости `SidebarBtns`/`BottomBar` в `render()`;
  затем отдельный явный механизм принудительной постановки в очередь на анимацию,
  `drawCardsAnimated()`/`G._pendingDrawFx`) — ОБЕ не дали эффекта на тесте автора, обе
  откачены (см. журнал сессии выше, "Откат попыток фикса анимации добора"). Единственное, что
  реально помогло в процессе — не связанный с этим фикс: скрытая рука соперника в hotseat
  больше не переигрывает анимацию/звук при каждой передаче хода (`rHiddenHand()` — анимация/
  звук убраны оттуда полностью, это осталось в силе).
  **ВЕРОЯТНАЯ РЕАЛЬНАЯ ПРИЧИНА — найдена автором тем же днём, ещё не проверена в коде:**
  дело не в диффинге/видимости (обе прошлые гипотезы were ошибочны), а в РАССИНХРОНЕ момента,
  когда меряется целевая точка полёта, и момента, когда рука реально сжимается в веер.
  `rZone()` считает `restRect=cardEl.getBoundingClientRect()` СРАЗУ после `appendChild` —
  то есть ДО того, как отработает `adjustHandOverlap()` (та вызывается только на следующий(-е)
  кадр(ы) через `requestAnimationFrame`, см. конец `render()`). При малом числе карт в руке
  несжатая раскладка почти совпадает с итоговой (сжатой) — совпадение маскирует баг, полёт
  выглядит нормально. При большом числе карт несжатая раскладка карт значительно шире видимой
  зоны — карты в руке физически стоят за пределами экрана справа, и `restRect` для добранной
  карты берётся именно оттуда, ДО сжатия. Анимация летит в эту (ещё не сжатую) точку — визуально
  выглядит как "улетает куда-то за экран", хотя реально просто целится не в то место. Это,
  скорее всего, объясняет и "тишину" — сама fly-анимация и её звук (внутри `_flyCardFromDeck`,
  `render.js`) всё это время МОГЛИ срабатывать, просто улетали не туда/визуально терялись, что
  на глаз воспринималось как "ничего не произошло". **Возможное направление фикса** (НЕ
  реализовано, требует проверки перед тем как кодить): дать `adjustHandOverlap()` отработать
  СИНХРОННО (не через `requestAnimationFrame`) до того, как `rZone()` меряет `restRect` для
  свежедобранной карты — либо просто переставить порядок вызовов, либо явно дёрнуть
  `adjustHandOverlap()` перед измерением. Нужно перепроверить, не сломает ли это остальную
  анимацию руки (сжатие само по себе плавно анимируется через CSS transition — синхронный вызов
  может либо ничего не изменить визуально, либо потребовать доп. `void el.offsetWidth` для
  форс-reflow, как это уже делается в других местах кода).

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
- [x] Случайный выбор кто ходит первым/вторым — момент решения ПЕРЕД муллиганом (сделано
  2026-07-10 — см. запись в журнале выше, "Случайный выбор первого хода — дайс-модалка").
  Реализовано через дайс-модалку (`orderRollModal`), не хардкод Tea-первый/Jeet-второй.
  Второй игрок получает 5 карт (обычная стартовая рука) + Unseen 6-й картой СРАЗУ ПОСЛЕ
  мулигана, не как часть колоды/мулиган-пула (уточнение с автором закрыто: "5 + Unseen"
  = 6 карт итого, не "5 включая Unseen").
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
- [x] ALTAR — базовый пейофф расширен 2026-07-10: теперь жертва даёт И карту, И эссенцию
  (было — только +1 эссенция). `doSacrifice_target()` (game.js) — `cur.hand.push(cur.deck.shift())`
  рядом с `cur.ess+=1`, no-op если колода уже пуста (просто без карты, эссенция всё равно
  начисляется). Текст `ab` карты (data.js) обновлён.
- [x] Механика «Броня» — реализовано 2026-07-10. Тег `armor:N`, отдельный пул `card.armor`
  поверх HP, но ТОЛЬКО против ФИЗИЧЕСКОГО урона (обычная атака + её контратака, оба вызова
  `dmgCard()` внутри `doAttack()`) — сначала вычитается из `armor`, и только остаток (если
  есть) — из HP. **Магический урон Броню полностью игнорирует** (правка того же дня, по
  прямому запросу автора: AOE-активка, Shard, направленное заклинание-урон — "удары магией,
  Броне не почём"; burn — туда же, свой отдельный путь мимо `dmgCard()`, но тот же принцип).
  Технически: `dmgCard(card,dmg,faction,bypassArmor)` — 4-й параметр, `true` у AOE-активки
  (`doUmbAsir()`/`doVardan()`), у Shard (`doShardTarget()`) и у targeted-spell урона
  (`doSpellDmgTarget()`); физическая атака/контратака (`doAttack()`) параметр не передают —
  там броня работает как обычно. **`enter_aoe` — ТОЖЕ БЕЗ bypassArmor** (правка в тот же день,
  по отдельному прямому запросу автора: "enter_aoe — не магический урон", в отличие от
  остальной AOE-семьи) — `case 'aoe':` в `abilities.js`, единственный реальный потребитель
  которого — `enter_aoe` (`triggerAbilities(card,'on_enter')` из `doCreature()`;
  `triggerAbilities(card,'active')` нигде не вызывается — активная AOE-кнопка обслуживается
  отдельным кодом в `doUmbAsir()`/`doVardan()`, не через этот диспетчер). Обновляется
  до полного N в начале хода ВЛАДЕЛЬЦА (`endTurn()`, тот же блок, что снимает exhausted
  владельцу), не хода соперника. Инициализация при входе на поле — `doCreature()`; сброс в 0
  при возврате карты в колоду/руку — `resetC()` (state.js). Тестово повешена на NABUNAGI
  (`t_nab`) и ABYSSWALKER (`j_mal`), `armor:2` — 2026-07-10, по прямому запросу автора (обе и
  так unique/tanky по роли — provoke/bushido и rage/AOE — Броня им подходит по духу).
  Видимость — 3 слоя без нового UI: текст в `ab` карты (уже рендерится как обычно), лог
  (enter/absorb/refill — 3 разных момента), и снапшот в экспортируемом battle log (JSON).
  **Визуальный рендер добавлен 2026-07-10** (см. отдельную запись в журнале сессии ниже) —
  `.card-armor-box`/`.card-small-armor-box`, автор предоставил `armor_bg.png`/`armor.png`.
- [x] Механика «Неукротимость» (`untamed`, working name, Anime pink Mood — см. Trait mapping) —
  реализовано 2026-07-10. Существо с этим тегом снимает `exhausted` уже в момент, когда
  заканчивается его СОБСТВЕННЫЙ ход (т.е. весь ход соперника оно уже НЕ уставшее — может дать
  ответку), а не как обычно — только к своему следующему ходу. Осознанный override только для
  этой карты, не меняет общее правило "уставшее существо не даёт ответку" для всех остальных
  (`endTurn()`, блок для ВЫХОДЯЩЕГО игрока). Тестово повешена на FAERON (`t_faeron`) и
  TUBORG (`t_tuborg`) — 2026-07-10, по прямому запросу автора. Иконка `ico_untamed.png`
  (автор нарисовал в тот же день) подключена тем же способом, что и fear/burn/etc — через
  `TAG_ICONS`/`TAG_TOOLTIPS` (render.js/ui.js), рендерится и на мини-, и на зумленной карте,
  с тултипом по наведению; текст способности в `ab` карт для этого убран — как у всех
  остальных иконок-тегов, дублировать не нужно. **Изначально не рендерилась в Каталоге** —
  у `TAG_ICONS`/`DB_TAG_ICONS` оказалось ЕЩЁ 3 независимые копии этой же карты тег→иконка,
  которые я забыл про в первом заходе: `catalog.js` (2 блока — обычный просмотр + модалка
  сравнения) и `deckbuilder.js` (пул Rush-дековыбора) — везде своя копия списка вместо общего
  источника (см. `render.js` — та же дублирующаяся структура была и там, отсюда и баг).
  Добавлен `untamed` во все 5 копий сразу. **Дальше — тестовая привязка ещё на 7 обычных
  (не unique) travelers**, 2026-07-10, по прямому запросу автора: `t_trvl25_w` (#25, Szarg),
  `t_trvl398_w` (#398, Orb), `t_trvl2_w` (#2, Umb), `t_trvl187_w` (#187, Xui), `j_trvl36_w`
  (#36, Dreegan), `j_trvl20_w` (#20, Umb), `j_trvl22_w` (#22, Merchird) — по одному
  представителю почти каждого Gate, чисто для теста механики на массовых картах, не
  финальное лорное решение (никакой Mood-привязки под капотом — просто добавлен тег).
  Заодно **у `t_trvl26_w` (#26) убран `aoe:1`** (и упоминание "Active: AOE 1 dmg." из
  `ab`) — тоже по прямому запросу автора, карта остаётся чисто `regen:1`/Squad Regen 2 без
  экстра-тега.
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
