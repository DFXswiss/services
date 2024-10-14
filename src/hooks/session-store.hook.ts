export interface SessionStoreItem<T> {
  get: () => T | undefined;
  set: (item: T) => void;
  remove: () => void;
}

export interface SessionStoreInterface {
  supportIssueUid: SessionStoreItem<string>;
  paymentLinkApiUrl: SessionStoreItem<string>;
}

enum SessionStoreKey {
  SUPPORT_ISSUE_UID = 'dfx.supportIssueUid',
  PAYMENT_LINK_API_URL = 'dfx.paymentLinkApiUrl',
}

export function useSessionStore(): SessionStoreInterface {
  function set(key: SessionStoreKey, value: string) {
    sessionStorage.setItem(key, value);
  }

  function get(key: SessionStoreKey): string | undefined {
    return sessionStorage.getItem(key) ?? undefined;
  }

  function remove(key: SessionStoreKey) {
    sessionStorage.removeItem(key);
  }

  return {
    supportIssueUid: {
      get: () => get(SessionStoreKey.SUPPORT_ISSUE_UID),
      set: (value: string) => set(SessionStoreKey.SUPPORT_ISSUE_UID, value),
      remove: () => remove(SessionStoreKey.SUPPORT_ISSUE_UID),
    },
    paymentLinkApiUrl: {
      get: () => get(SessionStoreKey.PAYMENT_LINK_API_URL),
      set: (value: string) => set(SessionStoreKey.PAYMENT_LINK_API_URL, value),
      remove: () => remove(SessionStoreKey.PAYMENT_LINK_API_URL),
    },
  };
}
