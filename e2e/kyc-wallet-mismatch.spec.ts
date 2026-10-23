import { test, expect } from '@playwright/test';

// Utils.isJwt rejects "="
function handbookJwt(): string {
  const enc = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ account: 1, role: 'User' })}.aa`;
}

test('KYC wallet mismatch names the requested address and shows Logout', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' || url.port !== '9') {
      await route.continue();
      return;
    }

    const { pathname } = url;
    const method = route.request().method();
    const fulfill = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (method === 'GET' && (pathname.endsWith('/v1/user') || pathname.endsWith('/v2/user'))) {
      await fulfill({
        accountId: 1,
        accountType: 'Personal',
        language: { id: 1, name: 'English', symbol: 'EN', foreignName: 'English', enable: true },
        currency: {
          id: 1,
          name: 'CHF',
          buyable: true,
          sellable: true,
          cardBuyable: false,
          cardSellable: false,
          instantBuyable: false,
          instantSellable: false,
        },
        tradingLimit: { limit: 0, period: 'Year' },
        kyc: { hash: 'handbook', level: 0, dataComplete: false, preferredPhoneTimes: [] },
        volumes: {
          buy: { total: 0, annual: 0 },
          sell: { total: 0, annual: 0 },
          swap: { total: 0, annual: 0 },
        },
        addresses: [
          {
            wallet: 'DFX',
            address: '0x1111111111111111111111111111111111111111',
            blockchains: ['Ethereum'],
            volumes: {
              buy: { total: 0, annual: 0 },
              sell: { total: 0, annual: 0 },
              swap: { total: 0, annual: 0 },
            },
            isCustody: false,
          },
        ],
        disabledAddresses: [],
        activeAddress: {
          wallet: 'DFX',
          address: '0x1111111111111111111111111111111111111111',
          blockchains: ['Ethereum'],
          volumes: {
            buy: { total: 0, annual: 0 },
            sell: { total: 0, annual: 0 },
            swap: { total: 0, annual: 0 },
          },
          isCustody: false,
        },
        paymentLink: { active: false },
        apiKeyCT: '',
        apiFilterCT: [],
      });
      return;
    }

    if (method === 'GET' && pathname.endsWith('/v1/language')) {
      await fulfill([
        { id: 1, name: 'EN', symbol: 'EN', foreignName: 'EN', enable: true },
        { id: 2, name: 'DE', symbol: 'DE', foreignName: 'DE', enable: true },
        { id: 3, name: 'FR', symbol: 'FR', foreignName: 'FR', enable: true },
        { id: 4, name: 'IT', symbol: 'IT', foreignName: 'IT', enable: true },
      ]);
      return;
    }

    if (method === 'GET' && pathname.endsWith('/v1/setting/infoBanner')) {
      await fulfill(null);
      return;
    }

    if (method === 'GET') {
      await fulfill([]);
      return;
    }

    await fulfill({});
  });

  await page.goto(
    `/kyc?session=${handbookJwt()}&address=0x2222222222222222222222222222222222222222` +
      '&client=Aktionariat&wallet=RealUnit&lang=en&code=handbook',
  );

  await expect(page.locator('body')).toContainText(
    'This page was opened for wallet 0x2222222222222222222222222222222222222222. Sign out and connect that wallet.',
    { timeout: 20000 },
  );
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  await expect(page).toHaveScreenshot('kyc-wallet-mismatch.png', { fullPage: true, animations: 'disabled' });
});
