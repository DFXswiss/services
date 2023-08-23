import { PropsWithChildren, Ref } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { Navigation } from './navigation';

interface LayoutProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
  onBack?: () => void;
  textStart?: boolean;
  scrollRef?: Ref<HTMLDivElement>;
}

export function Layout({ title, backButton, onBack, textStart, children, scrollRef }: LayoutProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { isEmbedded } = useAppHandlingContext();

  return (
    <div id="app-root" className="h-full flex flex-col">
      <Navigation title={title} backButton={backButton} onBack={onBack} />

      <div className="flex flex-col flex-grow overflow-auto" ref={scrollRef}>
        <div className="flex flex-grow justify-center">
          <div
            className={`max-w-screen-md flex flex-grow flex-col items-center ${
              textStart ? 'text-start' : 'text-center'
            } px-5 py-2 mt-4 gap-2`}
          >
            {children}
          </div>
        </div>

        {isEmbedded && (
          <p className="p-2 text-center text-dfxGray-700">{translate('navigation/links', 'Powered by DFX')}</p>
        )}
      </div>
    </div>
  );
}
