import { test, expect } from '@playwright/test';

test.describe('Digital Signage Enterprise App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should allow admin user to login and see the dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@empresa.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page.locator('h1:has-text("Dashboard General")')).toBeVisible();
  });

  test('should allow marketing user to login and see the dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', 'marketing@empresa.com');
    await page.fill('input[type="password"]', 'marketing123');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page.locator('h1:has-text("Dashboard General")')).toBeVisible();
  });

  test('should navigate to different views when clicking on sidebar items', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@empresa.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Iniciar Sesión")');

    await page.click('button:has-text("Pantallas Signage")');
    await expect(page.locator('h1:has-text("Pantallas Digital Signage")')).toBeVisible();

    await page.click('button:has-text("Kioscos")');
    await expect(page.locator('h1:has-text("Kioscos Interactivos")')).toBeVisible();

    await page.click('button:has-text("Dashboards BI")');
    await expect(page.locator('h1:has-text("Dashboards BI")')).toBeVisible();
  });

  test('should create and delete a new signage screen', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@empresa.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Iniciar Sesión")');

    await page.click('button:has-text("Pantallas Signage")');
    await page.click('button:has-text("Nueva Pantalla")');

    await expect(page.locator('h3:has-text("Nueva Digital Signage 3")')).toBeVisible();

    page.on('dialog', dialog => dialog.accept());
    await page.locator('h3:has-text("Nueva Digital Signage 3")').locator('..').locator('..').locator('button:has-text("Trash2")').click();
  });

  test('should logout the user', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@empresa.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Iniciar Sesión")');

    await page.click('button:has-text("Cerrar Sesión")');

    await expect(page.locator('h1:has-text("Digital Signage PRO")')).toBeVisible();
  });
});
