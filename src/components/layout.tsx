import { PropsWithChildren, useEffect } from 'react';
import { Navigation } from './navigation';
import { GeneralLinks } from './general-links';
import { NavigationBack } from './navigation-back';
import { useSessionHelper } from '../hooks/session-helper.hook';

interface LayoutProps extends PropsWithChildren {
  backTitle?: string;
  start?: boolean;
  backToApp?: boolean;
}

export function Layout({ backTitle, start, backToApp, children }: LayoutProps): JSX.Element {
  const { updateIfAvailable } = useSessionHelper();

  useEffect(() => {
    updateIfAvailable();
  }, [updateIfAvailable]);

  return (
    <>
      <Navigation />
      {backTitle && <NavigationBack title={backTitle} backToApp={backToApp} />}
      <div
        className={`flex flex-col items-center ${start ? 'text-start' : 'text-center'} px-5 py-2 mt-4 min-h-container`}
      >
        {children}
      </div>
      <GeneralLinks />
    </>
  );
}
