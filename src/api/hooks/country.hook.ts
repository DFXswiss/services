import { Country, CountryUrl } from '../definitions/country';
import { useApi } from './api.hook';

export interface CountryInterface {
  getCountries: () => Promise<Country[]>;
}

export function useCountry(): CountryInterface {
  const { call } = useApi();

  async function getCountries(): Promise<Country[]> {
    return call<Country[]>({ url: CountryUrl.get, method: 'GET' });
  }

  return { getCountries };
}
