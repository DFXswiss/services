import { test, expect, APIRequestContext, Page, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E Visual Regression Tests: Compliance Recommendation Network (graph) page
 *
 * Route: /compliance/recommendations/:id
 *
 * Auth is REAL (same admin-token flow as compliance.spec.ts): the api must be reachable for
 * `/v1/auth` and the frontend's own user/role fetch.
 *
 * Data is MOCKED with synthetic fixtures via page.route(...), so the baselines are deterministic AND
 * contain NO real production data. Only the two recommendation-graph related endpoints are intercepted:
 *   - GET support/recommendation-graph/:id/neighbors?skip=&take=   (the lazy-expand endpoint)
 *   - GET support/:id                                              (the detail-panel fetch, openDetail)
 * Everything else (the real auth/role/user fetch) is passed through via route.continue().
 *
 * Synthetic topology (fake ids 9000+, fake ref-codes 100-xxx):
 *   - Center 9000: one UPWARD referrer 8000 (used-ref edge 8000->9000), two downward RECOMMENDATION
 *     children 9001/9002, one downward USED_REF child 9003 (ref-code label). 9001/9002/9003 expandable.
 *     Center page hasMore: false.
 *   - Expand 9001: returns its parent 9000 (deduped on merge) PLUS new nodes 9010, 9011.
 *   - Hub 9002: first page hasMore: true (children 9020, 9021); second page (skip advanced) returns
 *     9022, 9023, hasMore: false -> exercises the "Load more connections" button + pagination cursor.
 *   - Detail (getUserData) fixtures for 9000 and 9001.
 *   - Error: expanding 9003 makes the neighbors endpoint return HTTP 500 -> panel-scoped loadMoreError,
 *     the already-loaded graph + detail panel are NOT torn down (round-4 fix).
 */

const API_URL = process.env.REACT_APP_API_URL! + '/v1';

const CENTER_ID = 9000;

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
// Synthetic fixtures (mirror RecommendationGraph / RecommendationGraphEdgeKind / ComplianceUserData)
// ---------------------------------------------------------------------------

type GraphNode = {
  id: number;
  firstname?: string;
  surname?: string;
  kycStatus?: string;
  kycLevel?: number;
  tradeApprovalDate?: string;
  expandable?: boolean;
};

type GraphEdge = {
  id: number;
  kind: 'Recommendation' | 'UsedRef';
  recommenderId: number;
  recommendedId: number;
  method?: string;
  type?: string;
  isConfirmed?: boolean;
  refCode?: string;
  created?: string;
};

type GraphFragment = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: number;
  hasMore?: boolean;
};

function node(id: number, name: string, opts: Partial<GraphNode> = {}): GraphNode {
  const [firstname, surname] = name.split(' ');
  return { id, firstname, surname, kycStatus: 'Completed', kycLevel: 50, ...opts };
}

function recEdge(recommenderId: number, recommendedId: number, method = 'RecommendationCode'): GraphEdge {
  return {
    id: recommenderId * 1000 + recommendedId,
    kind: 'Recommendation',
    recommenderId,
    recommendedId,
    method,
    isConfirmed: true,
    created: '2024-01-01T00:00:00.000Z',
  };
}

function refEdge(recommenderId: number, recommendedId: number, refCode: string): GraphEdge {
  return {
    id: -(recommenderId * 1000 + recommendedId),
    kind: 'UsedRef',
    recommenderId,
    recommendedId,
    refCode,
    created: '2024-01-01T00:00:00.000Z',
  };
}

// Center 9000: upward referrer 8000 (used-ref), two recommendation children 9001/9002, one used-ref
// child 9003. 9001/9002/9003 expandable. hasMore false.
const CENTER_FRAGMENT: GraphFragment = {
  rootId: CENTER_ID,
  hasMore: false,
  nodes: [
    node(8000, 'Anna Aufwaerts', { tradeApprovalDate: '2024-02-01T00:00:00.000Z' }),
    node(9000, 'Zentrum Knoten', { tradeApprovalDate: '2024-03-01T00:00:00.000Z' }),
    node(9001, 'Bruno Baum', { expandable: true }),
    node(9002, 'Clara Hub', { expandable: true, kycStatus: 'InProgress', kycLevel: 20 }),
    node(9003, 'Dora Fehler', { expandable: true, kycStatus: 'NA', kycLevel: 0 }),
  ],
  edges: [refEdge(8000, 9000, '100-001'), recEdge(9000, 9001), recEdge(9000, 9002), refEdge(9000, 9003, '100-002')],
};

