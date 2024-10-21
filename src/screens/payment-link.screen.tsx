import { Asset, Blockchain, useApi, useAssetContext, Utils } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  SpinnerVariant,
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
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { GoCheckCircleFill, GoClockFill, GoXCircleFill } from 'react-icons/go';

import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { QrBasic } from 'src/components/payment/qr-code';
import {
  CompatibleWallets,
  PaymentStandards,
  PaymentStandardType,
  RecommendedWallets,
} from 'src/config/payment-link-wallets';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useCountdown } from 'src/hooks/countdown.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useSessionStore } from 'src/hooks/session-store.hook';
import { useWeb3 } from 'src/hooks/web3.hook';
import { EvmUri } from 'src/util/evm-uri';
import { Lnurl } from 'src/util/lnurl';
import { blankedAddress, fetchJson, formatLocationAddress, formatUnits, url } from 'src/util/utils';
import { Layout } from '../components/layout';

export interface PaymentStandard {
  id: PaymentStandardType;
  label: string;
  description: string;
  paymentIdentifierLabel?: string;
  blockchain?: Blockchain;
}

interface Quote {
  id: string;
  expiration: Date;
  payment: string;
}

interface Amount {
  asset: string;
  amount: number;
}

export type TransferMethod = Blockchain;
export interface TransferInfo {
  method: TransferMethod;
  minFee: number;
  assets: Amount[];
}

export interface PaymentLinkPayTerminal {
  tag: string;
  displayName: string;
  standard: PaymentStandardType;
  possibleStandards: PaymentStandardType[];
  displayQr: boolean;
  recipient: {
    address?: {
      city: string;
      country: string;
      houseNumber: string;
      street: string;
      zip: string;
    };
    name?: string;
    mail?: string;
    phone?: string;
    website?: string;
  };

  // error fields
  statusCode?: number;
  message?: string;
  error?: string;
}

export interface PaymentLinkPayRequest extends PaymentLinkPayTerminal {
  quote: Quote;
  callback: string;
  metadata: string;
  minSendable: number;
  maxSendable: number;
  requestedAmount: Amount;
  transferAmounts: TransferInfo[];
}

enum PaymentLinkPaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired',
}

interface PaymentStatus {
  status: PaymentLinkPaymentStatus;
}

interface FormData {
  paymentStandard: PaymentStandard;
  asset?: string;
}

