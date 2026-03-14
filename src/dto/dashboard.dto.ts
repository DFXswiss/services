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

export interface FinancialChangesEntry {
  timestamp: string;
  total: number;
  plus: {
    total: number;
    buyCrypto: number;
    buyFiat: number;
    paymentLink: number;
    trading: number;
  };
  minus: {
    total: number;
    ref: { total: number; amount: number; fee: number };
    binance: { total: number; withdraw: number; trading: number };
    blockchain: { total: number; txIn: number; txOut: number; trading: number };
  };
}

export interface FinancialChangesResponse {
  entries: FinancialChangesEntry[];
}

export interface BalanceByGroup {
  name: string;
  plusBalanceChf: number;
  minusBalanceChf: number;
  netBalanceChf: number;
  assets?: Record<string, number>;
}

export interface LatestBalanceResponse {
  timestamp: string;
  byType: BalanceByGroup[];
  byBlockchain: BalanceByGroup[];
}
