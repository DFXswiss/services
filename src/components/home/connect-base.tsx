import { Blockchain, useAuthContext, useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BitcoinAddressType } from '../../config/key-path';
import { WalletType, useWalletContext } from '../../contexts/wallet.context';
import { useDeferredPromise } from '../../hooks/deferred-promise.hook';
import { useStore } from '../../hooks/store.hook';
import { AbortError } from '../../util/abort-error';
import { Account, ConnectContentProps, ConnectProps } from './connect-shared';
import { InstallHint } from './install-hint';
import { SignHint } from './sign-hint';

interface Props extends ConnectProps {
  isSupported: () => boolean | Promise<boolean>;
  fallback?: WalletType;
  supportedBlockchains: { [k in WalletType]?: Blockchain[] };
  getAccount: (blockchain: Blockchain, isReconnect: boolean) => Promise<Account>;
  signMessage: (
    msg: string,
    address: string,
    blockchain: Blockchain,
    index?: number,
    type?: BitcoinAddressType,
  ) => Promise<string>;
  renderContent: (props: ConnectContentProps) => JSX.Element;
  autoConnect?: boolean;
}

export function ConnectBase({
  rootRef,
  wallet,
  blockchain,
  isSupported,
  fallback,
  supportedBlockchains,
  getAccount,
  signMessage,
  renderContent,
  onLogin,
  onCancel,
  onSwitch,
  autoConnect,
}: Props): JSX.Element {
  const { login, setSession, switchBlockchain, activeWallet } = useWalletContext();
  const { showsSignatureInfo } = useStore();
  const { logout } = useSessionContext();
  const { session } = useAuthContext();

  const [isLoading, setIsLoading] = useState(true);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();
  const [createSignMessagePromise, signMessagePromise] = useDeferredPromise<string>();
  const [addr, setAddr] = useState<string>();
  const [msg, setMsg] = useState<string>();
  const [chain, setChain] = useState<Blockchain>();
  const [index, setIndex] = useState<number>();
  const [type, setType] = useState<BitcoinAddressType>();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const supported = await isSupported();
    if (!supported && fallback) onSwitch(fallback);

    setShowInstallHint(!supported);
    setIsLoading(false);

    if (autoConnect) connect();
  }

  async function connect() {
    setIsConnecting(true);
    setConnectError(undefined);

    const usedChain = blockchain ?? supportedBlockchains[wallet]?.[0];
    if (!usedChain) throw new Error('No blockchain');
    if (!supportedBlockchains[wallet]?.includes(usedChain)) throw new Error('Invalid blockchain');

    await getAccount(usedChain, activeWallet === wallet)
      .then((a) => doLogin({ ...a, blockchain: usedChain }))
      .then(onLogin)
      .catch((e) => {
        setIsConnecting(false);

        if (e instanceof AbortError) {
          onCancel();
        } else {
          setConnectError(e.message);
        }
      });
  }

  async function doLogin(account: Account & { blockchain: Blockchain }) {
    return activeWallet === wallet && 'address' in account && account.address === session?.address
      ? switchBlockchain(account.blockchain)
      : logout().then(() =>
          'session' in account
            ? setSession(wallet, account.blockchain, account.session)
            : login(wallet, account.address, account.blockchain, (a, m) =>
                account.signature
                  ? Promise.resolve(account.signature)
                  : onSignMessage(a, account.blockchain, m, account.index, account.type),
              ),
        );
  }

  async function onSignMessage(
    address: string,
    blockchain: Blockchain,
    message: string,
    index?: number,
    addressType?: BitcoinAddressType,
  ): Promise<string> {
    if (!showsSignatureInfo.get()) return signMessage(message, address, blockchain, index, addressType);

    setAddr(address);
    setChain(blockchain);
    setMsg(message);
    setIndex(index);
    setType(addressType);
    return createSignMessagePromise();
  }

  async function onSignHintConfirmed(
    hide: boolean,
    address: string,
    blockchain: Blockchain,
    message: string,
    index?: number,
    addressType?: BitcoinAddressType,
  ): Promise<void> {
    showsSignatureInfo.set(!hide);
    setAddr(undefined);
    setMsg(undefined);
    setChain(undefined);
    setIndex(undefined);
    setType(undefined);

    try {
      const signature = await signMessage(message, address, blockchain, index, addressType);
      signMessagePromise?.resolve(signature);
    } catch (e) {
      signMessagePromise?.reject(e);
    }
  }

  const contentOverride = isLoading ? (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  ) : showInstallHint ? (
    <InstallHint type={wallet} onConfirm={onCancel} />
  ) : addr && msg && chain ? (
    <SignHint onConfirm={(h) => onSignHintConfirmed(h, addr, chain, msg, index, type)} />
  ) : undefined;

  return (
    <>
      {contentOverride}
      <span className={'w-full flex flex-col items-center' + (contentOverride ? ' hidden' : '')}>
        {renderContent({ rootRef, back: onCancel, connect, isConnecting, error: connectError, onSwitch })}
      </span>
    </>
  );
}
