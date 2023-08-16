export function isDefined<T>(item: T | undefined): item is T {
  return item != null;
}

export function delay(s: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
