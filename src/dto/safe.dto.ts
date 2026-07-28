export enum SafeOperationType {
  DEPOSIT = 'deposit',
  RECEIVE = 'receive',
  WITHDRAW = 'withdraw',
  SEND = 'send',
  SWAP = 'swap',
}

export enum TransactionMode {
  DEPOSIT = SafeOperationType.DEPOSIT,
  WITHDRAW = SafeOperationType.WITHDRAW,
  SWAP = SafeOperationType.SWAP,
}

export enum TransactionType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
}

export enum FiatCurrency {
  CHF = 'chf',
  EUR = 'eur',
  USD = 'usd',
}

export interface CustodyAsset {
  name: string;
  description: string;
}

export interface CustodyAssetBalance {
  asset: CustodyAsset;
  balance: number;
  value: CustodyFiatValue;
}

export interface CustodyBalance {
  totalValue: CustodyFiatValue;
  balances: CustodyAssetBalance[];
}

export interface CustodyFiatValue {
  chf: number;
  eur: number;
  usd: number;
}

export interface CustodyHistoryEntry {
  date: string;
  value: CustodyFiatValue;
}

export interface CustodyHistory {
  totalValue: CustodyHistoryEntry[];
}

export type CustodyAccountAccessLevel = 'Read' | 'Write';

export interface CustodyAccountOwner {
  id: number;
}

export interface CustodyAccount {
  /** null for the legacy Safe, which has no account row and is read through the plain endpoints. */
  id: number | null;
  title: string;
  description?: string;
  isLegacy: boolean;
  accessLevel: CustodyAccountAccessLevel;
  owner?: CustodyAccountOwner;
}
