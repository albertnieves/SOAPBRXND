/* Catálogo real: Supabase con la clave pública (RLS deja ver solo lo publicado). */
import { createClient } from '@supabase/supabase-js';
import type { Artwork, Drop, Product, Support } from './domain';
import type { CatalogData } from './view';

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

export async function supabaseData(url: string, anonKey: string): Promise<CatalogData> {
  const db = createClient(url, anonKey, { auth: { persistSession: false } });
  const read = async (table: string, columns = '*') => {
    const { data, error } = await db.from(table).select(columns);
    if (error) throw new Error(`catalog:${table}:${error.message}`);
    return (data ?? []) as unknown as Row[];
  };
  const [drops, artworks, supports, products, variants, catalog, images] = await Promise.all([
    read('drops'), read('artworks'), read('supports'), read('products'), read('variants'),
    read('catalog_variants', 'variant_id, available'), read('product_images', 'product_id, url, alt, position'),
  ]);
  const available = new Map(catalog.map((r) => [String(r.variant_id), Number(r.available)]));
  return {
    drops: drops.map((r): Drop => ({
      id: String(r.id), slug: String(r.slug), number: String(r.number), name: String(r.name), copy: String(r.copy ?? ''),
      draft: Boolean(r.draft), announceAt: s(r.announce_at), keyOpensAt: s(r.key_opens_at), opensAt: s(r.opens_at), archivedAt: s(r.archived_at),
    })),
    artworks: artworks.map((r): Artwork => ({
      id: String(r.id), slug: String(r.slug), name: String(r.name), kind: r.kind as Artwork['kind'], story: String(r.story ?? ''),
      pattern: r.pattern as Artwork['pattern'],
    })),
    supports: supports.map((r): Support => ({
      id: String(r.id), slug: String(r.slug), name: String(r.name), category: r.category as Support['category'],
      options: (r.options as string[]) ?? [], wear: (r.wear as Support['wear']) ?? null,
    })),
    products: products.map((r): Product => ({
      id: String(r.id), slug: String(r.slug), dropId: String(r.drop_id), artworkId: String(r.artwork_id), supportId: String(r.support_id),
      name: String(r.name), description: String(r.description ?? ''), care: String(r.care ?? ''), color: String(r.color ?? '#1a1a1e'),
      images: images.filter((i) => String(i.product_id) === String(r.id)).map((i) => ({ url: String(i.url), alt: String(i.alt ?? ''), position: Number(i.position ?? 0) })),
    })),
    variants: variants.filter((r) => available.has(String(r.id))).map((r) => ({
      id: String(r.id), productId: String(r.product_id), sku: String(r.sku), options: (r.options as Record<string, string>) ?? {},
      priceCents: Number(r.price_cents), stock: Number(r.stock), available: available.get(String(r.id)) ?? 0,
    })),
  };
}
