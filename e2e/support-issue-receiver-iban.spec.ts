import { test, expect, Page, Route } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: support-issue receiver-IBAN check
 *
 * Route:
 *   - /support/issue  (customer support form; file src/screens/support-issue.screen.tsx)
 *
 * Auth is REAL customer auth via getCachedAuth (same pattern as e2e/user-flows.spec.ts): the api must
 * be reachable for the session token. Deep-link query params pre-select type/reason so the
 * TransactionIssue + TransactionMissing form (including the Receiver IBAN field) is shown without
 * manual dropdown interaction. Parameter names and values match the screen's urlParams handling
 * (issue-type / reason) and the SupportIssueType / SupportIssueReason string enums
 * (TransactionIssue / TransactionMissing).
 *
 * The receiver-IBAN check endpoint is MOCKED with synthetic status responses via page.route(...), so
 * the six baselines are deterministic and contain NO real production data. Only PUT bank/receiveIban
 * (full URL /v1/bank/receiveIban after useApi) is intercepted; everything else
 * (auth/user/settings/…) is passed through via route.continue().
 *
 * Intercepted endpoint (base `/v1/` is prepended by useApi):
 *   - PUT bank/receiveIban   body { iban }; success body { status: ReceiveIbanStatus }
 *
 * Synthetic fixtures: fixed example IBAN string — no production data.
 */

// Example Swiss IBAN (21 alphanumerics once normalized); length is above ReceiverIbanCheckMinLength (15).
const EXAMPLE_RECEIVER_IBAN = 'CH93 0076 2011 6238 5295 7';

const RECEIVE_IBAN_RE = /\/v1\/bank\/receiveIban(?:\?|$)/;

type ReceiveIbanStatus = 'DfxIban' | 'NotMatched' | 'InvalidIban' | 'LoginRequired';

/** Success: JSON `{ status }`. Failure: HTTP error (any non-2xx is treated as unavailable by the screen). */
type ReceiveIbanMock = { status: ReceiveIbanStatus } | { httpStatus: number };

// ---------------------------------------------------------------------------
// Routing: intercept ONLY PUT /v1/bank/receiveIban; pass everything else through.
// ---------------------------------------------------------------------------

async function installReceiveIbanRoutes(
  page: Page,
  mock: ReceiveIbanMock,
  options?: { delayMs?: number },
): Promise<void> {
  await page.route('**/v1/**', async (route: Route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'PUT' && RECEIVE_IBAN_RE.test(url)) {
      if (options?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }

      if ('httpStatus' in mock) {
        await route.fulfill({
          status: mock.httpStatus,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: mock.status }),
      });
      return;
    }

    // everything else (auth, user, settings, …) hits the real api
    await route.continue();
  });
}

/** StyledInput renders label and input as siblings; getByLabel is unreliable for this field. */
function receiverIbanInput(page: Page) {
  return page.locator('label', { hasText: 'Receiver IBAN' }).locator('xpath=following-sibling::div[1]//input');
}

/**
 * Loading spinner overlay that StyledInput places inside the field when loading is true
 * (absolute right-side container wrapping StyledLoadingSpinner).
 */
function receiverIbanSpinner(page: Page) {
  return page
    .locator('label', { hasText: 'Receiver IBAN' })
    .locator('xpath=following-sibling::div[1]')
    .locator('div.absolute.right-3');
}

function supportIssueUrl(token: string): string {
  return `/support/issue?session=${token}&issue-type=TransactionIssue&reason=TransactionMissing`;
}

async function waitForReceiveIbanPut(page: Page) {
  return page.waitForResponse((r) => r.url().includes('/v1/bank/receiveIban') && r.request().method() === 'PUT');
}

// ---------------------------------------------------------------------------
// Tests: one screenshot per receiver-IBAN check state
// ---------------------------------------------------------------------------

