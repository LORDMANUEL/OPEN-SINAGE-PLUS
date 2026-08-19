import { test, expect } from '@playwright/test';

test('browser kiosk navigates between PLUS scenes and can return home', async ({ page }) => {
  await page.route('**/api/player/scenes/home-scene-token', route => route.fulfill({ json: { scene: { token: 'home-scene-token', name: 'Inicio Kiosco', duration: 30, background: '#071426', items: [{ id: 'go', type: 'button', text: 'Ver catálogo', x: 30, y: 60, width: 40, height: 14, action: { type: 'scene', token: 'catalog-scene-token' } }] } } }));
  await page.route('**/api/player/scenes/catalog-scene-token', route => route.fulfill({ json: { scene: { token: 'catalog-scene-token', name: 'Catálogo', duration: 30, background: '#101820', items: [{ id: 'title', type: 'text', text: 'CATÁLOGO TÁCTIL', x: 10, y: 15, width: 80, height: 20, color: '#fff', fontSize: 60 }] } } }));
  await page.goto('/player/home-scene-token');
  await page.getByRole('button', { name: 'Ver catálogo' }).click();
  await expect(page.getByText('CATÁLOGO TÁCTIL')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atrás' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inicio' })).toBeVisible();
  await page.getByRole('button', { name: 'Inicio' }).click();
  await expect(page.getByRole('button', { name: 'Ver catálogo' })).toBeVisible();
});
