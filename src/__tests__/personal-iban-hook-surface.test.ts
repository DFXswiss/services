jest.mock('@dfx.swiss/react', () => ({
  PersonalIbanProvider: { FRICK: 'Frick' },
}));

import * as personalIbanHook from '../hooks/personal-iban.hook';

describe('personal-IBAN hook module surface', () => {
  it('does not expose the unused selector-only hook', () => {
    expect(personalIbanHook).not.toHaveProperty('usePersonalIban');
  });
});
