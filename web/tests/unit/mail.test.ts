import { describe, expect, it } from 'vitest';
import { orderEmail, shopEmail } from '@/modules/mail/order-email';
import { sendMail } from '@/modules/mail/send';
import { notifyOrder } from '@/modules/mail/notify';

const order = {
  order_id: '9b2f4c1e-0000-4000-8000-000000000001', number: 42, status: 'paid',
  items_cents: 7000, shipping_cents: 490, total_cents: 7490, email: 'ana@example.com', reserved_until: '2026-11-15T12:45:00Z',
  lines: [{ variant_id: 'v', sku: 'SBX-TEE-M', product_name: 'Tee <Pompa> Repeat', variant_label: 'M', quantity: 2, unit_cents: 3500 }],
};

describe('email de pedido', () => {
  const m = orderEmail(order, 'https://soapbrxnd.test');
  it('asunto con el número de pedido', () => expect(m.subject).toBe('Pedido nº 42 confirmado · SOAPBRXND'));
  it('lleva líneas, envío, total y enlace al pedido', () => {
    expect(m.text).toContain('2 × Tee <Pompa> Repeat · M — 70 €');
    expect(m.text).toContain('Envío: 4,90 €');
    expect(m.text).toContain('Total: 74,90 €');
    expect(m.text).toContain(`https://soapbrxnd.test/pedido?id=${order.order_id}`);
  });
  it('escapa el HTML de los nombres', () => {
    expect(m.html).toContain('Tee &lt;Pompa&gt; Repeat');
    expect(m.html).not.toContain('<Pompa>');
  });
  it('si el pedido queda en revisión, lo dice en vez de confirmarlo', () => {
    const r = orderEmail({ ...order, status: 'needs_attention' }, 'https://soapbrxnd.test');
    expect(r.subject).toBe('Pedido nº 42: lo estamos revisando · SOAPBRXND');
  });
  it('aviso a la tienda', () => {
    expect(shopEmail(order).subject).toBe('Nuevo pedido nº 42 — 74,90 €');
    expect(shopEmail({ ...order, status: 'needs_attention' }).subject).toBe('REVISAR pedido nº 42 — 74,90 €');
  });
});

describe('sendMail', () => {
  it('llama a Resend con la clave y el remitente', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), init: init! }); return new Response('{"id":"x"}', { status: 200 }); };
    await sendMail({ to: 'ana@example.com', subject: 'Hola', html: '<p>h</p>', text: 'h' }, { apiKey: 're_test', from: 'SOAPBRXND <pedidos@soapbrxnd.test>', fetchFn });
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer re_test');
    expect(JSON.parse(String(calls[0]!.init.body))).toMatchObject({ from: 'SOAPBRXND <pedidos@soapbrxnd.test>', to: ['ana@example.com'], subject: 'Hola' });
  });
  it('si Resend falla, lanza un error', async () => {
    const fetchFn = async () => new Response('nope', { status: 422 });
    await expect(sendMail({ to: 'a@b.es', subject: 's', html: 'h', text: 't' }, { apiKey: 'k', from: 'f', fetchFn })).rejects.toThrow('resend_422');
  });
});

describe('notifyOrder', () => {
  const deps = (sent: string[], fail = false) => ({
    getOrder: async () => order, baseUrl: 'https://soapbrxnd.test', shopTo: 'dani@soapbrxnd.test',
    send: async (m: { to: string; subject: string }) => { if (fail) throw new Error('resend_500'); sent.push(`${m.to}|${m.subject}`); },
  });
  it('pedido pagado: confirma al cliente y avisa a la tienda', async () => {
    const sent: string[] = [];
    await notifyOrder({ status: 'paid', order_id: order.order_id }, deps(sent));
    expect(sent).toEqual(['ana@example.com|Pedido nº 42 confirmado · SOAPBRXND', 'dani@soapbrxnd.test|Nuevo pedido nº 42 — 74,90 €']);
  });
  it('evento duplicado o caducado: no manda nada', async () => {
    const sent: string[] = [];
    await notifyOrder({ status: 'duplicate' }, deps(sent));
    await notifyOrder({ status: 'expired', order_id: order.order_id }, deps(sent));
    expect(sent).toEqual([]);
  });
  it('un fallo de correo no rompe el webhook', async () => {
    await expect(notifyOrder({ status: 'paid', order_id: order.order_id }, deps([], true))).resolves.toBeUndefined();
  });
});
