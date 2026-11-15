/* Envío con Resend (API HTTP, sin SDK). */
import type { Mail } from './order-email';

export type SendDeps = { apiKey: string; from: string; fetchFn?: typeof fetch };

export async function sendMail(mail: Mail & { to: string }, deps: SendDeps): Promise<void> {
  const res = await (deps.fetchFn ?? fetch)('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${deps.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: deps.from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}`);
}

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
