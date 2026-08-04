import { test, expect, APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import { HDNodeWallet } from 'ethers';
import * as path from 'path';
import { generateTestMnemonic } from './test-wallet';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = `${process.env.REACT_APP_API_URL ?? ''}/v1`;

/**
 * Creates a throwaway account on the Dev API (same signMessage → signature → /auth
 * flow as e2e/helpers/auth-cache.ts), so phoneCallAccepted is unset — the first-call case.
 */
async function createFreshDevSession(request: APIRequestContext): Promise<string> {
  const mnemonic = generateTestMnemonic();
  const wallet = HDNodeWallet.fromPhrase(mnemonic);

  const signMsgRes = await request.get(`${API_URL}/auth/signMessage?address=${encodeURIComponent(wallet.address)}`, {
    ignoreHTTPSErrors: true,
  });
  if (!signMsgRes.ok()) {
    const body = await signMsgRes.text().catch(() => 'unknown');
    throw new Error(`signMessage failed with status ${signMsgRes.status()}: ${body}`);
  }
  const { message } = await signMsgRes.json();
  const signature = await wallet.signMessage(message);

  const authRes = await request.post(`${API_URL}/auth`, {
    data: { address: wallet.address, signature },
    ignoreHTTPSErrors: true,
  });
  if (!authRes.ok()) {
    const body = await authRes.text().catch(() => 'unknown');
    throw new Error(`Auth failed with status ${authRes.status()}: ${body}`);
  }
  const data = await authRes.json();
  if (!data?.accessToken) {
    throw new Error(`Auth response missing accessToken: ${JSON.stringify(data)}`);
  }
  return data.accessToken as string;
}

/**
 * First-time customer opening the mail deep-link must see preferred call times
 * without first choosing "Yes, call me".
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
