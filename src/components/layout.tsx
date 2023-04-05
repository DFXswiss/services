import { PropsWithChildren, useEffect } from 'react';
import { Navigation } from './navigation';
import { GeneralLinks } from './general-links';
import { NavigationBack } from './navigation-back';
import { useUrlParamHelper } from '../hooks/url-param-helper.hook';

interface LayoutProps extends PropsWithChildren {
  backTitle?: string;
  textStart?: boolean;
  isBackToApp?: boolean;
}

export function Layout({ backTitle, textStart, isBackToApp, children }: LayoutProps): JSX.Element {
  const { readParamsAndReload } = useUrlParamHelper();

  useEffect(() => {
    readParamsAndReload();
  }, [readParamsAndReload]);

  return (
    <>
      <Navigation />
      {backTitle && <NavigationBack title={backTitle} isBackToApp={isBackToApp} />}
      <div
        className={`flex flex-col items-center ${
          textStart ? 'text-start' : 'text-center'
        } px-5 py-2 mt-4 min-h-container`}
      >
        {children}
      </div>
      <GeneralLinks />
    </>
  );
}
