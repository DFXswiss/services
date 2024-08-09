import { ApiError, PaymentLinkPayRequest, useLnUrl } from '@dfx.swiss/react';
import {
  AlignContent,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { QrCopy } from 'src/components/payment/qr-copy';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Lnurl } from 'src/util/lnurl';
import { blankedAddress } from 'src/util/utils';
import { Layout } from '../components/layout';

export default function PaymentLinkScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { width } = useWindowContext();
  const { search } = useLocation();
  const { getLnUrlPayment } = useLnUrl();

  const [lnurlPayRequest, setLnurlPayRequest] = useState<PaymentLinkPayRequest>();
  const [error, setError] = useState<string>();

  const urlParams = new URLSearchParams(search);
  if (!urlParams.has('lightning')) {
    navigate('/', { replace: true });
  }

  const paramLNURL = urlParams.get('lightning');

  useEffect(() => {
    const apiEndpoint = paramLNURL && Lnurl.decode(paramLNURL)?.split('/').pop();
    if (!apiEndpoint) {
      setError('Invalid payment link.');
      return;
    }
    getLnUrlPayment(apiEndpoint)
      .then(setLnurlPayRequest)
      .catch((e) => setError((e as ApiError).message ?? 'Unknown error'));
  }, [paramLNURL]);

  const filteredTransferAmounts = lnurlPayRequest?.transferAmounts
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
        <ErrorHint message={error} />
      ) : !lnurlPayRequest || !paramLNURL ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4}>
          <div className="flex w-full items-center justify-center">
            <div className="w-48 py-3">
              <QrCopy data={Lnurl.prependLnurl(paramLNURL)} />
              <p className="text-center rounded-sm font-semibold bg-dfxGray-300 text-dfxBlue-800 mt-1">
                {translate('screens/payment', 'Payment Link')}
              </p>
            </div>
          </div>
          <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
            <StyledDataTableRow label={translate('screens/payment', 'State')}>
              <p className="font-semibold">{translate('screens/payment', 'Pending').toUpperCase()}</p>
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/payment', 'LNURL')}>
              <p>{blankedAddress(paramLNURL, { width })}</p>
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
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
