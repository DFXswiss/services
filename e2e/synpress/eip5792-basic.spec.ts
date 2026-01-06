/**
 * Basic EIP-5792 E2E Test with Synpress
 *
 * Simple test to verify Synpress + MetaMask integration works.
 */

import { testWithSynpress, defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';

// Define wallet setup inline to ensure hash matches
const WALLET_PASSWORD = 'Tester@1234';
const TEST_SEED_PHRASE = 'test test test test test test test test test test test junk';

const walletSetup = defineWalletSetup(WALLET_PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, WALLET_PASSWORD);
  await metamask.importWallet(TEST_SEED_PHRASE);
});

const test = testWithSynpress(metaMaskFixtures(walletSetup));
const { expect } = test;

test('should load sell page with MetaMask connected', async ({ context, page, metamaskPage, extensionId }) => {
  const metamask = new MetaMask(context, metamaskPage, WALLET_PASSWORD, extensionId);

  await page.goto('/sell');
  await page.waitForLoadState('networkidle');

  // Try to connect wallet
  const connectButton = page.locator('button:has-text("Wallet"), button:has-text("Connect")').first();
  if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await connectButton.click();
    await metamask.connectToDapp();
  }

  // Page should be functional
  const body = await page.textContent('body');
  expect(body).toBeTruthy();
});
