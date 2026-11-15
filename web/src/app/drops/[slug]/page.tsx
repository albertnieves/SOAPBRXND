import { notFound } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { ProductCard } from '@/components/ProductCard';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = (await getCatalog()).dropBySlug((await params).slug);
  return d ? { title: `${d.number} · ${d.name}`, description: d.copy } : {};
}

const PHASE_COPY: Record<string, string> = {
  anunciado: 'Todavía en el tambor.', llave: 'Abierto solo con llave.', agotado: 'Agotado. Agotado es agotado.', archivo: 'En el archivo.',
};

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const view = await getCatalog();
  const drop = view.dropBySlug((await params).slug);
  if (!drop) notFound();
  const phase = view.phaseOf(drop);
  return (
    <>
      <p className="eyebrow">Lavadora {drop.number}</p>
      <h1>{drop.name}</h1>
      <p><span className={`phase ${phase}`}>{phase.toUpperCase()}</span> {PHASE_COPY[phase] ?? ''}</p>
      <p>{drop.copy}</p>
      {(phase === 'anunciado' || phase === 'llave') && drop.opensAt && <Countdown to={drop.opensAt} />}
      <h2>Piezas</h2>
      <div className="grid">{view.productsOfDrop(drop.id).map((p) => <ProductCard key={p.id} product={p} view={view} />)}</div>
    </>
  );
}
