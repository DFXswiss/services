import { Fiat, FiatPaymentMethod, Sell, Swap, TransactionError, TransactionType } from '@dfx.swiss/react';
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
import { useMemo, useState } from 'react';
import { CloseType, useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { OrderPaymentData } from 'src/dto/order.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import { AmountError, OrderType } from 'src/hooks/order.hook';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { isAsset } from 'src/util/utils';
import { ErrorHint } from '../error-hint';
import { ExchangeRate } from '../exchange-rate';
import { KycHint } from '../kyc-hint';
import { PrivateAssetHint } from '../private-asset-hint';
import { SanctionHint } from '../sanction-hint';
import { PaymentInfoContent } from './payment-info-content';

export interface PaymentInfoProps {
  className?: string;
  orderType: OrderType;
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
  onHandleNext: (paymentInfo: OrderPaymentData) => void;
}

export function PaymentInfo({
  className,
  orderType,
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
  const { closeServices } = useAppHandlingContext();
  const { sendTransaction, canSendTransaction } = useTxHelper();
  const { activeWallet } = useWalletContext();
  const { translate } = useSettingsContext();

  const { flags } = useAppParams();

  const [isProcessing, setIsProcessing] = useState(false);

  const isBankWire = paymentMethod !== FiatPaymentMethod.CARD;
  const isCardPayment = paymentMethod === FiatPaymentMethod.CARD;

  const privateAssets = useMemo(
    () => [sourceAsset, targetAsset].filter((a) => a && isAsset(a) && a.category === AssetCategory.PRIVATE),
    [sourceAsset, targetAsset],
  );

  function onCardBuy(info: OrderPaymentData) {
    if (info.error === TransactionError.NAME_REQUIRED) {
      // setShowsNameForm(true); // TODO: Use Order Context
    } else if (info?.buyInfos?.paymentLink) {
      // setIsContinue(true);
      window.location.href = info.buyInfos.paymentLink;
    }
  }

  async function processTransaction(paymentInfo: Sell | Swap): Promise<void> {
    setIsProcessing(true);

    // TODO: Is this necessary?
    // await updateAccount(selectedBankAccount.id, { preferredCurrency: selectedCurrency as Fiat });

    if (canSendTransaction() && !activeWallet) {
      // TODO: Refactor CloseServicesParams
      return orderType === OrderType.SELL
        ? closeServices({ type: CloseType.SELL, isComplete: false, sell: paymentInfo as Sell }, false)
        : closeServices({ type: CloseType.SWAP, isComplete: false, swap: paymentInfo as Swap }, false);
    }

    try {
      // TODO: Call setSellTxId / setSwapTxId in order context
      // if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSellTxId);
      // if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSwapTxId);
      // TODO: Also set in context, can make isTxDone of type txId (string)?
      // setTxDone(true);
    } finally {
      setIsProcessing(false);
    }
  }

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
                  {isBankWire && <PaymentInfoContent info={paymentInfo} />}
                  <SanctionHint />
                  <div className="w-full text-center leading-none">
                    <StyledLink
                      label={translate(
                        'screens/payment',
                        'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                      )}
                      url={process.env.REACT_APP_TNC_URL}
                      small
                      dark
                    />
                    {isBankWire ? (
                      <StyledButton
                        width={StyledButtonWidth.FULL}
                        label={translate('screens/buy', 'Click here once you have issued the transfer')}
                        onClick={() => onHandleNext(paymentInfo)}
                        isLoading={isHandlingNext}
                        className="mt-4"
                        caps={false}
                      />
                    ) : isCardPayment ? (
                      <StyledButton
                        width={StyledButtonWidth.FULL}
                        label={translate('general/actions', 'Next')}
                        onClick={() => onCardBuy(paymentInfo)}
                        isLoading={isHandlingNext}
                        className="mt-4"
                        caps={false}
                      />
                    ) : (
                      <StyledButton
                        width={StyledButtonWidth.FULL}
                        label={translate(
                          'screens/sell',
                          canSendTransaction()
                            ? 'Complete transaction in your wallet'
                            : 'Click here once you have issued the transaction',
                        )}
                        onClick={() => processTransaction(paymentInfo as any)} // TODO: Fix type
                        isLoading={isProcessing}
                        className="mt-4"
                        caps={false}
                      />
                    )}
                  </div>
                </>
              </StyledVerticalStack>
            ))}
        </>
      )}
    </StyledVerticalStack>
  );
}
