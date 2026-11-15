import { notFound } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { ProductCard } from '@/components/ProductCard';
import { Washer } from '@/components/Washer';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = (await getCatalog()).dropBySlug((await params).slug);
  return d ? { title: `${d.number} ${d.name}`, description: d.copy } : {};
}

const PHASE_COPY: Record<string, string> = {
  llave: 'De momento solo abre con llave.', agotado: 'Agotado es agotado.', archivo: 'Este drop ya está en el archivo.',
};
const day = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const view = await getCatalog();
  const drop = view.dropBySlug((await params).slug);
  if (!drop) notFound();
  const phase = view.phaseOf(drop);
  const waiting = phase === 'anunciado' || phase === 'llave';
  return (
    <>
      <div className="tk-drop-head">
        <Washer drop={drop} view={view} />
        <div>
          <h1>{drop.name}</h1>
          <p className="tk-lede">{drop.copy}</p>
          {PHASE_COPY[phase] && <p>{PHASE_COPY[phase]}</p>}
          {waiting && drop.opensAt && (<><p>Abre para todo el mundo el {day(drop.opensAt)}:</p><Countdown to={drop.opensAt} /></>)}
        </div>
      </div>
      <h2>Las piezas</h2>
      <div className="tk-rail">{view.productsOfDrop(drop.id).map((p) => <ProductCard key={p.id} product={p} view={view} />)}</div>
    </>
  );
}
