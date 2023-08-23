import { Blockchain, useSessionContext, useUserContext } from '@dfx.swiss/react';
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
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useParamContext } from '../contexts/param.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useDeferredPromise } from '../hooks/deferred-promise.hook';
import { Tile, useFeatureTree } from '../hooks/feature-tree.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useStore } from '../hooks/store.hook';
import { Stack } from '../util/stack';

export function HomeScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isProcessing, logout } = useSessionContext();
  const { isUserLoading } = useUserContext();
  const { isEmbedded } = useAppHandlingContext();
  const { getInstalledWallets, login, switchBlockchain, activeWallet } = useWalletContext();
  const { defer, deferRef } = useDeferredPromise<void>();
  const { showsSignatureInfo } = useStore();
  const { navigate } = useNavigation();
  const { search } = useLocation();
  const { getTiles, setOptions } = useFeatureTree();
  const { blockchain } = useParamContext();

  const [isConnecting, setIsConnecting] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState<WalletType>();
  const [showSignHint, setShowSignHint] = useState(false);
  const [pages, setPages] = useState(new Stack<{ page: string; allowedTiles: string[] | undefined }>());

  const redirectPath = new URLSearchParams(search).get('redirect-path');
  const currentPage = pages.current?.page;
  const allowedTiles = pages.current?.allowedTiles;
  const tiles = getTiles(currentPage);

  // signature hint
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

  // tile handling
  function handleNext(tile: Tile) {
    if (tile.disabled) return;

    if (tile.wallet) {
      connect(tile.wallet)
        .then(() => setPages(new Stack()))
        .catch(console.error);
    } else {
      if (tile.next.options) setOptions(tile.next.options);
      setPages((p) => p.push({ page: tile.next.page, allowedTiles: tile.next.tiles }));
    }
  }

  function handleBack() {
    setPages((p) => p.pop());
  }

  // connect
  async function connect(wallet: WalletType, address?: string) {
    if (getInstalledWallets().some((w) => w === wallet)) {
      setIsConnecting(true);
      return doLogin(wallet, address)
        .then(() => {
          if (redirectPath) {
            // wait for the user to reload
            setTimeout(() => navigate({ pathname: redirectPath }, { clearParams: ['redirect-path'] }), 10);
          }
        })
        .finally(() => setIsConnecting(false));
    } else {
      setShowInstallHint(wallet);
      throw new Error('Wallet not installed');
    }
  }

  async function doLogin(wallet: WalletType, address?: string) {
    const selectedChain = blockchain as Blockchain;
    return activeWallet === wallet
      ? switchBlockchain(selectedChain)
      : logout().then(() => login(wallet, confirmSignHint, selectedChain, address));
  }

  return (
    <Layout
      title={isEmbedded ? translate('screens/home', 'DFX services') : undefined}
      backButton={isEmbedded || currentPage != null}
      onBack={currentPage ? handleBack : undefined}
    >
      {isProcessing || isUserLoading || !tiles ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <>
          {showInstallHint ? (
            <InstallHint type={showInstallHint} onConfirm={onHintConfirmed} />
          ) : showSignHint ? (
            <SignHint onConfirm={signHintConfirmed} />
          ) : isConnecting ? (
            <>
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </>
          ) : (
            <>
              <div className="flex self-start mb-4 sm:mt-8 sm:mb-14">
                <div className="bg-dfxRed-100" style={{ width: '11px', marginRight: '12px' }}></div>
                <div className="text-xl text-dfxBlue-800 font-extrabold text-left">
                  <Trans i18nKey={'screens/home.title'}>
                    Access all <span className="text-dfxRed-100 uppercase">DFX Services</span>
                    <br />
                    with this easy <span className="text-dfxRed-100 uppercase">toolbox</span>
                  </Trans>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full z-1">
                {tiles
                  .filter((t) => !allowedTiles || allowedTiles.includes(t.id))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="relative aspect-square"
                      style={{ borderRadius: '4%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
                    >
                      <img
                        src={t.img}
                        className={t.disabled ? 'opacity-60' : 'cursor-pointer'}
                        onClick={() => handleNext(t)}
                      />
                      {t.disabled && (
                        <div
                          className="absolute right-2 bottom-3 text-dfxBlue-800 font-extrabold rotate-180 uppercase"
                          style={{ writingMode: 'vertical-rl', fontSize: 'min(2vw, 1rem)' }}
                        >
                          {translate('screens/home', 'Coming Soon')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      <div className="fixed bottom-0 w-full max-w-screen-md">
        <img src="https://content.dfx.swiss/img/v1/services/berge.png" className="w-full" />
      </div>
    </Layout>
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
