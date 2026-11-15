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

test('PRODUCTOS lista las piezas con enlace a su ficha', async ({ page }) => {
  await page.getByRole('button', { name: 'PRODUCTOS' }).click();
  const tee = page.locator('#lavanderia a.card[href="/p/tee-pompa-repeat"]');
  await expect(tee).toBeVisible();
  await expect(tee).toContainText('Tee Pompa Repeat');
  await tee.click();
  await expect(page).toHaveURL(/\/p\/tee-pompa-repeat$/);
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
