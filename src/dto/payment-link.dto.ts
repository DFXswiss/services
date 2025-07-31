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

export enum WalletCategory {
  LIGHTNING = 'LIGHTNING',
  BITCOIN = 'BITCOIN', // Bitcoin & Lightning
  EVM = 'EVM',
  MULTI_CHAIN = 'MULTI_CHAIN', // excl. Lightning
  BINANCE_PAY = 'BINANCE_PAY',
}

export enum WalletAppId {
  DEUROWALLET = 'deurowallet',
  CAKEWALLET = 'cakewallet',
  FRANKENCOIN = 'frankencoin',
  PHOENIX = 'phoenix',
  WALLETOFSATOSHI = 'walletofsatoshi',
  BTC_TARO = 'btctaro',
  BITBANANA = 'bitbanana',
  BITKIT = 'bitkit',
  BLINK = 'blink',
  BLITZWALLET = 'blitzwallet',
  BLIXT = 'blixt',
  BREEZ = 'breez',
  COINCORNER = 'coincorner',
  LIFPAY = 'lifpay',
  LIPAWALLET = 'lipawallet',
  LNBITS = 'lnbits',
  AQUA = 'aqua',
  ONEKEY = 'onekey',
  POUCHPH = 'pouchph',
  ZEBEDEE = 'zebedee',
  ZEUS = 'zeus',
  BINANCE = 'binance',
  MUUN = 'muun',
}

export interface WalletInfo {
  id: WalletAppId;
  name: string;
  websiteUrl?: string;
  iconUrl: string;
  deepLink?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  recommended?: boolean;
  category: WalletCategory;
  supportedTokens?: string[];
  semiCompatible?: boolean;
  disabled?: boolean;
}

export interface MetaMaskInfo {
  accountAddress: string;
  transferAsset: Asset;
  transferAmount: number;
  minFee: number;
}

export interface PaymentLinkHistoryResponse extends PaymentLinkPayRequest {
  payments: PaymentLinkHistoryPayment[];
}

export interface PaymentLinkHistoryPayment {
  id: string;
  status: PaymentLinkPaymentStatus;
  amount: number;
  currency: string;
  date: Date;
  externalId: string;
}

export enum PaymentLinkMode {
  SINGLE = 'Single',
  MULTIPLE = 'Multiple',
  PUBLIC = 'Public',
}
