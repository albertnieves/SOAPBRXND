import { createHash, timingSafeEqual } from 'node:crypto';
import { isDemo } from '@/modules/catalog/source';

/** URL pública de la tienda, sin barra final. En Vercel, sin configurar, la de producción. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (explicit || (vercel ? `https://${vercel}` : 'http://localhost:3000')).replace(/\/$/, '');
}

/** El pago solo se activa con catálogo real, clave de servicio, clave de Stripe y secreto del webhook. */
export function paymentsEnabled(): boolean {
  return !isDemo() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(process.env.STRIPE_SECRET_KEY)
    && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

/** Compara secretos en tiempo constante. */
export function safeEqual(a: string, b: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
}
