import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Suspense, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { ConnectWrapper } from '../components/home/connect-wrapper';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { Tile, Wallet, isWallet, useFeatureTree } from '../hooks/feature-tree.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useResizeObserver } from '../hooks/resize-observer.hook';
import { useStore } from '../hooks/store.hook';
import { Stack } from '../util/stack';

export function HomeScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isLoggedIn, isProcessing, logout } = useSessionContext();
  const { isUserLoading, user } = useUserContext();
  const { isEmbedded, redirectPath, setRedirectPath } = useAppHandlingContext();
  const { isInitialized, login, switchBlockchain, activeWallet } = useWalletContext();
  const { showsSignatureInfo } = useStore();
  const { navigate } = useNavigation();
  const { getPage, getWallet, setOptions } = useFeatureTree();
  const appParams = useAppParams();

  // const [isConnecting, setIsConnecting] = useState(false);
  const [connectTo, setConnectTo] = useState<Wallet>();
  const [loginSuccessful, setLoginSuccessful] = useState(false);
  // const [connectError, setConnectError] = useState<string>();
  // const [showInstallHint, setShowInstallHint] = useState<WalletType>();
  // const [createSignHint, signHint] = useDeferredPromise<void>();
  // const [showSignHint, setShowSignHint] = useState(false);
  // const [createPairing, pairing] = useDeferredPromise<void>();
  // const [pairingCode, setPairingCode] = useState<string>();
  const [pages, setPages] = useState(new Stack<{ page: string; allowedTiles: string[] | undefined }>());

  // const autoConnectWallets = [WalletType.META_MASK, WalletType.ALBY, WalletType.WALLET_CONNECT];

  const currentPageId = pages.current?.page;
  const allowedTiles = pages.current?.allowedTiles;
  const currentPage = getPage(currentPageId, allowedTiles);

  useEffect(() => {
    if (isInitialized && isLoggedIn && user && (!activeWallet || loginSuccessful)) {
      start(user.kycDataComplete);
    }
  }, [isInitialized, isLoggedIn, user, activeWallet, loginSuccessful]);

  useEffect(() => {
    const { mode } = appParams;
    mode && setPages((p) => p.push({ page: mode, allowedTiles: undefined }));
  }, [appParams.mode]);

  // signature hint
  // async function confirmSignHint(): Promise<void> {
  //   if (!showsSignatureInfo.get()) return;

  //   setShowSignHint(true);
  //   return createSignHint();
  // }

  // function signHintConfirmed(hide: boolean) {
  //   showsSignatureInfo.set(!hide);
  //   setShowSignHint(false);
  //   signHint?.resolve();
  // }

  // function signHintRejected() {
  //   setShowSignHint(false);
  //   signHint?.reject(new AbortError('User cancelled'));
  // }

  // function onHintConfirmed() {
  //   setShowInstallHint(undefined);
  //   setConnectTo(undefined);
  // }

  // pairing
  // async function confirmPairing(code: string): Promise<void> {
  //   setPairingCode(code);
  //   return createPairing();
  // }

  // function pairingConfirmed() {
  //   pairing?.resolve();
  //   setPairingCode(undefined);
  // }

  // function pairingRejected() {
  //   setPairingCode(undefined);
  //   pairing?.reject(new AbortError('User cancelled'));
  // }

  // tile handling
  function handleNext(tile: Tile) {
    if (isWallet(tile)) {
      const wallet = getWallet(tile, appParams);
      setConnectTo(wallet);

      // if (autoConnectWallets.includes(wallet.type) || activeWallet === wallet.type) connectWallet(wallet);
    } else if (tile.next) {
      if (tile.next.options) setOptions(tile.next.options);
      const page = { page: tile.next.page, allowedTiles: tile.next.tiles };
      setPages((p) => p.push(page));

      const tiles = getPage(page.page, page.allowedTiles)?.tiles;
      if (tiles?.length === 1 && tiles[0].next) handleNext(tiles[0]);
    }
  }

  function handleBack() {
    // if (showInstallHint) {
    //   onHintConfirmed();
    // } else if (showSignHint) {
    //   signHintRejected();
    // } else if (pairingCode) {
    //   pairingRejected();
    //   setIsConnecting(false);
    /*} else*/ if (connectTo) {
      // setConnectError(undefined);
      // setIsConnecting(false);
      setConnectTo(undefined);
    } else {
      setPages((p) => p.pop((i) => getPage(i.page, i.allowedTiles)?.tiles?.length === 1));
    }
  }

  // function handleStart(address?: string, signature?: string) {
  //   connectTo && connectWallet(connectTo, address, signature);
  // }

  // // connect
  // async function connectWallet(wallet: Wallet, address?: string, signature?: string) {
  //   connect(wallet, address, signature)
  //     .then(() => setPages(new Stack()))
  //     .catch(console.error);
  // }

  // async function connect(wallet: Wallet, address?: string, signature?: string) {
  //   // TODO: move install check to connect component
  //   const installedWallets = await getInstalledWallets();
  //   if (installedWallets.some((w) => w === wallet.type)) {
  //     setIsConnecting(true);
  //     setConnectError(undefined);

  //     return doLogin(wallet.type, wallet.blockchain, address, signature)
  //       .then(() => setLoginSuccessful(true))
  //       .catch((e) => {
  //         if (e instanceof AbortError) {
  //           setConnectTo(undefined);
  //         } else {
  //           setConnectError(e.message);
  //         }

  //         throw e;
  //       })
  //       .finally(() => {
  //         setIsConnecting(false);
  //         setPairingCode(undefined);
  //       });
  //   } else {
  //     setShowInstallHint(wallet.type);
  //     throw new Error('Wallet not installed');
  //   }
  // }

  // async function doLogin(wallet: WalletType, blockchain?: Blockchain, address?: string, signature?: string) {
  //   const selectedChain = blockchain ?? (appParams.blockchain as Blockchain);

  //   // TODO: remove the signature parameter (set in signMessage callback)
  //   return activeWallet === wallet
  //     ? selectedChain && switchBlockchain(selectedChain)
  //     : logout().then(() => login(wallet, confirmSignHint, confirmPairing, selectedChain, address, signature));
  // }

  function start(kycComplete: boolean) {
    const path = redirectPath ?? '/buy';
    const targetPath = path.includes('sell') && !kycComplete ? '/profile' : path;
    setRedirectPath(targetPath != path ? path : undefined);
    navigate(targetPath);
  }

  const title = translate('screens/home', currentPage?.header ?? (currentPage?.dfxStyle ? 'DFX services' : ' '));
  const image =
    currentPage?.bottomImage ??
    (currentPage?.dfxStyle ? 'https://content.dfx.swiss/img/v1/services/berge.png' : undefined);

  return (
    <Layout
      title={isEmbedded ? title : undefined}
      backButton={currentPageId != null && currentPageId !== appParams.mode}
      onBack={currentPageId ? handleBack : undefined}
    >
      {isProcessing || isUserLoading || !currentPage ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <div className="z-1 flex flex-grow flex-col items-center w-full">
          {
            /*showInstallHint ? (
            <InstallHint type={showInstallHint} onConfirm={onHintConfirmed} />
          ) : showSignHint ? (
            <SignHint onConfirm={signHintConfirmed} />
          )  :*/ connectTo ? (
              // TODO: proper loading
              <Suspense fallback={<div>Loading...</div>}>
                <ConnectWrapper
                  wallet={connectTo.type}
                  onLogin={() => setLoginSuccessful(true)}
                  onCancel={() => setConnectTo(undefined)}
                />
              </Suspense>
            ) : (
              // <ConnectHint
              //   type={connectTo.type}
              //   isLoading={isConnecting}
              //   error={connectError}
              //   pairingCode={pairingCode}
              //   onPairingConfirmed={pairingConfirmed}
              //   onStart={handleStart}
              //   onBack={handleBack}
              // />
              <>
                <div className="flex self-start mb-6">
                  {currentPage.description ? (
                    <div className="text-xl text-dfxBlue-800 font-extrabold text-left">
                      {translate('screens/home', currentPage.description)}
                    </div>
                  ) : (
                    currentPage.dfxStyle && (
                      <>
                        <div className="bg-dfxRed-100" style={{ width: '11px', marginRight: '12px' }}></div>
                        <div className="text-xl text-dfxBlue-800 font-extrabold text-left">
                          <Trans i18nKey={'screens/home.title'}>
                            Access all <span className="text-dfxRed-100 uppercase">DFX Services</span>
                            <br />
                            with this easy <span className="text-dfxRed-100 uppercase">toolbox</span>
                          </Trans>
                        </div>
                      </>
                    )
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
                  {currentPage.tiles.map((t) => (
                    <TileComponent key={t.id} tile={t} onClick={handleNext} />
                  ))}
                </div>
              </>
            )
          }
        </div>
      )}
      {image && (
        <div className="absolute bottom-0 w-full">
          <img src={image} className="w-full" />
        </div>
      )}
    </Layout>
  );
}

function TileComponent({ tile, onClick }: { tile: Tile; onClick: (t: Tile) => void }): JSX.Element {
  const { translate } = useSettingsContext();
  const tileRef = useResizeObserver<HTMLDivElement>((el) => setSize(el.offsetHeight));

  const [size, setSize] = useState<number>();

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
