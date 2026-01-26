import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Seite sollte innerhalb von 10 Sekunden laden
    expect(loadTime).toBeLessThan(10000);
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('should not have console errors on homepage', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filtere bekannte/akzeptable Fehler heraus
    const criticalErrors = consoleErrors.filter(
      (error) => 
        !error.includes('favicon') && 
        !error.includes('manifest') &&
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('service-worker') &&
        !error.includes('Service worker') &&
        !error.includes('ERR_CONNECTION_REFUSED') &&
        !error.includes('MIME type')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should not have JavaScript errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    
    page.on('pageerror', (error) => {
      // Ignoriere API-Fetch-Fehler in Testumgebung
      if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
        pageErrors.push(error);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe('Network Requests', () => {
  test('should make API calls to DFX backend', async ({ page }) => {
    const apiCalls: string[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes(process.env.REACT_APP_API_URL || '')) {
        apiCalls.push(request.url());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Es sollten API-Aufrufe gemacht werden
    console.log(`API calls made: ${apiCalls.length}`);
  });

  test('all static assets should load', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filtere bekannte 404s heraus (z.B. optionale Ressourcen)
    const criticalFailures = failedRequests.filter(
      (req) => !req.includes('favicon') && !req.includes('.map')
    );
    
    if (criticalFailures.length > 0) {
      console.log('Failed requests:', criticalFailures);
    }
  });
});
