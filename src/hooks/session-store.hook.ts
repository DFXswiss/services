export interface SessionStoreItem<T> {
  get: () => T | undefined;
  set: (item: T) => void;
  remove: () => void;
}

export interface SessionStoreInterface {
  newIban: SessionStoreItem<string>;
  supportIssueUid: SessionStoreItem<string>;
  paymentLinkApiUrl: SessionStoreItem<string>;
}

enum SessionStoreKey {
  NEW_IBAN = 'dfx.newIban',
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
    newIban: {
      get: () => get(SessionStoreKey.NEW_IBAN),
      set: (value: string) => set(SessionStoreKey.NEW_IBAN, value),
      remove: () => remove(SessionStoreKey.NEW_IBAN),
    },
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
