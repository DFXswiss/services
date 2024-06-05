import { Asset, Sell, Swap, useAuthContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';
import { useWalletConnect } from './wallets/wallet-connect.hook';

export interface TxHelperInterface {
  getBalances: (assets: Asset[]) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (tx: Sell | Swap) => Promise<string>;
  canSendTransaction: () => boolean;
}

// CAUTION: This is a helper hook for all blockchain transaction functionalities. Think about lazy loading, as soon as it gets bigger.
export function useTxHelper(): TxHelperInterface {
  const {
    readBalance: readBalanceMetaMask,
    createTransaction: createTransactionMetaMask,
    requestChangeToBlockchain: requestChangeToBlockchainMetaMask,
  } = useMetaMask();
  const {
    readBalance: readBalanceWalletConnect,
    createTransaction: createTransactionWalletConnect,
    requestChangeToBlockchain: requestChangeToBlockchainWalletConnect,
  } = useWalletConnect();
  const { sendPayment } = useAlby();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();

  async function getBalances(assets: Asset[]): Promise<AssetBalance[] | undefined> {
    if (!activeWallet) return getParamBalances(assets);

    switch (activeWallet) {
      case WalletType.META_MASK:
        return (await Promise.all(assets.map((asset: Asset) => readBalanceMetaMask(asset, session?.address)))).filter(
          (b) => b.amount > 0,
        );

      default:
        // no balance available
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
    [
      readBalanceMetaMask,
      readBalanceWalletConnect,
      createTransactionMetaMask,
      createTransactionWalletConnect,
      sendPayment,
    ],
  );
}
