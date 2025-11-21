import {
  Asset,
  AssetCategory,
  Fiat,
  FiatPaymentMethod,
  Sell,
  Swap,
  TransactionError,
  TransactionType,
  useBankAccountContext,
} from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import React, { useEffect, useMemo, useState } from 'react';
import { CloseType, useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { OrderPaymentData } from 'src/dto/order.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import { AmountError, OrderType } from 'src/hooks/order.hook';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { isAsset } from 'src/util/utils';
import { ExchangeRate } from '../exchange-rate';
import { PrivateAssetHint } from '../private-asset-hint';
import { QuoteErrorHint } from '../quote-error-hint';
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
  retry: () => void;
  confirmPayment: () => Promise<void>;
}

export const PaymentInfo = React.memo(function PaymentInfoComponent({
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
  retry,
  confirmPayment,
}: PaymentInfoProps): JSX.Element {
  const { closeServices } = useAppHandlingContext();
  const { bankAccounts } = useBankAccountContext();
  const { canSendTransaction } = useTxHelper();
  const { updateAccount } = useBankAccountContext();
  const { activeWallet } = useWalletContext();
  const { translate } = useSettingsContext();
  const { flags } = useAppParams();
  const { setPaymentNameForm } = useOrderUIContext();

  const localRef = React.useRef<HTMLDivElement>(null);

  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [isProcessingCardPayment, setIsProcessingCardPayment] = useState(false);

  useEffect(() => {
    if (paymentInfo && localRef.current) {
      localRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [paymentInfo]);

  const privateAssets = useMemo(
    () => [sourceAsset, targetAsset].filter((a) => a && isAsset(a) && a.category === AssetCategory.PRIVATE),
    [sourceAsset, targetAsset],
  );

  function onCardBuy(info: OrderPaymentData) {
    if (info.error === TransactionError.NAME_REQUIRED) {
      setPaymentNameForm(true);
    } else if (info?.buyInfos?.paymentLink && info.isValid) {
      setIsProcessingCardPayment(true);
      window.location.href = info.buyInfos.paymentLink;
    }
  }

  async function processTransaction(paymentInfo: Sell | Swap): Promise<void> {
    setIsProcessingTransaction(true);

    if (orderType === OrderType.SELL) {
      const bankAccountId = bankAccounts?.find((b) => b.iban === (paymentInfo as Sell).beneficiary.iban)?.id;
      bankAccountId && (await updateAccount(bankAccountId, { preferredCurrency: (paymentInfo as Sell).currency }));
    }

    if (canSendTransaction() && !activeWallet) {
      // TODO (later): Refactor CloseServicesParams
      return orderType === OrderType.SELL
        ? closeServices({ type: CloseType.SELL, isComplete: false, sell: paymentInfo as Sell }, false)
        : closeServices({ type: CloseType.SWAP, isComplete: false, swap: paymentInfo as Swap }, false);
    }

    try {
      // TODO (later): Implement for sell and swap transactions
      // if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSellTxId);
      // if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSwapTxId);
      // setTxDone(true);
    } finally {
      setIsProcessingTransaction(false);
    }
  }

  const isBankWire = paymentMethod !== FiatPaymentMethod.CARD;
  const isCardPayment = paymentMethod === FiatPaymentMethod.CARD;

  return (
    <div ref={localRef}>
      <StyledVerticalStack center className={className}>
        {isLoading && !paymentInfo ? (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        ) : (
          <>
            {kycError && <QuoteErrorHint type={TransactionType.BUY} error={kycError} />}

            {errorMessage && (
              <StyledVerticalStack center className="text-center">
                <p className="text-dfxGray-800 text-sm">{errorMessage}</p>
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
                    {isBankWire && orderType !== OrderType.SWAP && paymentInfo?.buyInfos && (
                      <PaymentInfoContent info={paymentInfo} />
                    )}
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
                      {orderType === OrderType.SWAP ? (
                        <StyledButton
                          width={StyledButtonWidth.FULL}
                          label={translate('screens/swap', 'Confirm swap')}
                          onClick={confirmPayment}
                          className="mt-4"
                        />
                      ) : isBankWire ? (
                        <StyledButton
                          width={StyledButtonWidth.FULL}
                          label={translate('screens/buy', 'Click here once you have issued the transfer')}
                          onClick={confirmPayment}
                          className="mt-4"
                          caps={false}
                        />
                      ) : isCardPayment ? (
                        <StyledButton
                          width={StyledButtonWidth.FULL}
                          label={translate('general/actions', 'Next')}
                          onClick={() => onCardBuy(paymentInfo)}
                          isLoading={isProcessingCardPayment}
                          className="mt-4"
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
                          onClick={() => processTransaction(paymentInfo as any)} // TODO (later): Fix type casting
                          isLoading={isProcessingTransaction}
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
    </div>
  );
});
