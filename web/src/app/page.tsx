import Link from 'next/link';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const view = await getCatalog();
  return (
    <>
      <p className="eyebrow">Lavandería de drops · abierta 24h</p>
      <h1>SOAPBRXND</h1>
      <div className="grid">
        {view.visibleDrops().map((d) => (
          <Link key={d.id} href={`/drops/${d.slug}`} className="card"><div className="card-meta"><span className={`phase ${view.phaseOf(d)}`}>{view.phaseOf(d).toUpperCase()}</span><strong>{d.number} · {d.name}</strong></div></Link>
        ))}
      </div>
      <p style={{ marginTop: 20 }}><Link className="btn ghost" href="/artes">Ver las artes</Link></p>
    </>
  );
}
