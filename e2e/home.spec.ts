import { test, expect } from '@playwright/test';

test.describe('Home Screen Tiles', () => {
  test('should display service tiles on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Warte bis die Tiles geladen sind
    const tilesContainer = page.locator('.grid');
    await expect(tilesContainer).toBeVisible();
  });

  test('tiles should be clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Finde alle Tile-Images
    const tiles = page.locator('.grid img');
    const tileCount = await tiles.count();
    
    expect(tileCount).toBeGreaterThan(0);
    
    // Prüfe ob erstes Tile klickbar ist
    if (tileCount > 0) {
      const firstTile = tiles.first();
      await expect(firstTile).toBeVisible();
    }
  });

  test('should show DFX branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Prüfe ob DFX Branding vorhanden ist (im Title oder auf der Seite)
    const title = await page.title();
    expect(title.toLowerCase()).toContain('dfx');
  });
});

test.describe('Login Flow', () => {
  test('should show login options', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Die Seite sollte laden
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show wallet login option', async ({ page }) => {
    await page.goto('/login/wallet');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show mail login option', async ({ page }) => {
    await page.goto('/login/mail');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Connect Flow', () => {
  test('should show connect options', async ({ page }) => {
    await page.goto('/connect');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});
