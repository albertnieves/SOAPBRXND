import Link from 'next/link';
import { ProductArt } from '@/components/ProductArt';
import { formatEuros } from '@/lib/money';
import { roomSprite } from '@/modules/catalog/room';
import { getCatalog } from '@/modules/catalog/source';
import { setBagQuantity } from '@/modules/checkout/actions';
import { SHIPPING_RATES } from '@/modules/checkout/quote';
import { bagView, readCart } from '@/modules/checkout/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bolsa', robots: { index: false } };

export default async function Bolsa({ searchParams }: { searchParams: Promise<{ cancelado?: string; error?: string }> }) {
  const view = await getCatalog();
  const bag = bagView(await readCart(), view);
  const { cancelado, error } = await searchParams;
  return (
    <>
      <h1>Tu bolsa</h1>
      {cancelado && <p className="tk-alert">No se ha cobrado nada. Tu bolsa sigue aquí.</p>}
      {error === 'max_quantity' && <p className="tk-alert">Como mucho 10 unidades de cada pieza.</p>}
      {error === 'full' && <p className="tk-alert">La bolsa está llena. Quita algo para añadir más.</p>}
      {!bag.lines.length ? (
        <>
          <p className="tk-lede">Todavía no hay nada dentro.</p>
          <p><Link className="tk-btn" href="/drops">Ver los drops</Link></p>
        </>
      ) : (
        <div className="tk-ticket">
          <p className="tk-ticket-head"><span>SOAPBRXND</span><small>{bag.lines.reduce((n, l) => n + l.quantity, 0)} uds.</small></p>
          {bag.lines.map((l) => (
            <div key={l.variantId} className="tk-line" data-testid="bag-line">
              <ProductArt id={`b-${l.variantId}`} sprite={roomSprite(view.support(l.product.supportId).slug)} spec={view.artwork(l.product.artworkId).pattern} label="" />
              <div>
                <Link href={`/p/${l.product.slug}`}>{l.product.name}</Link>
                <small>{l.label}, {formatEuros(l.unitCents)}</small>
                {(!l.purchasable || l.available < l.quantity) && <small style={{ color: 'var(--red)' }}>Solo quedan {l.available}: baja la cantidad.</small>}
              </div>
              <div className="tk-qty">
                <form action={setBagQuantity}><input type="hidden" name="variantId" value={l.variantId} /><input type="hidden" name="quantity" value={l.quantity - 1} /><button aria-label={`Quitar una unidad de ${l.product.name}`}>−</button></form>
                <span>{l.quantity}</span>
                <form action={setBagQuantity}><input type="hidden" name="variantId" value={l.variantId} /><input type="hidden" name="quantity" value={l.quantity + 1} /><button aria-label={`Añadir una unidad de ${l.product.name}`}>+</button></form>
              </div>
            </div>
          ))}
          <div className="tk-sum is-total"><span>Subtotal</span><span data-testid="bag-total">{formatEuros(bag.itemsCents)}</span></div>
          <p>Envío: {formatEuros(SHIPPING_RATES.peninsula.priceCents)} a la península (gratis desde {formatEuros(SHIPPING_RATES.peninsula.freeFromCents!)}) y {formatEuros(SHIPPING_RATES.baleares.priceCents)} a Baleares. IVA incluido.</p>
          <p style={{ marginTop: 18 }}><Link className="tk-btn" href="/checkout">Finalizar compra</Link></p>
        </div>
      )}
    </>
  );
}
