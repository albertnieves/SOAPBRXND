/*
 * Base de datos de prueba: Postgres real en memoria (PGlite) con los roles de
 * Supabase, la migración y la semilla. Una base nueva por prueba.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { SEED } from '@/data/seed';
import { seedSql } from '@/data/seed-sql';

const MIGRATION = readFileSync(new URL('../../../supabase/migrations/20261115120000_tienda.sql', import.meta.url), 'utf8');

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`);
  await db.exec(MIGRATION);
  await db.exec(seedSql(SEED));
  // Fechas relativas a hoy: el drop 01 abierto, el 02 anunciado y el 03 con llave.
  await db.exec(`
    update public.drops set opens_at = now() - interval '1 day' where slug = 'first-signal';
    update public.drops set announce_at = now() - interval '1 day', opens_at = now() + interval '10 days' where slug = 'visual-pack-001';
    update public.drops set key_opens_at = now() - interval '1 day', opens_at = now() + interval '30 days' where slug = 'locked-drop';
  `);
  return db;
}

export async function as<T = Record<string, unknown>>(db: PGlite, role: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`set role ${role}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

export const CONTACT = {
  email: 'ana@example.com', full_name: 'Ana Pompa', phone: '600 000 000',
  address_line1: 'Calle del Jabón 1', postal_code: '28001', city: 'Madrid', province: 'Madrid',
};

export type Summary = {
  order_id: string; number: number; status: string; items_cents: number; shipping_cents: number;
  total_cents: number; reserved_until: string; email: string;
  lines: { variant_id: string; sku: string; product_name: string; variant_label: string; quantity: number; unit_cents: number }[];
};

export async function createOrder(db: PGlite, items: { variant_id: string; quantity: number }[], opts: { request?: string; contact?: object; hold?: number } = {}): Promise<Summary> {
  const rows = await as<{ r: Summary }>(db, 'service_role', 'select public.checkout_create($1::uuid, $2::jsonb, $3::jsonb, $4::int) as r', [
    opts.request ?? randomUUID(), JSON.stringify(items), JSON.stringify(opts.contact ?? CONTACT), opts.hold ?? 30,
  ]);
  return rows[0]!.r;
}

export async function availableOf(db: PGlite, variantId: string): Promise<number> {
  const rows = await as<{ available: number }>(db, 'anon', 'select available from public.catalog_variants where variant_id = $1', [variantId]);
  return rows[0]?.available ?? -1;
}

export async function stockOf(db: PGlite, variantId: string): Promise<number> {
  return (await db.query<{ stock: number }>('select stock from public.variants where id = $1', [variantId])).rows[0]!.stock;
}

export const variantId = (slug: string, option: string) => {
  const p = SEED.products.find((x) => x.slug === slug)!;
  return SEED.variants.find((v) => v.productId === p.id && Object.values(v.options)[0] === option)!.id;
};
