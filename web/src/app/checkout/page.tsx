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
  if (!bag.lines.length) return (<><h1>Finalizar compra</h1><p>Tu bolsa está vacía. <Link href="/drops">Ver los drops</Link></p></>);
  return (
    <>
      <h1>Finalizar compra</h1>
      {!enabled && <p className="alert">El pago no está activo: esta tienda está en modo demo.</p>}
      <div className="hero-art">
        <CheckoutForm requestId={randomUUID()} enabled={enabled} />
        <div>
          <h2 style={{ marginTop: 0 }}>Tu pedido</h2>
          {bag.lines.map((l) => <p key={l.variantId}>{l.quantity} × {l.product.name} · {l.label} — {formatEuros(l.lineCents)}</p>)}
          <div className="total"><span>Subtotal</span><span>{formatEuros(bag.itemsCents)}</span></div>
          <p className="note">El envío y el total final se calculan con tu código postal antes de pagar.</p>
        </div>
      </div>
    </>
  );
}
