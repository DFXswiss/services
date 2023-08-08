import { Asset, Blockchain, useApiSession, useAuth, useSessionContext } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMetaMask } from '../hooks/metamask.hook';
import { useStore } from '../hooks/store.hook';
import { AssetBalance, useBalanceContext } from './balance.context';
import { useParamContext } from './param.context';

export enum WalletType {
  META_MASK = 'MetaMask',
}

interface WalletInterface {
  address?: string;
  blockchain?: Blockchain;
  wallets: WalletType[];
  getInstalledWallets: () => WalletType[];
  login: (wallet: WalletType, signHintCallback?: () => Promise<void>) => Promise<string>;
  activeWallet: WalletType | undefined;
  signMessage: (message: string, address: string) => Promise<string>;
  hasBalance: boolean;
  getBalances: (assets: Asset[]) => Promise<AssetBalance[]>;
}

const WalletContext = createContext<WalletInterface>(undefined as any);

export function useWalletContext(): WalletInterface {
  return useContext(WalletContext);
}

export function WalletContextProvider(props: PropsWithChildren): JSX.Element {
  const { isInitialized, isLoggedIn } = useSessionContext();
  const { session } = useApiSession();
  const { isInstalled, register, requestAccount, requestBlockchain, sign, readBalance } = useMetaMask();
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
    register(setMmAddress, setMmBlockchain);
  }, []);

  useEffect(() => {
    if (activeAddress && mmAddress) {
      // logout on account switch
      if (activeAddress !== mmAddress) apiLogout();
    } else if (activeWallet === WalletType.META_MASK) {
      setActiveAddress(mmAddress);
    }
  }, [activeAddress, mmAddress, activeWallet]);

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

  async function login(wallet: WalletType, signHintCallback?: () => Promise<void>): Promise<string> {
    const [address, blockchain] = await connect(wallet);

    setActiveWallet(wallet);
    activeWalletStore.set(wallet);
    setMmAddress(address);
    setMmBlockchain(blockchain);

    // show signature hint
    await signHintCallback?.();

    const session = await createSession(address, paramWallet);
    !session && apiLogout();

    return address;
  }

  async function connect(_: WalletType): Promise<[string, Blockchain | undefined]> {
    const address = await requestAccount();
    if (!address) throw new Error('Permission denied or account not verified');

    const blockchain = await requestBlockchain();

    return [address, blockchain];
  }

  async function signMessage(message: string, address: string): Promise<string> {
    try {
      return await sign(address, message);
    } catch (e: any) {
      console.error(e.message, e.code);
      throw e;
    }
  }

  function getInstalledWallets(): WalletType[] {
    const wallets: WalletType[] = [];

    if (isInstalled()) wallets.push(WalletType.META_MASK);

    return wallets;
  }

  async function createSession(address: string, wallet?: string): Promise<string | undefined> {
    try {
      const message = await getSignMessage(address);
      const signature = await signMessage(message, address);
      return (await apiLogin(address, signature)) ?? (await apiSignUp(address, signature, wallet));
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  async function getBalances(assets: Asset[]): Promise<AssetBalance[]> {
    switch (activeWallet) {
      case WalletType.META_MASK:
        return (await Promise.all(assets.map((asset: Asset) => readBalance(asset, activeAddress)))).filter(
          (b) => b.amount > 0,
        );
      default:
        return getParamBalances(assets);
    }
  }

  const context: WalletInterface = useMemo(
    () => ({
      address: activeWallet === WalletType.META_MASK ? mmAddress : undefined,
      blockchain: activeWallet === WalletType.META_MASK ? mmBlockchain : undefined,
      wallets: Object.values(WalletType),
      getInstalledWallets,
      login,
      activeWallet,
      signMessage,
      hasBalance: hasBalance, // || activeWallet != null, // TODO: activate
      getBalances,
    }),
    [mmAddress, mmBlockchain, getParamBalances, activeWallet, isInstalled, requestAccount, requestBlockchain, sign],
  );

  return <WalletContext.Provider value={context}>{props.children}</WalletContext.Provider>;
}
