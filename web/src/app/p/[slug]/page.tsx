import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductArt } from '@/components/ProductArt';
import { VariantPicker } from '@/components/VariantPicker';
import { formatEuros } from '@/lib/money';
import { stockLabel, variantLabel } from '@/modules/catalog/domain';
import { roomSprite } from '@/modules/catalog/room';
import { getCatalog } from '@/modules/catalog/source';
import { addToBag } from '@/modules/checkout/actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = (await getCatalog()).productBySlug((await params).slug);
  return p ? { title: p.name, description: p.description } : {};
}

const ERRORS: Record<string, string> = { agotado: 'Esa opción se acaba de agotar.', talla: 'Elige una opción.' };

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const view = await getCatalog();
  const product = view.productBySlug((await params).slug);
  if (!product) notFound();
  const { error } = await searchParams;
  const drop = view.drop(product.dropId), art = view.artwork(product.artworkId), support = view.support(product.supportId);
  const phase = view.phaseOf(drop);
  const options = view.variantsOf(product.id).map((v) => ({
    id: v.id, label: variantLabel(v, support), price: formatEuros(v.priceCents), stock: stockLabel(v.available), available: v.available,
  }));
  return (
    <div className="hero-art">
      <div className="stage"><ProductArt id={`p-${product.slug}`} sprite={roomSprite(support.slug)} spec={art.pattern} label={`${product.name}: ${support.name} con ${art.name}`} /></div>
      <div>
        <p className="eyebrow"><Link href={`/drops/${drop.slug}`}>{drop.number} · {drop.name}</Link></p>
        <h1>{product.name}</h1>
        {error && ERRORS[error] && <p className="alert">{ERRORS[error]}</p>}
        <VariantPicker options={options} canBuy={phase === 'abierto'} action={addToBag} back={`/p/${product.slug}`} />
        {phase !== 'abierto' && phase !== 'agotado' && drop.opensAt && (
          <p className="alert">Se abre el {new Date(drop.opensAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })}.</p>
        )}
        <p style={{ marginTop: 18 }}>{product.description}</p>
        <dl className="facts">
          <dt>Arte</dt><dd><Link href={`/artes/${art.slug}`}>{art.name}</Link></dd>
          <dt>Soporte</dt><dd>{support.name}</dd>
          <dt>Cuidados</dt><dd>{product.care}</dd>
        </dl>
        {support.category === 'prenda' && <p className="note">Corte boxy: si dudas entre dos tallas, coge la pequeña. Guía de tallas en cm pendiente de las medidas reales.</p>}
      </div>
    </div>
  );
}
