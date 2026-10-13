import test from 'node:test';
import assert from 'node:assert/strict';
import { gameWallet } from '@hookedin/play/testing/game-wallet.ts';

/**
 * The starting point for your game's tests: a real wallet, an in-memory casino that holds every casino bet to the
 * casino's own admission rule, and real signed bets, sent through the checks the wallet's bridge makes. Replace the
 * bet below with your own rules, and prove your game's floor.
 */
const HALF = (1n << 64n) / 2n;
/** A step of one bet: 1.9× or nothing, as likely as each other, a 95% return, which the casino admits. */
const results = (prize = 1900n) => [
  { weight: 1n, cash: prize, label: 'Win' },
  { weight: 1n, cash: 0n, label: 'Lose' },
];

test('a casino bet settles through the real wallet and moves the allowance by its own terms', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameAllowance(200000n);
  const before = w.gameAllowance().allowance;
  const receipt = await f.bridge.call('game.casinoBet', {
    id: 'first-bet',
    cash: 1000n,
    results: results(),
  });
  assert.equal(receipt.status, 'settled', 'the casino took the bet');
  const won = receipt.outcome! < HALF;
  assert.equal(receipt.payout, won ? 1900n : 0n);
  // The wallet landed the step on the result the bet left: its place in the table.
  assert.equal(receipt.result, won ? 0n : 1n);
  assert.equal(w.gameAllowance().allowance, before - 1000n + receipt.payout!);
});

test('the same operation ID returns the saved receipt, so a lost reply costs nothing', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameAllowance(200000n);
  const bet = { id: 'only-once', cash: 1000n, results: results() };
  const first = await f.bridge.call('game.casinoBet', bet);
  assert.deepEqual(
    await f.bridge.call('game.casinoBet', bet),
    first,
    'the bet is placed once, however often it is sent',
  );
  // game.receipt answers the same for the same ID, which is how a lost reply is resolved.
  assert.deepEqual(await f.bridge.call('game.receipt', { id: 'only-once' }), first);
});

test('a casino bet with no edge is refused before anything is signed, as the casino would not cover it', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameAllowance(200000n);
  await assert.rejects(
    f.bridge.call('game.casinoBet', {
      id: 'fair',
      cash: 1000n,
      results: results(2000n),
    }),
    (error: any) => error.code === 'not-covered',
  );
  assert.equal(w.gameAllowance().allowance, 200000n);
});
