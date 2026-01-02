import { Asset, Blockchain, Sell, Swap, useAuthContext, useSell, useSwap } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance, useBalanceContext } from '../contexts/balance.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useBlockchainBalance } from './blockchain-balance.hook';
import { useAlby } from './wallets/alby.hook';
import { useMetaMask } from './wallets/metamask.hook';
import { usePhantom } from './wallets/phantom.hook';
import { useTronLinkTrx } from './wallets/tronlink-trx.hook';
import { useTrustSol } from './wallets/trust-sol.hook';
import { useTrustTrx } from './wallets/trust-trx.hook';
import { useWalletConnect } from './wallets/wallet-connect.hook';
export interface TxHelperInterface {
  getBalances: (assets: Asset[], address: string, blockchain?: Blockchain) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (tx: Sell | Swap) => Promise<string>;
  canSendTransaction: () => boolean;
}

// CAUTION: This is a helper hook for all blockchain transaction functionalities. Think about lazy loading, as soon as it gets bigger.
export function useTxHelper(): TxHelperInterface {
  const {
    createTransaction: createTransactionMetaMask,
    requestChangeToBlockchain: requestChangeToBlockchainMetaMask,
    signEip7702Delegation,
  } = useMetaMask();
  const {
    createTransaction: createTransactionWalletConnect,
    requestChangeToBlockchain: requestChangeToBlockchainWalletConnect,
  } = useWalletConnect();
  const { sendPayment } = useAlby();
  const { createTransaction: createTransactionPhantomSol } = usePhantom();
  const { createTransaction: createTransactionTrustSol } = useTrustSol();
  const { createTransaction: createTransactionTrustTrx } = useTrustTrx();
  const { createTransaction: createTransactionTronLinkTrx } = useTronLinkTrx();
  const { getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { canClose } = useAppHandlingContext();
  const { getAddressBalances } = useBlockchainBalance();
  const { confirmSell } = useSell();
  const { confirmSwap } = useSwap();

  async function getBalances(
    assets: Asset[],
    address: string | undefined,
    blockchain?: Blockchain,
  ): Promise<AssetBalance[] | undefined> {
    if (!activeWallet || !address || !blockchain) return getParamBalances(assets);

    const supportedWallets = [
      WalletType.META_MASK,
      WalletType.WALLET_CONNECT,
      WalletType.LEDGER_ETH,
      WalletType.TREZOR_ETH,
      WalletType.BITBOX_ETH,
      WalletType.CLI_ETH,
      WalletType.PHANTOM_SOL,
      WalletType.TRUST_SOL,
      WalletType.CLI_SOL,
      WalletType.TRUST_TRX,
      WalletType.TRONLINK_TRX,
      WalletType.CLI_TRX,
    ];

    if (supportedWallets.includes(activeWallet)) {
      try {
        return await getAddressBalances(assets, address, blockchain);
      } catch (error) {
        console.error('Failed to get balances from API:', error);
        return undefined;
      }
    }

    // no balance available for unsupported wallets
    return undefined;
  }

  async function sendTransaction(tx: Sell | Swap): Promise<string> {
    if (!activeWallet) throw new Error('No wallet connected');

    const asset = 'asset' in tx ? tx.asset : tx.sourceAsset;

    switch (activeWallet) {
      case WalletType.META_MASK:
        if (!session?.address) throw new Error('Address is not defined');

        await requestChangeToBlockchainMetaMask(asset.blockchain);

        // Check if transaction has EIP-7702 delegation data (works for BOTH Sell and Swap)
        if (tx.depositTx?.eip7702) {
          // User has no ETH, use EIP-7702 delegation
          const eip7702Data = tx.depositTx.eip7702;
          const signedData = await signEip7702Delegation(eip7702Data, session.address);

          // Distinguish between Sell and Swap based on asset field
          if ('asset' in tx) {
            // Sell transaction
            const result = await confirmSell(tx.id, { eip7702: signedData });
            if (result.id == null) throw new Error('Transaction ID not returned');
            return result.id.toString();
          } else {
            // Swap transaction
            const result = await confirmSwap(tx.id, { eip7702: signedData });
            if (result.id == null) throw new Error('Transaction ID not returned');
            return result.id.toString();
          }
        }

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
        return createTransactionPhantomSol(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      case WalletType.TRUST_SOL:
        if (!session?.address) throw new Error('Address is not defined');
        return createTransactionTrustSol(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      case WalletType.TRUST_TRX:
        if (!session?.address) throw new Error('Address is not defined');
        return createTransactionTrustTrx(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

      case WalletType.TRONLINK_TRX:
        if (!session?.address) throw new Error('Address is not defined');
        return createTransactionTronLinkTrx(new BigNumber(tx.amount), asset, session.address, tx.depositAddress);

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
      sendPayment,
      activeWallet,
      session,
      getParamBalances,
      getAddressBalances,
      requestChangeToBlockchainMetaMask,
      requestChangeToBlockchainWalletConnect,
      canClose,
      signEip7702Delegation,
      confirmSell,
      confirmSwap,
    ],
  );
}
