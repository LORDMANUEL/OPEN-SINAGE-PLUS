import { test, expect } from '@playwright/test';

test('Queue Center announces called ticket with browser TTS when enabled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: (utterance: SpeechSynthesisUtterance) => { (window as unknown as { __spoken?: string }).__spoken = utterance.text; }, cancel: () => undefined, getVoices: () => [] }, configurable: true });
  });
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-session', user: { email: 'admin@empresa.com', role: 'admin', name: 'Administrador' }, expiresAt: Date.now() + 3600000 } }));
  let tickets = [{ id: 't1', queue: 'recepcion', prefix: 'R', number: 'R001', status: 'waiting' }];
  await page.route('**/api/queues/recepcion', route => route.fulfill({ json: { tickets } }));
  await page.route('**/api/queues/recepcion/call-next', route => { tickets = [{ ...tickets[0], status: 'called', desk: 'Módulo 1' }]; return route.fulfill({ json: { ticket: tickets[0] } }); });
  await page.goto('/');
  await page.fill('#email', 'admin@empresa.com');
  await page.fill('#password', 'StrongAdminPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('button', { name: 'Turnos' }).click();
  const main = page.getByRole('main');
  await main.getByLabel('Anunciar turnos por voz').check();
  await main.getByRole('button', { name: 'Llamar siguiente' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken?: string }).__spoken || '')).toContain('R001');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken?: string }).__spoken || '')).toContain('Módulo 1');
});
