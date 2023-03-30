import { ControlProps } from './Form';
import { useState } from 'react';
import DfxIcon, { IconColors, IconSizes, IconVariant } from '../DfxIcon';
import { Controller } from 'react-hook-form';

export interface StyledDropdownProps<T> extends ControlProps {
  labelIcon?: IconVariant;
  placeholder?: string;
  items: T[];
  labelFunc: (item: T) => string;
  descriptionFunc: (item: T) => string;
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
  labelFunc,
  descriptionFunc,
  ...props
}: StyledDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  let buttonClasses = 'flex justify-between border border-dfxGray-400 px-4 py-3 shadow-sm w-full';

  isOpen ? (buttonClasses += ' rounded-x rounded-t bg-dfxGray-400/50') : (buttonClasses += ' rounded');

  return (
    <Controller
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <div className="relative">
          <div className="flex ml-3.5 mb-2.5">
            {labelIcon !== undefined && <DfxIcon icon={labelIcon} size={IconSizes.SM} color={IconColors.BLUE} />}

            <label className="text-dfxBlue-800 text-base font-semibold pl-3.5">{label}</label>
          </div>
          <button
            id="dropDownButton"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={buttonClasses}
            onBlur={onBlur}
            disabled={disabled}
            {...props}
          >
            <div className="flex flex-col gap-1 justify-between text-left">
              {value === undefined ? (
                <p className="text-dfxGray-400 drop-shadow-none py-[0.25rem]">{placeholder}</p>
              ) : (
                <>
                  <span className="text-dfxBlue-800 leading-none font-semibold">{labelFunc(value)}</span>
                  <span className="text-dfxGray-800 text-xs h-min leading-none">{descriptionFunc(value)}</span>
                </>
              )}
            </div>
            <div className="place-self-center">
              <DfxIcon icon={isOpen ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} size={IconSizes.LG} />
            </div>
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
                  className="flex flex-col gap-2 justify-between text-left border-x border-dfxGray-400 w-full hover:bg-dfxGray-400/50 last:border-b last:rounded-b px-3.5 py-2.5"
                >
                  <span className="text-dfxBlue-800 leading-none font-semibold">{labelFunc(item)}</span>
                  <span className="text-dfxGray-800 text-xs h-min leading-none">{descriptionFunc(item)}</span>
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
