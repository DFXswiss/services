/**
 * Personal IBAN selector helpers as served by @dfx.swiss/react.
 *
 * The suites here replace the whole package with a hand-written object, so anything the code under
 * test imports from it has to be listed. Spread this into such a mock instead of restating the four
 * helpers in every suite.
 */
const FRICK = 'Frick';

function toProvider(value: string | undefined): string | undefined {
  return value?.toLowerCase() === FRICK.toLowerCase() ? FRICK : undefined;
}

export const personalIbanSdkMock = {
  normalizePersonalIban: (value: string | undefined): string | undefined => toProvider(value) ?? value,
  toPersonalIbanProvider: toProvider,
  isUnrecognizedPersonalIbanSelector: (value: string | undefined): boolean =>
    value !== undefined && toProvider(value) === undefined,
  toPersonalIbanProviderRequest: (value: string | undefined): { personalIbanProvider?: string } =>
    toProvider(value) ? { personalIbanProvider: FRICK } : {},
};
