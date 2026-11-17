/* Tras confirmar un pago: correo al cliente y aviso a la tienda. Nunca rompe el webhook. */
import type { OrderSummary } from '@/modules/payments/stripe';
import { orderEmail, shopEmail, type Mail } from './order-email';

export type NotifyDeps = {
  getOrder: (orderId: string) => Promise<OrderSummary | null>;
  send: (mail: Mail & { to: string }) => Promise<void>;
  baseUrl: string;
  shopTo: string | null;
};

export async function notifyOrder(result: { status?: string; order_id?: string } | undefined, deps: NotifyDeps): Promise<void> {
  if (!result?.order_id || (result.status !== 'paid' && result.status !== 'needs_attention')) return;
  try {
    const order = await deps.getOrder(result.order_id);
    if (!order) return;
    await deps.send({ to: order.email, ...orderEmail(order, deps.baseUrl) });
    if (deps.shopTo) await deps.send({ to: deps.shopTo, ...shopEmail(order) });
  } catch (e) {
    console.error('mail: no se pudo avisar del pedido', result.order_id, e);
  }
}
