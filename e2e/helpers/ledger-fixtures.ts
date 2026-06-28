/**
 * Deterministic fixtures + fake-admin-session helpers for the ledger visual-regression baselines.
 *
 * These let the ledger screens render WITHOUT a live API and WITHOUT a real login:
 *  - makeAdminJwt() forges a session JWT whose payload decodes to role "Admin". The frontend never
 *    verifies the signature (auth.context.js -> jwtDecode), it only base64-decodes the payload and reads
 *    `role` + `exp`, so an unsigned/garbage-signature token is sufficient for useAdminGuard to pass.
 *  - The *Fixture() builders return synthetic, fully deterministic response bodies (no real IBANs,
 *    customer names or live numbers — both repos are public) that mirror the DTO shapes in
 *    src/dto/ledger.dto.ts 1:1.
 *
 * All timestamps are expressed relative to FROZEN_NOW so that, combined with the frozen clock the spec
 * installs via addInitScript, the AgeBadge ("… ago") and feed-age rendering is byte-stable across runs.
 */

// Frozen wall-clock used by the spec (page.addInitScript) AND by the fixtures below.
// 2026-01-15T12:00:00.000Z — an arbitrary fixed instant; nothing here depends on the real date.
export const FROZEN_NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

function isoMinutesBefore(minutes: number): string {
  return new Date(FROZEN_NOW - minutes * 60_000).toISOString();
}

function isoDaysBefore(days: number): string {
  return new Date(FROZEN_NOW - days * 86_400_000).toISOString();
}

/** base64url-encode a UTF-8 string (no padding), matching what jwt-decode expects. */
function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Forge a session JWT that decodes to an ADMIN session.
 * Utils.isJwt only checks the `a.b.c` shape; auth.context only base64-decodes the payload — neither verifies
 * the signature, so the signature segment is an inert placeholder.
 */
export function makeAdminJwt(): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      // exp far in the future so isExpired() -> false (and thus isLoggedIn -> true) under the frozen clock.
      exp: Math.floor(FROZEN_NOW / 1000) + 365 * 86_400,
      iat: Math.floor(FROZEN_NOW / 1000),
      address: '0x0000000000000000000000000000000000000001',
      user: 1,
      account: 1,
      role: 'Admin',
      blockchains: ['Ethereum'],
    }),
  );
  // Inert signature segment (>= 2 base64url chars) — never validated client-side.
  return `${header}.${payload}.${base64url('e2e-fake-signature')}`;
}

// ---------------------------------------------------------------------------
// GET dashboard/accounting/ledger/accounts
// ---------------------------------------------------------------------------

export function accountsFixture() {
  return {
    period: { from: '2026-01-01', to: '2026-01-15' },
    accounts: [
      // Asset accounts (Dr +)
      { accountId: 100, name: 'Bank CHF', type: 'Asset', currency: 'CHF', balanceNative: 1250000.5, balanceChf: 1250000.5, reconStatus: 'ok', reconDiff: 0, lastVerified: isoMinutesBefore(20) },
      { accountId: 101, name: 'Bank EUR', type: 'Asset', currency: 'EUR', balanceNative: 482300.25, balanceChf: 461845.4, reconStatus: 'ok', reconDiff: 0, lastVerified: isoMinutesBefore(25) },
      { accountId: 110, name: 'Wallet BTC', type: 'Asset', currency: 'BTC', balanceNative: 12.34567890, balanceChf: 1037436.0, reconStatus: 'diff', reconDiff: 152.5, lastVerified: isoMinutesBefore(40) },
      { accountId: 111, name: 'Wallet ETH', type: 'Asset', currency: 'ETH', balanceNative: 845.12345678, balanceChf: 2956931.0, reconStatus: 'stale', reconDiff: 0, lastVerified: isoDaysBefore(3) },
      // Transit (Dr +)
      { accountId: 200, name: 'Transit Inbound', type: 'Transit', currency: 'CHF', balanceNative: 38250.0, balanceChf: 38250.0, reconStatus: 'unverified' },
      // Liability accounts (Cr -> negative balanceChf)
      { accountId: 300, name: 'Customer Deposits CHF', type: 'Liability', currency: 'CHF', balanceNative: -2980000.0, balanceChf: -2980000.0, reconStatus: 'ok', reconDiff: 0, lastVerified: isoMinutesBefore(15) },
      { accountId: 301, name: 'Customer Deposits BTC', type: 'Liability', currency: 'BTC', balanceNative: -11.0, balanceChf: -924000.0, reconStatus: 'ok', reconDiff: 0, lastVerified: isoMinutesBefore(18) },
      // Income (Cr)
      { accountId: 400, name: 'Trading Fees', type: 'Income', currency: 'CHF', balanceNative: -185420.75, balanceChf: -185420.75 },
      // Expense (Dr)
      { accountId: 500, name: 'Network Fees', type: 'Expense', currency: 'CHF', balanceNative: 23150.4, balanceChf: 23150.4 },
      // Equity (Cr)
      { accountId: 600, name: 'Retained Earnings', type: 'Equity', currency: 'CHF', balanceNative: -120000.0, balanceChf: -120000.0 },
      // Rounding
      { accountId: 700, name: 'Rounding', type: 'Rounding', currency: 'CHF', balanceNative: -2.85, balanceChf: -2.85 },
      // Suspense (Cr -> negative)
      { accountId: 800, name: 'Suspense', type: 'Suspense', currency: 'CHF', balanceNative: -4820.0, balanceChf: -4820.0, reconStatus: 'placeholder' },
    ],
  };
}

