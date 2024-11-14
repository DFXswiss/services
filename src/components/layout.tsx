import { PropsWithChildren, Ref, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useServiceWorker } from 'src/hooks/service-worker.hook';
import { Routes } from '../App';
import { useAppParams } from '../hooks/app-params.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useSift } from '../hooks/sift.hook';
import { isNode } from '../util/utils';
import { InfoBannerComponent } from './info-banner';
import { Navigation } from './navigation';

interface LayoutProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
  onBack?: () => void;
  textStart?: boolean;
  rootRef?: Ref<HTMLDivElement>;
  scrollRef?: Ref<HTMLDivElement>;
  noPadding?: boolean;
  smallMenu?: boolean;
}

export function Layout({
  title,
  backButton,
  onBack,
  textStart,
  children,
  rootRef,
  scrollRef,
  noPadding,
  smallMenu,
}: LayoutProps): JSX.Element {
  useSift();

  const navRef = useRef<HTMLDivElement>(null);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { pathname } = useLocation();
  const { clearParams } = useNavigation();
  const { borderless } = useAppParams();
  const { showReload, reloadPage } = useServiceWorker();

  useEffect(() => {
    if (showReload) reloadPage();
  }, [showReload]);

  useEffect(() => {
    const kycRoutes = Routes.filter((r) => r.isKycScreen);
    if (!kycRoutes.some((r) => pathname === r.path)) clearParams(['code']);
  }, [pathname]);

  function onClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (isNavigationOpen && isNode(e.target) && navRef.current && !navRef.current.contains(e.target)) {
      setIsNavigationOpen(false);
    }
  }

  return (
    <div id="app-root" className="h-full flex flex-col" ref={rootRef} onClick={onClick}>
      {pathname.startsWith('/support') && (
        <div className="relative">
          <InfoBannerComponent />
        </div>
      )}

      <Navigation
        ref={navRef}
        title={title}
        backButton={backButton}
        onBack={onBack}
        isOpen={isNavigationOpen}
        setIsOpen={setIsNavigationOpen}
        small={smallMenu}
      />

      <div className="flex flex-col flex-grow overflow-auto" ref={scrollRef}>
        <div className="flex flex-grow justify-center">
          <div
            className={`relative w-full max-w-screen-md flex flex-grow flex-col items-center ${
              textStart ? 'text-start' : 'text-center'
            } ${!(noPadding || borderless) && 'p-5'} gap-2`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
