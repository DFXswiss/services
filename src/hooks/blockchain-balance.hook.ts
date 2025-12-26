import { Asset, Blockchain, useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { AssetBalance } from 'src/contexts/balance.context';

interface BalanceDto {
  assetId: number;
  chainId?: string;
  balance: number;
}

interface GetBalancesResponse {
  balances: BalanceDto[];
}

export interface BlockchainBalanceInterface {
  getAddressBalances: (assets: Asset[], address: string, blockchain: Blockchain) => Promise<AssetBalance[]>;
}

export function useBlockchainBalance(): BlockchainBalanceInterface {
  const { call } = useApi();

  async function getAddressBalances(
    assets: Asset[],
    address: string,
    blockchain: Blockchain,
  ): Promise<AssetBalance[]> {
    const assetIds = assets.map((a) => a.id);

    const response = await call<GetBalancesResponse>({
      url: 'blockchain/balances',
      method: 'POST',
      data: {
        address,
        blockchain,
        assetIds,
      },
    });

    return response.balances
      .map((b) => {
        const asset = assets.find((a) => a.id === b.assetId);
        return asset ? { asset, amount: b.balance } : undefined;
      })
      .filter((b): b is AssetBalance => b !== undefined);
  }

  return useMemo(() => ({ getAddressBalances }), [call]);
}
