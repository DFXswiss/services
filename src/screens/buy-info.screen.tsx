import {
  ApiError,
  Asset,
  Buy,
  BuyPaymentInfo,
  Fiat,
  FiatPaymentMethod,
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
import { Urls } from 'src/config/urls';
import { PaymentInformationContent } from 'src/components/payment/payment-info-buy';
import { ErrorHint } from '../components/error-hint';
import { BuyCompletion } from '../components/payment/buy-completion';
import { QuoteErrorHint } from '../components/quote-error-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useLayoutContext } from '../contexts/layout.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { usePersonalIban } from '../hooks/personal-iban.hook';
import { getKycErrorFromMessage } from '../util/api-error';
import {
  getPersonalIbanErrorMessage,
  isPersonalIbanApplicable,
  isUnrecognizedPersonalIbanSelector,
  toPersonalIbanProviderRequest,
} from '../util/personal-iban';

export default function BuyInfoScreen(): JSX.Element {
  useAddressGuard();

  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const {
    assetIn,
    assetOut,
    amountIn,
    amountOut,
    externalTransactionId,
    availableBlockchains,
  } = useAppParams();
  const personalIban = usePersonalIban();
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
  // Bumps to re-run the guarded fetch from the Retry button without a second unguarded code path.
  const [retryToken, setRetryToken] = useState(0);

  // default params
  useEffect(() => {
    const blockchains = availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { buyable: true, comingSoon: false });

    if (!asset) setAsset(getAsset(blockchainAssets, assetOut));
  }, [assetOut, getAsset, getAssets]);

  useEffect(() => {
    if (!currency) setCurrency(getCurrency(currencies, assetIn));
  }, [assetIn, getCurrency, currencies]);

  // Race-protected quote fetch: a stale response must never overwrite a newer one after
  // personalIban / inputs change at runtime (widget attribute, browser back/forward).
  useEffect(() => {
    let isRunning = true;

    if (!(asset && currency && (amountIn || amountOut))) {
      const inputIsComplete = (amountIn || amountOut) && assetIn && assetOut;
      if (!inputIsComplete && isRunning) setErrorMessage('Missing required information');
      return () => {
        isRunning = false;
      };
    }

    if (isRunning) setErrorMessage(undefined);

    // Currency/method eligibility only — independent of whether the customer set a selector.
    // Request building stays on eligibility alone (toPersonalIbanProviderRequest(undefined) is {}).
    const isPersonalIbanEligible = isPersonalIbanApplicable(currency?.name, FiatPaymentMethod.BANK);
    // Personal-IBAN error copy only when the customer actually requested a personal IBAN.
    const personalIbanErrorApplies = isPersonalIbanEligible && personalIban !== undefined;

    if (isPersonalIbanEligible && isUnrecognizedPersonalIbanSelector(personalIban)) {
      const personalIbanErrorText = getPersonalIbanErrorMessage('PersonalIbanProviderUnsupported');
      if (isRunning) {
        setPaymentInfo(undefined);
        setErrorMessage(
          personalIbanErrorText ? translate('screens/payment', personalIbanErrorText) : 'Unknown error',
        );
      }
      return () => {
        isRunning = false;
      };
    }

    const request: BuyPaymentInfo = {
      asset,
      currency,
      externalTransactionId,
      ...(isPersonalIbanEligible ? toPersonalIbanProviderRequest(personalIban) : {}),
    };
    if (amountIn) {
      request.amount = +amountIn;
    } else if (amountOut) {
      request.targetAmount = +amountOut;
    }

    if (isRunning) setIsLoading(true);
    receiveFor(request)
      .then((buy) => {
        if (!isRunning) return;
        setPaymentInfo(validateBuy(buy));
      })
      .catch((error: ApiError) => {
        if (!isRunning) return;
        setPaymentInfo(undefined);
        const personalIbanErrorText = personalIbanErrorApplies
          ? getPersonalIbanErrorMessage(error.message)
          : undefined;
        if (personalIbanErrorText) {
          setErrorMessage(translate('screens/payment', personalIbanErrorText));
        } else {
          const kycErrorFromMessage = getKycErrorFromMessage(error.message);
          if (kycErrorFromMessage) {
            setKycError(kycErrorFromMessage);
          } else {
            setErrorMessage(error.message ?? 'Unknown error');
          }
        }
      })
      .finally(() => {
        if (isRunning) setIsLoading(false);
      });

    return () => {
      isRunning = false;
    };
  }, [asset, currency, amountIn, amountOut, personalIban, retryToken]);

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
      case TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING:
      case TransactionError.VIDEO_IDENT_REQUIRED:
      case TransactionError.NATIONALITY_NOT_ALLOWED:
      case TransactionError.IBAN_CURRENCY_MISMATCH:
      case TransactionError.PAYMENT_METHOD_NOT_ALLOWED:
      case TransactionError.TRADING_NOT_ALLOWED:
      case TransactionError.RECOMMENDATION_REQUIRED:
      case TransactionError.EMAIL_REQUIRED:
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
            onClick={() => setRetryToken((t) => t + 1)}
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
        <QuoteErrorHint type={TransactionType.BUY} error={kycError} />
      ) : (
        paymentInfo && (
          <>
            <PaymentInformationContent info={paymentInfo} />

            {personalIban !== undefined &&
              !isPersonalIbanApplicable(paymentInfo.currency.name, FiatPaymentMethod.BANK) && (
                <StyledInfoText invertedIcon>
                  {translate(
                    'screens/payment',
                    'Your requested personal IBAN is only available for EUR bank transfers, so it was not used for this offer.',
                  )}
                </StyledInfoText>
              )}

            <div className="pt-4 leading-none">
              <StyledLink
                label={translate(
                  'screens/payment',
                  'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                )}
                url={Urls.termsAndConditions}
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
