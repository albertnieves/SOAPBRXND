/* Añadir a la bolsa desde la lavandería (sin salir de la sala). Mismas reglas que la ficha. */
import { getCatalog } from '@/modules/catalog/source';
import { addToCart, cartCount, isVariantId } from '@/modules/checkout/cart';
import { readCart, writeCart } from '@/modules/checkout/server';

export const dynamic = 'force-dynamic';

export type BagReply = { ok: true; count: number } | { ok: false; reason: 'invalid' | 'agotado' | 'full' | 'max_quantity' };
const reply = (body: BagReply, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  // Solo JSON: un formulario de otro sitio no puede mandarlo sin preflight.
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return reply({ ok: false, reason: 'invalid' }, 415);
  const body: unknown = await request.json().catch(() => null);
  const variantId = body && typeof body === 'object' ? (body as { variantId?: unknown }).variantId : null;
  if (!isVariantId(variantId)) return reply({ ok: false, reason: 'invalid' }, 400);
  const view = await getCatalog();
  const v = view.variant(variantId);
  const p = v && view.products().find((x) => x.id === v.productId);
  if (!v || !p || !view.purchasable(p) || v.available < 1) return reply({ ok: false, reason: 'agotado' }, 409);
  const r = addToCart(await readCart(), variantId);
  if (!r.ok) return reply({ ok: false, reason: r.reason }, 409);
  await writeCart(r.lines);
  return reply({ ok: true, count: cartCount(r.lines) });
}
