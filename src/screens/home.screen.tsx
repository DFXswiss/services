import { Blockchain, useAuthContext, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Service } from '../App';
import { ConnectWrapper } from '../components/home/connect-wrapper';
import { Layout } from '../components/layout';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { supportsBlockchain, useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { Tile, Wallet, isWallet, useFeatureTree } from '../hooks/feature-tree.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useResizeObserver } from '../hooks/resize-observer.hook';
import { Stack } from '../util/stack';

enum SpecialMode {
  LOGIN = 'Login',
  CONNECT = 'Connect',
  MY_DFX = 'MyDfx',
}

const SpecialModes: { [m in SpecialMode]: string } = {
  [SpecialMode.LOGIN]: 'login',
  [SpecialMode.CONNECT]: 'wallets',
  [SpecialMode.MY_DFX]: 'wallets',
};

function getMode(pathName: string): SpecialMode | undefined {
  switch (pathName) {
    case '/my-dfx':
      return SpecialMode.MY_DFX;
    case '/login':
      return SpecialMode.LOGIN;
    case '/connect':
      return SpecialMode.CONNECT;
    default:
      return undefined;
  }
}

type Page = { page: string; allowedTiles: string[] | undefined };

export default function HomeScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { session, authenticationToken } = useAuthContext();
  const { user, isUserLoading } = useUserContext();
  const { hasSession, canClose, service, isEmbedded, redirectPath, closeServices } = useAppHandlingContext();
  const { isInitialized, activeWallet } = useWalletContext();
  const { navigate } = useNavigation();
  const { pathname } = useLocation();
  const { getPage, getWallet, setOptions } = useFeatureTree();
  const appParams = useAppParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const [connectTo, setConnectTo] = useState<Wallet>();
  const [loginSuccessful, setLoginSuccessful] = useState(false);
  const [pages, setPages] = useState(new Stack<Page>());

  const currentPageId = pages.current?.page;
  const allowedTiles = pages.current?.allowedTiles;
  const currentPage = getPage(currentPageId, allowedTiles);

  const selectedBlockchain = (connectTo?.blockchain ?? appParams.blockchain) as Blockchain | undefined;
  const specialMode = getMode(pathname);

  useEffect(() => {
    if (isInitialized && isLoggedIn && user && loginSuccessful) {
      if (service === Service.CONNECT) {
        close();
      } else {
        start();
      }
    }
  }, [isInitialized, isLoggedIn, user, activeWallet, loginSuccessful, hasSession]);

  useEffect(() => {
    const mode = specialMode ? SpecialModes[specialMode] : appParams.mode;
    const stack = mode ? new Stack([{ page: mode, allowedTiles: undefined }]) : new Stack<Page>();
    setPages(stack);
  }, [appParams.mode, appParams.wallets, specialMode]);

  // tile handling
  function handleNext(tile: Tile) {
    if (isWallet(tile)) {
      const wallet = getWallet(tile, appParams);
      setConnectTo(wallet);
    } else if (tile.next) {
      if (tile.next.options) setOptions(tile.next.options);
      const page = { page: tile.next.page, allowedTiles: tile.next.tiles };
      setPages((p) => p.push(page));

      const tiles = getPage(page.page, page.allowedTiles)?.tiles;
      if (tiles?.length === 1 && tiles[0].next) handleNext(tiles[0]);
    }
  }

  function handleBack() {
    if (connectTo) {
      setConnectTo(undefined);
    } else {
      setPages((p) => p.pop((i) => getPage(i.page, i.allowedTiles)?.tiles?.length === 1));
    }
  }

  function start() {
    switch (specialMode) {
      case SpecialMode.MY_DFX:
        const url = `${process.env.REACT_APP_PAY_URL}login?token=${authenticationToken}`;
        authenticationToken && session?.address && window.open(url, '_self');
        break;

      // @ts-expect-error fall through to default option
      case SpecialMode.LOGIN:
        navigate('/');

      default:
        const path = redirectPath ?? (session?.address ? '/account' : undefined);
        path && navigate(path);
        break;
    }
  }

  function close() {
    setConnectTo(undefined);
    closeServices({ type: CloseType.CANCEL, isComplete: true }, true);
  }

  const title = translate('screens/home', currentPage?.header ?? (currentPage?.dfxStyle ? 'DFX services' : ' '));
  const image =
    currentPage?.bottomImage ??
    (currentPage?.dfxStyle ? 'https://content.dfx.swiss/img/v1/services/berge.jpg' : undefined);

  const hasBackButton =
    (canClose && !isEmbedded) || connectTo != null || (currentPageId != null && currentPageId !== appParams.mode);

  return (
    <Layout
      title={isEmbedded ? title : undefined}
      backButton={hasBackButton}
      onBack={connectTo || currentPageId ? handleBack : undefined}
      rootRef={rootRef}
    >
      {!isInitialized || isUserLoading || !currentPage ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <div className="z-1 flex flex-grow flex-col items-center w-full">
          {connectTo ? (
            <Suspense fallback={<StyledLoadingSpinner size={SpinnerSize.LG} />}>
              <ConnectWrapper
                rootRef={rootRef}
                wallet={connectTo.type}
                blockchain={selectedBlockchain}
                onLogin={() => setLoginSuccessful(true)}
                onCancel={() => setConnectTo(undefined)}
                onSwitch={(type) => setConnectTo((c) => ({ ...c, type }))}
              />
            </Suspense>
          ) : (
            <>
              <div className="flex self-start mb-6">
                {currentPage.description ? (
                  <div className="text-xl text-dfxBlue-800 font-extrabold text-left">
                    {translate('screens/home', currentPage.description)}
                  </div>
                ) : (
                  currentPage.dfxStyle && (
                    <>
                      <div className="bg-dfxRed-100 w-[11px] mr-[12px]"></div>
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
                {currentPage.tiles
                  .filter(
                    (t) =>
                      !isWallet(t) ||
                      !(
                        (appParams.mode &&
                          appParams.blockchain &&
                          !supportsBlockchain(getWallet(t, appParams).type, appParams.blockchain as Blockchain)) ||
                        (appParams.wallets && !appParams.wallets.split(',').includes(getWallet(t, appParams).type))
                      ),
                  )
                  .map((t) => (
                    <TileComponent key={t.id} tile={t} onClick={handleNext} />
                  ))}
              </div>
            </>
          )}
        </div>
      )}
      {!connectTo && image && (
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
      className="relative aspect-square overflow-hidden"
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
