import { Asset, Blockchain, useAssetContext, Utils } from '@dfx.swiss/react';
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
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { useNavigation } from 'src/hooks/navigation.hook';
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

interface FormData {
  paymentStandard: PaymentStandard;
  asset: string;
}

export default function PaymentLinkScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { toBlockchain } = useWeb3();
  const { width } = useWindowContext();
  const { assets } = useAssetContext();

  const { lightning, setParams } = useAppParams();
  const [urlParams, setUrlParams] = useSearchParams();

  const [payRequest, setPayRequest] = useState<PaymentLinkPayTerminal | PaymentLinkPayRequest>();
  const [paymentIdentifier, setPaymentIdentifier] = useState<string>();
  const [paymentStandards, setPaymentStandards] = useState<PaymentStandard[]>();
  const [assetObject, setAssetObject] = useState<Asset>();
  const [showContract, setShowContract] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const refetchTimeout = useRef<NodeJS.Timeout>();

  const sessionApiUrl = useRef<string>(sessionStorage.getItem('apiUrl') ?? '');
  const currentCallback = useRef<string>();

  const setSessionApiUrl = (newUrl: string) => {
    sessionApiUrl.current = newUrl;
    sessionStorage.setItem('apiUrl', newUrl);
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

    const currentPaymentStandard = new URL(sessionApiUrl.current).searchParams.get('standard');
    const currentMethod = currentCallback.current && new URL(currentCallback.current).searchParams.get('method');

    const newPaymentStandard =
      selectedPaymentStandard ?? paymentStandards?.find((item) => item.id === payRequest.standard);
    const newAsset =
      (currentMethod === newPaymentStandard?.blockchain ? selectedAsset : undefined) ??
      payRequest.transferAmounts.find((item) => item.method === selectedPaymentStandard?.blockchain)?.assets?.[0]
        ?.asset;

    if (!currentPaymentStandard || currentPaymentStandard !== newPaymentStandard?.id) {
      const url = new URL(sessionApiUrl.current);
      url.searchParams.set('standard', newPaymentStandard?.id ?? payRequest.standard);
      setSessionApiUrl(url.toString());
      fetchPayRequest(url.toString());
      setPaymentIdentifier(undefined);
      currentCallback.current = undefined;
    } else {
      fetchPaymentIdentifier(payRequest, newPaymentStandard?.blockchain, newAsset);
    }

    if (!selectedPaymentStandard && newPaymentStandard) setValue('paymentStandard', newPaymentStandard);
    if (!selectedAsset && newAsset && newAsset !== selectedAsset) setValue('asset', newAsset);
    if (newPaymentStandard?.blockchain) {
      setAssetObject(assets.get(newPaymentStandard?.blockchain)?.find((item) => item.name === newAsset));
    } else {
      setAssetObject(undefined);
    }
  }, [payRequest, paymentStandards, selectedPaymentStandard, selectedAsset, assets]);

  async function fetchPayRequest(url: string): Promise<number | undefined> {
    setError(undefined);
    let refetchDelay: number | undefined;

    try {
      const payRequest = await fetchJson(url);
      if (sessionApiUrl.current !== url) return undefined;

      setPayRequest(payRequest);

      if (hasQuote(payRequest)) {
        setPaymentStandardSelection(payRequest);
        refetchDelay = new Date(payRequest.quote.expiration).getTime() - Date.now();
      } else {
        refetchDelay = 1000;
      }

      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
      refetchTimeout.current = setTimeout(() => fetchPayRequest(url), refetchDelay);
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
          {hasQuote(payRequest) && paymentStandards?.length && (
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
                <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                  {hasQuote(payRequest) && (
                    <>
                      <StyledDataTableRow label={translate('screens/payment', 'State')}>
                        <p>{translate('screens/payment', 'Pending')}</p>
                      </StyledDataTableRow>

                      {parsedEvmUri && paymentIdentifier && (
                        <>
                          <StyledDataTableRow
                            label={selectedPaymentStandard?.paymentIdentifierLabel ?? ''}
                            isLoading={isLoading || !paymentIdentifier}
                          >
                            <p>{blankedAddress(paymentIdentifier, { width, scale: 0.8 })}</p>
                            <CopyButton onCopy={() => copy(paymentIdentifier)} />
                          </StyledDataTableRow>

                          {parsedEvmUri.amount && (
                            <StyledDataTableRow
                              label={translate('screens/payment', 'Asset amount')}
                              isLoading={isLoading || !paymentIdentifier}
                            >
                              <p>{formatUnits(parsedEvmUri.amount, (assetObject as any).decimals)}</p>
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

                      <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                        <p>
                          {payRequest.requestedAmount.amount} {payRequest.requestedAmount.asset}
                        </p>
                      </StyledDataTableRow>
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
                            text: formatLocationAddress({ ...payRequest.recipient.address, country: undefined }) ?? '',
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
                <WalletGrid wallets={RecommendedWallets} header={translate('screens/payment', 'Recommended wallets')} />
                <WalletGrid header={translate('screens/payment', 'Other compatible wallets')} />
              </StyledVerticalStack>
            )}
          </>
        </StyledVerticalStack>
      )}
    </Layout>
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
