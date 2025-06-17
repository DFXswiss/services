import { ControlProps } from '@dfx.swiss/react-components/dist/stories/form/Form';
import { forwardRef, HTMLInputTypeAttribute } from 'react';
import { Controller } from 'react-hook-form';
import { ExchangeRate } from 'src/dto/order.dto';
import { formatCurrency } from 'src/util/utils';

const FIAT_REGEX = /^\d*\.?\d{0,2}$/;

export interface AssetInputControlProps extends ControlProps {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  maxValue?: string;
  forceErrorMessage?: string;
  autocomplete?: string;
  exchangeRate?: ExchangeRate;
  coloredBackground?: boolean;
  assetSelector?: React.ReactNode;
  isFiat?: boolean;
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
      forceErrorMessage,
      exchangeRate,
      coloredBackground = false,
      assetSelector,
      isFiat = false,
      ...props
    }: AssetInputControlProps,
    ref,
  ) => {
    return (
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => {
          return (
            <>
              <div
                className={`flex flex-col gap-2 justify-center w-full rounded-md p-4 ${
                  coloredBackground ? 'bg-dfxGray-300/75' : 'border-0.5 border-dfxGray-500'
                }`}
              >
                <label
                  hidden={!label}
                  className="text-start leading-none text-sm w-full font-semibold text-dfxBlue-800"
                >
                  {label}
                </label>
                <div className="w-full flex flex-row items-center gap-4">
                  <div className="flex-[3_1_9rem]">
                    <input
                      style={{ backgroundColor: 'transparent' }}
                      className="text-lg text-dfxBlue-800 font-normal rounded-md border-none w-full focus:outline-none pl-1"
                      type="number"
                      inputMode="decimal"
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '' || !isFiat || FIAT_REGEX.test(raw)) {
                          onChange(raw);
                          onAmountChange?.();
                        }
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
                  {exchangeRate && (
                    <div className="flex justify-start text-sm text-dfxGray-700 leading-none w-full">
                      {`~ ${formatCurrency((value ?? 0) * exchangeRate.rate, 2, 2)} ${exchangeRate.currency}`}
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
              </div>
              {(forceErrorMessage || error) && (
                <p className="text-start text-sm text-dfxRed-100 pl-3">{forceErrorMessage ?? error?.message}</p>
              )}
            </>
          );
        }}
        name={name}
        rules={rules}
      />
    );
  },
);
