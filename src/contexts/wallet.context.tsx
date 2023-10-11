import { Blockchain, Utils, useApiSession, useAuth, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';
import { useAppHandlingContext } from './app-handling.context';
import { useBalanceContext } from './balance.context';

export enum WalletType {
  META_MASK = 'MetaMask',
  ALBY = 'Alby',
  LEDGER_BTC = 'LedgerBtc',
  LEDGER_ETH = 'LedgerEth',
  BITBOX_BTC = 'BitBoxBtc',
  BITBOX_ETH = 'BitBoxEth',
  TREZOR_BTC = 'TrezorBtc',
  TREZOR_ETH = 'TrezorEth',
  CLI_BTC = 'CliBtc',
  CLI_ETH = 'CliEth',
  WALLET_CONNECT = 'WalletConnect',
}

interface WalletInterface {
  isInitialized: boolean;
  blockchain?: Blockchain;
  switchBlockchain: (to: Blockchain) => void;
  login: (
    wallet: WalletType,
    address: string,
    blockchain: Blockchain,
    onSignMessage: (address: string, message: string) => Promise<string>,
  ) => Promise<void>;
  activeWallet: WalletType | undefined;
}

interface WalletContextProps extends PropsWithChildren {
  router: Router;
}

const WalletContext = createContext<WalletInterface>(undefined as any);

export function useWalletContext(): WalletInterface {
  return useContext(WalletContext);
}

export function WalletContextProvider(props: WalletContextProps): JSX.Element {
  const { isInitialized: isSessionInitialized, isLoggedIn, logout } = useSessionContext();
  const { updateSession } = useApiSession();
  const api = useSessionContext();
  const { isInitialized: isParamsInitialized, params: appParams } = useAppHandlingContext();
  const { getSignMessage } = useAuth();
  const { hasBalance, getBalances: getParamBalances, readBalances } = useBalanceContext();
  const { activeWallet: activeWalletStore } = useStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [activeWallet, setActiveWallet] = useState<WalletType | undefined>(activeWalletStore.get());
  const [activeBlockchain, setActiveBlockchain] = useState<Blockchain>();

  // initialize
  useEffect(() => {
    if (isSessionInitialized && !isLoggedIn) {
      setWallet();
      if (isInitialized) readBalances(undefined);
    }
  }, [isSessionInitialized, isLoggedIn, isInitialized]);

  useEffect(() => {
    if (isParamsInitialized)
      handleParamSession().then((hasSession) => {
        if (hasSession) {
          setWallet(appParams.type as WalletType);
          appParams.redirect && props.router.navigate(appParams.redirect);
        }
        setIsInitialized(true);
      });
  }, [isParamsInitialized]);

  async function handleParamSession(): Promise<boolean> {
    try {
      if (appParams.address && appParams.signature) {
        await createSession(appParams.address, appParams.signature);
        return true;
      } else if (appParams.session && Utils.isJwt(appParams.session)) {
        updateSession(appParams.session);
        return true;
      }
    } catch (e) {
      logout();
    }

    return false;
  }

  function setWallet(walletType?: WalletType) {
    setActiveWallet(walletType);
    walletType ? activeWalletStore.set(walletType) : activeWalletStore.remove();
  }

  // public API
  async function login(
    wallet: WalletType,
    address: string,
    blockchain: Blockchain,
    onSignMessage: (address: string, message: string) => Promise<string>,
  ): Promise<void> {
    try {
      const message = await getSignMessage(address);
      const signature = await onSignMessage(address, message);
      await createSession(address, signature);
    } catch (e) {
      api.logout();
      setWallet();

      throw e;
    }

    setWallet(wallet);
    setActiveBlockchain(blockchain);
  }

  async function createSession(address: string, signature: string): Promise<string> {
    const session =
      (await api.login(address, signature)) ??
      (await api.signUp(address, signature, appParams.wallet, appParams.refcode));
    if (!session) throw new Error('Failed to create session');

    return session;
  }

  // TODO: move tho sell screen?
  // async function getBalances(assets: Asset[]): Promise<AssetBalance[] | undefined> {
  //   switch (activeWallet) {
  //     case WalletType.META_MASK:
  //       return (await Promise.all(assets.map((asset: Asset) => metaMask.readBalance(asset, mmAddress)))).filter(
  //         (b) => b.amount > 0,
  //       );

  //     case WalletType.ALBY:
  //     case WalletType.LEDGER_BTC:
  //     case WalletType.LEDGER_ETH:
  //     case WalletType.BITBOX_BTC:
  //     case WalletType.BITBOX_ETH:
  //     case WalletType.TREZOR_BTC:
  //     case WalletType.TREZOR_ETH:
  //     case WalletType.CLI_BTC:
  //     case WalletType.CLI_ETH:
  //     case WalletType.WALLET_CONNECT:
  //       // no balance available
  //       return undefined;

  //     default:
  //       return getParamBalances(assets);
  //   }
  // }

  // TODO: move to sell screen
  // async function sendTransaction(sell: Sell): Promise<string> {
  //   switch (activeWallet) {
  //     case WalletType.META_MASK:
  //       if (!mmAddress) throw new Error('Address is not defined');

  //       return metaMask.createTransaction(new BigNumber(sell.amount), sell.asset, mmAddress, sell.depositAddress);

  //     case WalletType.ALBY:
  //       if (!sell.paymentRequest) throw new Error('Payment request not defined');

  //       return alby.sendPayment(sell.paymentRequest).then((p) => p.preimage);

  //     case WalletType.LEDGER_BTC:
  //     case WalletType.LEDGER_ETH:
  //     case WalletType.BITBOX_BTC:
  //     case WalletType.BITBOX_ETH:
  //     case WalletType.TREZOR_BTC:
  //     case WalletType.TREZOR_ETH:
  //     case WalletType.CLI_BTC:
  //     case WalletType.CLI_ETH:
  //     case WalletType.WALLET_CONNECT:
  //       throw new Error('Not supported yet');

  //     default:
  //       throw new Error('No wallet connected');
  //   }
  // }

  const context: WalletInterface = useMemo(
    () => ({
      isInitialized: isInitialized && isSessionInitialized && isParamsInitialized,
      blockchain: activeBlockchain,
      switchBlockchain: setActiveBlockchain,
      login,
      activeWallet,
    }),
    [
      isInitialized,
      isSessionInitialized,
      isParamsInitialized,
      activeWallet,
      activeBlockchain,
      api,
      hasBalance,
      getParamBalances,
      appParams,
    ],
  );

  return <WalletContext.Provider value={context}>{props.children}</WalletContext.Provider>;
}
