/**
 * Deterministic regressions for screen-settled waits.
 *
 * Holds delivery of real API responses (route.fetch → gate → fulfill of that same body).
 * Does not invent success payloads. Declared in docs/test-architecture.md before these holds
 * were added. Old code fails these: KYC denial asserted during load; hub re-nav aborts held GETs.
 */

import type { Page } from '@playwright/test';
import {
  createKycStep,
  createUser,
  expect,
  fulfillRealResponseAfterGate,
  gotoWithSession,
  isKycFileMetadataUrl,
  loginAs,
  normPath,
  openScreen,
  queryOne,
  settleFinancialHubDestination,
  test,
  waitForFinancialDestinationRequests,
  waitForKycFileMetadataResponse,
  waitForKycFileScreenSettled,
  waitForRow,
} from './fixtures';

function apiBase(): string {
  return process.env.E2E_API_URL ?? 'http://api:3000';
}

const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function kycHashOf(userDataId: number): Promise<string> {
  const row = await queryOne<{ kycHash: string }>(`SELECT "kycHash" FROM user_data WHERE id = $1`, [userDataId]);
  if (!row?.kycHash) throw new Error(`user_data.kycHash missing for userDataId ${userDataId}`);
  return row.kycHash;
}

/** Same real upload path as kyc.spec.ts — lands a real kyc_file row for /file/:id. */
async function uploadRealAdditionalDocument(
  userDataId: number,
  kycHash: string,
  tag: string,
): Promise<void> {
  const step = await createKycStep(userDataId, { name: 'AdditionalDocuments', sequenceNumber: 910 });
  const res = await fetch(`${apiBase()}/v2/kyc/data/additional/${step.kycStepId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-kyc-code': kycHash },
    body: JSON.stringify({
      file: `data:image/png;base64,${TEST_PNG_BASE64}`,
      fileName: `${tag}.png`,
    }),
  });
  if (!res.ok) {
    throw new Error(`PUT /v2/kyc/data/additional/${step.kycStepId} failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Staff roles need KYC clearance before RoleGuard allows guarded APIs.
 * loginAs sets verifiedName; the in-memory staffKycClearance set syncs asynchronously from the
 * setting row. Do not rely on dashboard-financial.spec.ts having run first.
 */
async function ensureStaffKycClearance(userDataId: number, roleLabel: string): Promise<void> {
  await queryOne('UPDATE user_data SET "verifiedName" = $1 WHERE id = $2', [`E2E ${roleLabel} Clearance`, userDataId]);

  const timeoutMs = 75_000;
  const intervalMs = 3_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const row = await queryOne<{ value: string | unknown }>('SELECT value FROM setting WHERE key = $1', [
      'staffKycClearance',
    ]);
    if (row?.value != null) {
      const raw = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
      let ids: unknown;
      try {
        ids = JSON.parse(raw);
      } catch {
        ids = row.value;
      }
      if (Array.isArray(ids) && ids.some((id) => Number(id) === userDataId)) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `ensureStaffKycClearance: userDataId ${userDataId} not in staffKycClearance setting within ${timeoutMs}ms`,
  );
}

function attachErrorListeners(page: Page): { pageErrors: string[]; consoleErrors: string[] } {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => {
    pageErrors.push(String(err));
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  return { pageErrors, consoleErrors };
}

function assertNoErrors(pageErrors: string[], consoleErrors: string[]): void {
  const unexpected = consoleErrors.filter(
    (msg) => !/^Failed to load resource: the server responded with a status of 4\d\d/.test(msg),
  );
  expect(pageErrors, `uncaught pageerror: ${pageErrors.join('; ')}`).toEqual([]);
  expect(unexpected, `unexpected console error: ${unexpected.join('; ')}`).toEqual([]);
}

/** Idempotent hold-gate release; marks released before resolving so premature-ready checks are trustworthy. */
function createHoldGate(): { gate: Promise<void>; release: () => void; isReleased: () => boolean } {
  let holdReleased = false;
  let resolveGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve;
  });
  return {
    gate,
    isReleased: () => holdReleased,
    release: () => {
      if (holdReleased) return;
      holdReleased = true;
      resolveGate();
    },
  };
}

test.describe('Screen-sync regressions (held real API delivery)', () => {
  test('KYC file authorization outcome is not concluded while metadata GET delivery is held', async ({
    page,
  }) => {
    const owner = await createUser({ tag: 'sync-file-owner', kycLevel: 0, language: 'EN' });
    const ownerHash = await kycHashOf(owner.userDataId);
    await uploadRealAdditionalDocument(owner.userDataId, ownerHash, 'sync-owner-doc');

    const fileRow = await waitForRow<{ uid: string }>(
      `SELECT uid FROM kyc_file WHERE "userDataId" = $1 ORDER BY id DESC LIMIT 1`,
      [owner.userDataId],
      15000,
    );

    const stranger = await createUser({ tag: 'sync-file-stranger', kycLevel: 0, language: 'EN' });
    const { pageErrors, consoleErrors } = attachErrorListeners(page);

    const { gate, release, isReleased } = createHoldGate();
    let fetched = false;
    let routeHandled: Promise<void> | undefined;

    await page.route(`**/v2/kyc/file/${fileRow.uid}*`, async (route) => {
      if (route.request().method() !== 'GET' || !isKycFileMetadataUrl(route.request().url(), fileRow.uid)) {
        await route.fallback();
        return;
      }
      fetched = true;
      routeHandled = fulfillRealResponseAfterGate(route, gate);
      await routeHandled;
    });

    try {
      const metadata = waitForKycFileMetadataResponse(page, fileRow.uid);
      // Attach rejection handling immediately — test may fail before these are awaited.
      metadata.catch(() => undefined);

      // gotoWithSession — not openScreen — so a held spinner cannot trip openScreen's 15s detach wait.
      await gotoWithSession(page, `/file/${fileRow.uid}`, stranger.jwt);

      await expect.poll(() => fetched, { message: 'metadata GET must reach the hold gate' }).toBe(true);

      let settledEarly = false;
      const settledPromise = waitForKycFileScreenSettled(page).then((state) => {
        // Gate-release flag, not post-fulfill — browser may render before route.fulfill settles.
        if (!isReleased()) settledEarly = true;
        return state;
      });
      settledPromise.catch(() => undefined);

      // Hazard the old assertion relied on: View file is absent during load.
      await expect(page.getByRole('button', { name: 'View file' })).toHaveCount(0);
      // Observable Playwright roundtrip so an immediately-resolving settled helper flips settledEarly.
      await page.evaluate(() => true);
      expect(isReleased(), 'hold gate must still be closed while View file is absent').toBe(false);
      expect(settledEarly, 'terminal UI wait must not resolve before hold gate release').toBe(false);

      release();
      await metadata;
      if (routeHandled) await routeHandled;
      const settled = await settledPromise;

      expect(settledEarly).toBe(false);
      // Product currently serves the stranger the file; once access is fixed this becomes 'error'.
      // Either way the wait must not have concluded during the hold.
      expect(settled === 'file' || settled === 'error').toBe(true);
      if (settled === 'file') {
        await expect(page.getByRole('button', { name: 'View file' })).toBeVisible();
      }
      assertNoErrors(pageErrors, consoleErrors);
    } finally {
      release();
    }
  });

  test('financial hub Live tile does not abort a held destination latest GET', async ({ page }) => {
    const { jwt, wallet } = await loginAs('Admin');
    const userRow = await queryOne<{ userDataId: number }>('SELECT "userDataId" FROM "user" WHERE address = $1', [
      wallet.address,
    ]);
    if (userRow?.userDataId == null) {
      throw new Error(`no userDataId for Admin wallet ${wallet.address}`);
    }
    await ensureStaffKycClearance(userRow.userDataId, 'Admin');

    const { pageErrors, consoleErrors } = attachErrorListeners(page);

    const { gate, release, isReleased } = createHoldGate();
    let fetched = false;
    let routeHandled: Promise<void> | undefined;
    let abortedLatest = false;

    page.on('requestfailed', (req) => {
      const pathname = (() => {
        try {
          return new URL(req.url()).pathname;
        } catch {
          return req.url();
        }
      })();
      if (pathname !== '/v1/dashboard/financial/latest' && pathname !== '/dashboard/financial/latest') return;
      const failure = req.failure()?.errorText ?? '';
      if (/ERR_ABORTED|aborted/i.test(failure)) {
        abortedLatest = true;
      }
    });

    await page.route('**/dashboard/financial/latest**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      const pathname = (() => {
        try {
          return new URL(route.request().url()).pathname;
        } catch {
          return route.request().url();
        }
      })();
      if (pathname !== '/v1/dashboard/financial/latest' && pathname !== '/dashboard/financial/latest') {
        await route.fallback();
        return;
      }
      fetched = true;
      routeHandled = fulfillRealResponseAfterGate(route, gate);
      await routeHandled;
    });

    try {
      const livePath = '/dashboard/financial/live';
      const hubPath = '/dashboard/financial';
      await openScreen(page, hubPath, jwt);

      const destinationRequests = waitForFinancialDestinationRequests(page, livePath);
      destinationRequests.catch(() => undefined);
      await page.getByText('Live', { exact: true }).click();
      await expect
        .poll(() => normPath(new URL(page.url()).pathname), {
          message: 'Live tile should navigate to /dashboard/financial/live',
          timeout: 15000,
        })
        .toBe(livePath);

      await expect.poll(() => fetched, { message: 'latest GET must reach the hold gate' }).toBe(true);
      expect(isReleased()).toBe(false);
      expect(abortedLatest).toBe(false);

      // Start the real settle-then-navigate sequence while the response is still held.
      // A URL-only settle helper resolves immediately (URL already matches), navigates back
      // during the hold, aborts the latest GET, and fails the assertions below.
      let settledWhileHeld = false;
      let returnedToHubWhileHeld = false;
      const settleThenReturn = (async () => {
        await settleFinancialHubDestination(page, livePath, destinationRequests);
        if (!isReleased()) settledWhileHeld = true;
        await openScreen(page, hubPath, jwt);
        if (!isReleased()) returnedToHubWhileHeld = true;
      })();
      settleThenReturn.catch(() => undefined);

      // Observable Playwright roundtrip: gives a wrong (URL-only) settle a chance to complete
      // and navigate before we release.
      await page.evaluate(() => true);
      expect(normPath(new URL(page.url()).pathname), 'must still be on live while held').toBe(livePath);
      expect(isReleased()).toBe(false);
      expect(settledWhileHeld, 'settle must not finish while destination body is held').toBe(false);
      expect(returnedToHubWhileHeld, 'must not re-navigate to hub while held').toBe(false);
      expect(abortedLatest).toBe(false);

      release();
      await settleThenReturn;
      if (routeHandled) await routeHandled;

      expect(settledWhileHeld).toBe(false);
      expect(returnedToHubWhileHeld).toBe(false);
      expect(abortedLatest, 'settle-then-navigate must not abort held latest').toBe(false);
      expect(normPath(new URL(page.url()).pathname)).toBe(hubPath);
      assertNoErrors(pageErrors, consoleErrors);
    } finally {
      release();
    }
  });
});
