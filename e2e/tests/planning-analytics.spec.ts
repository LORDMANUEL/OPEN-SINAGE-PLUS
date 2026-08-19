import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-session', user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' }, expiresAt: Date.now() + 3600000 } }));
  await page.route('**/api/xibo/display-groups', route => route.fulfill({ json: { displayGroups: [{ displayGroupId: 7, displayGroup: 'Lobby' }] } }));
  await page.route('**/api/xibo/schedules', route => route.fulfill({ json: { schedules: [{ eventId: 11, eventName: 'Promo', fromDt: '2026-08-19T10:00:00Z', toDt: '2026-08-19T20:00:00Z' }] } }));
  await page.route('**/api/platform/schedule/preview?*', route => route.fulfill({ json: { at: '2026-08-19T12:00:00.000Z', displayGroupId: 7, conflict: false, matches: [{ eventId: 11, eventName: 'Promo', layoutId: 21, priority: 1 }], winner: { eventId: 11, eventName: 'Promo', layoutId: 21, priority: 1 } } }));
  await page.route('**/api/platform/analytics/summary?*', route => route.fulfill({ json: { sinceHours: 24, playbackCount: 123, interactionCount: 17, uniqueScenes: 4, uniqueDevices: 3, actions: { ticket: 9, openUrl: 8 } } }));
  await page.route('**/api/platform/notifications/status', route => route.fulfill({ json: { configured: true, smtp: true, webhook: false } }));
  await page.route('**/api/platform/notifications/test', route => route.fulfill({ json: { results: [{ channel: 'smtp', ok: true }] } }));
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

test('Planning Center previews schedules, analytics and notification status', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Planificación y analytics' }).click();
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Planning Center' })).toBeVisible();
  await main.getByRole('button', { name: 'Previsualizar' }).click();
  await expect(main.getByText(/Ganador: Promo/)).toBeVisible();

  await main.getByRole('button', { name: 'Analytics' }).click();
  await expect(main.getByText('123')).toBeVisible();
  await expect(main.getByText('17')).toBeVisible();

  await main.getByRole('button', { name: 'Alertas' }).click();
  await expect(main.getByText('SMTP')).toBeVisible();
  await expect(main.getByText('ON')).toBeVisible();
});