export function accountsEmptyFixture() {
  return {
    period: { from: '2026-01-01', to: '2026-01-15' },
    accounts: [],
  };
}

// ---------------------------------------------------------------------------
// GET dashboard/accounting/ledger/accounts/:id/legs
// ---------------------------------------------------------------------------

export function accountDetailFixture(accountId = 100) {
  return {
    accountId,
    accountName: 'Bank CHF',
    currency: 'CHF',
    period: { from: '2026-01-01', to: '2026-01-15' },
    openingBalance: 1000000.0,
    closingBalance: 1250000.5,
    total: 6,
    legs: [
      { legId: 9001, txId: 5001, bookingDate: isoDaysBefore(13), valueDate: isoDaysBefore(13), description: 'Customer buy order', sourceType: 'BuyCrypto', sourceId: '5001', seq: 0, counterAccountId: 300, counterAccountName: 'Customer Deposits CHF', amountNative: 120000.0, amountChf: 120000.0, priceChf: 1 },
      { legId: 9002, txId: 5002, bookingDate: isoDaysBefore(11), valueDate: isoDaysBefore(11), description: 'Customer buy order', sourceType: 'BuyCrypto', sourceId: '5002', seq: 0, counterAccountId: 300, counterAccountName: 'Customer Deposits CHF', amountNative: 85000.5, amountChf: 85000.5, priceChf: 1 },
      { legId: 9003, txId: 5003, bookingDate: isoDaysBefore(9), valueDate: isoDaysBefore(9), description: 'Trading fee', sourceType: 'BuyCrypto', sourceId: '5003', seq: 1, counterAccountId: 400, counterAccountName: 'Trading Fees', amountNative: 1250.0, amountChf: 1250.0, priceChf: 1 },
      { legId: 9004, txId: 5010, bookingDate: isoDaysBefore(6), valueDate: isoDaysBefore(6), description: 'Customer payout', sourceType: 'BuyFiat', sourceId: '5010', seq: 0, counterAccountId: 300, counterAccountName: 'Customer Deposits CHF', amountNative: -45000.0, amountChf: -45000.0, priceChf: 1 },
      { legId: 9005, txId: 5011, bookingDate: isoDaysBefore(4), valueDate: isoDaysBefore(4), description: 'Network fee settlement', sourceType: 'BuyFiat', sourceId: '5011', seq: 1, counterAccountId: 500, counterAccountName: 'Network Fees', amountNative: -1000.0, amountChf: -1000.0, priceChf: 1 },
      { legId: 9006, txId: 5012, bookingDate: isoDaysBefore(2), valueDate: isoDaysBefore(2), description: 'Reversal of payout', sourceType: 'BuyFiat', sourceId: '5010', seq: 0, counterAccountId: 300, counterAccountName: 'Customer Deposits CHF', amountNative: 45000.0, amountChf: 45000.0, priceChf: 1, reversalOf: 9004 },
    ],
  };
}

// ---------------------------------------------------------------------------
// GET dashboard/accounting/ledger/reconciliation
// ---------------------------------------------------------------------------

// All-green: every account reconciles cleanly.
export function reconAllOkFixture() {
  return {
    runAt: isoMinutesBefore(10),
    accounts: [
      { accountId: 110, accountName: 'Wallet BTC', ledgerBalance: 12.34567890, externalFeedBalance: 12.34567890, difference: 0, feedTimestamp: isoMinutesBefore(8), feedAge: 480, staleness: 'fresh', status: 'ok' },
      { accountId: 111, accountName: 'Wallet ETH', ledgerBalance: 845.12345678, externalFeedBalance: 845.12345678, difference: 0, feedTimestamp: isoMinutesBefore(9), feedAge: 540, staleness: 'fresh', status: 'ok' },
      { accountId: 100, accountName: 'Bank CHF', ledgerBalance: 1250000.5, externalFeedBalance: 1250000.5, difference: 0, feedTimestamp: isoMinutesBefore(12), feedAge: 720, staleness: 'fresh', status: 'ok' },
    ],
  };
}

