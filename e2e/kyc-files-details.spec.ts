import { test, expect } from '@playwright/test';

test('KYC Files Details page loads with data', async ({ page }) => {
  const address = '0xd3AD44Bda0158567461D6FA7eC39E53534e686E9';
  const signature = '0x9f2ab17b008d42b29e085210020962beb0758091866598b7a1a54295d1dec7fa56a6425bd491d31707ef3ee97f6479450a56210ae7408a5c2efde806ac50cf481b';

  const url = `http://localhost:3001/compliance/kyc-files/details?address=${address}&signature=${signature}`;

  await page.goto(url);

  // Wait for authentication to complete and page to fully load
  // The page shows a loading spinner during auth, then renders the table
  await page.waitForTimeout(3000); // Allow time for auth flow

  // Wait for page title
  await expect(page.locator('text=KYC File Details')).toBeVisible({ timeout: 15000 });

  // Wait for loading spinner to disappear (if present)
  await page.waitForSelector('[class*="spinner"]', { state: 'hidden', timeout: 10000 }).catch(() => {});

  // Check table headers exist (with extended timeout for API call)
  await expect(page.getByRole('columnheader', { name: 'Id', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('columnheader', { name: 'AccountId' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();

  // Wait for data to load (should see table rows or "No entries found")
  const hasData = await page.locator('tbody tr').count();
  console.log(`Found ${hasData} rows in table`);

  expect(hasData).toBeGreaterThan(0);
});
