import { Asset, Blockchain, useAuth, useSessionContext } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMetaMask } from '../hooks/metamask.hook';
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
  const { isInstalled, register, requestAccount, requestBlockchain, sign, readBalance } = useMetaMask();
  const { login: apiLogin, logout: apiLogout, signUp: apiSignUp } = useSessionContext();
  const { wallet: paramWallet } = useParamContext();
  const { getSignMessage } = useAuth();
  const { hasBalance, getBalances: getParamBalances } = useBalanceContext();

  const [address, setAddress] = useState<string>();
  const [blockchain, setBlockchain] = useState<Blockchain>();
  const [activeWallet, setActiveWallet] = useState<WalletType>();

  useEffect(() => {
    register(setAddress, setBlockchain);
  }, []);

  async function login(wallet: WalletType, signHintCallback?: () => Promise<void>): Promise<string> {
    const [address, blockchain] = await connect(wallet);

    setAddress(address);
    setBlockchain(blockchain);
    setActiveWallet(wallet);

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
        return await Promise.all(assets.map((asset: Asset) => readBalance(asset, address)));
      default:
        return getParamBalances(assets);
    }
  }

  const context: WalletInterface = useMemo(
    () => ({
      address,
      blockchain,
      wallets: Object.values(WalletType),
      getInstalledWallets,
      login,
      activeWallet,
      signMessage,
      hasBalance: hasBalance, // || activeWallet != null, // TODO: activate
      getBalances,
    }),
    [address, blockchain, isInstalled, activeWallet, requestAccount, requestBlockchain, sign, getParamBalances],
  );

  return <WalletContext.Provider value={context}>{props.children}</WalletContext.Provider>;
}
