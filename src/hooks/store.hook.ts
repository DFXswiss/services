export interface StoreInterface {
  authenticationToken: {
    get: () => string | undefined;
    set: (token: string) => void;
    remove: () => void;
  };
  redirectUri: {
    get: () => string | undefined;
    set: (uri: string) => void;
    remove: () => void;
  };
  balances: {
    get: () => string | undefined;
    set: (balances: string) => void;
    remove: () => void;
  };
  language: {
    get: () => string | undefined;
    set: (language: string) => void;
    remove: () => void;
  };
}

enum StoreKey {
  AUTH_TOKEN = 'authenticationToken',
  REDIRECT_URI = 'redirectUri',
  BALANCES = 'balances',
  LANGUAGE = 'language',
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
    authenticationToken: {
      get: () => get(StoreKey.AUTH_TOKEN),
      set: (value: string) => set(StoreKey.AUTH_TOKEN, value),
      remove: () => remove(StoreKey.AUTH_TOKEN),
    },
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
  };
}
