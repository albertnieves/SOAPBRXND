import { expect, test, type Page } from '@playwright/test';

/* Montar y desmontar la lavandería: lo que la sala toca fuera de sí misma tiene que volver a su sitio. */

type NextWindow = { next: { router: { push: (href: string) => void } } };
const clientPush = (page: Page, href: string) => page.evaluate((h) => (window as unknown as NextWindow).next.router.push(h), href);
const enter = async (page: Page) => {
  await page.getByRole('button', { name: 'ENTRAR', exact: true }).click();
  await expect(page.locator('#room')).toBeVisible();
};

test('al salir de la portada sin recargar, la sala se desmonta y la página vuelve a hacer scroll', async ({ page }) => {
  await page.goto('/artes');
  await clientPush(page, '/');
  await expect(page).toHaveURL(/\/$/);
  await enter(page);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.goBack(); // navegación del router de Next, sin recargar
  await expect(page).toHaveURL(/\/artes$/);
  await expect(page.locator('#lavanderia')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(await page.evaluate(() => 'next' in window && !('__sbx' in window))).toBe(true);
  // nada queda escuchando el teclado: una flecha ya no se la come la sala
  expect(await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    dispatchEvent(e);
    return e.defaultPrevented;
  })).toBe(false);

  // y al volver se monta otra vez, limpia
  await clientPush(page, '/');
  await enter(page);
  expect(await page.locator('#lavanderia #stage').count()).toBe(1);
});

test('el foco del teclado no sale de la sala hacia la tienda que hay debajo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'sin teclado en móvil');
  await page.goto('/');
  await enter(page);
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const outside = await page.evaluate(() => {
      const a = document.activeElement;
      return a && a !== document.body && !a.closest('#lavanderia') ? a.outerHTML.slice(0, 80) : null;
    });
    expect(outside, `tras ${i + 1} tabulaciones`).toBeNull();
  }
});

test('si la sala no carga, se quita y queda la tienda normal', async ({ page }) => {
  await page.route('**/api/room', (r) => r.fulfill({ status: 500, body: '' }));
  await page.goto('/');
  const button = page.getByRole('button', { name: 'VER LA TIENDA SIN SALA' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator('#lavanderia #intro')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: /lavandería de drops/ })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});
