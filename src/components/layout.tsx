import { PropsWithChildren, Ref, useRef, useState } from 'react';
import { useAppParams } from '../hooks/app-params.hook';
import { isNode } from '../util/utils';
import { Navigation } from './navigation';

interface LayoutProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
  onBack?: () => void;
  textStart?: boolean;
  rootRef?: Ref<HTMLDivElement>;
  scrollRef?: Ref<HTMLDivElement>;
  noPadding?: boolean;
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
}: LayoutProps): JSX.Element {
  const navRef = useRef<HTMLDivElement>(null);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { headless } = useAppParams();

  function onClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (isNavigationOpen && isNode(e.target) && navRef.current && !navRef.current.contains(e.target)) {
      setIsNavigationOpen(false);
    }
  }

  return (
    <div id="app-root" className="h-full flex flex-col" ref={rootRef} onClick={onClick}>
      {!headless && (
        <Navigation
          ref={navRef}
          title={title}
          backButton={backButton}
          onBack={onBack}
          isOpen={isNavigationOpen}
          setIsOpen={setIsNavigationOpen}
        />
      )}

      <div className="flex flex-col flex-grow overflow-auto" ref={scrollRef}>
        <div className="flex flex-grow justify-center">
          <div
            className={`relative w-full max-w-screen-md flex flex-grow flex-col items-center ${
              textStart ? 'text-start' : 'text-center'
            } ${!noPadding && 'p-5'} gap-2`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
