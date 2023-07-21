import { DfxIcon, IconColor, IconSize, IconVariant } from '@dfx.swiss/react-components';
import { useNavigate } from 'react-router-dom';
import { AppPage, IframeMessageType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useIframe } from '../hooks/iframe.hook';

interface NavigationBackProps {
  title: string;
  home?: boolean;
  appPage?: AppPage;
}

export function NavigationBack({ title, home, appPage }: NavigationBackProps): JSX.Element {
  const { closeServices } = useAppHandlingContext();
  const navigate = useNavigate();

  const { isUsedByIframe, sendMessage } = useIframe();

  function onClick() {
    appPage ? closeServices({ page: appPage }) : home ? navigate('/') : navigate(-1);

    if (isUsedByIframe) {
      sendMessage({ type: IframeMessageType.NAVIGATION });
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
