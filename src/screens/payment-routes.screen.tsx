import {
  ApiError,
  Blockchain,
  PaymentRoute,
  PaymentRoutesDto,
  usePaymentRoutes,
  useUserContext,
} from '@dfx.swiss/react';
import {
  CopyButton,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { ErrorHint } from '../components/error-hint';

export default function PaymentRoutes(): JSX.Element {
  const { translate } = useSettingsContext();
  const [routes, setRoutes] = useState<PaymentRoutesDto>();
  const rootRef = useRef<HTMLDivElement>(null);
  const { user } = useUserContext();
  const { toString } = useBlockchain();
  const { getPaymentRoutes } = usePaymentRoutes();

  const [error, setError] = useState<string>();

  function sortRoutes(a: PaymentRoute, b: PaymentRoute): number {
    if ('asset' in a && 'asset' in b) {
      return a.asset.blockchain.localeCompare(b.asset.blockchain);
    } else if ('currency' in a && 'currency' in b) {
      return a.currency.name.localeCompare(b.currency.name);
    } else {
      return 0;
    }
  }

  useEffect(() => {
    if (!user) return;
    getPaymentRoutes()
      .then((routes: PaymentRoutesDto) => {
        routes.buy = routes.buy.filter((route) => route.active).sort(sortRoutes);
        routes.sell = routes.sell.filter((route) => route.active).sort(sortRoutes);
        routes.swap = routes.swap.filter((route) => route.active).sort(sortRoutes);
        setRoutes(routes);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [user]);

  return (
    <Layout title={translate('screens/payment', 'Payment routes')} onBack={undefined} textStart rootRef={rootRef}>
      {error ? (
        <ErrorHint message={error} />
      ) : !routes ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4}>
          {routes?.buy.length && (
            <StyledDataTable label={translate('screens/payment', 'Buy')}>
              {routes.buy.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={`${route.asset.blockchain} / ${route.asset.name}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                    { label: translate('screens/payment', 'Purpose of payment'), text: route.bankUsage },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  {route.bankUsage}
                  <CopyButton onCopy={() => copy(route.bankUsage)} />
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          )}
          {routes?.sell.length && (
            <StyledDataTable label={translate('screens/payment', 'Sell')}>
              {routes.sell.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={`${route.currency.name} / ${route.iban}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Currency'), text: route.currency.name },
                    { label: translate('screens/payment', 'IBAN'), text: route.iban },
                    {
                      label: translate('screens/payment', 'Deposit address'),
                      text: route.deposit.address,
                    },
                    {
                      label: translate('screens/payment', 'Deposit blockchains'),
                      text: route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', '),
                    },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  <p className="text-right overflow-ellipsis">
                    {route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', ')}
                  </p>
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          )}
          {routes?.swap.length && (
            <StyledDataTable label={translate('screens/payment', 'Swap')}>
              {routes.swap.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={`${route.asset.blockchain} / ${route.asset.name}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                    {
                      label: translate('screens/payment', 'Deposit address'),
                      text: route.deposit.address,
                    },
                    {
                      label: translate('screens/payment', 'Deposit blockchains'),
                      text: route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', '),
                    },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  <p className="text-right overflow-ellipsis">
                    {route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', ')}
                  </p>
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}