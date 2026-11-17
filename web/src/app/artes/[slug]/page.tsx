import Link from 'next/link';
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
  return (
    <>
      <p className="tk-crumb"><Link href="/artes">Artes</Link> / {ARTWORK_KIND_LABEL[art.kind]}</p>
      <div className="tk-art-head">
        <span className="tk-pinked"><ArtSwatch id={`big-${art.slug}`} spec={art.pattern} label={`Muestra de ${art.name}`} /></span>
        <div>
          <h1>{art.name}</h1>
          <p className="tk-lede">{art.story}</p>
        </div>
      </div>
      <h2>Piezas con este arte</h2>
      <div className="tk-rail">{view.productsOfArtwork(art.id).map((p) => <ProductCard key={p.id} product={p} view={view} />)}</div>
    </>
  );
}
