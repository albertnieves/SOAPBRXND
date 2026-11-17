import type { PatternSpec } from '@/modules/catalog/domain';
import { cellPaths, mockup, MOCKUP_SIZE } from '@/modules/catalog/mockup';
import type { RoomSprite } from '@/modules/catalog/room';
import { PatternDef } from './ArtSwatch';

/** Mockup de pixel de una pieza: la silueta del soporte rellena con el arte, colgada en la pared. */
export function ProductArt({ id, sprite, spec, label }: { id: string; sprite: RoomSprite; spec: PatternSpec; label: string }) {
  const rows = mockup(sprite);
  const scale = Math.max(2, (spec.scale ?? 10) / 4);
  return (
    <svg className="tk-art" viewBox={`0 0 ${MOCKUP_SIZE} ${MOCKUP_SIZE}`} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} shapeRendering="crispEdges">
      <defs><PatternDef id={id} spec={{ ...spec, scale }} /></defs>
      <path d={cellPaths(rows, 'pqhkwafno')} fill="rgba(23,23,27,.13)" transform="translate(1.6 1.8)" />
      <path d={cellPaths(rows, 'm')} fill="#8d8d97" />
      <path d={cellPaths(rows, 'pqhk')} fill={`url(#${id})`} />
      <path d={cellPaths(rows, 'q')} fill="rgba(0,0,0,.2)" />
      <path d={cellPaths(rows, 'k')} fill="rgba(0,0,0,.44)" />
      <path d={cellPaths(rows, 'h')} fill="rgba(255,255,255,.3)" />
      <path d={cellPaths(rows, 'w')} fill="#f2f0eb" />
      <path d={cellPaths(rows, 'a')} fill="#fbfaf6" />
      <path d={cellPaths(rows, 'n')} fill="#c9a877" />
      <path d={cellPaths(rows, 'fo')} fill="#17171b" />
    </svg>
  );
}
