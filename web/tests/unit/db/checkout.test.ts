import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { SEED } from '@/data/seed';
import { seedSql } from '@/data/seed-sql';
import { as, availableOf, CONTACT, createOrder, freshDb, stockOf, variantId } from './pg';

const HOODIE_L = variantId('hoodie-ajedrez-lavanderia', 'L'); // stock 2, 65 €
const TEE_M = variantId('tee-pompa-repeat', 'M'); // stock 6, 35 €
const LAMINA_02 = variantId('lamina-sabana-tendida', 'A3'); // drop 02, aún no abierto
const HOODIE_03 = variantId('hoodie-pompa-repeat', 'M'); // drop 03, con llave

let db: PGlite;
beforeEach(async () => { db = await freshDb(); });

const pay = (event: string, session: string, amount: number) =>
  as<{ r: { status: string } }>(db, 'service_role', 'select public.checkout_confirm_paid($1, $2, $3, $4) as r', [event, session, amount, 'pi_test']).then((r) => r[0]!.r);
const attach = (order: string, session: string) =>
  as(db, 'service_role', 'select public.checkout_attach_session($1::uuid, $2)', [order, session]);
const orderStatus = async (id: string) => (await db.query<{ status: string }>('select status from public.orders where id = $1', [id])).rows[0]!.status;

describe('seed.sql', () => {
  it('el archivo versionado coincide con la semilla', () => {
    const file = readFileSync(new URL('../../../supabase/seed.sql', import.meta.url), 'utf8');
    expect(file).toBe(seedSql(SEED));
  });
});

describe('checkout_create', () => {
  it('reserva stock y calcula totales con envío de península', async () => {
    const before = await availableOf(db, TEE_M);
    const s = await createOrder(db, [{ variant_id: TEE_M, quantity: 2 }]);
    expect(s.status).toBe('pending');
    expect(s.items_cents).toBe(7000);
    expect(s.shipping_cents).toBe(490);
    expect(s.total_cents).toBe(7490);
    expect(s.lines[0]).toMatchObject({ quantity: 2, unit_cents: 3500, variant_label: 'M' });
    expect(await availableOf(db, TEE_M)).toBe(before - 2);
    expect(await stockOf(db, TEE_M)).toBe(6);
  });

  it('envío gratis desde 100 € y Baleares a 7,90', async () => {
    const free = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 1 }, { variant_id: TEE_M, quantity: 1 }]);
    expect(free.shipping_cents).toBe(0);
    const bal = await createOrder(db, [{ variant_id: TEE_M, quantity: 1 }], { contact: { ...CONTACT, postal_code: '07001', city: 'Palma' } });
    expect(bal.shipping_cents).toBe(790);
  });

  it('no vende más de lo disponible y no deja reservas a medias', async () => {
    await expect(createOrder(db, [{ variant_id: TEE_M, quantity: 1 }, { variant_id: HOODIE_L, quantity: 3 }])).rejects.toThrow('insufficient_stock');
    expect(await availableOf(db, TEE_M)).toBe(6);
    expect(await availableOf(db, HOODIE_L)).toBe(2);
  });

  it('las reservas vivas de otros pedidos cuentan', async () => {
    await createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }]);
    await expect(createOrder(db, [{ variant_id: HOODIE_L, quantity: 1 }])).rejects.toThrow('insufficient_stock');
  });

  it('mismo request_id: mismo pedido y una sola reserva', async () => {
    const req = randomUUID();
    const a = await createOrder(db, [{ variant_id: TEE_M, quantity: 1 }], { request: req });
    const b = await createOrder(db, [{ variant_id: TEE_M, quantity: 1 }], { request: req });
    expect(b.order_id).toBe(a.order_id);
    expect(await availableOf(db, TEE_M)).toBe(5);
  });

  it('no vende variantes de drops que no están abiertos', async () => {
    await expect(createOrder(db, [{ variant_id: LAMINA_02, quantity: 1 }])).rejects.toThrow('unavailable_variant');
    await expect(createOrder(db, [{ variant_id: HOODIE_03, quantity: 1 }])).rejects.toThrow('unavailable_variant');
  });

  it('rechaza contacto, dirección o zona inválidos', async () => {
    await expect(createOrder(db, [{ variant_id: TEE_M, quantity: 1 }], { contact: { ...CONTACT, email: 'no' } })).rejects.toThrow('invalid_contact');
    await expect(createOrder(db, [{ variant_id: TEE_M, quantity: 1 }], { contact: { ...CONTACT, postal_code: '35001' } })).rejects.toThrow('shipping_zone_unavailable');
    await expect(createOrder(db, [{ variant_id: TEE_M, quantity: 0 }])).rejects.toThrow('invalid_items');
  });
});

