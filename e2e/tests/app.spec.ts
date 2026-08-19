import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-signed-session', user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' }, expiresAt: Date.now() + 3600000 } }));
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

async function mockXibo(page: Page) {
  await page.route('**/api/health', route => route.fulfill({ json: { status: 'ok', service: 'open-signage-api' } }));
  await page.route('**/api/integrations/xibo/status', route => route.fulfill({ json: { connected: true } }));
  await page.route('**/api/xibo/displays', route => route.fulfill({ json: { displays: [{ displayId: 12, display: 'Lobby Principal', loggedIn: 1 }] } }));
  await page.route('**/api/xibo/layouts', async route => { if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { layout: { layoutId: 22, layout: 'Nuevo Layout' } } }); return route.fulfill({ json: { layouts: [{ layoutId: 21, layout: 'Promo Agosto', duration: 10 }] } }); });
  await page.route('**/api/xibo/library', route => route.fulfill({ json: { media: [{ mediaId: 31, name: 'hero.jpg', mediaType: 'image', fileSize: 1024 }] } }));
  await page.route('**/api/xibo/library/upload', route => route.fulfill({ status: 201, json: { media: [{ mediaId: 32, name: 'nuevo.png', mediaType: 'image' }] } }));
  await page.route('**/api/xibo/playlists', route => route.fulfill({ json: { playlists: [{ playlistId: 41, name: 'Lobby', duration: 20 }] } }));
  await page.route('**/api/xibo/display-groups', route => route.fulfill({ json: { displayGroups: [{ displayGroupId: 51, displayGroup: 'Recepción' }] } }));
  await page.route('**/api/xibo/schedules', async route => { if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { event: { eventId: 61 } } }); return route.fulfill({ json: { schedules: [{ eventId: 61, eventName: 'Campaña vigente' }] } }); });
  await page.route('**/api/xibo/layouts/*/publish', route => route.fulfill({ json: { layout: { published: true } } }));
}

