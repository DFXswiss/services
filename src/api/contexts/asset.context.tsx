import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Utils } from '../../utils';
import { Asset } from '../definitions/asset';
import { Blockchain } from '../definitions/blockchain';
import { useAsset } from '../hooks/asset.hook';

import { useAuthContext } from './auth.context';

interface AssetInterface {
  assets: Map<Blockchain, Asset[]>;
  assetsLoading: boolean;
  getAsset: (id: number, filter?: { buyable?: boolean; sellable?: boolean }) => Asset | undefined;
}

const AssetContext = createContext<AssetInterface>(undefined as any);

export function useAssetContext(): AssetInterface {
  return useContext(AssetContext);
}

export function AssetContextProvider(props: PropsWithChildren): JSX.Element {
  const { isLoggedIn } = useAuthContext();
  const { getAssets } = useAsset();
  const [assets, setAssets] = useState<Map<Blockchain, Asset[]>>(new Map());
  const [assetsLoading, setAssetsLoading] = useState<boolean>(false);

  useEffect(() => {
    setAssetsLoading(true);
    getAssets()
      .then(updateAssets)
      .finally(() => setAssetsLoading(false));
  }, [isLoggedIn]);

  function updateAssets(assets: Asset[]) {
    setAssets(
      Utils.groupBy(
        assets.filter((a) => a.buyable || a.comingSoon).sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1)),
        'blockchain',
      ),
    );
  }

  function getAsset(id: number, filter?: { buyable?: boolean; sellable?: boolean }): Asset | undefined {
    return Array.from(assets.values())
      .reduce((prev, curr) => prev.concat(curr), [])
      .filter(
        (asset) =>
          filter === undefined ||
          (filter?.buyable !== undefined && filter.buyable === asset.buyable) ||
          (filter?.sellable !== undefined && filter.sellable === asset.sellable),
      )
      .find((asset) => asset.id === id);
  }

  const context: AssetInterface = useMemo(
    () => ({ assets, assetsLoading, getAsset }),
    [assets, assetsLoading, getAsset],
  );

  return <AssetContext.Provider value={context}>{props.children}</AssetContext.Provider>;
}
