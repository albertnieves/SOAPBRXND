import Link from 'next/link';
import { getCatalog } from '@/modules/catalog/source';
import { piezas } from '@/modules/catalog/domain';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Drops' };

export default async function Drops() {
  const view = await getCatalog();
  return (
    <>
      <p className="eyebrow">Cada lavadora es un drop</p>
      <h1>Drops</h1>
      <div className="grid">
        {view.visibleDrops().map((d) => (
          <Link key={d.id} href={`/drops/${d.slug}`} className="card">
            <div className="card-meta"><span className={`phase ${view.phaseOf(d)}`}>{view.phaseOf(d).toUpperCase()}</span><strong>{d.number} · {d.name}</strong><span>{piezas(view.productsOfDrop(d.id).length)}</span></div>
          </Link>
        ))}
      </div>
    </>
  );
}
