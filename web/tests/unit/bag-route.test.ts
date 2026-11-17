/* POST /api/bolsa: añadir desde la lavandería con las mismas reglas que la ficha. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogView } from '@/modules/catalog/view';
import { seedData } from '@/modules/catalog/seed-source';
import { CART_COOKIE, MAX_CART_LINES, MAX_LINE_QUANTITY, parseCart, serializeCart } from '@/modules/checkout/cart';

const NOW = new Date('2026-11-15T12:00:00Z');

// Cookie de la bolsa en memoria y catálogo que cada prueba puede tocar.
const state = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  writes: 0,
  data: null as unknown,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => { state.jar.set(name, value); state.writes++; },
  }),
}));

vi.mock('@/modules/catalog/source', () => ({
  getCatalog: async () => new CatalogView(state.data as ReturnType<typeof seedData>, NOW),
}));

const { POST } = await import('@/app/api/bolsa/route');

const post = (body: unknown, contentType = 'application/json') =>
  POST(new Request('http://localhost/api/bolsa', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));

const data = () => state.data as ReturnType<typeof seedData>;
const productId = (slug: string) => data().products.find((p) => p.slug === slug)!.id;
const variantOf = (slug: string, i = 0) => data().variants.filter((v) => v.productId === productId(slug))[i]!;
const bag = () => parseCart(state.jar.get(CART_COOKIE));

beforeEach(() => {
  state.jar.clear();
  state.writes = 0;
  state.data = seedData();
});

describe('POST /api/bolsa', () => {
  it('añade una unidad y devuelve cuántas hay en la bolsa', async () => {
    const id = variantOf('tee-pompa-repeat').id;
    const res = await post({ variantId: id });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ ok: true, count: 1 });
    expect(bag()).toEqual([{ variantId: id, quantity: 1 }]);
  });

  it('suma a lo que ya había en la cookie', async () => {
    const a = variantOf('tee-pompa-repeat', 0).id;
    const b = variantOf('tee-pompa-repeat', 1).id;
    state.jar.set(CART_COOKIE, serializeCart([{ variantId: a, quantity: 2 }]));
    expect(await (await post({ variantId: a })).json()).toEqual({ ok: true, count: 3 });
    expect(await (await post({ variantId: b })).json()).toEqual({ ok: true, count: 4 });
    expect(bag()).toEqual([{ variantId: a, quantity: 3 }, { variantId: b, quantity: 1 }]);
  });

  it('acepta JSON con charset', async () => {
    const res = await post({ variantId: variantOf('tee-pompa-repeat').id }, 'application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  it('rechaza lo que no es JSON (415) sin tocar la bolsa', async () => {
    const res = await post(`variantId=${variantOf('tee-pompa-repeat').id}`, 'application/x-www-form-urlencoded');
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ ok: false, reason: 'invalid' });
    expect(state.writes).toBe(0);
  });

  it.each([
    ['JSON roto', '{'],
    ['sin variante', {}],
    ['variante que no es un id', { variantId: 'nada' }],
    ['variante de otro tipo', { variantId: 42 }],
    ['cuerpo que no es un objeto', 'null'],
  ])('rechaza %s (400)', async (_, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: 'invalid' });
    expect(state.writes).toBe(0);
  });

  it('una variante que no está en el catálogo cuenta como agotada (409)', async () => {
    const res = await post({ variantId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'agotado' });
    expect(state.writes).toBe(0);
  });

  it('no vende piezas de un drop que no está abierto', async () => {
    const res = await post({ variantId: variantOf('lamina-sabana-tendida').id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'agotado' });
  });

  it('no vende piezas sin stock', async () => {
    const res = await post({ variantId: variantOf('panuelo-ajedrez-lavanderia').id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'agotado' });
  });

  it('no vende una talla agotada aunque queden otras', async () => {
    const v = variantOf('tee-pompa-repeat', 1);
    v.available = 0;
    const res = await post({ variantId: v.id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'agotado' });
    expect((await post({ variantId: variantOf('tee-pompa-repeat', 0).id })).status).toBe(200);
  });

  it('respeta el tope de unidades por variante', async () => {
    const id = variantOf('tee-pompa-repeat').id;
    state.jar.set(CART_COOKIE, serializeCart([{ variantId: id, quantity: MAX_LINE_QUANTITY }]));
    const res = await post({ variantId: id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'max_quantity' });
    expect(state.writes).toBe(0);
  });

  it('respeta el tope de líneas de la bolsa', async () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      variantId: `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`, quantity: 1,
    }));
    state.jar.set(CART_COOKIE, serializeCart(full));
    const res = await post({ variantId: variantOf('tee-pompa-repeat').id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'full' });
    expect(state.writes).toBe(0);
  });
});
