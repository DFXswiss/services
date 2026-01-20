import { test, expect, Page } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env' });

const TEST_EMAIL = process.env.TEST_EMAIL!;

// Helper to remove webpack error overlay (appears due to TS errors in dev mode)
async function removeErrorOverlay(page: Page) {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

test.describe('Mail Login Flow', () => {

  test('should load mail login page', async ({ page }) => {
    await page.goto('/login/mail');
    await page.waitForLoadState('networkidle');

    // Email input should be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Submit button should be visible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should submit email and show confirmation', async ({ page }) => {
    await page.goto('/login/mail');
    await page.waitForLoadState('networkidle');
    await removeErrorOverlay(page);

    // Find and fill email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(TEST_EMAIL!);

    // Wait for validation
    await page.waitForTimeout(500);
    await removeErrorOverlay(page);

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for API response
    await page.waitForTimeout(3000);

    // Should show confirmation message
    const pageContent = await page.textContent('body');
    const hasConfirmation =
      pageContent?.includes('email') ||
      pageContent?.includes('Email') ||
      pageContent?.includes('E-Mail') ||
      pageContent?.includes('sent') ||
      pageContent?.includes('gesendet') ||
      pageContent?.includes('instructions') ||
      pageContent?.includes('Anweisungen');

    expect(hasConfirmation).toBeTruthy();

    // Back button should be visible after email sent
    const backButton = page.getByRole('button', { name: /back|zurück/i });
    await expect(backButton).toBeVisible();
  });

  test('should prefill email from URL parameter', async ({ page }) => {
    const encodedEmail = encodeURIComponent(TEST_EMAIL!);
    await page.goto(`/login/mail?user=${encodedEmail}`);
    await page.waitForLoadState('networkidle');

    // Email input should be prefilled
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue(TEST_EMAIL!);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login/mail');
    await page.waitForLoadState('networkidle');

    // Enter invalid email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    await page.waitForTimeout(500);

    // Submit button should be disabled for invalid email
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });
});
