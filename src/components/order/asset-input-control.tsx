import {
  AssetIconSize,
  AssetIconVariant,
  DfxAssetIcon,
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
} from '@dfx.swiss/react-components';
import { ControlProps } from '@dfx.swiss/react-components/dist/stories/form/Form';
import { forwardRef, HTMLInputTypeAttribute, RefObject, useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { formatCurrency } from 'src/util/utils';

export interface AssetInputControlProps extends ControlProps {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  maxValue?: string;
  forceError?: boolean;
  forceErrorMessage?: string;
  autocomplete?: string;
  fiatRate?: number;
  fiatCurrency?: string;
  coloredBackground?: boolean;
  assetSelector?: React.ReactNode;
  onMaxButtonClick?: () => void;
  onAmountChange?: () => void;
}

export const AssetInputControl = forwardRef<HTMLInputElement, AssetInputControlProps>(
  (
    {
      control,
      name,
      autocomplete,
      label,
      rules,
      disabled = false,
      error,
      type = 'text',
      placeholder,
      maxValue,
      onMaxButtonClick,
      onAmountChange,
      forceError = false,
      forceErrorMessage,
      fiatRate,
      fiatCurrency = 'USD',
      coloredBackground = false,
      assetSelector,
      ...props
    }: AssetInputControlProps,
    ref,
  ) => {
    return (
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => {
          return (
            <div
              className={`flex flex-col gap-2 justify-center w-full rounded-md p-4 ${
                coloredBackground ? 'bg-dfxGray-300/75' : 'border-0.5 border-dfxGray-500'
              }`}
            >
              <label hidden={!label} className="text-start leading-none text-sm w-full font-semibold text-dfxBlue-800">
                {label}
              </label>
              <div className="w-full flex flex-row items-center gap-4">
                <div className="flex-[3_1_9rem]">
                  <input
                    style={{ backgroundColor: 'transparent' }}
                    className="text-lg text-dfxBlue-800 font-normal rounded-md border-none w-full focus:outline-none pl-1"
                    type="number"
                    inputMode="decimal"
                    onChange={(value: any) => {
                      onChange(value.target.value);
                      onAmountChange?.();
                    }}
                    placeholder={placeholder}
                    value={value ?? ''}
                    disabled={disabled}
                    ref={ref}
                    onWheel={(e: any) => e.currentTarget.blur()}
                    name={autocomplete}
                    {...props}
                  />
                </div>

                <div className="flex-[1_0_9rem]">{assetSelector}</div>
              </div>
              <div className="flex flex-row items-center justify-between">
                {fiatRate && (
                  <div className="text-sm text-dfxGray-700 leading-none">
                    {`~ ${formatCurrency((value ?? 0) * fiatRate, 2, 2)} ${fiatCurrency}`}
                  </div>
                )}
                <div className="flex flex-row items-center justify-end gap-2 w-full">
                  <p className="text-xs text-dfxBlue-800 font-medium">{maxValue}</p>
                  {maxValue && (
                    <div className="text-dfxBlue-800 text-xs font-medium hover:bg-dfxGray-500 border border-dfxGray-500 shadow-sm py-1 w-12 h-min rounded-[0.5rem] flex justify-center items-center">
                      <button type="button" onClick={onMaxButtonClick} className="px-1 hover:text-dfxRed-200">
                        MAX
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {(forceErrorMessage || error) && (
                <p className="text-start text-sm text-dfxRed-100 pl-3">{forceErrorMessage ?? error?.message}</p>
              )}
            </div>
          );
        }}
        name={name}
        rules={rules}
      />
    );
  },
);

export interface StyledDropdownProps<T> extends ControlProps {
  labelIcon?: IconVariant;
  placeholder?: string;
  full?: boolean;
  smallLabel?: boolean;
  items: T[];
  labelFunc: (item: T) => string;
  balanceFunc?: (item: T) => string;
  descriptionFunc?: (item: T) => string;
  priceFunc?: (item: T) => string;
  assetIconFunc?: (item: T) => AssetIconVariant;
  rootRef?: RefObject<HTMLElement>;
  forceEnable?: boolean;
  hideBalanceWhenClosed?: boolean;
}

export default function StyledDropdown<T>({
  label,
  labelIcon,
  control,
  name,
  rules,
  disabled,
  items,
  placeholder,
  full,
  smallLabel,
  labelFunc,
  balanceFunc,
  descriptionFunc,
  priceFunc,
  assetIconFunc,
  rootRef,
  forceEnable,
  hideBalanceWhenClosed,
  error,
  ...props
}: StyledDropdownProps<T>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  let buttonClasses = 'flex justify-between border border-dfxGray-500 px-4 py-2 shadow-sm w-full h-[58px]';

  isOpen ? (buttonClasses += ' rounded-x rounded-t bg-dfxGray-400/50') : (buttonClasses += ' rounded');

  const isDisabled = disabled || (items.length <= 1 && !forceEnable);

  useEffect(() => {
    const element = rootRef?.current ?? document;
    if (element) {
      element.addEventListener('mousedown', closeDropdown);
      return () => element.removeEventListener('mousedown', closeDropdown);
    }
  }, [rootRef, isOpen]);

  function closeDropdown(e: Event) {
    if (
      isOpen &&
      isNode(e.target) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target)
    ) {
      setIsOpen(false);
    }
  }

  function isNode(target: EventTarget | null): target is Node {
    return target != null && 'nodeType' in target;
  }

  return (
    <Controller
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <div className={`relative ${full ? 'w-full' : ''}`}>
          {label && (
            <div className="flex items-center ml-3.5 mb-2.5">
              {labelIcon !== undefined && <DfxIcon icon={labelIcon} size={IconSize.SM} color={IconColor.BLUE} />}

              <label
                className={`text-dfxBlue-800 ${smallLabel ? 'text-sm' : 'text-base'} font-semibold ${
                  labelIcon ? 'pl-3.5' : ''
                }`}
              >
                {label}
              </label>
            </div>
          )}
          <button
            ref={buttonRef}
            id="dropDownButton"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={buttonClasses}
            onBlur={onBlur}
            disabled={isDisabled}
            {...props}
          >
            <div className="flex flex-row gap-3 items-center w-full h-full">
              {value != null && assetIconFunc && <DfxAssetIcon asset={assetIconFunc(value)} size={AssetIconSize.LG} />}
              <div className="flex flex-col gap-1 justify-between text-left w-full pt-0.5">
                {value === undefined ? (
                  <p className="text-dfxGray-600 drop-shadow-none py-[0.25rem]">{placeholder}</p>
                ) : (
                  <>
                    <span
                      className={`${
                        error ? 'text-dfxRed-100' : 'text-dfxBlue-800'
                      } leading-none font-semibold flex justify-between ${
                        !descriptionFunc && !assetIconFunc ? 'py-[0.25rem]' : ''
                      }`}
                    >
                      <p className="line-clamp-1 pb-0.5">{labelFunc(value)}</p>
                      {balanceFunc && !hideBalanceWhenClosed && <p>{balanceFunc(value)}</p>}
                    </span>
                    {descriptionFunc && (
                      <span className="text-dfxGray-800 text-xs h-min leading-tight flex justify-between">
                        <p className="pb-0.5 line-clamp-1 leading-tight">{descriptionFunc(value)}</p>
                        {priceFunc && <p>{priceFunc(value)}</p>}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {!isDisabled && (
              <div className="place-self-center">
                <DfxIcon icon={isOpen ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} size={IconSize.LG} />
              </div>
            )}
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute bg-white rounded-b border-x border-b border-dfxGray-500 w-full z-10 overflow-y-auto max-h-[15rem]"
            >
              {items.map((item, index) => {
                const isSelected = value !== undefined && JSON.stringify(value) === JSON.stringify(item);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col gap-2 justify-between text-left w-full hover:bg-dfxGray-400 px-3.5 py-2.5 ${
                      isSelected ? 'bg-dfxGray-400/50' : ''
                    }`}
                  >
                    <div className="flex flex-row gap-3 items-center w-full">
                      {assetIconFunc && <DfxAssetIcon asset={assetIconFunc(item)} size={AssetIconSize.LG} />}
                      <div className="flex flex-col gap-1 justify-between text-left w-full">
                        <span
                          className={`text-dfxBlue-800 leading-none font-semibold flex justify-between ${
                            !descriptionFunc && !assetIconFunc ? 'py-[0.25rem]' : ''
                          }`}
                        >
                          {labelFunc(item)}
                          {balanceFunc && <p>{balanceFunc(item)}</p>}
                        </span>
                        {descriptionFunc && (
                          <span className="text-dfxGray-800 text-xs h-min leading-none flex justify-between">
                            {descriptionFunc(item)}
                            {priceFunc && <p>{priceFunc(item)}</p>}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-start text-sm text-dfxRed-100 pl-3">{error?.message}</p>}
        </div>
      )}
      name={name}
      rules={rules}
    />
  );
}
