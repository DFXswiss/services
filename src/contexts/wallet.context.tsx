import { Blockchain, Utils, useApiSession, useAuth, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';
import { useAppHandlingContext } from './app-handling.context';
import { useBalanceContext } from './balance.context';

// TODO:
// - Do install check on connect component
// - Check address when connecting to MM (re-login if wrong)
// - Switch blockchain on connect screen (if required)
// - Do pairing on connect screen

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
  switchBlockchain: (to: Blockchain) => Promise<void>;
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

  // const [mmAddress, setMmAddress] = useState<string>();
  // const [mmBlockchain, setMmBlockchain] = useState<Blockchain>(); // TODO: is this still needed?

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
    setWallet(wallet);
    setActiveBlockchain(blockchain);

    try {
      const message = await getSignMessage(address);
      const signature = await onSignMessage(address, message);
      await createSession(address, signature);
    } catch (e) {
      api.logout();
      setWallet();

      throw e;
    }
  }

  // TODO: move to connect screen
  // async function readData(
  //   wallet: WalletType,
  //   onPairing?: (code: string) => Promise<void>,
  //   blockchain?: Blockchain,
  //   address?: string,
  // ): Promise<[string, Blockchain | undefined]> {
  //   switch (wallet) {
  //     case WalletType.META_MASK:
  //       address ??= await metaMask.requestAccount();
  //       if (!address) throw new Error('Permission denied or account not verified');

  //       blockchain = await metaMask.requestBlockchain();

  //       return [address, blockchain];

  //     case WalletType.ALBY:
  //       const account = await alby.enable();

  //       address ??= await getAlbyAddress(account);

  //       return [address, Blockchain.LIGHTNING];

  //     case WalletType.LEDGER_BTC:
  //     case WalletType.LEDGER_ETH:
  //       address ??= await ledger.connect(wallet);
  //       return [address, blockchain];

  //     case WalletType.BITBOX_BTC:
  //     case WalletType.BITBOX_ETH:
  //       if (!onPairing) throw new Error('Pairing callback not set');

  //       address ??= await bitBox.connect(wallet, onPairing);
  //       return [address, blockchain];

  //     case WalletType.TREZOR_BTC:
  //     case WalletType.TREZOR_ETH:
  //       address ??= await trezor.connect(wallet);
  //       return [address, blockchain];

  //     case WalletType.CLI_BTC:
  //     case WalletType.CLI_ETH:
  //       if (!address) throw new Error('Address is not defined');
  //       return [address, blockchain];

  //     case WalletType.WALLET_CONNECT:
  //       address ??= await walletConnect.connect(blockchain ?? Blockchain.ETHEREUM);
  //       return [address, blockchain];
  //   }
  // }

  // TODO: move to connect screen
  // async function getAlbyAddress(account: GetInfoResponse): Promise<string> {
  //   if (account?.node?.pubkey) {
  //     // log in with pub key
  //     return `LNNID${account.node.pubkey.toUpperCase()}`;
  //   } else if (account?.node?.alias?.includes('getalby.com')) {
  //     // log in with Alby
  //     const win: Window = window;
  //     const redirectUrl = new URL(win.location.href);
  //     redirectUrl.searchParams.set('type', WalletType.ALBY);
  //     redirectPath && redirectUrl.searchParams.set('redirect', redirectPath);

  //     const params = new URLSearchParams({ redirectUri: redirectUrl.toString() });
  //     appParams.wallet && params.set('wallet', appParams.wallet);
  //     appParams.refcode && params.set('usedRef', appParams.refcode);

  //     win.location = url(`${process.env.REACT_APP_API_URL}/auth/alby`, params);

  //     await delay(5);
  //     throw new AbortError('Forwarded to Alby page');
  //   }

  //   throw new Error('No login method found');
  // }

  // TODO: move to connect components
  // async function signMessage(wallet: WalletType, message: string, address: string): Promise<string> {
  //   switch (wallet) {
  //     case WalletType.META_MASK:
  //       return metaMask.sign(address, message);

  //     case WalletType.ALBY:
  //       return alby.signMessage(message);

  //     case WalletType.LEDGER_BTC:
  //     case WalletType.LEDGER_ETH:
  //       return await ledger.signMessage(message, wallet);

  //     case WalletType.BITBOX_BTC:
  //     case WalletType.BITBOX_ETH:
  //       return await bitBox.signMessage(message, wallet);

  //     case WalletType.TREZOR_BTC:
  //     case WalletType.TREZOR_ETH:
  //       return await trezor.signMessage(message, wallet);

  //     case WalletType.CLI_BTC:
  //     case WalletType.CLI_ETH:
  //       throw new Error('Not supported');

  //     case WalletType.WALLET_CONNECT:
  //       return await walletConnect.signMessage(message, address, activeBlockchain ?? Blockchain.ETHEREUM);

  //     default:
  //       throw new Error('No wallet active');
  //   }
  // }

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

  async function switchBlockchain(to: Blockchain): Promise<void> {
    setActiveBlockchain(to);

    // // TODO: move to connect screen
    // case WalletType.META_MASK:
    //   return metaMask.requestChangeToBlockchain(to);
  }

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
      switchBlockchain,
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
