import { Blockchain, useAuth, useAuthContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledLink,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { LnurlAuth } from '@dfx.swiss/react/dist/definitions/auth'; // TODO: export
import { useEffect, useState } from 'react';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { useDeferredPromise } from '../../../hooks/deferred-promise.hook';
import { QrCopy } from '../../payment/qr-copy';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.DFX_TARO]: [Blockchain.LIGHTNING],
};

export function ConnectTaro(props: ConnectProps): JSX.Element {
  const { session } = useAuthContext();
  const { createLnurlAuth, getLnurlAuth } = useAuth();

  const [auth, setAuth] = useState<LnurlAuth>();
  const [createTokenPromise, tokenPromise] = useDeferredPromise<string>();

  const link = auth && `bluewallet:lightning:${auth.lnurl}`;

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    await createLnurlAuth().then(setAuth);

    return createTokenPromise().then((session) => ({ session }));
  }

  async function getSignature(): Promise<never> {
    throw new Error('Invalid signature call');
  }

  useEffect(() => {
    if (auth?.k1) {
      // start polling
      const poller = setInterval(
        () =>
          getLnurlAuth(auth.k1)
            .then((r) => {
              if (r.isComplete) {
                clearInterval(poller);
                tokenPromise?.resolve(r.accessToken);
              }
            })
            .catch(() => {
              clearInterval(poller);
              setAuth(undefined);
              tokenPromise?.reject(new Error('Authentication failed'));
            }),
        1000,
      );

      return () => clearInterval(poller);
    }
  }, [auth?.k1]);

  return (
    <ConnectBase
      isSupported={() => true}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={getSignature}
      renderContent={(p) => <Content link={link} {...p} />}
      autoConnect
      {...props}
    />
  );
}

interface ContentProps extends ConnectContentProps {
  link?: string;
}

function Content({ connect, link, error }: ContentProps): JSX.Element {
  const { translate } = useSettingsContext();

  if (error)
    return (
      <>
        <ConnectError error={error} />
        <StyledButton
          className="mt-4"
          label={translate('general/actions', 'Connect')}
          onClick={() => connect()}
          width={StyledButtonWidth.MIN}
        />
      </>
    );

  if (link)
    return (
      <>
        <h2 className="text-dfxGray-700 mb-4">{translate('screens/home', 'Login with your BTC Taro Wallet')}</h2>
        <QrCopy data={link} />
        <StyledLink label={translate('screens/home', 'Open app')} url={link} target="_self" dark />

        <h2 className="text-dfxGray-700 mt-8">{translate('screens/home', 'Install BTC Taro')}</h2>
        <a href="https://dfx.swiss/app/btc" target="_blank">
          <img src="https://content.dfx.swiss/img/v1/services/btc-app.png" className="w-full max-w-sm" />
        </a>
      </>
    );

  return (
    <div className="mb-4">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  );
}
