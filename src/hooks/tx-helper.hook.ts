import { Asset, Blockchain, Sell, Swap, useAuthContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlchemy } from './alchemy.hook';
import { useSolana } from './solana.hook';
import { useTron } from './tron.hook';
import { useAlby } from './wallets/alby.hook';

import { useBrowserExtension } from './wallets/browser-extension.hook';
import { useWalletConnect } from './wallets/wallet-connect.hook';
export interface TxHelperInterface {
  getBalances: (assets: Asset[], address: string, blockchain?: Blockchain) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (tx: Sell | Swap) => Promise<string>;
  canSendTransaction: () => boolean;
}

// CAUTION: This is a helper hook for all blockchain transaction functionalities. Think about lazy loading, as soon as it gets bigger.
export function useTxHelper(): TxHelperInterface {
  const { createTransaction: createTransaction, requestChangeToBlockchain: requestChangeToBlockchain } =
    useBrowserExtension();
  const {
    createTransaction: createTransactionWalletConnect,
    requestChangeToBlockchain: requestChangeToBlockchainWalletConnect,
  } = useWalletConnect();
  const { sendPayment } = useAlby();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();
  const { getAddressBalances: getEvmBalances } = useAlchemy();
  const { getAddressBalances: getSolanaBalances } = useSolana();
  const { getAddressBalances: getTronBalances } = useTron();

  async function getBalances(
    assets: Asset[],
    address: string | undefined,
    blockchain?: Blockchain,
  ): Promise<AssetBalance[] | undefined> {
    if (!activeWallet || !address || !blockchain) return getParamBalances(assets);
    switch (activeWallet) {
      case WalletType.META_MASK:
      case WalletType.WALLET_CONNECT:
      case WalletType.LEDGER_ETH:
      case WalletType.TREZOR_ETH:
      case WalletType.BITBOX_ETH:
      case WalletType.CLI_ETH:
        return getEvmBalances(assets, address, blockchain);
      case WalletType.PHANTOM_SOL:
      case WalletType.TRUST_SOL:
      case WalletType.CLI_SOL:
        return getSolanaBalances(assets, address);
      case WalletType.TRUST_TRX:
      case WalletType.TRON_LINK_TRX:
      case WalletType.CLI_TRX:
        return getTronBalances(assets, address);
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
      case WalletType.PHANTOM_SOL:
      case WalletType.TRUST_SOL:
      case WalletType.TRUST_TRX:
      case WalletType.TRON_LINK_TRX:
        if (!session?.address) throw new Error('Address is not defined');
        if (asset.blockchain && requestChangeToBlockchain) await requestChangeToBlockchain(asset.blockchain);
        return createTransaction(
          new BigNumber(tx.amount),
          asset,
          session.address,
          tx.depositAddress,
          activeWallet,
          asset.blockchain,
        );

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
      case WalletType.PHANTOM_SOL:
      case WalletType.TRUST_SOL:
        return true;

      default:
        return false;
    }
  }
  return useMemo(
    () => ({ getBalances, sendTransaction, canSendTransaction }),
    [
      createTransaction,
      createTransactionWalletConnect,
      sendPayment,
      activeWallet,
      session,
      getParamBalances,
      getEvmBalances,
      getSolanaBalances,
      requestChangeToBlockchain,
      requestChangeToBlockchainWalletConnect,
      canClose,
    ],
  );
}