describe('pago con Stripe', () => {
  it('confirmar descuenta stock, borra reservas y es idempotente', async () => {
    const s = await createOrder(db, [{ variant_id: TEE_M, quantity: 2 }]);
    await attach(s.order_id, 'cs_test_1');
    expect((await pay('evt_1', 'cs_test_1', s.total_cents)).status).toBe('paid');
    expect(await orderStatus(s.order_id)).toBe('paid');
    expect(await stockOf(db, TEE_M)).toBe(4);
    expect(await availableOf(db, TEE_M)).toBe(4);
    expect((await pay('evt_1', 'cs_test_1', s.total_cents)).status).toBe('duplicate');
    expect(await stockOf(db, TEE_M)).toBe(4);
  });

  it('importe distinto: cobra el stock pero queda para revisar', async () => {
    const s = await createOrder(db, [{ variant_id: TEE_M, quantity: 1 }]);
    await attach(s.order_id, 'cs_test_2');
    expect((await pay('evt_2', 'cs_test_2', s.total_cents - 1)).status).toBe('needs_attention');
    expect(await orderStatus(s.order_id)).toBe('needs_attention');
    expect(await stockOf(db, TEE_M)).toBe(5);
  });

  it('caducar la sesión libera la reserva', async () => {
    const s = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }]);
    await attach(s.order_id, 'cs_test_3');
    await as(db, 'service_role', 'select public.checkout_expire($1, $2)', ['evt_3', 'cs_test_3']);
    expect(await orderStatus(s.order_id)).toBe('expired');
    expect(await availableOf(db, HOODIE_L)).toBe(2);
  });

  it('pago que llega tarde sin stock: para revisar, sin stock negativo', async () => {
    const s = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }]);
    await attach(s.order_id, 'cs_test_4');
    await as(db, 'service_role', 'select public.checkout_expire($1, $2)', ['evt_4a', 'cs_test_4']);
    const other = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }]);
    await attach(other.order_id, 'cs_test_5');
    await pay('evt_5', 'cs_test_5', other.total_cents);
    expect((await pay('evt_4b', 'cs_test_4', s.total_cents)).status).toBe('needs_attention');
    expect(await stockOf(db, HOODIE_L)).toBe(0);
  });

  it('checkout_release libera la reserva de un pedido abandonado y devuelve su sesión', async () => {
    const s = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }]);
    await attach(s.order_id, 'cs_test_r');
    const r = await as<{ r: { status: string; stripe_session_id: string } }>(db, 'service_role', 'select public.checkout_release($1::uuid) as r', [s.order_id]);
    expect(r[0]!.r).toMatchObject({ status: 'cancelled', stripe_session_id: 'cs_test_r' });
    expect(await availableOf(db, HOODIE_L)).toBe(2);
    await expect(createOrder(db, [{ variant_id: HOODIE_L, quantity: 2 }])).resolves.toMatchObject({ status: 'pending' });
  });

  it('un pago que llega sobre un pedido cancelado se cobra si queda stock', async () => {
    const s = await createOrder(db, [{ variant_id: TEE_M, quantity: 1 }]);
    await attach(s.order_id, 'cs_test_c');
    await as(db, 'service_role', 'select public.checkout_release($1::uuid)', [s.order_id]);
    expect((await pay('evt_c', 'cs_test_c', s.total_cents)).status).toBe('paid');
    expect(await stockOf(db, TEE_M)).toBe(5);
  });

  it('holds_release_expired libera reservas vencidas', async () => {
    const s = await createOrder(db, [{ variant_id: HOODIE_L, quantity: 1 }], { hold: 5 });
    await db.exec(`update public.holds set expires_at = now() - interval '1 minute'; update public.orders set reserved_until = now() - interval '1 minute'`);
    const released = await as<{ n: number }>(db, 'service_role', 'select public.holds_release_expired() as n');
    expect(released[0]!.n).toBe(1);
    expect(await orderStatus(s.order_id)).toBe('expired');
    expect(await availableOf(db, HOODIE_L)).toBe(2);
  });
});

describe('permisos', () => {
  it('anon lee el catálogo público sin borradores', async () => {
    const rows = await as<{ drop_slug: string }>(db, 'anon', 'select distinct drop_slug from public.catalog_variants');
    expect(rows.map((r) => r.drop_slug).sort()).toEqual(['first-signal', 'locked-drop', 'visual-pack-001']);
    const drops = await as<{ slug: string }>(db, 'anon', 'select slug from public.drops');
    expect(drops.map((d) => d.slug)).not.toContain('next-chapter');
  });
  it('anon no ve pedidos ni reservas ni puede crear pedidos', async () => {
    await expect(as(db, 'anon', 'select * from public.orders')).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', 'select * from public.holds')).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', `select public.checkout_create(gen_random_uuid(), '[]'::jsonb, '{}'::jsonb, 30)`)).rejects.toThrow(/permission denied/);
    await expect(as(db, 'authenticated', `select public.checkout_confirm_paid('e', 's', 1, 'p')`)).rejects.toThrow(/permission denied/);
  });
});
