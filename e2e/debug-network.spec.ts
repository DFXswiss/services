import { test, expect } from '@playwright/test';

test('debug network requests', async ({ page }) => {
  const allRequests: string[] = [];
  const failedRequests: string[] = [];
  
  page.on('request', (request) => {
    allRequests.push(`${request.method()} ${request.url()}`);
  });
  
  page.on('requestfailed', (request) => {
    failedRequests.push(`FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()}: ${response.url()}`);
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Extra warten für API calls
  
  console.log('\n=== ALL REQUESTS ===');
  allRequests.forEach(r => console.log(r));
  
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(r));
  
  console.log('\n=== API REQUESTS ===');
  const apiRequests = allRequests.filter(r => r.includes(process.env.REACT_APP_API_URL || '') || r.includes('/v1/'));
  apiRequests.forEach(r => console.log(r));
});
