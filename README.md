# Guess the Normie

Guess the Normie is a browser deduction game built for the Normies universe.

Live demo: https://guess-the-normie.vercel.app/

## Concept

One hidden Normie is selected from a board of 24 characters. The player must identify it by asking yes/no questions based on official Normies API traits.

The game uses the native/original Normies data as the source of truth:

- official traits from the Normies API
- original Normie images
- read-only wallet ownership lookup

## Game Modes

### Beginner

Beginner mode uses natural questions and trait families.

Examples:

- Is your Normie a human?
- Does your Normie wear glasses?
- Does your Normie have facial hair?

When natural questions run out, the game generates additional questions from the remaining API traits.

### Hardcore

Hardcore mode uses exact API traits.

Examples:

- Type = Alien
- Accessory = Bandana
- Expression = Peaceful

In Hardcore mode, a wrong final guess ends the run.

## Board Types

### Random Board

Creates a board of 24 Normies using random token IDs, with a light balancing pass across key traits.

### Wallet Board

Players can paste a public wallet address. No wallet connection or signature is required.

Owned Normies are used first, then the board is filled with wild random Normies until it reaches 24 cards.

If the wallet has no Normies, the game shows a small prompt:

> You definitely should grab one :)

## Features

- 24-card deduction board
- Beginner and Hardcore modes
- Random and read-only Wallet boards
- Automatic elimination after each answer
- Manual Hide / Restore cards
- Hint system with score penalty
- Trait distribution hint
- Score breakdown at the end of each run
- Secret Normie reveal
- Local score history
- Recently Discovered strip on the home screen
- Local cache for Normie traits and images
- Static deployment on Vercel

## Scoring

Scores are capped between 0 and 1000.

Beginner:

```text
1000 - 60/question - 150/hint - 300/wrong guess
```

Hardcore:

```text
1000 - 45/question - 150/hint - 300/wrong guess
```

## Normies API Usage

The prototype uses:

```text
/normie/{id}/traits
/normie/{id}/original/image.svg
/normie/{id}/original/image.png
/holders/{address}
```

SVG images are preferred. PNG images are used as a fallback if an SVG does not load.

## Local Development

Run a local static server from this folder:

```powershell
.\start-server.ps1
```

Then open:

```text
http://127.0.0.1:5173
```

If PowerShell blocks script execution:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

## Deployment

The app is static and can be deployed directly to Vercel.

Recommended Vercel settings:

- Framework preset: Other
- Build command: empty
- Output directory: .
- Install command: empty

## Roadmap

- Final home screen polish
- Local leaderboard by mode and board type
- Discord authentication
- Verified Discord leaderboard
- Daily Challenge
- Best of 3 daily score limit
- Donation wallet copy action
- ETH/BTC price widgets
- Normies floor price widget

## Credits

Made with <3 by @LaurentMoulin.

## License

MIT License.
