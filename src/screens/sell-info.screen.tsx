import {
  ApiError,
  Asset,
  BankAccount,
  Fiat,
  KycLevel,
  Sell,
  SellPaymentInfo,
  TransactionError,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useBankAccount,
  useBankAccountContext,
  useFiat,
  useSell,
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
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
import { KycHint, KycReason } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { QrCopy } from '../components/payment/qr-copy';
import { SellCompletion } from '../components/payment/sell-completion';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useKycLevelGuard, useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';

export function SellInfoScreen(): JSX.Element {
  useSessionGuard();
  useKycLevelGuard(KycLevel.Sell, '/profile');

  const { translate } = useSettingsContext();
  const { availableBlockchains } = useSessionContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const {
    assetIn,
    assetOut,
    amountIn,
    amountOut,
    bankAccount: bankAccountParam,
    externalTransactionId,
  } = useAppParams();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { isComplete, defaultLimit, limitToString } = useKycHelper();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();
  const { closeServices } = useAppHandlingContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [asset, setAsset] = useState<Asset>();
  const [currency, setCurrency] = useState<Fiat>();
  const [bankAccount, setBankAccount] = useState<BankAccount>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycRequired, setKycRequired] = useState<boolean>(false);

  // default params
  useEffect(() => {
    const blockchains = availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { sellable: true, comingSoon: false });

    if (!asset) setAsset(getAsset(blockchainAssets, assetIn));
  }, [assetIn, getAsset, getAssets]);

  useEffect(() => {
    if (!currency) setCurrency(getCurrency(currencies, assetOut));
  }, [assetOut, getCurrency, currencies]);

  useEffect(() => {
    if (bankAccountParam && bankAccounts) {
      const account = getAccount(bankAccounts, bankAccountParam);
      if (account) {
        setBankAccount(account);
      } else if (!isCreatingAccount && Validations.Iban(countries).validate(bankAccountParam) === true) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccountParam })
          .then(setBankAccount)
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [bankAccountParam, getAccount, bankAccounts, countries]);

  useEffect(() => fetchData(), [asset, currency, bankAccount, amountIn, amountOut]);

  function fetchData() {
    if (!(asset && currency && bankAccount && (amountIn || amountOut))) return;

    setErrorMessage(undefined);

    const request: SellPaymentInfo = { asset, currency, iban: bankAccount?.iban, externalTransactionId };
    if (amountIn) {
      request.amount = +amountIn;
    } else if (amountOut) {
      request.targetAmount = +amountOut;
    }

    setIsLoading(true);
    receiveFor(request)
      .then(validateSell)
      .then(setPaymentInfo)
      .catch((error: ApiError) => {
        setPaymentInfo(undefined);
        setErrorMessage(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoading(false));
  }

  function validateSell(sell: Sell): Sell | undefined {
    switch (sell.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmountCrypto(sell.minVolume),
            currency: sell.asset.name,
          }),
        );
        return undefined;

      case TransactionError.AMOUNT_TOO_HIGH:
        if (!isComplete) {
          setKycRequired(true);
          return undefined;
        }
        break;

      case TransactionError.BANK_TRANSACTION_MISSING:
        setCustomAmountError(
          translate(
            'screens/kyc',
            'A buy bank transaction is required once your daily sell transaction volume exceeds {{limit}}.',
            { limit: limitToString(defaultLimit) },
          ),
        );
        return undefined;
    }

    setCustomAmountError(undefined);
    setKycRequired(false);

    return sell;
  }

  return (
    <Layout textStart backButton={false} scrollRef={scrollRef}>
      {showsCompletion && paymentInfo ? (
        <SellCompletion paymentInfo={paymentInfo} navigateOnClose={false} />
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
      ) : kycRequired ? (
        <KycHint reason={KycReason.LIMIT_EXCEEDED} />
      ) : (
        bankAccount &&
        paymentInfo && (
          <>
            <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>

            <StyledDataTable
              label={translate('screens/payment', 'Bank Transaction Details')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                {paymentInfo.estimatedAmount}
                <CopyButton onCopy={() => copy(`${paymentInfo.estimatedAmount}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'Currency')}>
                {paymentInfo.currency.name}
                <CopyButton onCopy={() => copy(paymentInfo.currency.name)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
                <div>
                  <p>{bankAccount.iban}</p>
                </div>
                <CopyButton onCopy={() => copy(bankAccount.iban)} />
              </StyledDataTableRow>
            </StyledDataTable>

            <p className="font-semibold text-sm text-dfxBlue-800">
              {translate('screens/sell', 'Pay with your wallet')}
            </p>
            {paymentInfo.paymentRequest && <QrCopy data={paymentInfo.paymentRequest} />}

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
              label={translate('screens/sell', 'Click here once you have issued the transaction')}
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
