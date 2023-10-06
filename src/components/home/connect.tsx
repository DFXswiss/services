import { Blockchain, useSessionContext } from '@dfx.swiss/react';
import { useState } from 'react';
import { WalletType, useWalletContext } from '../../contexts/wallet.context';
import { useDeferredPromise } from '../../hooks/deferred-promise.hook';
import { useStore } from '../../hooks/store.hook';
import { AbortError } from '../../util/abort-error';
import { ConnectProps } from './connect-metamask';
import { InstallHint } from './install-hint';
import { SignHint } from './sign-hint';

interface Props extends ConnectProps {
  wallet: WalletType;
  isSupported: boolean;
  getAccount: () => Promise<{ address: string; blockchain: Blockchain }>;
  signMessage: (address: string, msg: string) => Promise<string>;
  renderContent: (back: () => void, connect: () => Promise<void>, isConnecting: boolean, error?: string) => JSX.Element;
}

export function Connect({
  wallet,
  isSupported,
  getAccount,
  signMessage,
  renderContent,
  onLogin,
  onCancel,
}: Props): JSX.Element {
  const { isInitialized, login, switchBlockchain, activeWallet } = useWalletContext();
  const { showsSignatureInfo } = useStore();
  const { logout } = useSessionContext();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();
  const [createSignMessagePromise, signMessagePromise] = useDeferredPromise<string>();
  const [addr, setAddr] = useState<string>();
  const [msg, setMsg] = useState<string>();

  async function connect() {
    setIsConnecting(true);
    setConnectError(undefined);

    const { address, blockchain } = await getAccount();
    await doLogin(address, blockchain)
      .then(onLogin)
      .catch((e) => {
        if (e instanceof AbortError) {
          onCancel();
        } else {
          setConnectError(e.message);
        }

        throw e;
      })
      .finally(() => setIsConnecting(false));
  }

  async function doLogin(address: string, blockchain: Blockchain) {
    return activeWallet === wallet // TODO: address check (where to get address from?)
      ? switchBlockchain(blockchain)
      : logout().then(() => login(wallet, address, blockchain, onSignMessage));
  }

  async function onSignMessage(address: string, message: string): Promise<string> {
    if (!showsSignatureInfo.get()) return signMessage(address, message);

    setAddr(address);
    setMsg(message);
    return createSignMessagePromise();
  }

  async function onSignHintConfirmed(hide: boolean, address: string, message: string): Promise<void> {
    showsSignatureInfo.set(!hide);
    setAddr(undefined);
    setMsg(undefined);

    const signature = await signMessage(address, message);
    signMessagePromise?.resolve(signature);
  }

  return !isSupported ? (
    <InstallHint type={wallet} onConfirm={onCancel} />
  ) : addr && msg ? (
    <SignHint onConfirm={(h) => onSignHintConfirmed(h, addr, msg)} />
  ) : (
    renderContent(onCancel, connect, isConnecting, connectError)
  );
}
