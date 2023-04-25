import { PropsWithChildren, useEffect } from 'react';
import { Navigation } from './navigation';
import { GeneralLinks } from './general-links';
import { NavigationBack } from './navigation-back';
import { useUrlParamHelper } from '../hooks/url-param-helper.hook';
import { AppPage } from '../contexts/app-handling.context';

interface LayoutProps extends PropsWithChildren {
  backTitle?: string;
  textStart?: boolean;
  appPage?: AppPage;
}

export function Layout({ backTitle, textStart, appPage, children }: LayoutProps): JSX.Element {
  const { readParamsAndReload } = useUrlParamHelper();

  useEffect(() => {
    readParamsAndReload();
  }, [readParamsAndReload]);

  return (
    <>
      <Navigation />
      {backTitle && <NavigationBack title={backTitle} appPage={appPage} />}
      <div
        className={`flex flex-col items-center ${
          textStart ? 'text-start' : 'text-center'
        } px-5 py-2 mt-4 min-h-container gap-2`}
      >
        {children}
      </div>
      <GeneralLinks />
    </>
  );
}
