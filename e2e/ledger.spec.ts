import { expect, Page, Route, test } from '@playwright/test';
import {
  accountDetailFixture,
  accountsEmptyFixture,
  accountsFixture,
  FROZEN_NOW,
  makeAdminJwt,
  marginFixture,
  reconAllOkFixture,
  reconMixedFixture,
  suspenseFixture,
} from './helpers/ledger-fixtures';

/**
 * E2E Visual Regression Tests: Ledger Screens (PR review artefact — NOT run in CI).
 *
 * Unlike compliance.spec.ts these tests need NO live API and NO real login:
 *  1. A forged ADMIN session JWT (helpers/ledger-fixtures.makeAdminJwt) is passed via `?session=`.
 *     The frontend only base64-decodes the payload (auth.context.js) and reads `role`/`exp`, so
 *     useAdminGuard passes without any server round-trip.
 *  2. Every ledger endpoint is page.route-mocked with deterministic synthetic fixtures; all other
 *     /v1/ traffic is aborted so the page reaches networkidle quickly and reproducibly.
 *
 * Determinism: fixed 1280x900 viewport, a frozen wall-clock (addInitScript) so the AgeBadge/"… ago"
 * rendering is stable, ApexCharts animations disabled, CSS transitions/animations killed, and fonts
 * awaited before each snapshot.
 *
 * These specs live under e2e/ (Playwright testDir) and are therefore NOT picked up by jest
 * (react-scripts pins roots to <rootDir>/src). No CI workflow runs Playwright. See PR notes.
 */

const ADMIN_JWT = makeAdminJwt();

// Glob matchers for the exact paths from src/hooks/ledger.hook.ts. Host-agnostic so they match whatever
// REACT_APP_API_URL is baked into the build (localhost:3000 locally).
const LEDGER_ACCOUNTS = '**/v1/dashboard/accounting/ledger/accounts*';
const LEDGER_LEGS = '**/v1/dashboard/accounting/ledger/accounts/*/legs*';
const LEDGER_RECON = '**/v1/dashboard/accounting/ledger/reconciliation*';
const LEDGER_SUSPENSE = '**/v1/dashboard/accounting/ledger/suspense*';
const LEDGER_MARGIN = '**/v1/dashboard/accounting/ledger/margin*';

const SNAPSHOT_OPTS = { fullPage: true, maxDiffPixels: 5000 } as const;
// ApexCharts renders an SVG whose text/anti-aliasing can wobble a hair more than plain DOM, so the chart
// screenshot gets a slightly looser ratio. Disabling Apex animations keeps this comfortably small.
const CHART_SNAPSHOT_OPTS = { fullPage: true, maxDiffPixelRatio: 0.02 } as const;

function fulfillJson(body: unknown) {
  return (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

/**
 * Freeze the clock and disable ApexCharts animations BEFORE any app code runs, so Date.now()/new Date()
 * are constant (stable AgeBadge) and the margin chart renders without entry animation.
 */
async function installDeterminism(page: Page): Promise<void> {
  await page.addInitScript((frozen: number) => {
    const OriginalDate = Date;
    class FrozenDate extends OriginalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(frozen);
        } else {
          // @ts-expect-error forward variadic Date args
          super(...args);
        }
      }
      static now(): number {
        return frozen;
      }
    }
    // @ts-expect-error override global Date
    window.Date = FrozenDate;

    // ApexCharts honours this global before any chart mounts.
    (window as unknown as { Apex: unknown }).Apex = {
      chart: { animations: { enabled: false }, redrawOnParentResize: false },
    };
  }, FROZEN_NOW);
}

