import type { SupportCategory } from '@/modules/catalog/domain';

/* Símbolos de cuidado, como en una etiqueta de composición. */
const ICONS = {
  wash30: ['Lavar a 30 °C', <><path d="M3 9l2 11h14l2-11" /><path d="M3 9c2-2 4 2 6 0s4 2 6 0 4 2 6 0" /><text x="12" y="18" textAnchor="middle" fontSize="7" stroke="none" fill="currentColor" fontWeight="700">30</text></>],
  wash40: ['Lavar a 40 °C', <><path d="M3 9l2 11h14l2-11" /><path d="M3 9c2-2 4 2 6 0s4 2 6 0 4 2 6 0" /><text x="12" y="18" textAnchor="middle" fontSize="7" stroke="none" fill="currentColor" fontWeight="700">40</text></>],
  noBleach: ['No usar lejía', <><path d="M12 4l9 16H3z" /><path d="M5 5l14 15M19 5L5 20" /></>],
  noTumble: ['No usar secadora', <><rect x="3" y="3" width="18" height="18" /><circle cx="12" cy="12" r="6" /><path d="M3 3l18 18M21 3L3 21" /></>],
  ironLow: ['Planchar a baja temperatura', <><path d="M3 18h18l-2-8H9c-3 0-5 3-6 8z" /><path d="M9 10V7h8" /><circle cx="12" cy="15" r="1" fill="currentColor" /></>],
  dryClean: ['Limpieza en seco', <><circle cx="12" cy="12" r="9" /><text x="12" y="15.5" textAnchor="middle" fontSize="9" stroke="none" fill="currentColor" fontWeight="700">P</text></>],
  noWater: ['No mojar', <><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" /><path d="M4 4l16 16" /></>],
  noSun: ['Lejos de la luz directa', <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /><path d="M3 21L21 3" /></>],
} as const;

const BY_CATEGORY: Record<SupportCategory, (keyof typeof ICONS)[]> = {
  prenda: ['wash30', 'noBleach', 'noTumble', 'ironLow'],
  accesorio: ['wash30', 'noBleach', 'noTumble'],
  textil: ['wash40', 'noBleach', 'ironLow'],
  arte: ['noWater', 'noSun'],
};

export function CareLabel({ category, rows, footer }: { category: SupportCategory; rows: [string, React.ReactNode][]; footer: string }) {
  return (
    <aside className="tk-care" aria-label="Etiqueta de composición y cuidados">
      <p className="tk-care-brand">SOAPBRXND</p>
      <ul className="tk-care-icons">
        {BY_CATEGORY[category].map((k) => (
          <li key={k} title={ICONS[k][0]}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" role="img" aria-label={ICONS[k][0]}>{ICONS[k][1]}</svg>
          </li>
        ))}
      </ul>
      <dl>{rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted)' }}>{footer}</p>
    </aside>
  );
}
