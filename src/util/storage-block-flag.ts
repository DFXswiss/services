let blocked = false;

export function setStorageBlockedFlag(value: boolean): void {
  blocked = value;
}

export function getStorageBlockedFlag(): boolean {
  return blocked;
}
