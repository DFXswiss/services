import { ReactNode, useRef } from 'react';
import type { Preview } from '@storybook/react';
import { LayoutContextProvider } from '../src/contexts/layout.context';
import '../src/index.css';

// Mirrors the app's layout: a 64 px header surrogate above the modal anchor so
// Modal's `topOffset` resolves to 64 and snapshots include the visible header.
function StorybookLayoutHost({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={rootRef} className="min-h-screen w-full bg-white">
      <div
        ref={scrollRef}
        className="h-16 w-full bg-dfxBlue-800 flex items-center px-4 text-sm font-medium text-white"
      >
        DFX Services
      </div>
      <div ref={modalRootRef} className="relative" data-testid="modal-root-anchor" />
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
