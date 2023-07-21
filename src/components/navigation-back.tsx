import { DfxIcon, IconColor, IconSize, IconVariant } from '@dfx.swiss/react-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppPage, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';

interface NavigationBackProps {
  title: string;
  appPage?: AppPage;
}

export function NavigationBack({ title, appPage }: NavigationBackProps): JSX.Element {
  const { homePath } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const location = useLocation();
  const navigate = useNavigate();

  function onClick() {
    if (homePath === location.pathname) {
      closeServices({ page: appPage });
    } else {
      navigate(-1);
    }
  }

  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row flex-shrink-0 items-center justify-center"
      onClick={() => onClick()}
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
