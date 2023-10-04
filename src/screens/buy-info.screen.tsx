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
  StyledLink,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { GiroCode } from '../components/payment/giro-code';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';

export function BuyInfoScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { availableBlockchains } = useSessionContext();
  const { assetIn, assetOut, amountIn, amountOut } = useAppParams();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { getCurrency } = useFiat();
  const { isAllowedToBuy } = useKycHelper();
  const { currencies, receiveFor } = useBuy();
  const { closeServices } = useAppHandlingContext();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!(asset && currency && (amountIn || amountOut))) return;

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
        translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
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
    <Layout textStart backButton={false} scrollRef={scrollRef}>
      {showsCompletion && paymentInfo ? (
        <BuyCompletion showsSimple={showsSimple} paymentInfo={paymentInfo} navigateOnClose={false} />
      ) : isLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : paymentInfo && !kycRequired ? (
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
              <CopyButton onCopy={() => copy(paymentInfo.iban)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/payment', 'BIC')}>
              {paymentInfo.bic}
              <CopyButton onCopy={() => copy(paymentInfo.bic)} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/payment', 'Purpose of payment')}>
              {paymentInfo.remittanceInfo}
              <CopyButton onCopy={() => copy(paymentInfo.remittanceInfo)} />
            </StyledDataTableRow>
          </StyledDataTable>

          {paymentInfo.paymentRequest && <GiroCode value={paymentInfo.paymentRequest} />}

          <div className="pt-4">
            <StyledLink
              label={translate(
                'screens/payment',
                'Please note that by using this service you automatically accept our terms and conditions.',
              )}
              url={process.env.REACT_APP_TNC_URL}
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
      ) : (
        <>
          {customAmountError && (
            <>
              <StyledInfoText invertedIcon>{customAmountError}</StyledInfoText>
              <StyledButton
                width={StyledButtonWidth.FULL}
                label={translate('general/actions', 'Close')}
                onClick={() => closeServices({ type: CloseType.CANCEL }, false)}
              />
            </>
          )}
          {kycRequired && !customAmountError && <KycHint />}
        </>
      )}
    </Layout>
  );
}
