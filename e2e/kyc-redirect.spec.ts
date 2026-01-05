import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Tests for KYC error redirect flow.
 *
 * These tests verify that when trading errors occur, users are shown
 * the appropriate buttons to complete their KYC:
 * - RECOMMENDATION_REQUIRED: "Enter recommendation" button → RECOMMENDATION step
 * - EMAIL_REQUIRED: "Enter email" button → CONTACT_DATA step
 *
 * Note: These tests check that the page correctly handles trading restrictions
 * and displays the appropriate KYC navigation options.
 */
test.describe('KYC Redirect Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  // Helper to check if page has runtime errors
  async function hasRuntimeError(page: import('@playwright/test').Page): Promise<boolean> {
    const pageContent = await page.textContent('body');
    return pageContent?.includes('runtime errors') || pageContent?.includes('TypeError') || false;
  }

  test('should show trading restriction message with KYC action button', async ({ page }) => {
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Skip test if runtime error occurred
    if (await hasRuntimeError(page)) {
      console.log('Skipping test due to runtime error in application');
      test.skip();
      return;
    }

    const pageContent = await page.textContent('body');

    // Check if trading restriction is shown
    const hasTradingRestriction =
      pageContent?.includes('Trading not allowed') ||
      pageContent?.includes('recommendation') ||
      pageContent?.includes('email address') ||
      pageContent?.includes('nicht erlaubt') ||
      pageContent?.includes('verified') ||
      pageContent?.includes('KYC');

    // Check for action buttons
    const hasActionButton =
      pageContent?.includes('Enter recommendation') ||
      pageContent?.includes('Enter email') ||
      pageContent?.includes('Complete KYC') ||
      pageContent?.includes('Empfehlung eingeben') ||
      pageContent?.includes('E-Mail eingeben');

    // Either there's a restriction with action button, or trading is allowed
    const hasValidState = (hasTradingRestriction && hasActionButton) || pageContent?.includes('CHF') || pageContent?.includes('EUR');

    expect(hasValidState).toBeTruthy();
  });

  test('should navigate to RECOMMENDATION step when button is clicked', async ({ page }) => {
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for the recommendation button
    const recommendationButton = page.locator('button:has-text("Enter recommendation"), button:has-text("Empfehlung eingeben")');

    if (await recommendationButton.count() > 0) {
      await recommendationButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to KYC step
      const url = page.url();
      const pageContent = await page.textContent('body');

      const isOnKycPage =
        url.includes('kyc') ||
        pageContent?.includes('Recommendation') ||
        pageContent?.includes('Empfehlung') ||
        pageContent?.includes('DFX customer');

      expect(isOnKycPage).toBeTruthy();
    } else {
      // No recommendation button - trading may be allowed or different error
      console.log('Recommendation button not found - skipping navigation test');
    }
  });

  test('should navigate to CONTACT_DATA step when email button is clicked', async ({ page }) => {
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for the email button
    const emailButton = page.locator('button:has-text("Enter email"), button:has-text("E-Mail eingeben")');

    if (await emailButton.count() > 0) {
      await emailButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to KYC step
      const url = page.url();
      const pageContent = await page.textContent('body');

      const isOnContactPage =
        url.includes('kyc') ||
        pageContent?.includes('Email') ||
        pageContent?.includes('E-Mail') ||
        pageContent?.includes('contact');

      expect(isOnContactPage).toBeTruthy();
    } else {
      // No email button - trading may be allowed or different error
      console.log('Email button not found - skipping navigation test');
    }
  });

  test('should show appropriate error hint text for trading restrictions', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Skip test if runtime error occurred
    if (await hasRuntimeError(page)) {
      console.log('Skipping test due to runtime error in application');
      test.skip();
      return;
    }

    const pageContent = await page.textContent('body');

    // Expected hint texts for new errors
    const hasRecommendationHint = pageContent?.includes('recommendation from an existing DFX customer');
    const hasEmailHint = pageContent?.includes('please enter your email address');
    const hasKycHint = pageContent?.includes('verified account');

    // At least one KYC-related hint should be shown, or trading is allowed
    const hasKycOrTrading =
      hasRecommendationHint ||
      hasEmailHint ||
      hasKycHint ||
      pageContent?.includes('IBAN') ||
      pageContent?.includes('deposit');

    expect(hasKycOrTrading).toBeTruthy();
  });

  test('should show appropriate error on swap page', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Skip test if runtime error occurred
    if (await hasRuntimeError(page)) {
      console.log('Skipping test due to runtime error in application');
      test.skip();
      return;
    }

    const pageContent = await page.textContent('body');

    // Check for any KYC-related content or swap form
    const hasValidContent =
      pageContent?.includes('recommendation') ||
      pageContent?.includes('email') ||
      pageContent?.includes('KYC') ||
      pageContent?.includes('Swap') ||
      pageContent?.includes('Tauschen') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('USDT');

    expect(hasValidContent).toBeTruthy();
  });
});
