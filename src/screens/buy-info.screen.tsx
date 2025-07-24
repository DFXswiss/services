import {
  ApiError,
  Asset,
  Buy,
  BuyPaymentInfo,
  Fiat,
  TransactionError,
  TransactionType,
  Utils,
  useAsset,
  useAssetContext,
  useBuy,
  useFiat,
  useUserContext,
} from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { PaymentInformationContent } from 'src/components/payment/payment-info-buy';
import { ErrorHint } from '../components/error-hint';
import { KycHint } from '../components/kyc-hint';
import { BuyCompletion } from '../components/payment/buy-completion';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useLayoutContext } from '../contexts/layout.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';

export default function BuyInfoScreen(): JSX.Element {
  useAddressGuard();

  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { assetIn, assetOut, amountIn, amountOut, externalTransactionId, availableBlockchains } = useAppParams();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { currencies, receiveFor } = useBuy();
  const { closeServices } = useAppHandlingContext();
  const { scrollToTop } = useLayoutContext();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<Buy>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [asset, setAsset] = useState<Asset>();
  const [currency, setCurrency] = useState<Fiat>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();

  // default params
  useEffect(() => {
    const blockchains = availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { buyable: true, comingSoon: false });

    if (!asset) setAsset(getAsset(blockchainAssets, assetOut));
  }, [assetOut, getAsset, getAssets]);

  useEffect(() => {
    if (!currency) setCurrency(getCurrency(currencies, assetIn));
  }, [assetIn, getCurrency, currencies]);

  useEffect(() => fetchData(), [asset, currency, amountIn, amountOut]);

  function fetchData() {
    if (!(asset && currency && (amountIn || amountOut))) {
      const inputIsComplete = (amountIn || amountOut) && assetIn && assetOut;
      !inputIsComplete && setErrorMessage('Missing required information');
      return;
    }

    setErrorMessage(undefined);

    const request: BuyPaymentInfo = { asset, currency, externalTransactionId };
    if (amountIn) {
      request.amount = +amountIn;
    } else if (amountOut) {
      request.targetAmount = +amountOut;
    }

    setIsLoading(true);
    receiveFor(request)
      .then(validateBuy)
      .then(setPaymentInfo)
      .catch((error: ApiError) => {
        setPaymentInfo(undefined);
        setErrorMessage(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoading(false));
  }

  function validateBuy(buy: Buy): Buy | undefined {
    setCustomAmountError(undefined);
    setKycError(undefined);

    switch (buy.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmount(buy.minVolume),
            currency: buy.currency.name,
          }),
        );
        return undefined;

      case TransactionError.AMOUNT_TOO_HIGH:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is above maximum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmount(buy.maxVolume),
            currency: buy.currency.name,
          }),
        );
        return;

      case TransactionError.LIMIT_EXCEEDED:
      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_DATA_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
      case TransactionError.VIDEO_IDENT_REQUIRED:
      case TransactionError.NATIONALITY_NOT_ALLOWED:
      case TransactionError.IBAN_CURRENCY_MISMATCH:
        setKycError(buy.error);
        return undefined;
    }

    return buy;
  }

  useLayoutOptions({ textStart: true, backButton: false });

  return (
    <>
      {showsCompletion && paymentInfo ? (
        <BuyCompletion user={user} paymentInfo={paymentInfo} navigateOnClose={false} />
      ) : errorMessage ? (
        <StyledVerticalStack center className="text-center">
          <ErrorHint message={errorMessage} />

          <StyledButton
            width={StyledButtonWidth.MIN}
            label={translate('general/actions', 'Retry')}
            onClick={fetchData}
            className="mt-4"
            color={StyledButtonColor.STURDY_WHITE}
          />
        </StyledVerticalStack>
      ) : isLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : customAmountError ? (
        <>
          <StyledInfoText invertedIcon>{customAmountError}</StyledInfoText>
          <StyledButton
            width={StyledButtonWidth.FULL}
            label={translate('general/actions', 'Close')}
            onClick={() => closeServices({ type: CloseType.CANCEL }, false)}
          />
        </>
      ) : kycError ? (
        <KycHint type={TransactionType.BUY} error={kycError} />
      ) : (
        paymentInfo && (
          <>
            <PaymentInformationContent info={paymentInfo} />

            <div className="pt-4 leading-none">
              <StyledLink
                label={translate(
                  'screens/payment',
                  'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                )}
                url={process.env.REACT_APP_TNC_URL}
                small
                dark
              />
            </div>

            <StyledButton
              width={StyledButtonWidth.FULL}
              label={translate('screens/buy', 'Click here once you have issued the transfer')}
              onClick={() => {
                setShowsCompletion(true);
                scrollToTop();
              }}
              caps={false}
              className="mt-4"
            />
          </>
        )
      )}
    </>
  );
}
