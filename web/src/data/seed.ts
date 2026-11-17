/*
 * Catálogo de ejemplo. Es la fuente del modo demo y de supabase/seed.sql
 * (scripts/seed-sql.ts). Precios y stock son placeholders.
 */
import type { Artwork, Drop, Product, Support, Variant } from '@/modules/catalog/domain';

/** UUID v4 determinista: tipo (1 drop, 2 arte, 3 soporte, 4 producto, 5 variante) + número. */
const id = (kind: number, n: number) => `${kind}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const drops: Drop[] = [
  { id: id(1, 1), slug: 'first-signal', number: '01', name: 'FIRST SIGNAL', draft: false,
    copy: 'El primer lavado. Patrones de la lavandería sobre las piezas base de la marca.',
    announceAt: '2026-10-01T10:00:00Z', keyOpensAt: null, opensAt: '2026-11-01T19:00:00Z', archivedAt: null },
  { id: id(1, 2), slug: 'visual-pack-001', number: '02', name: 'VISUAL PACK 001', draft: false,
    copy: 'Texturas y textiles para colgar o para coser. Se abre cuando termine el centrifugado.',
    announceAt: '2026-11-01T10:00:00Z', keyOpensAt: null, opensAt: '2026-12-12T19:00:00Z', archivedAt: null },
  { id: id(1, 3), slug: 'locked-drop', number: '03', name: 'LOCKED DROP', draft: false,
    copy: 'Solo con llave. Las llaves se reparten antes de cada drop, a quien esté dentro.',
    announceAt: '2026-11-10T10:00:00Z', keyOpensAt: '2026-11-10T10:00:00Z', opensAt: '2027-01-20T19:00:00Z', archivedAt: null },
  { id: id(1, 4), slug: 'next-chapter', number: '04', name: 'NEXT CHAPTER', draft: true,
    copy: 'Todavía en el tambor.', announceAt: null, keyOpensAt: null, opensAt: null, archivedAt: null },
];

const artworks: Artwork[] = [
  { id: id(2, 1), slug: 'ajedrez-lavanderia', name: 'Ajedrez Lavandería', kind: 'patron',
    story: 'El suelo de la lavandería convertido en repetición. Cuadros de 1 cm, negro y crema.',
    pattern: { motif: 'checker', colors: ['#1a1a1e', '#ebe5d9'], scale: 8 } },
  { id: id(2, 2), slug: 'pompa-repeat', name: 'Pompa Repeat', kind: 'patron',
    story: 'Pompas iridiscentes en repetición continua: el patrón de Pompa.',
    pattern: { motif: 'bubbles', colors: ['#e8e0d0', '#9be7ff', '#c9a7ff', '#ffb3d9'], scale: 22 } },
  { id: id(2, 3), slug: 'espuma', name: 'Espuma', kind: 'textura',
    story: 'Textura de espuma de jabón escaneada a 1200 ppp y llevada a dos tintas.',
    pattern: { motif: 'dots', colors: ['#f2f0eb', '#cfdcea'], scale: 6 } },
  { id: id(2, 4), slug: 'ruido-centrifugado', name: 'Ruido Centrifugado', kind: 'textura',
    story: 'La vibración de una lavadora a 1400 rpm, dibujada en ondas.',
    pattern: { motif: 'waves', colors: ['#1a1a1e', '#c9a7ff'], scale: 12 } },
  { id: id(2, 5), slug: 'toalla-rizo', name: 'Toalla Rizo', kind: 'textil',
    story: 'Rizo americano de toalla de baño, tejido en algodón peinado.',
    pattern: { motif: 'loops', colors: ['#e8e0d0', '#c9b99a'], scale: 6 } },
  { id: id(2, 6), slug: 'sabana-tendida', name: 'Sábana Tendida', kind: 'textil',
    story: 'Raya de sábana de hotel, tejida en tafetán de algodón.',
    pattern: { motif: 'stripes', colors: ['#f2f0eb', '#9be7ff'], scale: 10 } },
];

const supports: Support[] = [
  { id: id(3, 1), slug: 'hoodie', name: 'Hoodie', category: 'prenda', options: ['talla'], wear: { slot: 'top', kind: 'hoodie' } },
  { id: id(3, 2), slug: 'tee', name: 'Camiseta', category: 'prenda', options: ['talla'], wear: { slot: 'top', kind: 'tee' } },
  { id: id(3, 3), slug: 'gorro', name: 'Gorro', category: 'accesorio', options: ['talla'], wear: { slot: 'head', kind: 'beanie' } },
  { id: id(3, 4), slug: 'lamina', name: 'Lámina', category: 'arte', options: ['medida', 'papel'], wear: null },
  { id: id(3, 5), slug: 'tela-metro', name: 'Tela por metro', category: 'textil', options: ['tejido', 'largo'], wear: null },
  { id: id(3, 6), slug: 'panuelo', name: 'Pañuelo', category: 'accesorio', options: ['medida'], wear: null },
];

type P = Omit<Product, 'id'>;
const productList: P[] = [
  { slug: 'hoodie-ajedrez-lavanderia', dropId: id(1, 1), artworkId: id(2, 1), supportId: id(3, 1), name: 'Hoodie Ajedrez Lavandería', color: '#1a1a1e',
    description: 'Algodón grueso 400 g, corte boxy. Patrón Ajedrez Lavandería estampado en serigrafía en la espalda.', care: 'Lavar del revés a 30 °C. No usar secadora.' },
  { slug: 'tee-pompa-repeat', dropId: id(1, 1), artworkId: id(2, 2), supportId: id(3, 2), name: 'Tee Pompa Repeat', color: '#e8e0d0',
    description: 'Camiseta 240 g lavada a la piedra con el patrón Pompa Repeat a todo el cuerpo.', care: 'Lavar del revés a 30 °C.' },
  { slug: 'gorro-espuma', dropId: id(1, 1), artworkId: id(2, 3), supportId: id(3, 3), name: 'Gorro Espuma', color: '#b9a3f5',
    description: 'Punto acanalado con pompón y la textura Espuma tejida en jacquard.', care: 'Lavar a mano en frío.' },
  { slug: 'lamina-ruido-centrifugado', dropId: id(1, 1), artworkId: id(2, 4), supportId: id(3, 4), name: 'Lámina Ruido Centrifugado', color: '#1a1a1e',
    description: 'Impresión giclée sobre papel de algodón 310 g. Edición firmada.', care: 'Enmarcar lejos de la luz directa.' },
  { slug: 'tela-toalla-rizo', dropId: id(1, 1), artworkId: id(2, 5), supportId: id(3, 5), name: 'Tela Toalla Rizo', color: '#e8e0d0',
    description: 'Rizo de algodón peinado de 150 cm de ancho, cortado a medida.', care: 'Lavar a 40 °C. Encoge un 3 %.' },
  { slug: 'panuelo-ajedrez-lavanderia', dropId: id(1, 1), artworkId: id(2, 1), supportId: id(3, 6), name: 'Pañuelo Ajedrez Lavandería', color: '#ebe5d9',
    description: 'Twill de seda con el patrón Ajedrez y dobladillo a mano.', care: 'Limpieza en seco.' },
  { slug: 'lamina-sabana-tendida', dropId: id(1, 2), artworkId: id(2, 6), supportId: id(3, 4), name: 'Lámina Sábana Tendida', color: '#f2f0eb',
    description: 'Impresión giclée sobre papel de algodón 310 g.', care: 'Enmarcar lejos de la luz directa.' },
  { slug: 'tela-sabana-tendida', dropId: id(1, 2), artworkId: id(2, 6), supportId: id(3, 5), name: 'Tela Sábana Tendida', color: '#f2f0eb',
    description: 'Tafetán de algodón de 150 cm de ancho con la raya Sábana Tendida.', care: 'Lavar a 40 °C.' },
  { slug: 'hoodie-pompa-repeat', dropId: id(1, 3), artworkId: id(2, 2), supportId: id(3, 1), name: 'Hoodie Pompa Repeat', color: '#2a2a30',
    description: 'La hoodie del drop con llave, con Pompa Repeat bordado.', care: 'Lavar del revés a 30 °C.' },
];
const products: Product[] = productList.map((p, i) => ({ id: id(4, i + 1), ...p }));

const bySlug = (slug: string) => products.find((p) => p.slug === slug)!.id;
type V = [product: string, options: Record<string, string>, priceCents: number, stock: number];
const variantList: V[] = [
  ['hoodie-ajedrez-lavanderia', { talla: 'S' }, 6500, 3],
  ['hoodie-ajedrez-lavanderia', { talla: 'M' }, 6500, 5],
  ['hoodie-ajedrez-lavanderia', { talla: 'L' }, 6500, 2],
  ['hoodie-ajedrez-lavanderia', { talla: 'XL' }, 6500, 0],
  ['tee-pompa-repeat', { talla: 'S' }, 3500, 8],
  ['tee-pompa-repeat', { talla: 'M' }, 3500, 6],
  ['tee-pompa-repeat', { talla: 'L' }, 3500, 1],
  ['tee-pompa-repeat', { talla: 'XL' }, 3500, 4],
  ['gorro-espuma', { talla: 'ÚNICA' }, 2500, 7],
  ['lamina-ruido-centrifugado', { medida: 'A3', papel: 'Algodón 310 g' }, 3500, 10],
  ['lamina-ruido-centrifugado', { medida: '50×70', papel: 'Algodón 310 g' }, 6500, 5],
  ['tela-toalla-rizo', { tejido: 'Rizo algodón', largo: '1 m' }, 2800, 20],
  ['tela-toalla-rizo', { tejido: 'Rizo algodón', largo: '3 m' }, 7900, 6],
  ['panuelo-ajedrez-lavanderia', { medida: '55×55' }, 4500, 0],
  ['lamina-sabana-tendida', { medida: 'A3', papel: 'Algodón 310 g' }, 3500, 15],
  ['tela-sabana-tendida', { tejido: 'Tafetán algodón', largo: '1 m' }, 2600, 30],
  ['hoodie-pompa-repeat', { talla: 'S' }, 7000, 5],
  ['hoodie-pompa-repeat', { talla: 'M' }, 7000, 5],
  ['hoodie-pompa-repeat', { talla: 'L' }, 7000, 5],
];
const variants: Variant[] = variantList.map(([slug, options, priceCents, stock], i) => ({
  id: id(5, i + 1),
  productId: bySlug(slug),
  sku: `SBX-${slug.toUpperCase().split('-').map((w) => w.slice(0, 3)).join('')}-${Object.values(options).join('-').toUpperCase().replace(/[^A-Z0-9Ñ×-]/g, '')}`,
  options,
  priceCents,
  stock,
}));

export const SEED = { drops, artworks, supports, products, variants };
export type Seed = typeof SEED;
