import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { formatEuros } from '@/lib/money';
import { paymentsEnabled } from '@/lib/env';
import { getCatalog } from '@/modules/catalog/source';
import { bagView, readCart } from '@/modules/checkout/server';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finalizar compra', robots: { index: false } };

export default async function Checkout() {
  const bag = bagView(await readCart(), await getCatalog());
  const enabled = paymentsEnabled();
  if (!bag.lines.length) return (<><h1>Finalizar compra</h1><p className="tk-lede">Tu bolsa está vacía.</p><p><Link className="tk-btn" href="/drops">Ver los drops</Link></p></>);
  return (
    <>
      <h1>Finalizar compra</h1>
      {!enabled && <p className="tk-alert">El pago no está activo: esta tienda está en modo demo.</p>}
      <div className="tk-checkout">
        <div className="tk-sheet"><CheckoutForm requestId={randomUUID()} enabled={enabled} /></div>
        <div className="tk-ticket">
          <p className="tk-ticket-head"><span>Tu pedido</span><small>{bag.lines.length} líneas</small></p>
          {bag.lines.map((l) => <div key={l.variantId} className="tk-sum"><span>{l.quantity} × {l.product.name}, {l.label}</span><span>{formatEuros(l.lineCents)}</span></div>)}
          <div className="tk-sum is-total"><span>Subtotal</span><span>{formatEuros(bag.itemsCents)}</span></div>
          <p>El envío se suma con tu código postal y lo ves antes de pagar.</p>
        </div>
      </div>
    </>
  );
}
