import { Fiat, FiatUrl } from '../definitions/fiat';
import { useApi } from './api.hook';

export interface FiatInterface {
  getCurrencies: () => Promise<Fiat[]>;
  toDescription: (currency: Fiat) => string;
  toSymbol: (currency: Fiat) => string;
}

export function useFiat(): FiatInterface {
  const { call } = useApi();

  async function getCurrencies(): Promise<Fiat[]> {
    return call<Fiat[]>({ url: FiatUrl.get, method: 'GET' });
  }

  const definitions = {
    description: {
      ['EUR']: 'Euro',
      ['USD']: 'US Dollar',
      ['CHF']: 'Swiss Franc',
      ['GBP']: 'British Pound',
    } as Record<string, string>,
    symbol: {
      ['EUR']: '€',
      ['USD']: '$',
      ['CHF']: '₣',
      ['GBP']: '£',
    } as Record<string, string>,
  };

  return {
    getCurrencies,
    toDescription: (currency: Fiat) => definitions.description[currency.name],
    toSymbol: (currency: Fiat) => definitions.symbol[currency.name],
  };
}
