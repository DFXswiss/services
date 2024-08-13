import { ApiError, PaymentLinkPayRequest } from '@dfx.swiss/react';
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
import { QrCopy } from 'src/components/payment/qr-copy';
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

const paymentMethods: PaymentMethod[] = [
  {
    label: 'OpenCryptoPay.io',
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
  const [urlParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lnurlPayRequest, setLnurlPayRequest] = useState<PaymentLinkPayRequest>();
  const [lightningParam, setLightningParam] = useState<string>();
  const [lnQrCodeLabel, setLnQrCodeLabel] = useState<string>();
  const [lnQrCode, setLnQrCode] = useState<string>();
  const [error, setError] = useState<string>();

  const {
    control,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { paymentMethod: paymentMethods[0] },
  });

  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });

  useEffect(() => {
    if (!urlParams.has('lightning')) {
      navigate('/', { replace: true });
    } else {
      const param = urlParams.get('lightning');
      const decodedUrl = param && Lnurl.decode(param);

      if (!decodedUrl) {
        setError('Invalid payment link.');
        return;
      }

      fetchData(decodedUrl);
      setLightningParam(param);
    }
  }, [urlParams]);

  useEffect(() => {
    if (!lnurlPayRequest) return;
    switch (selectedPaymentMethod.label) {
      case 'OpenCryptoPay.io':
        setLnQrCode(lightningParam);
        setLnQrCodeLabel('LNURL');
        break;
      case 'Bitcoin Lightning':
        setIsLoading(true);
        const callbackWithMinSendable = `${lnurlPayRequest.callback}/?amount=${lnurlPayRequest.minSendable}`;
        fetch(callbackWithMinSendable)
          .then((response) => response.json())
          .then((data) => {
            if (data.error) throw data;
            setError(undefined);
            setLnQrCode(data.pr);
            setLnQrCodeLabel('LNR');
          })
          .catch((e) => {
            const errorMessage = (e as ApiError).message ?? 'Unknown error';
            setError(errorMessage);
          })
          .finally(() => {
            setIsLoading(false);
          });
        break;
    }
  }, [lnurlPayRequest, selectedPaymentMethod]);

  async function fetchData(url: string) {
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw data;
        setError(undefined);
        setLnurlPayRequest(data);
      })
      .catch((e) => {
        const errorMessage = (e as ApiError).message ?? 'Unknown error';
        if (errorMessage === noPaymentErrorMessage) setTimeout(() => fetchData(url), 1000);
        setError(errorMessage);
      });
  }

  const filteredTransferAmounts = lnurlPayRequest?.transferAmounts
    .filter(
      (item) =>
        (item.method === 'Lightning' && item.asset === 'BTC') || (item.method === 'Ethereum' && item.asset === 'ZCHF'),
    )
    .map((item) => ({
      ...item,
      method: item.method === 'Ethereum' ? 'EVM' : item.method,
    }));

  const methodIsEthereumUri = selectedPaymentMethod.label === 'Ethereum URI';

  return (
    <Layout backButton={false}>
      {error ? (
        <PaymentErrorHint message={error} />
      ) : !lnurlPayRequest || !lnQrCode ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center>
          <Form control={control} errors={errors}>
            <StyledDropdown<PaymentMethod>
              name="paymentMethod"
              label={translate('screens/payment', 'Payment method')}
              placeholder={translate('screens/payment', 'Payment method')}
              items={paymentMethods}
              labelFunc={(item) => item.label}
              descriptionFunc={(item) => translate('screens/payment', item.description)}
              full
              smallLabel
            />
          </Form>
          {methodIsEthereumUri ? (
            <p className="text-dfxGray-700 mt-4">{translate('screens/payment', 'This method is not yet available')}</p>
          ) : isLoading ? (
            <div className="mt-4">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            <>
              <div className="flex w-full items-center justify-center">
                <div className="w-48 py-3">
                  <QrCopy data={lnQrCode} />
                  <p className="text-center rounded-sm font-semibold bg-dfxGray-300 text-dfxBlue-800 mt-1">
                    {translate('screens/payment', 'Payment Link')}
                  </p>
                </div>
              </div>
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableRow label={translate('screens/payment', 'State')}>
                  <p className="font-semibold">{translate('screens/payment', 'Pending').toUpperCase()}</p>
                </StyledDataTableRow>
                <StyledDataTableRow label={lnQrCodeLabel}>
                  <p>{blankedAddress(lnQrCode, { width })}</p>
                  <CopyButton onCopy={() => copy(lnQrCode)} />
                </StyledDataTableRow>
                <StyledDataTableRow label={translate('screens/payment', 'Name')}>
                  <div>{JSON.parse(lnurlPayRequest.metadata)[0][1]}</div>
                </StyledDataTableRow>
                {(filteredTransferAmounts && filteredTransferAmounts.length > 0
                  ? filteredTransferAmounts
                  : lnurlPayRequest.transferAmounts
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
