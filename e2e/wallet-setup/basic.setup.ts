/**
 * Basic MetaMask Wallet Setup for Synpress E2E Tests
 *
 * This setup creates a fresh MetaMask wallet for testing.
 */

import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_SEED_PHRASE = process.env.TEST_SEED!;
const WALLET_PASSWORD = 'Tester@1234';

export default defineWalletSetup(WALLET_PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, WALLET_PASSWORD);
  await metamask.importWallet(TEST_SEED_PHRASE);
});

export { WALLET_PASSWORD };
