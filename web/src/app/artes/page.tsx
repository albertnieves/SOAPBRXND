import Link from 'next/link';
import { ArtSwatch } from '@/components/ArtSwatch';
import { ARTWORK_KINDS, piezas } from '@/modules/catalog/domain';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Artes', description: 'Patrones de estampado, texturas y textiles de SOAPBRXND.' };

const TITLES = { patron: 'Patrones de estampado', textura: 'Texturas', textil: 'Textiles' } as const;

export default async function Artes() {
  const view = await getCatalog();
  return (
    <>
      <p className="eyebrow">El origen de cada pieza</p>
      <h1>Artes</h1>
      <p>Cada arte es un patrón, una textura o un textil. De cada uno salen prendas, láminas y tela por metro.</p>
      {ARTWORK_KINDS.map((k) => (
        <section key={k}>
          <h2>{TITLES[k]}</h2>
          <div className="grid">
            {view.artworks().filter((a) => a.kind === k).map((a) => (
              <Link key={a.id} href={`/artes/${a.slug}`} className="card">
                <div className="card-art"><ArtSwatch id={`a-${a.slug}`} spec={a.pattern} /></div>
                <div className="card-meta"><strong>{a.name}</strong><span>{piezas(view.productsOfArtwork(a.id).length)}</span></div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
