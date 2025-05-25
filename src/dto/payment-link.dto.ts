import { Asset, Blockchain } from '@dfx.swiss/react';
import { PaymentLinkPaymentStatus, PaymentStandardType } from '@dfx.swiss/react/dist/definitions/route';

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
  amount: number;
}

export enum C2BPaymentMethod {
  BINANCE_PAY = 'BinancePay',
}

export type TransferMethod = Blockchain | C2BPaymentMethod;

export interface TransferInfo {
  method: TransferMethod;
  minFee: number;
  assets: Amount[];
  available?: boolean;
}

export interface PaymentLinkPayTerminal {
  id: string;
  externalId?: string;
  tag: string;
  displayName: string;
  standard: PaymentStandardType;
  possibleStandards: PaymentStandardType[];
  displayQr: boolean;
  recipient: {
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
  };

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
  transferAmounts: TransferInfo[];
}

export interface WalletInfo {
  id: string;
  name: string;
  websiteUrl: string;
  iconUrl: string;
  deepLink?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  recommended?: boolean;
  transferMethod?: TransferMethod;
  semiCompatible?: boolean;
  disabled?: boolean;
}

export interface MetaMaskInfo {
  accountAddress: string;
  transferAsset: Asset;
  transferAmount: number;
  minFee: number;
}