// Expand 9001: re-includes parent 9000 (deduped on merge) + new nodes 9010, 9011.
const EXPAND_9001_FRAGMENT: GraphFragment = {
  rootId: 9001,
  hasMore: false,
  nodes: [
    node(9000, 'Zentrum Knoten', { tradeApprovalDate: '2024-03-01T00:00:00.000Z' }),
    node(9001, 'Bruno Baum'),
    node(9010, 'Emil Enkel'),
    node(9011, 'Fritz Enkel'),
  ],
  edges: [recEdge(9000, 9001), recEdge(9001, 9010), recEdge(9001, 9011)],
};

// Hub 9002 first page: hasMore true (children 9020, 9021).
const HUB_9002_PAGE1: GraphFragment = {
  rootId: 9002,
  hasMore: true,
  nodes: [node(9002, 'Clara Hub'), node(9020, 'Gerd Hubkind'), node(9021, 'Hans Hubkind')],
  edges: [recEdge(9002, 9020), recEdge(9002, 9021)],
};

// Hub 9002 second page (skip advanced): hasMore false (children 9022, 9023).
const HUB_9002_PAGE2: GraphFragment = {
  rootId: 9002,
  hasMore: false,
  nodes: [node(9022, 'Ivo Hubkind'), node(9023, 'Jana Hubkind')],
  edges: [recEdge(9002, 9022), recEdge(9002, 9023)],
};

// ---------------------------------------------------------------------------
// Detail (getUserData) fixtures: ComplianceUserData. Only users/transactions/kycSteps/supportIssues
// are read by the detail panel, but the full shape is provided so the mock is type-complete.
// ---------------------------------------------------------------------------

function detailFixture(id: number, name: string): unknown {
  const [firstname, surname] = name.split(' ');
  return {
    userData: { id, firstname, surname, kycStatus: 'Completed', kycLevel: 50, status: 'Active' },
    kycFiles: [],
    kycSteps: [
      { id: id * 10 + 1, name: 'Ident', status: 'Completed', sequenceNumber: 1, created: '2024-01-01T00:00:00.000Z' },
    ],
    kycLogs: [],
    transactions: [
      {
        id: id * 100 + 1,
        uid: `T-${id}`,
        sourceType: 'BuyCrypto',
        isCompleted: true,
        created: '2024-01-01T00:00:00.000Z',
      },
    ],
    bankTxs: [],
    cryptoInputs: [],
    ipLogs: [],
    supportIssues: [],
    users: [
      {
        id: id * 1000 + 1,
        address: `0xfake${id}`,
        ref: '100-009',
        usedRef: '100-001',
        refUserName: 'Anna Aufwaerts',
        refUserDataId: 8000,
        role: 'User',
        status: 'Active',
        walletName: 'DFX',
        created: '2024-01-01T00:00:00.000Z',
      },
    ],
    bankDatas: [],
    buyRoutes: [],
    sellRoutes: [],
    swapRoutes: [],
    virtualIbans: [],
    refRewards: [],
    notifications: [],
    notes: [],
    permissions: {
      viewKycFiles: true,
      viewKycLogs: true,
      viewIpLogs: true,
      viewSupportIssues: true,
      canRequestLimit: true,
      canPerformTransactionActions: true,
      viewRecommendation: true,
    },
  };
}

const DETAIL_FIXTURES: Record<number, unknown> = {
  9000: detailFixture(9000, 'Zentrum Knoten'),
  9001: detailFixture(9001, 'Bruno Baum'),
  9002: detailFixture(9002, 'Clara Hub'),
  9003: detailFixture(9003, 'Dora Fehler'),
};

// ---------------------------------------------------------------------------
// Routing: intercept ONLY the two graph endpoints; pass everything else through (auth/role/user).
// Records the neighbor requests so tests can assert which node id / skip / take was fetched.
// ---------------------------------------------------------------------------

interface NeighborCall {
  id: number;
  skip: number | null;
  take: number | null;
}

interface GraphRouter {
  calls: NeighborCall[];
  errorOnExpandIds: Set<number>;
}

const NEIGHBORS_RE = /\/v1\/support\/recommendation-graph\/(\d+)\/neighbors/;
const DETAIL_RE = /\/v1\/support\/(\d+)(?:\?|$)/;

