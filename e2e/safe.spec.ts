import { expect, test } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: DFX Safe screen
 *
 * Documents the full Safe feature surface (`/safe`) with numbered screenshots for
 * code-review diffs. Not a CI regression gate — see CONTRIBUTING.md.
 *
 * Every screenshot is a distinct state. Two states are deliberately NOT captured
 * separately because they are already contained in the shots below:
 * - "Deposit / Fiat" is the initial state of the transaction interface and is therefore
 *   visible in 01-03.
 * - The "Recent Activity" list sits below the interface and is visible in every shot.
 */

test.describe('DFX Safe - Full Baseline Coverage', () => {
  // The Safe screen scrolls inside an overflow-auto container, so `fullPage` still only
  // captures the viewport. A taller viewport puts the portfolio, the transaction interface
  // and the activity list on one image — without it the form shots show only the portfolio.
  test.use({ viewport: { width: 1280, height: 1800 } });

  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('Safe screen portfolio, tabs, history and PDF modal', async ({ page }) => {
    // Small tolerance for anti-aliasing only. Deliberately not a large budget: these
    // screenshots document the feature, so a content change has to show up as a diff.
    const screenshotOpts = { fullPage: true, maxDiffPixels: 200, timeout: 10000 } as const;

    // Pin time before navigating. The PDF modal prefills the current date via `new Date()`
    // (safe.screen.tsx), which would otherwise bake a moving value into the committed baseline.
    await page.clock.setFixedTime(new Date('2026-06-15T12:00:00Z'));

    // ========================================
    // STEP 1: Loaded Safe portfolio (EUR), transaction interface and activity list
    // ========================================
    await page.goto(`/safe?session=${token}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Total portfolio value')).toBeVisible();
    await expect(page.getByText('Assets')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ZCHF|dEURO|ETH/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deposit', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('01-safe-portfolio.png', screenshotOpts);

    // ========================================
    // STEP 2: Currency switch -> CHF
    // ========================================
    await page.getByRole('button', { name: 'CHF', exact: true }).click();
    await expect(page.locator('span.text-base', { hasText: 'CHF' })).toBeVisible();

    await expect(page).toHaveScreenshot('02-safe-portfolio-chf.png', screenshotOpts);

    // ========================================
    // STEP 3: Currency switch -> USD
    // ========================================
    await page.getByRole('button', { name: 'USD', exact: true }).click();
    await expect(page.locator('span.text-base', { hasText: 'USD' })).toBeVisible();

    await expect(page).toHaveScreenshot('03-safe-portfolio-usd.png', screenshotOpts);

    // ========================================
    // STEP 4: Deposit, type Crypto (receive interface)
    // ========================================
    // note: the QR code and payment address only appear once an asset and amount are set and
    // a receive order exists. Documented here is the reachable form itself.
    await page.getByRole('button', { name: 'Deposit', exact: true }).click();
    await page.getByRole('button', { name: 'Crypto', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.getByText('Asset', { exact: true }).first()).toBeVisible();

    await expect(page).toHaveScreenshot('04-safe-deposit-crypto.png', screenshotOpts);

    // ========================================
    // STEP 5: Withdraw, type Fiat
    // ========================================
    await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
    await page.getByRole('button', { name: 'Fiat', exact: true }).click();
    await expect(page.getByText('Type:')).toBeVisible();
    await expect(page.getByText('Amount').first()).toBeVisible();

    await expect(page).toHaveScreenshot('05-safe-withdraw-fiat.png', screenshotOpts);

    // ========================================
    // STEP 6: Withdraw, type Crypto (send interface)
    // ========================================
    await page.getByRole('button', { name: 'Crypto', exact: true }).click();
    await expect(page.getByText('Destination address').first()).toBeVisible();
    await expect(page.getByText('Click here to confirm the withdrawal')).toBeVisible();

    await expect(page).toHaveScreenshot('06-safe-withdraw-crypto.png', screenshotOpts);

    // ========================================
    // STEP 7: Swap interface
    // ========================================
    await page.getByRole('button', { name: 'Swap', exact: true }).click();
    await expect(page.getByText('You spend')).toBeVisible();
    await expect(page.getByText('You get about')).toBeVisible();

    await expect(page).toHaveScreenshot('07-safe-swap.png', screenshotOpts);

    // ========================================
    // STEP 8: PDF / statement date-selection modal
    // ========================================
    await page.getByTitle('Download PDF').click();
    await expect(page.getByRole('heading', { name: 'Download PDF' })).toBeVisible();
    await expect(page.getByText('Select a date for your portfolio report')).toBeVisible();
    // 'Download' alone also matches the 'Download PDF' trigger button, so match exactly
    await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    await expect(page).toHaveScreenshot('08-safe-pdf-modal.png', screenshotOpts);
  });
});
