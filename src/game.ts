/** A developer probe: sends bridge requests by hand and prints every reply. Not a game. */
import { HookedIn } from '@hookedin/game-sdk/sdk';
import { mountBank } from '@hookedin/game-sdk/bank';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const bank = mountBank($('bank'), { reason: 'The probe asks for a spending limit to exercise wagers.' });
const output = $('probe-output'),
  request = $<HTMLTextAreaElement>('probe-request');
let lastId = '';
const log = (title: string, value: unknown) => {
  const line = `${new Date().toISOString().slice(11, 23)} ${title}\n${JSON.stringify(value, null, 2)}\n\n`;
  output.textContent = line + (output.textContent === 'Replies appear here, newest first.' ? '' : output.textContent);
};
const stake = () => $<HTMLInputElement>('probe-stake').value.trim();
const operationId = () => {
  const entered = $<HTMLInputElement>('probe-id').value.trim();
  lastId = entered || `probe-${Date.now()}`;
  return lastId;
};
/** Double the stake on the lower half of the outcome space. */
const half = () => ({ rangeStart: '0', rangeEnd: String((1n << 64n) / 2n), payout: String(2n * BigInt(stake())) });
const presets: Record<string, () => { method: string; params: Record<string, unknown> }> = {
  bet: () => ({
    method: 'game.bet',
    params: { id: operationId(), stake: stake(), prizes: [half()] },
  }),
  // A bet on a host's round. Paste the host's real `round`; this placeholder is never played, so the
  // wallet returns the signed entry and `game.cancel` withdraws it.
  shared: () => ({
    method: 'game.bet',
    params: {
      id: operationId(),
      stake: stake(),
      prizes: [half()],
      round: {
        owner: '0x' + '11'.repeat(20),
        epoch: 1,
        index: 0,
        roundHead: '0x' + '22'.repeat(32),
        seed: '0x' + '33'.repeat(32),
      },
    },
  }),
  cancel: () => ({ method: 'game.cancel', params: { id: lastId || operationId() } }),
  payment: () => ({ method: 'game.payment', params: { id: operationId(), amount: stake() } }),
  transfer: () => ({ method: 'game.transfer', params: { id: operationId(), amount: stake() } }),
  receipt: () => ({ method: 'game.receipt', params: { id: lastId || operationId() } }),
  info: () => ({ method: 'wallet.info', params: {} }),
  funds: () => ({ method: 'game.requestFunds', params: { amount: stake(), reason: 'Probe funding request.' } }),
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
void HookedIn.call('wallet.info')
  .then(info => {
    log('wallet.info', info);
    request.value = JSON.stringify(presets.bet!(), null, 2);
  })
  .catch(error => log('startup', error.message));
