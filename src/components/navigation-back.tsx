import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconColors, IconVariant, IconSizes } from '../stories/DfxIcon';

interface NavigationBackProps {
  title: string;
  home?: boolean;
}

export function NavigationBack({ title, home }: NavigationBackProps): JSX.Element {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="w-full h-12 bg-dfxGray-300 text-dfxBlue-800 font-bold text-lg flex flex-row items-center justify-center"
      onClick={() => (home ? navigate('/') : navigate(-1))}
    >
      <div className="absolute left-6">
        <DfxIcon icon={IconVariant.BACK} color={IconColors.BLUE} size={IconSizes.LG} />
      </div>
      {title}
    </button>
  );
}
