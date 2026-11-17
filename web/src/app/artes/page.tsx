import Link from 'next/link';
import { ArtSwatch } from '@/components/ArtSwatch';
import { ARTWORK_KINDS, piezas } from '@/modules/catalog/domain';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Artes', description: 'Los patrones de estampado, las texturas y los textiles de los que sale cada pieza de SOAPBRXND.' };

const TITLES = { patron: 'Patrones de estampado', textura: 'Texturas', textil: 'Textiles' } as const;

export default async function Artes() {
  const view = await getCatalog();
  return (
    <>
      <h1>Artes</h1>
      <p className="tk-lede">Todo empieza en un arte: un patrón, una textura o un textil. De cada uno salen prendas, láminas y tela por metro.</p>
      {ARTWORK_KINDS.map((k) => {
        const list = view.artworks().filter((a) => a.kind === k);
        return list.length ? (
          <section key={k}>
            <h2>{TITLES[k]}</h2>
            <div className="tk-samples">
              {list.map((a) => (
                <Link key={a.id} href={`/artes/${a.slug}`} className="tk-sample">
                  <span className="tk-sample-tag">{a.name}<small>{piezas(view.productsOfArtwork(a.id).length)}</small></span>
                  <span className="tk-pinked"><ArtSwatch id={`a-${a.slug}`} spec={a.pattern} /></span>
                </Link>
              ))}
            </div>
          </section>
        ) : null;
      })}
    </>
  );
}
