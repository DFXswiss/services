import { test, expect } from '@playwright/test';
import { createFreshDevSession } from './helpers/fresh-auth';

/**
 * First-time customer opening the mail deep-link must see preferred call times
 * without first choosing "Yes, call me".
 *
 * Uses a fresh (uncached) account each run: a cached session could already have
 * phoneCallAccepted set and would not exercise the first-call UI.
 */
test.describe('Settings preferred call time visibility', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await createFreshDevSession(request);
  });

  test('first-time customer sees Preferred call time on /settings?a=call', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto(`/settings?a=call&session=${token}&lang=en`);

    const heading = page.getByRole('heading', { name: 'Verification Call' });
    await expect(heading).toBeVisible({ timeout: 30000 });
    await heading.scrollIntoViewIfNeeded();

    // Precondition: fresh account has no consent choice yet (placeholder, not Yes/No).
    // If the API ever defaulted phoneCallAccepted, this would fail instead of going vacuum-green.
    const phoneVerification = page.locator('label', { hasText: /^Phone verification$/ }).locator('..');
    await expect(phoneVerification.getByText('Select...')).toBeVisible();

    await expect(page.locator('label', { hasText: /^Preferred call time$/ })).toBeVisible();
  });
});
