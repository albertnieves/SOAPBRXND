/* Convierte la semilla en SQL para supabase/seed.sql (y para las pruebas). */
import type { Seed } from './seed';

const q = (s: string | null) => (s === null ? 'null' : `'${s.replace(/'/g, "''")}'`);
const j = (o: unknown) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (xs: string[]) => `array[${xs.map(q).join(', ')}]::text[]`;
const row = (cols: string[]) => `  (${cols.join(', ')})`;

export function seedSql(seed: Seed): string {
  const out: string[] = ['-- Generado por scripts/seed-sql.ts desde src/data/seed.ts. No editar a mano.', ''];
  out.push('insert into public.drops (id, slug, number, name, copy, draft, announce_at, key_opens_at, opens_at, archived_at) values');
  out.push(seed.drops.map((d) => row([q(d.id), q(d.slug), q(d.number), q(d.name), q(d.copy), String(d.draft), q(d.announceAt), q(d.keyOpensAt), q(d.opensAt), q(d.archivedAt)])).join(',\n') + ';', '');
  out.push('insert into public.artworks (id, slug, name, kind, story, pattern) values');
  out.push(seed.artworks.map((a) => row([q(a.id), q(a.slug), q(a.name), q(a.kind), q(a.story), j(a.pattern)])).join(',\n') + ';', '');
  out.push('insert into public.supports (id, slug, name, category, options, wear) values');
  out.push(seed.supports.map((s) => row([q(s.id), q(s.slug), q(s.name), q(s.category), arr(s.options), s.wear ? j(s.wear) : 'null'])).join(',\n') + ';', '');
  out.push('insert into public.products (id, slug, drop_id, artwork_id, support_id, name, description, care, color) values');
  out.push(seed.products.map((p) => row([q(p.id), q(p.slug), q(p.dropId), q(p.artworkId), q(p.supportId), q(p.name), q(p.description), q(p.care), q(p.color)])).join(',\n') + ';', '');
  out.push('insert into public.variants (id, product_id, sku, options, price_cents, stock) values');
  out.push(seed.variants.map((v) => row([q(v.id), q(v.productId), q(v.sku), j(v.options), String(v.priceCents), String(v.stock)])).join(',\n') + ';', '');
  return out.join('\n');
}
