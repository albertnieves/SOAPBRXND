import Link from 'next/link';
import { formatEuros } from '@/lib/money';
import { paymentsEnabled } from '@/lib/env';
import { cookies } from 'next/headers';
import { isVariantId, PENDING_COOKIE } from '@/modules/checkout/cart';
import { serviceRpc } from '@/lib/supabase-service';
import type { OrderSummary } from '@/modules/payments/stripe';
import { orderMessage } from '@/modules/checkout/order-copy';
import { ClearBag } from './ClearBag';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu pedido', robots: { index: false } };


export default async function Pedido({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let order: OrderSummary | null = null;
  if (paymentsEnabled() && id && isVariantId(id)) {
    order = await serviceRpc<OrderSummary | null>('order_status', { p_order: id }).catch(() => null);
  }
  if (!order) return (<><h1>Tu pedido</h1><p>No encontramos ese pedido. <Link href="/">Volver a la lavandería</Link></p></>);
  const paid = ['paid', 'needs_attention', 'shipped', 'delivered'].includes(order.status);
  // Solo se vacía la bolsa si este pedido se hizo en este navegador.
  const mine = (await cookies()).get(PENDING_COOKIE)?.value.split(':')[0] === order.order_id;
  return (
    <>
      {paid && mine && <ClearBag />}
      <p className="eyebrow">Pedido nº {order.number}</p>
      <h1>{paid ? 'Gracias' : 'Tu pedido'}</h1>
      <p>{orderMessage(order.status)}</p>
      {order.lines.map((l) => <p key={l.variant_id}>{l.quantity} × {l.product_name} · {l.variant_label}</p>)}
      <div className="total"><span>Total</span><span>{formatEuros(order.total_cents)}</span></div>
    </>
  );
}
