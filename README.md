# Home’s Journey — CCG

> Browser-based hotseat card game set in the Home’s Journey NFT universe.

🎮 **Play now:** [homejourneybook.github.io](https://homejourneybook.github.io)

-----

## About

Home’s Journey CCG is a two-player collectible card game built on the lore of the Home’s Journey NFT collection. Two players share one device — **Tea** defends the Tavern, **Jeet** defends the Core. Reduce your opponent’s base to 0 HP to win. You can also play hotseat-vs-AI on one device.

The game is currently in active development. Rules, card catalog, and tutorial are available in-game.

-----

## Stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Hosted on GitHub Pages
- No server required — runs entirely in the browser

-----

## Development Status

|Feature                       |Status       |
|------------------------------|-------------|
|Core gameplay                 |✅ Complete   |
|Two starter decks (Tea / Jeet)|✅ Complete   |
|Card catalog                  |✅ Complete   |
|AI opponent (hotseat vs AI)   |✅ Complete   |
|Card art                      |🔄 In progress (107 art files in `img/cards/`, ~75 of the planned 60+ traveler defs wired to art in `data.js`) |
|Music & SFX                   |🔄 In progress (5 of 13 audio files wired up — see below) |
|Deckbuilder                   |📋 Planned    |
|NFT integration               |📋 Planned    |
|Online multiplayer            |📋 Planned    |

-----

## Audio

`audio/` currently ships 13 files; only 5 are actually triggered from code:

|File                                                  |Used?|Where                       |
|-------------------------------------------------------|-----|-----------------------------|
|`Main_theme.mp3`                                        |✅   |Background music loop        |
|`Click_Cursor.wav`                                      |✅   |Button clicks                |
|`Navigation_Cursor.wav`                                 |✅   |Hover over cards             |
|`Burn_Card.wav`                                         |✅   |Burning a card                |
|`grate.wav`                                             |⚠️  |Preloaded into the SFX buffer but never actually played anywhere — not wired to an event|
|`card_atack.wav`                                        |❌   |Not used — candidate for regular creature attacks|
|`card_fire_atack.wav`                                   |❌   |Not used — candidate for `burn`-tagged attacks|
|`card_spell_atack.wav`                                  |❌   |Not used — candidate for casting spells|
|`card_select_traveler.wav`                              |❌   |Not used — candidate for playing a card from hand|
|`open_door.wav`                                         |❌   |Not used — candidate for opening rules/lore/catalog screens|
|`yellow_buttom_play_endturn_menu_gravyard_loop.wav`     |❌   |Not used — candidate for End Turn button / graveyard interactions|
|`baf.wav`                                                |❌   |Not used — candidate for buffs (rage, heal, aura applied)|
|`debaf.wav`                                              |❌   |Not used — candidate for debuffs (fear, burn applied)|

-----

## Running Locally

No build step needed. Just open `index.html` in a browser, or serve with any static server:

```bash
npx serve .
```

-----

## Contributing

See `CLAUDE.md` for architecture, tag system, and developer guide.

-----

## License

© Home’s Journey. All rights reserved.
