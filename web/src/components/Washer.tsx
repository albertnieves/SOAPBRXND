import type { Drop, DropPhase } from '@/modules/catalog/domain';
import { piezas } from '@/modules/catalog/domain';
import type { CatalogView } from '@/modules/catalog/view';
import { ArtSwatch } from './ArtSwatch';

export const PHASE_LABEL: Record<DropPhase, string> = {
  borrador: 'Borrador', anunciado: 'Anunciado', llave: 'Con llave', abierto: 'Girando', agotado: 'Agotado', archivo: 'Archivo',
};

/** Frontal de lavadora de un drop: panel con número y estado, y el arte dando vueltas en el ojo de buey. */
export function Washer({ drop, view, as: Tag = 'div', href }: { drop: Drop; view: CatalogView; as?: 'div' | 'a'; href?: string }) {
  const phase = view.phaseOf(drop);
  const products = view.productsOfDrop(drop.id);
  const art = products[0] ? view.artwork(products[0].artworkId) : null;
  return (
    <Tag className={`tk-washer is-${phase}`} href={href}>
      <span className="tk-washer-panel"><b>{drop.number}</b><i className="tk-led" aria-hidden="true" /><span>{PHASE_LABEL[phase]}</span></span>
      <span className="tk-porthole">{art && <ArtSwatch id={`w-${drop.slug}`} spec={art.pattern} />}</span>
      <strong>{drop.name}</strong>
      <small>{piezas(products.length)}</small>
    </Tag>
  );
}
