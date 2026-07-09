// Mock @dfx.swiss/react to avoid ES module issues
jest.mock('@dfx.swiss/react', () => ({
  Validations: {
    Required: { required: { value: true, message: 'required' } },
    Custom: (validator: (value: any) => true | string) => ({ validate: validator }),
  },
}));

import { AddressZipValidation, ZipValidation } from '../util/validation-rules';

const validatorOf = (rules: any[]): ((value: any) => true | string) =>
  rules.find((rule) => 'validate' in rule).validate;

describe('ZipValidation (creditor / payout zip)', () => {
  const validate = validatorOf(ZipValidation);

  it('is required', () => {
    expect(ZipValidation.some((rule) => 'required' in rule)).toBe(true);
  });

  it('accepts zips up to 8 chars (longest OLKYPAY-safe formats)', () => {
    expect(validate('8001')).toBe(true);
    expect(validate('EC1A 1BB')).toBe(true);
  });

  // OLKYPAY rejects recipient zips > 8 chars (CLIENT_INVALID_ZIPCODE) and there is no backend
  // guard (api#3985 closed) — this cap must NOT be raised, or payouts get stuck in retry loops.
  it('rejects zips longer than 8 chars', () => {
    expect(validate('01310-100')).toBe('pattern');
    expect(validate('90210-1234')).toBe('pattern');
  });

  it('rejects a combined "<postcode> <city>" value', () => {
    expect(validate('97283 Riedenheim')).toBe('pattern');
  });

  it('passes empty values through to the required rule', () => {
    expect(validate('')).toBe(true);
    expect(validate(undefined)).toBe(true);
  });
});

describe('AddressZipValidation (KYC address zip)', () => {
  const validate = validatorOf(AddressZipValidation);

  it('is required', () => {
    expect(AddressZipValidation.some((rule) => 'required' in rule)).toBe(true);
  });

  it('accepts international formats up to 10 chars', () => {
    expect(validate('EC1A 1BB')).toBe(true);
    expect(validate('01310-100')).toBe(true);
    expect(validate('90210-1234')).toBe(true);
  });

  it('rejects zips longer than 10 chars', () => {
    expect(validate('12345678901')).toBe('pattern');
  });

  it('rejects a combined "<postcode> <city>" value', () => {
    expect(validate('97283 Riedenheim')).toBe('pattern');
  });
});
