# HookedIn game template

Start here to build a game for [HookedIn](https://hookedin.com), a casino whose wallet checks every bet.

This repository is a GitHub template. What it holds is the **bridge probe**: a page that sends every wallet bridge
method by hand and prints each raw reply. It is a working HookedIn game in four source files, and the quickest way to
see what the wallet answers to a bet, a rejection, a bet beyond the allowance or a lost reply. Replace the probe's
page with your game and keep the rest.

How a game works, the bridge, the SDK and the casino are documented at **[hookedin.com/docs](https://hookedin.com/docs/)**.
[Quick start](https://hookedin.com/docs/games/quick-start/) takes you from this template to a settled bet, with pretend
money and then with ETH; [testing](https://hookedin.com/docs/games/testing/) covers the tests, and
[publishing](https://hookedin.com/docs/games/publishing/) deploying your fork and publishing it. A game with a server of
its own starts from [game-roulette](https://github.com/hookedin/game-roulette) instead: a template whose page and server
deploy together.

## What is in the repository

| File                                     | What it holds                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [AGENTS.md](AGENTS.md)                   | What an AI coding agent needs to build a game here: where the docs and examples are, the commands and the rules                      |
| [src/index.html](src/index.html)         | The page. It loads `./shared.css`, `./style.css` and `./game.js`                                                                     |
| [src/game.ts](src/game.ts)               | The entry point, bundled to `dist/game.js`. Here: the probe's presets, send button and log                                           |
| [src/style.css](src/style.css)           | Page styles, on top of the SDK's `shared.css`                                                                                        |
| [src/icon.svg](src/icon.svg)             | The icon the wallet shows the game by: a square SVG of one symbol ([the icon](https://hookedin.com/docs/games/publishing/#the-icon)) |
| [test/](test/)                           | Real casino and developer bets through the real wallet, against a stub casino held to its rules                                      |
| [package.json](package.json)             | `build`, `dev`, `typecheck`, `test`, `format`; one dependency, `@hookedin/play`                                                      |
| [wrangler.jsonc](wrangler.jsonc)         | The Cloudflare Worker `npx wrangler deploy` deploys `dist/` as                                                                       |
| [.github/workflows/](.github/workflows/) | Test and build on every push; deploy on push to `main`                                                                               |

`@hookedin/play` is installed from play's `main` branch. The workflow updates it to the newest commit before every
build, and on `main` commits the lockfile it tested. The build is the `hookedin-game` command it installs.

## License

[MIT](LICENSE)
