import { PropsWithChildren } from 'react';
import { IconColors, IconSizes, IconVariant } from './DfxIcon';
import StyledIconButton from './StyledIconButton';

export enum StyledModalColors {
  WHITE = 'WHITE',
  DFX_GRADIENT = 'DFX_GRADIENT',
}

export enum StyledModalTypes {
  REGULAR = 'REGULAR',
  ALERT = 'ALERT',
}

export enum StyledModalWidths {
  SMALL = 'SMALL',
  REGULAR = 'REGULAR',
  LARGE = 'LARGE',
  FULL_WIDTH = 'FULL_WIDTH',
}

const WIDTH_MAPS: Record<StyledModalWidths, string> = {
  [StyledModalWidths.SMALL]: 'min-w-[25rem] max-w-lg',
  [StyledModalWidths.REGULAR]: 'min-w-[37.5rem] max-w-2xl',
  [StyledModalWidths.LARGE]: 'w-[90%] max-w-4xl',
  [StyledModalWidths.FULL_WIDTH]: 'w-[90%] max-w-7xl',
};

interface StyledModalProps extends PropsWithChildren {
  isVisible: boolean;
  onClose?: (showModal: boolean) => any;
  closeWithX?: boolean;
  heading?: string;
  color?: StyledModalColors;
  type?: StyledModalTypes;
  width?: StyledModalWidths;
}

export default function StyledModal({
  isVisible,
  type = StyledModalTypes.REGULAR,
  color = StyledModalColors.DFX_GRADIENT,
  onClose,
  heading,
  closeWithX = true,
  children,
  width = StyledModalWidths.REGULAR,
}: StyledModalProps) {
  function setShowModal(modalState: boolean) {
    onClose?.(modalState);
  }

  const showHeader = heading !== undefined && heading !== '' && type === StyledModalTypes.REGULAR;

  const parentClasses = 'relative my-6 mx-auto ' + WIDTH_MAPS[width];
  let containerClasses =
    'rounded-lg shadow-lg max-h-[80vh] relative flex flex-col w-full outline-none focus:outline-none';
  let headingClasses = 'p-3 border-b rounded-t';
  let bodyClasses = 'relative px-14 pb-10 flex-auto overflow-auto';

  if (type !== StyledModalTypes.ALERT) {
    color === StyledModalColors.DFX_GRADIENT
      ? ((containerClasses += ' bg-dfxGradient text-white border border-white/20'),
        (headingClasses += ' border-white/20'))
      : ((containerClasses += ' bg-white text-dfxBlue-800'), (headingClasses += ' border-dfxGray-400'));
  } else {
    containerClasses += ' bg-dfxGray-400 text-dfxBlue-800';
    bodyClasses += ' text-center';
  }

  showHeader ? (bodyClasses += ' pt-6') : (bodyClasses += ' pt-12');

  const zIndex = type === StyledModalTypes.ALERT ? 'z-[100]' : 'z-40';

  return (
    <>
      {isVisible && (
        <>
          <div
            className={`justify-center  items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 ${zIndex} outline-none focus:outline-none`}
          >
            <div className={parentClasses}>
              {/*content*/}
              <div className={containerClasses}>
                {closeWithX && type === StyledModalTypes.REGULAR && (
                  <div className="absolute right-4 top-4 z-50">
                    <StyledIconButton
                      color={color === StyledModalColors.DFX_GRADIENT ? IconColors.WHITE : IconColors.BLUE}
                      size={IconSizes.LG}
                      icon={IconVariant.CLOSE}
                      onClick={() => setShowModal(false)}
                    />
                  </div>
                )}
                {/*header*/}
                {showHeader && (
                  <div className={headingClasses}>
                    <h3 className="text-lg font-bold text-center">{heading}</h3>
                  </div>
                )}
                {/*body*/}
                <div className={bodyClasses}>{children}</div>
              </div>
            </div>
          </div>
          <div className="opacity-30 fixed inset-0 z-30 bg-black"></div>
        </>
      )}
    </>
  );
}
