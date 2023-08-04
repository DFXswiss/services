import {
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  Sell,
  SellPaymentInfo,
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
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledLink,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { QrCopy } from '../components/payment/qr-copy';
import { SellCompletion } from '../components/payment/sell-completion';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useParamContext } from '../contexts/param.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycDataGuard, useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';

export function SellInfoScreen(): JSX.Element {
  useSessionGuard();
  useKycDataGuard('/profile');
  const { translate } = useSettingsContext();
  const { availableBlockchains } = useSessionContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { assetIn, assetOut, amountIn, amountOut, bankAccount: bankAccountParam } = useParamContext();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { isAllowedToSell } = useKycHelper();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();
  const { closeServices } = useAppHandlingContext();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [asset, setAsset] = useState<Asset>();
  const [currency, setCurrency] = useState<Fiat>();
  const [bankAccount, setBankAccount] = useState<BankAccount>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [customAmountError, setCustomAmountError] = useState<string>();

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
    if (bankAccountParam && bankAccounts?.length) {
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
    // TODO: remove LN check with DEV-1679
    if (!(asset && asset.blockchain === Blockchain.LIGHTNING && currency && bankAccount && (amountIn || amountOut)))
      return;

    const request: SellPaymentInfo = { asset, currency, iban: bankAccount?.iban };
    if (amountIn) {
      request.amount = +amountIn;
    } else if (amountOut) {
      request.targetAmount = +amountOut;
    }

    receiveFor(request)
      .then(checkForMinDeposit)
      .then(setPaymentInfo)
      .finally(() => setIsLoading(false));
  }, [asset, currency, bankAccount, amountIn, amountOut]);

  function checkForMinDeposit(sell: Sell): Sell | undefined {
    if (sell.minVolume > sell.amount) {
      setCustomAmountError(
        translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
          amount: Utils.formatAmount(sell.minVolumeTarget),
          currency: sell.currency.name,
        }),
      );
      return undefined;
    } else {
      setCustomAmountError(undefined);
      return sell;
    }
  }

  const kycRequired = paymentInfo && !isAllowedToSell(paymentInfo.estimatedAmount);

  return (
    <Layout textStart backButton={false}>
      {showsCompletion && paymentInfo ? (
        <SellCompletion paymentInfo={paymentInfo} />
      ) : isLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : bankAccount && paymentInfo && !kycRequired ? (
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

          <p className="font-semibold text-sm text-dfxBlue-800">{translate('screens/sell', 'Pay with your wallet')}</p>
          {paymentInfo.paymentRequest && <QrCopy data={paymentInfo.paymentRequest} />}

          <div className="pt-4">
            <StyledLink
              label={translate(
                'screens/payment',
                'Please not that by using this service you automatically accept our terms and conditions.',
              )}
              url={process.env.REACT_APP_TNC_URL}
              dark
            />
          </div>

          <StyledButton
            width={StyledButtonWidth.FULL}
            label={translate('screens/sell', 'Click here once you have issued the transaction')}
            onClick={() => {
              setShowsCompletion(true);
              window.scrollTo(0, 0);
            }}
            caps={false}
            className="my-4"
          />
        </>
      ) : (
        <>
          {customAmountError && (
            <>
              <StyledInfoText invertedIcon>{customAmountError}</StyledInfoText>
              <StyledButton
                width={StyledButtonWidth.FULL}
                label={translate('general/actions', 'Close')}
                onClick={() => closeServices({ type: CloseType.CANCEL })}
              />
            </>
          )}
          {kycRequired && !customAmountError && <KycHint />}
        </>
      )}
    </Layout>
  );
}
