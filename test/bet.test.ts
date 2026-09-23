import test from 'node:test';
import assert from 'node:assert/strict';
import { gameWallet } from '@hookedin/play/testing/game-wallet.ts';

/**
 * The starting point for your game's tests: a real wallet, an in-memory casino, and real signed
 * bets. Replace the bet below with your own rules, and prove the return you advertise.
 */
const SPACE = 1n << 64n;
const HALF = SPACE / 2n;

test('a bet settles through the real wallet and moves the balance by its own terms', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameLimit('200000');
  const before = BigInt(w.gameLimit().balance);
  const receipt = await w.gameBet({
    id: 'first-bet',
    stake: '1000',
    // Half the outcome space, paying 1.9×: a 95% return, which the casino admits.
    prizes: [{ rangeStart: '0', rangeEnd: String(HALF), payout: '1900' }],
  });
  assert.equal(receipt.verified, true, 'the wallet verified the casino’s reveal');
  assert.equal(receipt.status, 'signed', 'the casino took the bet');
  const won = BigInt(receipt.outcome!) < HALF;
  assert.equal(receipt.payout, won ? '1900' : '0');
  assert.equal(BigInt(w.gameLimit().balance), before - 1000n + BigInt(receipt.payout!));
});

test('the same operation ID returns the saved receipt, so a lost reply costs nothing', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity('my-game'));
  await w.setGameLimit('200000');
  const bet = { id: 'only-once', stake: '1000', prizes: [{ rangeStart: '0', rangeEnd: String(HALF), payout: '1900' }] };
  const first = await w.gameBet(bet);
  const again = await w.gameBet(bet);
  assert.deepEqual(again, first, 'the bet is placed once, however often it is sent');
  // game.receipt answers the same outcome for the same ID, which is how a lost reply is resolved.
  const looked = await w.gameReceipt('only-once');
  assert.ok(looked, 'the wallet kept the receipt');
  assert.deepEqual([looked.outcome, looked.payout, looked.status], [first.outcome, first.payout, first.status]);
});
