import { FiatPaymentMethod, FundOrigin, InvestmentDate, Limit, TransactionState } from '@dfx.swiss/react';

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
  [TransactionState.CREATED]: 'Created',
  [TransactionState.PROCESSING]: 'Processing',
  [TransactionState.AML_PENDING]: 'AML pending',
  [TransactionState.FEE_TOO_HIGH]: 'Fee to high',
  [TransactionState.COMPLETED]: 'Completed',
  [TransactionState.FAILED]: 'Failed',
  [TransactionState.RETURNED]: 'Returned',
};

// --- LIMIT REQUESTS --- //
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
