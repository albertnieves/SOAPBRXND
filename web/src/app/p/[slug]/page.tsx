import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtSwatch } from '@/components/ArtSwatch';
import { CareLabel } from '@/components/CareLabel';
import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { VariantPicker } from '@/components/VariantPicker';
import { formatEuros } from '@/lib/money';
import { siteUrl } from '@/lib/env';
import { stockLabel, variantLabel } from '@/modules/catalog/domain';
import { roomSprite } from '@/modules/catalog/room';
import { getCatalog } from '@/modules/catalog/source';
import { addToBag } from '@/modules/checkout/actions';
import { SHIPPING_RATES } from '@/modules/checkout/quote';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const view = await getCatalog();
  const p = view.productBySlug((await params).slug);
  if (!p) return {};
  const photo = view.imagesOf(p)[0];
  return { title: p.name, description: p.description, alternates: { canonical: `/p/${p.slug}` }, openGraph: { title: p.name, description: p.description, images: photo ? [photo.url] : undefined } };
}

const ERRORS: Record<string, string> = { agotado: 'Esa opción se acaba de agotar. Elige otra.', talla: 'Elige una opción antes de añadir.' };
const LEGEND: Record<string, string> = { talla: 'Talla', medida: 'Medida', 'medida+papel': 'Medida y papel', 'tejido+largo': 'Tejido y largo' };

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const view = await getCatalog();
  const product = view.productBySlug((await params).slug);
  if (!product) notFound();
  const { error } = await searchParams;
  const drop = view.drop(product.dropId), art = view.artwork(product.artworkId), support = view.support(product.supportId);
  const phase = view.phaseOf(drop);
  const variants = view.variantsOf(product.id);
  const options = variants.map((v) => ({
    id: v.id, label: variantLabel(v, support), price: formatEuros(v.priceCents), stock: stockLabel(v.available), available: v.available,
  }));
  const photos = view.imagesOf(product);
  const related = view.productsOfArtwork(art.id).filter((p) => p.id !== product.id);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description,
    sku: variants[0]?.sku, brand: { '@type': 'Brand', name: 'SOAPBRXND' }, image: photos.map((p) => p.url),
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'EUR', offerCount: variants.length,
      lowPrice: (view.fromPriceCents(product) / 100).toFixed(2), highPrice: (Math.max(...variants.map((v) => v.priceCents)) / 100).toFixed(2),
      availability: view.purchasable(product) ? 'https://schema.org/InStock' : phase === 'anunciado' || phase === 'llave' ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
      url: `${siteUrl()}/p/${product.slug}`,
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="tk-product">
        <div>
          {photos.length ? (
            <div className="tk-photos">{photos.map((p, i) => <img key={p.url} src={p.url} alt={p.alt || product.name} loading={i ? 'lazy' : 'eager'} />)}</div>
          ) : (
            <div className="tk-stage"><ProductArt id={`p-${product.slug}`} sprite={roomSprite(support.slug)} spec={art.pattern} label={`${product.name}: ${support.name} con el arte ${art.name}`} /></div>
          )}
          <div className="tk-detail">
            <ArtSwatch id={`d-${art.slug}`} spec={art.pattern} />
            <span>El arte de esta pieza es <Link href={`/artes/${art.slug}`}>{art.name}</Link>. {art.story}</span>
          </div>
        </div>
        <div className="tk-buy">
          <p className="tk-crumb"><Link href="/drops">Drops</Link> / <Link href={`/drops/${drop.slug}`}>{drop.number} {drop.name}</Link></p>
          <h1>{product.name}</h1>
          {error && ERRORS[error] && <p className="tk-alert" role="alert">{ERRORS[error]}</p>}
          <VariantPicker options={options} canBuy={phase === 'abierto'} legend={LEGEND[support.options.join('+')] ?? 'Opción'} action={addToBag} back={`/p/${product.slug}`} />
          {phase !== 'abierto' && phase !== 'agotado' && drop.opensAt && (
            <p className="tk-note">Se abre el {new Date(drop.opensAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })}. Hasta entonces no se puede comprar.</p>
          )}
          <p style={{ marginTop: 20 }}>{product.description}</p>
          <ul className="tk-promises">
            <li>Envío en 48–72 h a la península por {formatEuros(SHIPPING_RATES.peninsula.priceCents)}, gratis desde {formatEuros(SHIPPING_RATES.peninsula.freeFromCents!)}.</li>
            <li>{support.slug === 'tela-metro' ? 'La tela se corta a medida y no admite devolución.' : '14 días para devolverlo.'}</li>
            <li>Pago seguro con tarjeta a través de Stripe.</li>
          </ul>
          <CareLabel
            category={support.category}
            rows={[['Arte', art.name], ['Soporte', support.name], ['Cuidados', product.care]]}
            footer={support.category === 'prenda' ? 'Corte boxy: si dudas entre dos tallas, coge la pequeña.' : `Drop ${drop.number}, ${drop.name}.`}
          />
        </div>
      </div>
      {related.length > 0 && (<><h2>Más piezas con {art.name}</h2><div className="tk-rail">{related.map((p) => <ProductCard key={p.id} product={p} view={view} />)}</div></>)}
    </>
  );
}
