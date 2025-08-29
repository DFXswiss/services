import {
  FiatPaymentMethod,
  FileType,
  FundOrigin,
  InvestmentDate,
  Limit,
  PaymentQuoteStatus,
  Session,
  SupportIssueReason,
  SupportIssueType,
  TransactionFailureReason,
  TransactionState,
  UserAddress,
  UserRole,
} from '@dfx.swiss/react';

// --- PAYMENTS --- //
export const PaymentMethodLabels = {
  [FiatPaymentMethod.BANK]: 'Standard bank transaction',
  [FiatPaymentMethod.INSTANT]: 'Instant bank transaction',
  [FiatPaymentMethod.CARD]: 'Credit card',
};

export const PaymentMethodDescriptions = {
  [FiatPaymentMethod.BANK]: 'SWIFT, SEPA, SIC, euroSIC',
  [FiatPaymentMethod.INSTANT]: 'SEPA Instant',
  [FiatPaymentMethod.CARD]: 'Mastercard, Visa, Google Pay, Apple Pay',
};

export const PaymentStateLabels = {
  [TransactionState.UNASSIGNED]: 'Unassigned',
  [TransactionState.WAITING_FOR_PAYMENT]: 'Waiting for payment',
  [TransactionState.CREATED]: 'Created',
  [TransactionState.PROCESSING]: 'Processing',
  [TransactionState.CHECK_PENDING]: 'DFX check pending',
  [TransactionState.KYC_REQUIRED]: 'KYC required',
  [TransactionState.FEE_TOO_HIGH]: 'Fee to high',
  [TransactionState.COMPLETED]: 'Completed',
  [TransactionState.FAILED]: 'Failed',
  [TransactionState.RETURNED]: 'Refunded',
  [TransactionState.RETURN_PENDING]: 'Refund pending',
  [TransactionState.LIMIT_EXCEEDED]: 'Limit exceeded',
  [TransactionState.LIQUIDITY_PENDING]: 'Liquidity pending',
  [TransactionState.PAYOUT_IN_PROGRESS]: 'Payout in progress',
  [TransactionState.PRICE_UNDETERMINABLE]: 'Price undeterminable',
};

export function toPaymentStateLabel(state: TransactionState): string {
  return PaymentStateLabels[state] ?? 'Unknown';
}

export const PaymentFailureReasons = {
  [TransactionFailureReason.UNKNOWN]: 'Unknown',
  [TransactionFailureReason.DAILY_LIMIT_EXCEEDED]: 'Daily limit exceeded',
  [TransactionFailureReason.MONTHLY_LIMIT_EXCEEDED]: 'Monthly limit exceeded',
  [TransactionFailureReason.ANNUAL_LIMIT_EXCEEDED]: 'Annual limit exceeded',
  [TransactionFailureReason.ACCOUNT_HOLDER_MISMATCH]: 'Account holder mismatch',
  [TransactionFailureReason.KYC_REJECTED]: 'KYC rejected',
  [TransactionFailureReason.FRAUD_SUSPICION]: 'Regulatory requirements',
  [TransactionFailureReason.SANCTION_SUSPICION]: 'Name corresponds to a PEP or sanctioned person',
  [TransactionFailureReason.MIN_DEPOSIT_NOT_REACHED]: 'Minimum deposit not reached',
  [TransactionFailureReason.ASSET_NOT_AVAILABLE]: 'Asset not available',
  [TransactionFailureReason.ASSET_NOT_AVAILABLE_WITH_CHOSEN_BANK]: 'Asset not available with chosen bank',
  [TransactionFailureReason.STAKING_DISCONTINUED]: 'Staking discontinued',
  [TransactionFailureReason.BANK_NOT_ALLOWED]: 'Bank not allowed',
  [TransactionFailureReason.PAYMENT_ACCOUNT_NOT_ALLOWED]: 'Payment account not allowed',
  [TransactionFailureReason.COUNTRY_NOT_ALLOWED]: 'Country not allowed',
  [TransactionFailureReason.INSTANT_PAYMENT]: 'Instant payment',
  [TransactionFailureReason.FEE_TOO_HIGH]: 'Network fee too high',
  [TransactionFailureReason.RECEIVER_REJECTED]: 'Payment rejected by receiver node',
  [TransactionFailureReason.CHF_ABROAD_NOT_ALLOWED]: 'CHF abroad not allowed',
  [TransactionFailureReason.ASSET_KYC_NEEDED]: 'Asset requires KYC',
  [TransactionFailureReason.CARD_NAME_MISMATCH]: 'Card name mismatch',
  [TransactionFailureReason.USER_DELETED]: 'Address deleted',
  [TransactionFailureReason.VIDEO_IDENT_NEEDED]: 'Video identification required',
  [TransactionFailureReason.MISSING_LIQUIDITY]: 'Missing liquidity',
  [TransactionFailureReason.KYC_DATA_NEEDED]: 'KYC data needed',
  [TransactionFailureReason.BANK_TX_NEEDED]: 'Bank transaction needed',
  [TransactionFailureReason.PHONE_VERIFICATION_NEEDED]: 'Verification by phone required',
};

