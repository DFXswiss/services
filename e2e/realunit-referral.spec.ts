import { APIRequestContext, expect, Page, Route, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E Visual Regression Tests: RealUnit staff Referral-admin dashboard
 *
 * Routes:
 *   - /realunit/referral        (relation list — held-for-review filter on by default)
 *   - /realunit/referral/:id    (relation detail — review/reward history + approve/reject/manual-prize)
 *
 * Auth is REAL (same admin-token flow as realunit-compliance.spec.ts): the api must be reachable for
 * `/v1/auth` and the frontend's own user/role fetch. The admin user has the ADMIN role, which
 * `useRealunitGuard` accepts (ADMIN | REALUNIT | COMPLIANCE).
 *
 * Feature data is MOCKED with synthetic fixtures via page.route(...), so the baselines are deterministic
 * AND contain NO real production data. Only the RealUnit-scoped referral-admin endpoint is intercepted;
 * everything else (auth/role/user/settings) is passed through via route.continue().
 *
 * Intercepted endpoints (base `/v1/` is prepended by useApi):
 *   - GET realunit/referral/admin/relations → RealUnitReferralRelation[]
 *   - GET realunit/referral/promo → RealUnitPromoCode[] (empty fixture)
 * The detail screen sources a single relation from that same list (there is no single-relation GET).
 * A green run does not prove the live promo API creates codes.
 *
 * Synthetic fixtures: fake ids (8100+), fixed ISO dates, fake codes/accounts — no production data.
 */

const API_URL = process.env.REACT_APP_API_URL! + '/v1';

// The Pending relation whose detail is screenshotted.
const RELATION_ID = 8101;

function getAdminSeed(): string {
  const apiEnvPath = path.join(__dirname, '../../api/.env');
  if (!fs.existsSync(apiEnvPath)) {
    throw new Error(`API .env file not found at ${apiEnvPath}. Run 'npm run setup' in the API directory first.`);
  }
  const content = fs.readFileSync(apiEnvPath, 'utf8');
  const match = content.match(/^ADMIN_SEED=(.*)$/m);
  if (!match || !match[1]) {
    throw new Error('ADMIN_SEED not found in API .env file. Run "npm run setup" in the API directory first.');
  }
  return match[1];
}

async function getAdminAuth(request: APIRequestContext): Promise<string> {
  const adminSeed = getAdminSeed();
  const credentials = await createTestCredentials(adminSeed);

  const response = await request.post(`${API_URL}/auth`, { data: credentials });
  if (!response.ok()) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`Admin auth failed: ${response.status()} - ${body}`);
  }
  const data = await response.json();
  return data.accessToken;
}

// ---------------------------------------------------------------------------
// Synthetic fixtures (mirror src/dto/realunit-referral.dto.ts RealUnitReferralRelation). Date fields are
// ISO strings over the wire.
// ---------------------------------------------------------------------------
const RELATIONS = [
  {
    id: RELATION_ID,
    kind: 'Invite',
    userId: 8201,
    guestAccountId: 8301,
    referrerAccountId: 8401,
    code: 'AB12CD',
    credited: false,
    created: '2026-08-30T10:00:00.000Z',
    reviewStatus: 'Pending',
    reviewedBy: 'System',
    reviewedAt: '2026-08-30T10:05:00.000Z',
    reviewReason: 'High redemption velocity',
  },
  {
    id: 8102,
    kind: 'Promo',
    userId: 8202,
    code: 'PROMO24',
    credited: false,
    created: '2026-08-31T09:00:00.000Z',
    reviewStatus: 'Pending',
    reviewedBy: 'System',
    reviewedAt: '2026-08-31T09:02:00.000Z',
    reviewReason: 'Manual review threshold reached',
  },
  {
    id: 8103,
    kind: 'Invite',
    userId: 8203,
    code: 'ZZ99YY',
    credited: true,
    created: '2026-08-20T08:00:00.000Z',
    reviewStatus: 'Approved',
    reviewedBy: 'Clerk A',
    reviewedAt: '2026-08-21T08:00:00.000Z',
    reviewReason: 'Legitimate referral',
    manualRewardedBy: 'Clerk A',
    manualRewardedAt: '2026-08-21T08:10:00.000Z',
    manualRewardReason: 'Manual payout after approval',
  },
];

const LIST_RE = /\/v1\/realunit\/referral\/admin\/relations(\?|$)/;
const PROMO_RE = /\/v1\/realunit\/referral\/promo(\?|$)/;

async function json(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockReferralApi(page: Page): Promise<void> {
  await page.route('**/v1/**', async (route: Route) => {
    const url = route.request().url();
    if (LIST_RE.test(url)) return json(route, RELATIONS);
    if (PROMO_RE.test(url) && route.request().method() === 'GET') return json(route, []);
    await route.continue();
  });
}

test.describe('RealUnit Referral admin', () => {
  test('relation list renders held-for-review relations', async ({ page, request }) => {
    const token = await getAdminAuth(request);
    await mockReferralApi(page);

    await page.goto(`/realunit/referral?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Start promo code' })).toBeVisible();
    await expect(page.getByText('AB12CD')).toBeVisible();
    await expect(page.getByText('PROMO24')).toBeVisible();
    // held-for-review filter is on by default → the credited/Approved relation is filtered out
    await expect(page.getByText('ZZ99YY')).not.toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('realunit-referral-01-list.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('relation detail renders history and review actions', async ({ page, request }) => {
    const token = await getAdminAuth(request);
    await mockReferralApi(page);

    await page.goto(`/realunit/referral/${RELATION_ID}?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByText('AB12CD')).toBeVisible();
    await expect(page.getByText('High redemption velocity')).toBeVisible();
    // Pending + not credited → approve/reject offered, manual prize not
    await expect(page.getByText('Approve', { exact: true })).toBeVisible();
    await expect(page.getByText('Reject', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('realunit-referral-02-detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
