import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-session', user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' }, expiresAt: Date.now() + 3600000 } }));
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

test('Studio can add a scene version so campaign can enter review', async ({ page }) => {
  let status = 'draft';
  let activeVersionId: string | null = null;
  const campaign = () => ({ id: 'camp-1', name: 'Promo Agosto', status, target: {}, activeVersionId, createdBy: 'admin@empresa.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  await page.route('**/api/xibo/playlists', route => route.fulfill({ json: { playlists: [] } }));
  await page.route('**/api/platform/campaigns', async route => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { campaign: campaign() } });
    return route.fulfill({ json: { campaigns: [campaign()] } });
  });
  await page.route('**/api/platform/campaigns/camp-1/versions', route => {
    activeVersionId = 'version-1';
    return route.fulfill({ status: 201, json: { version: { id: activeVersionId, campaignId: 'camp-1', version: 1, scene: {}, createdBy: 'admin@empresa.com', createdAt: new Date().toISOString() } } });
  });
  await page.route('**/api/platform/campaigns/camp-1/status', route => {
    const body = route.request().postDataJSON() as { status: string };
    status = body.status;
    return route.fulfill({ json: { campaign: campaign() } });
  });
  await page.route('**/api/platform/system/health', route => route.fulfill({ json: { status: 'ok', xibo: { ok: true }, ai: { configured: false }, fleet: { total: 0, online: 0, offline: 0, errors: 0, devices: [] } } }));
  await page.route('**/api/platform/fleet/health', route => route.fulfill({ json: { total: 0, online: 0, offline: 0, errors: 0, devices: [] } }));

  await login(page);
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  const main = page.getByRole('main');
  await expect(main.getByLabel('Campaña para versionar')).toHaveValue('camp-1');
  await main.getByRole('button', { name: 'Guardar nueva versión' }).click();
  await expect(main.getByText(/Versión 1 guardada/)).toBeVisible();

  await page.getByRole('button', { name: 'Operaciones' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Campañas' }).click();
  await expect(page.getByRole('main').getByText(/Promo Agosto · draft/)).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByRole('main').getByText(/Promo Agosto · review/)).toBeVisible();
});
