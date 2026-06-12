// DTOs mirror the read-only ledger API (§8 of the ledger design).
// Endpoints live under /v1/dashboard/accounting/ledger/* (ADMIN-only).

export type AccountType = 'ASSET' | 'TRANSIT' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY' | 'ROUNDING' | 'SUSPENSE';

export type ReconStatus = 'ok' | 'diff' | 'stale' | 'unverified' | 'placeholder';

export type AccountReconStatus = 'ok' | 'diff' | 'stale' | 'unverified' | 'suspense_alarm';

export type Staleness = 'fresh' | 'stale' | 'missing' | 'placeholder';

export interface LedgerPeriod {
  from: string;
  to: string;
}

// GET ledger/accounts
export interface LedgerAccountBalanceDto {
  accountId: number;
  name: string;
  type: AccountType;
  currency: string;
  balanceNative: number;
  balanceChf: number;
  reconStatus?: ReconStatus;
  reconDiff?: number;
  lastVerified?: string;
}

export interface LedgerAccountsResponseDto {
  period: LedgerPeriod;
  accounts: LedgerAccountBalanceDto[];
}

// GET ledger/accounts/:accountId/legs
export interface LedgerLegEntryDto {
  legId: number;
  txId: number;
  bookingDate: string;
  valueDate: string;
  description?: string;
  sourceType: string;
  sourceId: string;
  seq: number;
  counterAccountId?: number;
  counterAccountName?: string;
  amountNative: number;
  amountChf?: number;
  priceChf?: number;
  reversalOf?: number;
}

export interface LedgerLegsResponseDto {
  accountId: number;
  accountName: string;
  currency: string;
  period: LedgerPeriod;
  openingBalance: number;
  closingBalance: number;
  legs: LedgerLegEntryDto[];
  total: number;
}

// GET ledger/reconciliation
export interface AccountReconResultDto {
  accountId: number;
  accountName: string;
  ledgerBalance: number;
  externalFeedBalance: number;
  difference: number;
  feedTimestamp?: string;
  feedAge?: number;
  staleness: Staleness;
  status: AccountReconStatus;
}

export interface ReconStatusResponseDto {
  runAt: string;
  accounts: AccountReconResultDto[];
}

// GET ledger/suspense
export interface SuspenseLegDto {
  legId: number;
  txId: number;
  bookingDate: string;
  description?: string;
  sourceType: string;
  sourceId: string;
  amountNative: number;
  amountChf?: number;
  currency: string;
  age: number;
}

export interface SuspenseResponseDto {
  totalChf: number;
  legs: SuspenseLegDto[];
}

// GET ledger/margin
export interface MarginPeriodDto {
  date: string;
  feeIncome: number;
  executionCosts: number;
  otherOpex: number;
  realizedMargin: number;
  fxPnl: number;
}

export interface MarginResponseDto {
  periods: MarginPeriodDto[];
  totalFeeIncome: number;
  totalExecutionCosts: number;
  totalOtherOpex: number;
  totalRealizedMargin: number;
}

// GET ledger/equity-comparison
export interface EquityComparisonDecomposition {
  transitPhantom: number;
  staleFeed: number;
  spreadFees: number;
  other: number;
}

export interface EquityComparisonPeriodDto {
  date: string;
  journalEquity: number;
  financialDataLogTotal: number;
  difference: number;
  decomposition?: EquityComparisonDecomposition;
}

export interface EquityComparisonDto {
  periods: EquityComparisonPeriodDto[];
}
