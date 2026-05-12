import { ReactNode, useRef } from 'react';
import type { Preview } from '@storybook/react';
import { LayoutContextProvider } from '../src/contexts/layout.context';
import '../src/index.css';

// The Modal component reads `topOffset` from `modalRootRef.getBoundingClientRect().top`
// to leave room for the app's layout header. To make stories render the same way
// the deployed app does, the decorator provides:
//   - a visible header surrogate (scrollRef-tagged div, 64 px tall) at the top of
//     the host so screenshots include the blue band the app shows above any modal,
//   - a measurable modalRootRef anchor placed immediately below the header so its
//     bounding rect resolves to y = 64 in time for Modal's useEffect.
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
