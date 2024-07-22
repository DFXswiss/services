import { ApiError, Asset, Blockchain, Fiat, useApi, useUserContext } from '@dfx.swiss/react';
import {
  CopyButton,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { ErrorHint } from '../components/error-hint';

export interface MinAmount {
  amount: number;
  asset: string;
}

export interface DepositDto {
  id: number;
  address: string;
  blockchains: Blockchain[];
}

export interface BuyRoute {
  id: number;
  active: boolean;
  iban: string;
  asset: Asset;
  bankUsage: string;
  volume: number;
  annualVolume: number;
  fee: number;
  minDeposits: MinAmount[];
  minFee: MinAmount;
}

export interface SellRoute {
  id: number;
  active: boolean;
  deposit: DepositDto;
  iban: string;
  currency: Fiat;
  volume: number;
  annualVolume: number;
  fee: number;
  minDeposits: MinAmount[];
  minFee: MinAmount;
}

export interface SwapRoute {
  id: number;
  active: boolean;
  asset: Asset;
  deposit: DepositDto;
  volume: number;
  annualVolume: number;
  fee: number;
  minDeposits: MinAmount[];
  minFee: MinAmount;
}

export interface RoutesDto {
  buy: BuyRoute[];
  sell: SellRoute[];
  swap: SwapRoute[];
}

export type Route = BuyRoute | SellRoute | SwapRoute;

export function PaymentRoutes(): JSX.Element {
  const { call } = useApi();
  const { translate } = useSettingsContext();
  const [routes, setRoutes] = useState<RoutesDto>();
  const rootRef = useRef<HTMLDivElement>(null);
  const { user } = useUserContext();
  const { toString } = useBlockchain();

  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!user) return;
    getRoutes()
      .then((routes: RoutesDto) => {
        routes.buy = routes.buy.filter((route) => route.active);
        routes.sell = routes.sell.filter((route) => route.active);
        routes.swap = routes.swap.filter((route) => route.active);
        setRoutes(routes);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [user]);

  async function getRoutes(): Promise<RoutesDto> {
    return call({ url: '/route', method: 'GET' });
  }

  return (
    <Layout title={translate('navigation/links', 'Payment routes')} onBack={undefined} textStart rootRef={rootRef}>
      {error ? (
        <ErrorHint message={error} />
      ) : (
        <StyledVerticalStack full gap={4}>
          {routes?.buy.length && (
            <StyledDataTable label={translate('general/links', 'Buy')}>
              {routes.buy.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={`${route.asset.blockchain} / ${route.asset.name}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/payment', 'Blockchain'), text: route.asset.blockchain },
                    { label: translate('screens/payment', 'Purpose of payment'), text: route.bankUsage },
                    {
                      label: translate('screens/payment', 'Volume'),
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
            <StyledDataTable label={translate('general/links', 'Sell')}>
              {routes.sell.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={`${route.currency.name} / ${route.iban}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Currency'), text: route.currency.name },
                    { label: translate('screens/payment', 'IBAN'), text: route.iban },
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
            <StyledDataTable label={translate('general/links', 'Swap')}>
              {routes.swap.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  label={route.asset.name}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/payment', 'Blockchain'), text: route.asset.blockchain },
                    {
                      label: translate('screens/payment', 'Deposit address'),
                      text: route.deposit.address,
                    },
                    {
                      label: translate('screens/payment', 'Volume'),
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
