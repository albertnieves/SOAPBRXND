import { expect, test } from '@playwright/test';

test('las artes se agrupan por tipo y enlazan a su página', async ({ page }) => {
  await page.goto('/artes');
  await expect(page.getByRole('heading', { name: 'Patrones de estampado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Texturas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Textiles' })).toBeVisible();
  await page.getByRole('link', { name: /Ajedrez Lavandería/ }).first().click();
  await expect(page).toHaveURL(/\/artes\/ajedrez-lavanderia$/);
  await expect(page.getByRole('link', { name: /Hoodie Ajedrez Lavandería/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Pañuelo Ajedrez Lavandería/ })).toBeVisible();
});

test('ficha → bolsa con el total calculado en el servidor', async ({ page }) => {
  await page.goto('/p/hoodie-ajedrez-lavanderia');
  await expect(page.getByRole('heading', { name: 'Hoodie Ajedrez Lavandería' })).toBeVisible();
  await expect(page.getByTestId('price')).toHaveText('65 €');
  await expect(page.getByRole('radio', { name: 'XL' })).toBeDisabled();
  await page.getByText('L', { exact: true }).click();
  await expect(page.getByTestId('stock')).toHaveText('SOLO QUEDAN 2');
  await page.getByRole('button', { name: 'Añadir a la bolsa' }).click();
  await expect(page).toHaveURL(/\/bolsa/);
  const line = page.getByTestId('bag-line');
  await expect(line).toHaveCount(1);
  await expect(line).toContainText('Hoodie Ajedrez Lavandería');
  await expect(line).toContainText('L');
  await expect(page.getByTestId('bag-total')).toHaveText('65 €');
  await expect(page.getByTestId('bag-count')).toHaveText('1');
});

test('en modo demo el checkout avisa de que el pago no está activo', async ({ page }) => {
  await page.goto('/p/tee-pompa-repeat');
  await page.getByText('M', { exact: true }).click();
  await page.getByRole('button', { name: 'Añadir a la bolsa' }).click();
  await page.getByRole('link', { name: 'Finalizar compra' }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText('El pago no está activo')).toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar/ })).toBeDisabled();
});

test('un drop abierto lista sus productos; uno anunciado no deja comprar', async ({ page }) => {
  await page.goto('/drops/first-signal');
  await expect(page.getByRole('heading', { name: 'FIRST SIGNAL' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Tee Pompa Repeat/ })).toBeVisible();
  await page.goto('/drops/visual-pack-001');
  await expect(page.getByText('ANUNCIADO')).toBeVisible();
  await page.getByRole('link', { name: /Lámina Sábana Tendida/ }).click();
  await expect(page.getByRole('button', { name: 'Añadir a la bolsa' })).toHaveCount(0);
  await expect(page.getByText(/Se abre el/)).toBeVisible();
});

test('un drop en borrador no existe', async ({ page }) => {
  const res = await page.goto('/drops/next-chapter');
  expect(res?.status()).toBe(404);
});
