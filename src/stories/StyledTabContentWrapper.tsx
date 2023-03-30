import { PropsWithChildren } from 'react';
import { IconVariant } from './DfxIcon';
import StyledIconButton from './StyledIconButton';

export interface StyledTabContentWrapperProps extends PropsWithChildren {
  showBackArrow?: boolean;
  onBackClick: () => void;
}

export default function StyledTabContentWrapper({
  showBackArrow = false,
  children,
  onBackClick,
}: StyledTabContentWrapperProps) {
  return (
    <div className="w-full">
      {showBackArrow && (
        <div className="absolute">
          <StyledIconButton icon={IconVariant.BACK} onClick={onBackClick} />
        </div>
      )}
      <div className="m-auto max-w-lg">{children}</div>
    </div>
  );
}
