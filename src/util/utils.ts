import { UserAddress } from '@dfx.swiss/react';

export function isDefined<T>(item: T | undefined): item is T {
  return item != null;
}

export function delay(s: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

export async function timeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout));

  return Promise.race([promise, timeoutPromise]);
}

export function url(url: string, params: URLSearchParams): string {
  const search = Array.from(params.entries()).length > 0 ? `?${params}` : '';
  return `${url}${search}`;
}

export function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z]+:)?\/\//.test(url);
}

export function isNode(e: EventTarget | null): e is Node {
  return e != null && 'nodeType' in e;
}

export function blankedAddress(
  address: string,
  { displayLength = 24, width }: { displayLength?: number; width?: number } = {},
): string {
  if (width) displayLength = Math.min(Math.floor((width * 0.6) / 10), address.length);
  const offset0x = /^0x/.test(address) ? 2 : 0;
  displayLength -= offset0x;
  return address.length - offset0x > displayLength
    ? `${address.slice(0, offset0x + displayLength / 2)}...${address.slice(address.length - displayLength / 2)}`
    : address;
}

export function toBase64(file: File): Promise<string | undefined> {
  return new Promise<string | undefined>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result ? (reader.result as string) : undefined);
    reader.onerror = (e) => reject(e);
  });
}

export function openPdfFromString(pdf: string) {
  const byteArray = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const file = new Blob([byteArray], { type: 'application/pdf;base64' });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL);
}

export function sortAddressesByBlockchain(a: UserAddress, b: UserAddress): number {
  return a.blockchains[0].localeCompare(b.blockchains[0]);
}
