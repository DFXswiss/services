import {
  Asset,
  Buy,
  BuyPaymentInfo,
  Fiat,
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
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { BuyCompletion } from '../components/buy/buy-completion';
import { GiroCode } from '../components/buy/giro-code';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { usePath } from '../hooks/path.hook';

export function BuyInfoScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { availableBlockchains } = useSessionContext();
  const { assetIn, assetOut, amountIn, amountOut } = usePath();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { isAllowedToBuy } = useKycHelper();
  const { currencies, receiveFor } = useBuy();
  const { closeServices } = useAppHandlingContext();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<Buy>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [asset, setAsset] = useState<Asset>();
  const [currency, setCurrency] = useState<Fiat>();
  const [customAmountError, setCustomAmountError] = useState<string>();

  // default params
  useEffect(() => {
    const blockchains = availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { buyable: true, comingSoon: false });

    if (!asset) setAsset(getAsset(blockchainAssets, assetOut));
  }, [assetOut, getAsset, getAssets]);

  useEffect(() => {
    if (!currency) setCurrency(getCurrency(currencies, assetIn));
  }, [assetIn, getCurrency, currencies]);

  useEffect(() => {
    if (!asset || !currency) return;

    const request: BuyPaymentInfo = { asset, currency };
    if (amountIn) {
      request.amount = +amountIn;
    } else if (amountOut) {
      request.targetAmount = +amountOut;
    }

    receiveFor(request)
      .then(checkForMinDeposit)
      .then(setPaymentInfo)
      .finally(() => setIsLoading(false));
  }, [asset, currency, amountIn, amountOut]);

  function checkForMinDeposit(buy: Buy): Buy | undefined {
    if (buy.minVolume > buy.amount) {
      setCustomAmountError(
        translate('screens/buy', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
          amount: Utils.formatAmount(buy.minVolume),
          currency: buy.currency.name,
        }),
      );
      return undefined;
    } else {
      setCustomAmountError(undefined);
      return buy;
    }
  }

  const kycRequired = paymentInfo && !isAllowedToBuy(paymentInfo.amount);
  const showsSimple = user?.mail != null;

  return (
    <Layout textStart>
      {showsCompletion && paymentInfo ? (
        <BuyCompletion showsSimple={showsSimple} paymentInfo={paymentInfo} />
      ) : isLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : paymentInfo && !kycRequired ? (
        <>
          <h2 className="text-dfxBlue-800 text-center">{translate('screens/buy', 'Payment Information')}</h2>

          <StyledDataTable
            label={translate('screens/buy', 'Recipient')}
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
            <StyledDataTableRow label={translate('screens/profile', 'ZIP code')}>
              {paymentInfo.zip}
              <CopyButton onCopy={() => copy(`${paymentInfo.zip}`)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/profile', 'City')}>
              {paymentInfo.city}
              <CopyButton onCopy={() => copy(`${paymentInfo.city}`)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/profile', 'Country')}>
              {paymentInfo.country}
              <CopyButton onCopy={() => copy(`${paymentInfo.country}`)} />
            </StyledDataTableRow>
          </StyledDataTable>

          <StyledDataTable
            label={translate('screens/buy', 'Bank Transaction Details')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableRow label={translate('screens/buy', 'Amount')}>
              {paymentInfo.amount}
              <CopyButton onCopy={() => copy(`${paymentInfo.amount}`)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/buy', 'Currency')}>
              {paymentInfo.currency.name}
              <CopyButton onCopy={() => copy(paymentInfo.currency.name)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/buy', 'IBAN')}>
              <div>
                <p>{paymentInfo.iban}</p>
                {paymentInfo.sepaInstant && (
                  <div className="text-white">
                    <DfxIcon icon={IconVariant.SEPA_INSTANT} color={IconColor.RED} />
                  </div>
                )}
              </div>
              <CopyButton onCopy={() => copy(paymentInfo.iban)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/buy', 'BIC')}>
              {paymentInfo.bic}
              <CopyButton onCopy={() => copy(paymentInfo.bic)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/buy', 'Purpose of payment')}>
              {paymentInfo.remittanceInfo}
              <CopyButton onCopy={() => copy(paymentInfo.remittanceInfo)} />
            </StyledDataTableRow>
          </StyledDataTable>

          <GiroCode info={paymentInfo} />

          <StyledButton
            width={StyledButtonWidth.FULL}
            label={translate('screens/buy', 'Click here once you have issued the transfer')}
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
