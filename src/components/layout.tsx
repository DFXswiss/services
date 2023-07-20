import { PropsWithChildren, useEffect } from 'react';
import { useUrlParamHelper } from '../hooks/url-param-helper.hook';
import { GeneralLinks } from './general-links';
import { Navigation } from './navigation';

interface LayoutProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
  textStart?: boolean;
}

export function Layout({ title, backButton, textStart, children }: LayoutProps): JSX.Element {
  const { readParamsAndReload } = useUrlParamHelper();

  useEffect(() => {
    readParamsAndReload();
  }, [readParamsAndReload]);

  return (
    <>
      <Navigation title={title} backButton={backButton} />

      <div
        className={`max-w-screen-md flex flex-grow flex-col items-center ${
          textStart ? 'text-start' : 'text-center'
        } px-5 py-2 mt-4 gap-2`}
      >
        {children}
      </div>

      <GeneralLinks />
    </>
  );
}
