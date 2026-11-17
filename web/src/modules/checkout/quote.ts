/*
 * Zonas y presupuesto de la bolsa. La base repite estas reglas al crear el
 * pedido (private.shipping_cents en la migración): lo que se cobra lo decide
 * ella; esto solo sirve para enseñar el total antes de pagar.
 */
import type { CartLine } from './cart';

export type ShippingZone = 'peninsula' | 'baleares';

export const SHIPPING_RATES: Record<ShippingZone, { label: string; priceCents: number; freeFromCents: number | null }> = {
  peninsula: { label: 'Península', priceCents: 490, freeFromCents: 10000 },
  baleares: { label: 'Illes Balears', priceCents: 790, freeFromCents: null },
};

const POSTAL_CODE = /^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/;
/** Canarias (35, 38), Ceuta (51) y Melilla (52): IGIC y aduana. */
const OUTSIDE = new Set(['35', '38', '51', '52']);

/** Zona de un código postal español, o null si no se envía allí. (De L'Atelier.) */
export function shippingZone(postalCode: string): ShippingZone | null {
  const code = postalCode.trim();
  if (!POSTAL_CODE.test(code)) return null;
  const province = code.slice(0, 2);
  if (province === '07') return 'baleares';
  if (OUTSIDE.has(province)) return null;
  return 'peninsula';
}

export function shippingCents(zone: ShippingZone, itemsCents: number): number {
  const rate = SHIPPING_RATES[zone];
  return rate.freeFromCents !== null && itemsCents >= rate.freeFromCents ? 0 : rate.priceCents;
}

export type Quote = {
  lines: { variantId: string; quantity: number; unitCents: number; lineCents: number }[];
  itemsCents: number;
  shippingCents: number | null;
  totalCents: number;
};

export function quote(
  lines: readonly CartLine[],
  variants: ReadonlyMap<string, { priceCents: number }>,
  zone: ShippingZone | null,
): Quote {
  const priced = lines.map((l) => {
    const v = variants.get(l.variantId);
    if (!v) throw new Error('unavailable_variant');
    return { ...l, unitCents: v.priceCents, lineCents: v.priceCents * l.quantity };
  });
  const itemsCents = priced.reduce((s, l) => s + l.lineCents, 0);
  const ship = zone ? shippingCents(zone, itemsCents) : null;
  return { lines: priced, itemsCents, shippingCents: ship, totalCents: itemsCents + (ship ?? 0) };
}
