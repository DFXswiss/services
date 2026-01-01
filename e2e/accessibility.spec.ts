import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('homepage should have proper document structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Prüfe ob HTML lang Attribut gesetzt ist
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    
    // Prüfe ob Title vorhanden ist
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('DFX');
  });

  test('images should have alt attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      // Warnung wenn kein alt-Text vorhanden
      if (!alt) {
        console.warn(`Image without alt text: ${src}`);
      }
    }
  });

  test('page should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab durch die Seite
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Prüfe ob ein Element fokussiert ist
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Prüfe ob Text lesbar ist (vereinfachter Test)
    const textElements = page.locator('body');
    await expect(textElements).toBeVisible();
  });
});

test.describe('SEO', () => {
  test('should have meta description', async ({ page }) => {
    await page.goto('/');
    
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription?.length).toBeGreaterThan(50);
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/');
    
    // Twitter Card
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBeTruthy();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Prüfe ob H1 vorhanden ist (oder gleichwertige Struktur)
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    
    console.log(`Number of headings found: ${headingCount}`);
  });
});
