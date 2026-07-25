jest.mock('@dfx.swiss/react', () => ({
  FiatPaymentMethod: {
    BANK: 'Bank',
    INSTANT: 'Instant',
    CARD: 'Card',
  },
}));

import { FiatPaymentMethod } from '@dfx.swiss/react';
import {
  getPersonalIbanErrorMessage,
  getStoredPaymentDetailErrorMessage,
  isPersonalIbanApplicable,
  normalizePersonalIban,
  toPersonalIbanProviderRequest,
} from '../util/personal-iban';

describe('personal IBAN selector mapping', () => {
  it.each(['frick', 'FRICK', 'Frick'])('maps the public %s value to the API enum', (value) => {
    expect(normalizePersonalIban(value)).toBe('Frick');
    expect(toPersonalIbanProviderRequest(value)).toEqual({ personalIbanProvider: 'Frick' });
  });

  it.each(['', 'unknown'])('preserves an explicit invalid value for fail-closed API validation', (value) => {
    expect(normalizePersonalIban(value)).toBe(value);
    expect(toPersonalIbanProviderRequest(value)).toEqual({ personalIbanProvider: value });
  });

  it('omits only an absent selector', () => {
    expect(normalizePersonalIban(undefined)).toBeUndefined();
    expect(toPersonalIbanProviderRequest(undefined)).toEqual({});
  });
});

describe('isPersonalIbanApplicable', () => {
  it('returns true for EUR with bank payment', () => {
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.BANK)).toBe(true);
  });

  it('returns false for non-EUR currency with bank payment', () => {
    expect(isPersonalIbanApplicable('CHF', FiatPaymentMethod.BANK)).toBe(false);
  });

  it('returns false for EUR with a non-bank payment method', () => {
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.INSTANT)).toBe(false);
  });

  it('returns false for undefined currency', () => {
    expect(isPersonalIbanApplicable(undefined, FiatPaymentMethod.BANK)).toBe(false);
  });

  it('returns false for undefined payment method', () => {
    expect(isPersonalIbanApplicable('EUR', undefined)).toBe(false);
  });
});

describe('getPersonalIbanErrorMessage', () => {
  it('maps PaymentMethodNotAllowed to the bank-transfer requirement message', () => {
    expect(getPersonalIbanErrorMessage('PaymentMethodNotAllowed')).toBe(
      'Personal IBANs require the bank transfer payment method.',
    );
  });

  it('maps PersonalIbanIssuanceFailed to a retry-or-support message', () => {
    expect(getPersonalIbanErrorMessage('PersonalIbanIssuanceFailed')).toBe(
      'We could not issue your personal IBAN. Please try again later or contact support if the problem persists.',
    );
  });

  it('maps the PersonalIbanProviderUnsupported token to the unrecognized-provider message', () => {
    expect(getPersonalIbanErrorMessage('PersonalIbanProviderUnsupported')).toBe(
      'The requested personal IBAN provider is not recognized.',
    );
  });

  it('maps KycRequired to the personal-IBAN KYC level 50 message', () => {
    expect(getPersonalIbanErrorMessage('KycRequired')).toBe('Personal IBANs require KYC level 50.');
  });

  it('maps PersonalIbanCurrencyNotSupported to the EUR-only rejection message', () => {
    expect(getPersonalIbanErrorMessage('PersonalIbanCurrencyNotSupported')).toBe(
      'Personal IBANs are currently only available for EUR.',
    );
  });

  it('does not match raw untokenized backend texts', () => {
    // Intentionally unmapped BadRequestException free-text (not a QuoteError token).
    expect(getPersonalIbanErrorMessage('Asset not found')).toBeUndefined();
  });

  it('returns undefined for undefined message', () => {
    expect(getPersonalIbanErrorMessage(undefined)).toBeUndefined();
  });

  it('returns undefined for unrelated messages', () => {
    expect(getPersonalIbanErrorMessage('some unrelated message')).toBeUndefined();
  });
});

describe('getStoredPaymentDetailErrorMessage', () => {
  it.each([
    [
      'StoredTransactionRequestBankSelectionIncomplete',
      'This stored payment detail is incomplete. Please start a new purchase.',
    ],
    [
      'StoredTransactionRequestBankNoLongerExists',
      'The bank for this payment is no longer available. Please start a new purchase.',
    ],
    [
      'StoredPersonalIbanDoesNotBelongToThisUser',
      'This stored personal IBAN is no longer valid for your account. Please start a new purchase.',
    ],
    [
      'StoredPersonalIbanDoesNotMatchThisTransactionRequest',
      'This stored personal IBAN does not match this transaction. Please start a new purchase.',
    ],
    ['StoredPersonalIbanIsNoLongerActive', 'This personal IBAN is no longer active. Please start a new purchase.'],
    ['StoredBankNoLongerAcceptsPayments', 'This bank no longer accepts payments. Please start a new purchase.'],
    [
      'CurrencyNotFound',
      'The selected currency is not available. Please try a different currency or contact support.',
    ],
    [
      'NoBankAvailableForThisCurrency',
      'No bank is available for this currency. Please try a different currency or contact support.',
    ],
  ] as const)('maps %s to customer-facing copy', (token, text) => {
    expect(getStoredPaymentDetailErrorMessage(token)).toBe(text);
    expect(getStoredPaymentDetailErrorMessage(token)).toBeTruthy();
  });

  it('returns undefined for undefined message', () => {
    expect(getStoredPaymentDetailErrorMessage(undefined)).toBeUndefined();
  });
});
