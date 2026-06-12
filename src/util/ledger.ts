import { AccountReconStatus, AccountType, ReconStatus, Staleness } from 'src/dto/ledger.dto';

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

export function formatAge(seconds?: number): string {
  if (seconds === undefined) return '-';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// Account-type display order for grouping (§9.4 — grouped by type).
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'ASSET',
  'TRANSIT',
  'LIABILITY',
  'INCOME',
  'EXPENSE',
  'EQUITY',
  'ROUNDING',
  'SUSPENSE',
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

// A blockchain-tx reference is a 64-char hex string (§9.4 — link to explorer).
const HEX64 = /^[0-9a-fA-F]{64}$/;

export function isBlockchainReference(value: string): boolean {
  return HEX64.test(value);
}
