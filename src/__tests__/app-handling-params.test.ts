jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => ({ isLoggedIn: false, isInitialized: true, availableBlockchains: [] }),
}));

import { AppParams, removeNonStorageParams } from '../contexts/app-handling.context';

describe('removeNonStorageParams', () => {
  it('still excludes the pre-existing transient params (regression guard)', () => {
    const params: AppParams = {
      address: 'addr',
      signature: 'sig',
      pubkey: 'pk',
      session: 'jwt',
      autoStart: 'true',
      assetIn: 'EUR',
    };
    const result = removeNonStorageParams(params);
    expect(result.address).toBeUndefined();
    expect(result.signature).toBeUndefined();
    expect(result.pubkey).toBeUndefined();
    expect(result.session).toBeUndefined();
    expect(result.autoStart).toBeUndefined();
  });

  it('leaves legitimately storable params untouched', () => {
    const params: AppParams = { assetIn: 'EUR', blockchain: 'Ethereum' };
    const result = removeNonStorageParams(params);
    expect(result.assetIn).toBe('EUR');
    expect(result.blockchain).toBe('Ethereum');
  });
});