test.describe('Support Issue - Receiver IBAN check - Visual Regression Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('empty receiver IBAN field after navigation', async ({ page }) => {
    // Neutral mock so an accidental input cannot hit the real check endpoint.
    await installReceiveIbanRoutes(page, { status: 'DfxIban' });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Receiver IBAN')).toBeVisible();

    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-01-empty.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('checking receiver IBAN shows loading spinner while request is in flight', async ({ page }) => {
    // Delay the response so the screenshot captures the in-flight spinner, not a finished check.
    await installReceiveIbanRoutes(page, { status: 'DfxIban' }, { delayMs: 8000 });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    const input = receiverIbanInput(page);
    await input.fill(EXAMPLE_RECEIVER_IBAN);
    // Do not wait for waitForResponse — the check must still be running at screenshot time.

    await expect(receiverIbanSpinner(page)).toBeVisible();
    await expect(page.getByText('We have recognized this IBAN.')).not.toBeVisible();
    await expect(
      page.getByText(
        'We could not recognize this IBAN with the information available to us. You can submit your request anyway.',
      ),
    ).not.toBeVisible();
    await expect(page.getByText('This does not look like a valid IBAN.')).not.toBeVisible();
    await expect(
      page.getByText('We could not check this IBAN at the moment. You can submit your request anyway.'),
    ).not.toBeVisible();

    // Settle after the re-render, well inside the window the mock delay keeps the spinner visible in: the check
    // starts one debounce interval after the input and the response only arrives 8000 ms later, so a screenshot
    // taken here still shows the in-flight state even when the comparison needs a second attempt.
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-02-checking.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('recognized IBAN shows DfxIban hint while focused', async ({ page }) => {
    await installReceiveIbanRoutes(page, { status: 'DfxIban' });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    const input = receiverIbanInput(page);
    const responsePromise = waitForReceiveIbanPut(page);
    await input.fill(EXAMPLE_RECEIVER_IBAN);
    await responsePromise;
    // DfxIban hint is shown immediately while the field stays focused (no blur).

    await expect(page.getByText('We have recognized this IBAN.')).toBeVisible();

    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-03-recognized.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('not-matched IBAN shows NotMatched hint after blur', async ({ page }) => {
    await installReceiveIbanRoutes(page, { status: 'NotMatched' });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    const input = receiverIbanInput(page);
    const responsePromise = waitForReceiveIbanPut(page);
    await input.fill(EXAMPLE_RECEIVER_IBAN);
    await responsePromise;
    await input.blur();

    await expect(
      page.getByText(
        'We could not recognize this IBAN with the information available to us. You can submit your request anyway.',
      ),
    ).toBeVisible();

    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-04-not-matched.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('invalid IBAN shows InvalidIban hint after blur', async ({ page }) => {
    await installReceiveIbanRoutes(page, { status: 'InvalidIban' });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    const input = receiverIbanInput(page);
    const responsePromise = waitForReceiveIbanPut(page);
    await input.fill(EXAMPLE_RECEIVER_IBAN);
    await responsePromise;
    await input.blur();

    await expect(page.getByText('This does not look like a valid IBAN.')).toBeVisible();

    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-05-invalid.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });

  test('check unavailable (HTTP 500) shows fallback hint after blur', async ({ page }) => {
    await installReceiveIbanRoutes(page, { httpStatus: 500 });

    await page.goto(supportIssueUrl(token));
    await page.waitForLoadState('networkidle');

    const input = receiverIbanInput(page);
    const responsePromise = waitForReceiveIbanPut(page);
    await input.fill(EXAMPLE_RECEIVER_IBAN);
    await responsePromise;
    await input.blur();

    await expect(
      page.getByText('We could not check this IBAN at the moment. You can submit your request anyway.'),
    ).toBeVisible();

    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('support-issue-receiver-iban-06-unavailable.png', {
      fullPage: true,
      maxDiffPixels: 5000,
    });
  });
});
