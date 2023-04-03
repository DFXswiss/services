import { PropsWithChildren } from 'react';
import { Navigation } from './navigation';
import { GeneralLinks } from './general-links';

export function Layout(props: PropsWithChildren): JSX.Element {
  return (
    <>
      <Navigation />
      <div className="flex flex-col items-center text-center px-8 py-2 mt-4 h-container">{props.children}</div>
      <GeneralLinks />
    </>
  );
}
