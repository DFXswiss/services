// Mock @dfx.swiss/react
jest.mock('@dfx.swiss/react', () => ({
  TransactionState: {
    UNASSIGNED: 'Unassigned',
    WAITING_FOR_PAYMENT: 'WaitingForPayment',
    CREATED: 'Created',
    PROCESSING: 'Processing',
    CHECK_PENDING: 'CheckPending',
    KYC_REQUIRED: 'KycRequired',
    FEE_TOO_HIGH: 'FeeTooHigh',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    RETURNED: 'Returned',
    RETURN_PENDING: 'ReturnPending',
    LIMIT_EXCEEDED: 'LimitExceeded',
    LIQUIDITY_PENDING: 'LiquidityPending',
    PAYOUT_IN_PROGRESS: 'PayoutInProgress',
    PRICE_UNDETERMINABLE: 'PriceUndeterminable',
  },
  FiatPaymentMethod: {
    BANK: 'Bank',
    INSTANT: 'Instant',
    CARD: 'Card',
  },
  UserRole: {
    CUSTODY: 'Custody',
    USER: 'User',
  },
  Limit: {
    K_500: 'K_500',
    M_1: 'M_1',
    M_5: 'M_5',
    M_10: 'M_10',
    M_15: 'M_15',
    INFINITY: 'Infinity',
  },
  InvestmentDate: {
    NOW: 'Now',
    FUTURE: 'Future',
  },
  FundOrigin: {
    SAVINGS: 'Savings',
    BUSINESS_PROFITS: 'BusinessProfits',
    STOCK_GAINS: 'StockGains',
    CRYPTO_GAINS: 'CryptoGains',
    INHERITANCE: 'Inheritance',
    OTHER: 'Other',
  },
  SupportIssueType: {
    GENERIC_ISSUE: 'GenericIssue',
    TRANSACTION_ISSUE: 'TransactionIssue',
    KYC_ISSUE: 'KycIssue',
    LIMIT_REQUEST: 'LimitRequest',
    PARTNERSHIP_REQUEST: 'PartnershipRequest',
    NOTIFICATION_OF_CHANGES: 'NotificationOfChanges',
    BUG_REPORT: 'BugReport',
  },
  SupportIssueReason: {
    OTHER: 'Other',
    DATA_REQUEST: 'DataRequest',
    FUNDS_NOT_RECEIVED: 'FundsNotReceived',
    TRANSACTION_MISSING: 'TransactionMissing',
  },
  TransactionFailureReason: {},
  PaymentQuoteStatus: {},
  FileType: {},
}));

import { toPaymentStateLabel, PaymentMethodLabels, LimitLabels, addressLabel } from '../config/labels';
import { TransactionState, FiatPaymentMethod, Limit, UserRole } from '@dfx.swiss/react';

describe('labels', () => {
  describe('PaymentMethodLabels', () => {
    it('should have label for BANK', () => {
      expect(PaymentMethodLabels[FiatPaymentMethod.BANK]).toBe('Standard bank transaction');
    });

    it('should have label for INSTANT', () => {
      expect(PaymentMethodLabels[FiatPaymentMethod.INSTANT]).toBe('Instant bank transaction');
    });

    it('should have label for CARD', () => {
      expect(PaymentMethodLabels[FiatPaymentMethod.CARD]).toBe('Credit card');
    });
  });

  describe('toPaymentStateLabel', () => {
    it('should return correct label for known states', () => {
      expect(toPaymentStateLabel(TransactionState.COMPLETED)).toBe('Completed');
      expect(toPaymentStateLabel(TransactionState.PROCESSING)).toBe('Processing');
      expect(toPaymentStateLabel(TransactionState.FAILED)).toBe('Failed');
    });

    it('should return "Unknown" for unknown states', () => {
      expect(toPaymentStateLabel('UnknownState' as TransactionState)).toBe('Unknown');
    });
  });

  describe('LimitLabels', () => {
    it('should have labels for all limits', () => {
      expect(LimitLabels[Limit.K_500]).toContain('500');
      expect(LimitLabels[Limit.M_1]).toContain('1');
      expect(LimitLabels[Limit.INFINITY]).toContain('15');
    });
  });

  describe('addressLabel', () => {
    it('should return "DFX Safe" for custody wallet', () => {
      const custodyWallet = { role: UserRole.CUSTODY, address: '0x123' };
      expect(addressLabel(custodyWallet as any)).toBe('DFX Safe');
    });

    it('should return "DFX Safe" for session with isCustody', () => {
      const session = { isCustody: true, address: '0x123' };
      expect(addressLabel(session as any)).toBe('DFX Safe');
    });

    it('should return address for non-custody wallet', () => {
      const wallet = { role: UserRole.USER, address: '0xABC123' };
      expect(addressLabel(wallet as any)).toBe('0xABC123');
    });

    it('should return empty string if no address', () => {
      const wallet = { role: UserRole.USER };
      expect(addressLabel(wallet as any)).toBe('');
    });
  });
});
