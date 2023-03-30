import { PropsWithChildren } from 'react';
import StyledLoadingSpinner, { SpinnerSizes, SpinnerVariant } from './StyledLoadingSpinner';

interface StyledDataTextRowProps extends PropsWithChildren {
  label: string;
  isLoading?: boolean;
}

export default function StyledDataTextRow({ label, children, isLoading }: StyledDataTextRowProps) {
  const labelClasses = 'text-dfxGray-600';
  const rowDataClasses = 'flex place-self-center overflow-hidden ';

  return (
    <div className="flex py-1">
      <div className="flex-none w-48">
        <p className={labelClasses}>{label}</p>
      </div>
      <div className={rowDataClasses}>
        {isLoading ? <StyledLoadingSpinner size={SpinnerSizes.SM} variant={SpinnerVariant.PALE} /> : children}
      </div>
    </div>
  );
}
