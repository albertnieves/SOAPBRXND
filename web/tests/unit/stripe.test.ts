import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { checkoutSessionParams } from '@/modules/payments/stripe';
import { handleEvent, verifyEvent } from '@/modules/payments/webhook';

const NOW = new Date('2026-11-15T12:00:00Z');
const order = {
  order_id: '9b2f4c1e-0000-4000-8000-000000000001', number: 42, status: 'pending',
  items_cents: 7000, shipping_cents: 490, total_cents: 7490, email: 'ana@example.com',
  reserved_until: '2026-11-15T12:45:00Z',
  lines: [{ variant_id: 'v', sku: 'SBX-TEE-M', product_name: 'Tee Pompa Repeat', variant_label: 'M', quantity: 2, unit_cents: 3500 }],
};

describe('checkoutSessionParams', () => {
  const p = checkoutSessionParams(order, 'https://soapbrxnd.test', NOW);
  it('una línea por variante, en céntimos y EUR', () => {
    expect(p.line_items![0]).toEqual({
      quantity: 2,
      price_data: { currency: 'eur', unit_amount: 3500, product_data: { name: 'Tee Pompa Repeat · M' } },
    });
  });
  it('el envío va como línea propia y el total cuadra', () => {
    expect(p.line_items![1]).toMatchObject({ quantity: 1, price_data: { unit_amount: 490, product_data: { name: 'Envío' } } });
    const sum = p.line_items!.reduce((s, l) => s + l.quantity! * (l.price_data!.unit_amount as number), 0);
    expect(sum).toBe(order.total_cents);
  });
  it('sin envío no hay línea de envío', () => {
    const free = checkoutSessionParams({ ...order, shipping_cents: 0, total_cents: 7000 }, 'https://x.test', NOW);
    expect(free.line_items).toHaveLength(1);
  });
  it('identifica el pedido y vuelve a la tienda', () => {
    expect(p).toMatchObject({
      mode: 'payment', locale: 'es', customer_email: 'ana@example.com',
      client_reference_id: order.order_id, metadata: { order_id: order.order_id, number: '42' },
      success_url: `https://soapbrxnd.test/pedido?id=${order.order_id}`,
      cancel_url: 'https://soapbrxnd.test/bolsa?cancelado=1',
    });
  });
  it('la sesión caduca 10 min antes que la reserva: quien paga a tiempo siempre tiene su pieza', () => {
    expect(p.expires_at).toBe(Date.parse('2026-11-15T12:35:00Z') / 1000);
  });
  it('la fecha de caducidad no depende del reloj (misma clave de idempotencia, mismos parámetros)', () => {
    const later = checkoutSessionParams(order, 'https://soapbrxnd.test', new Date('2026-11-15T12:03:00Z'));
    expect(later.expires_at).toBe(p.expires_at);
  });
  it('si a la reserva no le quedan los 30 min que exige Stripe, no se crea la sesión', () => {
    expect(() => checkoutSessionParams({ ...order, reserved_until: '2026-11-15T12:40:00Z' }, 'https://x.test', NOW)).toThrow('hold_too_short');
  });
  it('solo tarjeta (y carteras de tarjeta): nada de pagos diferidos', () => {
    expect(p.allowed_payment_method_types).toEqual(['card', 'link']);
  });
});

describe('webhook', () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.expired', data: { object: { id: 'cs_1' } } });

  it('acepta una firma válida', () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyEvent(payload, header, secret).id).toBe('evt_1');
  });
  it('rechaza una firma de otro secreto', () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_otro' });
    expect(() => verifyEvent(payload, header, secret)).toThrow();
  });

  const ORDER = '0b6f8a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b';
  const calls: [string, object][] = [];
  const rpc = async (fn: string, args: object) => { calls.push([fn, args]); return { status: 'ok' }; };
  const ev = (type: string, object: object) => ({ id: 'evt_x', type, data: { object } }) as unknown as Stripe.Event;

  it('pago completado → checkout_confirm_paid', async () => {
    calls.length = 0;
    const r = await handleEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', amount_total: 7490, currency: 'eur', payment_intent: 'pi_1', metadata: { order_id: ORDER } }), rpc);
    expect(r.handled).toBe(true);
    expect(calls).toEqual([['checkout_confirm_paid', { p_event_id: 'evt_x', p_session: 'cs_1', p_amount_total: 7490, p_payment_intent: 'pi_1', p_currency: 'eur', p_order: ORDER }]]);
  });
  it('sin metadata usa client_reference_id; un id que no es uuid no llega a la base', async () => {
    calls.length = 0;
    await handleEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', amount_total: 1, currency: 'eur', client_reference_id: ORDER }), rpc);
    await handleEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', amount_total: 1, currency: 'eur', metadata: { order_id: 'x; drop table' } }), rpc);
    expect(calls.map(([, a]) => (a as { p_order: unknown }).p_order)).toEqual([ORDER, null]);
  });
  it('sin moneda se manda null (la base lo deja para revisar)', async () => {
    calls.length = 0;
    await handleEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'paid', amount_total: 1 }), rpc);
    expect((calls[0]![1] as { p_currency: unknown }).p_currency).toBeNull();
  });
  it('completado pero sin pagar todavía (pago diferido) → no confirma', async () => {
    calls.length = 0;
    const r = await handleEvent(ev('checkout.session.completed', { id: 'cs_1', payment_status: 'unpaid', amount_total: 7490 }), rpc);
    expect(r.handled).toBe(false);
    expect(calls).toEqual([]);
  });
  it('pago diferido confirmado → checkout_confirm_paid', async () => {
    calls.length = 0;
    await handleEvent(ev('checkout.session.async_payment_succeeded', { id: 'cs_2', payment_status: 'paid', amount_total: 100, payment_intent: 'pi_2' }), rpc);
    expect(calls[0]![0]).toBe('checkout_confirm_paid');
  });
  it('sesión caducada o pago diferido fallido → checkout_expire', async () => {
    calls.length = 0;
    await handleEvent(ev('checkout.session.expired', { id: 'cs_3', metadata: { order_id: ORDER } }), rpc);
    await handleEvent(ev('checkout.session.async_payment_failed', { id: 'cs_4' }), rpc);
    expect(calls).toEqual([
      ['checkout_expire', { p_event_id: 'evt_x', p_session: 'cs_3', p_order: ORDER }],
      ['checkout_expire', { p_event_id: 'evt_x', p_session: 'cs_4', p_order: null }],
    ]);
  });
  it('otros eventos se ignoran', async () => {
    calls.length = 0;
    expect((await handleEvent(ev('customer.created', {}), rpc)).handled).toBe(false);
    expect(calls).toEqual([]);
  });
});
