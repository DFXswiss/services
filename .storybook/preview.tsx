import { ReactNode, useRef } from 'react';
import type { Preview } from '@storybook/react';
import { LayoutContextProvider } from '../src/contexts/layout.context';
import '../src/index.css';

function StorybookLayoutHost({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={rootRef} className="min-h-screen w-full">
      <div ref={scrollRef} className="h-16 w-full bg-dfxBlue-800" />
      <div ref={modalRootRef} />
      <LayoutContextProvider rootRef={rootRef} modalRootRef={modalRootRef} scrollRef={scrollRef}>
        {children}
      </LayoutContextProvider>
    </div>
  );
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <StorybookLayoutHost>
        <Story />
      </StorybookLayoutHost>
    ),
  ],
};

export default preview;
