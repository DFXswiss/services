export interface HistoricalBalance {
  balance: string;
  timestamp: string;
  valueChf?: number;
}

export interface AccountSummary {
  address: string;
  addressType: number;
  balance: string;
  lastUpdated: string;
  historicalBalances?: HistoricalBalance[];
}

export interface HistoryEvent {
  timestamp: string;
  eventType: string;
  txHash: string;
  addressTypeUpdate?: {
    addressType: string;
  };
  approval?: {
    spender: string;
    value: string;
  };
  tokensDeclaredInvalid?: {
    amount: string;
    message: string;
  };
  transfer?: {
    from: string;
    to: string;
    value: string;
  };
}

export interface AccountHistory {
  address: string;
  addressType: number;
  history: HistoryEvent[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface Holder {
  address: string;
  balance: string;
  percentage: number;
}

export interface TokenInfo {
  totalShares: {
    total: string;
    timestamp: string;
    txHash: string;
  };
  totalSupply: {
    value: string;
    timestamp: string;
  };
}
export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
}

export interface HoldersResponse {
  holders: Holder[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface PriceHistoryEntry {
  timestamp: string;
  chf: number;
  eur: number;
  usd: number;
}

export enum PaginationDirection {
  NEXT = 'next',
  PREV = 'prev',
}
export interface RealunitContextData {
  holders?: Holder[];
  totalCount?: number;
  pageInfo?: PageInfo;
  tokenInfo?: TokenInfo;
  priceHistory?: PriceHistoryEntry[];
  lastTimeframe?: string;
  lastAddress?: string;
  lastAccountData?: AccountSummary;
  lastAccountHistory?: AccountHistory;
}

export interface RealunitContextInterface {
  cachedData: RealunitContextData;
  setCachedData: (data: RealunitContextData | ((prev: RealunitContextData) => RealunitContextData)) => void;
}
