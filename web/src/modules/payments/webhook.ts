/* Webhook de Stripe: firma, y traducción de eventos a funciones de la base (idempotentes). */
import Stripe from 'stripe';

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;

export function verifyEvent(rawBody: string, signature: string, secret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
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
      });
      return { handled: true, result };
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const result = await rpc('checkout_expire', { p_event_id: event.id, p_session: s.id });
      return { handled: true, result };
    }
    default:
      return { handled: false };
  }
}
