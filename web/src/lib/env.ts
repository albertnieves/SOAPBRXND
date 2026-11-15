import { isDemo } from '@/modules/catalog/source';

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** El pago solo se activa con catálogo real, clave de servicio y clave de Stripe. */
export function paymentsEnabled(): boolean {
  return !isDemo() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(process.env.STRIPE_SECRET_KEY);
}
