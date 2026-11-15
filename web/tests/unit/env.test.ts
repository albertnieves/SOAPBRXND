import { afterEach, describe, expect, it, vi } from 'vitest';
import { paymentsEnabled } from '@/lib/env';

const FULL = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x',
};
const stub = (env: Record<string, string>) => Object.entries(env).forEach(([k, v]) => vi.stubEnv(k, v));
afterEach(() => vi.unstubAllEnvs());

describe('paymentsEnabled', () => {
  it('con todo configurado se cobra', () => {
    stub(FULL);
    expect(paymentsEnabled()).toBe(true);
  });
  it('sin el secreto del webhook no se cobra (los pedidos nunca se confirmarían)', () => {
    stub({ ...FULL, STRIPE_WEBHOOK_SECRET: '' });
    expect(paymentsEnabled()).toBe(false);
  });
  it('en modo demo no se cobra', () => {
    stub({ ...FULL, NEXT_PUBLIC_SUPABASE_URL: '' });
    expect(paymentsEnabled()).toBe(false);
  });
});
