import Link from 'next/link';
import Script from 'next/script';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

/* La portada es la lavandería pixel (public/room). Debajo, los mismos enlaces en HTML normal. */
export default async function Home() {
  const view = await getCatalog();
  return (
    <>
      <link rel="stylesheet" href="/room/room.css" precedence="default" />
      <div id="lavanderia" aria-label="Lavandería SOAPBRXND" />
      <Script src="/room/room.js" strategy="afterInteractive" />
      <h1>SOAPBRXND · Lavandería de drops</h1>
      <p>Patrones de estampado, texturas y textiles convertidos en prendas, láminas y tela por metro.</p>
      <h2>Drops</h2>
      <ul>{view.visibleDrops().map((d) => <li key={d.id}><Link href={`/drops/${d.slug}`}>{d.number} · {d.name}</Link></li>)}</ul>
      <h2>Artes</h2>
      <ul>{view.artworks().map((a) => <li key={a.id}><Link href={`/artes/${a.slug}`}>{a.name}</Link></li>)}</ul>
    </>
  );
}
