import {
  ApiError,
  Asset,
  PaymentLinkPaymentStatus,
  useApi,
  useAssetContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  SpinnerVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCollapsible,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledDropdown,
  StyledHorizontalStack,
  StyledIconButton,
  StyledInfoText,
  StyledInfoTextSize,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { PaymentLink, PaymentStandardType } from '@dfx.swiss/react/dist/definitions/route';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { GoCheckCircleFill, GoClockFill, GoSkip, GoXCircleFill } from 'react-icons/go';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { QrBasic } from 'src/components/payment/qr-code';
import { useLayoutContext } from 'src/contexts/layout.context';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import {
  ExtendedPaymentLinkStatus,
  NoPaymentLinkPaymentStatus,
  PaymentLinkMode,
  PaymentLinkPayRequest,
  PaymentLinkPayTerminal,
  PaymentStandard,
  WalletAppId,
  WalletInfo,
} from 'src/dto/payment-link.dto';
import { useNavigation } from 'src/hooks/navigation.hook';
import { usePaymentLinkWallets } from 'src/hooks/payment-link-wallets.hook';
import { useWeb3 } from 'src/hooks/web3.hook';
import { BadgeType } from 'src/util/app-store-badges';
import { Evm } from 'src/util/evm';
import { OpenCryptoPayUtils } from 'src/util/open-crypto-pay';
import { Wallet } from 'src/util/payment-link-wallet';
import { blankedAddress, formatLocationAddress, formatUnits } from 'src/util/utils';
import { AppStoreBadge } from '../components/app-store-badge';
import { useLayoutOptions } from '../hooks/layout-config.hook';

interface FormData {
  paymentStandard: PaymentStandard;
  asset?: string;
}

export default function PaymentLinkScreen(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { translate } = useSettingsContext();
  const { toBlockchain } = useWeb3();
  const { width } = useWindowContext();
  const { assets } = useAssetContext();
  const { rootRef } = useLayoutContext();
  const {
    error,
    merchant,
    payRequest,
    timer,
    paymentLinkApiUrl,
    callbackUrl,
    paymentStandards,
    paymentIdentifier,
    isLoadingPaymentIdentifier,
    paymentStatus,
    isLoadingMetaMask,
    metaMaskInfo,
    metaMaskError,
    isMetaMaskPaying,
    isMerchantMode,
    showAssets,
    showMap,
    paymentHasQuote,
    setSessionApiUrl,
    setPaymentIdentifier,
    fetchPayRequest,
    fetchPaymentIdentifier,
    payWithMetaMask,
  } = usePaymentLinkContext();

  const { recommendedWallets, otherWallets, semiCompatibleWallets, getWalletByName, getDeeplinkByWalletId } =
    usePaymentLinkWallets();

  const [assetObject, setAssetObject] = useState<Asset>();
  const [showContract, setShowContract] = useState(false);
  const [walletData, setWalletData] = useState<WalletInfo>();
  const [isLoadingDeeplink, setIsLoadingDeeplink] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const {
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  const selectedPaymentStandard = useWatch({ control, name: 'paymentStandard' });
  const selectedAsset = useWatch({ control, name: 'asset' });

  useEffect(() => {
    const walletId = searchParams.get('wallet-id') as WalletAppId;
    if (walletId) {
      setWalletData(getWalletByName(walletId));

      setIsLoadingDeeplink(true);
      getDeeplinkByWalletId(walletId)
        .then((deeplink) => {
          const wallet = getWalletByName(walletId) as WalletInfo;
          setWalletData({ ...wallet, deepLink: deeplink });
        })
        .finally(() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('wallet-id');
          setSearchParams(newParams);
          setIsLoadingDeeplink(false);
        });
    }
  }, [searchParams]);

  useEffect(() => {
    if (
      [PaymentLinkPaymentStatus.CANCELLED, PaymentLinkPaymentStatus.EXPIRED].includes(
        paymentStatus as PaymentLinkPaymentStatus,
      )
    ) {
      setWalletData(undefined);
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (!paymentHasQuote(payRequest)) return;

    const currUrlStandard = new URL(paymentLinkApiUrl.current).searchParams.get('standard');

    if (!currUrlStandard || (selectedPaymentStandard && currUrlStandard !== selectedPaymentStandard?.id)) {
      const url = new URL(paymentLinkApiUrl.current);
      url.searchParams.set('standard', selectedPaymentStandard?.id ?? payRequest.standard);

      setSessionApiUrl(url.toString());
      fetchPayRequest(url.toString());

      setPaymentIdentifier(undefined);
      callbackUrl.current = undefined;
      setValue('asset', undefined);
      setAssetObject(undefined);
    } else {
      fetchPaymentIdentifier(
        payRequest,
        selectedPaymentStandard?.blockchain,
        selectedAsset ??
          payRequest.transferAmounts.find((item) => item.method === selectedPaymentStandard?.blockchain)?.assets?.[0]
            ?.asset,
      );
    }
  }, [payRequest, selectedPaymentStandard, selectedAsset]);

  useEffect(() => {
    if (!paymentHasQuote(payRequest)) return;

    const paymentStandard = paymentStandards?.find((item) => item.id === payRequest.standard);
    if (!selectedPaymentStandard && paymentStandard) {
      setValue('paymentStandard', paymentStandard);
    }

    const assets = payRequest.transferAmounts.find(
      (item) => item.method === selectedPaymentStandard?.blockchain,
    )?.assets;

    if ((!selectedAsset || !assets?.find((item) => item.asset === selectedAsset)) && assets?.length) {
      setValue('asset', assets[0].asset);
    }
  }, [payRequest, paymentStandards, selectedPaymentStandard, selectedAsset]);

  useEffect(() => {
    if (selectedAsset && selectedPaymentStandard?.blockchain) {
      setAssetObject(assets.get(selectedPaymentStandard?.blockchain)?.find((item) => item.name === selectedAsset));
    } else {
      setAssetObject(undefined);
    }
  }, [selectedAsset, selectedPaymentStandard]);

  useEffect(() => {
    if (showMap && payRequest) scrollToMap();
  }, [showMap, payRequest]);

  const handleBackButton = () => {
    setWalletData(undefined);
  };

  const scrollToMap = () => {
    setTimeout(() => mapRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const assetsList =
    paymentHasQuote(payRequest) &&
    payRequest.transferAmounts.find((item) => item.method === selectedPaymentStandard?.blockchain)?.assets;

  const parsedEvmUri =
    selectedPaymentStandard?.id === PaymentStandardType.PAY_TO_ADDRESS && paymentIdentifier
      ? Evm.decodeUri(paymentIdentifier)
      : undefined;

  useLayoutOptions({ backButton: false, smallMenu: true });

  return (
    <>
      {error ? (
        <p className="text-dfxGray-800 text-sm mt-4">{error}</p>
      ) : !payRequest || isLoadingMetaMask ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center className="pt-8">
          <div className="flex flex-col w-full gap-6 justify-center">
            <p className="text-dfxBlue-800 font-bold text-xl">{payRequest?.displayName ?? merchant}</p>
            <div className="w-full h-[1px] bg-gradient-to-r bg-dfxGray-500 from-white via-dfxGray-500 to-white" />
            {!merchant && (
              <>
                {paymentHasQuote(payRequest) ? (
                  <>
                    <p className="text-xl font-bold text-dfxBlue-800 mb-8">
                      <span className="text-[18px]">{payRequest.requestedAmount.asset} </span>
                      {Utils.formatAmount(payRequest.requestedAmount.amount).replace('.00', '.-').replace(' ', "'")}
                    </p>
                    {payRequest?.mode === PaymentLinkMode.PUBLIC &&
                      ![PaymentLinkPaymentStatus.COMPLETED, PaymentLinkPaymentStatus.EXPIRED].includes(
                        paymentStatus as PaymentLinkPaymentStatus,
                      ) && <EditPublicPaymentForm paymentRequest={payRequest} />}
                  </>
                ) : payRequest?.mode === PaymentLinkMode.PUBLIC &&
                  paymentStatus === NoPaymentLinkPaymentStatus.NO_PAYMENT ? (
                  <CreatePublicPaymentForm paymentRequest={payRequest} />
                ) : [PaymentLinkPaymentStatus.PENDING, NoPaymentLinkPaymentStatus.NO_PAYMENT].includes(
                    paymentStatus,
                  ) ? (
                  <div className="flex w-full justify-center mb-8" hidden={!isLoadingPaymentIdentifier}>
                    <StyledLoadingSpinner variant={SpinnerVariant.LIGHT_MODE} size={SpinnerSize.MD} />
                  </div>
                ) : null}
              </>
            )}
          </div>
          <PaymentStatusTile
            status={paymentStatus}
            filterStatuses={
              payRequest?.mode === PaymentLinkMode.PUBLIC
                ? [PaymentLinkPaymentStatus.CANCELLED, NoPaymentLinkPaymentStatus.NO_PAYMENT]
                : []
            }
          />

          {paymentStatus === PaymentLinkPaymentStatus.PENDING &&
            paymentHasQuote(payRequest) &&
            paymentStandards?.length &&
            !(metaMaskInfo || metaMaskError) && (
              <Form control={control} errors={errors}>
                <StyledVerticalStack full gap={4} center>
                  <StyledDropdown<PaymentStandard>
                    rootRef={rootRef}
                    name="paymentStandard"
                    items={paymentStandards}
                    labelFunc={(item) =>
                      translate('screens/payment', item.label, { blockchain: item.blockchain?.toString() ?? '' })
                    }
                    descriptionFunc={(item) =>
                      translate('screens/payment', item.description, { blockchain: item.blockchain?.toString() ?? '' })
                    }
                    smallLabel
                    full
                  />

                  {assetsList && (
                    <StyledDropdown<string>
                      rootRef={rootRef}
                      name="asset"
                      items={assetsList?.map((item) => item.asset) ?? []}
                      labelFunc={(item) => item}
                      descriptionFunc={() => selectedPaymentStandard?.blockchain ?? ''}
                      full
                      smallLabel
                    />
                  )}
                </StyledVerticalStack>
              </Form>
            )}

          {([PaymentLinkPaymentStatus.PENDING, NoPaymentLinkPaymentStatus.NO_PAYMENT].includes(paymentStatus) ||
            payRequest?.mode === PaymentLinkMode.PUBLIC) && (
            <>
              {payRequest && (paymentHasQuote(payRequest) || payRequest.recipient) && (
                <StyledCollapsible
                  full
                  titleContent={
                    <div className="flex flex-col items-start gap-1.5 text-left -my-1">
                      <div className="flex flex-col items-start text-left">
                        <div className="font-semibold leading-none">
                          {translate('screens/payment', 'Payment details')}
                        </div>
                      </div>
                      <div className="leading-none text-dfxGray-800 text-xs">
                        {`${translate('screens/payment', 'Your payment details at a glance')}`}
                      </div>
                    </div>
                  }
                  isExpanded={selectedPaymentStandard?.id === PaymentStandardType.PAY_TO_ADDRESS || showAssets}
                >
                  <StyledVerticalStack full gap={4} className="text-left">
                    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                      {!isMerchantMode && payRequest.externalId && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'External ID')}
                          expansionItems={
                            [
                              {
                                label: translate('screens/support', 'ID'),
                                text: payRequest.id,
                              },
                              {
                                label: translate('screens/home', 'Mode'),
                                text: payRequest.mode,
                              },
                              {
                                label: translate('screens/payment', 'Tag'),
                                text: payRequest.tag,
                              },
                              {
                                label: translate('screens/payment', 'Route'),
                                text: payRequest.route,
                              },
                              {
                                label: translate('screens/payment', 'Callback'),
                                text: blankedAddress((payRequest as PaymentLinkPayRequest).callback ?? '', { width }),
                                icon: IconVariant.COPY,
                                onClick: () => copy((payRequest as PaymentLinkPayRequest).callback),
                              },
                            ].filter((item) => item.text) as any
                          }
                        >
                          <p>{blankedAddress(payRequest.externalId ?? payRequest.id, { width, scale: 0.9 })}</p>
                        </StyledDataTableExpandableRow>
                      )}
                      {paymentHasQuote(payRequest) && (
                        <>
                          {parsedEvmUri && paymentIdentifier && (
                            <>
                              {parsedEvmUri.amount && (
                                <StyledDataTableRow
                                  label={translate('screens/payment', 'Amount')}
                                  isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                                >
                                  <p>{formatUnits(parsedEvmUri.amount, assetObject?.decimals)}</p>
                                  <CopyButton onCopy={() => copy(parsedEvmUri.amount ?? '')} />
                                </StyledDataTableRow>
                              )}

                              {assetObject && (
                                <StyledDataTableRow label={translate('screens/sell', 'Asset')}>
                                  {showContract && assetObject.chainId ? (
                                    <StyledHorizontalStack gap={2}>
                                      <span>{blankedAddress(assetObject.chainId ?? '', { width, scale: 0.75 })}</span>
                                      <StyledIconButton
                                        icon={IconVariant.COPY}
                                        onClick={() => copy(assetObject.chainId ?? '')}
                                        size={IconSize.SM}
                                      />
                                      {assetObject.explorerUrl && (
                                        <StyledIconButton
                                          icon={IconVariant.OPEN_IN_NEW}
                                          onClick={() => window.open(assetObject.explorerUrl, '_blank')}
                                          size={IconSize.SM}
                                        />
                                      )}
                                    </StyledHorizontalStack>
                                  ) : (
                                    <p>{assetObject.name}</p>
                                  )}
                                  {assetObject.chainId && (
                                    <StyledIconButton
                                      icon={showContract ? IconVariant.INFO : IconVariant.INFO_OUTLINE}
                                      color={IconColor.DARK_GRAY}
                                      onClick={() => setShowContract(!showContract)}
                                    />
                                  )}
                                </StyledDataTableRow>
                              )}

                              {parsedEvmUri.address && (
                                <StyledDataTableRow
                                  label={translate('screens/home', 'Address')}
                                  isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                                >
                                  <p>{blankedAddress(parsedEvmUri.address ?? '', { width, scale: 0.8 })}</p>
                                  <CopyButton onCopy={() => copy(parsedEvmUri.address ?? '')} />
                                </StyledDataTableRow>
                              )}

                              {toBlockchain(parsedEvmUri.chainId ?? '') && (
                                <StyledDataTableRow
                                  label={translate('screens/home', 'Blockchain')}
                                  isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                                >
                                  <p>{toBlockchain(parsedEvmUri.chainId ?? '')}</p>
                                  <CopyButton onCopy={() => copy(toBlockchain(parsedEvmUri.chainId ?? '') ?? '')} />
                                </StyledDataTableRow>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {payRequest.recipient && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'Recipient')}
                          expansionItems={
                            [
                              {
                                label: translate('screens/support', 'Name'),
                                text: payRequest.recipient.name,
                              },
                              {
                                label: translate('screens/home', 'Address'),
                                text:
                                  formatLocationAddress({ ...payRequest.recipient.address, country: undefined }) ?? '',
                              },
                              {
                                label: translate('screens/home', 'Country'),
                                text: payRequest.recipient.address?.country ?? '',
                              },
                              {
                                label: translate('screens/kyc', 'Phone number'),
                                text: payRequest.recipient.phone,
                              },
                              {
                                label: translate('screens/kyc', 'Email address'),
                                text: !payRequest.recipient.mail?.endsWith('@dfx.swiss') && payRequest.recipient.mail,
                              },
                              {
                                label: translate('screens/kyc', 'Website'),
                                text: payRequest.recipient.website,
                                onClick: () => {
                                  const url =
                                    payRequest.recipient.website?.startsWith('http://') ||
                                    payRequest.recipient.website?.startsWith('https://')
                                      ? payRequest.recipient.website
                                      : `https://${payRequest.recipient.website}`;

                                  window.open(url, '_blank');
                                },
                              },
                            ].filter((item) => item.text) as any
                          }
                        >
                          <p>{payRequest.recipient.name}</p>
                        </StyledDataTableExpandableRow>
                      )}
                      {paymentHasQuote(payRequest) && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'Expiry date')}
                          isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                          expansionItems={
                            [
                              {
                                label: translate('screens/support', 'Quote ID'),
                                text: payRequest.quote.id,
                              },
                              {
                                label: translate('screens/home', 'Quote Payment'),
                                text: payRequest.quote.payment,
                              },
                            ].filter((item) => item.text) as any
                          }
                        >
                          <p>{new Date(payRequest.quote.expiration).toLocaleString()}</p>
                        </StyledDataTableExpandableRow>
                      )}
                      {paymentHasQuote(payRequest) && !payRequest.displayQr && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'QR Code')}
                          expansionContent={
                            <div className="flex w-full items-center justify-center">
                              <div className="w-48 my-3">
                                <QrBasic
                                  data={OpenCryptoPayUtils.getOcpUrlByUniqueId(payRequest.id)}
                                  isLoading={isLoadingPaymentIdentifier}
                                />
                              </div>
                            </div>
                          }
                        />
                      )}
                      {(paymentHasQuote(payRequest) || isMerchantMode) && (
                        <StyledDataTableExpandableRow
                          isExpanded={showAssets}
                          label={translate('screens/payment', 'Payment Methods')}
                          expansionContent={<TransferMethodsContent payRequest={payRequest as PaymentLinkPayRequest} />}
                        />
                      )}
                    </StyledDataTable>
                    {paymentHasQuote(payRequest) && selectedPaymentStandard?.blockchain && (
                      <StyledInfoText
                        textSize={StyledInfoTextSize.XS}
                        iconColor={IconColor.GRAY}
                        isLoading={!(timer.minutes > 0 || timer.seconds > 0)}
                        discreet
                      >
                        {translate(
                          'screens/payment',
                          'The exchange rate of {{rate}} {{currency}}/{{asset}} is fixed for {{timer}}, after which it will be recalculated.',
                          {
                            rate: Utils.formatAmount(
                              payRequest.requestedAmount.amount /
                                (payRequest.transferAmounts
                                  .find((item) => item.method === selectedPaymentStandard?.blockchain)
                                  ?.assets.find((item) => item.asset === selectedAsset)?.amount ?? 0),
                            ),
                            currency: payRequest.requestedAmount.asset,
                            asset: selectedAsset ?? '',
                            timer: `${timer.minutes}m ${timer.seconds}s`,
                          },
                        )}
                      </StyledInfoText>
                    )}
                  </StyledVerticalStack>
                </StyledCollapsible>
              )}
              {metaMaskError ? (
                <>
                  <p className="text-dfxRed-100 font-bold my-6">{translate('screens/payment', metaMaskError)}</p>
                </>
              ) : metaMaskInfo ? (
                <>
                  <p className="text-base pt-3 text-dfxGray-700">
                    {translate(
                      'screens/payment',
                      'Complete this payment using {{amount}} {{asset}} on {{blockchain}}.',
                      {
                        amount: metaMaskInfo.transferAmount,
                        asset: metaMaskInfo.transferAsset.name,
                        blockchain: metaMaskInfo.transferAsset.blockchain,
                      },
                    )}
                  </p>
                  <StyledButton
                    label={translate('screens/payment', 'Pay')}
                    onClick={payWithMetaMask}
                    color={StyledButtonColor.RED}
                    className="mb-5"
                    isLoading={isMetaMaskPaying}
                  />
                </>
              ) : (
                (!selectedPaymentStandard ||
                  PaymentStandardType.OPEN_CRYPTO_PAY === (selectedPaymentStandard.id as PaymentStandardType)) && (
                  <StyledVerticalStack full gap={8} center>
                    {paymentHasQuote(payRequest) ? (
                      <div className="flex flex-col w-full items-center justify-center">
                        {payRequest.displayQr && (
                          <div className="w-48 my-3">
                            <QrBasic
                              data={OpenCryptoPayUtils.getOcpUrlByUniqueId(payRequest.id)}
                              isLoading={isLoadingPaymentIdentifier}
                            />
                          </div>
                        )}
                        <p className="text-base pt-3 text-dfxGray-700">
                          {translate(
                            'screens/payment',
                            'Scan the QR-Code with a compatible app to complete the payment.',
                          )}
                        </p>
                      </div>
                    ) : payRequest?.mode === PaymentLinkMode.PUBLIC ? (
                      <p className="text-base pt-3 text-dfxGray-700" />
                    ) : (
                      <p className="text-base pt-3 text-dfxGray-700">
                        {translate(
                          'screens/payment',
                          'Tell the cashier that you want to pay with crypto and then scan the QR-Code with a compatible app to complete the payment.',
                        )}
                      </p>
                    )}
                    {walletData ? (
                      <StyledVerticalStack full gap={4} center>
                        <div className="relative flex flex-col items-center w-full gap-6">
                          <DividerWithHeader header={walletData.name} />
                          <button
                            className="absolute top-[88px] left-14 bg-dfxGray-400 w-9 h-9 pl-1.5 rounded-full flex items-center justify-center"
                            onClick={handleBackButton}
                          >
                            <DfxIcon icon={IconVariant.BACK} size={IconSize.SM} color={IconColor.BLUE} />
                          </button>
                          <WalletLogo wallet={walletData} size={128} />

                          <StyledVerticalStack full gap={3} center className="pt-2 px-4">
                            {(paymentHasQuote(payRequest) || isMerchantMode) && (
                              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                                <StyledCollapsible
                                  full
                                  isExpanded={true}
                                  titleContent={
                                    <div className="flex flex-col items-start gap-1.5 text-left -my-1">
                                      <div className="flex flex-col items-start text-left">
                                        <div className="font-semibold leading-none">
                                          {translate('screens/payment', 'Payment Methods')}
                                        </div>
                                      </div>
                                      <div className="leading-none text-dfxGray-800 text-xs">
                                        {translate('screens/payment', 'Supported cryptocurrencies and blockchains')}
                                      </div>
                                    </div>
                                  }
                                >
                                  <TransferMethodsContent
                                    payRequest={payRequest as PaymentLinkPayRequest}
                                    walletData={walletData}
                                  />
                                </StyledCollapsible>
                              </StyledDataTable>
                            )}
                            {isLoadingDeeplink && !walletData.disabled ? (
                              <StyledLoadingSpinner variant={SpinnerVariant.LIGHT_MODE} size={SpinnerSize.MD} />
                            ) : (
                              <StyledButton
                                label={translate('screens/home', 'Pay in app')}
                                onClick={() => window.open(walletData.deepLink, '_blank')}
                                color={StyledButtonColor.BLUE}
                                width={StyledButtonWidth.FULL}
                                hidden={
                                  !walletData.deepLink ||
                                  !paymentIdentifier ||
                                  !paymentHasQuote(payRequest) ||
                                  walletData.disabled
                                }
                              />
                            )}
                            <StyledButton
                              label={translate('screens/home', 'Open website')}
                              onClick={() => window.open(walletData.websiteUrl, '_blank')}
                              color={StyledButtonColor.STURDY_WHITE}
                              width={StyledButtonWidth.FULL}
                              hidden={!walletData.websiteUrl || payRequest?.mode === PaymentLinkMode.PUBLIC}
                            />
                            <div
                              className="flex flex-row gap-3 w-full justify-center pt-5 pb-2"
                              hidden={!walletData.playStoreUrl && !walletData.appStoreUrl}
                            >
                              <AppStoreBadge type={BadgeType.PLAY_STORE} url={walletData.playStoreUrl} />
                              <AppStoreBadge type={BadgeType.APP_STORE} url={walletData.appStoreUrl} />
                            </div>
                          </StyledVerticalStack>
                        </div>
                      </StyledVerticalStack>
                    ) : (
                      <>
                        {(payRequest?.mode !== PaymentLinkMode.PUBLIC || paymentHasQuote(payRequest)) && (
                          <>
                            <WalletGrid
                              wallets={recommendedWallets}
                              header={translate('screens/payment', 'Recommended apps')}
                            />
                            <WalletGrid
                              wallets={otherWallets}
                              header={translate('screens/payment', 'Compatible apps')}
                            />
                            <WalletGrid
                              wallets={semiCompatibleWallets}
                              header={translate('screens/payment', 'Semi compatible apps')}
                            />
                          </>
                        )}
                      </>
                    )}
                  </StyledVerticalStack>
                )
              )}
            </>
          )}
          {<DividerWithHeader header={translate('screens/payment', 'Locations').toUpperCase()} />}
          <div ref={mapRef} className="flex flex-col gap-4 w-full">
            <div className="w-full h-96 rounded-md overflow-clip">
              <iframe
                src="https://www.google.com/maps/d/embed?mid=1DzX6z5tnUqn1zlzFnL6G58xREItorRM&ehbc=2E312F&noprof=1"
                width="100%"
                height="100%"
              ></iframe>
            </div>
            <div className="w-full leading-none">
              <StyledButton
                label={translate('screens/payment', 'Learn more about OpenCryptoPay')}
                onClick={() => window.open('https://opencryptopay.io', '_blank')}
                color={StyledButtonColor.STURDY_WHITE}
                width={StyledButtonWidth.FULL}
              />
            </div>
          </div>

          <div className="p-1 w-full leading-none">
            <StyledLink
              label={translate(
                'screens/payment',
                'By using this service, the outstanding claim of the above-mentioned company against DFX is assigned, and the General Terms and Conditions of DFX AG apply.',
              )}
              url={process.env.REACT_APP_TNC_URL}
              small
              dark
            />
          </div>
        </StyledVerticalStack>
      )}
    </>
  );
}

