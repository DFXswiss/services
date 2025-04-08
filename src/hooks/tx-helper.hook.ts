import { Asset, AssetType, Sell, Swap, useAuthContext } from '@dfx.swiss/react';
import { Alchemy } from 'alchemy-sdk';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';
import { useWalletConnect } from './wallets/wallet-connect.hook';
export interface TxHelperInterface {
  getBalances: (assets: Asset[], address: string) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (tx: Sell | Swap) => Promise<string>;
  canSendTransaction: () => boolean;
}

// CAUTION: This is a helper hook for all blockchain transaction functionalities. Think about lazy loading, as soon as it gets bigger.
export function useTxHelper(): TxHelperInterface {
  const { createTransaction: createTransactionMetaMask, requestChangeToBlockchain: requestChangeToBlockchainMetaMask } =
    useMetaMask();
  const {
    createTransaction: createTransactionWalletConnect,
    requestChangeToBlockchain: requestChangeToBlockchainWalletConnect,
  } = useWalletConnect();
  const { sendPayment } = useAlby();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();

  async function getBalances(assets: Asset[], address: string | undefined): Promise<AssetBalance[] | undefined> {
    if (!activeWallet || !address) return getParamBalances(assets);

    switch (activeWallet) {
      case (WalletType.META_MASK, WalletType.WALLET_CONNECT):
        const results: AssetBalance[] = [];

        const alchemy = new Alchemy({ apiKey: process.env.REACT_APP_ALCHEMY_KEY });

        const tokenAssets = assets.filter((a) => a.type === AssetType.TOKEN);
        const nativeAsset = assets.find((a) => a.type === AssetType.COIN);

        const tokenRes = await alchemy.core.getTokenBalances(
          address,
          tokenAssets.map((t) => t.chainId!),
        );

        const tokenMeta = await Promise.all(tokenAssets.map((t) => alchemy.core.getTokenMetadata(t.chainId!)));

        tokenAssets.forEach((asset, i) => {
          const balanceRaw = tokenRes.tokenBalances[i]?.tokenBalance ?? '0';
          const decimals = tokenMeta[i]?.decimals ?? 18;
          const amount = parseFloat(new BigNumber(balanceRaw).toString()) / 10 ** decimals;

          results.push({ asset, amount });
        });

        if (nativeAsset) {
          const nativeRes = await alchemy.core.getBalance(address);
          const amount = parseFloat(nativeRes.toString()) / 1e18;
          results.push({ asset: nativeAsset, amount });
        }

        return results;
      default:
        return undefined;
    }
  }

  async function sendTransaction(tx: Sell | Swap): Promise<string> {
    if (!activeWallet) throw new Error('No wallet connected');

    const asset = 'asset' in tx ? tx.asset : tx.sourceAsset;

    switch (activeWallet) {
      case WalletType.META_MASK:
        if (!session?.address) throw new Error('Address is not defined');

        await requestChangeToBlockchainMetaMask(asset.blockchain);
        return createTransactionMetaMask(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      case WalletType.ALBY:
        if (!tx.paymentRequest) throw new Error('Payment request not defined');

        return sendPayment(tx.paymentRequest).then((p) => p.preimage);

      case WalletType.WALLET_CONNECT:
        if (!session?.address) throw new Error('Address is not defined');
        await requestChangeToBlockchainWalletConnect(asset.blockchain);
        return createTransactionWalletConnect(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      default:
        throw new Error('Not supported yet');
    }
  }

  function canSendTransaction(): boolean {
    if (!activeWallet) return canClose;

    switch (activeWallet) {
      case WalletType.META_MASK:
      case WalletType.ALBY:
      case WalletType.WALLET_CONNECT:
        return true;

      default:
        return false;
    }
  }
  return useMemo(
    () => ({ getBalances, sendTransaction, canSendTransaction }),
    [createTransactionMetaMask, createTransactionWalletConnect, sendPayment, activeWallet, session],
  );
}
