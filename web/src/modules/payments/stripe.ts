/*
 * Stripe Checkout: la sesión se construye con lo que devolvió la base
 * (checkout_create), nunca con precios del navegador.
 */
import type Stripe from 'stripe';

export type OrderSummary = {
  order_id: string;
  number: number;
  status: string;
  items_cents: number;
  shipping_cents: number;
  total_cents: number;
  email: string;
  reserved_until: string;
  stripe_session_id?: string | null;
  lines: { variant_id: string; sku: string; product_name: string; variant_label: string; quantity: number; unit_cents: number }[];
};

/** Stripe exige que una sesión dure al menos 30 minutos (más un margen de red). */
const MIN_SESSION_SECONDS = 31 * 60;
/** La sesión caduca antes que la reserva: un pago hecho a tiempo siempre encuentra su pieza. */
export const SESSION_BEFORE_HOLD_SECONDS = 10 * 60;
/** Minutos de reserva al crear el pedido (35 de sesión + 10 de margen). */
export const HOLD_MINUTES = 45;

export function checkoutSessionParams(order: OrderSummary, baseUrl: string, now: Date = new Date()): Stripe.Checkout.SessionCreateParams {
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = order.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: l.unit_cents,
      product_data: { name: l.variant_label ? `${l.product_name} · ${l.variant_label}` : l.product_name },
    },
  }));
  if (order.shipping_cents > 0) {
    line_items.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: order.shipping_cents, product_data: { name: 'Envío' } } });
  }
  // Solo depende del pedido: un reintento con la misma clave de idempotencia manda lo mismo.
  const expires_at = Math.floor(Date.parse(order.reserved_until) / 1000) - SESSION_BEFORE_HOLD_SECONDS;
  if (expires_at < Math.floor(now.getTime() / 1000) + MIN_SESSION_SECONDS) throw new Error('hold_too_short');
  return {
    mode: 'payment',
    locale: 'es',
    // Sin pagos diferidos (SEPA…): llegarían cuando la reserva ya ha caducado.
    allowed_payment_method_types: ['card', 'link'],
    line_items,
    customer_email: order.email,
    client_reference_id: order.order_id,
    metadata: { order_id: order.order_id, number: String(order.number) },
    payment_intent_data: { metadata: { order_id: order.order_id, number: String(order.number) } },
    expires_at,
    success_url: `${baseUrl}/pedido?id=${order.order_id}`,
    cancel_url: `${baseUrl}/bolsa?cancelado=1`,
  };
}
