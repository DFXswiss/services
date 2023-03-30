import StyledLoadingSpinner, { SpinnerSizes, SpinnerVariant } from './StyledLoadingSpinner';

export enum StyledButtonSizes {
  BIG = 'BIG',
  SMALL = 'SMALL',
}

export enum StyledButtonWidths {
  MIN = 'MIN',
  SM = 'SM',
  MD = 'MD',
  FULL = 'FULL',
}

export enum StyledButtonColors {
  RED = 'RED',
  GRAY = 'GRAY',
  PALE_WHITE = 'PALE_WHITE',
  WHITE = 'WHITE',
}

export interface StyledButtonProps {
  label: string;
  onClick: () => void;
  size?: StyledButtonSizes;
  width?: StyledButtonWidths;
  color?: StyledButtonColors;
  caps?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  deactivateMargin?: boolean;
}

type SizeMapProps = {
  buttonClasses: string;
  loadingSpinnerSize: SpinnerSizes;
};

const SIZE_MAPS: Record<StyledButtonSizes, SizeMapProps> = {
  [StyledButtonSizes.BIG]: {
    buttonClasses: 'font-bold text-base rounded px-7 py-2.5 ',
    loadingSpinnerSize: SpinnerSizes.MD,
  },
  [StyledButtonSizes.SMALL]: {
    buttonClasses: 'text-sm rounded-md px-3.5 py-0.5 ',
    loadingSpinnerSize: SpinnerSizes.SM,
  },
};

const COLOR_MAPS: Record<StyledButtonColors, string> = {
  [StyledButtonColors.RED]:
    'bg-primary-red text-white hover:bg-dfxRed-150 focus:bg-dfxRed-150 active:bg-dfxRed-100 hover:shadow-lg',
  [StyledButtonColors.GRAY]: 'bg-dfxGray-800 text-dfxGray-700',
  [StyledButtonColors.WHITE]:
    'bg-dfxGray-400 text-primary-blue hover:bg-dfxGray-500 focus:bg-dfxGray-500 active:bg-dfxGray-600 hover:shadow-lg',
  [StyledButtonColors.PALE_WHITE]:
    'border border-white/20 text-white bg-white/10 hover:bg-white/20 focus:bg-white/20 active:bg-white/30',
};

const WIDTH_MAPS: Record<StyledButtonWidths, string> = {
  [StyledButtonWidths.MIN]: 'mx-4',
  [StyledButtonWidths.SM]: 'w-[250px]',
  [StyledButtonWidths.MD]: 'min-w-[250px]',
  [StyledButtonWidths.FULL]: 'w-full',
};

export default function StyledButton({
  label,
  onClick,
  size = StyledButtonSizes.BIG,
  width = StyledButtonWidths.MD,
  color = StyledButtonColors.RED,
  caps = true,
  isLoading = false,
  disabled = false,
  hidden = false,
  deactivateMargin = false,
}: StyledButtonProps) {
  let buttonClasses =
    'inline-block flex gap-4 justify-center leading-tight shadow-md focus:outline-none focus:ring-0 transition duration-150 ease-in-out ';

  let renderedColor: string;
  let isDisabled = false;

  disabled || isLoading ? (isDisabled = true) : null;

  if (isDisabled) {
    renderedColor = COLOR_MAPS[StyledButtonColors.GRAY];
  } else {
    if (color === StyledButtonColors.GRAY) {
      renderedColor =
        COLOR_MAPS[color] +
        ' hover:bg-dfxGray-700 hover:text-dfxGray-800 focus:bg-dfxGray-700 focus:text-dfxGray-800 active:bg-dfxGray-800 active:text-dfxGray-700';
    } else {
      renderedColor = COLOR_MAPS[color];
    }
  }

  buttonClasses += [
    SIZE_MAPS[size].buttonClasses,
    renderedColor,
    width === StyledButtonWidths.MIN && deactivateMargin ? '' : WIDTH_MAPS[width],
    caps ? 'uppercase' : 'normal-case',
  ].join(' ');

  buttonClasses += hidden ? ' hidden' : '';

  return (
    <>
      <button type="button" className={buttonClasses} onClick={onClick} disabled={isDisabled}>
        {label}
        {isLoading && (
          <div className="place-self-center">
            <StyledLoadingSpinner variant={SpinnerVariant.PALE} size={SIZE_MAPS[size].loadingSpinnerSize} />
          </div>
        )}
      </button>
    </>
  );
}
