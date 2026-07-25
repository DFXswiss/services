jest.mock('@dfx.swiss/react', () => ({
  TransactionError: {
    KYC_REQUIRED: 'KycRequired',
    IBAN_CURRENCY_MISMATCH: 'IbanCurrencyMismatch',
    PAYMENT_METHOD_NOT_ALLOWED: 'PaymentMethodNotAllowed',
  },
}));

import { TransactionError } from '@dfx.swiss/react';
import { getKycErrorFromMessage } from '../util/api-error';

describe('getKycErrorFromMessage', () => {
  it('does not map PersonalIbanCurrencyNotSupported (handled by getPersonalIbanErrorMessage)', () => {
    expect(getKycErrorFromMessage('PersonalIbanCurrencyNotSupported')).toBeUndefined();
  });

  it('maps KycRequired to KYC_REQUIRED', () => {
    expect(getKycErrorFromMessage('KycRequired')).toBe(TransactionError.KYC_REQUIRED);
  });

  it('maps KYC required to KYC_REQUIRED', () => {
    expect(getKycErrorFromMessage('KYC required')).toBe(TransactionError.KYC_REQUIRED);
  });

  it('returns undefined for undefined message', () => {
    expect(getKycErrorFromMessage(undefined)).toBeUndefined();
  });
});
