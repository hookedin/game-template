import test from 'node:test';
import assert from 'node:assert/strict';
import { gameWallet } from '@hookedin/play/testing/game-wallet.ts';
import { owed } from '@hookedin/play/sdk/developer';
import type { GameReceipt } from '@hookedin/play/sdk/sdk';

/**
 * For a game with a server: its pages place developer bets, bets against you, and your server settles them.
 * `f.developer` is shaped like the `Developer` your server makes with `createDeveloper`, so hand it to your server's
 * code here. It serves the game `f.identity()` names.
 */
const HALF = (1n << 64n) / 2n;
/** The receipt the wallet pushes once it has collected what the bet with this `id` was paid. */
const pushed = (f: Awaited<ReturnType<typeof gameWallet>>, id: string) =>
  new Promise<GameReceipt>(resolve => {
    const stop = f.bridge.onReceipt(receipt => {
      if (receipt.id !== id) return;
      stop();
      resolve(receipt);
    });
  });

test('a developer bet with prizes is owed what they pay when your casino bet on its round covers it', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity());
  await w.setGameLimit('200000');
  // Your server opens a round and tells its pages the id; the player's wallet bets on it.
  const round = await f.developer.openRound('eth'),
    prizes = [{ rangeStart: '0', rangeEnd: String(HALF), payout: '1900' }];
  const placed = await f.bridge.call('game.developerBet', { id: 'spin', stake: '1000', prizes, round: round.id });
  assert.equal(placed.status, 'open', 'the stake went to your bank at once');
  // When betting ends, your server backs the bet with a casino bet of its own on the round, and pays what it is owed.
  const revealed = await f.developer.casinoBet({ round: round.id, stake: '1000', prizes, covers: [placed.bet] });
  const { bets } = await f.developer.bets();
  const heard = pushed(f, 'spin');
  await f.developer.settle(bets.map(bet => ({ bet: bet.bet, player: owed(bet, revealed), casino: 0n })));
  await f.bridge.call('game.receipt', { id: 'spin' });
  const settled = await heard;
  assert.deepEqual([settled.status, settled.basis], ['settled', 'outcome']);
  assert.equal(settled.payout, BigInt(settled.outcome!) < HALF ? '1900' : '0');
});

test('a developer bet with terms is paid what your server signs, from your bank', async () => {
  const f = await gameWallet(),
    w = f.wallet;
  w.openGame(f.identity());
  await w.setGameLimit('200000');
  const placed = await f.bridge.call('game.developerBet', { id: 'match', stake: '1000', terms: { pick: 'home' } });
  const heard = pushed(f, 'match');
  await f.developer.settle([{ bet: placed.bet, player: 2500n, casino: 0n }]);
  await f.bridge.call('game.receipt', { id: 'match' });
  const settled = await heard;
  assert.deepEqual([settled.status, settled.basis, settled.payout], ['settled', 'developer', '2500']);
  assert.equal(w.gameLimit().balance, String(200000n - 1000n + 2500n));
});
