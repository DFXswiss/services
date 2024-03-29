import { Asset, Sell, useAuthContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';

export interface SellHelperInterface {
  getBalances: (assets: Asset[]) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (sell: Sell) => Promise<string>;
  canSendTransaction: () => boolean;
}

// CAUTION: This is a helper hook for all sell functionalities. Think about lazy loading, as soon as it gets bigger.
export function useSellHelper(): SellHelperInterface {
  const { readBalance, createTransaction } = useMetaMask();
  const { sendPayment } = useAlby();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();

  async function getBalances(assets: Asset[]): Promise<AssetBalance[] | undefined> {
    if (!activeWallet) return getParamBalances(assets);

    switch (activeWallet) {
      case WalletType.META_MASK:
        return (await Promise.all(assets.map((asset: Asset) => readBalance(asset, session?.address)))).filter(
          (b) => b.amount > 0,
        );

      default:
        // no balance available
        return undefined;
    }
  }

  async function sendTransaction(sell: Sell): Promise<string> {
    if (!activeWallet) throw new Error('No wallet connected');

    switch (activeWallet) {
      case WalletType.META_MASK:
        if (!session?.address) throw new Error('Address is not defined');

        return createTransaction(new BigNumber(sell.amount), sell.asset, session.address, sell.depositAddress);

      case WalletType.ALBY:
        if (!sell.paymentRequest) throw new Error('Payment request not defined');

        return sendPayment(sell.paymentRequest).then((p) => p.preimage);

      default:
        throw new Error('Not supported yet');
    }
  }

  function canSendTransaction(): boolean {
    if (!activeWallet) return canClose;

    switch (activeWallet) {
      case WalletType.META_MASK:
      case WalletType.ALBY:
        return true;

      default:
        return false;
    }
  }
  return useMemo(
    () => ({ getBalances, sendTransaction, canSendTransaction }),
    [readBalance, createTransaction, sendPayment],
  );
}
