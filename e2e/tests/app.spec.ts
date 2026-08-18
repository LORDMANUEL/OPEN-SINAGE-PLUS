import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'admin123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

test.describe('Open Signage Plus V2', () => {
  test('admin can log in and navigate to local screen inventory', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /Pantallas Signage/ }).click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Pantallas Digital Signage' })).toBeVisible();
    await main.getByRole('button', { name: /Nueva pantalla local/i }).click();
    await expect(main.getByText(/Nueva Digital Signage 3/)).toBeVisible();
  });

  test('Motor Xibo view renders live gateway and display state', async ({ page }) => {
    await page.route('**/api/health', route => route.fulfill({ json: { status: 'ok', service: 'open-signage-api' } }));
    await page.route('**/api/integrations/xibo/status', route => route.fulfill({ json: { connected: true } }));
    await page.route('**/api/xibo/displays', route => route.fulfill({ json: { displays: [{ displayId: 12, display: 'Lobby Principal' }] } }));

    await login(page);
    await page.getByRole('button', { name: 'Motor Xibo' }).click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Motor Xibo' })).toBeVisible();
    await expect(main.getByText('OAuth2 validado')).toBeVisible();
    await expect(main.getByText('Lobby Principal')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Open Signage Plus' })).toBeVisible();
  });
});
