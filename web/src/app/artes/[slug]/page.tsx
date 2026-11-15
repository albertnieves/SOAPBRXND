import { notFound } from 'next/navigation';
import { ArtSwatch } from '@/components/ArtSwatch';
import { ProductCard } from '@/components/ProductCard';
import { ARTWORK_KIND_LABEL } from '@/modules/catalog/domain';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = (await getCatalog()).artworkBySlug((await params).slug);
  return a ? { title: a.name, description: a.story } : {};
}

export default async function Arte({ params }: { params: Promise<{ slug: string }> }) {
  const view = await getCatalog();
  const art = view.artworkBySlug((await params).slug);
  if (!art) notFound();
  const products = view.productsOfArtwork(art.id);
  return (
    <>
      <div className="hero-art">
        <div className="stage"><ArtSwatch id={`big-${art.slug}`} spec={art.pattern} label={`Muestra de ${art.name}`} /></div>
        <div>
          <p className="eyebrow">{ARTWORK_KIND_LABEL[art.kind]}</p>
          <h1>{art.name}</h1>
          <p>{art.story}</p>
        </div>
      </div>
      <h2>Dónde está</h2>
      {products.length ? <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} view={view} />)}</div> : <p>Este arte todavía no está en ninguna pieza.</p>}
    </>
  );
}
