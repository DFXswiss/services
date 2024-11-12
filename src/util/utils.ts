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
  { displayLength = 24, width, scale = 1 }: { displayLength?: number; width?: number; scale?: number } = {},
): string {
  if (width) displayLength = Math.min(Math.floor((width * 0.6 * scale) / 10), address.length);
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

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function openPdfFromString(pdf: string) {
  const byteArray = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const file = new Blob([byteArray], { type: 'application/pdf;base64' });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL);
}

export function openImageFromString(image: string, contentType: string) {
  const imageBlob = new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: contentType });
  const imageUrl = URL.createObjectURL(imageBlob);
  window.open(imageUrl);
}

export function sortAddressesByBlockchain(a: UserAddress, b: UserAddress): number {
  return a.blockchains[0].localeCompare(b.blockchains[0]);
}

export function formatLocationAddress({
  street,
  houseNumber,
  zip,
  city,
  country,
}: {
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  country?: string;
}): string | undefined {
  const streetAddress = filterAndJoin([street, houseNumber], ' ');
  const zipCity = filterAndJoin([zip, city], ' ');
  const location = filterAndJoin([streetAddress, zipCity, country], ', ');
  return location || undefined;
}

function filterAndJoin(items: (string | undefined)[], separator?: string): string {
  return items.filter((i) => i).join(separator);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

export function formatUnits(value: string, decimals = 18): string {
  const bigIntValue = BigInt(value);
  const multiplier = BigInt(10 ** decimals);
  const integerPart = bigIntValue / multiplier;
  const fractionalPart = bigIntValue % multiplier;
  let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  fractionalStr = fractionalStr.replace(/0+$/, '');

  if (fractionalStr === '') {
    return integerPart.toString();
  }

  return `${integerPart.toString()}.${fractionalStr}`;
}
