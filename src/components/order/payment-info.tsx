import { Fiat, FiatPaymentMethod, TransactionError, TransactionType } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { Asset, AssetCategory } from '@dfx.swiss/react/dist/definitions/asset';
import { useMemo } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { OrderPaymentData } from 'src/dto/order.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import { AmountError } from 'src/hooks/order.hook';
import { isAsset } from 'src/util/utils';
import { ErrorHint } from '../error-hint';
import { ExchangeRate } from '../exchange-rate';
import { KycHint } from '../kyc-hint';
import { PrivateAssetHint } from '../private-asset-hint';
import { SanctionHint } from '../sanction-hint';
import { PaymentInfoContent } from './payment-info-content';

export interface PaymentInfoProps {
  className?: string;
  isLoading: boolean;
  paymentInfo?: OrderPaymentData;
  paymentMethod?: FiatPaymentMethod;
  sourceAsset: Asset | Fiat;
  targetAsset: Asset | Fiat;
  errorMessage?: string;
  amountError?: AmountError;
  kycError?: TransactionError;
  isHandlingNext?: boolean;
  retry: () => void;
  onHandleNext?: (paymentInfo: any) => void;
}

export function PaymentInfo({
  className,
  isLoading,
  paymentInfo,
  paymentMethod,
  errorMessage,
  amountError,
  kycError,
  sourceAsset,
  targetAsset,
  isHandlingNext,
  retry,
  onHandleNext,
}: PaymentInfoProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { flags } = useAppParams();

  const privateAssets = useMemo(
    () => [sourceAsset, targetAsset].filter((a) => a && isAsset(a) && a.category === AssetCategory.PRIVATE),
    [sourceAsset, targetAsset],
  );

  return (
    <StyledVerticalStack center className={className}>
      {isLoading && !paymentInfo ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <>
          {kycError && <KycHint type={TransactionType.BUY} error={kycError} />}

          {errorMessage && (
            <StyledVerticalStack center className="text-center">
              <ErrorHint message={errorMessage} />
              <StyledButton
                width={StyledButtonWidth.MIN}
                label={translate('general/actions', 'Retry')}
                onClick={retry}
                className="mt-4"
                color={StyledButtonColor.STURDY_WHITE}
              />
            </StyledVerticalStack>
          )}

          {paymentInfo &&
            !kycError &&
            !errorMessage &&
            !amountError?.hideInfos &&
            (privateAssets?.length && !flags?.includes('private') ? (
              <PrivateAssetHint asset={privateAssets[0] as Asset} />
            ) : (
              <StyledVerticalStack className="text-left" gap={4}>
                <ExchangeRate
                  exchangeRate={paymentInfo.exchangeRate}
                  rate={paymentInfo.rate}
                  fees={paymentInfo.fees}
                  feeCurrency={sourceAsset}
                  from={sourceAsset}
                  to={targetAsset}
                  steps={paymentInfo.priceSteps}
                  amountIn={paymentInfo.amount}
                  amountOut={paymentInfo.estimatedAmount}
                  type={TransactionType.BUY}
                />

                <>
                  {paymentMethod !== FiatPaymentMethod.CARD && <PaymentInfoContent info={paymentInfo} />}
                  <SanctionHint />
                  <div className="w-full leading-none">
                    <StyledLink
                      label={translate(
                        'screens/payment',
                        'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                      )}
                      url={process.env.REACT_APP_TNC_URL}
                      small
                      dark
                    />
                    <StyledButton
                      width={StyledButtonWidth.FULL}
                      label={
                        paymentMethod !== FiatPaymentMethod.CARD
                          ? translate('screens/buy', 'Click here once you have issued the transfer')
                          : translate('general/actions', 'Next')
                      }
                      onClick={() => onHandleNext?.(paymentInfo)}
                      isLoading={isHandlingNext}
                      className="mt-4"
                      caps={false}
                    />
                  </div>
                </>
              </StyledVerticalStack>
            ))}
        </>
      )}
    </StyledVerticalStack>
  );
}