async function mockAi(page: Page) {
  await page.route('**/api/ai/status', route => route.fulfill({ json: { configured: true, provider: 'ollama', model: 'tiny' } }));
  await page.route('**/api/ai/generate-scene', route => route.fulfill({ json: { scene: { name: 'Promo IA', duration: 15, background: '#071426', items: [ { type: 'text', text: 'Oferta IA', x: 8, y: 10, width: 84, height: 25, color: '#fff', fontSize: 64 }, { type: 'button', text: 'Tomar turno', x: 35, y: 70, width: 30, height: 12, action: { type: 'ticket', queue: 'recepcion', prefix: 'R' } }, { type: 'qr', value: 'https://example.com/promo', x: 75, y: 65, width: 16, height: 22 } ] } } }));
  await page.route('**/api/qr?*', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>' }));
}

test.describe('Open Signage Plus V2', () => {
  test('admin can log in and navigate to the live Xibo screen inventory', async ({ page }) => {
    await mockXibo(page);
    await login(page);
    await page.getByRole('button', { name: 'Pantallas' }).click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Pantallas Xibo' })).toBeVisible();
    await expect(main.getByText('Lobby Principal')).toBeVisible();
    await expect(main.getByRole('button', { name: /Nueva pantalla/i })).toHaveCount(0);
  });

  test('Motor Xibo loads catalog and creates a schedule', async ({ page }) => { await mockXibo(page); await login(page); await page.getByRole('button', { name: 'Motor Xibo' }).click(); const main = page.getByRole('main'); await expect(main.getByRole('heading', { name: 'Motor Xibo' })).toBeVisible(); await expect(main.getByText('OAuth2 conectado')).toBeVisible(); await expect(main.getByText('Lobby Principal')).toBeVisible(); await main.getByRole('button', { name: /Programación/ }).click(); await main.getByLabel('Nombre del evento').fill('Campaña E2E'); await main.getByLabel('Layout').selectOption('21'); await main.getByLabel('Grupo de pantallas').selectOption('51'); await main.getByRole('button', { name: 'Crear programación' }).click(); await expect(main.getByText(/Programación creada en Xibo/)).toBeVisible(); });

  test('Studio creates a browser player scene URL', async ({ page }) => { await mockXibo(page); await page.route('**/api/player/scenes', route => route.fulfill({ status: 201, json: { token: 'demo-player-token', scene: { name: 'Lobby Web', items: [] } } })); await login(page); await page.getByRole('button', { name: 'Studio', exact: true }).click(); const main = page.getByRole('main'); await main.getByLabel('Nombre de escena').fill('Lobby Web'); await main.getByLabel('Texto principal').fill('Bienvenido a Open Signage'); await main.getByRole('button', { name: 'Publicar Web Player' }).click(); await expect(main.getByText(/demo-player-token/)).toBeVisible(); });

  test('AI Studio generates preview and only publishes after explicit approval', async ({ page }) => { await mockAi(page); await page.route('**/api/player/scenes', route => route.fulfill({ status: 201, json: { token: 'ai-player-token', scene: { name: 'Promo IA', items: [] } } })); await login(page); await page.getByRole('button', { name: 'AI Studio', exact: true }).click(); const main = page.getByRole('main'); await expect(main.getByText(/IA conectada/)).toBeVisible(); await main.getByLabel('Prompt').fill('Crea una promo táctil'); await main.getByRole('button', { name: 'Generar preview' }).click(); await expect(main.getByText('Oferta IA')).toBeVisible(); await expect(main.getByText(/Borrador generado/)).toBeVisible(); await main.getByRole('button', { name: 'Aprobar y publicar' }).click(); await expect(main.getByRole('link', { name: 'Abrir player publicado' })).toHaveAttribute('href', /ai-player-token/); });

  test('Queue Center issues and calls a ticket', async ({ page }) => { let tickets: Array<{ id: string; queue: string; prefix: string; number: string; status: string; desk?: string }> = []; await page.route('**/api/queues/recepcion', route => route.fulfill({ json: { tickets } })); await page.route('**/api/queues/recepcion/tickets', route => { const ticket = { id: 't1', queue: 'recepcion', prefix: 'R', number: 'R001', status: 'waiting' }; tickets = [ticket]; return route.fulfill({ status: 201, json: { ticket } }); }); await page.route('**/api/queues/recepcion/call-next', route => { tickets = tickets.map(ticket => ({ ...ticket, status: 'called', desk: 'Módulo 1' })); return route.fulfill({ json: { ticket: tickets[0] } }); }); await login(page); await page.getByRole('button', { name: 'Turnos' }).click(); const main = page.getByRole('main'); await main.getByRole('button', { name: 'Emitir turno' }).click(); await expect(main.getByText('R001 · waiting')).toBeVisible(); await main.getByRole('button', { name: 'Llamar siguiente' }).click(); await expect(main.getByText(/Llamando R001/)).toBeVisible(); });

  test('browser player renders QR and emits a ticket from a touch button without login', async ({ page }) => { await mockAi(page); await page.route('**/api/player/scenes/demo-player-token', route => route.fulfill({ json: { scene: { token: 'demo-player-token', name: 'Lobby Web', background: '#050b18', duration: 15, items: [ { type: 'text', text: 'Bienvenido a Open Signage', x: 0, y: 0, width: 100, height: 40, color: '#ffffff', fontSize: 48, align: 'center' }, { type: 'button', text: 'Tomar turno', x: 30, y: 60, width: 40, height: 15, action: { type: 'ticket', queue: 'recepcion', prefix: 'R' } }, { type: 'qr', value: 'https://example.com', x: 75, y: 60, width: 20, height: 25, label: 'Escanea' } ] } } })); await page.route('**/api/queues/recepcion/tickets', route => route.fulfill({ status: 201, json: { ticket: { id: 't1', queue: 'recepcion', prefix: 'R', number: 'R001', status: 'waiting' } } })); await page.goto('/player/demo-player-token'); await expect(page.getByText('Bienvenido a Open Signage')).toBeVisible(); await expect(page.getByText('Escanea')).toBeVisible(); await page.getByRole('button', { name: 'Tomar turno' }).click(); await expect(page.getByText('R001')).toBeVisible(); });

  test('user can log out', async ({ page }) => { await login(page); await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible(); });
});
