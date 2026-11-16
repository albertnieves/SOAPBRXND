/* Webhook de Stripe: firma, y traducción de eventos a funciones de la base (idempotentes). */
import Stripe from 'stripe';

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;

export function verifyEvent(rawBody: string, signature: string, secret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Pedido de la sesión según lo que pusimos al crearla (metadata.order_id o
 * client_reference_id). La base solo lo usa si la sesión no llegó a enlazarse.
 * Un valor que no es uuid se descarta: haría fallar la llamada y Stripe
 * reintentaría el evento para siempre.
 */
function orderIdOf(s: Stripe.Checkout.Session): string | null {
  const id = s.metadata?.order_id ?? s.client_reference_id ?? null;
  return id && UUID.test(id) ? id : null;
}

export async function handleEvent(event: Stripe.Event, rpc: Rpc): Promise<{ handled: boolean; result?: unknown }> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session;
      // Pagos diferidos (p. ej. SEPA) llegan «completed» sin cobrar: se confirma al llegar el cobro.
      if (s.payment_status !== 'paid') return { handled: false };
      const result = await rpc('checkout_confirm_paid', {
        p_event_id: event.id,
        p_session: s.id,
        p_amount_total: s.amount_total,
        p_payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null),
        p_currency: s.currency ?? null,
        p_order: orderIdOf(s),
      });
      return { handled: true, result };
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const result = await rpc('checkout_expire', { p_event_id: event.id, p_session: s.id, p_order: orderIdOf(s) });
      return { handled: true, result };
    }
    default:
      return { handled: false };
  }
}