async function installGraphRoutes(page: Page, router: GraphRouter): Promise<void> {
  await page.route('**/v1/**', async (route: Route) => {
    const url = route.request().url();

    const neighbors = url.match(NEIGHBORS_RE);
    if (neighbors) {
      const id = +neighbors[1];
      const parsed = new URL(url);
      const skipParam = parsed.searchParams.get('skip');
      const takeParam = parsed.searchParams.get('take');
      const skip = skipParam == null ? null : +skipParam;
      const take = takeParam == null ? null : +takeParam;
      router.calls.push({ id, skip, take });

      if (router.errorOnExpandIds.has(id)) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Synthetic neighbors error' }),
        });
        return;
      }

      const fragment = neighborFragmentFor(id, skip ?? 0);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fragment) });
      return;
    }

    const detail = url.match(DETAIL_RE);
    if (detail) {
      const id = +detail[1];
      const fixture = DETAIL_FIXTURES[id];
      if (fixture) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
        return;
      }
    }

    // everything else (auth, role, user) hits the real api
    await route.continue();
  });
}

function neighborFragmentFor(id: number, skip: number): GraphFragment {
  if (id === CENTER_ID) return CENTER_FRAGMENT;
  if (id === 9001) return EXPAND_9001_FRAGMENT;
  if (id === 9002) return skip > 0 ? HUB_9002_PAGE2 : HUB_9002_PAGE1;
  // any other expandable node: an empty, fully-expanded fragment
  return { rootId: id, hasMore: false, nodes: [], edges: [] };
}

// ---------------------------------------------------------------------------
// Locators / helpers
// ---------------------------------------------------------------------------

// each rendered node is a ReactFlow node wrapper with a stable data-testid `rf__node-<id>`
// (a ReactFlow-provided test/a11y affordance, not production source). We locate by the stable wrapper
// testid to avoid the (wrapper + inner UserNode div, both role="button") strict-mode collision a
// getByRole({name:/#id/}) would hit. Used for visibility + counting.
function graphNode(page: Page, id: number) {
  return page.getByTestId(`rf__node-${id}`);
}

// activate a node the way the user does: click the inner UserNode (the one carrying onActivate).
// We click the visible "#<id>" label inside the node, which bubbles to the inner div's onClick -
// the ReactFlow wrapper itself only runs ReactFlow's own select/drag handler.
async function clickNode(page: Page, id: number): Promise<void> {
  await graphNode(page, id).getByText(`#${id}`, { exact: true }).click();
}

// the ReactFlow node wrapper carries data-id; used to count rendered nodes precisely
function renderedNodeIds(page: Page): Promise<string[]> {
  return page
    .locator('.react-flow__node')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-id') ?? '').filter(Boolean));
}

const detailPanel = (page: Page) => page.locator('div.w-80');

