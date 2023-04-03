import { PropsWithChildren } from 'react';
import { Navigation } from './navigation';
import { GeneralLinks } from './general-links';
import { NavigationBack } from './navigation-back';

interface LayoutProps extends PropsWithChildren {
  backTitle?: string;
  start?: boolean;
}

export function Layout({ backTitle, start, children }: LayoutProps): JSX.Element {
  return (
    <>
      <Navigation />
      {backTitle && <NavigationBack title={backTitle} />}
      <div
        className={`flex flex-col items-center ${start ? 'text-start' : 'text-center'} px-5 py-2 mt-4 min-h-container`}
      >
        {children}
      </div>
      <GeneralLinks />
    </>
  );
}
