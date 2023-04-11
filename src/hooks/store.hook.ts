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
}

enum StoreKey {
  AUTH_TOKEN = 'authenticationToken',
  REDIRECT_URI = 'redirectUri',
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
  };
}
