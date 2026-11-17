import { describe, expect, it } from 'vitest';
import { cellPaths, mockup, MOCKUP_SIZE } from '@/modules/catalog/mockup';

const SPRITES = ['hoodie', 'tee', 'beanie', 'print', 'fabric', 'scarf'] as const;

describe('mockup pixel de cada soporte', () => {
  it.each(SPRITES)('%s: rejilla completa, con arte, sombra y contorno', (s) => {
    const rows = mockup(s);
    expect(rows).toHaveLength(MOCKUP_SIZE);
    for (const r of rows) expect(r).toHaveLength(MOCKUP_SIZE);
    const all = rows.join('');
    expect((all.match(/p/g) ?? []).length).toBeGreaterThan(150); // el arte ocupa la pieza
    expect(all).toMatch(/q/); // volumen
    expect(all).toMatch(/o/); // contorno
    expect(all).toMatch(/^[.pqhkwomafn]+$/);
  });
  it('todo lo pintado queda rodeado de contorno (ningún color toca el vacío)', () => {
    for (const s of SPRITES) {
      const rows = mockup(s);
      for (let y = 0; y < MOCKUP_SIZE; y++) for (let x = 0; x < MOCKUP_SIZE; x++) {
        const c = rows[y]![x]!;
        if (c === '.' || c === 'o' || c === 'm') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = rows[y + dy!]?.[x + dx!];
          expect(n === '.' || n === undefined, `${s} ${x},${y}`).toBe(false);
        }
      }
    }
  });
  it('es determinista', () => expect(mockup('tee')).toEqual(mockup('tee')));
  it('cellPaths une celdas contiguas en tramos horizontales', () => {
    expect(cellPaths(['pp.p', '....'], 'p')).toBe('M0 0h2v1h-2zM3 0h1v1h-1z');
  });
});
