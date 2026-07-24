export function normalizePersonalIban(value: string | undefined): string | undefined {
  return value?.toLowerCase() === 'frick' ? 'Frick' : value;
}

export function toPersonalIbanProviderRequest(
  value: string | undefined,
): { personalIbanProvider?: string } {
  return value === undefined ? {} : { personalIbanProvider: normalizePersonalIban(value) };
}
