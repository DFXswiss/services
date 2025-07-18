import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { BigNumberish, formatUnits, parseUnits } from 'ethers';
import { useMemo } from 'react';
import { AssetBalance } from 'src/contexts/balance.context';

export interface TronInterface {
  getAddressBalances: (assets: Asset[], address: string) => Promise<AssetBalance[]>;
  createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<any>;
  createTokenTransaction(fromAddress: string, toAddress: string, token: Asset, amount: BigNumber): Promise<any>;
}

export function useTron(): TronInterface {
  const tronWeb = useMemo(() => {
    const tronWebOfTrustWallet = (window as any).trustwallet?.tronLink?.tronWeb;
    if (tronWebOfTrustWallet) return tronWebOfTrustWallet;

    const tronWebOfTronLinkWallet = (window as any).tronLink?.tronWeb;
    if (tronWebOfTronLinkWallet) return tronWebOfTronLinkWallet;
  }, []);

  async function getAddressBalances(assets: Asset[], address: string): Promise<AssetBalance[]> {
    const balances: AssetBalance[] = [];

    const tronAssets = assets.filter((a) => Blockchain.TRON === a.blockchain);

    const nativeAsset = tronAssets.find((a) => a.type === AssetType.COIN);
    const tokenAssets = tronAssets.filter((a) => a.type === AssetType.TOKEN);

    if (nativeAsset) {
      balances.push(await getCoinBalance(address, nativeAsset));
    }

    if (tokenAssets.length > 0) {
      balances.push(...(await getTokenBalances(address, tokenAssets)));
    }

    return balances;
  }

  async function getCoinBalance(address: string, asset: Asset): Promise<AssetBalance> {
    const rawBalance = await tronWeb.trx.getBalance(address);
    const amount = fromSunAmount(rawBalance);

    return { asset, amount };
  }

  async function getTokenBalances(address: string, assets: Asset[]): Promise<AssetBalance[]> {
    const tokenBalances: AssetBalance[] = [];

    for (const asset of assets) {
      const { abi } = await tronWeb.trx.getContract(asset.chainId);
      const contract = tronWeb.contract(abi.entrys, asset.chainId);
      const decimals = await contract.methods.decimals().call();
      const balance = await contract.methods.balanceOf(address).call();

      const amount = fromSunAmount(balance, decimals);
      tokenBalances.push({ asset, amount });
    }

    return tokenBalances;
  }

  async function createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<any> {
    return tronWeb.transactionBuilder.sendTrx(toAddress, toSunAmount(amount), fromAddress);
  }

  async function createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<any> {
    return tronWeb.transactionBuilder.sendAsset(toAddress, toSunAmount(amount), token.chainId, fromAddress);
  }

  return useMemo(() => ({ getAddressBalances, createCoinTransaction, createTokenTransaction }), []);
}

function fromSunAmount(amountSunLike: BigNumberish, decimals?: number): number {
  const useDecimals = getDecimals(decimals);
  return Number(formatUnits(amountSunLike, getDecimals(useDecimals)));
}

function toSunAmount(amountTrxLike: BigNumber, decimals?: number): number {
  const useDecimals = getDecimals(decimals);
  const amount = new BigNumber(amountTrxLike).toFixed(getDecimals(useDecimals));
  return Number(parseUnits(amount, useDecimals));
}

function getDecimals(decimals?: number): number {
  return decimals ?? 6;
}
