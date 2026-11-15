/*
 * Catálogo de SOAPBRXND, centrado en el arte:
 *   drop → arte (patrón, textura, textil) → producto = arte × soporte → variantes.
 * Reglas puras, sin E/S.
 */

export type ArtworkKind = 'patron' | 'textura' | 'textil';
export const ARTWORK_KINDS: readonly ArtworkKind[] = ['patron', 'textura', 'textil'];
export const ARTWORK_KIND_LABEL: Record<ArtworkKind, string> = {
  patron: 'Patrón de estampado',
  textura: 'Textura',
  textil: 'Textil',
};

/** Cómo se dibuja un arte (muestras SVG y sprites pixel). */
export type PatternSpec = {
  motif: 'checker' | 'stripes' | 'dots' | 'waves' | 'grain' | 'loops' | 'weave' | 'bubbles';
  colors: string[];
  scale?: number;
};

export type Drop = {
  id: string;
  slug: string;
  number: string;
  name: string;
  copy: string;
  draft: boolean;
  announceAt: string | null;
  keyOpensAt: string | null;
  opensAt: string | null;
  archivedAt: string | null;
};

export type Artwork = {
  id: string;
  slug: string;
  name: string;
  kind: ArtworkKind;
  story: string;
  pattern: PatternSpec;
};

export type SupportCategory = 'prenda' | 'arte' | 'textil' | 'accesorio';
export type Support = {
  id: string;
  slug: string;
  name: string;
  category: SupportCategory;
  /** Claves de opción de sus variantes, en orden (p. ej. ['talla']). */
  options: string[];
  /** Si Pompa lo puede vestir: hueco y forma del sprite. */
  wear: { slot: 'top' | 'head'; kind: 'hoodie' | 'tee' | 'beanie' | 'cap' } | null;
};

export type Product = {
  id: string;
  slug: string;
  dropId: string;
  artworkId: string;
  supportId: string;
  name: string;
  description: string;
  care: string;
  /** Color base para el pixel art de la sala. */
  color: string;
};

export type Variant = {
  id: string;
  productId: string;
  sku: string;
  options: Record<string, string>;
  priceCents: number;
  stock: number;
};

export type DropPhase = 'borrador' | 'anunciado' | 'llave' | 'abierto' | 'agotado' | 'archivo';

const reached = (iso: string | null, now: Date) => iso !== null && new Date(iso).getTime() <= now.getTime();

/** Fase de un drop en un instante. `soldOut`: no queda stock disponible en ninguna variante. */
export function dropPhase(drop: Drop, now: Date, soldOut: boolean): DropPhase {
  if (drop.draft) return 'borrador';
  if (reached(drop.archivedAt, now)) return 'archivo';
  if (reached(drop.opensAt, now)) return soldOut ? 'agotado' : 'abierto';
  if (reached(drop.keyOpensAt, now)) return 'llave';
  if (reached(drop.announceAt, now)) return 'anunciado';
  return 'borrador';
}

export const isPurchasable = (phase: DropPhase) => phase === 'abierto';
export const isVisible = (phase: DropPhase) => phase !== 'borrador';

export function available(stock: number, held: number): number {
  return Math.max(0, stock - held);
}

export function stockLabel(n: number): string {
  if (n <= 0) return 'AGOTADO';
  if (n <= 3) return `SOLO QUEDAN ${n}`;
  return 'EN STOCK';
}

/** «M» o «50×70 · Fine art». */
export function variantLabel(v: Pick<Variant, 'options'>, support: Pick<Support, 'options'>): string {
  return support.options.map((k) => v.options[k]).filter(Boolean).join(' · ');
}
