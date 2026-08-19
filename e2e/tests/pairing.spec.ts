import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'admin123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('TV browser registers on /screen, shows short code, then starts assigned scene', async ({ page }) => {
  const deviceToken = 'device-token-abcdefghijkl';
  let paired = false;
  await page.route('**/api/player/devices/register', route => route.fulfill({ status: 201, json: { device: { deviceToken, pairingCode: 'AB12CD', sceneToken: null, name: '' } } }));
  await page.route(`**/api/player/devices/${deviceToken}`, route => route.fulfill({ json: { device: { deviceToken, pairingCode: 'AB12CD', sceneToken: paired ? 'demo-player-token' : null, name: 'Lobby TV' } } }));
  await page.route('**/api/player/scenes/demo-player-token', route => route.fulfill({ json: { scene: { token: 'demo-player-token', name: 'Lobby', background: '#071426', items: [{ type: 'text', text: 'Pantalla vinculada', x: 0, y: 0, width: 100, height: 100 }] } } }));

  await page.goto('/screen');
  await expect(page.getByLabel('Código de vinculación')).toHaveText('AB12CD');
  paired = true;
  await expect(page.getByText('Pantalla vinculada')).toBeVisible({ timeout: 7000 });
});

test('Studio pairs a published scene using the short TV code', async ({ page }) => {
  await page.route('**/api/player/scenes', route => route.fulfill({ status: 201, json: { token: 'demo-player-token', scene: { name: 'Lobby Web', items: [] } } }));
  await page.route('**/api/player/devices/pair', async route => {
    const payload = route.request().postDataJSON();
    expect(payload.pairingCode).toBe('AB12CD');
    expect(payload.sceneToken).toBe('demo-player-token');
    return route.fulfill({ json: { device: { deviceToken: 'device-token-abcdefghijkl', pairingCode: 'AB12CD', sceneToken: 'demo-player-token', name: 'Lobby TV' } } });
  });

  await login(page);
  await page.getByRole('button', { name: 'Studio' }).click();
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Publicar Web Player' }).click();
  await main.getByLabel('Código de pantalla').fill('AB12CD');
  await main.getByLabel('Nombre de la pantalla').fill('Lobby TV');
  await main.getByRole('button', { name: 'Vincular a escena publicada' }).click();
  await expect(main.getByText(/Pantalla Lobby TV vinculada/)).toBeVisible();
});
