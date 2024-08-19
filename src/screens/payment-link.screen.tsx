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
    name: 'Frankencoin',
    websiteUrl: 'https://frankencoin.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/1.webp',
  },
  {
    name: 'Wallet of Satoshi',
    websiteUrl: 'https://www.walletofsatoshi.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/2.webp',
  },
  {
    name: 'Phoenix',
    websiteUrl: 'https://phoenix.acinq.co/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/3.webp',
  },
  {
    name: 'Cake Wallet',
    websiteUrl: 'https://cakewallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/4.webp',
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
          <div className="flex flex-col w-full justify-center">
            <p className="text-dfxGray-700 font-semibold text-base">{payRequest.displayName}</p>
            <p className="text-xl pt-4 pb-3 font-bold text-dfxBlue-800">
              {payRequest.requestedAmount.asset}{' '}
              {Utils.formatAmount(payRequest.requestedAmount.amount).replace('.00', '.-').replace(' ', "'")}
            </p>
          </div>
          <Form control={control} errors={errors}>
            <StyledVerticalStack full gap={4} center>
              <StyledDropdown<PaymentMethod>
                name="paymentMethod"
                items={[
                  ...paymentMethods,
                  ...payRequest.transferAmounts.map((item) => ({
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
                  <div className="flex flex-row justify-between gap-2 items-center">
                    <div className="flex flex-col items-start text-left">
                      <div className="font-bold leading-none">
                        {translate('screens/payment', 'Additional information')}
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="flex w-full items-center justify-center">
                  <div className="w-48 py-3">
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
              <CompatibleWallets />
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
  return (
    <div className="flex flex-col w-full gap-3 px-5">
      <p className="text-base pt-3 pb-3 text-dfxGray-700">
        Scan the QR-Code with a compatible wallet to complete the payment.
      </p>
      <div className="flex flex-row justify-center gap-4">
        {compatibleWallets.map((wallet) => (
          <div
            key={wallet.name}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
            onClick={() => window.open(wallet.websiteUrl)}
          >
            <img
              className="border border-dfxGray-400 shadow-md bg-white rounded-md overflow-clip"
              src={wallet.iconUrl}
              alt={wallet.name}
              width="80"
              height="80"
            />
            <p className="text-center text-xs font-semibold text-dfxGray-600 w-[80px]">{wallet.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
