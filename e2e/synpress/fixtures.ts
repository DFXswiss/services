/**
 * Synpress Test Fixtures
 *
 * Reusable fixtures for EIP-5792 E2E tests with MetaMask.
 */

import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup, { WALLET_PASSWORD } from '../../test/wallet-setup/basic.setup';

// Create base test with Synpress and MetaMask fixtures
export const test = testWithSynpress(metaMaskFixtures(basicSetup));

// Extended test with pre-configured MetaMask instance
export const testWithMetaMask = test.extend<{ metamask: MetaMask }>({
  metamask: async ({ context, metamaskPage, extensionId }, use) => {
    const metamask = new MetaMask(context, metamaskPage, WALLET_PASSWORD, extensionId);
    await use(metamask);
  },
});

export const { expect } = test;

// Chain configurations for multi-chain testing
export const SUPPORTED_CHAINS = [
  { name: 'Ethereum', chainId: 1, chainHex: '0x1' },
  { name: 'Optimism', chainId: 10, chainHex: '0xa' },
  { name: 'Polygon', chainId: 137, chainHex: '0x89' },
  { name: 'Arbitrum', chainId: 42161, chainHex: '0xa4b1' },
  { name: 'Base', chainId: 8453, chainHex: '0x2105' },
  { name: 'BinanceSmartChain', chainId: 56, chainHex: '0x38' },
  { name: 'Gnosis', chainId: 100, chainHex: '0x64' },
];

/**
 * Helper to connect wallet to the DFX app
 */
export async function connectWallet(
  page: any,
  metamask: MetaMask,
): Promise<void> {
  const connectButton = page.locator('button:has-text("Wallet"), button:has-text("Connect"), button:has-text("Verbinden")').first();

  if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await connectButton.click();
    await metamask.connectToDapp();
    await page.waitForTimeout(2000);
  }
}

/**
 * Helper to initiate a sell transaction
 */
export async function initiateSellTransaction(
  page: any,
  amount: string,
): Promise<void> {
  // Find amount input
  const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
  if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await amountInput.fill(amount);
    await page.waitForTimeout(1000);
  }

  // Click transaction button
  const txButton = page
    .locator('button:has-text("Transaktion"), button:has-text("Sell"), button:has-text("Verkaufen")')
    .first();

  if (await txButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await txButton.click();
  }
}
