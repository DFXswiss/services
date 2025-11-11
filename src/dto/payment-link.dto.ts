import { Asset, Blockchain, PaymentLinkMode, PaymentLinkPaymentStatus, PaymentStandardType } from '@dfx.swiss/react';

export interface PaymentStandard {
  id: PaymentStandardType;
  label: string;
  description: string;
  paymentIdentifierLabel?: string;
  blockchain?: Blockchain;
}

export interface Quote {
  id: string;
  expiration: Date;
  payment: string;
}

export interface Amount {
  asset: string;
  amount?: number;
}

export enum C2BPaymentMethod {
  BINANCE_PAY = 'BinancePay',
  KUCOINPAY = 'KucoinPay',
}

export type TransferMethod = Blockchain | C2BPaymentMethod;

export interface TransferInfo {
  method: TransferMethod;
  minFee: number;
  assets: Amount[];
  available?: boolean;
}

export interface RecipientInfo {
  address?: {
    city: string;
    country: string;
    houseNumber: string;
    street: string;
    zip: string;
  };
  name?: string;
  mail?: string;
  phone?: string;
  website?: string;
}

export interface PaymentLinkPayTerminal {
  id: string;
  externalId?: string;
  tag: string;
  displayName: string;
  standard: PaymentStandardType;
  possibleStandards: PaymentStandardType[];
  displayQr: boolean;
  mode: PaymentLinkMode;
  route: string;
  currency: string;
  recipient: RecipientInfo;
  transferAmounts: TransferInfo[];

  // error fields
  statusCode?: number;
  message?: string;
  error?: string;
}

export enum NoPaymentLinkPaymentStatus {
  NO_PAYMENT = 'NoPayment',
}

export type ExtendedPaymentLinkStatus = PaymentLinkPaymentStatus | NoPaymentLinkPaymentStatus;

export interface PaymentStatus {
  status: PaymentLinkPaymentStatus;
}

export interface PaymentLinkPayRequest extends PaymentLinkPayTerminal {
  quote: Quote;
  callback: string;
  metadata: string;
  minSendable: number;
  maxSendable: number;
  requestedAmount: Amount;
}

export interface WalletInfo {
  id: number;
  name: string;
  websiteUrl?: string;
  iconUrl: string;
  deepLink?: string;
  hasActionDeepLink?: boolean;
  appStoreUrl?: string;
  playStoreUrl?: string;
  recommended?: boolean;
  supportedMethods: TransferMethod[];
  supportedAssets?: Asset[];
  semiCompatible?: boolean;
  active?: boolean;
}

export interface MetaMaskInfo {
  accountAddress: string;
  transferAsset: Asset;
  transferAmount: number;
  minFee: number;
}

export interface PaymentLinkHistory extends PaymentLinkPayRequest {
  payments: PaymentLinkHistoryPayment[];
  totalCompletedAmount: number;
}

export interface PaymentLinkHistoryPayment {
  id: string;
  status: PaymentLinkPaymentStatus;
  amount: number;
  currency: string;
  date: Date;
  externalId: string;
}
