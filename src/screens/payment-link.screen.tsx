import { ApiError, Blockchain, Utils } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  SpinnerSize,
  StyledCollapsible,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { QrBasic } from 'src/components/payment/qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Lnurl } from 'src/util/lnurl';
import { blankedAddress, url } from 'src/util/utils';
import { Layout } from '../components/layout';

const noPaymentErrorMessage = 'No pending payment found';

interface FormData {
  paymentMethod: PaymentMethod;
  asset: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  description: string;
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
export interface PaymentLinkPayRequest {
  tag: string;
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  displayName: string;
  quote: Quote;
  requestedAmount: Amount;
  transferAmounts: TransferInfo[];
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'OpenCryptoPay.io',
    label: 'OpenCryptoPay.io',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
  },
  {
    id: 'FrankencoinPay.com',
    label: 'FrankencoinPay.com',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
  },
  {
    id: 'Bitcoin Lightning',
    label: 'Bitcoin Lightning',
    description: 'Pay with a Bolt 11 Invoice',
  },
];

const paymentIdentifierLabelMap: Record<string, string> = {
  'OpenCryptoPay.io': 'LNURL',
  'FrankencoinPay.com': 'LNURL',
  'Bitcoin Lightning': 'LNR',
};

const compatibleWallets = [
  {
    name: 'Alby',
    websiteUrl: 'https://getalby.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Alby.webp',
  },
  {
    name: 'BareBitcoin',
    websiteUrl: 'https://barebitcoin.no/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BareBitcoin.webp',
  },
  {
    name: 'Bipa',
    websiteUrl: 'https://bipa.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bipa.webp',
  },
  {
    name: 'BitBanana',
    websiteUrl: 'https://bitbanana.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BitBanana.webp',
  },
  {
    name: 'Bitkit',
    websiteUrl: 'https://bitkit.to/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bitkit.webp',
  },
  {
    name: 'Blixt',
    websiteUrl: 'https://blixtwallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Blixt.webp',
  },
  {
    name: 'BlueWallet',
    websiteUrl: 'https://bluewallet.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BlueWallet.webp',
  },
  {
    name: 'Breez',
    websiteUrl: 'https://breez.technology/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Breez.webp',
  },
  {
    name: 'BTCPayServer',
    websiteUrl: 'https://btcpayserver.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BTCPayServer.webp',
  },
  {
    name: 'Cake Wallet',
    websiteUrl: 'https://cakewallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/4.webp',
  },
  {
    name: 'CoinCorner',
    websiteUrl: 'https://www.coincorner.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/CoinCorner.webp',
  },
  {
    name: 'Coinos',
    websiteUrl: 'https://coinos.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/coinos.webp',
  },
  {
    name: 'Electrum',
    websiteUrl: 'https://electrum.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Electrum.webp',
  },
  {
    name: 'Fountain',
    websiteUrl: 'https://fountainplatform.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Fountain.webp',
  },
  {
    name: 'Frankencoin',
    websiteUrl: 'https://frankencoin.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Frankencoin.webp',
  },
  {
    name: 'Galoy',
    websiteUrl: 'https://galoy.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Galoy.webp',
  },
  {
    name: 'Geyser',
    websiteUrl: 'https://geyser.fund/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Geyser.webp',
  },
  {
    name: 'LifPay',
    websiteUrl: 'https://lifpay.me/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LifPay.webp',
  },
  {
    name: 'LightningTipBot',
    websiteUrl: 'https://github.com/LightningTipBot/LightningTipBot',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LightningTopBot.webp',
  },
  {
    name: 'LipaWallet',
    websiteUrl: 'https://lipa.swiss/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/lipawallet.webp',
  },
  {
    name: 'LNbits',
    websiteUrl: 'https://lnbits.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LNbits.webp',
  },
  {
    name: 'Machankura',
    websiteUrl: 'https://8333.mobi/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Machankura.webp',
  },
  {
    name: 'Muun',
    websiteUrl: 'https://muun.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/muun.webp',
  },
  {
    name: 'OneKey',
    websiteUrl: 'https://onekey.so/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/OneKey.webp',
  },
  {
    name: 'Phoenix',
    websiteUrl: 'https://phoenix.acinq.co/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Phoenix.webp',
  },
  {
    name: 'PouchPH',
    websiteUrl: 'https://pouch.ph/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Pouchph.webp',
  },
  {
    name: 'River',
    websiteUrl: 'https://river.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/River.webp',
  },
  {
    name: 'ShockWallet',
    websiteUrl: 'https://shockwallet.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/ShockWallet.webp',
  },
  {
    name: 'Wallet of Satoshi',
    websiteUrl: 'https://www.walletofsatoshi.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/WalletofSatoshi.webp',
  },
  {
    name: 'ZEBEDEE',
    websiteUrl: 'https://zbd.gg/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/ZEBEDEE.webp',
  },
  {
    name: 'Zeus',
    websiteUrl: 'https://zeusln.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Zeus.webp',
  },
];

