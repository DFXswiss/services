import { PropsWithChildren } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { GeneralLinks } from './general-links';
import { Navigation } from './navigation';

interface LayoutProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
  textStart?: boolean;
}

export function Layout({ title, backButton, textStart, children }: LayoutProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { isEmbedded } = useAppHandlingContext();

  return (
    <div className="h-full flex flex-col">
      <Navigation title={title} backButton={backButton} />

      <div className="overflow-auto">
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

      {!isEmbedded && <GeneralLinks />}
    </div>
  );
}
