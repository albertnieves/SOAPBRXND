import { describe, expect, it } from 'vitest';
import { CART_COOKIE, addToCart, parseCart, serializeCart, setLineQuantity } from '@/modules/checkout/cart';
import { quote, shippingZone, SHIPPING_RATES } from '@/modules/checkout/quote';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('bolsa en cookie', () => {
  it('se llama sbx_bolsa', () => expect(CART_COOKIE).toBe('sbx_bolsa'));
  it('ida y vuelta', () => {
    const lines = [{ variantId: A, quantity: 2 }, { variantId: B, quantity: 1 }];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });
  it('ignora basura y suma duplicados', () => {
    expect(parseCart(`basura.${A}:1.${A}:2.${B}:-3.${B}:x`)).toEqual([{ variantId: A, quantity: 3 }]);
  });
  it('máximo 10 por línea', () => {
    const r = addToCart([{ variantId: A, quantity: 10 }], A);
    expect(r).toEqual({ ok: false, reason: 'max_quantity' });
    expect(parseCart(`${A}:99`)).toEqual([{ variantId: A, quantity: 10 }]);
  });
  it('máximo 20 líneas', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ variantId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, quantity: 1 }));
    expect(addToCart(many, A)).toEqual({ ok: false, reason: 'full' });
  });
  it('cantidad 0 quita la línea', () => {
    expect(setLineQuantity([{ variantId: A, quantity: 2 }], A, 0)).toEqual([]);
  });
});

describe('zonas de envío', () => {
  it('península, Baleares y fuera de zona', () => {
    expect(shippingZone('28001')).toBe('peninsula');
    expect(shippingZone('07001')).toBe('baleares');
    expect(shippingZone('35001')).toBeNull();
    expect(shippingZone('99999')).toBeNull();
  });
});

describe('presupuesto', () => {
  const variants = new Map([[A, { priceCents: 6500 }], [B, { priceCents: 2000 }]]);
  it('suma líneas y envío de península', () => {
    const q = quote([{ variantId: A, quantity: 1 }], variants, 'peninsula');
    expect(q).toMatchObject({ itemsCents: 6500, shippingCents: SHIPPING_RATES.peninsula.priceCents, totalCents: 6500 + 490 });
  });
  it('envío gratis en península desde 100 €', () => {
    const q = quote([{ variantId: A, quantity: 1 }, { variantId: B, quantity: 2 }], variants, 'peninsula');
    expect(q.itemsCents).toBe(10500);
    expect(q.shippingCents).toBe(0);
  });
  it('Baleares paga envío siempre', () => {
    const q = quote([{ variantId: A, quantity: 2 }], variants, 'baleares');
    expect(q.shippingCents).toBe(790);
  });
  it('sin zona todavía no hay envío calculado', () => {
    const q = quote([{ variantId: B, quantity: 1 }], variants, null);
    expect(q.shippingCents).toBeNull();
    expect(q.totalCents).toBe(2000);
  });
  it('variante desconocida', () => {
    expect(() => quote([{ variantId: '33333333-3333-4333-8333-333333333333', quantity: 1 }], variants, null)).toThrow('unavailable_variant');
  });
});