export default function PaymentLinkScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { width } = useWindowContext();
  const [urlParams, setUrlParams] = useSearchParams();

  const [callbackUrl, setCallbackUrl] = useState<string>();
  const [payRequest, setPayRequest] = useState<PaymentLinkPayRequest>();
  const [paymentIdentifier, setPaymentIdentifier] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const [lightningParam, setLightningParam] = useState(() => {
    const savedState = sessionStorage.getItem('lightningParam');
    return savedState ? JSON.parse(savedState) : '';
  });

  const {
    control,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { paymentMethod: paymentMethods[0] },
  });

  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  const selectedEthereumUriAsset = useWatch({ control, name: 'asset' });

  useEffect(() => {
    const param = urlParams.get('lightning') || lightningParam;
    if (!param) {
      navigate('/', { replace: true });
      return;
    }

    const decodedUrl = Lnurl.decode(param);
    if (!decodedUrl) {
      setError('Invalid payment link.');
      return;
    }

    fetchInitial(decodedUrl);

    if (param !== lightningParam) {
      setLightningParam(param);
      sessionStorage.setItem('lightningParam', JSON.stringify(param));
    }

    if (urlParams.has('lightning')) {
      urlParams.delete('lightning');
      setUrlParams(urlParams);
    }
  }, []);

  useEffect(() => {
    resetField('asset');
  }, [selectedPaymentMethod]);

  useEffect(() => {
    if (!payRequest || !lightningParam) return;

    let callback: string;
    setPaymentIdentifier(undefined);
    switch (selectedPaymentMethod.id) {
      case 'OpenCryptoPay.io':
      case 'FrankencoinPay.com':
        setPaymentIdentifier(lightningParam);
        break;
      case 'Bitcoin Lightning':
        callback = url(payRequest.callback, new URLSearchParams({ amount: payRequest.minSendable.toString() }));
        callback !== callbackUrl && setCallbackUrl(callback);
        break;
      default:
        const assets = payRequest.transferAmounts.find((item) => item.method === selectedPaymentMethod.id)?.assets;
        const asset = assets?.find((item) => item.asset === selectedEthereumUriAsset)?.asset ?? assets?.[0]?.asset;
        if (!asset) {
          setError('No asset found for this payment method');
          return;
        }
        callback = url(
          payRequest.callback,
          new URLSearchParams({ quote: payRequest.quote.id, method: selectedPaymentMethod.id, asset }),
        );
        callback !== callbackUrl && setCallbackUrl(callback);
        asset !== selectedEthereumUriAsset && setValue('asset', asset);
        break;
    }
  }, [payRequest, selectedPaymentMethod, selectedEthereumUriAsset]);

  useEffect(() => {
    if (!callbackUrl) return;

    setIsLoading(true);
    fetchDataApi(callbackUrl)
      .then((data) => {
        data && setPaymentIdentifier(data.uri ?? data.pr);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [callbackUrl]);

  async function fetchInitial(url: string) {
    fetchDataApi(url, true)
      .then((data: PaymentLinkPayRequest) => {
        setError(undefined);
        setPayRequest(data);
      })
      .catch((e) => {
        if (e.message === noPaymentErrorMessage) setTimeout(() => fetchInitial(url), 1000);
      });
  }

  async function fetchDataApi(url: string, rethrow = false): Promise<any> {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      setError((data as ApiError).message ?? 'Unknown error');
      if (rethrow) throw data;
      return undefined;
    }

    setError(undefined);
    return data;
  }

  const assetsList = payRequest?.transferAmounts.find((item) => item.method === selectedPaymentMethod.id)?.assets;

  return (
    <Layout backButton={false}>
      {error ? (
        <PaymentErrorHint message={error} />
      ) : !payRequest ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center>
          <div className="flex flex-col w-full gap-6 py-8 justify-center">
            <p className="text-dfxBlue-800 font-bold text-xl">{payRequest.displayName}</p>
            <div className="w-full h-[1px] bg-gradient-to-r bg-dfxGray-500 from-white via-dfxGray-500 to-white" />
            <p className="text-xl font-bold text-dfxBlue-800">
              <span className="text-[18px]">{payRequest.requestedAmount.asset} </span>
              {Utils.formatAmount(payRequest.requestedAmount.amount).replace('.00', '.-').replace(' ', "'")}
            </p>
          </div>
          <Form control={control} errors={errors}>
            <StyledVerticalStack full gap={4} center>
              <StyledDropdown<PaymentMethod>
                name="paymentMethod"
                items={[
                  ...paymentMethods,
                  ...payRequest.transferAmounts
                    .filter((item) => item.method !== 'Lightning')
                    .map((item) => ({
                      id: item.method,
                      label: translate('screens/payment', '{{blockchain}} address', {
                        blockchain: item.method,
                      }),
                      description: translate('screens/payment', 'Pay to a {{blockchain}} Blockchain address', {
                        blockchain: item.method,
                      }),
                    })),
                ]}
                labelFunc={(item) => translate('screens/payment', item.label)}
                descriptionFunc={(item) => translate('screens/payment', item.description)}
                full
                smallLabel
              />

              {assetsList && (
                <StyledDropdown<string>
                  name="asset"
                  items={assetsList?.map((item) => item.asset) ?? []}
                  labelFunc={(item) => item}
                  descriptionFunc={() => selectedPaymentMethod.id ?? ''}
                  full
                  smallLabel
                />
              )}
            </StyledVerticalStack>
          </Form>
          {isLoading || !paymentIdentifier ? (
            <div className="mt-4">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            <>
              <StyledCollapsible
                full
                titleContent={
                  <div className="flex flex-col items-start gap-1.5 text-left">
                    <div className="flex flex-col items-start text-left">
                      <div className="font-bold leading-none">{translate('screens/payment', 'Payment details')}</div>
                    </div>
                    <div className="leading-none text-dfxGray-800 text-xs">
                      {`${translate('screens/payment', 'Your payment details at a glance')}`}
                    </div>
                  </div>
                }
              >
                <div className="flex w-full items-center justify-center">
                  <div className="w-48 pt-3 pb-7">
                    <QrBasic data={paymentIdentifier} />
                  </div>
                </div>
                <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                  <StyledDataTableRow label={translate('screens/payment', 'State')}>
                    <p className="font-semibold">{translate('screens/payment', 'Pending').toUpperCase()}</p>
                  </StyledDataTableRow>
                  <StyledDataTableRow label={paymentIdentifierLabelMap[paymentIdentifier] ?? 'URI'}>
                    <p>{blankedAddress(paymentIdentifier, { width })}</p>
                    <CopyButton onCopy={() => copy(paymentIdentifier)} />
                  </StyledDataTableRow>
                  <StyledDataTableRow label={translate('screens/payment', 'Name')}>
                    <div>{JSON.parse(payRequest.metadata)[0][1]}</div>
                  </StyledDataTableRow>
                  <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                    <p>
                      {payRequest.requestedAmount.amount} {payRequest.requestedAmount.asset}
                    </p>
                  </StyledDataTableRow>
                </StyledDataTable>
              </StyledCollapsible>
              {['OpenCryptoPay.io', 'FrankencoinPay.com'].includes(selectedPaymentMethod.id) && <CompatibleWallets />}
            </>
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

const PaymentErrorHint = ({ message }: { message: string }): JSX.Element => {
  return message === noPaymentErrorMessage ? (
    <>
      <StyledLoadingSpinner size={SpinnerSize.LG} />
      <p className="text-dfxGray-800 text-sm pt-3">{message}</p>
    </>
  ) : (
    <ErrorHint message={message} />
  );
};

function CompatibleWallets(): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <div className="flex flex-col w-full gap-3 px-5">
      <p className="text-base pt-3 pb-3 text-dfxGray-700">
        {translate('screens/payment', 'Scan the QR-Code with a compatible wallet to complete the payment.')}
      </p>
      <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-center">
        {compatibleWallets.map((wallet) => (
          <div
            key={wallet.name}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => window.open(wallet.websiteUrl)}
            style={{ flex: '1 1 0', maxWidth: '120px', minWidth: '0' }}
          >
            <img
              className="border border-dfxGray-400 shadow-md bg-white rounded-md overflow-clip"
              src={wallet.iconUrl}
              alt={wallet.name}
              style={{ width: '100%', height: 'auto' }}
            />
            <p
              className="text-center font-semibold text-dfxGray-600 w-full text-2xs sm:text-xs truncate"
              style={{
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {wallet.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
