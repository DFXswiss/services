import { ApiError, Blockchain, PaymentLinkPayRequest } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  SpinnerSize,
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
import { blankedAddress } from 'src/util/utils';
import { Layout } from '../components/layout';

const noPaymentErrorMessage = 'No pending payment found';

interface FormData {
  paymentMethod: PaymentMethod;
}

interface PaymentMethod {
  label: string;
  description: string;
}

interface PaymentResponse {
  paymentIdentifier: string;
  paymentIdentifierLabel: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    label: 'OpenCryptoPay.io',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
  },
  {
    label: 'FrankencoinPay.com',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
  },
  {
    label: 'Bitcoin Lightning',
    description: 'Pay with a Bolt 11 Invoice',
  },
  {
    label: 'Ethereum URI',
    description: 'Pay with a standard Ethereum Wallet',
  },
];

export default function PaymentLinkScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { width } = useWindowContext();
  const [urlParams, setUrlParams] = useSearchParams();

  const [paymentLinkPayRequest, setPaymentLinkPayRequest] = useState<PaymentLinkPayRequest>();
  const [genericPaymentResponse, setGenericPaymentResponse] = useState<PaymentResponse>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const [lightningParam, setLightningParam] = useState(() => {
    const savedState = sessionStorage.getItem('lightningParam');
    return savedState ? JSON.parse(savedState) : '';
  });

  const {
    control,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { paymentMethod: paymentMethods[0] },
  });

  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });

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
    if (!paymentLinkPayRequest || !lightningParam) return;
    switch (selectedPaymentMethod.label) {
      case 'OpenCryptoPay.io':
      case 'FrankencoinPay.com':
        setGenericPaymentResponse({
          paymentIdentifier: lightningParam,
          paymentIdentifierLabel: 'LNURL',
        });
        break;
      case 'Bitcoin Lightning':
        setIsLoading(true);
        const callbackWithMinSendable = `${paymentLinkPayRequest.callback}/?amount=${paymentLinkPayRequest.minSendable}`;
        fetchDataApi(callbackWithMinSendable)
          .then((data) => {
            setGenericPaymentResponse({
              paymentIdentifier: data.pr,
              paymentIdentifierLabel: 'LNR',
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
        break;
      case 'Ethereum URI':
        setIsLoading(true);
        const ethTransferAmount = paymentLinkPayRequest.transferAmounts.find(
          (item) => item.method === Blockchain.ETHEREUM,
        );
        const callbackWithParams = `${paymentLinkPayRequest.callback}/?amount=${ethTransferAmount?.amount}&asset=${ethTransferAmount?.asset}&method=${ethTransferAmount?.method}`;
        fetchDataApi(callbackWithParams)
          .then((data) => {
            setGenericPaymentResponse({
              paymentIdentifier: data.uri,
              paymentIdentifierLabel: 'URI',
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
        break;
    }
  }, [paymentLinkPayRequest, selectedPaymentMethod]);

  async function fetchInitial(url: string) {
    fetchDataApi(url, true)
      .then((data) => {
        setError(undefined);
        setPaymentLinkPayRequest(data);
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
    }

    setError(undefined);
    return data;
  }

  const filteredTransferAmounts = paymentLinkPayRequest?.transferAmounts
    .filter(
      (item) =>
        (item.method === 'Lightning' && item.asset === 'BTC') || (item.method === 'Ethereum' && item.asset === 'ZCHF'),
    )
    .map((item) => ({
      ...item,
      method: item.method === 'Ethereum' ? 'EVM' : item.method,
    }));

  return (
    <Layout backButton={false}>
      {error ? (
        <PaymentErrorHint message={error} />
      ) : !paymentLinkPayRequest || !genericPaymentResponse ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center>
          <Form control={control} errors={errors}>
            <StyledDropdown<PaymentMethod>
              name="paymentMethod"
              placeholder={translate('screens/payment', 'Payment method')}
              items={paymentMethods}
              labelFunc={(item) => item.label}
              descriptionFunc={(item) => translate('screens/payment', item.description)}
              full
              smallLabel
            />
          </Form>
          {isLoading ? (
            <div className="mt-4">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            <>
              <div className="flex w-full items-center justify-center">
                <div className="w-48 py-3">
                  <QrBasic data={genericPaymentResponse.paymentIdentifier} />
                </div>
              </div>
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableRow label={translate('screens/payment', 'State')}>
                  <p className="font-semibold">{translate('screens/payment', 'Pending').toUpperCase()}</p>
                </StyledDataTableRow>
                <StyledDataTableRow label={genericPaymentResponse.paymentIdentifierLabel}>
                  <p>{blankedAddress(genericPaymentResponse.paymentIdentifier, { width })}</p>
                  <CopyButton onCopy={() => copy(genericPaymentResponse.paymentIdentifier)} />
                </StyledDataTableRow>
                <StyledDataTableRow label={translate('screens/payment', 'Name')}>
                  <div>{JSON.parse(paymentLinkPayRequest.metadata)[0][1]}</div>
                </StyledDataTableRow>
                {(filteredTransferAmounts && filteredTransferAmounts.length > 0
                  ? filteredTransferAmounts
                  : paymentLinkPayRequest.transferAmounts
                ).map((item, index) => (
                  <StyledDataTableRow key={index} label={item.method}>
                    <p>
                      {item.amount} {item.asset}
                    </p>
                  </StyledDataTableRow>
                ))}
              </StyledDataTable>
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
