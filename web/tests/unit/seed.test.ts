import { describe, expect, it } from 'vitest';
import { SEED } from '@/data/seed';

const ids = <T extends { id: string }>(xs: T[]) => new Set(xs.map((x) => x.id));
const unique = (xs: string[]) => new Set(xs).size === xs.length;

describe('semilla del catálogo', () => {
  it('slugs y SKU únicos', () => {
    expect(unique(SEED.drops.map((d) => d.slug))).toBe(true);
    expect(unique(SEED.artworks.map((a) => a.slug))).toBe(true);
    expect(unique(SEED.products.map((p) => p.slug))).toBe(true);
    expect(unique(SEED.variants.map((v) => v.sku))).toBe(true);
    expect(unique([...SEED.drops, ...SEED.artworks, ...SEED.supports, ...SEED.products, ...SEED.variants].map((x) => x.id))).toBe(true);
  });
  it('todas las referencias existen', () => {
    const drops = ids(SEED.drops), arts = ids(SEED.artworks), sups = ids(SEED.supports), prods = ids(SEED.products);
    for (const p of SEED.products) {
      expect(drops.has(p.dropId), p.slug).toBe(true);
      expect(arts.has(p.artworkId), p.slug).toBe(true);
      expect(sups.has(p.supportId), p.slug).toBe(true);
    }
    for (const v of SEED.variants) expect(prods.has(v.productId), v.sku).toBe(true);
  });
  it('precios positivos en céntimos y stock entero', () => {
    for (const v of SEED.variants) {
      expect(Number.isSafeInteger(v.priceCents) && v.priceCents > 0, v.sku).toBe(true);
      expect(Number.isInteger(v.stock) && v.stock >= 0, v.sku).toBe(true);
    }
  });
  it('cada variante usa exactamente las opciones de su soporte', () => {
    for (const v of SEED.variants) {
      const p = SEED.products.find((x) => x.id === v.productId)!;
      const s = SEED.supports.find((x) => x.id === p.supportId)!;
      expect(Object.keys(v.options).sort(), v.sku).toEqual([...s.options].sort());
    }
  });
  it('todo producto tiene al menos una variante', () => {
    for (const p of SEED.products) expect(SEED.variants.some((v) => v.productId === p.id), p.slug).toBe(true);
  });
  it('hay artes de los tres tipos', () => {
    expect(new Set(SEED.artworks.map((a) => a.kind))).toEqual(new Set(['patron', 'textura', 'textil']));
  });
  it('los ids son UUID', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;
    for (const x of [...SEED.drops, ...SEED.artworks, ...SEED.supports, ...SEED.products, ...SEED.variants]) expect(re.test(x.id), x.id).toBe(true);
  });
});
