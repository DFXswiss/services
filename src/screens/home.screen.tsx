import { Blockchain, useSessionContext, useUserContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCheckboxRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ConnectHint } from '../components/home/connect-hint';
import { InstallHint } from '../components/home/install-hint';
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
  const { showsSignatureInfo } = useStore();
  const { navigate } = useNavigation();
  const { search } = useLocation();
  const { getTiles, getWallet, setOptions } = useFeatureTree();
  const appParams = useAppParams();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectTo, setConnectTo] = useState<Wallet>();
  const [connectError, setConnectError] = useState<string>();
  const [showInstallHint, setShowInstallHint] = useState<WalletType>();
  const [createSignHint, signHint] = useDeferredPromise<void>();
  const [showSignHint, setShowSignHint] = useState(false);
  const [createPairing, pairing] = useDeferredPromise<void>();
  const [pairingCode, setPairingCode] = useState<string>();
  const [pages, setPages] = useState(new Stack<{ page: string; allowedTiles: string[] | undefined }>());

  const autoConnectWallets = [WalletType.META_MASK, WalletType.ALBY];

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
    return createSignHint();
  }

  function signHintConfirmed(hide: boolean) {
    showsSignatureInfo.set(!hide);
    setShowSignHint(false);
    signHint?.resolve();
  }

  function signHintRejected() {
    setShowSignHint(false);
    signHint?.reject(new AbortError('User cancelled'));
  }

  function onHintConfirmed() {
    setShowInstallHint(undefined);
  }

  // pairing
  async function confirmPairing(code: string): Promise<void> {
    setPairingCode(code);
    return createPairing();
  }

  function pairingConfirmed() {
    pairing?.resolve();
    setPairingCode(undefined);
  }

  function pairingRejected() {
    setPairingCode(undefined);
    pairing?.reject(new AbortError('User cancelled'));
  }

  // tile handling
  function handleNext(tile: Tile) {
    if (isWallet(tile)) {
      const wallet = getWallet(tile, appParams);
      setConnectTo(wallet);

      if (autoConnectWallets.includes(wallet.type) || activeWallet === wallet.type) connectWallet(wallet);
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
    } else if (pairingCode) {
      pairingRejected();
      setIsConnecting(false);
    } else if (connectTo) {
      setConnectError(undefined);
      setIsConnecting(false);
      setConnectTo(undefined);
    } else {
      setPages((p) => p.pop((i) => getTiles(i.page, i.allowedTiles)?.length === 1));
    }
  }

  function handleRetry() {
    connectTo && connectWallet(connectTo);
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
      setIsConnecting(true);
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
            setConnectTo(undefined);
          } else {
            setConnectError(e.message);
          }

          throw e;
        })
        .finally(() => {
          setIsConnecting(false);
          setPairingCode(undefined);
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
      : logout().then(() => login(wallet, confirmSignHint, confirmPairing, selectedChain, address));
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
          ) : connectTo ? (
            <ConnectHint
              type={connectTo.type}
              isLoading={isConnecting}
              error={connectError}
              pairingCode={pairingCode}
              onPairingConfirmed={pairingConfirmed}
              onBack={handleBack}
              onRetry={handleRetry}
            />
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
  const tileRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<number>();

  function setTileSize() {
    setSize(tileRef.current?.offsetHeight);
  }

  useEffect(setTileSize, [tileRef.current]);

  window.addEventListener('resize', setTileSize);

  return (
    <div
      ref={tileRef}
      className="relative aspect-square"
      style={{ borderRadius: '4%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
    >
      <img src={tile.img} className={tile.disabled ? 'opacity-60' : 'cursor-pointer'} onClick={() => onClick(tile)} />
      {tile.disabled && (
        <div
          className="absolute right-2 bottom-3 text-dfxBlue-800 font-extrabold rotate-180 uppercase"
          style={{ writingMode: 'vertical-rl', fontSize: `${(size ?? 0) / 20}px` }}
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
