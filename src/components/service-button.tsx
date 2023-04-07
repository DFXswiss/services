import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconColors, IconVariant } from '../stories/DfxIcon';

export enum ServiceButtonType {
  BUY = 'Buy',
  SELL = 'Sell',
  CONVERT = 'Convert',
}

interface ServiceButtonProps {
  type: ServiceButtonType;
  url: string;
  disabled?: boolean;
}

export function ServiceButton({ type, url, disabled }: ServiceButtonProps): JSX.Element {
  const navigate = useNavigate();

  const iconDefinitions: Record<ServiceButtonType, (color: IconColors) => JSX.Element> = {
    [ServiceButtonType.BUY]: (color: IconColors) => (
      <>
        <DfxIcon icon={IconVariant.BANK} color={color} />
        <DfxIcon icon={IconVariant.ARROW_RIGHT} color={color} />
        <DfxIcon icon={IconVariant.WALLET} color={color} />
      </>
    ),
    [ServiceButtonType.SELL]: (color: IconColors) => (
      <>
        <DfxIcon icon={IconVariant.WALLET} color={color} />
        <DfxIcon icon={IconVariant.ARROW_RIGHT} color={color} />
        <DfxIcon icon={IconVariant.BANK} color={color} />
      </>
    ),
    [ServiceButtonType.CONVERT]: (color: IconColors) => (
      <>
        <DfxIcon icon={IconVariant.CIRCLE} color={color} />
        <DfxIcon icon={IconVariant.SWAP} color={color} />
        <DfxIcon icon={IconVariant.CIRCLE_OUTLINE} color={color} />
      </>
    ),
  };

  return (
    <button
      className="flex flex-col gap-2 items-center justify-center rounded border border-dfxGray-300 h-20 w-60 shadow-dfx"
      type="button"
      onClick={() => navigate(url)}
      disabled={disabled}
    >
      <p className={`${disabled ? 'text-dfxGray-500' : 'text-dfxBlue-800'} text-lg font-bold`}>{type}</p>
      <div className="flex flex-row gap-2">{iconDefinitions[type](disabled ? IconColors.GRAY : IconColors.RED)}</div>
    </button>
  );
}
