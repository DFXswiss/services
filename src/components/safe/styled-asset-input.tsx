import { AssetIconVariant, DfxAssetIcon, DfxIcon, IconSize, IconVariant } from '@dfx.swiss/react-components';
import { ControlProps } from '@dfx.swiss/react-components/dist/stories/form/Form';
import { forwardRef, HTMLInputTypeAttribute, RefObject, useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { formatCurrency } from 'src/util/utils';

export interface StyledAssetInputProps extends ControlProps {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  maxButtonClick?: () => void;
  forceError?: boolean;
  forceErrorMessage?: string;
  autocomplete?: string;
  fiatRate?: number;
  fiatCurrency?: string;
  coloredBackground?: boolean;
  assetSelector?: React.ReactNode;
}

export const StyledAssetInput = forwardRef<HTMLInputElement, StyledAssetInputProps>(
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
      maxButtonClick,
      forceError = false,
      forceErrorMessage,
      fiatRate,
      fiatCurrency = 'USD',
      coloredBackground = false,
      assetSelector,
      ...props
    }: StyledAssetInputProps,
    ref,
  ) => {
    return (
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => {
          return (
            <div
              className={`flex flex-col gap-1 justify-center w-full rounded-md p-4 ${
                coloredBackground ? 'bg-dfxGray-300/75' : 'border-0.5 border-dfxGray-500'
              }`}
            >
              <label
                hidden={!label}
                className="text-start leading-none text-base w-full font-semibold text-dfxBlue-800"
              >
                {label}
              </label>
              <div className="w-full flex flex-row items-center gap-4">
                <div className="flex flex-col w-full">
                  <input
                    style={{ backgroundColor: 'transparent' }}
                    className="text-lg text-dfxBlue-800 font-normal rounded-md border-none w-full focus:outline-none pl-1"
                    type="number"
                    inputMode="decimal"
                    onChange={(value: any) => onChange(value.target.value)}
                    placeholder={placeholder}
                    value={value ?? ''}
                    disabled={disabled}
                    ref={ref}
                    onWheel={(e: any) => e.currentTarget.blur()}
                    name={autocomplete}
                    {...props}
                  />
                </div>

                {maxButtonClick && (
                  <div className="text-dfxBlue-800 text-xs font-medium hover:bg-dfxGray-500 border border-dfxGray-500 shadow-sm h-min rounded-[0.5rem] p-1 flex justify-center items-center">
                    <button type="button" onClick={maxButtonClick} className="px-1 hover:text-dfxRed-200">
                      MAX
                    </button>
                  </div>
                )}

                {assetSelector}
              </div>
              {fiatRate && (
                <div className="text-sm text-dfxGray-700 leading-none">
                  {`~ ${formatCurrency((value ?? 0) * fiatRate, 2, 2)} ${fiatCurrency}`}
                </div>
              )}
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

export interface AssetDropdownProps<T> extends ControlProps {
  items: T[];
  labelFunc: (item: T) => string;
  balanceFunc?: (item: T) => string;
  descriptionFunc?: (item: T) => string;
  priceFunc?: (item: T) => string;
  assetIconFunc?: (item: T) => AssetIconVariant;
  rootRef?: RefObject<HTMLElement>;
  forceEnable?: boolean;
  showSelectedValue?: boolean;
  placeholder?: string;
  placeholderDescription?: string;
}

export function AssetDropdown<T>({
  control,
  name,
  rules,
  disabled,
  items,
  placeholder,
  placeholderDescription,
  labelFunc,
  balanceFunc,
  descriptionFunc,
  priceFunc,
  assetIconFunc,
  rootRef,
  forceEnable,
  showSelectedValue = false,
  error,
  ...props
}: AssetDropdownProps<T>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
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
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex justify-between items-center border border-dfxGray-500 rounded ${
              showSelectedValue ? 'px-3.5 py-2.5 w-[180px]' : 'px-2 py-1'
            } shadow-sm hover:bg-dfxGray-400/30 ${isOpen ? 'bg-dfxGray-400/50' : ''}`}
            onBlur={onBlur}
            disabled={isDisabled}
            {...props}
          >
            {showSelectedValue ? (
              <>
                <div className="flex flex-row gap-2.5 items-center">
                  {value != null && assetIconFunc && <DfxAssetIcon asset={assetIconFunc(value)} />}
                  <div className="flex flex-col gap-1.5 justify-between text-left">
                    <span className="text-dfxBlue-800 leading-none font-semibold flex justify-between">
                      <p className="line-clamp-1">{value !== undefined ? labelFunc(value) : placeholder || 'Select'}</p>
                    </span>
                    {descriptionFunc && (
                      <span className="text-dfxGray-800 text-xs h-min leading-none flex justify-between">
                        <p className="line-clamp-1">
                          {value ? descriptionFunc(value) : placeholderDescription || 'Select a token'}
                        </p>
                      </span>
                    )}
                  </div>
                </div>
                <DfxIcon icon={isOpen ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} size={IconSize.SM} />
              </>
            ) : (
              <DfxIcon icon={isOpen ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} size={IconSize.LG} />
            )}
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute bg-white rounded-b border-x border-b border-dfxGray-500 right-0 w-[180px] z-10 overflow-y-auto max-h-[15rem] mt-1"
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
                    className={`flex flex-col gap-2 justify-between text-left w-full hover:bg-dfxGray-400 px-3.5 py-3 ${
                      isSelected ? 'bg-dfxGray-400/50' : ''
                    }`}
                  >
                    <div className="flex flex-row gap-2.5 items-center w-full">
                      {assetIconFunc && <DfxAssetIcon asset={assetIconFunc(item)} />}
                      <div className="flex flex-col gap-1.5 justify-between text-left w-full">
                        <span className="text-dfxBlue-800 leading-none font-semibold flex justify-between">
                          <p className="line-clamp-1">{labelFunc(item)}</p>
                          {balanceFunc && <p>{balanceFunc(item)}</p>}
                        </span>
                        {descriptionFunc && (
                          <span className="text-dfxGray-800 text-xs h-min leading-none flex justify-between">
                            <p className="line-clamp-1">{descriptionFunc(item)}</p>
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
        </div>
      )}
    />
  );
}
