import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-session', user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' }, expiresAt: Date.now() + 3600000 } }));
  await page.route('**/api/xibo/playlists', route => route.fulfill({ json: { playlists: [] } }));
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

test('Studio applies a template, adapts to vertical and edits timeline animation', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Plantilla Retail' }).click();
  await expect(main.getByTestId('visual-scene-canvas').getByText('OFERTA ESPECIAL')).toBeVisible();
  await main.getByRole('button', { name: '9:16 Vertical' }).click();
  await expect(main.getByTestId('visual-scene-canvas')).toHaveAttribute('data-format', '9:16');
  await main.getByLabel('Animación').selectOption('fade');
  await main.getByLabel('Inicio s').fill('1');
  await main.getByLabel('Fin s').fill('8');
  await expect(main.getByLabel('Inicio s')).toHaveValue('1');
  await expect(main.getByLabel('Fin s')).toHaveValue('8');
});
