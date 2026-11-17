import Link from 'next/link';
import Script from 'next/script';
import { Washer } from '@/components/Washer';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

/* La portada es la lavandería pixel (public/room). Debajo queda la misma tienda en HTML normal. */
export default async function Home() {
  const view = await getCatalog();
  return (
    <>
      <link rel="stylesheet" href="/room/room.css" precedence="default" />
      <div id="lavanderia" aria-label="Lavandería SOAPBRXND" />
      <Script src="/room/room.js" strategy="afterInteractive" />
      <h1>SOAPBRXND, lavandería de drops</h1>
      <p className="tk-lede">Patrones de estampado, texturas y textiles convertidos en prendas, láminas y tela por metro. Cada lavadora es un drop.</p>
      <h2>Drops</h2>
      <div className="tk-washers">{view.visibleDrops().map((d) => <Washer key={d.id} drop={d} view={view} as="a" href={`/drops/${d.slug}`} />)}</div>
      <h2>Artes</h2>
      <ul>{view.artworks().map((a) => <li key={a.id}><Link href={`/artes/${a.slug}`}>{a.name}</Link></li>)}</ul>
    </>
  );
}
