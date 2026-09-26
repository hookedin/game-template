import test from 'node:test';
import assert from 'node:assert/strict';
import { gameWallet } from '@hookedin/play/testing/game-wallet.ts';

/**
 * The starting point for your game's tests: a real wallet, an in-memory casino that holds every casino bet to the
 * casino's own admission rule, and real signed bets, sent through the checks the wallet's bridge makes. Replace the
 * bet below with your own rules, and prove your game's floor.
 */
const SPACE = 1n << 64n;
const HALF = SPACE / 2n;

test('a casino bet settles through the real wallet and moves the balance by its own terms', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameLimit('200000');
  const before = BigInt(w.gameLimit().balance);
  const receipt = await f.bridge.call('game.casinoBet', {
    id: 'first-bet',
    stake: '1000',
    // Half the outcomes, paying 1.9×: a 95% return, which the casino admits.
    chance: String(HALF),
    prize: '1900',
  });
  assert.equal(receipt.status, 'settled', 'the casino took the bet');
  const won = BigInt(receipt.outcome!) < HALF;
  assert.equal(receipt.payout, won ? '1900' : '0');
  assert.equal(BigInt(w.gameLimit().balance), before - 1000n + BigInt(receipt.payout!));
});

test('the same operation ID returns the saved receipt, so a lost reply costs nothing', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameLimit('200000');
  const bet = { id: 'only-once', stake: '1000', chance: String(HALF), prize: '1900' };
  const first = await f.bridge.call('game.casinoBet', bet);
  assert.deepEqual(
    await f.bridge.call('game.casinoBet', bet),
    first,
    'the bet is placed once, however often it is sent',
  );
  // game.receipt answers the same for the same ID, which is how a lost reply is resolved.
  assert.deepEqual(await f.bridge.call('game.receipt', { id: 'only-once' }), first);
});

test('a casino bet with no edge is declined, as the casino declines it, and the balance stays', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameLimit('200000');
  const receipt = await f.bridge.call('game.casinoBet', {
    id: 'fair',
    stake: '1000',
    chance: String(HALF),
    prize: '2000',
  });
  assert.deepEqual([receipt.status, receipt.payout], ['rejected', undefined]);
  assert.equal(w.gameLimit().balance, '200000');
});
