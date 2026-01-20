import { test, expect } from '@playwright/test';

/**
 * Test: Session switch when logging in with different address
 *
 * Required env vars: TEST_ADDRESS_1, TEST_SIGNATURE_1, TEST_ADDRESS_2, TEST_SIGNATURE_2, REACT_APP_PUBLIC_URL
 */

const TEST_ADDRESS_1 = process.env.TEST_ADDRESS_1!;
const TEST_SIGNATURE_1 = process.env.TEST_SIGNATURE_1!;
const TEST_ADDRESS_2 = process.env.TEST_ADDRESS_2!;
const TEST_SIGNATURE_2 = process.env.TEST_SIGNATURE_2!;
const BASE_URL = process.env.REACT_APP_PUBLIC_URL!;

test('Session switch when logging in with different address', async ({ page, context }) => {
  // Clear cookies/storage to start fresh
  await context.clearCookies();
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Login with Account 1
  await page.goto(BASE_URL + '/account?address=' + TEST_ADDRESS_1 + '&signature=' + TEST_SIGNATURE_1);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e/screenshots/bug-session-1-account1.png', fullPage: true });

  // Now login with Account 2
  await page.goto(BASE_URL + '/account?address=' + TEST_ADDRESS_2 + '&signature=' + TEST_SIGNATURE_2);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e/screenshots/bug-session-2-account2.png', fullPage: true });

  const body2 = (await page.textContent('body')) || '';
  const hasAddr2 = body2.includes('B18f08');
  const stillAddr1 = body2.includes('d3AD44');

  // After login with Account 2, we should see Account 2's address, not Account 1's
  expect(hasAddr2, 'Account 2 address should be visible').toBeTruthy();
  expect(stillAddr1, 'Account 1 should NOT still be visible').toBeFalsy();
});
