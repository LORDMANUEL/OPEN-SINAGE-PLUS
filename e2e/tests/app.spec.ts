import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'admin123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

async function mockXibo(page: Page) {
  await page.route('**/api/health', route => route.fulfill({ json: { status: 'ok', service: 'open-signage-api' } }));
  await page.route('**/api/integrations/xibo/status', route => route.fulfill({ json: { connected: true } }));
  await page.route('**/api/xibo/displays', route => route.fulfill({ json: { displays: [{ displayId: 12, display: 'Lobby Principal', loggedIn: 1 }] } }));
  await page.route('**/api/xibo/layouts', route => route.fulfill({ json: { layouts: [{ layoutId: 21, layout: 'Promo Agosto', duration: 10 }] } }));
  await page.route('**/api/xibo/library', route => route.fulfill({ json: { media: [{ mediaId: 31, name: 'hero.jpg', mediaType: 'image', fileSize: 1024 }] } }));
  await page.route('**/api/xibo/playlists', route => route.fulfill({ json: { playlists: [{ playlistId: 41, name: 'Lobby', duration: 20 }] } }));
  await page.route('**/api/xibo/display-groups', route => route.fulfill({ json: { displayGroups: [{ displayGroupId: 51, displayGroup: 'Recepción' }] } }));
  await page.route('**/api/xibo/schedules', async route => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { event: { eventId: 61 } } });
    return route.fulfill({ json: { schedules: [{ eventId: 61, eventName: 'Campaña vigente' }] } });
  });
  await page.route('**/api/xibo/layouts/*/publish', route => route.fulfill({ json: { layout: { published: true } } }));
}

test.describe('Open Signage Plus V2', () => {
  test('admin can log in and navigate to local screen inventory', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Pantallas' }).click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Pantallas Digital Signage' })).toBeVisible();
    await main.getByRole('button', { name: /Nueva pantalla/i }).click();
    await expect(main.getByText(/Nueva Digital Signage 3/)).toBeVisible();
  });

  test('Motor Xibo loads catalog and creates a schedule', async ({ page }) => {
    await mockXibo(page);
    await login(page);
    await page.getByRole('button', { name: 'Motor Xibo' }).click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Motor Xibo' })).toBeVisible();
    await expect(main.getByText('OAuth2 conectado')).toBeVisible();
    await expect(main.getByText('Lobby Principal')).toBeVisible();

    await main.getByRole('button', { name: /Programación/ }).click();
    await main.getByLabel('Nombre del evento').fill('Campaña E2E');
    await main.getByLabel('Layout').selectOption('21');
    await main.getByLabel('Grupo de pantallas').selectOption('51');
    await main.getByRole('button', { name: 'Crear programación' }).click();
    await expect(main.getByText(/Programación creada en Xibo/)).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });
});
