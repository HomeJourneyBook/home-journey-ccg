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
|Music & SFX                   |✅ Complete   (all 12 audio files wired up) |
|Deckbuilder                   |📋 Planned    |
|NFT integration               |📋 Planned    |
|Online multiplayer            |📋 Planned    |

-----

## Audio

`audio/` — `grate.wav` was removed (never used, no longer referenced anywhere in code). Everything else is now wired up:

|File                                                  |Used?|Where                       |
|-------------------------------------------------------|-----|-----------------------------|
|`Main_theme.mp3`                                        |✅   |Background music loop        |
|`Click_Cursor.wav`                                      |✅   |Generic button clicks + playing a card from hand (`card_select_traveler.wav` intentionally not used — this sound covers it)|
|`Navigation_Cursor.wav`                                 |✅   |Hover over cards             |
|`Burn_Card.wav`                                         |✅   |Burning a card                |
|`card_atack.wav`                                        |✅   |Regular creature attack (vs. creature or base)|
|`card_fire_atack.wav`                                   |✅   |Attack by a creature with the `burn` tag (replaces `card_atack.wav` for that attacker)|
|`card_spell_atack.wav`                                  |✅   |Active AOE ability button (Umb / Vardan)|
|`open_door.wav`                                         |✅   |Clicking Play Game — synced with the gate-opening animation|
|`yellow_buttom_play_endturn_menu_gravyard_loop.wav`     |✅   |End Turn button + opening the Graveyard modal|
|`baf.wav`                                                |✅   |Buff applied: Rage trigger, active heal-ally targeting, aura (ATK/maxHP) actually buffing allies — fires once per aura application, not per affected card|
|`debaf.wav`                                              |✅   |Debuff applied: Fear (Burn keeps its own sound via `card_fire_atack.wav` on the attack that inflicts it)|

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
