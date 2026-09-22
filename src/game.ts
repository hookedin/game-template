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
/** Double the stake on the lower half of the outcome space. */
const half = () => ({ rangeStart: '0', rangeEnd: String((1n << 64n) / 2n), payout: String(2n * BigInt(stake())) });
const presets: Record<string, () => { method: string; params: Record<string, unknown> }> = {
  bet: () => ({
    method: 'game.bet',
    params: { id: operationId(), stake: stake(), prizes: [half()] },
  }),
  // A bet on a round a host opened. Paste the host's real `round`: this placeholder is no round at
  // the casino, so the casino declines the bet, saying it has no record of the round.
  shared: () => ({
    method: 'game.bet',
    params: {
      id: operationId(),
      stake: stake(),
      prizes: [half()],
      round: { id: '0x' + '22'.repeat(32), seedHash: '0x' + '33'.repeat(32) },
    },
  }),
  cancel: () => ({ method: 'game.cancel', params: { id: lastId || operationId() } }),
  payment: () => ({ method: 'game.payment', params: { id: operationId(), amount: stake() } }),
  receipt: () => ({ method: 'game.receipt', params: { id: lastId || operationId() } }),
  hello: () => ({ method: 'wallet.hello', params: {} }),
  info: () => ({ method: 'wallet.info', params: {} }),
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
void HookedIn.hello()
  .then(async hello => {
    log('wallet.hello', hello);
    log('wallet.info', await HookedIn.info());
    request.value = JSON.stringify(presets.bet!(), null, 2);
  })
  .catch(error => log('startup', { code: error.code, message: error.message }));
