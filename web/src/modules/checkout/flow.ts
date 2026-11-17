/*
 * Preparar el pedido antes de mandar a Stripe:
 * 1. Si el cliente vuelve de un pago abandonado y empieza otro, se libera el
 *    pedido anterior (caducando antes su sesión de Stripe) para que su propia
 *    reserva no le diga «agotado».
 * 2. Se crea (o recupera, si es el mismo formulario) el pedido con reserva.
 * 3. Si ese pedido no tiene sesión y ya no le queda reserva para los 30 min
 *    que exige Stripe, se libera y se crea otro.
 */
import { HOLD_MINUTES, SESSION_BEFORE_HOLD_SECONDS, type OrderSummary } from '@/modules/payments/stripe';

export type FlowDeps = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
  sessionStatus: (sessionId: string) => Promise<'open' | 'complete' | 'expired'>;
  expireSession: (sessionId: string) => Promise<void>;
  newRequestId: () => string;
  now: () => Date;
};

export type FlowInput = {
  previous: { orderId: string; requestId: string } | null;
  requestId: string;
  items: { variant_id: string; quantity: number }[];
  contact: Record<string, string>;
};

export type FlowResult = { kind: 'pay'; order: OrderSummary } | { kind: 'done'; orderId: string };

const MIN_SESSION_MS = 31 * 60_000;

export async function prepareOrder(input: FlowInput, deps: FlowDeps): Promise<FlowResult> {
  if (input.previous && input.previous.requestId !== input.requestId) {
    const prev = (await deps.rpc('order_status', { p_order: input.previous.orderId })) as OrderSummary | null;
    if (prev?.status === 'pending') {
      const session = prev.stripe_session_id ? await deps.sessionStatus(prev.stripe_session_id) : 'expired';
      if (session !== 'complete') {
        if (session === 'open') await deps.expireSession(prev.stripe_session_id!);
        await deps.rpc('checkout_release', { p_order: prev.order_id });
      }
    }
  }
  const create = (requestId: string) =>
    deps.rpc('checkout_create', { p_request_id: requestId, p_items: input.items, p_contact: input.contact, p_hold_minutes: HOLD_MINUTES }) as Promise<OrderSummary>;

  let order = await create(input.requestId);
  if (order.status !== 'pending') return { kind: 'done', orderId: order.order_id };
  const sessionEnds = Date.parse(order.reserved_until) - SESSION_BEFORE_HOLD_SECONDS * 1000;
  if (!order.stripe_session_id && sessionEnds < deps.now().getTime() + MIN_SESSION_MS) {
    await deps.rpc('checkout_release', { p_order: order.order_id });
    order = await create(deps.newRequestId());
  }
  return { kind: 'pay', order };
}
