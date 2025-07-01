import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutConfigProvider, useLayoutConfigContext } from '../contexts/layout-config.context';
import { LayoutContextProvider } from '../contexts/layout.context';
import { Layout } from './layout';

function LayoutWithOutlet(): JSX.Element {
  const { config } = useLayoutConfigContext();
  
  return (
    <Layout {...config}>
      <Outlet />
    </Layout>
  );
}

export function LayoutWrapper(): JSX.Element {
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <LayoutContextProvider modalRootRef={modalRootRef} scrollRef={scrollRef} rootRef={rootRef}>
      <LayoutConfigProvider>
        <LayoutWithOutlet />
      </LayoutConfigProvider>
    </LayoutContextProvider>
  );
}