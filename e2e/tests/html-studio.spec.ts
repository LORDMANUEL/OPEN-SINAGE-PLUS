import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'e2e-session', user: { email: 'marketing@empresa.com', role: 'marketing', name: 'Marketing' }, expiresAt: Date.now() + 3600000 } }));
  await page.goto('/');
  await page.fill('#email', 'marketing@empresa.com');
  await page.fill('#password', 'StrongMarketingPass123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard General' })).toBeVisible();
}

test('HTML Studio previews sandboxed HTML/CSS and publishes a browser scene', async ({ page }) => {
  let publishedHtml = '';
  await page.route('**/api/player/scenes', async route => {
    const body = route.request().postDataJSON() as { items?: Array<{ type?: string; html?: string }> };
    publishedHtml = body.items?.find(item => item.type === 'html')?.html || '';
    await route.fulfill({ status: 201, json: { token: 'html-scene-123456', scene: body } });
  });

  await login(page);
  await page.getByRole('button', { name: 'HTML Studio' }).click();
  const main = page.getByRole('main');

  await expect(main.getByRole('heading', { name: 'HTML Studio' })).toBeVisible();
  await main.getByLabel('HTML').fill('<section class="promo"><h1>OFERTA</h1></section>');
  await main.getByLabel('CSS').fill('.promo{display:grid;place-items:center;height:100%;background:#111;color:white}.promo h1{font-size:8vw}');

  const preview = main.getByTitle('Preview HTML/CSS');
  await expect(preview).toHaveAttribute('sandbox');
  await expect(preview).toHaveAttribute('srcdoc', /OFERTA/);

  await main.getByRole('button', { name: 'Publicar HTML' }).click();
  await expect.poll(() => publishedHtml).toContain('OFERTA');
  await expect(main.getByText(/\/player\/html-scene-123456/)).toBeVisible();
});
