import { Asset } from './asset';
import { Fiat } from './fiat';

export const BuyUrl = { receive: 'buy/paymentInfos' };

export interface MinDeposit {
  amount: number;
  asset: string;
}

export interface Buy {
  name: string;
  country: string;
  street: string;
  city: string;
  zip: string;
  number: string;
  fee: number;
  iban: string;
  bic: string;
  remittanceInfo: string;
  minDeposit: MinDeposit;
  sepaInstant: boolean;
  giroCode?: string;
}

export interface BuyPaymentInfo {
  iban: string;
  currency: Fiat;
  amount: number;
  asset: Asset;
}
