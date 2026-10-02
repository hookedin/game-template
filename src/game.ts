/** A developer probe: sends bridge requests by hand and prints every reply. Not a game. */
import { HookedIn } from '@hookedin/play/sdk/sdk';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const output = $('probe-output'),
  request = $<HTMLTextAreaElement>('probe-request');
let lastId = '';
const log = (title: string, value: unknown) => {
  const line = `${new Date().toLocaleTimeString([], { hour12: false })} ${title}\n${JSON.stringify(value, null, 2)}\n\n`;
  output.textContent = line + (output.textContent === 'Replies appear here, newest first.' ? '' : output.textContent);
};
/** The stake typed, whole µETH, as the wei the bridge carries. */
const stake = () => HookedIn.parseAmount($<HTMLInputElement>('probe-stake').value);
const operationId = () => {
  const entered = $<HTMLInputElement>('probe-id').value.trim();
  lastId = entered || `probe-${Date.now()}`;
  return lastId;
};
const presets: Record<string, () => { method: string; params: Record<string, unknown> }> = {
  // Double the stake when the round's outcome falls in the lower half of the 2^64 outcomes.
  casinoBet: () => ({
    method: 'game.casinoBet',
    params: {
      id: operationId(),
      stake: stake(),
      chance: String((1n << 64n) / 2n),
      prize: String(2n * BigInt(stake())),
    },
  }),
  // A developer bet: a bet against you, the game's developer, whose bank takes the stake at once and whose server
  // settles it, paying what it says. `meta` is your game's own JSON, saying what the bet is. It needs the game
  // published, and the player's leave to place developer bets. Its settled receipt arrives by itself, as a
  // `game.receipt` event; what it paid stays out of the allowance the wallet shows until `game.end` ends its group.
  developerBet: () => ({
    method: 'game.developerBet',
    params: { id: operationId(), stake: stake(), meta: { pick: 'home' }, group: 'probe' },
  }),
  payment: () => ({ method: 'game.payment', params: { id: operationId(), amount: stake() } }),
  receipt: () => ({ method: 'game.receipt', params: { id: lastId || operationId() } }),
  hello: () => ({ method: 'wallet.hello', params: {} }),
  info: () => ({ method: 'wallet.info', params: {} }),
  // A developer's round as the casino shows it: paste a round's ID.
  round: () => ({ method: 'wallet.round', params: { id: '0x' + '0'.repeat(64) } }),
  allowance: () => ({ method: 'game.allowance', params: { group: 'probe' } }),
  requestAllowance: () => ({ method: 'game.requestAllowance', params: { amount: stake(), developerBets: true } }),
  end: () => ({ method: 'game.end', params: { group: 'probe' } }),
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]'))
  button.addEventListener('click', () => {
    try {
      request.value = JSON.stringify(presets[button.dataset.preset!]!(), null, 2);
    } catch (error: any) {
      log('invalid stake', error.message);
    }
  });
$('probe-send').addEventListener('click', async () => {
  let envelope: { method: string; params: Record<string, unknown> };
  try {
    envelope = JSON.parse(request.value);
  } catch (error: any) {
    return log('invalid JSON', error.message);
  }
  try {
    log(`→ ${envelope.method}`, envelope.params);
    log(`← ${envelope.method}`, await HookedIn.call(envelope.method, envelope.params));
  } catch (error: any) {
    log(`✖ ${envelope.method}`, { code: error.code, message: error.message });
  }
});
$('probe-clear').addEventListener('click', () => {
  output.textContent = 'Replies appear here, newest first.';
});
HookedIn.onReceipt(receipt => log('event game.receipt', receipt));
void HookedIn.hello()
  .then(async hello => {
    log('wallet.hello', hello);
    log('wallet.info', await HookedIn.info());
    request.value = JSON.stringify(presets.casinoBet!(), null, 2);
  })
  .catch(error => log('startup', { code: error.code, message: error.message }));
