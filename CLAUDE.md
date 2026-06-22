# Home’s Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet (Core), each defending a 20 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

## Project Structure

```
index.html          # Markup: landing, game field, rules/lore/catalog screens, modals
css/
  styles.css        # All styles
js/
  data.js           # Card definitions — DEFS object + buildDeck()
  abilities.js      # Ability system: getAbilities(), triggerAbilities()
  deck.js           # mkCard() — card instance creation
  state.js          # Game state G, initState(), findC(), resetC(), lg()
  render.js         # All rendering: render(), mkEl(), mkSmallEl(), reorderZones(), adjustHandOverlap()
  game.js           # Game logic: onClick(), doAttack(), endTurn(), doBurn(), checkWin()...
  catalog.js        # Card catalog: renderCatalog(), filters, sort, openCardDetail()
  ui.js             # UI: startGame(), showScreen(), toggleLog(), updateMulliganBtn() + boot
assets/
  cards/            # Card art (PNG, 62×87px base, ×4 export from Aseprite recommended)
    tea/
    jeet/
  ui/               # UI assets (card backs, backgrounds, icons)
  audio/            # Sound effects and music (planned)
```

Scripts load in strict order in `index.html`:
`data → abilities → deck → state → render → game → catalog → ui`

-----

## Adding a New Card

All cards live in `js/data.js` in the `DEFS` object.

```js
// Key format: {faction}_{id}
t_example: {
  name: "EXAMPLE",     // display name (all caps for legendaries)
  cost: 2,             // essence cost
  hp: 3,               // HP (0 for spells/worlds/artifacts)
  atk: 1,              // ATK (0 for spells/worlds/artifacts)
  art: "🐉",           // emoji placeholder until real art is ready
  f: "tea",            // faction: "tea" or "jeet"
  tags: ["vanguard"],  // ability tags — see Tag System below
  ab: "Ability description shown in catalog and on card.",
  // One optional type flag:
  // spell: true      — instant effect, goes to graveyard
  // world: true      — permanent, only one active at a time
  // artifact: true   — permanent, up to 2 active
  // unique: true     — legendary, 1 copy per deck
},
```

Then add the key to `buildDeck()` in `data.js` — in the appropriate array:
`weak` (common travelers), `legs` (legendaries), `spells`, `worlds`, `arts`, `extra`.

Unique cards with special mechanics not covered by tags need an explicit `switch` case in `getAbilities()` in `abilities.js`.

-----

## Tag System

Tags are strings in a card’s `tags` array. Simple (`"vanguard"`) or with a numeric value (`"heal:2"`).

### All Available Tags

|Tag          |Effect                                                 |
|-------------|-------------------------------------------------------|
|`vanguard`   |Can attack the turn it enters the field                |
|`provoke`    |All enemy attacks must target this card                |
|`pierce`     |Ignores Provoke, can hit base directly                 |
|`fear`       |On attack: target skips its next turn                  |
|`burn`       |On attack: target ignites (−1 HP each turn start)      |
|`heal:N`     |Active: heal an ally N HP and remove all debuffs       |
|`aoe:N`      |Active: deal N damage to ALL enemies                   |
|`draw:N`     |Draw N cards (timing depends on card type — see below) |
|`regen:N`    |On turn start: restore N HP to self                    |
|`revive:full`|Instant: revive last creature from graveyard at full HP|
|`revive:any` |Modifier for `revive:full`: revive from any graveyard  |
|`bounce`     |Instant: return all field cards to their owners’ hands |
|`maxhp_add:N`|Add N to max HP (timing depends on card type)          |
|`ess_add:N`  |Add N Essence (timing depends on card type)            |
|`ess_max:N`  |Permanently increase Essence maximum by N              |

### How `draw` Timing Is Determined

Timing for `draw` is auto-resolved in `getAbilities()` based on card type:

- `spell` → `instant` (on play)
- `world` or `artifact` → `on_turn` (each turn start)
- `unique` → `on_turn` (each turn start)
- regular creature → `on_attack` (on each attack)

Same for `heal`: `artifact`/`world` → `on_turn` (heals all allies), creature → `active` (manual).

-----

## Ability System

### getAbilities(card) → [{timing, effect, val, …}]

Parses a card’s tags and returns an array of ability objects. Each object contains:

- `timing` — when it fires
- `effect` — what it does
- `val` — numeric value (if any)
- `target: 'all'` — for mass effects
- `self: true` — for self-effects (regen)
- `any: true` — for `revive` from any graveyard

### Timings

|Timing     |When it fires                                      |
|-----------|---------------------------------------------------|
|`passive`  |Constant while on field (provoke, pierce, vanguard)|
|`instant`  |Immediately on play (spells)                       |
|`on_enter` |When played to field                               |
|`on_turn`  |At the start of the owner’s turn                   |
|`on_attack`|On each attack                                     |
|`on_kill`  |When this card kills an enemy                      |
|`active`   |Manual player activation (button appears on card)  |

