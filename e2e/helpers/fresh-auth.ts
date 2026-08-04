import { APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import { HDNodeWallet } from 'ethers';
import * as path from 'path';
import { generateTestMnemonic } from '../test-wallet';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Same base as e2e/helpers/auth-cache.ts — fail loud if unset (no silent fallback to the dev server).
const apiBase = process.env.REACT_APP_API_URL;
if (!apiBase) {
  throw new Error('REACT_APP_API_URL environment variable is required');
}
const API_URL = apiBase + '/v1';

/**
 * Creates a throwaway Dev-API session (signMessage → signature → /auth).
 * Always fresh — not cached — so phoneCallAccepted stays unset for first-call cases.
 * Prefer this over auth-cache when the test depends on an empty verification-call state.
 */
export async function createFreshDevSession(request: APIRequestContext): Promise<string> {
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
