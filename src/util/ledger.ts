import { AccountReconStatus, AccountType, LedgerAccountBalanceDto, ReconStatus, Staleness } from 'src/dto/ledger.dto';

// Fiat currencies are shown with 2 decimals, everything else (crypto) with 8 (§9.4).
const FIAT_CURRENCIES = new Set(['CHF', 'EUR', 'USD', 'GBP']);

export function isFiat(currency: string): boolean {
  return FIAT_CURRENCIES.has(currency.toUpperCase());
}

export function decimalsFor(currency: string): number {
  return isFiat(currency) ? 2 : 8;
}

// Native amount formatting: de-CH locale, fixed decimals by asset class.
export function formatNative(value: number, currency: string): string {
  const decimals = decimalsFor(currency);
  return value.toLocaleString('de-CH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatNativeOrDash(value: number | undefined, currency: string): string {
  return value !== undefined ? formatNative(value, currency) : '-';
}

// Unit-neutral native formatting at full precision (8 decimals, de-CH). Used by the reconciliation screen,
// where balances are per-asset NATIVE (BTC/ETH/…, §7) but the API does not expose a per-account currency.
// 8 decimals is the crypto default (§9.4): never truncates a real diff in decimals 3-8 to a phantom 0.00.
export function formatNative8(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

// CHF valuation formatting: de-CH, 2 decimals.
export function formatChf2(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChf2OrDash(value?: number): string {
  return value !== undefined ? formatChf2(value) : '-';
}

export function formatDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return '-';
  return new Date(parsed).toLocaleString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

// Account-type display order for grouping (§9.4 — grouped by type).
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'Asset',
  'Transit',
  'Liability',
  'Income',
  'Expense',
  'Equity',
  'Rounding',
  'Suspense',
];

export type AmpelColor = 'green' | 'red' | 'orange' | 'gray';

// Reconciliation traffic light per account (§9.4).
// green |diff| < tolerance, red otherwise, orange stale, gray placeholder/unverified.
export function reconAmpel(status: ReconStatus | undefined): AmpelColor {
  switch (status) {
    case 'ok':
      return 'green';
    case 'diff':
      return 'red';
    case 'stale':
      return 'orange';
    case 'placeholder':
    case 'unverified':
      return 'gray';
    default:
      return 'gray';
  }
}

// Reconciliation traffic light for the reconciliation screen status field (§9.4).
export function reconStatusAmpel(status: AccountReconStatus): AmpelColor {
  switch (status) {
    case 'ok':
      return 'green';
    case 'diff':
    case 'suspense_alarm':
      return 'red';
    case 'stale':
      return 'orange';
    case 'unverified':
      return 'gray';
    default:
      return 'gray';
  }
}

export function stalenessAmpel(staleness: Staleness): AmpelColor {
  switch (staleness) {
    case 'fresh':
      return 'green';
    case 'stale':
      return 'orange';
    case 'missing':
      return 'red';
    case 'placeholder':
      return 'gray';
    default:
      return 'gray';
  }
}

export const AMPEL_HEX: Record<AmpelColor, string> = {
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  gray: '#9ca3af',
};

export interface LedgerSummary {
  // signed Σ balanceChf over ASSET + TRANSIT (Dr +), i.e. the natural debit total (positive)
  totalAssets: number;
  // signed Σ balanceChf over LIABILITY + SUSPENSE (Cr −), i.e. the natural credit total (negative)
  totalLiabilities: number;
  // signed equity = assets + liabilities, mirroring the API authority journalEquityAt
  // (signed Σ amountChf over balance-account types, ledger-query.service.ts:452-471, design §7.6).
  // Liabilities already carry their negative credit sign, so this is an addition, NOT a subtraction.
  netEquity: number;
}

// Summarizes account balances for the ledger dashboard cards.
// The API serializes balanceChf as an UNWEIGHTED signed SUM(leg.amountChf) (Dr +, Cr −,
// ledger-leg.entity.ts:24 + ledger-dto.mapper.ts:56). Liability/Suspense accounts therefore carry a
// NEGATIVE balanceChf (credit balance). Net equity is the signed sum (assets + liabilities), never
// assets − liabilities (which would double-count the liabilities). For display, the magnitude of the
// liabilities is -totalLiabilities (see ledger.screen.tsx).
export function summarizeLedger(accounts: LedgerAccountBalanceDto[]): LedgerSummary {
  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const account of accounts) {
    if (account.type === 'Asset' || account.type === 'Transit') totalAssets += account.balanceChf;
    else if (account.type === 'Liability' || account.type === 'Suspense') totalLiabilities += account.balanceChf;
  }
  return { totalAssets, totalLiabilities, netEquity: totalAssets + totalLiabilities };
}