async function gotoCenter(page: Page, token: string): Promise<void> {
  await page.goto(`/compliance/recommendations/${CENTER_ID}?session=${token}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await expect(graphNode(page, CENTER_ID)).toBeVisible();
  await waitGraphSettled(page);
}

// mask the volatile ReactFlow chrome (minimap + attribution) so the baselines stay deterministic
// Wait until the ReactFlow viewport transform stops changing. `fitView` measures node bounds
// asynchronously (ResizeObserver), so the pan/zoom can still settle a frame or two after the nodes
// render; polling the viewport transform until two consecutive samples match removes that race from
// the visual baselines (it is a JS-driven fit, so Playwright's CSS `animations: disabled` cannot).
async function waitGraphSettled(page: Page): Promise<void> {
  const viewport = page.locator('.react-flow__viewport');
  let prev: string | null = null;
  for (let i = 0; i < 25; i++) {
    const current = await viewport.getAttribute('style');
    if (current !== null && current === prev) return;
    prev = current;
    await page.waitForTimeout(120);
  }
}

function masks(page: Page) {
  return [page.locator('.react-flow__minimap'), page.locator('.react-flow__attribution')];
}

test.describe('Compliance Recommendation Network (graph) - Visual Regression Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  test('1. initial 1-hop render shows only center + direct neighbors', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    // exactly the center + its 4 direct neighbors are loaded (no indirect hairball)
    const ids = (await renderedNodeIds(page)).sort();
    expect(ids).toEqual(['8000', '9000', '9001', '9002', '9003']);

    // the center's neighbors were fetched exactly once at skip 0
    expect(router.calls).toContainEqual({ id: CENTER_ID, skip: 0, take: 25 });

    // direct neighbors visible (upward + downward)
    await expect(graphNode(page, 8000)).toBeVisible();
    await expect(graphNode(page, 9001)).toBeVisible();
    await expect(graphNode(page, 9002)).toBeVisible();
    await expect(graphNode(page, 9003)).toBeVisible();

    await waitGraphSettled(page);
    await expect(page).toHaveScreenshot('recgraph-01-initial.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: masks(page),
    });
  });

  test('2. click expands + opens detail panel in one click', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    await clickNode(page, 9001);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // (a) getRecommendationGraphNeighbors was called for 9001 with skip/take
    expect(router.calls).toContainEqual({ id: 9001, skip: 0, take: 25 });

    // (b) the detail panel opened showing 9001's data
    await expect(detailPanel(page)).toBeVisible();
    await expect(detailPanel(page).getByText('UserData #9001')).toBeVisible();

    // (c) the graph merged 9001's neighbors (new nodes 9010, 9011 added)
    await expect(graphNode(page, 9010)).toBeVisible();
    await expect(graphNode(page, 9011)).toBeVisible();

    await waitGraphSettled(page);
    await expect(page).toHaveScreenshot('recgraph-02-expanded-with-detail.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: masks(page),
    });
  });

  test('3. merge dedups the shared parent (no duplicate node ids)', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    await clickNode(page, 9001);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(graphNode(page, 9010)).toBeVisible();

    const ids = await renderedNodeIds(page);
    // the expand re-included 9000 and 9001 - they must each appear exactly once
    expect(ids.filter((i) => i === '9000')).toHaveLength(1);
    expect(ids.filter((i) => i === '9001')).toHaveLength(1);
    // no duplicate ids at all
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('4. load more on the hub node paginates with advanced skip', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    // first activation of the hub: opens panel + loads page 1 (hasMore true)
    await clickNode(page, 9002);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(graphNode(page, 9020)).toBeVisible();
    await expect(graphNode(page, 9021)).toBeVisible();
    expect(router.calls).toContainEqual({ id: 9002, skip: 0, take: 25 });

    // the "Load more connections" button is visible in the panel
    const loadMore = detailPanel(page).getByRole('button', { name: 'Load more connections' });
    await expect(loadMore).toBeVisible();

    await loadMore.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // the second neighbors request advanced skip by exactly the requested page size (take=25), i.e. by the
    // requested take and NOT by the number of nodes page 1 rendered - directly guards the cursor fix
    const hubCalls = router.calls.filter((c) => c.id === 9002);
    expect(hubCalls.length).toBe(2);
    expect(hubCalls[1].skip).toBe(25);

    // page-2 nodes appeared
    await expect(graphNode(page, 9022)).toBeVisible();
    await expect(graphNode(page, 9023)).toBeVisible();

    await waitGraphSettled(page);
    await expect(page).toHaveScreenshot('recgraph-03-load-more.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: masks(page),
    });
  });

  test('5. upward referrer node + its used-ref edge (xxx-xxx label) are present', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    // the upward referrer node is present
    await expect(graphNode(page, 8000)).toBeVisible();

    // the used-ref edge label is rendered in xxx-xxx format
    await expect(page.locator('.react-flow__edge-textwrapper').getByText('100-001')).toBeVisible();

    // the used-ref edge connects 8000 -> 9000
    await expect(page.locator('.react-flow__edge[data-testid="rf__edge-e-8000-9000-UsedRef"]')).toHaveCount(1);
  });

  test('6. panel-scoped error on expand keeps the loaded graph + detail panel (round-4 fix)', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set([9003]) };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    // sanity: full graph loaded before the failing expand
    const before = (await renderedNodeIds(page)).sort();
    expect(before).toEqual(['8000', '9000', '9001', '9002', '9003']);

    // expanding 9003 returns HTTP 500
    await clickNode(page, 9003);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // panel-scoped loadMoreError shows INSIDE the detail panel
    const panel = detailPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByText('UserData #9003')).toBeVisible();
    await expect(panel.getByText('Synthetic neighbors error')).toBeVisible();

    // the previously-loaded graph is NOT torn down (no full-screen ErrorHint replacing the graph)
    const after = (await renderedNodeIds(page)).sort();
    expect(after).toEqual(['8000', '9000', '9001', '9002', '9003']);
    await expect(graphNode(page, CENTER_ID)).toBeVisible();

    await waitGraphSettled(page);
    await expect(page).toHaveScreenshot('recgraph-04-load-error.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: masks(page),
    });
  });

  test('7. closing the detail panel hides it but keeps the graph', async ({ page }) => {
    const router: GraphRouter = { calls: [], errorOnExpandIds: new Set() };
    await installGraphRoutes(page, router);

    await gotoCenter(page, token);

    // the center auto-opens its own detail panel on initial load
    const panel = detailPanel(page);
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(500);

    // panel gone, graph stays
    await expect(detailPanel(page)).toHaveCount(0);
    await expect(graphNode(page, CENTER_ID)).toBeVisible();
    const ids = (await renderedNodeIds(page)).sort();
    expect(ids).toEqual(['8000', '9000', '9001', '9002', '9003']);
  });
});
