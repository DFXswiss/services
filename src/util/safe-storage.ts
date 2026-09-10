import { reportClientError } from './client-error';

type StorageName = 'localStorage' | 'sessionStorage';

const PROBE_KEY = '__dfx.probe';

let installAttempted = false;
let storageBlocked = false;
let storageHardBlocked = false;
let storageFailureReported = false;

function reportStorageFailure(message: string): void {
  if (storageFailureReported) return;
  storageFailureReported = true;
  reportClientError(new Error(message), window.location.pathname);
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string): string | null {
      const value = map.get(key);
      return value === undefined ? null : value;
    },
    setItem(key: string, value: string): void {
      map.set(key, String(value));
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    key(index: number): string | null {
      const keys = Array.from(map.keys());
      if (index < 0 || index >= keys.length) return null;
      return keys[index];
    },
  };
}

function getStorage(name: StorageName): Storage | undefined {
  try {
    return window[name];
  } catch {
    reportStorageFailure('Storage blocked');
    return undefined;
  }
}

function probeStorage(name: StorageName): boolean {
  try {
    const storage = window[name];
    storage.setItem(PROBE_KEY, '1');
    storage.getItem(PROBE_KEY);
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function storageGet(storage: StorageName, key: string): string | undefined {
  try {
    const store = getStorage(storage);
    if (!store) return undefined;
    return store.getItem(key) ?? undefined;
  } catch {
    reportStorageFailure('Storage blocked');
    return undefined;
  }
}

export function storageSet(storage: StorageName, key: string, value: string): void {
  try {
    const store = getStorage(storage);
    if (!store) return;
    store.setItem(key, value);
  } catch {
    // SecurityError / QuotaExceededError (and any other write failure)
  }
}

export function storageRemove(storage: StorageName, key: string): void {
  try {
    const store = getStorage(storage);
    if (!store) return;
    store.removeItem(key);
  } catch {
    // never throw
  }
}

export function storageGetJson<T>(storage: StorageName, key: string): T | undefined {
  const raw = storageGet(storage, key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    reportStorageFailure('Invalid JSON in storage');
    storageRemove(storage, key);
    return undefined;
  }
}

export function storageSetJson<T>(storage: StorageName, key: string, value: T): void {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== 'string') return;
  storageSet(storage, key, serialized);
}

export function storageClear(storage: 'sessionStorage'): void {
  try {
    const store = getStorage(storage);
    if (!store) return;
    store.clear();
  } catch {
    // never throw
  }
}

/** Probe; if blocked, try Object.defineProperty memory shim. Idempotent. */
export function installStorageFallback(): void {
  if (installAttempted) return;
  installAttempted = true;

  const localOk = probeStorage('localStorage');
  const sessionOk = probeStorage('sessionStorage');

  if (localOk && sessionOk) {
    storageBlocked = false;
    storageHardBlocked = false;
    return;
  }

  storageBlocked = true;
  reportStorageFailure('Storage blocked');

  try {
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
    storageHardBlocked = false;
  } catch {
    storageHardBlocked = true;
  }
}

export function isStorageBlocked(): boolean {
  return storageBlocked;
}

export function isStorageHardBlocked(): boolean {
  return storageHardBlocked;
}

/** Remove login keys; never throw. */
export function clearLoginSessionStorage(): void {
  storageRemove('localStorage', 'dfx.authenticationToken');
  storageRemove('localStorage', 'dfx.srv.activeWallet');
  storageRemove('localStorage', 'dfx.srv.queryParams');
  storageClear('sessionStorage');
}

function collectDfxKeys(name: StorageName): string[] {
  const keys: string[] = [];
  try {
    const store = window[name];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key != null && key.startsWith('dfx.')) keys.push(key);
    }
  } catch {
    // ignore listing failures
  }
  return keys;
}

/** Keys starting with `dfx.` on both storages, then reload. Never throw on the clears. */
export function resetDfxStorageAndReload(): void {
  const localKeys = collectDfxKeys('localStorage');
  const sessionKeys = collectDfxKeys('sessionStorage');
  for (const key of localKeys) storageRemove('localStorage', key);
  for (const key of sessionKeys) storageRemove('sessionStorage', key);
  window.location.reload();
}
