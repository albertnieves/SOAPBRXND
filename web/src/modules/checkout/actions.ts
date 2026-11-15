'use server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { getCatalog } from '@/modules/catalog/source';
import { paymentsEnabled, siteUrl } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';
import { checkoutSessionParams } from '@/modules/payments/stripe';
import { addToCart, isVariantId, PENDING_COOKIE, safeBack, setLineQuantity } from './cart';
import { prepareOrder } from './flow';
import { readCart, writeCart } from './server';

export async function addToBag(formData: FormData): Promise<void> {
  const variantId = String(formData.get('variantId') ?? '');
  const back = safeBack(formData.get('back'));
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
  too_many_pending: 'Tienes varios pagos a medias con este email. Termina uno o espera unos minutos.',
};

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!paymentsEnabled()) return { error: 'El pago no está activo todavía.' };
  const lines = await readCart();
  if (!lines.length) return { error: MESSAGES.invalid_items! };
  const rawRequest = String(formData.get('requestId') ?? '');
  const requestId = isVariantId(rawRequest) ? rawRequest : randomUUID();
  const field = (k: string) => String(formData.get(k) ?? '').trim();
  const jar = await cookies();
  const [prevOrder, prevRequest] = (jar.get(PENDING_COOKIE)?.value ?? '').split(':');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let url: string | null = null;
  let doneId: string | null = null;
  try {
    const r = await prepareOrder({
      previous: prevOrder && prevRequest && isVariantId(prevOrder) ? { orderId: prevOrder, requestId: prevRequest } : null,
      requestId,
      items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      contact: {
        full_name: field('full_name'), email: field('email'), phone: field('phone'),
        address_line1: field('address_line1'), address_line2: field('address_line2'),
        postal_code: field('postal_code'), city: field('city'), province: field('province'),
      },
    }, {
      rpc: (fn, args) => serviceRpc(fn, args),
      sessionStatus: async (id) => { const st = (await stripe.checkout.sessions.retrieve(id)).status; return st === 'open' ? 'open' : st === 'complete' ? 'complete' : 'expired'; },
      expireSession: async (id) => { await stripe.checkout.sessions.expire(id); },
      newRequestId: () => randomUUID(),
      now: () => new Date(),
    });
    if (r.kind === 'done') {
      doneId = r.orderId;
    } else {
      const order = r.order;
      jar.set(PENDING_COOKIE, `${order.order_id}:${requestId}`, { path: '/', sameSite: 'lax', httpOnly: true, maxAge: 60 * 60 * 24, secure: process.env.NODE_ENV === 'production' });
      if (order.stripe_session_id) {
        const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        if (session.status === 'open') url = session.url;
        else doneId = order.order_id;
      } else {
        const session = await stripe.checkout.sessions.create(checkoutSessionParams(order, siteUrl()), { idempotencyKey: `order-${order.order_id}` });
        await serviceRpc('checkout_attach_session', { p_order: order.order_id, p_session: session.id });
        url = session.url;
      }
    }
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    const key = Object.keys(MESSAGES).find((k) => code.includes(k));
    if (!key) console.error('checkout', e);
    return { error: key ? MESSAGES[key]! : 'No hemos podido empezar el pago. Inténtalo de nuevo en un momento.' };
  }
  if (doneId) redirect(`/pedido?id=${doneId}`);
  if (!url) return { error: 'La sesión de pago ha caducado. Vuelve a intentarlo.' };
  redirect(url);
}
