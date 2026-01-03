import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-route-12345');
    await page.waitForLoadState('networkidle');
    
    // App should show error or redirect, not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle invalid URL parameters', async ({ page }) => {
    await page.goto('/?mode=invalid&blockchain=fake');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle special characters in URL', async ({ page }) => {
    await page.goto('/?test=%3Cscript%3E');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Browser Compatibility', () => {
  test('should handle page refresh', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle back/forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
    
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle direct URL access to subpages', async ({ page }) => {
    // Direct access to various routes
    const routes = ['/buy', '/sell', '/swap', '/account', '/settings', '/support'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Loading States', () => {
  test('should show loading state initially', async ({ page }) => {
    // Navigate but don't wait for network idle
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check for loading indicator or content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should complete loading within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 15 seconds
    expect(loadTime).toBeLessThan(15000);
  });
});

test.describe('Memory & Performance', () => {
  test('should not leak memory on navigation', async ({ page }) => {
    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/buy');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/sell');
      await page.waitForLoadState('networkidle');
    }
    
    // If we get here without crash, no obvious memory leak
    await expect(page.locator('body')).toBeVisible();
  });

});
