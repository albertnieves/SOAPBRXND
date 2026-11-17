import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ENTRAR', exact: true }).click();
  await expect(page.locator('#room')).toBeVisible();
});

test('la lavandería pinta la sala con el catálogo de la API', async ({ page }) => {
  const washers = await page.evaluate(() => (window as unknown as { __sbx: { ITEMS: { id: string }[] } }).__sbx.ITEMS.filter((i) => i.id.startsWith('washer')).length);
  expect(washers).toBe(3);
});

test('la alfombrilla y el logotipo de marca se cargan en la sala', async ({ page }) => {
  const brand = await page.evaluate(() => {
    const b = (window as unknown as { __sbx: { env: { brand?: { alfombrilla: { w: number } | null; logotipo: { w: number } | null } | null } } }).__sbx.env.brand;
    return { alfombrilla: b?.alfombrilla?.w ?? 0, logotipo: b?.logotipo?.w ?? 0 };
  });
  expect(brand.alfombrilla).toBeGreaterThan(0);
  expect(brand.logotipo).toBeGreaterThan(0);
});

test('PRODUCTOS lista las piezas con enlace a su ficha', async ({ page }) => {
  await page.getByRole('button', { name: 'PRODUCTOS' }).click();
  const tee = page.locator('#lavanderia a.card[href="/p/tee-pompa-repeat"]');
  await expect(tee).toBeVisible();
  await expect(tee).toContainText('Tee Pompa Repeat');
  // dentro de la sala la tarjeta abre la ficha rápida; la ficha completa sigue a un clic
  await tee.click();
  await expect(page.locator('#lavanderia #panel')).toContainText('PROBÁRSELO A POMPA');
  await page.locator('#lavanderia #panel').getByRole('link', { name: /Ver la ficha completa/ }).click();
  await expect(page).toHaveURL(/\/p\/tee-pompa-repeat$/);
});

type Sbx = {
  ITEMS: { id: string; act?: string }[];
  pompa: { x: number; y: number; emote: string };
  outfit: { skin: string; top: string; topSlug: string | null };
  env: { lightsOn: boolean };
  socks: number[];
  run: (act: string, it?: unknown) => void;
};

test('la ficha rápida añade a la bolsa sin salir de la sala', async ({ page }) => {
  await page.getByRole('button', { name: 'PRODUCTOS' }).click();
  await page.locator('#lavanderia a.card[href="/p/tee-pompa-repeat"]').click();
  const panel = page.locator('#lavanderia #panel');
  await expect(panel.getByRole('button', { name: 'ELIGE UNA OPCIÓN' })).toBeDisabled();
  await panel.getByRole('button', { name: 'M', exact: true }).click();
  await panel.getByRole('button', { name: 'AÑADIR A LA BOLSA' }).click();
  await expect(page.locator('#bagN')).toHaveText('1');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/bolsa');
  await expect(page.getByText('Tee Pompa Repeat').first()).toBeVisible();
});

test('/api/bolsa rechaza lo que no se puede comprar', async ({ request }) => {
  const bad = await request.post('/api/bolsa', { data: { variantId: 'nada' } });
  expect(bad.status()).toBe(400);
  const form = await request.post('/api/bolsa', { form: { variantId: 'x' } });
  expect(form.status()).toBe(415);
});

test('el vestidor viste a Pompa con una pieza de la tienda y lo recuerda', async ({ page }) => {
  await page.locator('#lavanderia').getByRole('button', { name: 'VESTIDOR' }).click();
  const panel = page.locator('#lavanderia #panel');
  await panel.getByRole('button', { name: /Tee Pompa Repeat/i }).click();
  await panel.getByRole('button', { name: 'GUARDAR LOOK' }).click();
  expect(await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.outfit.topSlug)).toBe('tee-pompa-repeat');
  await page.reload();
  await page.getByRole('button', { name: 'ENTRAR', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.outfit.topSlug)).toBe('tee-pompa-repeat');
});

test('Pompa se mueve con el teclado y hace gestos', async ({ page, isMobile }) => {
  test.skip(isMobile, 'el teclado es de escritorio');
  const before = await page.evaluate(() => { const p = (window as unknown as { __sbx: Sbx }).__sbx.pompa; return [p.x, p.y]; });
  await page.locator('#stage').focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => { const p = (window as unknown as { __sbx: Sbx }).__sbx.pompa; return [p.x, p.y]; });
  expect(after).not.toEqual(before);
  await page.keyboard.press('3');
  expect(await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.pompa.emote)).toBe('dance');
});

test('los calcetines perdidos se cuentan y el interruptor cambia la luz', async ({ page }) => {
  await expect(page.locator('#sockN')).toHaveText('0/5');
  await page.evaluate(() => { const s = (window as unknown as { __sbx: Sbx }).__sbx; const it = s.ITEMS.find((i) => i.id === 'sock0')!; s.run(it.act!, it); });
  await expect(page.locator('#sockN')).toHaveText('1/5');
  const lit = await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.env.lightsOn);
  await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.run('lights'));
  expect(await page.evaluate(() => (window as unknown as { __sbx: Sbx }).__sbx.env.lightsOn)).toBe(!lit);
});

test('Daniel recomienda una pieza y abre su ficha', async ({ page }) => {
  await page.locator('#chat input').fill('¿qué me recomiendas?');
  await page.locator('#chat input').press('Enter');
  await expect(page.locator('#lavanderia #panel')).toContainText('Ver la ficha completa', { timeout: 8000 });
});

test('ARTES enlaza a cada arte y a la galería', async ({ page }) => {
  await page.locator('#lavanderia').getByRole('button', { name: 'ARTES' }).click();
  await expect(page.locator('#lavanderia a[href="/artes/ajedrez-lavanderia"]')).toBeVisible();
  await expect(page.locator('#lavanderia a[href="/artes"]')).toBeVisible();
});

test('DROPS enlaza a cada lavadora', async ({ page }) => {
  await page.locator('#lavanderia').getByRole('button', { name: 'DROPS' }).click();
  await expect(page.locator('#lavanderia a[href="/drops/first-signal"]')).toBeVisible();
});

test('BOLSA lleva a /bolsa y cuenta lo que hay en la cookie', async ({ page, context }) => {
  await context.addCookies([{ name: 'sbx_bolsa', value: '50000000-0000-4000-8000-000000000006:2', url: 'http://localhost:3100' }]);
  await page.reload();
  await page.getByRole('button', { name: 'ENTRAR', exact: true }).click();
  await expect(page.locator('#bagN')).toHaveText('2');
  await page.getByRole('link', { name: /BOLSA/ }).click();
  await expect(page).toHaveURL(/\/bolsa$/);
});
