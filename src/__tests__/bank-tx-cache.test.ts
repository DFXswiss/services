jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

import * as safeStorage from '../util/safe-storage';
import { cacheBankTx, readCachedBankTx } from '../util/bank-tx-cache';

const sample = {
  id: 55,
  accountServiceRef: 'REF-1',
  amount: 100,
  currency: 'CHF',
  type: 'Credit',
};

describe('bank-tx-cache', () => {
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, configurable: true });
    sessionStorageMock.clear();
    jest.restoreAllMocks();
  });

  it('caches then reads a bank tx', () => {
    cacheBankTx(sample);
    expect(readCachedBankTx('55')).toEqual(sample);
  });

  it('returns undefined for a missing id', () => {
    expect(readCachedBankTx('999')).toBeUndefined();
  });

  it('returns undefined for invalid JSON without throwing', () => {
    sessionStorageMock.setItem('dfx.bankTx.55', '{kaputt');
    expect(() => readCachedBankTx('55')).not.toThrow();
    expect(readCachedBankTx('55')).toBeUndefined();
  });

  it('cacheBankTx does not throw when sessionStorage setItem throws', () => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        },
        removeItem: () => undefined,
        clear: () => undefined,
      },
      configurable: true,
    });

    expect(() => cacheBankTx(sample)).not.toThrow();
  });

  it('cacheBankTx and readCachedBankTx swallow unexpected helper throws', () => {
    jest.spyOn(safeStorage, 'storageSetJson').mockImplementation(() => {
      throw new Error('set failed');
    });
    jest.spyOn(safeStorage, 'storageGetJson').mockImplementation(() => {
      throw new Error('get failed');
    });

    expect(() => cacheBankTx(sample)).not.toThrow();
    expect(readCachedBankTx('55')).toBeUndefined();
  });
});
