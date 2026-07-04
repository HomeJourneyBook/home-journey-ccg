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

`audio/` — `grate.wav` was removed (never used). Everything else is wired up; most UI clicks now share one "generic button" sound, with dedicated sounds for combat/status effects:

|File                                                  |Role                        |
|-------------------------------------------------------|-----------------------------|
|`Main_theme.mp3`                                        |Background music loop        |
|`Click_Cursor.wav`                                      |Only the hand-card preview tap (selecting a card to preview it) |
|`Navigation_Cursor.wav`                                 |Hover: cards (hand/field/catalog) + every `<button>` (one delegated listener in `ui.js`) |
|`Burn_Card.wav`                                         |Burning a card from hand     |
|`card_atack.wav`                                        |Regular attack (creature vs. creature or base) — suppressed if this hit will apply Fear or Burn |
|`card_fire_atack.wav`                                   |Burn applied to a target (dedicated debuff sound, decoupled from the attack itself) |
|`card_spell_atack.wav`                                  |Playing a spell card; AOE (active button or on-enter trigger); Shard/Altar artifact resolving |
|`open_door.wav`                                         |Landing gates opening; playing a World/Artifact card; opening the hamburger menu |
|`yellow_buttom_play_endturn_menu_gravyard_loop.wav`     |The "generic button" sound — End Turn, graveyard/log open+close, hamburger items, hotseat/catalog/rules/lore nav, catalog sort+filter+card click, all modal confirm buttons, playing a creature card |
|`baf.wav`                                                |Buff applied: Rage, active heal-ally, aura buff (delayed ~150ms so it doesn't get masked by a simultaneous click/gate sound), regen tick |
|`debaf.wav`                                              |Fear applied (replaces the attack sound for that hit)|

See `CLAUDE.md` → "Sound System" for the exact call sites if you're adding a new sound.

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
