import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconColors, IconVariant, IconSizes } from '../stories/DfxIcon';
import { useAppHandlingContext } from '../contexts/app-handling.context';

interface NavigationBackProps {
  title: string;
  home?: boolean;
  isBackToApp?: boolean;
}

export function NavigationBack({ title, home, isBackToApp }: NavigationBackProps): JSX.Element {
  const { backToApp } = useAppHandlingContext();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row items-center justify-center"
      onClick={() => (isBackToApp ? backToApp() : home ? navigate('/') : navigate(-1))}
    >
      {!isBackToApp && (
        <div className="absolute left-6">
          <DfxIcon icon={IconVariant.BACK} color={IconColors.BLUE} size={IconSizes.LG} />
        </div>
      )}
      {title}
    </button>
  );
}
