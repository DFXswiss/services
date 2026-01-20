import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Account page screenshots
 *
 * Takes screenshots of account pages for two test addresses
 *
 * Required env vars: TEST_ADDRESS_1, TEST_SIGNATURE_1, TEST_ADDRESS_2, TEST_SIGNATURE_2, REACT_APP_PUBLIC_URL
 */

const TEST_ADDRESS_1 = process.env.TEST_ADDRESS_1!;
const TEST_SIGNATURE_1 = process.env.TEST_SIGNATURE_1!;
const TEST_ADDRESS_2 = process.env.TEST_ADDRESS_2!;
const TEST_SIGNATURE_2 = process.env.TEST_SIGNATURE_2!;
const BASE_URL = process.env.REACT_APP_PUBLIC_URL!;

async function waitForAppLoaded(page: Page, timeout = 30000): Promise<void> {
  await page.waitForFunction(
    () => {
      const body = (document.body?.textContent || '').toLowerCase();
      const hasLoading = body.includes('loading ...');
      const hasContent =
        body.includes('konto') || body.includes('account') || body.includes('kyc') || body.includes('aktive adresse');
      return !hasLoading && hasContent;
    },
    { timeout },
  );
  await page.waitForTimeout(1000);
}

test.describe('Dev Account Screenshots', () => {
  test('capture account pages for both test addresses', async ({ page }) => {
    // Account 1
    await page.goto(`${BASE_URL}/account?address=${TEST_ADDRESS_1}&signature=${TEST_SIGNATURE_1}`);
    await page.waitForLoadState('networkidle');
    await waitForAppLoaded(page);
    await page.screenshot({ path: 'e2e/screenshots/dev-account-1.png', fullPage: true });

    const bodyText1 = (await page.textContent('body'))?.toLowerCase() || '';
    expect(bodyText1).toContain('konto');

    // Account 2
    await page.goto(`${BASE_URL}/account?address=${TEST_ADDRESS_2}&signature=${TEST_SIGNATURE_2}`);
    await page.waitForLoadState('networkidle');
    await waitForAppLoaded(page);
    await page.screenshot({ path: 'e2e/screenshots/dev-account-2.png', fullPage: true });

    const bodyText2 = (await page.textContent('body'))?.toLowerCase() || '';
    expect(bodyText2).toContain('konto');
  });
});