interface TransferMethodsContentProps {
  payRequest: PaymentLinkPayRequest;
  walletData?: WalletInfo;
}

function TransferMethodsContent({ payRequest, walletData }: TransferMethodsContentProps) {
  const { translate } = useSettingsContext();
  const { isMerchantMode } = usePaymentLinkContext();

  const filteredTransferAmounts = walletData
    ? Wallet.filterTransferInfoByWallet(walletData, payRequest.transferAmounts)
    : payRequest.transferAmounts;
  const supportedMethods = filteredTransferAmounts.filter((ta) => ta.available !== false);

  const assetMap = new Map<string, { amount: string; methods: string[] }>();
  supportedMethods.forEach((transferMethod) => {
    transferMethod.assets.forEach((asset) => {
      if (!assetMap.has(asset.asset)) {
        assetMap.set(asset.asset, {
          amount: String(asset.amount),
          methods: [],
        });
      }
      const data = assetMap.get(asset.asset)!;
      data.methods.push(transferMethod.method);
    });
  });

  return (
    assetMap.size > 0 && (
      <div className="flex flex-col gap-2.5">
        {Array.from(assetMap.entries()).map(([assetName, data]) => {
          return (
            <div
              key={assetName}
              className="flex flex-col justify-start sm:flex-row sm:justify-between text-sm px-2 py-2 even:bg-dfxGray-300/40 rounded"
            >
              <div className="flex items-baseline gap-2">
                {!isMerchantMode && <span className="text-dfxBlue-800 font-medium">{data.amount}</span>}
                <span className="text-dfxBlue-800">{assetName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-left text-dfxGray-700">
                {data.methods.join(', ')}
              </div>
            </div>
          );
        })}
        {!isMerchantMode && (
          <StyledCollapsible
            full
            titleContent={
              <div className="text-dfxGray-700 text-sm text-left">
                {translate('screens/payment', 'Minimum network fees')}
              </div>
            }
          >
            <div className="flex flex-col gap-2 pt-2">
              {supportedMethods.map((m) => (
                <div key={m.method} className="flex justify-between items-center text-dfxGray-700 text-xs px-2">
                  <span className="text-dfxGray-700">{m.method}</span>
                  <span className="text-dfxGray-700">{m.minFee ? m.minFee : 'N/A'}</span>
                </div>
              ))}
            </div>
          </StyledCollapsible>
        )}
      </div>
    )
  );
}

interface PaymentStatusTileProps {
  status?: ExtendedPaymentLinkStatus;
  filterStatuses?: ExtendedPaymentLinkStatus[];
}

function PaymentStatusTile({ status, filterStatuses }: PaymentStatusTileProps): JSX.Element {
  const { translate } = useSettingsContext();

  if (!status || status === PaymentLinkPaymentStatus.PENDING || (filterStatuses && filterStatuses.includes(status))) {
    return <></>;
  }

  let tileBackgroundStyle = 'flex flex-col items-center justify-center w-full py-16 rounded-lg border';
  let iconStyle = 'text-[7rem] m-auto';

  switch (status) {
    case PaymentLinkPaymentStatus.COMPLETED:
      tileBackgroundStyle += ' bg-[#4BB543]/10 border-[#4BB543]';
      iconStyle += ' text-[#4BB543]';
      break;
    case PaymentLinkPaymentStatus.CANCELLED:
      tileBackgroundStyle += ' bg-[#FF4444]/10 border-[#FF4444]';
      iconStyle += ' text-[#FF4444]';
      break;
    case PaymentLinkPaymentStatus.EXPIRED:
      tileBackgroundStyle += ' bg-[#65728A]/10 border-[#65728A]';
      iconStyle += ' text-[#65728A]';
      break;
    case NoPaymentLinkPaymentStatus.NO_PAYMENT:
      tileBackgroundStyle += ' bg-[#65728A]/10 border-[#65728A]';
      iconStyle += ' text-[#65728A]';
      break;
  }

  const statusIcon = {
    [PaymentLinkPaymentStatus.COMPLETED]: <GoCheckCircleFill />,
    [PaymentLinkPaymentStatus.CANCELLED]: <GoXCircleFill />,
    [PaymentLinkPaymentStatus.EXPIRED]: <GoClockFill />,
    [NoPaymentLinkPaymentStatus.NO_PAYMENT]: <GoSkip />,
  };

  const statusLabel = {
    [PaymentLinkPaymentStatus.COMPLETED]: 'Completed',
    [PaymentLinkPaymentStatus.CANCELLED]: 'Cancelled',
    [PaymentLinkPaymentStatus.EXPIRED]: 'Expired',
    [NoPaymentLinkPaymentStatus.NO_PAYMENT]: 'No payment active',
  };

  return (
    <div className={tileBackgroundStyle}>
      <div className={iconStyle}>{statusIcon[status]}</div>
      <p className="text-dfxBlue-800 font-bold text-xl mt-4 leading-snug">
        {translate('screens/payment', statusLabel[status]).toUpperCase()}
      </p>
    </div>
  );
}

interface WalletGridProps {
  wallets: WalletInfo[];
  header?: string;
}

function WalletGrid({ wallets, header }: WalletGridProps): JSX.Element {
  const { navigate } = useNavigation();

  if (!wallets.length) return <></>;

  return (
    <div className="flex flex-col w-full gap-4 px-4">
      {header && <DividerWithHeader header={header.toUpperCase()} />}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
        {wallets.map((wallet) => {
          return (
            <div
              key={wallet.name}
              className="flex flex-col items-center gap-2 max-w-[120px] min-w-0 cursor-pointer"
              onClick={() => navigate({ pathname: '/pl', search: `?wallet-id=${wallet.id}` })}
            >
              <WalletLogo wallet={wallet} size={60} />
              <p className="text-center font-semibold text-dfxGray-600 w-full text-xs truncate">{wallet.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DividerWithHeader({ header, py }: { header: string; py?: number }): JSX.Element {
  const pyClass = py === 4 ? 'py-4' : py === 2 ? 'py-2' : py === 1 ? 'py-1' : '';

  return (
    <div className={`flex flex-row items-center gap-2 ${pyClass} w-full`}>
      <div className="flex-grow bg-gradient-to-r from-white to-dfxGray-600 h-[1px]" />
      <p className="text-xs font-medium text-dfxGray-600 whitespace-nowrap">{header}</p>
      <div className="flex-grow bg-gradient-to-r from-dfxGray-600 to-white h-[1px]" />
    </div>
  );
}

function WalletLogo({ wallet, size }: { wallet: WalletInfo; size: number }): JSX.Element {
  return (
    <LazyLoadImage
      className="border border-dfxGray-400 shadow-md bg-white rounded-md"
      src={wallet.iconUrl}
      alt={wallet.name}
      effect="opacity"
      width={size}
      height={size}
      placeholderSrc={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}'%3E%3Crect width='${size}' height='${size}' fill='%23f4f5f6'/%3E%3C/svg%3E`}
    />
  );
}

function CreatePublicPaymentForm({ paymentRequest }: { paymentRequest: PaymentLinkPayTerminal }): JSX.Element {
  const { call } = useApi();
  const { translate, translateError } = useSettingsContext();
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ amount: number }>({
    mode: 'onTouched',
  });

  const rules = Utils.createRules({
    amount: [Validations.Required],
  });

  const activate = (data: { amount: number }) => {
    setIsActivating(true);
    const params = new URLSearchParams({
      externalLinkId: paymentRequest.externalId as string,
      route: paymentRequest.route,
    });

    return call<PaymentLink>({
      url: `paymentLink/payment?${params.toString()}`,
      method: 'POST',
      data: {
        amount: +data.amount,
        externalId: Math.random().toString(36).substring(2, 15),
      },
    }).catch((error: ApiError) => {
      setError(error.message ?? 'Unknown error');
      setIsActivating(false);
    });
  };

  return (
    <div className="w-full mb-3">
      <Form
        control={control}
        rules={rules}
        errors={errors}
        translate={translateError}
        onSubmit={handleSubmit(activate)}
      >
        <StyledVerticalStack full gap={4} center>
          <p className="text-base text-dfxGray-700">
            {translate('screens/payment', 'Insert the amount to active the payment.')}
          </p>
          <StyledInput
            label={translate('screens/payment', 'Amount in {{currencyName}}', {
              currencyName: paymentRequest.currency,
            })}
            name="amount"
            control={control}
            type="number"
            placeholder={`10 ${paymentRequest.currency}`}
            full
          />
          <StyledButton
            type="submit"
            width={StyledButtonWidth.FULL}
            label={translate('screens/payment', 'Activate')}
            onClick={handleSubmit(activate)}
            isLoading={isActivating}
          />
          {error && <ErrorHint message={error} />}
        </StyledVerticalStack>
      </Form>
    </div>
  );
}

function EditPublicPaymentForm({ paymentRequest }: { paymentRequest: PaymentLinkPayTerminal }): JSX.Element {
  const { call } = useApi();
  const { translate, translateError } = useSettingsContext();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>();

  const { control, handleSubmit } = useForm<{ amount: number }>({
    mode: 'onTouched',
  });

  const edit = () => {
    setIsEditing(true);
    const params = new URLSearchParams({
      externalLinkId: paymentRequest.externalId as string,
      route: paymentRequest.route,
    });

    return call<PaymentLink>({
      url: `paymentLink/payment?${params.toString()}`,
      method: 'DELETE',
    }).catch((error: ApiError) => {
      setError(error.message ?? 'Unknown error');
      setIsEditing(false);
    });
  };

  return (
    <div className="w-full mb-3">
      <Form control={control} errors={{}} translate={translateError} onSubmit={handleSubmit(edit)}>
        <StyledVerticalStack full gap={4} center>
          <StyledButton
            type="submit"
            width={StyledButtonWidth.FULL}
            label={translate('general/actions', 'Edit')}
            onClick={handleSubmit(edit)}
            isLoading={isEditing}
          />
          {error && <ErrorHint message={error} />}
        </StyledVerticalStack>
      </Form>
    </div>
  );
}
