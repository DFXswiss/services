import { Asset, Blockchain, Sell, useApiSession, useAuth, useSessionContext } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GetInfoResponse } from 'webln';
import { useStore } from '../hooks/store.hook';
import { useAlby } from '../hooks/wallets/alby.hook';
import { useMetaMask } from '../hooks/wallets/metamask.hook';
import { delay } from '../util/utils';
import { AssetBalance, useBalanceContext } from './balance.context';
import { useParamContext } from './param.context';

export enum WalletType {
  META_MASK = 'MetaMask',
  ALBY = 'Alby',
}

interface WalletInterface {
  address?: string;
  blockchain?: Blockchain;
  wallets: WalletType[];
  getInstalledWallets: () => WalletType[];
  login: (wallet: WalletType, signHintCallback?: () => Promise<void>, address?: string) => Promise<string | undefined>;
  activeWallet: WalletType | undefined;
  sellEnabled: boolean;
  getBalances: (assets: Asset[]) => Promise<AssetBalance[] | undefined>;
  sendTransaction: (sell: Sell) => Promise<string>;
}

const WalletContext = createContext<WalletInterface>(undefined as any);

export function useWalletContext(): WalletInterface {
  return useContext(WalletContext);
}

export function WalletContextProvider(props: PropsWithChildren): JSX.Element {
  const { isInitialized, isLoggedIn } = useSessionContext();
  const { session } = useApiSession();
  const {
    isInstalled: isMmInstalled,
    register,
    requestAccount,
    requestBlockchain,
    sign: signMm,
    readBalance,
    createTransaction,
  } = useMetaMask();
  const { isInstalled: isAlbyInstalled, enable, signMessage: signAlby, sendPayment } = useAlby();
  const { login: apiLogin, logout: apiLogout, signUp: apiSignUp } = useSessionContext();
  const { wallet: paramWallet } = useParamContext();
  const { getSignMessage } = useAuth();
  const { hasBalance, getBalances: getParamBalances } = useBalanceContext();
  const { activeWallet: activeWalletStore } = useStore();

  const [activeAddress, setActiveAddress] = useState<string>();
  const [activeWallet, setActiveWallet] = useState<WalletType | undefined>(activeWalletStore.get());

  const [mmAddress, setMmAddress] = useState<string>();
  const [mmBlockchain, setMmBlockchain] = useState<Blockchain>();

  useEffect(() => {
    if (activeWallet) connect(activeWallet);
  }, []);

  // listen to MM account switches
  useEffect(() => {
    register(setMmAddress, setMmBlockchain);
  }, []);

  useEffect(() => {
    if (activeWallet === WalletType.META_MASK) {
      if (activeAddress && mmAddress) {
        // logout on account switch
        if (activeAddress !== mmAddress) apiLogout();
      } else {
        setActiveAddress(mmAddress);
      }
    }
  }, [activeAddress, mmAddress, activeWallet]);

  // reset on session change
  useEffect(() => {
    if (activeAddress && session?.address && activeAddress !== session.address) resetWallet();
  }, [session, activeAddress]);

  useEffect(() => {
    if (isInitialized && !isLoggedIn) resetWallet();
  }, [isInitialized, isLoggedIn]);

  function resetWallet() {
    setActiveAddress(undefined);
    setActiveWallet(undefined);
    activeWalletStore.remove();
  }

  // public API
  async function login(
    wallet: WalletType,
    signHintCallback?: () => Promise<void>,
    usedAddress?: string,
  ): Promise<string> {
    const address = await connect(wallet, usedAddress);

    // show signature hint
    await signHintCallback?.();

    const session = await createSession(wallet, address, paramWallet);
    if (!session) {
      apiLogout();
      resetWallet();
    }

    return address;
  }

  async function connect(wallet: WalletType, usedAddress?: string): Promise<string> {
    const [address, blockchain] = await readData(wallet, usedAddress);

    setActiveWallet(wallet);
    activeWalletStore.set(wallet);

    switch (wallet) {
      case WalletType.META_MASK:
        setMmAddress(address);
        setMmBlockchain(blockchain);
        break;

      case WalletType.ALBY:
        setActiveAddress(address);
        break;
    }

    return address;
  }

  async function readData(wallet: WalletType, address?: string): Promise<[string, Blockchain | undefined]> {
    switch (wallet) {
      case WalletType.META_MASK:
        address ??= await requestAccount();
        if (!address) throw new Error('Permission denied or account not verified');

        const blockchain = await requestBlockchain();

        return [address, blockchain];

      case WalletType.ALBY:
        const account = await enable().catch();
        if (!account) throw new Error('Permission denied or account not verified');

        address ??= await getAlbyAddress(account);

        return [address, Blockchain.LIGHTNING];
    }
  }

  async function getAlbyAddress(account: GetInfoResponse): Promise<string> {
    if (account?.node?.pubkey) {
      // log in with pub key
      return `LNNID${account.node.pubkey.toUpperCase()}`;
    } else if (account?.node?.alias?.includes('getalby.com')) {
      // log in with Alby
      const win: Window = window;
      const redirectUrl = new URL(win.location.href);
      redirectUrl.searchParams.set('type', WalletType.ALBY);
      win.location = `${process.env.REACT_APP_API_URL}/alby?redirect_uri=${encodeURIComponent(redirectUrl.toString())}`;

      await delay(5);
      throw new Error('Forwarded to Alby page');
    }

    throw new Error('No login method found');
  }

  async function signMessage(wallet: WalletType, message: string, address: string): Promise<string> {
    switch (wallet) {
      case WalletType.META_MASK:
        return signMm(address, message);

      case WalletType.ALBY:
        return signAlby(message);

      default:
        throw new Error('No wallet active');
    }
  }

  function getInstalledWallets(): WalletType[] {
    const wallets: WalletType[] = [];

    if (isMmInstalled()) wallets.push(WalletType.META_MASK);
    if (isAlbyInstalled()) wallets.push(WalletType.ALBY);

    return wallets;
  }

  async function createSession(walletType: WalletType, address: string, wallet?: string): Promise<string | undefined> {
    try {
      const message = await getSignMessage(address);
      const signature = await signMessage(walletType, message, address);
      return (await apiLogin(address, signature)) ?? (await apiSignUp(address, signature, wallet));
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  async function getBalances(assets: Asset[]): Promise<AssetBalance[] | undefined> {
    switch (activeWallet) {
      case WalletType.META_MASK:
        return (await Promise.all(assets.map((asset: Asset) => readBalance(asset, activeAddress)))).filter(
          (b) => b.amount > 0,
        );

      case WalletType.ALBY:
        // no balance available
        return undefined;

      default:
        return getParamBalances(assets);
    }
  }

  function getAddress(): string | undefined {
    switch (activeWallet) {
      case WalletType.META_MASK:
        return mmAddress;

      case WalletType.ALBY:
        return activeAddress;

      default:
        return undefined;
    }
  }

  function getBlockchain(): Blockchain | undefined {
    switch (activeWallet) {
      case WalletType.META_MASK:
        return mmBlockchain;

      case WalletType.ALBY:
        return Blockchain.LIGHTNING;

      default:
        return undefined;
    }
  }

  async function sendTransaction(sell: Sell): Promise<string> {
    switch (activeWallet) {
      case WalletType.META_MASK:
        if (!mmAddress) throw new Error('Address is not defined');

        return createTransaction(new BigNumber(sell.amount), sell.asset, mmAddress, sell.depositAddress);

      case WalletType.ALBY:
        if (!sell.paymentRequest) throw new Error('Payment request not defined');

        return sendPayment(sell.paymentRequest).then((p) => p.preimage);

      default:
        throw new Error('No wallet connected');
    }
  }

  const context: WalletInterface = useMemo(
    () => ({
      address: getAddress(),
      blockchain: getBlockchain(),
      wallets: Object.values(WalletType),
      getInstalledWallets,
      login,
      activeWallet,
      sellEnabled:
        hasBalance || (activeWallet != null && [WalletType.META_MASK, WalletType.ALBY].includes(activeWallet)),
      getBalances,
      sendTransaction,
    }),
    [
      mmAddress,
      mmBlockchain,
      getParamBalances,
      activeWallet,
      isMmInstalled,
      requestAccount,
      requestBlockchain,
      signMm,
      isAlbyInstalled,
      enable,
      signAlby,
    ],
  );

  return <WalletContext.Provider value={context}>{props.children}</WalletContext.Provider>;
}