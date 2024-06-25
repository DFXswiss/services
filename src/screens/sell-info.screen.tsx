import {
  ApiError,
  Asset,
  BankAccount,
  Fiat,
  Sell,
  SellPaymentInfo,
  TransactionError,
  TransactionType,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useBankAccount,
  useBankAccountContext,
  useFiat,
  useSell,
  useTransaction,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  IconColor,
  SpinnerSize,
  SpinnerVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledInfoTextSize,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { PaymentInformationContent } from 'src/components/payment/payment-info-sell';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { ErrorHint } from '../components/error-hint';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { SellCompletion } from '../components/payment/sell-completion';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useAddressGuard } from '../hooks/guard.hook';

interface Timer {
  minutes: number;
  seconds: number;
}

export function SellInfoScreen(): JSX.Element {
  useAddressGuard();

  const { translate } = useSettingsContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const {
    assetIn,
    assetOut,
    amountIn,
    amountOut,
    bankAccount: bankAccountParam,
    externalTransactionId,
    availableBlockchains,
  } = useAppParams();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();
  const { closeServices } = useAppHandlingContext();
  const { sendTransaction, canSendTransaction } = useTxHelper();
  const { activeWallet } = useWalletContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getTransactionByRequestId } = useTransaction();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [asset, setAsset] = useState<Asset>();
  const [currency, setCurrency] = useState<Fiat>();
  const [bankAccount, setBankAccount] = useState<BankAccount>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [sellTxId, setSellTxId] = useState<string>();
  const [timer, setTimer] = useState<Timer>({ minutes: 0, seconds: 0 });

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

  useEffect(() => {
    if (!paymentInfo || isLoading) return;
    const exchangeRateInterval = setInterval(() => {
      const priceTimestamp = new Date(paymentInfo.timestamp);
      const expiration = priceTimestamp.setMinutes(priceTimestamp.getMinutes() + 15);
      const diff = expiration - Date.now();
      setTimer({
        minutes: Math.floor(diff / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      });

      if (diff <= 1000) {
        clearInterval(exchangeRateInterval);
        fetchData();
      }
    }, 1000);

    const checkTransactionInterval = setInterval(() => {
      getTransactionByRequestId(paymentInfo.id.toString())
        .then((tx) => {
          setSellTxId(tx.inputTxId);
          setShowsCompletion(true);
          clearInterval(checkTransactionInterval);
        })
        .catch(() => {
          // ignore 404 Not Found
        });
    }, 5000);

    return () => {
      clearInterval(exchangeRateInterval);
      clearInterval(checkTransactionInterval);
    };
  }, [paymentInfo, isLoading]);

  useEffect(() => fetchData(), [asset, currency, bankAccount, amountIn, amountOut]);

  function fetchData() {
    if (!(asset && currency && bankAccount && (amountIn || amountOut))) return;

    setErrorMessage(undefined);

    const request: SellPaymentInfo = {
      asset,
      currency,
      iban: bankAccount?.iban,
      externalTransactionId,
      exactPrice: true,
    };
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
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is above maximum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmountCrypto(sell.maxVolume),
            currency: sell.asset.name,
          }),
        );
        return;

      case TransactionError.LIMIT_EXCEEDED:
      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_DATA_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
        setKycError(sell.error);
        return undefined;
    }

    setCustomAmountError(undefined);
    setKycError(undefined);

    return sell;
  }

  async function handleNext(paymentInfo: Sell): Promise<void> {
    setIsProcessing(true);

    if (canSendTransaction() && !activeWallet)
      return closeServices({ type: CloseType.SELL, isComplete: false, sell: paymentInfo }, false);

    try {
      if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSellTxId);
      setShowsCompletion(true);
    } finally {
      setIsProcessing(false);
    }
  }

  function getPaymentInfoString(paymentInfo: Sell, selectedBankAccount: BankAccount): string {
    return (
      paymentInfo &&
      selectedBankAccount &&
      translate('screens/payment', 'Please send the specified amount to the address below.')
    );
  }

  return (
    <Layout textStart backButton={false} scrollRef={scrollRef}>
      {showsCompletion && paymentInfo ? (
        <SellCompletion paymentInfo={paymentInfo} navigateOnClose={false} txId={sellTxId} />
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
            className="mt-4"
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
        <KycHint type={TransactionType.SELL} error={kycError} />
      ) : (
        bankAccount &&
        paymentInfo && (
          <>
            <StyledVerticalStack gap={8} full>
              <StyledVerticalStack gap={1} full>
                <StyledDataTable
                  label={translate('screens/payment', 'Transaction Details')}
                  alignContent={AlignContent.RIGHT}
                  showBorder
                  minWidth={false}
                >
                  <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                    <div className="flex flex-col items-end">
                      {`${paymentInfo.amount} ${paymentInfo.asset.name}`}
                      <p className="text-dfxGray-700 text-xs">{`${paymentInfo.estimatedAmount} ${paymentInfo.currency.name}`}</p>
                    </div>
                  </StyledDataTableRow>
                  <StyledDataTableRow
                    label={`${translate('screens/payment', 'Beneficiary Bank Account')} (${translate(
                      'screens/payment',
                      'IBAN',
                    )})`}
                  >
                    {paymentInfo.beneficiary.iban}
                    <CopyButton onCopy={() => copy(bankAccount.iban)} />
                  </StyledDataTableRow>
                  {paymentInfo.beneficiary.name && (
                    <StyledDataTableRow label={translate('screens/payment', 'Beneficiary Bank Account Name')}>
                      {paymentInfo.beneficiary.name}
                      <CopyButton onCopy={() => copy(bankAccount.iban)} />
                    </StyledDataTableRow>
                  )}
                </StyledDataTable>
                <StyledInfoText textSize={StyledInfoTextSize.XS} iconColor={IconColor.GRAY} discreet>
                  {timer.minutes > 0 || timer.seconds > 0 ? (
                    <>
                      {translate(
                        'screens/payment',
                        'The exchange rate of {{rate}} {{currency}}/{{asset}} is fixed for {{timer}}, after which it will be recalculated.',
                        {
                          rate: Utils.formatAmount(1 / paymentInfo.rate),
                          currency: paymentInfo.currency.name,
                          asset: paymentInfo.asset.name,
                          timer: `${timer.minutes}m ${timer.seconds}s`,
                        },
                      )}
                    </>
                  ) : (
                    <div className="mt-1">
                      <StyledLoadingSpinner size={SpinnerSize.SM} variant={SpinnerVariant.LIGHT_MODE} />
                    </div>
                  )}
                </StyledInfoText>
              </StyledVerticalStack>

              <PaymentInformationContent info={paymentInfo} infoText={getPaymentInfoString(paymentInfo, bankAccount)} />
            </StyledVerticalStack>

            <div className="pt-2 w-full leading-none">
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

            {canSendTransaction() && (
              <div className="pt-2 w-full leading-none">
                <StyledButton
                  width={StyledButtonWidth.FULL}
                  label={translate('screens/sell', 'Complete transaction in your wallet')}
                  onClick={() => handleNext(paymentInfo)}
                  caps={false}
                  className="mt-4"
                  isLoading={isProcessing}
                />
              </div>
            )}
          </>
        )
      )}
    </Layout>
  );
}
