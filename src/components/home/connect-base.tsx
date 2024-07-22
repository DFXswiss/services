import { Blockchain, useAuthContext, useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BitcoinAddressType } from '../../config/key-path';
import { WalletBlockchains, WalletType, supportsBlockchain, useWalletContext } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';
import { Account, ConnectContentProps, ConnectProps } from './connect-shared';
import { InstallHint } from './install-hint';
import { SignHint } from './sign-hint';

interface Props extends ConnectProps {
  isSupported: () => boolean | Promise<boolean>;
  fallback?: WalletType;
  getAccount: (blockchain: Blockchain, isReconnect: boolean) => Promise<Account>;
  signMessage: (
    msg: string,
    address: string,
    blockchain: Blockchain,
    accountIndex?: number,
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
  getAccount,
  signMessage,
  renderContent,
  onLogin,
  onCancel,
  onSwitch,
  autoConnect,
}: Props): JSX.Element {
  const { login, setSession, switchBlockchain, activeWallet } = useWalletContext();
  const { logout } = useSessionContext();
  const { session } = useAuthContext();

  const [isLoading, setIsLoading] = useState(true);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [showSignHint, setShowSignHint] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();

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

  async function connect(chain?: Blockchain) {
    setIsConnecting(true);
    setConnectError(undefined);

    const usedChain = chain ?? blockchain ?? WalletBlockchains[wallet]?.[0];
    if (!usedChain) throw new Error('No blockchain');
    if (!supportsBlockchain(wallet, usedChain)) throw new Error('Invalid blockchain');

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
            ? setSession(account.session, wallet, account.blockchain)
            : login(
                wallet,
                account.address,
                account.blockchain,
                (a, m) =>
                  account.signature
                    ? Promise.resolve(account.signature)
                    : onSignMessage(a, account.blockchain, m, account.accountIndex, account.index, account.type),
                account.key,
              ),
        );
  }

  async function onSignMessage(
    address: string,
    blockchain: Blockchain,
    message: string,
    accountIndex?: number,
    index?: number,
    addressType?: BitcoinAddressType,
  ): Promise<string> {
    setShowSignHint(true);
    return signMessage(message, address, blockchain, accountIndex, index, addressType).finally(() =>
      setShowSignHint(false),
    );
  }

  const contentOverride = isLoading ? (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  ) : showInstallHint ? (
    <InstallHint type={wallet} onConfirm={onCancel} />
  ) : showSignHint ? (
    <SignHint />
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
