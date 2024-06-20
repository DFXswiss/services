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
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  IconColor,
  SpinnerSize,
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
import { useBlockchain } from 'src/hooks/blockchain.hook';
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

// TODO: If payment is done wihtout connected wallet, listen for the transaction and redirect to completion screen
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
  const { toString } = useBlockchain();
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
  const [kycError, setKycError] = useState<TransactionError>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [sellTxId, setSellTxId] = useState<string>();
  const [timer, setTimer] = useState<Timer>({ minutes: 15, seconds: 0 });

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
    if (!paymentInfo) return;
    const expires = new Date(new Date().getTime() + 15 * 60000); // TODO: Set this to some expiration time given by the API
    const interval = setInterval(() => {
      const now = new Date();

      const diff = Math.max(0, expires.getTime() - now.getTime());

      setTimer({
        minutes: Math.floor(diff / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentInfo]);

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
      translate('screens/payment', 'Please send the specified amount to the address below.', {
        chain: toString(paymentInfo.asset.blockchain),
        currency: paymentInfo.currency.name,
        iban: Utils.formatIban(selectedBankAccount.iban) ?? '',
      })
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
                    {bankAccount.iban}
                    <CopyButton onCopy={() => copy(bankAccount.iban)} />
                  </StyledDataTableRow>
                </StyledDataTable>
                <StyledInfoText textSize={StyledInfoTextSize.XS} iconColor={IconColor.GRAY} discreet>
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
