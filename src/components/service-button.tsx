import { useNavigate } from 'react-router-dom';
import DfxIcon, { IconVariant } from '../stories/DfxIcon';

export enum ServiceButtonType {
  BUY = 'Buy',
  SELL = 'Sell',
  CONVERT = 'Convert',
}

interface ServiceButtonProps {
  type: ServiceButtonType;
  url: string;
}

export function ServiceButton({ type, url }: ServiceButtonProps): JSX.Element {
  const navigate = useNavigate();

  const iconDefinitions: Record<ServiceButtonType, JSX.Element> = {
    [ServiceButtonType.BUY]: (
      <>
        <DfxIcon icon={IconVariant.BANK} />
        <DfxIcon icon={IconVariant.ARROW_RIGHT} />
        <DfxIcon icon={IconVariant.WALLET} />
      </>
    ),
    [ServiceButtonType.SELL]: (
      <>
        <DfxIcon icon={IconVariant.WALLET} />
        <DfxIcon icon={IconVariant.ARROW_RIGHT} />
        <DfxIcon icon={IconVariant.BANK} />
      </>
    ),
    [ServiceButtonType.CONVERT]: (
      <>
        <DfxIcon icon={IconVariant.CIRCLE} />
        <DfxIcon icon={IconVariant.SWAP} />
        <DfxIcon icon={IconVariant.CIRCLE_OUTLINE} />
      </>
    ),
  };

  return (
    <button
      className="flex flex-col gap-2 items-center justify-center rounded border border-dfxGray-300 h-20 w-60 shadow-dfx"
      type="button"
      onClick={() => navigate(url)}
    >
      <p className="text-dfxBlue-800 text-lg font-bold">{type}</p>
      <div className="flex flex-row gap-2">{iconDefinitions[type]}</div>
    </button>
  );
}
