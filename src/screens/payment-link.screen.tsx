import { Asset, PaymentLinkPaymentStatus, useAssetContext, Utils } from '@dfx.swiss/react';
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
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { PaymentStandardType } from '@dfx.swiss/react/dist/definitions/route';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { GoCheckCircleFill, GoClockFill, GoSkip, GoXCircleFill } from 'react-icons/go';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { useSearchParams } from 'react-router-dom';
import { QrBasic } from 'src/components/payment/qr-code';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import {
  ExtendedPaymentLinkStatus,
  NoPaymentLinkPaymentStatus,
  PaymentStandard,
  WalletInfo,
} from 'src/dto/payment-link.dto';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useWeb3 } from 'src/hooks/web3.hook';
import { BadgeType } from 'src/util/app-store-badges';
import { EvmUri } from 'src/util/evm-uri';
import { blankedAddress, formatLocationAddress, formatUnits } from 'src/util/utils';
import { AppStoreBadge } from '../components/app-store-badge';
import { Layout } from '../components/layout';

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
    recommendedWallets,
    otherWallets,
    semiCompatibleWallets,
    getWalletByName,
    paymentHasQuote,
    setSessionApiUrl,
    setPaymentIdentifier,
    fetchPayRequest,
    fetchPaymentIdentifier,
    payWithMetaMask,
    getDeeplinkByWalletId,
  } = usePaymentLinkContext();

  const [assetObject, setAssetObject] = useState<Asset>();
  const [showContract, setShowContract] = useState(false);
  const [walletData, setWalletData] = useState<WalletInfo>();
  const [isOpenWallet, setIsOpenWallet] = useState(false);
  const [isTempUnavailable, setIsTempUnavailable] = useState(false);

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
    const walletId = searchParams.get('wallet-id');

    if (walletId) {
      setWalletData(getWalletByName(walletId));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('wallet-id');
      setSearchParams(newParams);
    }
  }, [searchParams]);

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

  const handleBackButton = () => {
    setWalletData(undefined);
    setIsTempUnavailable(false);
  };

  const openWallet = async (walletId: string) => {
    try {
      setIsOpenWallet(true);
      const deeplink = await getDeeplinkByWalletId(walletId);
      if (deeplink) {
        window.open(deeplink, '_blank');
      }
    } catch (error) {
      setIsTempUnavailable(true);
    } finally {
      setIsOpenWallet(false);
    }
  };
  const assetsList =
    paymentHasQuote(payRequest) &&
    payRequest.transferAmounts.find((item) => item.method === selectedPaymentStandard?.blockchain)?.assets;

  const parsedEvmUri =
    selectedPaymentStandard?.id === PaymentStandardType.PAY_TO_ADDRESS && paymentIdentifier
      ? EvmUri.decode(paymentIdentifier)
      : undefined;

  return (
    <Layout backButton={false} smallMenu>
      {error ? (
        <p className="text-dfxGray-800 text-sm mt-4">{error}</p>
      ) : (!payRequest && !merchant) || isLoadingMetaMask ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center className="pt-8">
          <div className="flex flex-col w-full gap-6 justify-center">
            <p className="text-dfxBlue-800 font-bold text-xl">{payRequest?.displayName ?? merchant}</p>
            <div className="w-full h-[1px] bg-gradient-to-r bg-dfxGray-500 from-white via-dfxGray-500 to-white" />
            {!merchant && (
              <>
                {paymentHasQuote(payRequest) ? (
                  <p className="text-xl font-bold text-dfxBlue-800 mb-8">
                    <span className="text-[18px]">{payRequest.requestedAmount.asset} </span>
                    {Utils.formatAmount(payRequest.requestedAmount.amount).replace('.00', '.-').replace(' ', "'")}
                  </p>
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
          <PaymentStatusTile status={paymentStatus} />
          {paymentStatus === PaymentLinkPaymentStatus.PENDING &&
            paymentHasQuote(payRequest) &&
            paymentStandards?.length &&
            !(metaMaskInfo || metaMaskError) && (
              <Form control={control} errors={errors}>
                <StyledVerticalStack full gap={4} center>
                  <StyledDropdown<PaymentStandard>
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
          {[PaymentLinkPaymentStatus.PENDING, NoPaymentLinkPaymentStatus.NO_PAYMENT].includes(paymentStatus) && (
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
                  isExpanded={selectedPaymentStandard?.id === PaymentStandardType.PAY_TO_ADDRESS}
                >
                  <StyledVerticalStack full gap={4} className="text-left">
                    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                      {payRequest.externalId && (
                        <StyledDataTableRow
                          label={translate('screens/payment', 'External ID')}
                          isLoading={isLoadingPaymentIdentifier}
                        >
                          <p>{payRequest.externalId}</p>
                        </StyledDataTableRow>
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
                                      <span>{blankedAddress(assetObject.chainId, { width, scale: 0.75 })}</span>
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
                                text: payRequest.recipient.mail,
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
                        <StyledDataTableRow
                          label={translate('screens/payment', 'Expiry date')}
                          isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                        >
                          <p>{new Date(payRequest.quote.expiration).toLocaleString()}</p>
                        </StyledDataTableRow>
                      )}
                      {paymentHasQuote(payRequest) && !payRequest.displayQr && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'QR Code')}
                          expansionContent={
                            <div className="flex w-full items-center justify-center">
                              <div className="w-48 my-3">
                                <QrBasic
                                  data={paymentIdentifier ?? ''}
                                  isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                                />
                              </div>
                            </div>
                          }
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
                              data={paymentIdentifier ?? ''}
                              isLoading={isLoadingPaymentIdentifier || !paymentIdentifier}
                            />
                          </div>
                        )}
                        <p className="text-base pt-3 text-dfxGray-700">
                          {translate(
                            'screens/payment',
                            'Scan the QR-Code with a compatible wallet to complete the payment.',
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-base pt-3 text-dfxGray-700">
                        {translate(
                          'screens/payment',
                          'Tell the cashier that you want to pay with crypto and then scan the QR-Code with a compatible wallet to complete the payment.',
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
                            <StyledButton
                              label={
                                isTempUnavailable
                                  ? translate('screens/home', 'App temporarily unavailable')
                                  : translate('screens/home', 'Pay in app')
                              }
                              onClick={() => openWallet(walletData.id)}
                              color={StyledButtonColor.BLUE}
                              width={StyledButtonWidth.FULL}
                              hidden={!walletData.deepLink}
                              isLoading={isOpenWallet}
                              disabled={isTempUnavailable}
                            />
                            <StyledButton
                              label={translate('screens/home', 'Open website')}
                              onClick={() => window.open(walletData.websiteUrl, '_blank')}
                              color={StyledButtonColor.STURDY_WHITE}
                              width={StyledButtonWidth.FULL}
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
                        <WalletGrid
                          wallets={recommendedWallets}
                          header={translate('screens/payment', 'Recommended wallets')}
                        />
                        <WalletGrid
                          wallets={otherWallets}
                          header={translate('screens/payment', 'Other compatible wallets')}
                        />
                        <WalletGrid
                          wallets={semiCompatibleWallets}
                          header={translate('screens/payment', 'Semi compatible wallets')}
                        />
                      </>
                    )}
                  </StyledVerticalStack>
                )
              )}
            </>
          )}

          <div className="pt-4 pb-2 w-full leading-none">
            <StyledLink
              label={translate('screens/payment', 'Find out more about the OpenCryptoPay payment standard')}
              url="https://opencryptopay.io"
              dark
            />
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
    </Layout>
  );
}

interface PaymentStatusTileProps {
  status?: ExtendedPaymentLinkStatus;
}

function PaymentStatusTile({ status }: PaymentStatusTileProps): JSX.Element {
  const { translate } = useSettingsContext();

  if (!status || status === PaymentLinkPaymentStatus.PENDING) {
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

  return (
    <div className="flex flex-col w-full gap-4 px-4">
      {header && <DividerWithHeader header={header.toUpperCase()} />}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
        {wallets.map((wallet) => {
          return (
            <div
              key={wallet.name}
              className={`flex flex-col items-center gap-2 max-w-[120px] min-w-0 ${!wallet.disabled ? 'cursor-pointer' : 'opacity-50'}`}
              onClick={
                wallet.disabled ? undefined : () => navigate({ pathname: '/pl', search: `?wallet-id=${wallet.id}` })
              }
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

function DividerWithHeader({ header }: { header: string }): JSX.Element {
  return (
    <div className="flex flex-row items-center gap-2 w-full">
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
