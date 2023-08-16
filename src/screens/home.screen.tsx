import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCheckboxRow,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/layout';
import { ServiceButton, ServiceButtonType } from '../components/service-button';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useDeferredPromise } from '../hooks/deferred-promise.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useStore } from '../hooks/store.hook';

export function HomeScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isProcessing, isLoggedIn } = useSessionContext();
  const { user, isUserLoading } = useUserContext();
  const { isEmbedded } = useAppHandlingContext();
  const { wallets, getInstalledWallets, login } = useWalletContext();
  const { defer, deferRef } = useDeferredPromise<void>();
  const { showsSignatureInfo } = useStore();
  const { navigate } = useNavigation();
  const { search } = useLocation();

  const [isConnecting, setIsConnecting] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState<WalletType>();
  const [showSignHint, setShowSignHint] = useState(false);

  // connect button labels
  const labels: { [type in WalletType]: string } = {
    [WalletType.META_MASK]: 'MetaMask / Rabby',
    [WalletType.ALBY]: 'Alby',
  };

  const redirectPath = new URLSearchParams(search).get('redirect-path');

  async function confirmSignHint(): Promise<void> {
    if (!showsSignatureInfo.get()) return;

    setShowSignHint(true);
    return defer().promise;
  }

  function signHintConfirmed(hide: boolean) {
    showsSignatureInfo.set(!hide);
    setShowSignHint(false);
    deferRef?.resolve();
  }

  function onHintConfirmed() {
    setShowInstallHint(undefined);
  }

  // connect
  function connect(wallet: WalletType, address?: string) {
    if (getInstalledWallets().some((w) => w === wallet)) {
      setIsConnecting(true);
      login(wallet, confirmSignHint, address)
        .then(() => {
          if (redirectPath) {
            // wait for the user to reload
            setTimeout(() => navigate({ pathname: redirectPath }, { clearSearch: ['redirect-path'] }), 10);
          }
        })
        .finally(() => setIsConnecting(false));
    } else {
      setShowInstallHint(wallet);
    }
  }

  return (
    <Layout title={isEmbedded ? translate('screens/home', 'DFX services') : undefined} backButton={isEmbedded}>
      {isProcessing || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <>
          {isLoggedIn && user ? (
            <LoggedInContent />
          ) : showInstallHint ? (
            <InstallHint type={showInstallHint} onConfirm={onHintConfirmed} />
          ) : showSignHint ? (
            <SignHint onConfirm={signHintConfirmed} />
          ) : isConnecting ? (
            <>
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </>
          ) : (
            <>
              {!isEmbedded && <BrowserContent />}
              <p className="text-dfxGray-700 pt-8 pb-4">
                {translate('screens/home', 'Please login via an application to use our services')}
              </p>

              {wallets.map((w) => (
                <StyledButton
                  key={w}
                  label={translate('screens/home', labels[w])}
                  color={StyledButtonColor.RED}
                  onClick={() => connect(w)}
                />
              ))}
            </>
          )}
        </>
      )}
    </Layout>
  );
}

function BrowserContent(): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <h2 className="text-dfxBlue-800">{translate('screens/home', 'DFX services')}</h2>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Buy and Sell cryptocurrencies with bank transfers')}
      </p>
    </>
  );
}

function LoggedInContent(): JSX.Element {
  const { user } = useUserContext();
  const { sellEnabled } = useWalletContext();
  const { isEmbedded } = useAppHandlingContext();

  return (
    <>
      {!isEmbedded && <BrowserContent />}
      <div className="flex flex-col gap-8 py-8">
        <ServiceButton type={ServiceButtonType.BUY} url="/buy" />
        <ServiceButton
          type={ServiceButtonType.SELL}
          url={user?.kycDataComplete ? '/sell' : '/profile'}
          disabled={!sellEnabled}
        />
        {/* <ServiceButton type={ServiceButtonType.CONVERT} url="/convert" disabled /> */}
      </div>
    </>
  );
}

function SignHint({ onConfirm }: { onConfirm: (hide: boolean) => void }): JSX.Element {
  const { translate } = useSettingsContext();

  const [isChecked, setIsChecked] = useState(false);

  return (
    <StyledVerticalStack gap={5} center>
      <StyledVerticalStack center>
        <DfxIcon icon={IconVariant.SIGNATURE_POPUP} />
        <h2 className="text-dfxGray-700">
          {translate(
            'screens/home',
            'Log in to your DFX account by verifying with your signature that you are the sole owner of the provided blockchain address.',
          )}
        </h2>
      </StyledVerticalStack>
      <StyledCheckboxRow isChecked={isChecked} onChange={setIsChecked} centered>
        {translate('screens/home', "Don't show this again.")}
      </StyledCheckboxRow>

      <StyledButton
        width={StyledButtonWidth.MD}
        color={StyledButtonColor.RED}
        label="OK"
        onClick={() => onConfirm(isChecked)}
      />
    </StyledVerticalStack>
  );
}

function InstallHint({ type, onConfirm }: { type: WalletType; onConfirm: () => void }): JSX.Element {
  switch (type) {
    case WalletType.META_MASK:
      return <MetaMaskHint onConfirm={onConfirm} />;
    case WalletType.ALBY:
      return <AlbyHint onConfirm={onConfirm} />;
  }
}

function MetaMaskHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Please install MetaMask or Rabby!')}</h1>
      <p className="text-dfxGray-700">
        {translate(
          'screens/home',
          'You need to install the MetaMask or Rabby browser extension to be able to use this service. Visit',
        )}{' '}
        <StyledLink label="metamask.io" url="https://metamask.io" dark /> /{' '}
        <StyledLink label="rabby.io" url="https://rabby.io/" dark /> {translate('screens/home', 'for more details.')}
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function AlbyHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Please install Alby!')}</h1>
      <p className="text-dfxGray-700">
        {translate(
          'screens/home',
          'You need to install the Alby browser extension to be able to use this service. Visit',
        )}{' '}
        <StyledLink label="getalby.com" url="https://getalby.com/" dark />{' '}
        {translate('screens/home', 'for more details.')}
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}