// Mixed traffic lights: ok (green) + diff (red) + stale (orange) + unverified (gray) + suspense_alarm (red).
export function reconMixedFixture() {
  return {
    runAt: isoMinutesBefore(10),
    accounts: [
      { accountId: 100, accountName: 'Bank CHF', ledgerBalance: 1250000.5, externalFeedBalance: 1250000.5, difference: 0, feedTimestamp: isoMinutesBefore(12), feedAge: 720, staleness: 'fresh', status: 'ok' },
      { accountId: 110, accountName: 'Wallet BTC', ledgerBalance: 12.34567890, externalFeedBalance: 12.34415390, difference: 0.001525, feedTimestamp: isoMinutesBefore(9), feedAge: 540, staleness: 'fresh', status: 'diff' },
      { accountId: 111, accountName: 'Wallet ETH', ledgerBalance: 845.12345678, externalFeedBalance: 845.12345678, difference: 0, feedTimestamp: isoDaysBefore(3), feedAge: 259200, staleness: 'stale', status: 'stale' },
      { accountId: 200, accountName: 'Transit Inbound', ledgerBalance: 38250.0, externalFeedBalance: 0, difference: 38250.0, staleness: 'missing', status: 'unverified' },
      { accountId: 800, accountName: 'Suspense', ledgerBalance: 4820.0, externalFeedBalance: 0, difference: 4820.0, feedTimestamp: isoMinutesBefore(11), feedAge: 660, staleness: 'fresh', status: 'suspense_alarm' },
    ],
  };
}

// ---------------------------------------------------------------------------
// GET dashboard/accounting/ledger/suspense
// ---------------------------------------------------------------------------

export function suspenseFixture() {
  return {
    totalChf: 4820.0,
    legs: [
      { legId: 7001, txId: 6001, bookingDate: isoDaysBefore(12), description: 'Unmatched incoming transfer', sourceType: 'BankTx', sourceId: '6001', amountNative: 2500.0, amountChf: 2500.0, currency: 'CHF', age: 12 },
      { legId: 7002, txId: 6002, bookingDate: isoDaysBefore(9), description: 'Unmatched incoming transfer', sourceType: 'BankTx', sourceId: '6002', amountNative: 1200.0, amountChf: 1200.0, currency: 'EUR', age: 9 },
      { legId: 7003, txId: 6003, bookingDate: isoDaysBefore(4), description: 'Pending review', sourceType: 'BankTx', sourceId: '6003', amountNative: 820.0, amountChf: 820.0, currency: 'CHF', age: 4 },
      { legId: 7004, txId: 6004, bookingDate: isoDaysBefore(1), description: 'Pending review', sourceType: 'BankTx', sourceId: '6004', amountNative: 300.0, amountChf: 300.0, currency: 'CHF', age: 1 },
    ],
  };
}

// ---------------------------------------------------------------------------
// GET dashboard/accounting/ledger/margin
// ---------------------------------------------------------------------------

export function marginFixture() {
  // 14 deterministic daily rows leading up to (but not including) the frozen "now".
  const periods = [] as Array<{
    date: string;
    feeIncome: number;
    executionCosts: number;
    otherOpex: number;
    realizedMargin: number;
    fxPnl: number;
  }>;

  for (let i = 14; i >= 1; i--) {
    const feeIncome = 4000 + (i % 5) * 350;
    const executionCosts = -(1200 + (i % 4) * 180);
    const otherOpex = -(600 + (i % 3) * 90);
    const fxPnl = (i % 2 === 0 ? 1 : -1) * (150 + (i % 6) * 40);
    const realizedMargin = feeIncome + executionCosts + otherOpex + fxPnl;
    periods.push({ date: isoDaysBefore(i), feeIncome, executionCosts, otherOpex, realizedMargin, fxPnl });
  }

  const totalFeeIncome = periods.reduce((s, p) => s + p.feeIncome, 0);
  const totalExecutionCosts = periods.reduce((s, p) => s + p.executionCosts, 0);
  const totalOtherOpex = periods.reduce((s, p) => s + p.otherOpex, 0);
  const totalRealizedMargin = periods.reduce((s, p) => s + p.realizedMargin, 0);

  return { periods, totalFeeIncome, totalExecutionCosts, totalOtherOpex, totalRealizedMargin };
}
