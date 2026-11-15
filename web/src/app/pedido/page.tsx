import Link from 'next/link';
import { formatEuros } from '@/lib/money';
import { paymentsEnabled } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';
import type { OrderSummary } from '@/modules/payments/stripe';
import { ClearBag } from './ClearBag';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu pedido', robots: { index: false } };

const STATUS: Record<string, string> = {
  pending: 'Confirmando el pago con el banco… recarga en unos segundos.',
  paid: 'Pagado. Lo estamos preparando.',
  needs_attention: 'Pago recibido. Lo revisamos y te escribimos.',
  expired: 'La reserva caducó sin pago.',
  shipped: 'Enviado.', delivered: 'Entregado.', cancelled: 'Cancelado.', refunded: 'Reembolsado.',
};

export default async function Pedido({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let order: OrderSummary | null = null;
  if (paymentsEnabled() && id && /^[0-9a-f-]{36}$/.test(id)) {
    order = await serviceRpc<OrderSummary | null>('order_status', { p_order: id }).catch(() => null);
  }
  if (!order) return (<><h1>Tu pedido</h1><p>No encontramos ese pedido. <Link href="/">Volver a la lavandería</Link></p></>);
  const paid = ['paid', 'needs_attention', 'shipped', 'delivered'].includes(order.status);
  return (
    <>
      {paid && <ClearBag />}
      <p className="eyebrow">Pedido nº {order.number}</p>
      <h1>{paid ? 'Gracias' : 'Tu pedido'}</h1>
      <p>{STATUS[order.status] ?? order.status}</p>
      {order.lines.map((l) => <p key={l.variant_id}>{l.quantity} × {l.product_name} · {l.variant_label}</p>)}
      <div className="total"><span>Total</span><span>{formatEuros(order.total_cents)}</span></div>
      <p>Te hemos enviado la confirmación a tu email.</p>
    </>
  );
}
