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

export interface TokenPrice {
  timestamp: string;
  chf: number;
  eur: number;
  usd: number;
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
  data?: AccountSummary;
  history?: AccountHistory;
  isLoading: boolean;
  holders: Holder[];
  totalCount?: number;
  pageInfo: PageInfo;
  tokenInfo?: TokenInfo;
  priceHistory: PriceHistoryEntry[];
  lastTimeframe?: string;
}

export interface RealunitContextInterface {
  data?: AccountSummary;
  setData: (data: AccountSummary | undefined) => void;
  history?: AccountHistory;
  setHistory: (history: AccountHistory | undefined) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  holders: Holder[];
  setHolders: (holders: Holder[]) => void;
  totalCount?: number;
  setTotalCount: (totalCount: number | undefined) => void;
  pageInfo: PageInfo;
  setPageInfo: (pageInfo: PageInfo) => void;
  tokenInfo?: TokenInfo;
  setTokenInfo: (tokenInfo: TokenInfo | undefined) => void;
  tokenPrice?: TokenPrice;
  setTokenPrice: (tokenPrice: TokenPrice | undefined) => void;
  priceHistory: PriceHistoryEntry[];
  setPriceHistory: (priceHistory: PriceHistoryEntry[]) => void;
  lastTimeframe?: string;
  setLastTimeframe: (timeframe: string | undefined) => void;
}
