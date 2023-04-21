import { ControlProps } from './Form';
import { useState } from 'react';
import DfxIcon, { IconColors, IconSizes, IconVariant } from '../DfxIcon';
import { Controller } from 'react-hook-form';
import DfxAssetIcon, { AssetIconVariant } from '../DfxAssetIcon';

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
  ...props
}: StyledDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  let buttonClasses = 'flex justify-between border border-dfxGray-500 px-4 py-3 shadow-sm w-full';

  isOpen ? (buttonClasses += ' rounded-x rounded-t bg-dfxGray-400/50') : (buttonClasses += ' rounded');

  const isDisabled = disabled || items.length <= 1;

  return (
    <Controller
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <div className={`relative ${full ? 'w-full' : ''}`}>
          <div className="flex items-center ml-3.5 mb-2.5">
            {labelIcon !== undefined && <DfxIcon icon={labelIcon} size={IconSizes.SM} color={IconColors.BLUE} />}

            <label
              className={`text-dfxBlue-800 ${smallLabel ? 'text-sm' : 'text-base'} font-semibold ${
                labelIcon ? 'pl-3.5' : ''
              }`}
            >
              {label}
            </label>
          </div>
          <button
            id="dropDownButton"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={buttonClasses}
            onBlur={onBlur}
            disabled={isDisabled}
            {...props}
          >
            <div className="flex flex-row gap-2 items-center w-full">
              {value && assetIconFunc && <DfxAssetIcon asset={assetIconFunc(value)} />}
              <div className="flex flex-col gap-1 justify-between text-left w-full">
                {value === undefined ? (
                  <p className="text-dfxGray-600 drop-shadow-none py-[0.25rem]">{placeholder}</p>
                ) : (
                  <>
                    <span
                      className={`text-dfxBlue-800 leading-none font-semibold flex justify-between ${
                        !descriptionFunc && !assetIconFunc ? 'py-[0.25rem]' : ''
                      }`}
                    >
                      {labelFunc(value)}
                      {balanceFunc && <p>{balanceFunc(value)}</p>}
                    </span>
                    {descriptionFunc && (
                      <span className="text-dfxGray-800 text-xs h-min leading-none flex justify-between">
                        {descriptionFunc(value)}
                        {priceFunc && <p>{priceFunc(value)}</p>}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {!isDisabled && (
              <div className="place-self-center">
                <DfxIcon icon={isOpen ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} size={IconSizes.LG} />
              </div>
            )}
          </button>
          {isOpen && (
            <div className="absolute bg-white rounded-b w-full z-10">
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className="flex flex-col gap-2 justify-between text-left border-x border-dfxGray-500 w-full hover:bg-dfxGray-400/50 last:border-b last:rounded-b px-3.5 py-2.5"
                >
                  <div className="flex flex-row gap-2 items-center w-full">
                    {assetIconFunc && <DfxAssetIcon asset={assetIconFunc(item)} />}
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
              ))}
            </div>
          )}
        </div>
      )}
      name={name}
      rules={rules}
    />
  );
}
