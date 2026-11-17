import Link from 'next/link';
import { Room } from '@/components/Room';
import { Washer } from '@/components/Washer';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

/* La portada es la lavandería (src/room). Debajo queda la misma tienda en HTML normal. */
export default async function Home() {
  const view = await getCatalog();
  return (
    <>
      <Room />
      <h1>SOAPBRXND, lavandería de drops</h1>
      <p className="tk-lede">Patrones de estampado, texturas y textiles convertidos en prendas, láminas y tela por metro. Cada lavadora es un drop.</p>
      <h2>Drops</h2>
      <div className="tk-washers">{view.visibleDrops().map((d) => <Washer key={d.id} drop={d} view={view} as="a" href={`/drops/${d.slug}`} />)}</div>
      <h2>Artes</h2>
      <ul>{view.artworks().map((a) => <li key={a.id}><Link href={`/artes/${a.slug}`}>{a.name}</Link></li>)}</ul>
    </>
  );
}
