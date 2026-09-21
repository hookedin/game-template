# HookedIn game template

Start here to build a game for [HookedIn](https://play.hookedin.com).

This repository is a GitHub template. What it contains is the **bridge probe**: a minimal page that sends every wallet bridge method by hand and prints each raw reply. It is a working HookedIn game in four source files, and the quickest way to see what the wallet says to a bet, a rejection, a funding request or a lost reply. Replace the probe's page with your game and keep the rest.

This README is the developer guide. The reference for every detail is [docs/game-sdk.md](https://github.com/hookedin/game-sdk/blob/main/docs/game-sdk.md) in the SDK.

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
HOOKEDIN_DEVELOPER=0xYourAddress npm run dev
```

`npm run dev` builds the game into `dist/` and serves it at `http://127.0.0.1:4185` (set `PORT` to move it). Then:

1. Open the wallet at [play.hookedin.com](https://play.hookedin.com).
2. Go to **Games**, choose **Add a custom game** and load `http://127.0.0.1:4185/manifest.json`.
3. Press **Add funds** in the probe, pick a preset such as `game.bet · 50% to double`, edit the JSON if you like, and press **Send**. Every request, reply and `game.balance` event is printed, newest first.

The wallet refuses a manifest whose `developer` is the zero address, which is what `src/manifest.json` ships with. Set `HOOKEDIN_DEVELOPER` as above, or edit the file.

A game served from your own machine works against any HookedIn wallet and casino, because the wallet loads the manifest and the page from your browser. Testing against a fully local stack needs the casino server, which is private. Most developers should use the public Sepolia deployment at play.hookedin.com.

Re-run `npm run dev` after a change; it rebuilds on start.

The probe's `50% to double` preset has no house edge, so expect the casino to decline it. That is useful: it shows you a verified rejection receipt. Narrow the range (see the example below) for a bet the casino accepts.

## What is in the repository

| File                                   | What it holds                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| [src/manifest.json](src/manifest.json) | What the wallet reads to load the game                                                      |
| [src/index.html](src/index.html)       | The page. It loads `./shared.css`, `./style.css` and `./game.js`                            |
| [src/game.ts](src/game.ts)             | The entry point, bundled to `dist/game.js`. Here: the probe's presets, send button and log  |
| [src/style.css](src/style.css)         | Page styles, on top of the SDK's `shared.css`                                               |
| [package.json](package.json)           | Scripts `build`, `dev`, `typecheck`, `test`, `format`; one dependency, `@hookedin/game-sdk` |

The build is the SDK's `hookedin-game` command. It bundles `src/game.ts` with esbuild, copies everything in `src/` that is not TypeScript, and adds `shared.css`, the brand mark and a `_headers` file. Add more `.ts` modules, images or fonts under `src/` as you need them.

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

| Field         | Required | Meaning                                                                                                                                                           |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | yes      | Shown in the wallet. At most 80 characters                                                                                                                        |
| `entry`       | yes      | The page to frame, relative to the manifest or absolute                                                                                                           |
| `developer`   | yes      | The address that earns the game's commission. Not the zero address. `HOOKEDIN_DEVELOPER` overrides it at build time                                               |
| `description` | no       | Shown with the game. The wallet shows at most 220 characters                                                                                                      |
| `id`          | no       | Lowercase letters, digits and hyphens, starting with a letter or digit; at most 32 characters. The name the casino's local launcher serves and publishes it under |

The manifest must be at most 16 KB and served with CORS headers. Any manifest, listed or not, is linkable as `https://play.hookedin.com/games/custom?manifest=<encoded manifest URL>`. Opening a link loads the game; it grants no spending authority. Some reference manifests also carry a `template` field; the wallet does not read it.

The developer address, the manifest URL and the entry URL together identify your game to the wallet.

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
- The only way to raise the limit is `game.requestFunds`. The wallet shows its own dialog; the player picks the amount or declines. Your `amount` and `reason` are suggestions shown to the player.
- Every bet and payment must fit the limit. Wins raise it, losses lower it.
- Leaving the game, reloading or closing the tab releases the limit. The money was never anywhere but the player's signed channel balance.
- `pending: true` means the wallet holds a signed operation that has not resolved. No new wager is possible until the player recovers it in the wallet.

`mountBank(element, { reason })` from the SDK renders all of this as the strip at the top of the reference games.

## The bridge

Import the bridge, or post the envelopes yourself:

```ts
import { HookedIn } from '@hookedin/game-sdk/sdk';
const { asset } = await HookedIn.hello(); // what this wallet offers and the asset it plays with
const info = await HookedIn.info();

// The same request without the SDK:
parent.postMessage({ hookedin: true, id: 1, method: 'wallet.hello', params: {} }, '*');
```

A reply carries the same `id` and either `result` or `error: {code, message}`; the SDK rejects with a `HookedInError`, whose stable `code` is what your game acts on. The wallet accepts requests only from the iframe it opened, at the origin of your entry page, needs each envelope `id` to be a whole number larger than the last, and limits a request to about 70,000 characters. Questions are answered at once; whatever signs or asks the player takes its turn in the order you asked.

A wallet plays with the network's ETH or with the casino's test coins, and `wallet.hello` says which. Amounts are whole numbers of the asset's smallest unit, as decimal strings; `wallet.hello` gives the asset's `symbol` and `decimals`, and `HookedIn.parseAmount` and `formatAmount` convert with them, so a game needs no code of its own for test coins. The `id` inside a financial request is your durable name for that operation: 1 to 64 characters of letters, digits, `.`, `_`, `:` or `-`. The same `id` with the same terms returns the saved receipt; the same `id` with different terms fails.

| Method              | Parameters                   | Result                                                                                               |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `wallet.hello`      | `{}`                         | `{methods, asset: {id, symbol, decimals}, chainId}`                                                  |
| `wallet.info`       | `{}`                         | `{uname, alias, chainId, bankroll, recommendedStake}`, and nothing else of the player                |
| `game.requestFunds` | `{amount?, reason?}`         | `{funded, amount, balance, pending}` after the player's decision. `reason` is at most 140 characters |
| `game.bet`          | `{id, stake, prizes}`        | A verified receipt: settled, or rejected                                                             |
| `game.bet` (hosted) | `{id, stake, prizes, round}` | `{status: 'pending'}` while the round's host keeps it open, then the verified receipt                |
| `game.payment`      | `{id, amount}`               | A verified receipt. Pays the casino's bankroll; no outcome, no commission                            |
| `game.transfer`     | `{id, amount}`               | Pays the manifest's `developer` address only. Pending, then a verified receipt                       |
| `game.receipt`      | `{id}`                       | The outcome of an earlier operation by your `id`, or `null`                                          |
| `game.cancel`       | `{id}`                       | Gives up a seat in a round its host has not closed; or the bet's result if it was                    |
| `game.buyIn`        | `{id, table, amount}`        | Between players: put money on a table its host pays out; the verified receipt                        |
| `game.table`        | `{tableId}`                  | `{tableId, bought, collected}`: what this wallet put on a table and has collected from it            |
| `game.identify`     | `{nonce}`                    | The wallet's signed word, for your own server, about who is playing                                  |

One event arrives unasked: `game.balance` with `{balance, pending}`.

The SDK wraps these as `HookedIn.call`, `HookedIn.balance()`, `HookedIn.onBalance(listener)`, `HookedIn.requestFunds(options)` and `HookedIn.receipt(id)`. It also has `HookedIn.initializeGame` for read-only startup, `HookedIn.storageScope(info)` for a storage key unique to the page, player and asset (on the player's permanent name), and `parseAmount`, `formatAmount` and `stepStake` for stake fields.

A receipt, as the game sees it:

```ts
{
  id, // your operation id
  kind,
  status, // 'signed' when settled, 'rejected' when the casino declined
  verified, // true once the wallet has checked the evidence
  outcome, // the round's 64-bit outcome, as a decimal string
  payout, // what the prizes paid
  operationId,
  reason, // present on a rejection
}
```

The game receives the outcome, never the signed evidence. Games cannot request signatures, supply bet seeds or choose the fee recipient.

## A one-shot bet

A coin flip that pays double 49.5% of the time, a 99% return:

```ts
import { HookedIn } from '@hookedin/game-sdk/sdk';

const SPACE = 1n << 64n;

async function flip(stakeText: string) {
  const stake = HookedIn.parseAmount(stakeText); // '0.000001' -> '1000000000000'

  // 1. Make sure the game may risk the stake. The player decides in the wallet's dialog.
  const { balance } = await HookedIn.balance();
  if (BigInt(balance) < BigInt(stake)) {
    const funding = await HookedIn.requestFunds({ amount: stake, reason: 'Flip a coin.' });
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

  // 4. Read the result from the verified receipt, never from your own randomness.
  localStorage.removeItem('flip:pending');
  if (receipt.status === 'rejected') return null; // balance unchanged; offer the same bet under a fresh id
  if (receipt.verified !== true) throw new Error('A verified result is required');
  return BigInt(receipt.outcome) < (SPACE * 495n) / 1000n; // true: heads, paid 2x
}
```

Rules that make this safe:

- **Save before you send.** If the reply is lost (a crash, a reload, a timeout), read your saved `id` on startup and call `game.receipt`. A receipt means the wallet settled it; apply it exactly once. `null` with `pending: true` means the wallet still holds the signed request, and the player recovers it from the wallet's banner. `null` otherwise means nothing was signed, and you may send the same request again.
- **A rejection is not a loss.** `status: 'rejected'` with `verified: true` proves the bet was cancelled with the balance unchanged. Offer the same bet again under a fresh `id`. A timeout or a generic error proves nothing: retry the exact request with the same `id`.
- **Show the verified outcome.** Compute what the player sees from `receipt.outcome`: which bucket, which card, which reel stop. Then the picture and the money cannot disagree, and your page needs no randomness of its own.
- **Leave the casino an edge.** The casino admits a bet only if its bankroll can carry it, and bigger prizes need more edge. Check a bet before offering it with `admits(bankroll, bet)` from `@hookedin/game-sdk/admits`, which is the casino's own rule; `wallet.info` reports `bankroll`. The reference games check against half the reported bankroll so that ordinary movement does not invalidate the bet.
- **Scope your storage.** Key saved state by page, chain, player and asset (`HookedIn.storageScope(info)`), so games that share a host and accounts that share a browser do not read each other's rounds.

[game-plinko](https://github.com/hookedin/game-plinko) is the complete version of this pattern: `src/drop.ts` there is about 150 lines and is the part to copy.

## Multi-step games: RoundClient

A game with decisions, such as blackjack or Mines, is played as one bet per step. The SDK's `RoundClient` does the bookkeeping. You describe the game as a finite graph of public states:

```ts
import { HookedIn } from '@hookedin/game-sdk/sdk';
import { RoundClient } from '@hookedin/game-sdk/round';
import { fraction } from '@hookedin/game-sdk/engine';

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
- Saves the round and each pending step in `localStorage` before the wallet signs, resolves lost replies through `game.receipt`, and keeps the same action across a verified rejection.
- Asks the wallet for funds when a step needs more than the game holds, including extra wagers such as a double or a split (`additionalCash` on an action).
- Checks that the wallet's verified payout matches the state the outcome names, and records each step's label (the card, the tile) in `state.events` so you can redraw after a reload.
- `round.watch(listener)` reloads the round when another tab of the same game changes it.

The graph must be finite and acyclic, with exact rational probabilities that sum to one per action, and at most 64 distinct prizes per step.

Reference games built this way: [game-dice](https://github.com/hookedin/game-dice) (one step), [game-mines](https://github.com/hookedin/game-mines) (stop when you like), [game-samson](https://github.com/hookedin/game-samson) (a slot: one step, dozens of prizes) and [game-blackjack](https://github.com/hookedin/game-blackjack) (up to dozens of steps, with a precomputed price table). The theory is in [sequential games built from native bets](https://github.com/hookedin/game-sdk/blob/main/docs/sequential-games.md).

## Player versus player

Players can play each other at a **table**: the casino holds what they buy in, and a server you run, the table's host, signs who is paid out of it. The page uses `game.buyIn` and `game.identify`; the server uses the [host kit](https://github.com/hookedin/game-sdk/blob/main/src/host.ts), and ships with the page as one Cloudflare Worker. [poker](https://github.com/hookedin/poker) is the full reference and [game-rps](https://github.com/hookedin/game-rps) the small one.

## Commission

The casino admits a bet only if it leaves the bankroll a sound wager. Whatever edge a bet has beyond that is taken as commission, and it is split equally: half to the `developer` address the wallet signs into the bet, half to the casino.

- It accrues on every completed bet, win or lose. A rejected bet earns nothing.
- It is never an extra debit to the player. The player's stake and prizes are exactly what was signed.
- It depends on the bet's edge and on the casino's bankroll. A zero-edge bet earns nothing and is normally declined.
- The wallet takes the address from your manifest. The game page cannot change it.
- In a match, the commission comes from the pot bet's edge, or from the rake when the pot is the plain stakes.

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
2. In the repository's **Settings → Secrets and variables → Actions**, add the secret `CLOUDFLARE_API_TOKEN` (create it in Cloudflare from the **Edit Cloudflare Workers** template) and the variables `CLOUDFLARE_ACCOUNT_ID` and `HOOKEDIN_DEVELOPER`, the address that earns the game's commission.
3. Push to `main`. The workflow tests, builds and publishes.

To publish by hand instead: `HOOKEDIN_DEVELOPER=0xYourAddress npm run build && npx wrangler deploy`.

Any static host works. It must send the headers in `dist/_headers`, which Cloudflare applies by itself. The one that matters most is `Access-Control-Allow-Origin: *`: the wallet fetches `manifest.json` from a different origin and refuses a game whose manifest it cannot read. The file also sets the page's Content-Security-Policy. Do not host the game on the wallet's own origin; the wallet refuses that too.

Your game is then playable by anyone who loads `https://your-host/manifest.json` as a custom game, or through the link `https://play.hookedin.com/games/custom?manifest=<encoded manifest URL>`.

## Get listed

Publish it yourself: in the wallet, open **My wallet** and, under your name, give the game a name and this manifest's URL. It is then at `@<your name>/<game name>` for anyone with a wallet. The library the casino ships with is what `@hookedin` publishes, from [catalog.json](https://github.com/hookedin/play/blob/main/catalog.json) in the [hookedin/play](https://github.com/hookedin/play) repository; open an issue or a pull request there to be in it.

## Tests

```sh
npm test
```

In the template this only type-checks. When your game has rules, test them in Node against the real wallet: `@hookedin/play/testing/game-wallet.ts` builds the actual wallet code with an in-memory casino, so a test places real signed bets and checks real balances. Run tests with `node --import tsx --test test/*.test.ts`; the SDK ships TypeScript, and Node does not strip types inside `node_modules` by itself. [game-plinko's test](https://github.com/hookedin/game-plinko/blob/main/test/plinko.test.ts) is a good model: it proves the return from the signed prizes, then drops balls through the wallet and recovers a lost reply.

## Fairness, for your players

- The game never holds keys. The wallet signs each bet whole: the stake and every prize.
- Every bet is on a round, named by the hash of a secret the casino fixed before the wallet drew its seed. The outcome is the low 64 bits of `keccak256(abi.encode(keccak256("HOOKEDIN/OUTCOME"), seed, secret))`.
- The wallet checks the revealed secret against the round it signed, recomputes the outcome and the payout, and only then tells the game.
- The game never sees future entropy. It learns an outcome only from a completed receipt.

The wallet verifies each bet. It does not certify your advertised rules, odds or animations. Publish your source, state your return, prove it in a test, and draw what the player sees from the verified outcome.

## License

[MIT](LICENSE)
