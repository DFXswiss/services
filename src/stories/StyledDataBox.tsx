import { PropsWithChildren } from 'react';
import StyledIconButton, { StyledIconButtonProps } from './StyledIconButton';

interface StyledDataBoxProps extends PropsWithChildren {
  heading: string;
  rightIconButton?: StyledIconButtonProps;
  boxButtonLabel?: string;
  boxButtonOnClick?: () => void;
  rightCornerHeading?: string;
}

export default function StyledDataBox({
  heading,
  children,
  rightIconButton,
  rightCornerHeading,
  boxButtonLabel,
  boxButtonOnClick,
}: StyledDataBoxProps) {
  let headingClasses = 'mb-2';
  let containerClasses = ' border-white/20  p-3';

  boxButtonLabel !== undefined
    ? (containerClasses += ' rounded-t border-x border-t')
    : (containerClasses += ' border rounded');

  if (!children) {
    headingClasses += ' text-white/20';
  }

  return (
    <div className="mb-6 sm:max-w-lg md:max-w-none md:w-full mx-auto">
      <div className={containerClasses}>
        <div className="flex justify-between content-start">
          <h2 className={headingClasses}>{heading}</h2>
          {rightIconButton && <StyledIconButton {...rightIconButton} />}
          {rightCornerHeading && <span className="text-lg font-bold">{rightCornerHeading}</span>}
        </div>
        <div>{children}</div>
      </div>
      {boxButtonLabel !== undefined && (
        <button
          type="button"
          onClick={boxButtonOnClick}
          className="bg-white/10 border-white/20 uppercase p-2 font-bold border w-full rounded-b hover:bg-white/20 focus:bg-white/20 active:bg-white/30"
        >
          {boxButtonLabel}
        </button>
      )}
    </div>
  );
}
