import { siteUrl } from '@/lib/env';
import { serviceRpc } from '@/lib/supabase-service';
import { notifyOrder } from '@/modules/mail/notify';
import { mailConfigured, sendMail } from '@/modules/mail/send';
import type { OrderSummary } from '@/modules/payments/stripe';
import { handleEvent, verifyEvent } from '@/modules/payments/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return new Response('missing signature', { status: 400 });
  let event;
  try {
    event = verifyEvent(await req.text(), signature, secret);
  } catch {
    return new Response('bad signature', { status: 400 });
  }
  // Si la base falla, devolvemos 500 y Stripe reintenta; las funciones son idempotentes.
  const r = await handleEvent(event, (fn, args) => serviceRpc(fn, args));
  const status = (r.result as { status?: string; order_id?: string } | undefined)?.status;
  if (status === 'needs_attention' || status === 'unknown_session') {
    // Hasta que haya panel y emails: que al menos quede en los logs de Vercel.
    console.error('stripe: pedido a revisar', event.id, JSON.stringify(r.result));
  }
  if (mailConfigured()) {
    await notifyOrder(r.result as { status?: string; order_id?: string } | undefined, {
      getOrder: (id) => serviceRpc<OrderSummary | null>('order_status', { p_order: id }),
      send: (mail) => sendMail(mail, { apiKey: process.env.RESEND_API_KEY!, from: process.env.EMAIL_FROM! }),
      baseUrl: siteUrl(),
      shopTo: process.env.ORDER_NOTIFY_EMAIL || null,
    });
  }
  return Response.json({ received: true, handled: r.handled });
}
