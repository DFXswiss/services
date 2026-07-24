import { normalizePersonalIban, toPersonalIbanProviderRequest } from '../util/personal-iban';

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
