import Link from 'next/link';
import { ProductArt } from '@/components/ProductArt';
import { formatEuros } from '@/lib/money';
import { roomSprite } from '@/modules/catalog/room';
import { getCatalog } from '@/modules/catalog/source';
import { setBagQuantity } from '@/modules/checkout/actions';
import { SHIPPING_RATES } from '@/modules/checkout/quote';
import { bagView, readCart } from '@/modules/checkout/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bolsa' };

export default async function Bolsa({ searchParams }: { searchParams: Promise<{ cancelado?: string; error?: string }> }) {
  const view = await getCatalog();
  const bag = bagView(await readCart(), view);
  const { cancelado, error } = await searchParams;
  return (
    <>
      <h1>Bolsa</h1>
      {cancelado && <p className="alert">Pago cancelado. Tu bolsa sigue aquí.</p>}
      {error === 'max_quantity' && <p className="alert">Máximo 10 unidades de cada pieza.</p>}
      {error === 'full' && <p className="alert">La bolsa está llena.</p>}
      {!bag.lines.length ? (
        <p>Tu bolsa está vacía. <Link href="/drops">Ver los drops</Link></p>
      ) : (
        <>
          {bag.lines.map((l) => (
            <div key={l.variantId} className="bagline" data-testid="bag-line">
              <div className="thumb"><ProductArt id={`b-${l.variantId}`} sprite={roomSprite(view.support(l.product.supportId).slug)} spec={view.artwork(l.product.artworkId).pattern} label="" /></div>
              <div>
                <Link href={`/p/${l.product.slug}`}><strong>{l.product.name}</strong></Link><br />
                <small>{l.label} · {formatEuros(l.unitCents)}</small>
                {(!l.purchasable || l.available < l.quantity) && <><br /><small className="stock out">Quedan {l.available}: ajusta la cantidad</small></>}
              </div>
              <div className="qty">
                <form action={setBagQuantity}><input type="hidden" name="variantId" value={l.variantId} /><input type="hidden" name="quantity" value={l.quantity - 1} /><button aria-label="Quitar una">-</button></form>
                <span>{l.quantity}</span>
                <form action={setBagQuantity}><input type="hidden" name="variantId" value={l.variantId} /><input type="hidden" name="quantity" value={l.quantity + 1} /><button aria-label="Añadir una">+</button></form>
              </div>
            </div>
          ))}
          <div className="total"><span>Subtotal</span><span data-testid="bag-total">{formatEuros(bag.itemsCents)}</span></div>
          <p className="note">Envío: {formatEuros(SHIPPING_RATES.peninsula.priceCents)} a la península (gratis desde {formatEuros(SHIPPING_RATES.peninsula.freeFromCents!)}) y {formatEuros(SHIPPING_RATES.baleares.priceCents)} a Baleares. IVA incluido.</p>
          <p><Link className="btn" href="/checkout">Finalizar compra</Link></p>
        </>
      )}
    </>
  );
}
