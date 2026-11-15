/* Lecturas de la bolsa en el servidor (cookie + catálogo actual). */
import { cookies } from 'next/headers';
import { CART_COOKIE, CART_MAX_AGE, cartCount, parseCart, serializeCart, type CartLine } from './cart';
import { quote } from './quote';
import { variantLabel } from '@/modules/catalog/domain';
import type { CatalogView } from '@/modules/catalog/view';

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  (await cookies()).set(CART_COOKIE, serializeCart(lines), {
    path: '/', sameSite: 'lax', maxAge: CART_MAX_AGE, httpOnly: false, secure: process.env.NODE_ENV === 'production',
  });
}

export async function readCartCount(): Promise<number> {
  return cartCount(await readCart());
}

/** La bolsa con nombres y precios de ahora; descarta lo que ya no existe. */
export function bagView(lines: CartLine[], view: CatalogView) {
  const known = lines.filter((l) => view.variant(l.variantId) && view.productBySlug(productOf(view, l.variantId)?.slug ?? ''));
  const variants = new Map(known.map((l) => [l.variantId, view.variant(l.variantId)!]));
  const q = quote(known, variants, null);
  return {
    ...q,
    lines: q.lines.map((l) => {
      const v = variants.get(l.variantId)!;
      const p = productOf(view, l.variantId)!;
      return { ...l, product: p, label: variantLabel(v, view.support(p.supportId)), available: v.available, purchasable: view.purchasable(p) };
    }),
  };
}

function productOf(view: CatalogView, variantId: string) {
  const v = view.variant(variantId);
  return v ? view.products().find((p) => p.id === v.productId) ?? null : null;
}
