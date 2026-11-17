/* Correos de un pedido: confirmación al cliente y aviso a la tienda. Texto y HTML. */
import { formatEuros } from '@/lib/money';
import type { OrderSummary } from '@/modules/payments/stripe';

export type Mail = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const lineText = (l: OrderSummary['lines'][number]) => `${l.quantity} × ${l.product_name}${l.variant_label ? ` · ${l.variant_label}` : ''} — ${formatEuros(l.unit_cents * l.quantity)}`;

function body(order: OrderSummary, intro: string, link: string | null) {
  const shipping = order.shipping_cents ? formatEuros(order.shipping_cents) : 'gratis';
  const text = [
    intro, '',
    ...order.lines.map(lineText), '',
    `Envío: ${shipping}`,
    `Total: ${formatEuros(order.total_cents)}`,
    ...(link ? ['', `Sigue tu pedido: ${link}`] : []),
    '', 'SOAPBRXND · Lavandería de drops',
  ].join('\n');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#ece8df;font-family:Helvetica,Arial,sans-serif;color:#17171b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid #17171b">
<tr><td style="background:#17171b;color:#ece8df;padding:14px 20px;font-family:'Courier New',monospace;font-weight:bold;letter-spacing:2px">SOAPBRXND</td></tr>
<tr><td style="padding:20px">
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${esc(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:'Courier New',monospace;font-size:14px;border-top:1px dashed #17171b">
${order.lines.map((l) => `<tr><td style="padding:8px 0;border-bottom:1px dashed #c9c3b6">${l.quantity} × ${esc(l.product_name)}${l.variant_label ? ` · ${esc(l.variant_label)}` : ''}</td><td align="right" style="padding:8px 0;border-bottom:1px dashed #c9c3b6;white-space:nowrap">${formatEuros(l.unit_cents * l.quantity)}</td></tr>`).join('\n')}
<tr><td style="padding:8px 0">Envío</td><td align="right" style="padding:8px 0">${shipping}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold;border-top:2px solid #17171b">Total (IVA incl.)</td><td align="right" style="padding:8px 0;font-weight:bold;border-top:2px solid #17171b">${formatEuros(order.total_cents)}</td></tr>
</table>
${link ? `<p style="margin:20px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#17171b;color:#ece8df;padding:12px 18px;text-decoration:none;font-weight:bold">Ver mi pedido</a></p>` : ''}
</td></tr></table>
<p style="font-size:12px;color:#6b665c;margin:14px 0 0">SOAPBRXND · Lavandería de drops</p>
</td></tr></table></body></html>`;
  return { text, html };
}

export function orderEmail(order: OrderSummary, baseUrl: string): Mail {
  const review = order.status === 'needs_attention';
  const intro = review
    ? `Hemos recibido tu pago del pedido nº ${order.number}, pero necesitamos revisarlo antes de prepararlo. Te escribimos en menos de 24 horas.`
    : `Gracias. Tu pedido nº ${order.number} está pagado y ya lo estamos preparando.`;
  return {
    subject: review ? `Pedido nº ${order.number}: lo estamos revisando · SOAPBRXND` : `Pedido nº ${order.number} confirmado · SOAPBRXND`,
    ...body(order, intro, `${baseUrl}/pedido?id=${order.order_id}`),
  };
}

export function shopEmail(order: OrderSummary): Mail {
  const review = order.status === 'needs_attention';
  const intro = review
    ? `El pedido nº ${order.number} (${order.email}) está cobrado pero necesita revisión: el importe no cuadra o ya no había stock. Revísalo en Stripe y Supabase.`
    : `Nuevo pedido nº ${order.number} de ${order.email}.`;
  return { subject: `${review ? 'REVISAR' : 'Nuevo'} pedido nº ${order.number} — ${formatEuros(order.total_cents)}`, ...body(order, intro, null) };
}
