# Home’s Journey — CCG

A browser-based card game set in the Home’s Journey NFT universe.
Two players face off across a shared device — Tea defends the Tavern, Jeet defends the Core.

🎮 **Play:** [homejourneybook.github.io](https://homejourneybook.github.io)

-----

## About

Home’s Journey CCG is a hotseat collectible card game built on the lore of the Home’s Journey NFT collection. Each faction has its own deck of Travelers, spells, worlds, and artifacts. Reduce your opponent’s base to 0 HP to win.

The game is currently in active development. Art, sound, and Web3 integration are planned for future releases.

-----

## Stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Hosted on GitHub Pages
- Planned: Vercel (serverless functions for Web3), wagmi/ethers.js (wallet connection)

-----

## Project Structure

```
index.html       — markup and screen layout
css/
  styles.css     — all styles
js/
  data.js        — card definitions (DEFS) and deck builder
  abilities.js   — ability system: getAbilities(), triggerAbilities()
  deck.js        — deck logic, mulligan
  game.js        — core game logic: attacks, turns, win conditions
  render.js      — rendering: mkEl(), mkSmallEl(), reorderZones()
  state.js       — game state (G) and initialization
  ui.js          — landing, screens, menus, catalog
  catalog.js     — card catalog with filters, sort, and search
assets/
  cards/         — card art (PNG, 62×87px base, ×4 scale recommended)
    tea/
    jeet/
  ui/            — UI assets
  audio/         — sound effects and music
```

-----

## How to Run Locally

No build step required. Just open `index.html` in a browser.

Or use a local server:

```bash
npx serve .
```

-----

## Adding a New Card

1. Open `js/data.js`
1. Add an entry to the `DEFS` object:

```javascript
t_newcard: {
  name: "Card Name",
  cost: 2,
  hp: 3,
  atk: 2,
  art: "🌀",           // emoji placeholder until art is ready
  f: "tea",            // "tea" or "jeet"
  tags: ["provoke"],   // see tag system below
  ab: "Description shown in catalog.",
  unique: false,       // true for 1/1 legendaries
}
```

1. Add the key to `buildDeck()` in `data.js` if it should appear in the deck.

-----

## Tag & Ability System

Abilities are defined via tags on each card. The engine reads tags and fires effects automatically at the correct timing.

**Timings:** `passive` · `on_enter` · `on_turn` · `on_attack` · `on_kill` · `active` · `instant`

**Tags:**

|Tag          |Effect                         |Timing                       |
|-------------|-------------------------------|-----------------------------|
|`vanguard`   |Attacks immediately on entry   |passive                      |
|`provoke`    |All attacks must target this   |passive                      |
|`pierce`     |Ignores Provoke, hits base     |passive                      |
|`fear`       |Target skips next turn         |on_attack                    |
|`burn`       |Target loses 1 HP/turn         |on_attack                    |
|`heal:X`     |Heal ally X HP, remove debuffs |active                       |
|`aoe:X`      |Deal X damage to all enemies   |active                       |
|`draw:X`     |Draw X cards                   |on_turn / on_attack / instant|
|`regen:X`    |Restore X HP to self           |on_turn                      |
|`revive:full`|Raise from graveyard at full HP|instant                      |
|`ess_add:X`  |Add X Essence                  |on_turn / instant            |
|`maxhp_add:X`|Increase Max HP                |on_turn / active             |
|`bounce`     |Return all field cards to hands|instant                      |

Unique card abilities (Teantist, Tuborg, Aslex, etc.) are defined by `key` in `getAbilities()` inside `abilities.js`.

-----

## Roadmap

- [x] Core game mechanics
- [x] Tag & timing ability system
- [x] Card catalog with filters
- [x] Mulligan
- [x] Mobile layout (hotseat)
- [ ] Custom card art
- [ ] Finalization balance
- [ ] Custom fonts & UI design
- [ ] Sound effects & music
- [ ] Animations
- [ ] Deckbuilding screen
- [ ] AI opponnent
- [ ] Web3 wallet verification (NFT gate)
- [ ] Online multiplayer

-----

## Lore

The game takes place after the events recorded in the Archive.
Full lore: [archive.trianglecirclesquare.org](https://archive.trianglecirclesquare.org)

-----

*Built by DOM & Claude*
