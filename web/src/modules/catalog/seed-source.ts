/* Modo demo: el catálogo sale de la semilla y el disponible es el stock. */
import { SEED } from '@/data/seed';
import type { CatalogData } from './view';

export function seedData(): CatalogData {
  return {
    drops: SEED.drops.map((d) => ({ ...d })),
    artworks: SEED.artworks.map((a) => ({ ...a })),
    supports: SEED.supports.map((s) => ({ ...s })),
    products: SEED.products.map((p) => ({ ...p })),
    variants: SEED.variants.map((v) => ({ ...v, available: v.stock })),
  };
}
