'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { getCatalog } from '@/modules/catalog/source';
import { paymentsEnabled, siteUrl } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';
import { checkoutSessionParams, type OrderSummary } from '@/modules/payments/stripe';
import { addToCart, isVariantId, setLineQuantity } from './cart';
import { readCart, writeCart } from './server';

export async function addToBag(formData: FormData): Promise<void> {
  const variantId = String(formData.get('variantId') ?? '');
  const back = String(formData.get('back') ?? '/');
  if (!isVariantId(variantId)) redirect(`${back}?error=talla`);
  const view = await getCatalog();
  const v = view.variant(variantId);
  const p = v && view.products().find((x) => x.id === v.productId);
  if (!v || !p || !view.purchasable(p) || v.available < 1) redirect(`${back}?error=agotado`);
  const r = addToCart(await readCart(), variantId);
  if (!r.ok) redirect(`/bolsa?error=${r.reason}`);
  await writeCart(r.lines);
  redirect('/bolsa');
}

export async function setBagQuantity(formData: FormData): Promise<void> {
  const variantId = String(formData.get('variantId') ?? '');
  const quantity = Number(formData.get('quantity'));
  if (isVariantId(variantId) && Number.isFinite(quantity)) {
    await writeCart(setLineQuantity(await readCart(), variantId, quantity));
  }
  redirect('/bolsa');
}

export type CheckoutState = { error: string | null };

const MESSAGES: Record<string, string> = {
  insufficient_stock: 'Alguien se ha llevado las últimas unidades de algo de tu bolsa. Revísala.',
  unavailable_variant: 'Algo de tu bolsa ya no está a la venta. Revísala.',
  invalid_contact: 'Revisa el nombre, el email y el teléfono.',
  invalid_address: 'Revisa la dirección y el código postal.',
  shipping_zone_unavailable: 'De momento solo enviamos a la península y a Baleares.',
  invalid_items: 'Tu bolsa está vacía.',
};

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!paymentsEnabled()) return { error: 'El pago no está activo todavía.' };
  const lines = await readCart();
  if (!lines.length) return { error: MESSAGES.invalid_items! };
  const requestId = String(formData.get('requestId') ?? '');
  const field = (k: string) => String(formData.get(k) ?? '').trim();
  let url: string | null = null;
  try {
    const order = await serviceRpc<OrderSummary>('checkout_create', {
      p_request_id: /^[0-9a-f-]{36}$/.test(requestId) ? requestId : randomUUID(),
      p_items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      p_contact: {
        full_name: field('full_name'), email: field('email'), phone: field('phone'),
        address_line1: field('address_line1'), address_line2: field('address_line2'),
        postal_code: field('postal_code'), city: field('city'), province: field('province'),
      },
      p_hold_minutes: 35,
    });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    if (order.stripe_session_id) {
      url = (await stripe.checkout.sessions.retrieve(order.stripe_session_id)).url;
    } else {
      const session = await stripe.checkout.sessions.create(checkoutSessionParams(order, siteUrl()), { idempotencyKey: `order-${order.order_id}` });
      await serviceRpc('checkout_attach_session', { p_order: order.order_id, p_session: session.id });
      url = session.url;
    }
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    const key = Object.keys(MESSAGES).find((k) => code.includes(k));
    if (!key) console.error('checkout', e);
    return { error: key ? MESSAGES[key]! : 'No hemos podido empezar el pago. Inténtalo de nuevo en un momento.' };
  }
  if (!url) return { error: 'La sesión de pago ha caducado. Vuelve a intentarlo.' };
  redirect(url);
}
