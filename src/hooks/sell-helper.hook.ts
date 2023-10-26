import { Asset, Sell, useAuthContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';

export interface SellHelperInterface {
  getBalances: (assets: Asset[]) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (sell: Sell) => Promise<string>;
}

// CAUTION: This is a helper hook for all sell functionalities. Think about lazy loading, as soon as it gets bigger.
export function useSellHelper(): SellHelperInterface {
  const { readBalance, createTransaction } = useMetaMask();
  const { sendPayment } = useAlby();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();

  async function getBalances(assets: Asset[]): Promise<AssetBalance[] | undefined> {
    switch (activeWallet) {
      case WalletType.META_MASK:
        return (await Promise.all(assets.map((asset: Asset) => readBalance(asset, session?.address)))).filter(
          (b) => b.amount > 0,
        );

      case WalletType.ALBY:
      case WalletType.LEDGER_BTC:
      case WalletType.LEDGER_ETH:
      case WalletType.BITBOX_BTC:
      case WalletType.BITBOX_ETH:
      case WalletType.TREZOR_BTC:
      case WalletType.TREZOR_ETH:
      case WalletType.CLI_BTC:
      case WalletType.CLI_ETH:
      case WalletType.WALLET_CONNECT:
        // no balance available
        return undefined;

      default:
        return getParamBalances(assets);
    }
  }

  async function sendTransaction(sell: Sell): Promise<string> {
    switch (activeWallet) {
      case WalletType.META_MASK:
        if (!session?.address) throw new Error('Address is not defined');

        return createTransaction(new BigNumber(sell.amount), sell.asset, session.address, sell.depositAddress);

      case WalletType.ALBY:
        if (!sell.paymentRequest) throw new Error('Payment request not defined');

        return sendPayment(sell.paymentRequest).then((p) => p.preimage);

      case WalletType.LEDGER_BTC:
      case WalletType.LEDGER_ETH:
      case WalletType.BITBOX_BTC:
      case WalletType.BITBOX_ETH:
      case WalletType.TREZOR_BTC:
      case WalletType.TREZOR_ETH:
      case WalletType.CLI_BTC:
      case WalletType.CLI_ETH:
      case WalletType.WALLET_CONNECT:
        throw new Error('Not supported yet');

      default:
        throw new Error('No wallet connected');
    }
  }
  return useMemo(() => ({ getBalances, sendTransaction }), [readBalance, createTransaction, sendPayment]);
}
