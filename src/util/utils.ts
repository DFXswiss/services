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
  { displayLength = 24, dynamicLength = false }: { displayLength?: number; dynamicLength?: boolean } = {},
): string {
  if (dynamicLength) displayLength = Math.min(Math.floor((window.innerWidth * 0.5) / 10), address.length);
  const has0xPrefix = /^0x/.test(address);
  const offset = has0xPrefix ? 2 : 0;
  displayLength -= offset;
  return address.length - offset > displayLength
    ? `${address.slice(0, offset + displayLength / 2)}...${address.slice(address.length - displayLength / 2)}`
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
