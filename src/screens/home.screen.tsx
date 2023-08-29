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
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType, useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useDeferredPromise } from '../hooks/deferred-promise.hook';
import { Tile, Wallet, isWallet, useFeatureTree } from '../hooks/feature-tree.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useStore } from '../hooks/store.hook';
import { AbortError } from '../util/abort-error';
import { Stack } from '../util/stack';

export function HomeScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isLoggedIn, isInitialized, isProcessing, logout } = useSessionContext();
  const { isUserLoading } = useUserContext();
  const { isEmbedded } = useAppHandlingContext();
  const { getInstalledWallets, login, switchBlockchain, activeWallet } = useWalletContext();
  const { defer, deferRef } = useDeferredPromise<void>();
  const { showsSignatureInfo } = useStore();
  const { navigate } = useNavigation();
  const { search } = useLocation();
  const { getTiles, getWallet, setOptions } = useFeatureTree();
  const appParams = useAppParams();

  const [isConnectingTo, setIsConnectingTo] = useState<Wallet>();
  const [connectError, setConnectError] = useState<string>();
  const [showInstallHint, setShowInstallHint] = useState<WalletType>();
  const [showSignHint, setShowSignHint] = useState(false);
  const [pages, setPages] = useState(new Stack<{ page: string; allowedTiles: string[] | undefined }>());

  const redirectPath = new URLSearchParams(search).get('redirect-path');
  const currentPage = pages.current?.page;
  const allowedTiles = pages.current?.allowedTiles;
  const tiles = getTiles(currentPage, allowedTiles);

  useEffect(() => {
    if (isInitialized && isLoggedIn && !activeWallet) {
      navigate('/buy');
    }
  }, [isInitialized, isLoggedIn, activeWallet]);

  useEffect(() => {
    const { mode } = appParams;
    mode && setPages((p) => p.push({ page: mode, allowedTiles: undefined }));
  }, [appParams.mode]);

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

  function signHintRejected() {
    setShowSignHint(false);
    deferRef?.reject(new AbortError('User cancelled'));
  }

  function onHintConfirmed() {
    setShowInstallHint(undefined);
  }

  // tile handling
  function handleNext(tile: Tile) {
    if (isWallet(tile)) {
      connectWallet(getWallet(tile, appParams));
    } else if (tile.next) {
      if (tile.next.options) setOptions(tile.next.options);
      const page = { page: tile.next.page, allowedTiles: tile.next.tiles };
      setPages((p) => p.push(page));

      const tiles = getTiles(page.page, page.allowedTiles);
      if (tiles?.length === 1 && tiles[0].next) handleNext(tiles[0]);
    }
  }

  function handleBack() {
    if (showInstallHint) {
      setShowInstallHint(undefined);
    } else if (showSignHint) {
      signHintRejected();
    } else if (isConnectingTo) {
      setConnectError(undefined);
      setIsConnectingTo(undefined);
    } else {
      setPages((p) => p.pop((i) => getTiles(i.page, i.allowedTiles)?.length === 1));
    }
  }

  function handleRetry() {
    isConnectingTo && connectWallet(isConnectingTo);
  }

  // connect
  async function connectWallet(wallet: Wallet) {
    connect(wallet)
      .then(() => setPages(new Stack()))
      .catch(console.error);
  }

  async function connect(wallet: Wallet, address?: string) {
    const installedWallets = await getInstalledWallets();
    if (installedWallets.some((w) => w === wallet.type)) {
      setIsConnectingTo(wallet);
      setConnectError(undefined);

      return doLogin(wallet.type, wallet.blockchain, address)
        .then(() => {
          if (redirectPath) {
            // wait for the user to reload
            setTimeout(() => navigate({ pathname: redirectPath }, { clearParams: ['redirect-path'] }), 10);
          }
        })
        .catch((e) => {
          if (e instanceof AbortError) {
            setIsConnectingTo(undefined);
          } else {
            setConnectError(e.message);
          }

          throw e;
        });
    } else {
      setShowInstallHint(wallet.type);
      throw new Error('Wallet not installed');
    }
  }

  async function doLogin(wallet: WalletType, blockchain?: Blockchain, address?: string) {
    const selectedChain = blockchain ?? (appParams.blockchain as Blockchain);

    return activeWallet === wallet
      ? selectedChain && switchBlockchain(selectedChain)
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
        <div className="z-1 flex flex-grow flex-col items-center">
          {showInstallHint ? (
            <InstallHint type={showInstallHint} onConfirm={onHintConfirmed} />
          ) : showSignHint ? (
            <SignHint onConfirm={signHintConfirmed} />
          ) : isConnectingTo ? (
            <ConnectHint type={isConnectingTo.type} error={connectError} onBack={handleBack} onRetry={handleRetry} />
          ) : (
            <>
              <div className="flex self-start mb-6">
                <div className="bg-dfxRed-100" style={{ width: '11px', marginRight: '12px' }}></div>
                <div className="text-xl text-dfxBlue-800 font-extrabold text-left">
                  <Trans i18nKey={'screens/home.title'}>
                    Access all <span className="text-dfxRed-100 uppercase">DFX Services</span>
                    <br />
                    with this easy <span className="text-dfxRed-100 uppercase">toolbox</span>
                  </Trans>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
                {tiles.map((t) => (
                  <TileComponent key={t.id} tile={t} onClick={handleNext} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="absolute bottom-0 w-full">
        <img src="https://content.dfx.swiss/img/v1/services/berge.png" className="w-full" />
      </div>
    </Layout>
  );
}

function TileComponent({ tile, onClick }: { tile: Tile; onClick: (t: Tile) => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <div
      className="relative aspect-square"
      style={{ borderRadius: '4%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
    >
      <img src={tile.img} className={tile.disabled ? 'opacity-60' : 'cursor-pointer'} onClick={() => onClick(tile)} />
      {tile.disabled && (
        <div
          className="absolute right-2 bottom-3 text-dfxBlue-800 font-extrabold rotate-180 uppercase"
          style={{ writingMode: 'vertical-rl', fontSize: 'min(2vw, 1rem)' }}
        >
          {translate('screens/home', 'Coming Soon')}
        </div>
      )}
    </div>
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

    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
      return <LedgerHint onConfirm={onConfirm} />;

    case WalletType.TREZOR:
      return <TrezorHint onConfirm={onConfirm} />;
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
          'You need to install the MetaMask or Rabby browser extension to be able to use this service.',
        )}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <MetaMaskLink /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function MetaMaskLink(): JSX.Element {
  return (
    <>
      <StyledLink label="metamask.io" url="https://metamask.io" dark /> /{' '}
      <StyledLink label="rabby.io" url="https://rabby.io/" dark />
    </>
  );
}

function AlbyHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Please install Alby!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'You need to install the Alby browser extension to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="getalby.com" url="https://getalby.com/" dark /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function LedgerHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Browser not supported!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please use a compatible browser (e.g. Chrome) to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="caniuse.com" url="https://caniuse.com/webhid" dark /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function TrezorHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Trezor Bridge not installed!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please install the Trezor Bridge to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="trezor.io" url="https://trezor.io/learn/a/what-is-trezor-bridge" dark /> for more
          details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function ConnectHint({
  type,
  error,
  onBack,
  onRetry,
}: {
  type: WalletType;
  error?: string;
  onBack: () => void;
  onRetry: () => void;
}): JSX.Element {
  const { translate } = useSettingsContext();

  switch (type) {
    case WalletType.META_MASK:
    case WalletType.ALBY:
      const confirmMessage =
        type === WalletType.META_MASK
          ? 'Please confirm the connection in your MetaMask.'
          : 'Please confirm the connection in the Alby browser extension.';

      return error ? (
        <>
          <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
          <p className="text-dfxRed-150">{translate('screens/home', error)}</p>

          <StyledButton
            className="mt-4"
            label={translate('general/actions', 'Back')}
            onClick={onBack}
            color={StyledButtonColor.GRAY_OUTLINE}
            width={StyledButtonWidth.MIN}
          />
        </>
      ) : (
        <>
          <div className="mb-4">
            <StyledLoadingSpinner size={SpinnerSize.LG} />
          </div>
          <p className="text-dfxGray-700">{translate('screens/home', confirmMessage)}</p>
        </>
      );

    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
      const app = type === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';
      const ledgerSteps = [
        'Connect your Ledger with your computer',
        'Open the {{app}} app on your Ledger',
        'Click on "Connect"',
        'Confirm "Sign message" on your ledger',
      ];

      return (
        <>
          <StyledVerticalStack gap={5} center>
            {error ? (
              <div>
                <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
                <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
              </div>
            ) : (
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            )}

            <ol className="text-dfxBlue-800 text-left font-bold list-decimal">
              {ledgerSteps.map((s, i) => (
                <li key={i} className="list-inside">
                  {translate('screens/home', s, { app })}
                </li>
              ))}
            </ol>

            <img
              src={`https://content.dfx.swiss/img/v1/services/ledger${app.toLowerCase()}ready_en.png`}
              className="w-full max-w-sm"
            />

            <StyledButton
              label={translate('general/actions', 'Connect')}
              onClick={onRetry}
              width={StyledButtonWidth.MIN}
              className="self-center"
            />
          </StyledVerticalStack>
        </>
      );

    case WalletType.TREZOR:
      const trezorSteps = [
        'Connect your Trezor with your computer',
        'Click on "Continue in Trezor Connect"',
        'Follow the steps in the Trezor Connect website',
        'Confirm "Sign message" on your Trezor',
      ];

      return (
        <>
          <StyledVerticalStack gap={5} center>
            {error ? (
              <div>
                <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
                <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
              </div>
            ) : (
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            )}

            <ol className="text-dfxBlue-800 text-left font-bold list-decimal">
              {trezorSteps.map((s, i) => (
                <li key={i} className="list-inside">
                  {translate('screens/home', s)}
                </li>
              ))}
            </ol>

            <img src="https://content.dfx.swiss/img/v1/services/trezorready_en.png" className="w-full max-w-sm" />

            <StyledButton
              label={translate('general/actions', 'Continue in Trezor Connect')}
              onClick={onRetry}
              width={StyledButtonWidth.MIN}
              className="self-center"
            />
          </StyledVerticalStack>
        </>
      );
  }
}
