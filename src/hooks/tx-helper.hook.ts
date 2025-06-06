import { Asset, Blockchain, Sell, Swap, useAuthContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAlchemy } from './alchemy.hook';
import { useSolana } from './solana.hook';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';
import { usePhantom } from './wallets/phantom.hook';
import { useTrust } from './wallets/trust.hook';
import { useWalletConnect } from './wallets/wallet-connect.hook';
export interface TxHelperInterface {
  getBalances: (assets: Asset[], address: string, blockchain?: Blockchain) => Promise<AssetBalance[] | undefined>;
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
  const { createTransaction: createTransactionPhantom } = usePhantom();
  const { createTransaction: createTransactionTrust } = useTrust();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();
  const { getAddressBalances: evmBalances } = useAlchemy();
  const { getAddressBalances: solanaBalances } = useSolana();

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
        return evmBalances(assets, address, blockchain);
      case WalletType.PHANTOM_SOL:
      case WalletType.TRUST_SOL:
      case WalletType.CLI_SOL:
        return solanaBalances(assets, address);
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

      case WalletType.PHANTOM_SOL:
        if (!session?.address) throw new Error('Address is not defined');
        return createTransactionPhantom(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      case WalletType.TRUST_SOL:
        if (!session?.address) throw new Error('Address is not defined');
        return createTransactionTrust(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

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
      createTransactionMetaMask,
      createTransactionWalletConnect,
      createTransactionPhantom,
      createTransactionTrust,
      sendPayment,
      activeWallet,
      session,
    ],
  );
}
