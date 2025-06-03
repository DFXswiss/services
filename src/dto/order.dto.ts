import { Fees, PriceStep, TransactionError } from '@dfx.swiss/react';
import { Beneficiary } from '@dfx.swiss/react/dist/definitions/sell';

export class CustodyOrderBuyResponseDto {
  remittanceInfo?: string;
  paymentLink?: string;
  name?: string;
  bank?: string;
  street?: string;
  number?: string;
  zip?: string;
  city?: string;
  country?: string;
  iban?: string;
  bic?: string;
  sepaInstant?: boolean;
}

export enum CustodyOrderStatus {
  CREATED = 'Created',
  CONFIRMED = 'Confirmed',
  APPROVED = 'Approved',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
}

export enum CustodyOrderType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',

  RECEIVE = 'Receive',
  SEND = 'Send',

  SWAP = 'Swap',

  SAVING_DEPOSIT = 'SavingDeposit',
  SAVING_WITHDRAWAL = 'SavingWithdrawal',
}

export interface OrderPaymentData {
  id: number;
  uid?: string;
  timestamp: Date;
  minVolume: number;
  maxVolume: number;
  amount: number;
  sourceAsset: string;
  targetAsset: string;
  fees: Fees;
  feesTarget: Fees;
  minVolumeTarget: number;
  maxVolumeTarget: number;
  exchangeRate: number;
  rate: number;
  priceSteps: PriceStep[];
  estimatedAmount: number;
  paymentRequest?: string;
  isValid: boolean;
  error?: TransactionError;
  beneficiary?: Beneficiary;
  buyInfos?: CustodyOrderBuyResponseDto;
}

export interface OrderPaymentInfo {
  type: CustodyOrderType;
  orderId: number;
  status: CustodyOrderStatus;
  paymentInfo: OrderPaymentData;
}
