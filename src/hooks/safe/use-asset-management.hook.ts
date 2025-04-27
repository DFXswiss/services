import { Asset, Blockchain, useAsset, useAssetContext } from '@dfx.swiss/react';
import { AssetCategory } from '@dfx.swiss/react/dist/definitions/asset';
import { useEffect, useState } from 'react';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useAppParams } from 'src/hooks/app-params.hook';

export const useAssetManagement = () => {
  const { getAssets } = useAssetContext();
  const { blockchain: walletBlockchain } = useWalletContext();
  const { getAsset, isSameAsset } = useAsset();
  const { assets: assetFilter, assetOut, amountOut, blockchain, availableBlockchains } = useAppParams();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const activeBlockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(activeBlockchains, { buyable: true, comingSoon: false }).filter(
      (a) => a.category === AssetCategory.PUBLIC || a.name === assetOut,
    );
    const activeAssets = filterAssets(blockchainAssets, assetFilter);
    if (activeAssets.length === 0) return;

    setAvailableAssets(activeAssets);
  }, [
    assetOut,
    amountOut,
    assetFilter,
    getAsset,
    getAssets,
    blockchain,
    walletBlockchain,
    availableBlockchains,
    setAvailableAssets,
  ]);

  const filterAssets = (assets: Asset[], filter?: string): Asset[] => {
    if (!filter) return assets;

    const allowedAssets = filter.split(',');
    return assets.filter((a) => allowedAssets.some((f) => isSameAsset(a, f)));
  };

  return {
    availableAssets,
  };
};
