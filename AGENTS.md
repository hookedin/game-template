# Building a HookedIn game

This repository is a game for [HookedIn](https://hookedin.com): a static web page the player's wallet frames in a
sandbox. The wallet holds the player's keys and money; the game asks it for bets through the SDK, `@hookedin/play`, and
never signs, holds keys or sees a balance.

## Where things are

- `src/` is the game: `index.html`, `style.css`, `icon.svg` and `game.ts`, the entry point, bundled to `dist/game.js`.
- `test/` tests it against the real wallet and a stub casino held to the casino's rules, with no ETH.
- The docs are installed with the SDK, as Markdown, in `node_modules/@hookedin/play/docs/`: start with
  `games/how-a-game-works.md`, then `games/casino-bets.md` or `games/multi-step-games.md`, `sdk/hookedin.md` and
  `games/testing.md`. Online, https://hookedin.com/llms.txt lists them and https://hookedin.com/llms-full.txt holds
  them all.
- The house's games are complete examples with tests, in `node_modules/@hookedin/play/games/`: dice (one decision),
  plinko (many outcomes), samson (a slot) and mines (several steps). To start from one, put it in place of the probe:
  `rm -rf src test && cp -r node_modules/@hookedin/play/games/dice/src node_modules/@hookedin/play/games/dice/test .`

## Commands

- `npm test` type-checks and runs `test/`. Run it after every change.
- `npm run dev` serves the game at `http://127.0.0.1:4185/` and reloads it on every save. `http://localhost:4185/` is a
  local wallet that plays it with pretend money, the real wallet's code and a stand-in casino, with no ETH: try a
  change there. With ETH, the game opens in the wallet at https://play.hookedin.com by **Open a game by its URL**.
- `npm run build` writes `dist/`, the whole game. `npm run format` formats.

## What a game does and does not do

- The page shows only the game: the wallet's top bar names it and shows its allowance. No header, balance, allowance
  control, wallet screen or key prompt of its own, ever.
- Every bet and payment goes through `HookedIn` or `RoundClient` from `@hookedin/play/sdk`. Amounts are bigints of wei,
  never numbers; a player stakes whole METH (`HookedIn.METH`), read with `HookedIn.parseAmount` and shown with
  `HookedIn.formatAmount`.
- A casino bet keeps an edge for the casino, or its quote does not cover it and the wallet refuses it with
  `not-covered`; `@hookedin/play/sdk/admits` checks a bet before it is sent.
- Show the wallet's refusals as their messages say. Until the player sets an allowance, say `HookedIn.NO_ALLOWANCE`, and
  take it, or `HookedIn.NOT_ENOUGH_ALLOWANCE`, down once `HookedIn.onAllowance` reports one.
- Name every operation once and keep what an unfinished round needs, as `RoundClient` does, so a reload or a lost reply
  never places a bet twice.
- `@hookedin/play` follows play's `main` branch, which changes without notice: after `npm update`, run `npm test`.
