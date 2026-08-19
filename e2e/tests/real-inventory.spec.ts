import { test, expect } from '@playwright/test';

test('dashboard and inventories render live API data instead of demo fixtures', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({
    json: {
      token: 'e2e-signed-session',
      user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' },
      expiresAt: Date.now() + 3600000,
    },
  }));
  await page.route('**/api/xibo/displays', route => route.fulfill({
    json: {
      displays: [
        { displayId: 101, display: 'XIBO REAL LOBBY', loggedIn: 1, lastAccessed: '2026-08-19T04:00:00Z' },
        { displayId: 102, display: 'XIBO REAL SALES', loggedIn: 0, lastAccessed: '2026-08-18T20:00:00Z' },
        { displayId: 103, display: 'XIBO REAL WAREHOUSE', loggedIn: 0, lastAccessed: '2026-08-18T18:00:00Z' },
      ],
    },
  }));
  await page.route('**/api/xibo/library', route => route.fulfill({
    json: { media: [
      { mediaId: 1, name: 'uno.png' },
      { mediaId: 2, name: 'dos.png' },
      { mediaId: 3, name: 'tres.mp4' },
      { mediaId: 4, name: 'cuatro.jpg' },
    ] },
  }));
  await page.route('**/api/xibo/layouts', route => route.fulfill({
    json: { layouts: [{ layoutId: 801, layout: 'LAYOUT REAL BI', duration: 30, status: 1 }] },
  }));
  await page.route('**/api/player/devices', route => route.fulfill({
    json: { devices: [
      { deviceToken: 'device-token-abcdefghijkl', pairingCode: 'AB12CD', sceneToken: 'demo-player-token', name: 'KIOSK REAL FRONT', lastSeenAt: '2026-08-19T04:00:00Z' },
      { deviceToken: 'device-token-mnopqrstuvwxyz', pairingCode: 'EF34GH', sceneToken: null, name: 'TV REAL WAITING', lastSeenAt: '2026-08-19T03:50:00Z' },
    ] },
  }));
  await page.route('**/api/queues/recepcion', route => route.fulfill({
    json: { tickets: [
      { id: 't1', queue: 'recepcion', prefix: 'R', number: 'R001', status: 'waiting' },
      { id: 't2', queue: 'recepcion', prefix: 'R', number: 'R002', status: 'waiting' },
      { id: 't3', queue: 'recepcion', prefix: 'R', number: 'R003', status: 'waiting' },
      { id: 't4', queue: 'recepcion', prefix: 'R', number: 'R004', status: 'completed' },
    ] },
  }));

  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  const main = page.getByRole('main');
  await expect(main.getByText('3 displays')).toBeVisible();
  await expect(main.getByText('1 online')).toBeVisible();
  await expect(main.getByText('4 media')).toBeVisible();
  await expect(main.getByText('3 pendientes')).toBeVisible();
  await expect(main.getByText('2 browser')).toBeVisible();

  await page.getByRole('button', { name: 'Pantallas' }).click();
  await expect(main.getByText('XIBO REAL LOBBY')).toBeVisible();
  await expect(main.getByRole('button', { name: /Nueva pantalla/i })).toHaveCount(0);

  await page.getByRole('button', { name: 'Kioscos' }).click();
  await expect(main.getByText('KIOSK REAL FRONT')).toBeVisible();

  await page.getByRole('button', { name: 'Dashboards' }).click();
  await expect(main.getByText('LAYOUT REAL BI')).toBeVisible();
});
