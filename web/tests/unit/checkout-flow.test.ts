import { describe, expect, it } from 'vitest';
import { prepareOrder, type FlowDeps } from '@/modules/checkout/flow';
import { HOLD_MINUTES } from '@/modules/payments/stripe';

const NOW = new Date('2026-11-15T12:00:00Z');
const at = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();
const items = [{ variant_id: 'v1', quantity: 1 }];
const contact = { email: 'ana@example.com' };

function fake(opts: { prev?: object | null; created?: object[]; session?: 'open' | 'complete' | 'expired' }) {
  const log: string[] = [];
  const created = [...(opts.created ?? [{ order_id: 'new', status: 'pending', reserved_until: at(45), stripe_session_id: null }])];
  const deps: FlowDeps = {
    now: () => NOW,
    newRequestId: () => 'fresh-request',
    rpc: async (fn, args) => {
      log.push(fn === 'checkout_create' ? `${fn}:${args.p_request_id}:${args.p_hold_minutes}` : `${fn}:${String(args.p_order)}`);
      if (fn === 'order_status') return opts.prev ?? null;
      if (fn === 'checkout_create') return created.shift();
      return { status: 'cancelled' };
    },
    sessionStatus: async () => { log.push('sessionStatus'); return opts.session ?? 'open'; },
    expireSession: async () => { log.push('expireSession'); },
  };
  return { deps, log };
}

describe('prepareOrder', () => {
  it('libera el pedido anterior abandonado (caducando antes su sesión) y crea el nuevo', async () => {
    const { deps, log } = fake({ prev: { order_id: 'old', status: 'pending', stripe_session_id: 'cs_old' } });
    const r = await prepareOrder({ previous: { orderId: 'old', requestId: 'r1' }, requestId: 'r2', items, contact }, deps);
    expect(log).toEqual(['order_status:old', 'sessionStatus', 'expireSession', 'checkout_release:old', `checkout_create:r2:${HOLD_MINUTES}`]);
    expect(r).toMatchObject({ kind: 'pay', order: { order_id: 'new' } });
  });
  it('si la sesión anterior ya se pagó, no la toca', async () => {
    const { deps, log } = fake({ prev: { order_id: 'old', status: 'pending', stripe_session_id: 'cs_old' }, session: 'complete' });
    await prepareOrder({ previous: { orderId: 'old', requestId: 'r1' }, requestId: 'r2', items, contact }, deps);
    expect(log).not.toContain('checkout_release:old');
    expect(log).not.toContain('expireSession');
  });
  it('reenviar el mismo formulario no libera su propio pedido', async () => {
    const { deps, log } = fake({ prev: { order_id: 'old', status: 'pending' } });
    await prepareOrder({ previous: { orderId: 'old', requestId: 'r1' }, requestId: 'r1', items, contact }, deps);
    expect(log).toEqual([`checkout_create:r1:${HOLD_MINUTES}`]);
  });
  it('un pedido que ya no está pendiente lleva a su página', async () => {
    const { deps } = fake({ created: [{ order_id: 'paid1', status: 'paid', reserved_until: at(45) }] });
    expect(await prepareOrder({ previous: null, requestId: 'r1', items, contact }, deps)).toEqual({ kind: 'done', orderId: 'paid1' });
  });
  it('pedido sin sesión y con poca reserva: se libera y se crea otro con reserva completa', async () => {
    const { deps, log } = fake({ created: [
      { order_id: 'stale', status: 'pending', reserved_until: at(20), stripe_session_id: null },
      { order_id: 'again', status: 'pending', reserved_until: at(45), stripe_session_id: null },
    ] });
    const r = await prepareOrder({ previous: null, requestId: 'r1', items, contact }, deps);
    expect(log).toEqual([`checkout_create:r1:${HOLD_MINUTES}`, 'checkout_release:stale', `checkout_create:fresh-request:${HOLD_MINUTES}`]);
    expect(r).toMatchObject({ kind: 'pay', order: { order_id: 'again' } });
  });
});