export default function PaymentLinkScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { toBlockchain } = useWeb3();
  const { width } = useWindowContext();
  const { assets } = useAssetContext();
  const { call } = useApi();
  const { timer, startTimer } = useCountdown();

  const { paymentLinkApiUrl: paymentLinkApiUrlStore } = useSessionStore();
  const { lightning, setParams } = useAppParams();
  const [urlParams, setUrlParams] = useSearchParams();

  const [payRequest, setPayRequest] = useState<PaymentLinkPayTerminal | PaymentLinkPayRequest>();
  const [paymentIdentifier, setPaymentIdentifier] = useState<string>();
  const [paymentStandards, setPaymentStandards] = useState<PaymentStandard[]>();
  const [assetObject, setAssetObject] = useState<Asset>();
  const [showContract, setShowContract] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentLinkPaymentStatus>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const refetchTimeout = useRef<NodeJS.Timeout>();

  const sessionApiUrl = useRef<string>(paymentLinkApiUrlStore.get() ?? '');
  const currentCallback = useRef<string>();

  const setSessionApiUrl = (newUrl: string) => {
    sessionApiUrl.current = newUrl;
    paymentLinkApiUrlStore.set(newUrl);
  };

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
    const lightningParam = lightning;

    let apiUrl: string | undefined;
    if (lightningParam) {
      apiUrl = Lnurl.decode(lightningParam);
      setParams({ lightning: undefined });
    } else if (urlParams.size) {
      apiUrl = `${process.env.REACT_APP_API_URL}/v1/paymentLink/payment?${urlParams.toString()}`;
      setUrlParams(new URLSearchParams());
    }

    if (apiUrl) {
      setSessionApiUrl(apiUrl);
    } else if (!sessionApiUrl.current) {
      navigate('/', { replace: true });
    }

    fetchPayRequest(sessionApiUrl.current);

    return () => {
      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!hasQuote(payRequest)) return;

    const currUrlStandard = new URL(sessionApiUrl.current).searchParams.get('standard');

    if (!currUrlStandard || (selectedPaymentStandard && currUrlStandard !== selectedPaymentStandard?.id)) {
      const url = new URL(sessionApiUrl.current);
      url.searchParams.set('standard', selectedPaymentStandard?.id ?? payRequest.standard);

      setSessionApiUrl(url.toString());
      fetchPayRequest(url.toString());

      setPaymentIdentifier(undefined);
      currentCallback.current = undefined;
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
    if (!hasQuote(payRequest)) return;

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

  async function fetchPayRequest(url: string): Promise<number | undefined> {
    setError(undefined);
    let refetchDelay: number | undefined;

    try {
      const payRequest = await fetchJson(url);
      if (sessionApiUrl.current !== url) return undefined;

      setPayRequest(payRequest);
      setPaymentStatus(undefined);

      if (hasQuote(payRequest)) {
        setPaymentStandardSelection(payRequest);
        awaitPayment(payRequest.quote.payment)
          .then((response) => {
            if (response.status !== PaymentLinkPaymentStatus.PENDING) {
              setPaymentStatus(response.status);
            }
          })
          .catch(() => {
            fetchPayRequest(url);
          });
        refetchDelay = new Date(payRequest.quote.expiration).getTime() - Date.now();
      } else {
        refetchDelay = 1000;
      }

      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
      refetchTimeout.current = setTimeout(() => fetchPayRequest(url), refetchDelay);
      startTimer(new Date(payRequest.quote.expiration));
    } catch (error: any) {
      setError(error.message ?? 'Unknown Error');
    }
  }

  function setPaymentStandardSelection(data: PaymentLinkPayRequest | PaymentLinkPayTerminal) {
    if (!hasQuote(data) || paymentStandards) return;

    const possibleStandards: PaymentStandard[] = data.possibleStandards.flatMap((type: PaymentStandardType) => {
      const paymentStandard = PaymentStandards[type];

      if (type !== PaymentStandardType.PAY_TO_ADDRESS) {
        return paymentStandard;
      } else {
        return data.transferAmounts
          .filter((chain) => chain.method !== 'Lightning')
          .map((chain) => {
            return { ...paymentStandard, blockchain: chain.method };
          });
      }
    });

    setPaymentStandards(possibleStandards);
  }

  async function fetchPaymentIdentifier(
    payRequest: PaymentLinkPayTerminal | PaymentLinkPayRequest,
    selectedPaymentMethod?: Blockchain,
    selectedAsset?: string,
  ): Promise<void> {
    if (
      !hasQuote(payRequest) ||
      (payRequest.standard === PaymentStandardType.PAY_TO_ADDRESS && !(selectedPaymentMethod && selectedAsset))
    )
      return;

    switch (payRequest.standard) {
      case PaymentStandardType.OPEN_CRYPTO_PAY:
      case PaymentStandardType.FRANKENCOIN_PAY:
        currentCallback.current = payRequest.callback;
        setPaymentIdentifier(Lnurl.prependLnurl(Lnurl.encode(simplifyUrl(sessionApiUrl.current))));
        break;
      case PaymentStandardType.LIGHTNING_BOLT11:
        invokeCallback(
          url(
            payRequest.callback,
            new URLSearchParams({ quote: payRequest.quote.id, amount: payRequest.minSendable.toString() }),
          ),
        );
        break;
      case PaymentStandardType.PAY_TO_ADDRESS:
        invokeCallback(
          url(
            payRequest.callback,
            new URLSearchParams({
              quote: payRequest.quote.id,
              method: selectedPaymentMethod ?? '',
              asset: selectedAsset ?? '',
            }),
          ),
        );
        break;
    }
  }

  async function awaitPayment(id: string): Promise<PaymentStatus> {
    return call<PaymentStatus>({
      url: `lnurlp/wait/${id}`,
      method: 'GET',
    });
  }

  async function invokeCallback(callbackUrl: string): Promise<void> {
    if (currentCallback.current === callbackUrl) return;
    currentCallback.current = callbackUrl;

    setIsLoading(true);
    setPaymentIdentifier(undefined);
    fetchJson(callbackUrl)
      .then((response) => {
        if (response && response.statusCode !== 409 && callbackUrl === currentCallback.current) {
          response && setPaymentIdentifier(response.uri ?? response.pr);
        }
      })
      .catch((error) => {
        setError(error.message);
        setPaymentIdentifier(undefined);
      })
      .finally(() => setIsLoading(false));
  }

  function simplifyUrl(url: string): string {
    const replacementMap: { [key: string]: string } = {
      '/v1/paymentLink/payment': '/v1/plp',
      routeId: 'r',
      externalId: 'e',
      message: 'm',
      amount: 'a',
      currency: 'c',
      expiryDate: 'd',
    };

    const urlObj = new URL(url);
    const newPath = replacementMap[urlObj.pathname] || urlObj.pathname;
    const newParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      const shortKey = replacementMap[key] || key;
      newParams.append(shortKey, value);
    });

    return `${urlObj.origin}${newPath}?${newParams.toString()}`;
  }

  function hasQuote(request?: PaymentLinkPayTerminal | PaymentLinkPayRequest): request is PaymentLinkPayRequest {
    return !!request && 'quote' in request;
  }

  const assetsList =
    hasQuote(payRequest) &&
    payRequest.transferAmounts.find((item) => item.method === selectedPaymentStandard?.blockchain)?.assets;

  const parsedEvmUri =
    selectedPaymentStandard?.id === PaymentStandardType.PAY_TO_ADDRESS && paymentIdentifier
      ? EvmUri.decode(paymentIdentifier)
      : undefined;

  return (
    <Layout backButton={false} smallMenu>
      {error ? (
        <ErrorHint message={error} />
      ) : !payRequest ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center>
          <div className="flex flex-col w-full gap-6 py-8 justify-center">
            <p className="text-dfxBlue-800 font-bold text-xl">{payRequest.displayName}</p>
            <div className="w-full h-[1px] bg-gradient-to-r bg-dfxGray-500 from-white via-dfxGray-500 to-white" />
            {hasQuote(payRequest) ? (
              <p className="text-xl font-bold text-dfxBlue-800">
                <span className="text-[18px]">{payRequest.requestedAmount.asset} </span>
                {Utils.formatAmount(payRequest.requestedAmount.amount).replace('.00', '.-').replace(' ', "'")}
              </p>
            ) : (
              <div className="flex w-full justify-center">
                <StyledLoadingSpinner variant={SpinnerVariant.LIGHT_MODE} size={SpinnerSize.MD} />
              </div>
            )}
          </div>
          <PaymentStatusTile status={paymentStatus} />
          {!paymentStatus && hasQuote(payRequest) && paymentStandards?.length && (
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
          {!paymentStatus && (
            <>
              {(hasQuote(payRequest) || payRequest.recipient) && (
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
                      {hasQuote(payRequest) && (
                        <>
                          {parsedEvmUri && paymentIdentifier && (
                            <>
                              {parsedEvmUri.amount && (
                                <StyledDataTableRow
                                  label={translate('screens/payment', 'Amount')}
                                  isLoading={isLoading || !paymentIdentifier}
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
                                  isLoading={isLoading || !paymentIdentifier}
                                >
                                  <p>{blankedAddress(parsedEvmUri.address ?? '', { width, scale: 0.8 })}</p>
                                  <CopyButton onCopy={() => copy(parsedEvmUri.address ?? '')} />
                                </StyledDataTableRow>
                              )}

                              {toBlockchain(parsedEvmUri.chainId ?? '') && (
                                <StyledDataTableRow
                                  label={translate('screens/home', 'Blockchain')}
                                  isLoading={isLoading || !paymentIdentifier}
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
                      {hasQuote(payRequest) && (
                        <StyledDataTableRow
                          label={translate('screens/payment', 'Expiry date')}
                          isLoading={isLoading || !paymentIdentifier}
                        >
                          <p>{new Date(payRequest.quote.expiration).toLocaleString()}</p>
                        </StyledDataTableRow>
                      )}
                      {hasQuote(payRequest) && !payRequest.displayQr && (
                        <StyledDataTableExpandableRow
                          label={translate('screens/payment', 'QR Code')}
                          expansionContent={
                            <div className="flex w-full items-center justify-center">
                              <div className="w-48 my-3">
                                <QrBasic data={paymentIdentifier ?? ''} isLoading={isLoading || !paymentIdentifier} />
                              </div>
                            </div>
                          }
                        />
                      )}
                    </StyledDataTable>
                    {hasQuote(payRequest) && selectedPaymentStandard?.blockchain && (
                      <StyledInfoText textSize={StyledInfoTextSize.XS} iconColor={IconColor.GRAY} discreet>
                        {timer.minutes > 0 || timer.seconds > 0 ? (
                          <>
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
                          </>
                        ) : (
                          <div className="mt-1">
                            <StyledLoadingSpinner size={SpinnerSize.SM} variant={SpinnerVariant.LIGHT_MODE} />
                          </div>
                        )}
                      </StyledInfoText>
                    )}
                  </StyledVerticalStack>
                </StyledCollapsible>
              )}
              {[PaymentStandardType.OPEN_CRYPTO_PAY, PaymentStandardType.FRANKENCOIN_PAY].includes(
                selectedPaymentStandard?.id as PaymentStandardType,
              ) && (
                <StyledVerticalStack full gap={8} center>
                  {hasQuote(payRequest) && (
                    <div className="flex flex-col w-full items-center justify-center">
                      {payRequest.displayQr && (
                        <div className="w-48 my-3">
                          <QrBasic data={paymentIdentifier ?? ''} isLoading={isLoading || !paymentIdentifier} />
                        </div>
                      )}
                      <p className="text-base pt-3 text-dfxGray-700">
                        {translate(
                          'screens/payment',
                          'Scan the QR-Code with a compatible wallet to complete the payment.',
                        )}
                      </p>
                    </div>
                  )}
                  <WalletGrid
                    wallets={RecommendedWallets}
                    header={translate('screens/payment', 'Recommended wallets')}
                  />
                  <WalletGrid header={translate('screens/payment', 'Other compatible wallets')} />
                </StyledVerticalStack>
              )}
            </>
          )}
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
  status?: PaymentLinkPaymentStatus;
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
  }

  const statusIcon = {
    [PaymentLinkPaymentStatus.COMPLETED]: <GoCheckCircleFill />,
    [PaymentLinkPaymentStatus.CANCELLED]: <GoXCircleFill />,
    [PaymentLinkPaymentStatus.EXPIRED]: <GoClockFill />,
  };

  return (
    <div className={tileBackgroundStyle}>
      <div className={iconStyle}>{statusIcon[status]}</div>
      <p className="text-dfxBlue-800 font-bold text-xl mt-4 leading-snug">
        {translate('screens/payment', status).toUpperCase()}
      </p>
    </div>
  );
}

interface WalletGridProps {
  wallets?: string[];
  header?: string;
}

function WalletGrid({ wallets, header }: WalletGridProps): JSX.Element {
  const walletNames = wallets ?? Object.keys(CompatibleWallets);

  return (
    <div className="flex flex-col w-full gap-4 px-4">
      {header && (
        <div className="flex flex-row items-center gap-2">
          <div className="flex-grow bg-gradient-to-r from-white to-dfxGray-600 h-[1px]" />
          <p className="text-xs font-medium text-dfxGray-600 whitespace-nowrap">{header.toUpperCase()}</p>
          <div className="flex-grow bg-gradient-to-r from-dfxGray-600 to-white h-[1px]" />
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
        {walletNames.map((walletName) => {
          const wallet = CompatibleWallets[walletName];

          return (
            <div
              key={walletName}
              className="flex flex-col items-center gap-2 cursor-pointer max-w-[120px] min-w-0"
              onClick={() => window.open(wallet.websiteUrl)}
            >
              <img
                className="border border-dfxGray-400 shadow-md bg-white rounded-md"
                src={wallet.iconUrl}
                alt={walletName}
              />
              <p className="text-center font-semibold text-dfxGray-600 w-full text-xs truncate">{walletName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
