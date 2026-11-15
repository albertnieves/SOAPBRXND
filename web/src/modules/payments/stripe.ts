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

/** Stripe exige que una sesión dure al menos 30 minutos. */
const MIN_SESSION_SECONDS = 30 * 60 + 60;

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
  const nowS = Math.floor(now.getTime() / 1000);
  const expires_at = Math.max(Math.floor(Date.parse(order.reserved_until) / 1000), nowS + MIN_SESSION_SECONDS);
  return {
    mode: 'payment',
    locale: 'es',
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
