import { DfxIcon, IconColor, IconSize, IconVariant } from '@dfx.swiss/react-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';

interface NavigationBackProps {
  title?: string;
  backButton?: boolean;
}

export function NavigationBack({ title, backButton = true }: NavigationBackProps): JSX.Element {
  const { homePath } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const location = useLocation();
  const navigate = useNavigate();

  function onClick() {
    if (homePath === location.pathname) {
      closeServices({ type: CloseType.CANCEL });
    } else {
      navigate(-1);
    }
  }

  return title ? (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row flex-shrink-0 items-center justify-center"
      onClick={() => onClick()}
      disabled={!backButton}
    >
      {backButton && (
        <div className="absolute left-6">
          <DfxIcon icon={IconVariant.BACK} color={IconColor.BLUE} size={IconSize.LG} />
        </div>
      )}
      {title}
    </button>
  ) : (
    <></>
  );
}
