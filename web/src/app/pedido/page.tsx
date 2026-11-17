import Link from 'next/link';
import { cookies } from 'next/headers';
import { formatEuros } from '@/lib/money';
import { paymentsEnabled } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';
import { isVariantId, PENDING_COOKIE } from '@/modules/checkout/cart';
import { orderMessage } from '@/modules/checkout/order-copy';
import type { OrderSummary } from '@/modules/payments/stripe';
import { ClearBag } from './ClearBag';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu pedido', robots: { index: false } };

const STAMP: Record<string, [string, string]> = {
  paid: ['Pagado', ''], shipped: ['Enviado', ''], delivered: ['Entregado', ''],
  pending: ['Confirmando', 'is-wait'], needs_attention: ['En revisión', 'is-wait'],
  expired: ['Caducado', 'is-bad'], cancelled: ['Cancelado', 'is-bad'], refunded: ['Reembolsado', 'is-bad'],
};

export default async function Pedido({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let order: OrderSummary | null = null;
  if (paymentsEnabled() && id && isVariantId(id)) {
    order = await serviceRpc<OrderSummary | null>('order_status', { p_order: id }).catch(() => null);
  }
  if (!order) return (<><h1>Tu pedido</h1><p className="tk-lede">No encontramos ese pedido.</p><p><Link className="tk-btn" href="/">Volver a la lavandería</Link></p></>);
  const paid = ['paid', 'needs_attention', 'shipped', 'delivered'].includes(order.status);
  // Solo se vacía la bolsa si este pedido se hizo en este navegador.
  const mine = (await cookies()).get(PENDING_COOKIE)?.value.split(':')[0] === order.order_id;
  const [stamp, stampClass] = STAMP[order.status] ?? [order.status, 'is-wait'];
  return (
    <>
      {paid && mine && <ClearBag />}
      <h1>{paid ? 'Gracias por tu pedido' : 'Tu pedido'}</h1>
      <p className="tk-lede">{orderMessage(order.status)}</p>
      <div className="tk-ticket">
        <p className="tk-ticket-head"><span>Ticket nº {order.number}</span></p>
        <span className={`tk-stamp ${stampClass}`}>{stamp}</span>
        {order.lines.map((l) => <div key={l.variant_id} className="tk-sum"><span>{l.quantity} × {l.product_name}{l.variant_label ? `, ${l.variant_label}` : ''}</span><span>{formatEuros(l.unit_cents * l.quantity)}</span></div>)}
        <div className="tk-sum"><span>Envío</span><span>{order.shipping_cents ? formatEuros(order.shipping_cents) : 'Gratis'}</span></div>
        <div className="tk-sum is-total"><span>Total</span><span>{formatEuros(order.total_cents)}</span></div>
      </div>
    </>
  );
}
