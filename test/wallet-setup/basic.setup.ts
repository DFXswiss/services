/**
 * Basic MetaMask Wallet Setup for Synpress E2E Tests
 *
 * This setup creates a fresh MetaMask wallet for testing.
 * Uses Hardhat's default test seed phrase for deterministic addresses.
 */

import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';

// Hardhat's default test seed phrase - DO NOT use in production!
// This is the standard test seed phrase used by Hardhat/Foundry
const TEST_SEED_PHRASE = 'test test test test test test test test test test test junk';
const WALLET_PASSWORD = 'Tester@1234';

export default defineWalletSetup(WALLET_PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, WALLET_PASSWORD);
  await metamask.importWallet(TEST_SEED_PHRASE);
});

export { WALLET_PASSWORD };
