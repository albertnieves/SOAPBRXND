import type { PatternSpec } from '@/modules/catalog/domain';
import type { RoomSprite } from '@/modules/catalog/room';
import { PatternDef } from './ArtSwatch';

/* Siluetas de pixel (rejilla de 20×20) por soporte, rellenas con el arte. */
const SHAPES: Record<RoomSprite, string> = {
  hoodie: 'M7 1h6v2h2v1h2v2h2v9h-3v-6h-1v9H5V9H4v6H1V6h2V4h2V3h2z',
  tee: 'M6 2h3v1h2V2h3v1h3v1h2v4h-3v-1h-1v11H5V7H4v1H1V4h2V3h3z',
  beanie: 'M9 1h2v2h2v1h2v2h1v3h1v6H3V9h1V6h1V4h2V3h2z',
  print: 'M2 1h16v18H2z',
  fabric: 'M2 4h13v1h2v1h1v10h-1v1h-2v1H2z',
  scarf: 'M10 1l9 9-9 9-9-9z',
};

export function ProductArt({ id, sprite, spec, label }: { id: string; sprite: RoomSprite; spec: PatternSpec; label: string }) {
  return (
    <svg className="product-art" viewBox="0 0 20 20" role="img" aria-label={label} shapeRendering="crispEdges">
      <defs><PatternDef id={id} spec={{ ...spec, scale: Math.max(1.4, (spec.scale ?? 10) / 6) }} /></defs>
      {sprite === 'print' && <path d="M1 0h18v20H1z" fill="#070707" />}
      <path d={SHAPES[sprite]} fill={`url(#${id})`} stroke="#070707" strokeWidth="0.6" />
      {sprite === 'print' && <path d="M2 1h16v18H2z" fill="none" stroke="#f2f0eb" strokeWidth="0.5" />}
      {sprite === 'fabric' && <path d="M15 5h2v12h-2z" fill="#070707" opacity="0.25" />}
    </svg>
  );
}
