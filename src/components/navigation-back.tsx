import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconColors, IconVariant, IconSizes } from '../stories/DfxIcon';

interface NavigationBackProps {
  title: string;
  home?: boolean;
  backToApp?: boolean;
}

export function NavigationBack({ title, home, backToApp }: NavigationBackProps): JSX.Element {
  const navigate = useNavigate();

  function handleBackToApp() {
    console.log('TODO back to app');
  }

  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row items-center justify-center"
      onClick={() => (backToApp ? handleBackToApp() : home ? navigate('/') : navigate(-1))}
    >
      {!backToApp && (
        <div className="absolute left-6">
          <DfxIcon icon={IconVariant.BACK} color={IconColors.BLUE} size={IconSizes.LG} />
        </div>
      )}
      {title}
    </button>
  );
}
