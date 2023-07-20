import { PropsWithChildren, useEffect } from 'react';
import { AppPage } from '../contexts/app-handling.context';
import { useUrlParamHelper } from '../hooks/url-param-helper.hook';
import { GeneralLinks } from './general-links';
import { Navigation } from './navigation';

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
      <Navigation backTitle={backTitle} appPage={appPage} />

      <div
        className={`flex flex-grow flex-col items-center ${
          textStart ? 'text-start' : 'text-center'
        } px-5 py-2 mt-4 gap-2`}
      >
        {children}
      </div>

      <GeneralLinks />
    </>
  );
}
