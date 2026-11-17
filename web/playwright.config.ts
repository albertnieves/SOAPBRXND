import { defineConfig, devices } from '@playwright/test';

// Pruebas de extremo a extremo en modo demo (sin Supabase ni Stripe): `pnpm build && pnpm e2e`.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3100', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm start --port 3100',
    url: 'http://localhost:3100/artes',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', STRIPE_SECRET_KEY: '' },
  },
});
