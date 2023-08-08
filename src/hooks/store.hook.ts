import { WalletType } from '../contexts/wallet.context';

export interface StoreItem<T> {
  get: () => T | undefined;
  set: (item: T) => void;
  remove: () => void;
}

export interface StoreInterface {
  redirectUri: StoreItem<string>;
  balances: StoreItem<string>;
  language: StoreItem<string>;
  showsSignatureInfo: StoreItem<boolean>;
  activeWallet: StoreItem<WalletType>;
}

enum StoreKey {
  AUTH_TOKEN = 'authenticationToken',
  REDIRECT_URI = 'redirectUri',
  BALANCES = 'balances',
  LANGUAGE = 'language',
  SHOWS_SIGNATURE_INFO = 'showsSignatureInfo',
  ACTIVE_WALLET = 'activeWallet',
}

export function useStore(): StoreInterface {
  const { localStorage } = window;

  function set(key: StoreKey, value: string) {
    localStorage.setItem(key, value);
  }

  function get(key: StoreKey): string | undefined {
    return localStorage.getItem(key) ?? undefined;
  }

  function remove(key: StoreKey) {
    localStorage.removeItem(key);
  }

  return {
    redirectUri: {
      get: () => get(StoreKey.REDIRECT_URI),
      set: (value: string) => set(StoreKey.REDIRECT_URI, value),
      remove: () => remove(StoreKey.REDIRECT_URI),
    },
    balances: {
      get: () => get(StoreKey.BALANCES),
      set: (value: string) => set(StoreKey.BALANCES, value),
      remove: () => remove(StoreKey.BALANCES),
    },
    language: {
      get: () => get(StoreKey.LANGUAGE),
      set: (value: string) => set(StoreKey.LANGUAGE, value),
      remove: () => remove(StoreKey.LANGUAGE),
    },
    showsSignatureInfo: {
      get: () => (get(StoreKey.SHOWS_SIGNATURE_INFO) ?? 'true') === 'true',
      set: (value: boolean) => set(StoreKey.SHOWS_SIGNATURE_INFO, value ? 'true' : 'false'),
      remove: () => remove(StoreKey.SHOWS_SIGNATURE_INFO),
    },
    activeWallet: {
      get: () => get(StoreKey.ACTIVE_WALLET) as WalletType,
      set: (value: WalletType) => set(StoreKey.ACTIVE_WALLET, value),
      remove: () => remove(StoreKey.ACTIVE_WALLET),
    },
  };
}
