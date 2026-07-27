// Literal QuoteError token strings must stay in sync with
// api/src/subdomains/supporting/payment/dto/transaction-helper/quote-error.enum.ts.
// These tests are the contract safety net for personal-IBAN error mappers.

jest.mock('@dfx.swiss/react', () => ({
  FiatPaymentMethod: {
    BANK: 'Bank',
    INSTANT: 'Instant',
    CARD: 'Card',
  },
  PersonalIbanProvider: { FRICK: 'Frick' },
}));

import { FiatPaymentMethod, PersonalIbanProvider } from '@dfx.swiss/react';
import {
  FRICK_ACCOUNT_HOLDER_NAME,
  FRICK_BANK_NAME,
  getPersonalIbanErrorMessage,
  getPersonalIbanKycMessage,
  getStoredPaymentDetailErrorMessage,
  isExplicitFrickPersonalIbanRequest,
  isKycRequiredMessage,
  isPersonalIbanApplicable,
  isUnrecognizedPersonalIbanSelector,
  isVerifiedFrickPersonalIbanResponse,
  normalizePersonalIban,
  personalIbanOnlyParams,
  toPersonalIbanProviderRequest,
} from '../util/personal-iban';

describe('personal IBAN selector mapping', () => {
  it.each(['frick', 'FRICK', 'Frick'])('maps the public %s value to the API enum', (value) => {
    expect(normalizePersonalIban(value)).toBe(PersonalIbanProvider.FRICK);
    expect(toPersonalIbanProviderRequest(value)).toEqual({ personalIbanProvider: PersonalIbanProvider.FRICK });
    expect(isUnrecognizedPersonalIbanSelector(value)).toBe(false);
  });

  it.each(['', 'unknown'])(
    'omits an unrecognized value from the request (fail-closed now happens locally, not via the API round trip)',
    (value) => {
      expect(normalizePersonalIban(value)).toBe(value);
      expect(toPersonalIbanProviderRequest(value)).toEqual({});
      expect(isUnrecognizedPersonalIbanSelector(value)).toBe(true);
    },
  );

  it('omits an absent selector and does not flag it as unrecognized', () => {
    expect(normalizePersonalIban(undefined)).toBeUndefined();
    expect(toPersonalIbanProviderRequest(undefined)).toEqual({});
    expect(isUnrecognizedPersonalIbanSelector(undefined)).toBe(false);
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

// Tokens must match QuoteError string values for the buy/purchase path
// (resolveBankInfo / getOrCreateFrickForUser / DTO validation).
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

  it('does not map KycRequired (routed through QuoteErrorHint with a separate feature message)', () => {
    expect(getPersonalIbanErrorMessage('KycRequired')).toBeUndefined();
    expect(isKycRequiredMessage('KycRequired')).toBe(true);
    expect(getPersonalIbanKycMessage()).toBe('Personal IBANs require KYC level 50.');
  });

  it('maps PersonalIbanCurrencyNotSupported to the EUR-only rejection message', () => {
    expect(getPersonalIbanErrorMessage('PersonalIbanCurrencyNotSupported')).toBe(
      'Personal IBANs are currently only available for EUR.',
    );
  });

  it('maps CurrencyUnsupported to the currency-unavailable message', () => {
    expect(getPersonalIbanErrorMessage('CurrencyUnsupported')).toBe(
      'The selected currency is not available. Please try a different currency or contact support.',
    );
  });

  it('maps NoBankAvailableForThisCurrency to the no-bank message', () => {
    expect(getPersonalIbanErrorMessage('NoBankAvailableForThisCurrency')).toBe(
      'No bank is available for this currency. Please try a different currency or contact support.',
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

// Tokens must match QuoteError string values for getBankInfoForRequest (stored-detail reconstruction).
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
      'StoredPersonalIbanUserMismatch',
      'This stored personal IBAN is no longer valid for your account. Please start a new purchase.',
    ],
    [
      'StoredPersonalIbanTransactionRequestMismatch',
      'This stored personal IBAN does not match this transaction. Please start a new purchase.',
    ],
    ['StoredPersonalIbanIsNoLongerActive', 'This personal IBAN is no longer active. Please start a new purchase.'],
    ['StoredBankNoLongerAcceptsPayments', 'This bank no longer accepts payments. Please start a new purchase.'],
  ] as const)('maps %s to customer-facing copy', (token, text) => {
    expect(getStoredPaymentDetailErrorMessage(token)).toBe(text);
    expect(getStoredPaymentDetailErrorMessage(token)).toBeTruthy();
  });

  it.each([
    'StoredPersonalIbanDoesNotBelongToThisUser',
    'StoredPersonalIbanDoesNotMatchThisTransactionRequest',
    'CurrencyNotFound',
  ] as const)('does not match obsolete/wrong token %s', (token) => {
    expect(getStoredPaymentDetailErrorMessage(token)).toBeUndefined();
  });

  it('does not map NoBankAvailableForThisCurrency (buy-path token only)', () => {
    expect(getStoredPaymentDetailErrorMessage('NoBankAvailableForThisCurrency')).toBeUndefined();
  });

  it('returns undefined for undefined message', () => {
    expect(getStoredPaymentDetailErrorMessage(undefined)).toBeUndefined();
  });
});

describe('isVerifiedFrickPersonalIbanResponse', () => {
  it('accepts a Bank Frick response held by DFX AG', () => {
    expect(
      isVerifiedFrickPersonalIbanResponse({
        isPersonalIban: true,
        bank: FRICK_BANK_NAME,
        name: FRICK_ACCOUNT_HOLDER_NAME,
      }),
    ).toBe(true);
  });

  it('rejects ordinary bank details (rollback / stripped selector)', () => {
    expect(
      isVerifiedFrickPersonalIbanResponse({
        isPersonalIban: false,
        bank: undefined,
        name: 'DFX AG',
      }),
    ).toBe(false);
  });

  it('rejects legacy Frick-style responses that name the customer as holder', () => {
    expect(
      isVerifiedFrickPersonalIbanResponse({
        isPersonalIban: true,
        bank: FRICK_BANK_NAME,
        name: 'Alice Example',
      }),
    ).toBe(false);
  });

  it('rejects Yapeal-style personal IBAN without Bank Frick', () => {
    expect(
      isVerifiedFrickPersonalIbanResponse({
        isPersonalIban: true,
        bank: 'Yapeal',
        name: 'Alice Example',
      }),
    ).toBe(false);
  });
});

describe('isExplicitFrickPersonalIbanRequest', () => {
  it('is true only for a recognized Frick selector', () => {
    expect(isExplicitFrickPersonalIbanRequest('Frick')).toBe(true);
    expect(isExplicitFrickPersonalIbanRequest('frick')).toBe(true);
    expect(isExplicitFrickPersonalIbanRequest('unknown')).toBe(false);
    expect(isExplicitFrickPersonalIbanRequest(undefined)).toBe(false);
  });
});

describe('personalIbanOnlyParams', () => {
  it('copies only personal-iban when present', () => {
    const params = personalIbanOnlyParams('?user=alice@example.com&personal-iban=frick&arbitrary=value');
    expect(params.get('personal-iban')).toBe('frick');
    expect(params.get('user')).toBeNull();
    expect(params.get('arbitrary')).toBeNull();
    expect([...params.keys()]).toEqual(['personal-iban']);
  });

  it('returns an empty set when personal-iban is absent', () => {
    const params = personalIbanOnlyParams('?user=alice@example.com&arbitrary=value');
    expect([...params.keys()]).toEqual([]);
  });
});