### triggerAbilities(card, timing, ctx)

Called from `game.js` and `endTurn()`. Filters abilities by timing and executes effects.
`ctx` is context object: `{target}` for attacks and heals, `{killed}` for on_kill.

Call sites:

- `triggerAbilities(card, 'instant')` — when a spell is played
- `triggerAbilities(card, 'on_turn')` — in `endTurn()` for worlds and artifacts
- `triggerAbilities(card, 'on_enter')` — when a creature enters (Faeron, Maltor)
- `triggerAbilities(card, 'active')` — when AOE button is pressed
- `triggerAbilities(ally, 'on_kill', {killed})` — after a kill

### Effects

|Effect     |What it does                                          |
|-----------|------------------------------------------------------|
|`aoe`      |Deal N damage to all enemies                          |
|`burn`     |Set `ctx.target.burning = true`                       |
|`fear`     |Set `ctx.target.feared = true`                        |
|`draw`     |Draw N cards for the current player                   |
|`hp_add`   |Heal: target / all allies / self (regen)              |
|`hp_all`   |Increase maxHP and HP for all allies (Aslex)          |
|`hp_base`  |Restore HP to own base (Reaper)                       |
|`maxhp_add`|Increase max HP of target or all allies               |
|`atk_all`  |Give ATK bonus to all allies (Tuborg)                 |
|`bounce`   |Return all field cards to hands (Unseen)              |
|`revive`   |Revive a creature from graveyard                      |
|`salvage`  |Move a card from graveyard to hand                    |
|`raise`    |Revive last card from any graveyard at 1 HP (Phlegmor)|
|`ess_max`  |Increase Essence maximum                              |
|`ess_add`  |Add Essence this turn                                 |

-----

## Game State (G)

Global object in `js/state.js`:

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'action' | 'selectTarget' | 'healTarget' | 'burn',
  sel: cardId | null,          // selected field card
  previewCard: cardId | null,  // previewed hand card
  jeetFirstTurn: Boolean,
  logs: [{msg, cls}],
  mulligan: { tea: {used: 0}, jeet: {used: 0} },
  tea: PlayerState,
  jeet: PlayerState,
}

PlayerState = {
  hp, maxHp,
  ess, essMax,
  hand: [Card],
  field: [Card],
  deck: [Card],
  grave: [Card],   // killed cards — can be revived
  void: [Card],    // burned cards — gone forever
  world: Card | null,
  artifacts: [Card],
  extraDraw: Number,
  burned: Boolean,
}
```

### Game Phases

|Phase         |Description                                                  |
|--------------|-------------------------------------------------------------|
|`action`      |Normal turn: play cards, select creatures to attack          |
|`selectTarget`|Creature selected, waiting for attack target or base click   |
|`healTarget`  |Orbiton selected, waiting for ally to heal or enemy to attack|
|`burn`        |Waiting for a hand card to burn for Essence                  |

-----

## Balance Reference

### Common Travelers (6 types × 5 copies each = 30 per deck)

|Card   |Cost|HP|ATK|Tags    |
|-------|----|--|---|--------|
|Szarg  |1   |1 |2  |vanguard|
|Orbiton|1   |2 |1  |heal:1  |
|Dreegan|3   |4 |1  |provoke |
|Umbasir|2   |1 |1  |aoe:1   |
|Mechird|2   |2 |1  |pierce  |
|Xuitqr |3   |3 |1  |fear    |

### Legendaries (1/1 Unique, 1 copy each)

**Tea:** Teantist (4), Aslex (5), Tuborg (5), Faeron (5), Nabunagi (6)
**Jeet:** Reaper (4), Ryvlen (4), Maltor (4), Phlegmor (5), Big Vardan (4)

### Value Formula

- 1 Essence ≈ 2 stat points (HP + ATK)
- Ability costs: vanguard/provoke/pierce +0.5, fear/burn +0.75–1.0, aoe:1 +1.0, draw on_turn +2.0
- Legendaries get ~1.25 Essence discount for being unique/narrative

-----

## Art Integration

When card art is ready, replace emoji in `data.js`:

```js
art: "assets/cards/tea/teantist.png"
```

In `render.js`, `mkEl()` and `mkSmallEl()` handle both emoji and image paths:

```js
// art field is checked — if ends with image extension, renders as <img>
```

Recommended export: 62×87px from Aseprite, ×4 scale = 248×348px PNG.

-----

## Planned Features

- [ ] Custom card art (in progress)
- [ ] Custom pixel font + UI redesign
- [ ] Sound effects (Web Audio API, no external files)
- [ ] Animations (CSS transitions + JS)
- [ ] Deckbuilding screen
- [ ] AI opponent
- [ ] Web3: wallet connect + NFT ownership verification (Vercel serverless)
- [ ] Online multiplayer (WebSocket, separate infrastructure)