export const PaymentQuoteStatusLabels = {
  [PaymentQuoteStatus.ACTUAL]: 'Actual',
  [PaymentQuoteStatus.CANCELLED]: 'Cancelled',
  [PaymentQuoteStatus.EXPIRED]: 'Expired',
  [PaymentQuoteStatus.TX_RECEIVED]: 'Transaction received',
  [PaymentQuoteStatus.TX_MEMPOOL]: 'Transaction in mempool',
  [PaymentQuoteStatus.TX_BLOCKCHAIN]: 'Transaction in blockchain',
  [PaymentQuoteStatus.TX_COMPLETED]: 'Transaction completed',
  [PaymentQuoteStatus.TX_FAILED]: 'Transaction failed',
};

// --- Limit increase requestS --- //
export const LimitLabels = {
  [Limit.K_500]: "CHF 100'000 - 500'000",
  [Limit.M_1]: "CHF 500'000 - 1'000'000",
  [Limit.M_5]: "CHF 1'000'000 - 5'000'000",
  [Limit.M_10]: "CHF 5'000'000 - 10'000'000",
  [Limit.M_15]: "CHF 10'000'000 - 15'000'000",
  [Limit.INFINITY]: "> CHF 15'000'000",
};

export const DateLabels = {
  [InvestmentDate.NOW]: 'Current assets',
  [InvestmentDate.FUTURE]: 'Future assets',
};

export const OriginNowLabels = {
  [FundOrigin.SAVINGS]: 'Savings',
  [FundOrigin.BUSINESS_PROFITS]: 'Business profits',
  [FundOrigin.STOCK_GAINS]: 'Stock price gains',
  [FundOrigin.CRYPTO_GAINS]: 'Crypto price gains',
  [FundOrigin.INHERITANCE]: 'Inheritance',
  [FundOrigin.OTHER]: 'Other',
};

export const OriginFutureLabels = {
  [FundOrigin.SAVINGS]: 'Future savings',
  [FundOrigin.BUSINESS_PROFITS]: 'Future business profits',
  [FundOrigin.STOCK_GAINS]: 'Future stock price gains',
  [FundOrigin.CRYPTO_GAINS]: 'Future crypto price gains',
  [FundOrigin.INHERITANCE]: 'Future inheritance',
  [FundOrigin.OTHER]: 'Other',
};

// --- SUPPORT ISSUE --- //
export const IssueTypeLabels = {
  [SupportIssueType.GENERIC_ISSUE]: 'Generic issue',
  [SupportIssueType.TRANSACTION_ISSUE]: 'Transaction issue',
  [SupportIssueType.KYC_ISSUE]: 'KYC issue',
  [SupportIssueType.LIMIT_REQUEST]: 'Limit increase request',
  [SupportIssueType.PARTNERSHIP_REQUEST]: 'Partnership request',
  [SupportIssueType.NOTIFICATION_OF_CHANGES]: 'Notification of changes',
  [SupportIssueType.BUG_REPORT]: 'Bug report',
};

export const IssueReasonLabels = {
  [SupportIssueReason.OTHER]: 'Other',
  [SupportIssueReason.DATA_REQUEST]: 'Data request',
  [SupportIssueReason.FUNDS_NOT_RECEIVED]: 'Funds not received',
  [SupportIssueReason.TRANSACTION_MISSING]: 'Transaction missing',
};

export const FileTypeLabels = {
  [FileType.NAME_CHECK]: 'Name check',
  [FileType.USER_INFORMATION]: 'User information',
  [FileType.IDENTIFICATION]: 'Identification',
  [FileType.USER_NOTES]: 'User notes',
  [FileType.TRANSACTION_NOTES]: 'Transaction notes',
  [FileType.STOCK_REGISTER]: 'Stock register',
  [FileType.COMMERCIAL_REGISTER]: 'Commercial register',
  [FileType.RESIDENCE_PERMIT]: 'Residence permit',
  [FileType.ADDITIONAL_DOCUMENTS]: 'Additional documents',
  [FileType.AUTHORITY]: 'Power of Attorney',
};

// --- ADDRESSES --- //
export function addressLabel(wallet: UserAddress | Session): string {
  const custodyLabel = 'DFX Safe';
  return ('role' in wallet && wallet.role === UserRole.CUSTODY) || ('isCustody' in wallet && wallet.isCustody)
    ? custodyLabel
    : wallet.address ?? '';
}
