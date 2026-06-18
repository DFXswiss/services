import { expect, Page, test } from '@playwright/test';

// Self-contained spec: no live API required.
// - The app derives the user role purely from the (client-side decoded) session JWT, so an
//   unsigned but well-formed JWT with role "Admin" lets useRealunitGuard (ADMIN/REALUNIT) pass.
// - All realunit endpoints are intercepted with fixed fixtures to keep the screenshot deterministic.

function base64url(input: string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildAdminJwt(): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      id: 1,
      address: '0x0000000000000000000000000000000000000001',
      role: 'Admin',
      blockchains: ['Ethereum'],
      // far-future expiry so isExpired() is false
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  // Signature is never verified client-side.
  const signature = base64url('test-signature');
  return `${header}.${payload}.${signature}`;
}

const period = (total: number, last30Days: number, last7Days: number) => ({ total, last30Days, last7Days });

const statsFixture = {
  updated: '2024-01-15T10:00:00.000Z',
  growth: {
    accounts: period(1200, 150, 40),
    wallets: period(1800, 220, 60),
  },
  kycFunnel: [
    { step: 'ContactData', reached: period(1000, 120, 30), completed: period(900, 110, 28) },
    { step: 'PersonalData', reached: period(800, 100, 25), completed: period(700, 90, 22) },
    { step: 'Ident', reached: period(600, 80, 20), completed: period(500, 70, 18) },
  ],
  registration: {
    started: period(1000, 130, 35),
    inReview: period(120, 20, 5),
    completed: period(820, 95, 24),
  },
  trading: {
    buyVolumeChf: period(500000, 60000, 15000),
    buyCount: period(300, 40, 10),
    sellVolumeChf: period(200000, 25000, 6000),
    sellCount: period(150, 18, 5),
  },
};

const holdersFixture = {
  holders: [
    { address: '0x1111111111111111111111111111111111111111', balance: '1000', percentage: 25.5 },
    { address: '0x2222222222222222222222222222222222222222', balance: '500', percentage: 12.75 },
    { address: '0x3333333333333333333333333333333333333333', balance: '250', percentage: 6.25 },
  ],
  pageInfo: { endCursor: '', hasNextPage: false, hasPreviousPage: false, startCursor: '' },
  totalCount: 3,
};

const tokenInfoFixture = {
  totalShares: { total: '4000', timestamp: '2024-01-15T10:00:00.000Z', txHash: '0xabc' },
  totalSupply: { value: '4000', timestamp: '2024-01-15T10:00:00.000Z' },
};

const priceHistoryFixture = [
  { timestamp: '2024-01-01T00:00:00.000Z', chf: 1.0, eur: 1.05, usd: 1.1 },
  { timestamp: '2024-01-15T00:00:00.000Z', chf: 1.2, eur: 1.25, usd: 1.3 },
];

async function fulfillJson(
  route: { fulfill: (r: { status: number; contentType: string; body: string }) => Promise<void> },
  body: unknown,
) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

const languagesFixture = [
  { id: 1, symbol: 'DE', name: 'German', foreignName: 'Deutsch', enable: true },
  { id: 2, symbol: 'EN', name: 'English', foreignName: 'English', enable: true },
  { id: 3, symbol: 'FR', name: 'French', foreignName: 'Français', enable: true },
  { id: 4, symbol: 'IT', name: 'Italian', foreignName: 'Italiano', enable: true },
];

const fiatsFixture = [
  { id: 1, name: 'CHF', sell: true, buy: true, enable: true },
  { id: 2, name: 'EUR', sell: true, buy: true, enable: true },
  { id: 3, name: 'USD', sell: true, buy: true, enable: true },
];

const userFixture = {
  accountId: 1,
  activeAddress: {
    address: '0x0000000000000000000000000000000000000001',
    blockchains: ['Ethereum'],
    wallet: 'DFX',
    isCustomer: false,
  },
  addresses: [],
  mail: undefined,
  language: { id: 1, symbol: 'DE', name: 'German', foreignName: 'Deutsch', enable: true },
  currency: { id: 1, name: 'CHF', sell: true, buy: true, enable: true },
  kyc: { level: 0, hash: '', dataComplete: false },
  tradingLimit: { limit: 0, period: 'Day' },
  status: 'Active',
};

async function mockRealunitApi(page: Page): Promise<void> {
  // Catch-all FIRST (lowest priority): any unmatched API call returns an empty object so a missing
  // local backend can never 401 and trigger a session logout / guard redirect. Specific routes below
  // are registered later and therefore take precedence.
  await page.route('**/localhost:3000/**', (route) => fulfillJson(route, {}));

  // RealUnit endpoints used by the screen
  await page.route('**/realunit/admin/stats', (route) => fulfillJson(route, statsFixture));
  await page.route('**/realunit/holders**', (route) => fulfillJson(route, holdersFixture));
  await page.route('**/realunit/tokenInfo', (route) => fulfillJson(route, tokenInfoFixture));
  await page.route('**/realunit/price/history**', (route) => fulfillJson(route, priceHistoryFixture));
  await page.route('**/realunit/price', (route) => fulfillJson(route, priceHistoryFixture[1]));
  await page.route('**/realunit/admin/quotes**', (route) => fulfillJson(route, []));
  await page.route('**/realunit/admin/transactions**', (route) => fulfillJson(route, []));

  // Session/user bootstrap so useRealunitGuard accepts the session and no unhandled 401 occurs
  await page.route('**/v2/user', (route) => fulfillJson(route, userFixture));
  await page.route('**/v2/user/**', (route) => fulfillJson(route, userFixture));
  await page.route(/\/user(\?|$)/, (route) => fulfillJson(route, userFixture));
  await page.route('**/auth/**', (route) => fulfillJson(route, {}));

  // SettingsContext needs a real language list (it reads default.symbol) and currencies.
  await page.route('**/language', (route) => fulfillJson(route, languagesFixture));
  await page.route('**/fiat', (route) => fulfillJson(route, fiatsFixture));

  // Remaining base bootstrap lists -> empty to avoid live API.
  for (const path of ['**/asset**', '**/country**', '**/statistic**']) {
    await page.route(path, (route) => fulfillJson(route, []));
  }
}

test.describe('RealUnit KPI / funnel section', () => {
  test('renders the Key Figures section with summary cards and funnel chart', async ({ page }) => {
    await mockRealunitApi(page);

    const token = buildAdminJwt();
    await page.goto(`/realunit?session=${token}`);
    await page.waitForLoadState('networkidle');

    // Wait for the new section heading to appear. The mocked session resolves the German locale,
    // so the heading renders as "Kennzahlen"; accept the English source string too for robustness.
    const heading = page.getByRole('heading', { name: /Kennzahlen|Key Figures/ });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // The funnel chart (ApexCharts svg) should render.
    await expect(page.locator('.apexcharts-canvas').first()).toBeVisible({ timeout: 15000 });

    // Give the chart animation a moment to settle, then snapshot the section.
    await page.waitForTimeout(1500);

    const section = page.locator('div.mb-6').filter({ has: heading }).first();
    await expect(section).toHaveScreenshot('realunit-kpi-section.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});
