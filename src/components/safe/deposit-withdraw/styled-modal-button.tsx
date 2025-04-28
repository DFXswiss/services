import { DfxIcon, IconSize, IconVariant, StyledVerticalStack } from '@dfx.swiss/react-components';
import { Noop } from 'react-hook-form';

export interface StyledModalButtonProps {
  label?: string;
  onClick: () => void;
  onBlur: Noop;
  value?: string;
  description?: string;
  placeholder: string;
}

// TOOD: Temporary - implemented in @react-components
export function StyledModalButton({
  label,
  onClick,
  onBlur,
  value,
  description,
  placeholder,
  ...props
}: StyledModalButtonProps): JSX.Element {
  return (
    <StyledVerticalStack gap={1}>
      {label && <label className="text-dfxBlue-800 text-base font-semibold pl-4 text-start">{label}</label>}
      <button
        type="button"
        className="flex justify-between border border-dfxGray-400 text-base font-normal rounded-md px-4 py-2 shadow-sm w-full h-[58px]"
        onClick={onClick}
        onBlur={onBlur}
        {...props}
      >
        <div className="h-full flex flex-col justify-center text-left gap-1">
          {value ? (
            <>
              {description && <span className="text-dfxGray-800 text-xs h-min leading-none">{description}</span>}
              <span className={'text-dfxBlue-800 leading-none font-base'.concat(description ? '' : ' py-2')}>
                {value}
              </span>
            </>
          ) : (
            <span className="text-dfxGray-600">{placeholder}</span>
          )}
        </div>
        <div className="place-self-center">
          <DfxIcon icon={IconVariant.UNFOLD_MORE} size={IconSize.LG} />
        </div>
      </button>
    </StyledVerticalStack>
  );
}
