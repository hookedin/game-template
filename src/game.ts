/** A developer probe: sends bridge requests by hand and prints every reply. Not a game. */
import { HookedIn } from '@hookedin/play/sdk/sdk';
import { mountBank } from '@hookedin/play/sdk/bank';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const bank = mountBank($('bank'));
const output = $('probe-output'),
  request = $<HTMLTextAreaElement>('probe-request');
let lastId = '';
const log = (title: string, value: unknown) => {
  // Local time, so this log lines up with the wallet's developer log beside it.
  const line = `${new Date().toLocaleTimeString([], { hour12: false })} ${title}\n${JSON.stringify(value, null, 2)}\n\n`;
  output.textContent = line + (output.textContent === 'Replies appear here, newest first.' ? '' : output.textContent);
};
const stake = () => $<HTMLInputElement>('probe-stake').value.trim();
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
  // published. Its settled receipt arrives by itself, as a `game.receipt` event.
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
  funds: () => ({ method: 'game.requestFunds', params: { amount: stake() } }),
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]'))
  button.addEventListener('click', () => {
    request.value = JSON.stringify(presets[button.dataset.preset!]!(), null, 2);
  });
$('probe-send').addEventListener('click', async () => {
  let envelope: { method: string; params: Record<string, unknown> };
  try {
    envelope = JSON.parse(request.value);
  } catch (error: any) {
    return log('invalid JSON', error.message);
  }
  bank.setBusy(true);
  try {
    log(`→ ${envelope.method}`, envelope.params);
    const result = await HookedIn.call(envelope.method, envelope.params);
    log(`← ${envelope.method}`, result);
    if (envelope.method === 'game.requestFunds' && result && typeof result === 'object') bank.update(result);
  } catch (error: any) {
    log(`✖ ${envelope.method}`, error.message);
  } finally {
    bank.setBusy(false);
  }
});
$('probe-clear').addEventListener('click', () => {
  output.textContent = 'Replies appear here, newest first.';
});
HookedIn.onBalance(balance => log('event game.balance', balance));
HookedIn.onReceipt(receipt => log('event game.receipt', receipt));
void HookedIn.hello()
  .then(async hello => {
    log('wallet.hello', hello);
    log('wallet.info', await HookedIn.info());
    request.value = JSON.stringify(presets.casinoBet!(), null, 2);
  })
  .catch(error => log('startup', { code: error.code, message: error.message }));
