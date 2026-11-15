import type { PatternSpec } from '@/modules/catalog/domain';

/** Definición SVG de un arte (patrón, textura o textil) como <pattern>. */
export function PatternDef({ id, spec }: { id: string; spec: PatternSpec }) {
  const [a = '#1a1a1e', b = '#e8e0d0', c = b, d = c] = spec.colors;
  const s = spec.scale ?? 10;
  const motif = (() => {
    switch (spec.motif) {
      case 'checker':
        return <><rect width={s * 2} height={s * 2} fill={b} /><rect width={s} height={s} fill={a} /><rect x={s} y={s} width={s} height={s} fill={a} /></>;
      case 'stripes':
        return <><rect width={s * 2} height={s * 2} fill={a} /><rect width={s * 0.7} height={s * 2} fill={b} /></>;
      case 'dots':
        return <><rect width={s * 2} height={s * 2} fill={a} /><rect x={s * 0.5} y={s * 0.5} width={s * 0.6} height={s * 0.6} fill={b} /><rect x={s * 1.5} y={s * 1.4} width={s * 0.4} height={s * 0.4} fill={b} /></>;
      case 'waves':
        return <><rect width={s * 2} height={s * 2} fill={a} /><path d={`M0 ${s} Q ${s / 2} ${s / 3} ${s} ${s} T ${s * 2} ${s}`} stroke={b} strokeWidth={s / 4} fill="none" /></>;
      case 'grain':
        return <><rect width={s * 2} height={s * 2} fill={a} />{[[1, 3], [7, 2], [4, 9], [12, 6], [15, 14], [9, 15], [2, 13], [14, 1]].map(([x, y], i) => <rect key={i} x={(x! / 16) * s * 2} y={(y! / 16) * s * 2} width={s / 5} height={s / 5} fill={b} />)}</>;
      case 'loops':
        return <><rect width={s * 2} height={s * 2} fill={a} /><circle cx={s / 2} cy={s / 2} r={s / 3} fill="none" stroke={b} strokeWidth={s / 6} /><circle cx={s * 1.5} cy={s * 1.5} r={s / 3} fill="none" stroke={b} strokeWidth={s / 6} /></>;
      case 'weave':
        return <><rect width={s * 2} height={s * 2} fill={a} /><rect width={s * 2} height={s / 3} y={s / 3} fill={b} /><rect width={s / 3} height={s * 2} x={s * 1.3} fill={b} opacity={0.7} /></>;
      case 'bubbles':
        return <><rect width={s * 2} height={s * 2} fill={a} /><circle cx={s * 0.6} cy={s * 0.6} r={s * 0.4} fill="none" stroke={b} strokeWidth={s / 6} /><circle cx={s * 1.5} cy={s * 1.2} r={s * 0.28} fill="none" stroke={c} strokeWidth={s / 6} /><circle cx={s * 0.9} cy={s * 1.65} r={s * 0.18} fill="none" stroke={d} strokeWidth={s / 7} /></>;
    }
  })();
  return (
    <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse">
      {motif}
    </pattern>
  );
}

export function ArtSwatch({ id, spec, label }: { id: string; spec: PatternSpec; label?: string }) {
  return (
    <svg className="tk-swatch" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} shapeRendering="crispEdges">
      <defs><PatternDef id={id} spec={spec} /></defs>
      <rect width="120" height="120" fill={`url(#${id})`} />
    </svg>
  );
}
