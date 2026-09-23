# HookedIn game template

Start here to build a game for [HookedIn](https://play.hookedin.com).

This repository is a GitHub template. What it contains is the **bridge probe**: a minimal page that sends every wallet bridge method by hand and prints each raw reply. It is a working HookedIn game in four source files, and the quickest way to see what the wallet says to a bet, a rejection, a funding request or a lost reply. Replace the probe's page with your game and keep the rest.

This README is the developer guide. The reference for every detail is [docs/game-sdk.md](https://github.com/hookedin/play/blob/main/sdk/docs/game-sdk.md) in the SDK.

## The model in one minute

- A game is a **static web page** on your own host. The wallet at [play.hookedin.com](https://play.hookedin.com) loads it in a sandboxed iframe.
- The game owns its rules, its presentation and its saved state. The wallet owns the player's keys, balance and settlement. The game never sees a key and never signs anything.
- The game asks the wallet to place **bets**. A bet is a stake plus 1 to 64 **prizes**. A prize is `{ rangeStart, rangeEnd, payout }`: it pays when the round's outcome, a uniform integer below 2^64, falls in `[rangeStart, rangeEnd)`. Its probability is its width over 2^64. Prizes may overlap, and then they add. An outcome in no prize pays nothing.
- The outcome comes from a secret the casino committed to in advance, combined with a seed the player's wallet draws afterwards. The wallet verifies the result before your game hears about it.
- You earn **half the commission** on every bet placed through your game.

Anything you can express as prize ranges is a game. A coin flip is one prize. A Plinko board is a prize per bucket. A slot is a prize per distinct payout. A multi-step game such as blackjack is one bet per step.

## Quick start

You need Node 24.4 or later.

Create your repository with **Use this template** on GitHub, or clone directly:

```sh
git clone https://github.com/hookedin/game-template my-game
cd my-game
npm install
```

Put your own address in `developer` in [src/manifest.json](src/manifest.json): the file ships with `0xcD0C778307e7D3Da6D3D23440285050f911840d4`, and whatever address is there earns the game's commission. Then:

```sh
npm run dev
```

`npm run dev` builds the game into `dist/` and serves it at `http://127.0.0.1:4185` (set `PORT` to move it). Then:

1. Open the wallet at [play.hookedin.com](https://play.hookedin.com).
2. Go to **Games**, choose **Add a custom game** and load `http://127.0.0.1:4185/manifest.json`.
3. Press **Add funds** in the probe, pick a preset such as `game.bet · 50% to double`, edit the JSON if you like, and press **Send**. Every request, reply and event (`game.balance`, `game.receipt`) is printed, newest first.

A game served from your own machine works against any HookedIn wallet and casino, because the wallet loads the manifest and the page from your browser. Testing against a fully local stack needs the casino server, which is private. Most developers should use the public Sepolia deployment at play.hookedin.com.

Reload after a change: every page load rebuilds the game.

The probe's `50% to double` preset has no house edge, so expect the casino to decline it. That is useful: it shows you a rejection receipt. Narrow the range (see the example below) for a bet the casino accepts.

The two `game.place` presets need the game published with a referee (see [bets that settle later](#bets-that-settle-later)); paste the id of your referee's open round into the drawn one. Once a bet has settled, or come back, its receipt arrives by itself as a `game.receipt` event in the log.

## What is in the repository

| File                                   | What it holds                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [src/manifest.json](src/manifest.json) | What the wallet reads to load the game                                                                                 |
| [src/index.html](src/index.html)       | The page. It loads `./shared.css`, `./style.css` and `./game.js`                                                       |
| [src/game.ts](src/game.ts)             | The entry point, bundled to `dist/game.js`. Here: the probe's presets, send button and log                             |
| [src/style.css](src/style.css)         | Page styles, on top of the SDK's `shared.css`                                                                          |
| [test/bet.test.ts](test/bet.test.ts)   | First tests: real signed bets through the real wallet, against a stub casino that holds them to the casino's own rules |
| [package.json](package.json)           | Scripts `build`, `dev`, `typecheck`, `test`, `format`; one dependency, `@hookedin/play`                                |

The build is the `hookedin-game` command that `@hookedin/play` installs. It bundles `src/game.ts` with esbuild, copies everything in `src/` that is not TypeScript, and adds `shared.css`, the brand mark and a `_headers` file. Add more `.ts` modules, images or fonts under `src/` as you need them.

## The manifest

```json
{
  "id": "my-game",
  "name": "My game",
  "description": "One or two sentences shown on the game's card.",
  "entry": "./index.html",
  "developer": "0xYourAddress"
}
```

| Field         | Required | Meaning                                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------------------- |
| `name`        | yes      | Shown in the wallet. At most 80 characters                                                    |
| `entry`       | yes      | The page to frame, relative to the manifest or absolute                                       |
| `developer`   | yes      | The address that earns the game's commission. Not the zero address                            |
| `description` | no       | Shown with the game. The wallet shows at most 220 characters                                  |
| `referee`     | no       | The address of your server's key, when your game has a referee; published with the game       |
| `id`          | no       | Lowercase letters, digits and hyphens, starting with a letter or digit; at most 32 characters |

### What you pay back is measured, not stated

There is no manifest field for a return, and you should not put your number anywhere else either. A game cannot prove what it pays back: nothing bounds how often it wagers the money it holds, so even a game whose every bet returns 99% can churn a balance to nothing, and a stated figure reads as a promise it is not keeping.

What players see instead is measured from the bets themselves. Before the wallet signs a bet it works out that bet's exact return — every prize's width against its payout, over the stake — and shows it beside the bet in the player's history; the casino publishes the same figure for every bet placed in your game, so anyone can look up what your game has really paid back. `betReturn(bet)` from `@hookedin/play/sdk/admits` is that computation, in millionths of the stake.

So build a table you are happy to be measured on, and pin its floor in a test rather than in your manifest. Two things round against you: prize ranges are whole outcomes and payouts are whole units, so a table that returns exactly 99% at ordinary stakes returns less at dust ones — a Plinko board pays back 38% at a stake of one wei. [Plinko's test](https://github.com/hookedin/play/blob/main/games/plinko/test/plinko.test.ts) runs the check over every board at every stake.

The manifest must be at most 16 KB and served with CORS headers. Any manifest, listed or not, is linkable as `https://play.hookedin.com/games/custom?manifest=<encoded manifest URL>`. Opening a link loads the game; it grants no spending authority.

Your game is you and the name you publish it under: its key is made from the account you publish it from and that name. Publish it from your own account; `developer` is who is paid, and need not be you. The wallet refuses a published game whose manifest names another developer than the one it was published with, so a host that is taken over cannot redirect the commission. To pay another address, change `developer` and publish the game again; to move hosts, publish it again at its new URL. Either way it keeps its key, its bets and its players' receipts. A manifest loaded without being published has the key of its developer and its URL.

## The sandbox

The wallet frames your entry page with `sandbox="allow-scripts allow-same-origin"` and a permissions policy that turns off the camera, microphone, geolocation, clipboard, payment and fullscreen.

What you can do:

- Run scripts, and use your own origin's `localStorage`, IndexedDB and cookies. Keep your round state there.
- Fetch from your own origin.
- Talk to the wallet with `postMessage`.

What you cannot do:

- Reach the wallet's DOM, storage or keys, or a browser wallet extension.
- Navigate the top window, open popups, submit forms, show modal dialogs (`alert`, `confirm`) or start downloads.
- Be served from the wallet's own origin. The wallet refuses such a manifest or entry.

The build also writes a Content-Security-Policy into `dist/_headers`:

```text
default-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'self';
img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'
```

So: no inline scripts or inline `<style>` blocks, no CDN scripts or fonts, no third-party requests. Bundle what you need. The policy is yours to change if you host elsewhere, but a tight one is part of what makes a game trustworthy.

## Game balances

A game does not get the player's balance. It gets a **spending limit** for the open tab: money the player chose to let this game risk, plus the game's verified winnings.

- The wallet pushes a `game.balance` event `{ balance, pending }` when the iframe loads and whenever either changes. There is nothing to poll.
- The only way to raise the limit is `game.requestFunds`. The wallet shows its own dialog; the player picks the amount or declines. Your `amount` is a suggestion shown to the player, and every word of the dialog is the wallet's.
- Every bet and payment must fit the limit. Wins raise it, losses lower it.
- Leaving the game, reloading or closing the tab releases the limit. The money was never anywhere but the player's signed channel balance.
- `pending: true` means the wallet holds a signed operation that has not resolved. No new wager is possible until the player recovers it in the wallet.

`mountBank(element)` from the SDK renders all of this as the strip at the top of the reference games.

## The bridge

Import the bridge, or post the envelopes yourself:

```ts
import { HookedIn } from '@hookedin/play/sdk/sdk';
const { asset } = await HookedIn.hello(); // what this wallet offers and the asset it plays with
const info = await HookedIn.info();

// The same request without the SDK:
parent.postMessage({ hookedin: true, id: 1, method: 'wallet.hello', params: {} }, '*');
```

A reply carries the same `id` and either `result` or `error: {code, message}`; the SDK rejects with a `HookedInError`, whose stable `code` is what your game acts on. The wallet accepts requests only from the iframe it opened, at the origin of your entry page, needs each envelope `id` to be a whole number larger than the last, and limits a request to about 70,000 characters. Questions are answered at once; whatever signs or asks the player takes its turn in the order you asked.

A wallet plays with the network's ETH or with the casino's test coins, and `wallet.hello` says which. Amounts are whole numbers of the asset's smallest unit, as decimal strings; `wallet.hello` gives the asset's `symbol` and `decimals`, and `HookedIn.parseAmount` and `formatAmount` convert with them, so a game needs no code of its own for test coins. The `id` inside a financial request is your durable name for that operation, the same on every channel the player opens: 1 to 64 characters of letters, digits, `.`, `_`, `:` or `-`. The same `id` with the same terms returns the saved receipt; the same `id` with different terms fails with `id-conflict`.

| Method              | Parameters                                                                     | Result                                                                                             |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `wallet.hello`      | `{}`                                                                           | `{methods, asset: {id, symbol, decimals}, chainId, limits}`                                        |
| `wallet.info`       | `{}`                                                                           | `{uname, alias, chainId, bankroll, recommendedStake}`, and nothing else of the player              |
| `game.requestFunds` | `{amount?}`                                                                    | `{funded, amount, balance, pending}` after the player's decision; every word in it is the wallet's |
| `game.bet`          | `{id, stake, prizes, group?}`                                                  | Its receipt, settled at once on the player's own round: `settled`, or `rejected`                   |
| `game.place`        | `{id, stake, prizes, round, group?}` or `{id, stake, terms, deadline, group?}` | Its receipt at once: `placed`, and final, or `rejected`. Your referee settles it later             |
| `game.payment`      | `{id, amount, group?}`                                                         | Its receipt. Pays the casino's bankroll; no outcome, no commission                                 |
| `game.receipt`      | `{id}`                                                                         | The receipt of an earlier operation by your `id`, as it stands, or `null`                          |

Two events arrive unasked: `game.balance` with `{balance, pending}`, and `game.receipt` with `{receipt}`, once a bet your game placed with `game.place` has settled or come back and the wallet has collected it.

The SDK wraps these as `HookedIn.call`, `HookedIn.bet(request)`, `HookedIn.place(request)`, `HookedIn.payment(id, amount, group?)`, `HookedIn.receipt(id)`, `HookedIn.requestFunds(options)` and `HookedIn.balance()`; `HookedIn.onBalance(listener)` and `HookedIn.onReceipt(listener)` hear the events, and each returns a function that stops listening. It also has `HookedIn.initializeGame` for read-only startup, `HookedIn.storageScope(info)` for a storage key unique to the page, player and asset (on the player's permanent name), and `parseAmount`, `formatAmount` and `stepStake` for stake fields.

A receipt, as the game sees it:

```ts
{
  id, // your operation id
  kind, // 'bet' or 'payment'
  status, // 'settled'; 'rejected', the balance unchanged; 'placed', to settle later; 'refunded', unsettled by its deadline
  basis, // what a settled bet's payout rests on: 'outcome', which the wallet checked, or 'referee', its word
  stake, // a bet as it was placed: its stake, its prizes or terms, and for a bet that settles later its deadline
  prizes,
  round, // the round a drawn bet rides
  terms,
  deadline,
  group, // the label you gave it, if any
  bet, // the hash naming a bet that settles later, at the casino and to your referee
  outcome, // the 64-bit outcome of the round that settled a bet with prizes, as a decimal string
  payout, // what the bet paid once it has settled, or the stake a refund gave back
  reason, // present on a rejection, and on a refund
}
```

The game receives the outcome, never the signed evidence. Games cannot request signatures, supply bet seeds or choose the fee recipient.

## A one-shot bet

A coin flip that pays double 49.5% of the time, a 99% return:

```ts
import { HookedIn } from '@hookedin/play/sdk/sdk';

const SPACE = 1n << 64n;

async function flip(stakeText: string) {
  const stake = HookedIn.parseAmount(stakeText); // '0.000001' -> '1000000000000'

  // 1. Make sure the game may risk the stake. The player decides in the wallet's dialog.
  const { balance } = await HookedIn.balance();
  if (BigInt(balance) < BigInt(stake)) {
    const funding = await HookedIn.requestFunds({ amount: stake });
    if (BigInt(funding.balance) < BigInt(stake)) return null;
  }

  // 2. Name the operation and save it at your own origin before the wallet signs anything.
  const id = crypto.randomUUID();
  localStorage.setItem('flip:pending', JSON.stringify({ id, stake }));

  // 3. Place the bet: the stake, and one prize over the first 49.5% of the outcome space.
  const receipt = await HookedIn.call('game.bet', {
    id,
    stake,
    prizes: [{ rangeStart: '0', rangeEnd: String((SPACE * 495n) / 1000n), payout: String(2n * BigInt(stake)) }],
  });

  // 4. Read the result from the receipt, never from your own randomness.
  localStorage.removeItem('flip:pending');
  if (receipt.status !== 'settled') return null; // rejected: balance unchanged; offer the same bet under a fresh id
  return BigInt(receipt.outcome) < (SPACE * 495n) / 1000n; // true: heads, paid 2x
}
```

Rules that make this safe:

- **Save before you send.** If the reply is lost (a crash, a reload, a timeout), read your saved `id` on startup and call `game.receipt`. A receipt is the reply you lost; apply it exactly once. `null` with `pending: true` means the wallet still holds the signed request, and the player recovers it from the wallet's banner. `null` otherwise means this wallet has no record of it: send the same request again under the same `id`.
- **An `id` is the player's.** It names one operation of your game in one asset on every channel the player opens, so the same request on their next channel finds the operation instead of placing another. A wallet restored from an older backup may not hold the receipt of an operation carried out on an earlier channel: the request then fails with `id-used`, because it was carried out and its result is not in this wallet. Do not send it again under another `id` without asking the player.
- **A rejection is not a loss.** `status: 'rejected'` is a signed checkpoint the wallet checked: the bet was cancelled with the balance unchanged. Offer the same bet again under a fresh `id`. A timeout or a generic error proves nothing: retry the exact request with the same `id`.
- **Show the verified outcome.** Compute what the player sees from `receipt.outcome`: which bucket, which card, which reel stop. Then the picture and the money cannot disagree, and your page needs no randomness of its own.
- **Leave the casino an edge.** The casino admits a bet only if its bankroll can carry it, and bigger prizes need more edge. Check a bet before offering it with `admits(bankroll, bet)` from `@hookedin/play/sdk/admits`, which is the casino's own rule; `wallet.info` reports `bankroll`. The reference games check against half the reported bankroll so that ordinary movement does not invalidate the bet.
- **Scope your storage.** Key saved state by page, chain, player and asset (`HookedIn.storageScope(info)`), so games that share a host and accounts that share a browser do not read each other's rounds.

[Plinko](https://github.com/hookedin/play/tree/main/games/plinko) is the complete version of this pattern: `src/drop.ts` there is about 150 lines and is the part to copy.

## Multi-step games: RoundClient

A game with decisions, such as blackjack or Mines, is played as one bet per step, each settled on its own, so a player can walk away after any settled step with the cash that step left them ([settled trade-offs](https://github.com/hookedin/play/blob/main/architecture.md#settled-trade-offs)). The SDK's `RoundClient` does the bookkeeping. You describe the game as a finite graph of public states:

```ts
import { HookedIn } from '@hookedin/play/sdk/sdk';
import { RoundClient } from '@hookedin/play/sdk/round';
import { fraction } from '@hookedin/play/sdk/engine';

const round = new RoundClient(HookedIn, setup => ({
  root: 'ready',
  nodes: [
    {
      id: 'ready',
      kind: 'decision',
      actions: [
        {
          id: 'flip',
          outcomes: [
            { next: 'won', probability: fraction(495n, 1000n) },
            { next: 'lost', probability: fraction(505n, 1000n) },
          ],
        },
      ],
    },
    { id: 'won', kind: 'terminal', payout: 2n * BigInt(setup.stake) },
    { id: 'lost', kind: 'terminal', payout: 0n },
  ],
}));

await round.restore(); // on startup: reload a saved round, resolve a lost reply
let state = await round.start({ stake: HookedIn.parseAmount('0.000001') });
state = await round.action('flip');
// state.nodeId, state.terminal, state.cash, state.actions, state.events, state.settlement
```

What it does for you:

- Prices every state with the SDK's engine, using the casino's own admission rule, so each step is a bet the casino will accept. A step becomes a stake (the cash that can be lost) and a prize for every better successor state; each successor's range is as wide as its probability.
- Saves the round and each pending step in `localStorage` before the wallet signs, resolves lost replies through `game.receipt`, and keeps the same action across a rejection.
- Asks the wallet for funds when a step needs more than the game holds, including extra wagers such as a double or a split (`additionalCash` on an action).
- Checks that the wallet's verified payout matches the state the outcome names, and records each step's label (the card, the tile) in `state.events` so you can redraw after a reload.
- `round.watch(listener)` reloads the round when another tab of the same game changes it.
- Lets go of a round saved under rules the page does not build, such as a graph you have changed: `restore()` throws once, telling the player that what the round held is in their balance, and returns `null` after.

The graph must be finite and acyclic, with exact rational probabilities that sum to one per action, and at most 64 distinct prizes per step.

Reference games built this way: [Dice](https://github.com/hookedin/play/tree/main/games/dice) (one step), [Mines](https://github.com/hookedin/play/tree/main/games/mines) (stop when you like), [Samson's Gold](https://github.com/hookedin/play/tree/main/games/samson) (a slot: one step, dozens of prizes) and [Blackjack](https://github.com/hookedin/play/tree/main/games/blackjack) (up to dozens of steps, with a precomputed price table). The theory is in [sequential games built from native bets](https://github.com/hookedin/play/blob/main/sdk/docs/sequential-games.md).

## Bets that settle later

A game can run a server of its own: its **referee**, a key you name as the manifest's `referee` and publish with the game, driven with `createReferee({ casinoURL, key, game })` from `@hookedin/play/sdk/referee`. `game` is the game's key: the one your profile lists, or `gameKey({ publisher, name })`, exported beside it, where `publisher` is the address you publish the game from.

The page places such a bet with `game.place` (`HookedIn.place`). It is placed at once and final, the stake leaving the game's balance, and the reply is its receipt, `placed`. Once it has settled, or come back, the wallet collects it and pushes the new receipt as a `game.receipt` event (`HookedIn.onReceipt`). The wallet looks by itself every few seconds; a page that hears from your server that a bet has settled calls `game.receipt` with its `id`, and the wallet looks at once.

- A bet with **prizes** is **drawn**: `{id, stake, prizes, round}` names one of your game's rounds. Your server gets it from `referee.open(asset)` and tells its pages its `id`: the casino names the round and your referee commits the seed it will draw it with before anybody bets on it, so each bet's outcome is fixed before it is placed. A round takes bets until its `deadline`, `limits.round` (ten minutes) after the casino names it, and every bet on it has that deadline; the wallet refuses a bet on a round that takes no more with `round-closed`. The casino takes each bet against the bankroll as it is placed, with every bet the round took before it, and declines one that does not fit. When your game is ready, `referee.draw(id)` draws the round on one outcome and pays every bet on it what its prizes pay. Save the round's id before you draw it, so a restarted server draws the same one. A crash game with no manual cash-out is drawn, each automatic cash-out one prize. [Roulette](https://github.com/hookedin/play/tree/main/games/roulette) is the example.
- A bet with **terms** is **split**: `{id, stake, terms, deadline}`, the deadline within `limits.deadline`, 30 days. Your referee signs what it pays: a match at the odds you offered, or a cash-out made by hand in a crash game, whose crash point your referee keeps to itself. A manual cash-out cannot be drawn: to know when to crash, your referee would have to draw at take-off, and a draw is public. The `terms` are your own JSON, and your referee's own bank at the casino pays what a split comes to beyond the stake and keeps the rest: import the referee's key in the wallet's **Settings**, and put money in its bank on **My games**.

A bet nobody settles by its deadline is refunded. Before it collects, the wallet checks what settled a bet, the seed and the secret that drew its round or the referee's signature on the split, and the receipt's `basis` says which. A referee that only draws holds no money; a split your referee signs is paid from its own bank, so keep its key as safe as the bank. Nothing in the bank is reserved, and a batch of splits it cannot pay is refused whole: whether you can pay what your referee settles is between you and your players, and playing your game trusts you for its outcomes and its payments ([settled trade-offs](https://github.com/hookedin/play/blob/main/architecture.md#settled-trade-offs)). `group` labels bets and payments that belong together, the steps of a hand or the bets on a match, and the wallet shows them as one.

## Commission

The casino admits a bet when its bankroll could take it with no commission at all. Commission is the edge the bankroll does not need, the most that still leaves its wager sound, and it is split equally: half to the `developer` address the wallet signs into the bet, half to the casino. That admits the largest bets and charges only the surplus ([settled trade-offs](https://github.com/hookedin/play/blob/main/architecture.md#settled-trade-offs)). No fee protects a player from a game: a game can spend its whole spending limit on bets that pay back little, and the wallet records each bet's return without refusing it. The limit the player sets is their protection.

- It accrues on every settled bet with prizes, win or lose; a drawn bet's is priced over its whole round when the round is drawn. A rejected bet earns nothing. A split gives the casino the part your referee signs instead, which the casino asks to be about half of what the bet was expected to earn you; nothing enforces it.
- It is never an extra debit to the player. The player's stake and prizes are exactly what was signed.
- It depends on the bet's edge and on the casino's bankroll. A zero-edge bet earns nothing and is normally declined.
- The wallet takes the address from your manifest, and for a published game checks it is the one the game was published with. The game page cannot change it.

**How to collect it.** The tally is held for the `developer` address itself. Open an ordinary HookedIn wallet from that address and its wallet page shows what your games have earned; the wallet collects what is due by itself, into that address's channel. Nobody at the casino approves or sends anything. So put an address you can open a wallet from in your manifest: commission owed to an address that never opens a channel is never collected.

The arithmetic is in [pricing and commission](https://github.com/hookedin/play/blob/main/docs/economics.md).

## What to change first

1. [src/manifest.json](src/manifest.json): `id`, `name`, `description`, and `developer` (your address).
2. [src/index.html](src/index.html) and [src/style.css](src/style.css): your page. Keep the `<div id="bank">` if you want the SDK's balance strip, and keep loading `./game.js` as a module.
3. [src/game.ts](src/game.ts): your rules. Start from the one-shot example above or from a `RoundClient` graph.
4. `package.json`: the package `name` and `repository`.

Keep the probe around in a branch. It is the fastest way to reproduce a wallet reply you did not expect. The wallet also keeps a developer log of every bridge message for the open game, which you can read and download below the game when the wallet URL carries `?log`.

## Deploy

`npm run build` writes `dist/`: plain static files. This repository deploys itself to Cloudflare whenever `main` is pushed, through [.github/workflows/deploy.yml](.github/workflows/deploy.yml) and [wrangler.jsonc](wrangler.jsonc). In your fork:

1. In [wrangler.jsonc](wrangler.jsonc), change `name`, and add `routes` for a domain on your Cloudflare account. Without `routes` the game is served at `<name>.<your-subdomain>.workers.dev`.
2. In the repository's **Settings → Secrets and variables → Actions**, add the secret `CLOUDFLARE_API_TOKEN` (create it in Cloudflare from the **Edit Cloudflare Workers** template) and the variable `CLOUDFLARE_ACCOUNT_ID`.
3. Push to `main`. The workflow tests, builds and publishes.

Every six hours [.github/workflows/update-play.yml](.github/workflows/update-play.yml) (**Update play**) takes play's newest `main` and, when the lockfile changes and the tests pass, commits it and starts Deploy.

To publish by hand instead: `npm run build && npx wrangler deploy`.

Any static host works. It must send the headers in `dist/_headers`, which Cloudflare applies by itself. The one that matters most is `Access-Control-Allow-Origin: *`: the wallet fetches `manifest.json` from a different origin and refuses a game whose manifest it cannot read. The file also sets the page's Content-Security-Policy. Do not host the game on the wallet's own origin; the wallet refuses that too.

Your game is then playable by anyone who loads `https://your-host/manifest.json` as a custom game, or through the link `https://play.hookedin.com/games/custom?manifest=<encoded manifest URL>`.

## Get listed

Publish it yourself, from your own account: in the wallet, open **My games** and, under **Games you publish**, give the game a name and this manifest's URL. Publishing needs a funded ETH channel. It is then at `@<your name>/<game name>` for anyone with a wallet. The library the casino ships with is what `@hookedin` publishes, from [catalog.json](https://github.com/hookedin/play/blob/main/catalog.json) in the [hookedin/play](https://github.com/hookedin/play) repository; open an issue or a pull request there to be in it.

## Tests

```sh
npm test
```

This type-checks and runs everything in `test/`. [test/bet.test.ts](test/bet.test.ts) is where to start. `gameWallet()` from `@hookedin/play/testing/game-wallet.ts` gives you `f`: the real wallet, `f.wallet`, wired to a stub casino that holds every bet to the casino's own admission rule and charges its commission, so a table it takes is one the casino takes. `f.bridge` is your game's side of the bridge: every request goes through the checks the wallet's bridge makes, the player agrees to every request for funds, and `f.bridge.onReceipt` hears pushed receipts. The three tests settle a bet and check the balance, send one bet twice and find it placed once, and see a zero-edge bet declined with the balance unchanged. Replace their bets with your own rules and prove your table's floor.

For a game with a referee, `f.referee` is a stub shaped like the one `createReferee` returns, to test your server against, and `f.advance(ms)` moves time on, so bets past their deadlines come back. `f.replaceChannel()`, `f.reload()` and `f.forget()`, a wallet without its receipts, test recovery.

The runner is `node --import tsx --test test/*.test.ts`, because `@hookedin/play` ships TypeScript and Node does not strip types inside `node_modules` by itself. [Plinko's test](https://github.com/hookedin/play/blob/main/games/plinko/test/plinko.test.ts) is the fuller model: it proves the return from the signed prizes, then drops balls through the wallet and recovers a lost reply.

## Fairness, for your players

- The game never holds keys. The wallet signs each bet whole: the stake and every prize, or its terms.
- Every bet with prizes is on a round, named by the hash of a secret the casino fixed before the seed was drawn: the wallet's own for a bet that settles at once, the one your referee committed to its round for a drawn bet. The outcome is the low 64 bits of `keccak256(abi.encode(keccak256("HOOKEDIN/OUTCOME"), seed, secret))`.
- The wallet checks the revealed secret, and a drawn bet's seed, against the hashes the bet signed, recomputes the outcome and the payout, and only then tells the game. A split rests on your referee's signature, and its receipt says so.
- The game never sees future entropy. It learns an outcome only from a completed receipt.

The wallet verifies each bet and measures what it pays back. It does not certify your rules, your animations, or that a funded game finishes. Publish your source, prove your table's floor in a test, and draw what the player sees from the verified outcome.

## License

[MIT](LICENSE)
