import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconColors, IconVariant, IconSizes } from '../stories/DfxIcon';
import { AppPage, useAppHandlingContext } from '../contexts/app-handling.context';
import { useQuery } from '../hooks/query.hook';

interface NavigationBackProps {
  title: string;
  home?: boolean;
  appPage?: AppPage;
}

export function NavigationBack({ title, home, appPage }: NavigationBackProps): JSX.Element {
  const { buildPath } = useQuery();
  const { openAppPage } = useAppHandlingContext();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row items-center justify-center"
      onClick={() => (appPage ? openAppPage(appPage) : home ? navigate(buildPath('/')) : navigate(-1))}
    >
      {!appPage && (
        <div className="absolute left-6">
          <DfxIcon icon={IconVariant.BACK} color={IconColors.BLUE} size={IconSizes.LG} />
        </div>
      )}
      {title}
    </button>
  );
}
