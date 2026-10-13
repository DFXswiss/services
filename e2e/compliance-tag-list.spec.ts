import { test, expect, APIRequestContext, Page, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E Visual Regression Tests: Compliance Tag list page
 *
 * Route: /compliance?tag=…
 *
 * Auth is REAL (same admin-token flow as compliance-recommendation-graph.spec.ts): the api must be
 * reachable for `/v1/auth` and the frontend's own user/role fetch.
 *
 * Data is MOCKED with synthetic fixtures via page.route(...), so the baselines are deterministic AND
 * contain NO real production data. Only the tagged-users endpoint is intercepted:
 *   - GET support/tag/<tag>
 * Everything else (the real auth/role/user fetch) is passed through via route.continue().
 *
 * Synthetic fixtures (fake ids 9100+, fake names, example.com mails):
 *   - Personal KYC level 50, kycStatus Completed
 *   - Organization KYC level 20
 *   - kycStatus Check (red row)
 *   - row without mail
 * Empty-state test returns userDatas [].
 * Not-found test returns HTTP 404 {"statusCode":404,"message":"Tag not found"}.
 */

const API_URL = process.env.REACT_APP_API_URL! + '/v1';

/**
 * Read ADMIN_SEED from the API .env file
 */
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

/**
 * Authenticate with admin credentials
 */
async function getAdminAuth(request: APIRequestContext): Promise<string> {
  const adminSeed = getAdminSeed();
  const credentials = await createTestCredentials(adminSeed);

  const response = await request.post(`${API_URL}/auth`, {
    data: credentials,
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`Admin auth failed: ${response.status()} - ${body}`);
  }

  const data = await response.json();
  return data.accessToken;
}

// ---------------------------------------------------------------------------
// Synthetic fixtures (mirror ComplianceSearchResult / UserSearchResult)
// ---------------------------------------------------------------------------

type TagUserFixture = {
  id: number;
  kycStatus: string;
  kycLevel?: number;
  accountType?: string;
  mail?: string;
  name?: string;
};

type TagListFixture = {
  type: 'Tag';
  userDatas: TagUserFixture[];
  bankTx: unknown[];
};

const LOADED_FIXTURE: TagListFixture = {
  type: 'Tag',
  userDatas: [
    {
      id: 9101,
      kycStatus: 'Completed',
      kycLevel: 50,
      accountType: 'Personal',
      mail: 'ada@example.com',
      name: 'Ada Example',
    },
    {
      id: 9102,
      kycStatus: 'Completed',
      kycLevel: 20,
      accountType: 'Organization',
      mail: 'bea-org@example.com',
      name: 'Bea Company',
    },
    {
      id: 9103,
      kycStatus: 'Check',
      kycLevel: 30,
      accountType: 'Personal',
      mail: 'cara@example.com',
      name: 'Cara Check',
    },
    {
      id: 9104,
      kycStatus: 'Completed',
      kycLevel: 50,
      accountType: 'Personal',
      name: 'Dana Nomail',
    },
  ],
  bankTx: [],
};

const EMPTY_FIXTURE: TagListFixture = {
  type: 'Tag',
  userDatas: [],
  bankTx: [],
};

const TAG_RE = /\/v1\/support\/tag\//;

async function installTagRoute(page: Page, body: unknown, status = 200): Promise<void> {
  await page.route('**/v1/**', async (route: Route) => {
    const url = route.request().url();

    if (TAG_RE.test(url) && route.request().method() === 'GET') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
      return;
    }

    // everything else (auth, role, user) hits the real api
    await route.continue();
  });
}

async function gotoList(page: Page, token: string): Promise<void> {
  await page.goto(`/compliance?tag=example&session=${token}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('Compliance Tag list - Visual Regression Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  test('1. loaded list shows tagged customers including a red Check row', async ({ page }) => {
    await installTagRoute(page, LOADED_FIXTURE);

    await gotoList(page, token);

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Ada Example')).toBeVisible();
    await expect(page.getByText('Bea Company')).toBeVisible();
    await expect(page.getByText('Cara Check')).toBeVisible();
    await expect(page.getByText('Dana Nomail')).toBeVisible();

    await expect(page).toHaveScreenshot('compliance-tag-list-01-loaded.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('2. empty state', async ({ page }) => {
    await installTagRoute(page, EMPTY_FIXTURE);

    await gotoList(page, token);

    await expect(page.getByText('No entries found')).toBeVisible();

    await expect(page).toHaveScreenshot('compliance-tag-list-02-empty.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('3. unknown tag', async ({ page }) => {
    await installTagRoute(page, { statusCode: 404, message: 'Tag not found' }, 404);

    await gotoList(page, token);

    await expect(page.getByText('Tag not found')).toBeVisible();

    await expect(page).toHaveScreenshot('compliance-tag-list-03-not-found.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });
});
