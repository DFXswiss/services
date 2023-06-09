import { useNavigate } from 'react-router-dom';
import { AppPage, useAppHandlingContext } from '../contexts/app-handling.context';
import { DfxIcon, IconVariant, IconColor, IconSize } from '@dfx.swiss/react-components';

interface NavigationBackProps {
  title: string;
  home?: boolean;
  appPage?: AppPage;
}

export function NavigationBack({ title, home, appPage }: NavigationBackProps): JSX.Element {
  const { openAppPage } = useAppHandlingContext();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row flex-shrink-0 items-center justify-center"
      onClick={() => (appPage ? openAppPage(appPage) : home ? navigate('/') : navigate(-1))}
    >
      {!appPage && (
        <div className="absolute left-6">
          <DfxIcon icon={IconVariant.BACK} color={IconColor.BLUE} size={IconSize.LG} />
        </div>
      )}
      {title}
    </button>
  );
}
