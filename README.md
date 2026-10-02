# HookedIn game template

Start here to build a game for [HookedIn](https://hookedin.com), a casino whose wallet checks every bet.

This repository is a GitHub template. What it holds is the **bridge probe**: a page that sends every wallet bridge
method by hand and prints each raw reply. It is a working HookedIn game in four source files, and the quickest way to
see what the wallet answers to a bet, a rejection, a request for a larger allowance or a lost reply. Replace the probe's
page with your game and keep the rest.

How a game works, the bridge, the SDK and the casino are documented at **[hookedin.com/docs](https://hookedin.com/docs/)**;
start with [building a game](https://hookedin.com/docs/games/quick-start/).

## Quick start

You need Node 24.4 or later. Create your repository with **Use this template**, or clone this one:

```sh
git clone https://github.com/hookedin/game-template my-game
cd my-game
npm install
npm run dev
```

This builds the game into `dist/` and serves it at `http://127.0.0.1:4185/` (`PORT` moves it), building it again on
every page load. Open the wallet at [play.hookedin.com](https://play.hookedin.com), go to **Games**, choose
**Open a game by its URL** and open `http://127.0.0.1:4185/`. Press **Allowance** in the wallet's top bar to give the
game an allowance. Pick a preset such as `game.casinoBet · 50% to double`, edit its JSON if you like, and press **Send**:
every request, reply and event is printed, newest first.

The `50% to double` preset leaves the casino no edge, so it declines it: that shows you a rejection. Lower the chance
or the prize for a bet the casino takes. The `game.developerBet` preset needs the game published, the player's leave to
place developer bets (the `game.requestAllowance` preset asks for it) and a server that settles its bets with your key;
see [developer bets](https://hookedin.com/docs/games/developer-bets/). A game with a server of its
own starts from [game-roulette](https://github.com/hookedin/game-roulette) instead: a template whose page and server
deploy together.

## What is in the repository

| File                                     | What it holds                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [src/index.html](src/index.html)         | The page. It loads `./shared.css`, `./style.css` and `./game.js`                                                                     |
| [src/game.ts](src/game.ts)               | The entry point, bundled to `dist/game.js`. Here: the probe's presets, send button and log                                           |
| [src/style.css](src/style.css)           | Page styles, on top of the SDK's `shared.css`                                                                                        |
| [src/icon.svg](src/icon.svg)             | The icon the wallet shows the game by: a square SVG of one symbol ([the icon](https://hookedin.com/docs/games/publishing/#the-icon)) |
| [test/](test/)                           | Real casino and developer bets through the real wallet, against a stub casino held to its rules                                      |
| [package.json](package.json)             | `build`, `dev`, `typecheck`, `test`, `format`; one dependency, `@hookedin/play`                                                      |
| [wrangler.jsonc](wrangler.jsonc)         | The Cloudflare Worker `npm run build && npx wrangler deploy` publishes `dist/` as                                                    |
| [.github/workflows/](.github/workflows/) | Test and build on every push; deploy on push to `main`                                                                               |

`@hookedin/play` is installed from play's `main` branch; the lockfile records the exact commit, and
`npm update @hookedin/play` moves it. The build is the `hookedin-game` command it installs.

## Make it your game

1. [src/index.html](src/index.html) and [src/style.css](src/style.css): your page, and only the game: the wallet's top
   bar names it and shows its allowance. Keep loading `./game.js` as a module.
2. [src/game.ts](src/game.ts): your rules, from a [one-shot casino bet](https://hookedin.com/docs/games/casino-bets/)
   or a [multi-step round](https://hookedin.com/docs/games/multi-step-games/).
3. [src/icon.svg](src/icon.svg): the icon the wallet shows your game by, a square SVG of one symbol that fills the
   square, with no rounded background of its own: the wallet rounds its corners.
4. `package.json`: the package `name` and `repository`.

Keep the probe in a branch: it is the fastest way to reproduce a reply you did not expect.

## Tests

```sh
npm test
```

This type-checks and runs `test/`, with `node --import tsx --test`, because `@hookedin/play` ships TypeScript and Node
does not strip types inside `node_modules`. [test/casino-bet.test.ts](test/casino-bet.test.ts) settles a casino bet,
sends one twice and finds it placed once, and sees a zero-edge one declined;
[test/developer-bet.test.ts](test/developer-bet.test.ts) backs a developer bet with a casino bet on a round and pays
what your server signs. Replace their bets with your own rules and prove your game's floor. See
[testing](https://hookedin.com/docs/games/testing/).

## Deploy your fork

1. In [wrangler.jsonc](wrangler.jsonc), change `name`, and add `routes` for a domain on your Cloudflare account;
   without them the game is served at `<name>.<your-subdomain>.workers.dev`.
2. Under **Settings → Secrets and variables → Actions**, add the secret `CLOUDFLARE_API_TOKEN` (from Cloudflare's
   **Edit Cloudflare Workers** template) and the variable `CLOUDFLARE_ACCOUNT_ID`.
3. Push to `main`: [Deploy](.github/workflows/deploy.yml) tests, builds and publishes.

Any static host works if it sends the headers in `dist/_headers`. Then publish the game's URL in **My games**, from the
wallet of the account that is to earn its commission: the account that publishes a game is its developer.
[Publishing](https://hookedin.com/docs/games/publishing/) covers hosting, publishing, moving hosts and the house
library.

## License

[MIT](LICENSE)
