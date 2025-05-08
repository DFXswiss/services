import { KycFile, UserAddress } from '@dfx.swiss/react';

export function isDefined<T>(item: T | undefined): item is T {
  return item != null;
}

export function isEmpty(val: any): boolean {
  return val === undefined || val === '' || val === null || (Array.isArray(val) && val.length === 0);
}

export function removeNullFields<T extends Record<any, any>>(entity?: T): Partial<T> | undefined {
  if (!entity) return entity;
  return Object.fromEntries(Object.entries(entity).filter(([_, v]) => v != null)) as Partial<T>;
}

export function changed<T>(newValue: T, defaultValue: T): T | undefined {
  if (Array.isArray(newValue) && Array.isArray(defaultValue)) {
    const sortedNew = [...newValue].sort();
    const sortedDefault = [...defaultValue].sort();
    return JSON.stringify(sortedNew) !== JSON.stringify(sortedDefault) ? newValue : undefined;
  }

  if (
    typeof newValue === 'object' &&
    newValue !== null &&
    typeof defaultValue === 'object' &&
    defaultValue !== null &&
    !Array.isArray(newValue) &&
    !Array.isArray(defaultValue)
  ) {
    return JSON.stringify(newValue) !== JSON.stringify(defaultValue) ? newValue : undefined;
  }

  return newValue !== defaultValue ? newValue : undefined;
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

export function openPdfFromString(pdf: string, newTab = true) {
  const byteArray = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const file = new Blob([byteArray], { type: 'application/pdf' });
  const fileURL = URL.createObjectURL(file);

  if (newTab) {
    window.open(fileURL);
  } else {
    const viewerContainer = createFullScreenContainer();
    const embed = document.createElement('embed');
    embed.style.flex = '1';
    embed.style.border = 'none';
    embed.style.backgroundColor = 'white';
    embed.type = 'application/pdf';
    embed.src = fileURL + '#toolbar=1&navpanes=1&scrollbar=1';
    viewerContainer.appendChild(embed);
    document.body.appendChild(viewerContainer);
  }
}

export function openImageFromString(image: string, contentType: string, newTab = true) {
  const imageBlob = new Blob([Uint8Array.from(atob(image), (c) => c.charCodeAt(0))], { type: contentType });
  const imageUrl = URL.createObjectURL(imageBlob);

  if (newTab) {
    window.open(imageUrl);
  } else {
    const viewerContainer = createFullScreenContainer();
    const imageElement = document.createElement('img');
    imageElement.style.maxWidth = '100%';
    imageElement.style.maxHeight = '100%';
    imageElement.style.objectFit = 'contain';
    imageElement.style.transition = 'transform 0.2s';
    imageElement.src = imageUrl;
    viewerContainer.appendChild(imageElement);
    document.body.appendChild(viewerContainer);
  }
}

export function handleOpenFile(file: KycFile, setErrorMessage: (message: string) => void, newTab = true) {
  const { content, contentType } = file;
  const [fileType] = contentType.split('/');

  if (!content || content.type !== 'Buffer' || !Array.isArray(content.data)) {
    setErrorMessage('Invalid file type');
    return;
  }

  const base64Data = Buffer.from(content.data).toString('base64');

  if (fileType === 'application') {
    openPdfFromString(base64Data, newTab);
  } else if (fileType === 'image') {
    openImageFromString(base64Data, contentType, newTab);
  }
}

function createFullScreenContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.backgroundColor = 'rgba(0,0,0,0.9)';
  container.style.zIndex = '9999';
  return container;
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

export async function fetchJson(url: string | URL): Promise<any> {
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

export function generateExportFileName(): string {
  const [date, time] = new Date().toISOString().replace(/[-:]/g, '').split(/[T\.]/);
  return `DFX_export_${date}_${time}.zip`;
}

export enum FormatType {
  'us',
  'tiny',
}

export const formatCurrency = (
  value: string | number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
  format = FormatType.us,
) => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;

  // exceptions
  if (amount === null || !!isNaN(amount)) return null;
  if (amount < 0.01 && amount > 0 && maximumFractionDigits) {
    return '< 0.01';
  }

  // us
  if (format === FormatType.us) {
    const formatter = new Intl.NumberFormat('en-US', {
      maximumFractionDigits,
      minimumFractionDigits,
    });
    return formatter.format(amount);
  }

  // tiny
  if (format === FormatType.tiny) {
    const formatter = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: amount < 1000 && amount > -1000 ? 2 : 0,
      minimumFractionDigits: amount < 1000 && amount > -1000 ? 2 : 0,
    });
    return formatter.format(amount).split(',').join(' ');
  }
};
