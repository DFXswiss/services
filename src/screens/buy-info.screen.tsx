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
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  DfxIcon,
  IconColor,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ErrorHint } from '../components/error-hint';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { GiroCode } from '../components/payment/giro-code';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useSessionGuard } from '../hooks/guard.hook';

export function BuyInfoScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { availableBlockchains } = useSessionContext();
  const { assetIn, assetOut, amountIn, amountOut, externalTransactionId } = useAppParams();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { currencies, receiveFor } = useBuy();
  const { closeServices } = useAppHandlingContext();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!(asset && currency && (amountIn || amountOut))) return;

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
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
        setKycError(buy.error);
        return undefined;
    }

    return buy;
  }

  return (
    <Layout textStart backButton={false} scrollRef={scrollRef}>
      {showsCompletion && paymentInfo ? (
        <BuyCompletion user={user} paymentInfo={paymentInfo} navigateOnClose={false} />
      ) : isLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : errorMessage ? (
        <StyledVerticalStack center className="text-center">
          <ErrorHint message={errorMessage} />

          <StyledButton
            width={StyledButtonWidth.MIN}
            label={translate('general/actions', 'Retry')}
            onClick={fetchData}
            className="my-4"
            color={StyledButtonColor.STURDY_WHITE}
          />
        </StyledVerticalStack>
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
            <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>

            <StyledDataTable
              label={translate('screens/payment', 'Recipient')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/buy', 'Name')}>
                {paymentInfo.name}
                <CopyButton onCopy={() => copy(`${paymentInfo.name}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/buy', 'Address')}>
                {`${paymentInfo.street} ${paymentInfo.number}`}
                <CopyButton onCopy={() => copy(`${paymentInfo.street} ${paymentInfo.number}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/kyc', 'ZIP code')}>
                {paymentInfo.zip}
                <CopyButton onCopy={() => copy(`${paymentInfo.zip}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/kyc', 'City')}>
                {paymentInfo.city}
                <CopyButton onCopy={() => copy(`${paymentInfo.city}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/kyc', 'Country')}>
                {paymentInfo.country}
                <CopyButton onCopy={() => copy(`${paymentInfo.country}`)} />
              </StyledDataTableRow>
            </StyledDataTable>

            <StyledDataTable
              label={translate('screens/payment', 'Bank Transaction Details')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                {paymentInfo.amount}
                <CopyButton onCopy={() => copy(`${paymentInfo.amount}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'Currency')}>
                {paymentInfo.currency.name}
                <CopyButton onCopy={() => copy(paymentInfo.currency.name)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
                <div>
                  <p>{paymentInfo.iban}</p>
                  {paymentInfo.sepaInstant && (
                    <div className="text-white">
                      <DfxIcon icon={IconVariant.SEPA_INSTANT} color={IconColor.RED} />
                    </div>
                  )}
                </div>
                <CopyButton onCopy={() => copy(paymentInfo.iban ?? '')} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'BIC')}>
                {paymentInfo.bic}
                <CopyButton onCopy={() => copy(paymentInfo.bic)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'Reference')}>
                {paymentInfo.remittanceInfo}
                <CopyButton onCopy={() => copy(paymentInfo.remittanceInfo)} />
              </StyledDataTableRow>
            </StyledDataTable>

            {paymentInfo.paymentRequest && <GiroCode value={paymentInfo.paymentRequest} />}

            <div className="pt-4 leading-none">
              <StyledLink
                label={translate(
                  'screens/payment',
                  'Please note that by using this service you automatically accept our terms and conditions.',
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
                scrollRef.current?.scrollTo(0, 0);
              }}
              caps={false}
              className="my-4"
            />
          </>
        )
      )}
    </Layout>
  );
}
