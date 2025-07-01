import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import { Alchemy, Network } from 'alchemy-sdk';
import { useMemo } from 'react';
import { AssetBalance } from 'src/contexts/balance.context';
import { formatUnits } from 'src/util/utils';

export interface AlchemyInterface {
  getAddressBalances: (assets: Asset[], address: string, blockchain: Blockchain) => Promise<AssetBalance[]>;
}

const networkMapper: { [b in Blockchain]?: Network } = {
  [Blockchain.ETHEREUM]: Network.ETH_MAINNET,
  [Blockchain.BINANCE_SMART_CHAIN]: Network.BNB_MAINNET,
  [Blockchain.ARBITRUM]: Network.ARB_MAINNET,
  [Blockchain.OPTIMISM]: Network.OPT_MAINNET,
  [Blockchain.POLYGON]: Network.MATIC_MAINNET,
  [Blockchain.BASE]: Network.BASE_MAINNET,
  [Blockchain.GNOSIS]: Network.GNOSIS_MAINNET,
};

export function useAlchemy(): AlchemyInterface {
  async function getAddressBalances(assets: Asset[], address: string, blockchain: Blockchain): Promise<AssetBalance[]> {
    const alchemy = new Alchemy({ apiKey: process.env.REACT_APP_ALCHEMY_KEY, network: networkMapper[blockchain] });
    const results: AssetBalance[] = [];

    const evmAssets = assets.filter((a) => Object.keys(networkMapper).includes(a.blockchain));

    const tokenAssets = evmAssets.filter((a) => a.type === AssetType.TOKEN);
    const nativeAsset = evmAssets.find((a) => a.type === AssetType.COIN);

    if (tokenAssets.length > 0) {
      const tokenRes = await alchemy.core.getTokenBalances(
        address,
        // can not be null because of evm filter
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        tokenAssets.map((t) => t.chainId!),
      );

      tokenAssets.forEach((asset, i) => {
        const balanceRaw = tokenRes.tokenBalances[i]?.tokenBalance ?? '0';
        const decimals = asset.decimals ?? 18;
        const amount = Number(formatUnits(balanceRaw, decimals));
        results.push({ asset, amount });
      });
    }

    if (nativeAsset) {
      const nativeRes = await alchemy.core.getBalance(address);
      const amount = Number(formatUnits(nativeRes.toString(), 18));
      results.push({ asset: nativeAsset, amount });
    }

    return results;
  }
  return useMemo(() => ({ getAddressBalances }), []);
}
