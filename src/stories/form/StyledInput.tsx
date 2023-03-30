import { forwardRef, HTMLInputTypeAttribute } from 'react';
import { Controller } from 'react-hook-form';
import StyledVerticalStack from '../layout-helpers/StyledVerticalStack';
import { ControlProps } from './Form';

interface StyledInputProps extends ControlProps {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  prefix?: string;
  forceError?: boolean;
  forceErrorMessage?: string;
  hideLabel?: boolean;
  darkTheme?: boolean;
}

const StyledInput = forwardRef<HTMLInputElement, StyledInputProps>(
  (
    {
      control,
      name,
      label,
      rules,
      disabled = false,
      error,
      type = 'text',
      placeholder,
      prefix,
      forceError = false,
      forceErrorMessage,
      hideLabel = false,
      darkTheme = false,
      ...props
    }: StyledInputProps,
    ref,
  ) => {
    const textColor = darkTheme ? 'text-white' : 'text-dfxBlue-800';
    const backgroundColor = darkTheme ? 'bg-white bg-opacity-5' : 'bg-white';
    const placeholderColor = darkTheme ? 'placeholder:text-dfxGray-800' : 'placeholder:text-dfxGray-600';
    const borderColor = darkTheme ? 'border-none' : 'border border-dfxGray-500';
    const outlineColor = darkTheme ? 'outline-none' : 'outline-2 outline-dfxBlue-400';
    const leftMargin = prefix ? 'pl-7' : '';

    const textOrErrorColor = forceError ? 'text-dfxRed-100' : textColor;

    return (
      <Controller
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <StyledVerticalStack gap={1}>
            <label hidden={hideLabel} className={'text-base font-semibold pl-3 ' + [textColor].join(' ')}>
              {label}
            </label>
            <div>
              {prefix && (
                <div className="text-dfxGray-800 absolute h-[50px] w-8 flex justify-center items-center">
                  <p>{prefix}</p>
                </div>
              )}
              <input
                className={
                  'text-base font-normal rounded-md p-3 w-full ' +
                  [textOrErrorColor, backgroundColor, placeholderColor, borderColor, outlineColor, leftMargin].join(' ')
                }
                type={type}
                onBlur={onBlur}
                onChange={(value) => onChange(value.target.value)}
                placeholder={placeholder}
                value={value ?? ''}
                disabled={disabled}
                ref={ref}
                onWheel={(e) => type === 'number' && e.currentTarget.blur()}
                {...props}
              />
            </div>
            {(forceErrorMessage || error) && (
              <p className="text-sm text-dfxRed-100 pl-3">{forceErrorMessage ?? error?.message}</p>
            )}
          </StyledVerticalStack>
        )}
        name={name}
        rules={rules}
      />
    );
  },
);

export default StyledInput;
