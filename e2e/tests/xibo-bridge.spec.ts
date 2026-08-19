import { test, expect } from '@playwright/test';

test('Studio can send a published PLUS scene to a selected Xibo playlist', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({
    json: {
      token: 'e2e-signed-session',
      user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' },
      expiresAt: Date.now() + 3600000,
    },
  }));
  await page.route('**/api/player/scenes', route => route.fulfill({
    status: 201,
    json: { token: 'demo-player-token', scene: { name: 'Lobby Web', items: [] } },
  }));
  await page.route('**/api/xibo/playlists', route => route.fulfill({
    json: { playlists: [{ playlistId: 41, name: 'Lobby Principal' }] },
  }));
  await page.route('**/api/xibo/playlists/41/webpage', async route => {
    const payload = route.request().postDataJSON();
    expect(payload.uri).toMatch(/\/player\/demo-player-token$/);
    expect(payload.name).toBe('Lobby Web');
    return route.fulfill({ status: 201, json: { widget: { widgetId: 501, type: 'webpage' } } });
  });

  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('button', { name: 'Studio', exact: true }).click();

  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Publicar Web Player' }).click();
  await main.getByLabel('Playlist Xibo').selectOption('41');
  await main.getByRole('button', { name: 'Enviar escena a Xibo' }).click();
  await expect(main.getByText(/Escena enviada a Xibo/i)).toBeVisible();
});