/** Kill transitions/animations, hide the CRA error overlay, await fonts, then settle. */
async function stabilize(page: Page): Promise<void> {
  await page.addStyleTag({
    content: [
      '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
      // The CRA runtime-error overlay is rendered into an iframe appended directly under <body>; the ledger
      // screens themselves contain no iframes, so hiding body-level iframes removes the overlay safely.
      'body > iframe{display:none!important}',
    ].join(''),
  });
  // Belt-and-suspenders: also remove any overlay iframe outright in case it sits above the style cascade.
  await page.evaluate(() => {
    document.querySelectorAll('body > iframe').forEach((el) => el.remove());
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

test.use({ viewport: { width: 1280, height: 900 } });

test.describe('Ledger Screens - Visual Regression (no live API)', () => {
  test.beforeEach(async ({ page }) => {
    await installDeterminism(page);
    // Abort any non-mocked API call (the app fires setting/country/asset/v2-user fetches on load) so
    // unrelated background traffic never hangs networkidle. The screens catch their own ledger errors;
    // the CRA dev-server error overlay these aborts would trigger is suppressed in stabilize(). Specific
    // ledger routes registered per-test take precedence (Playwright tries the most-recently-added handler
    // first).
    await page.route('**/v1/**', (route) => route.abort());
    await page.route('**/v2/**', (route) => route.abort());
  });

  test('overview: total assets / liabilities / net equity', async ({ page }) => {
    await page.route(LEDGER_ACCOUNTS, fulfillJson(accountsFixture()));

    await page.goto(`/ledger?session=${ADMIN_JWT}`);
    await expect(page.getByText('Net Equity')).toBeVisible();
    await expect(page.getByText('Bank CHF')).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-01-overview.png', SNAPSHOT_OPTS);
  });

  test('accounts: balance list (all account types)', async ({ page }) => {
    await page.route(LEDGER_ACCOUNTS, fulfillJson(accountsFixture()));

    await page.goto(`/ledger/accounts?session=${ADMIN_JWT}`);
    await expect(page.getByText('Retained Earnings')).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-02-accounts-filled.png', SNAPSHOT_OPTS);
  });

  test('accounts: empty state', async ({ page }) => {
    await page.route(LEDGER_ACCOUNTS, fulfillJson(accountsEmptyFixture()));

    await page.goto(`/ledger/accounts?session=${ADMIN_JWT}`);
    await expect(page.getByText('Apply')).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-03-accounts-empty.png', SNAPSHOT_OPTS);
  });

  test('account detail: T-account with debit/credit + pagination', async ({ page }) => {
    await page.route(LEDGER_LEGS, fulfillJson(accountDetailFixture(100)));

    await page.goto(`/ledger/accounts/100?session=${ADMIN_JWT}`);
    await expect(page.getByText('Opening Balance')).toBeVisible();
    await expect(page.getByText('Customer Deposits CHF').first()).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-04-account-detail.png', SNAPSHOT_OPTS);
  });

  test('reconciliation: all green', async ({ page }) => {
    await page.route(LEDGER_RECON, fulfillJson(reconAllOkFixture()));

    await page.goto(`/ledger/reconciliation?session=${ADMIN_JWT}`);
    await expect(page.getByText('Wallet BTC')).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-05-reconciliation-ok.png', SNAPSHOT_OPTS);
  });

  test('reconciliation: mixed traffic lights (diff / stale / unverified / alarm)', async ({ page }) => {
    await page.route(LEDGER_RECON, fulfillJson(reconMixedFixture()));

    await page.goto(`/ledger/reconciliation?session=${ADMIN_JWT}`);
    await expect(page.getByText('Transit Inbound')).toBeVisible();
    await expect(page.getByText('suspense_alarm')).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-06-reconciliation-mixed.png', SNAPSHOT_OPTS);
  });

  test('suspense: open suspense items', async ({ page }) => {
    await page.route(LEDGER_SUSPENSE, fulfillJson(suspenseFixture()));

    await page.goto(`/ledger/suspense?session=${ADMIN_JWT}`);
    await expect(page.getByText('Total Suspense (CHF)')).toBeVisible();
    await expect(page.getByText('Unmatched incoming transfer').first()).toBeVisible();
    await stabilize(page);

    await expect(page).toHaveScreenshot('ledger-07-suspense.png', SNAPSHOT_OPTS);
  });

  test('margin: realized-margin report (daily series)', async ({ page }) => {
    await page.route(LEDGER_MARGIN, fulfillJson(marginFixture()));

    await page.goto(`/ledger/margin?session=${ADMIN_JWT}`);
    await expect(page.getByText('Total Realized Margin')).toBeVisible();
    // Wait for the chart SVG to be present before snapshotting.
    await expect(page.locator('.apexcharts-svg')).toBeVisible();
    await stabilize(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('ledger-08-margin.png', CHART_SNAPSHOT_OPTS);
  });
});
