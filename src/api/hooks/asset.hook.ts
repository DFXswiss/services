import { Asset, AssetUrl } from '../definitions/asset';
import { useApi } from './api.hook';

export interface AssetInterface {
  getAssets: () => Promise<Asset[]>;
}

export function useAsset(): AssetInterface {
  const { call } = useApi();

  async function getAssets(): Promise<Asset[]> {
    return call<Asset[]>({ url: AssetUrl.get, method: 'GET' });
  }

  return { getAssets };
}
