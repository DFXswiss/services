export interface FinancialLogEntry {
  timestamp: string;
  totalBalanceChf: number;
  plusBalanceChf: number;
  minusBalanceChf: number;
  btcPriceChf: number;
  balancesByType: Record<string, { plusBalanceChf: number; minusBalanceChf: number }>;
}

export interface FinancialLogResponse {
  entries: FinancialLogEntry[];
}
