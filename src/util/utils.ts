export function isDefined<T>(item: T | undefined): item is T {
  return item != null;
}

export function delay(s: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

export function url(url: string, params: URLSearchParams): string {
  const search = (params as any).size > 0 ? `?${params}` : '';
  return `${url}${search}`;
}
