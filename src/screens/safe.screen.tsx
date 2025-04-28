import { ApiError, Blockchain, useApi, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconSize,
  AssetIconVariant,
  DfxAssetIcon,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import { ErrorHint } from 'src/components/error-hint';
import { DepositWithdraw } from 'src/components/safe/deposit-withdraw';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

enum FiatCurrency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD',
}

const portfolioStats = {
  value: {
    CHF: 2239239.0,
    EUR: 2539000.0,
    USD: 2710392.0,
  },
};

// Dummy data
const portfolio: AssetData[] = generateAssetData();

const EmbeddedWallet = 'CakeWallet';

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { call } = useApi();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();
  const { translate } = useSettingsContext();
  const rootRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn]);

  async function createAccountIfRequired(user: User): Promise<void> {
    if (!user.addresses.some((a) => a.isCustody)) {
      return call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: {
          addressType: 'EVM',
        },
      }).then(({ accessToken }) => setSession(accessToken));
    }
  }

  return (
    <Layout rootRef={rootRef}>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="flex flex-col w-full gap-4">
          <div className="shadow-card rounded-xl">
            <div id="chart-timeline" className="relative">
              <div className="absolute p-4 gap-2 flex flex-col items-start">
                <div className="w-full flex-col">
                  <h2 className="text-dfxBlue-800 text-left">{translate('screens/safe', 'My Safe')}</h2>
                  <p className="text-dfxGray-700 text-left">Total portfolio value</p>
                </div>
                <div className="flex flex-row items-center gap-2">
                  <div className="z-10 w-min bg-white/80 rounded-md overflow-clip flex flex-row justify-center items-center">
                    {Object.values(FiatCurrency).map((_currency) => (
                      <SegmentedControlButton
                        key={_currency}
                        selected={_currency === currency}
                        size={'sm'}
                        onClick={() => setCurrency(_currency)}
                      >
                        {_currency}
                      </SegmentedControlButton>
                    ))}
                  </div>
                  <div className="text-dfxBlue-800">
                    <span className="text-base font-bold leading-tight">
                      {formatCurrency(portfolioStats.value[currency], 2, 2)}
                    </span>{' '}
                    <span className="text-base font-[350] leading-tight">{currency}</span>
                  </div>
                </div>
              </div>
              <PriceChart />
            </div>
          </div>
          <Portfolio portfolio={portfolio} currency={currency} />
          <div className="h-[1px] bg-dfxGray-500 w-full rounded-full" />
          <DepositWithdraw />
        </div>
      )}
    </Layout>
  );
}

interface AssetData {
  blockchain: Blockchain;
  name: string;
  description: string;
  uniqueName: string;
  amount: number;
  value: {
    CHF: number;
    EUR: number;
    USD: number;
  };
  icon: AssetIconVariant;
  limits: {
    minVolume: number;
    maxVolume: number;
  };
}

/**
 * ***********************************************
 *               PORTFOLIO COMPONENT
 * ***********************************************
 */
export const Portfolio = ({ portfolio, currency }: { portfolio: AssetData[]; currency: FiatCurrency }) => {
  const { translate } = useSettingsContext();

  return portfolio?.length ? (
    <StyledVerticalStack full gap={2}>
      <div className="w-full flex flex-col px-4 pb-2 pt-3">
        <h2 className="text-dfxBlue-800 text-left text-lg font-semibold">{translate('screens/safe', 'Portfolio')}</h2>
      </div>
      <StyledDataTable alignContent={AlignContent.BETWEEN}>
        {portfolio.map((asset: AssetData) => (
          <StyledDataTableRow key={asset.name}>
            <div className="w-full flex flex-row justify-between items-center gap-2 text-dfxBlue-800 p-2">
              <div className="w-full flex flex-row items-center gap-3">
                <DfxAssetIcon asset={asset.icon} size={AssetIconSize.LG} />
                <div className="text-base flex flex-col font-semibold text-left leading-none gap-1 pb-1">
                  {asset.name}
                  <div className="text-sm text-dfxGray-700">{asset.name}</div>
                </div>
              </div>
              <div className="text-base text-right w-full flex flex-col font-semibold leading-none gap-1 pb-1 pr-1">
                {asset.amount}
                <div className="text-sm text-dfxGray-700">{`${formatCurrency(
                  asset.value[currency],
                  2,
                  2,
                )} ${currency}`}</div>
              </div>
            </div>
          </StyledDataTableRow>
        ))}
      </StyledDataTable>
    </StyledVerticalStack>
  ) : (
    <div className="w-full flex flex-col items-center justify-center gap-2 p-4">
      <p className="text-dfxBlue-300 text-left">{translate('screens/safe', 'No assets found')}</p>
    </div>
  );
};

/**
 * ***********************************************
 *                 CHART COMPONENT
 * ***********************************************
 */
interface ValueChart {
  id: string;
  lastPrice: string;
  time: string;
}

enum Timeframe {
  WEEK = '1W',
  MONTH = '1M',
  QUARTER = '1Q',
  YEAR = '1Y',
  ALL = 'All',
}

const getStartTimestampByTimeframe = (timeframe: Timeframe) => {
  switch (timeframe) {
    case Timeframe.ALL:
      return 0;
    case Timeframe.WEEK:
      return Date.now() - 7 * 24 * 60 * 60 * 1000;
    case Timeframe.MONTH:
      return Date.now() - 30 * 24 * 60 * 60 * 1000;
    case Timeframe.QUARTER:
      return Date.now() - 90 * 24 * 60 * 60 * 1000;
    case Timeframe.YEAR:
      return Date.now() - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

export const PriceChart = () => {
  const trades = generateValueChartData();
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);
  const startTrades = getStartTimestampByTimeframe(timeframe);

  const filteredTrades = useMemo(
    () =>
      trades.filter((trade) => {
        return parseFloat(trade.time) * 1000 > startTrades;
      }),
    [trades, startTrades],
  );

  const maxPrice = useMemo(
    () => Math.max(...filteredTrades.map((trade) => Math.round(Number(trade.lastPrice) / 10 ** 16) / 100)),
    [filteredTrades],
  );

  return (
    <>
      <Chart
        type="area"
        options={{
          theme: {
            monochrome: {
              color: '#092f62',
              enabled: true,
            },
          },
          chart: {
            type: 'area',
            height: 300,
            dropShadow: {
              enabled: false,
            },
            toolbar: {
              show: false,
            },
            zoom: {
              enabled: false,
            },
            background: '0',
          },
          stroke: {
            width: 3,
          },
          dataLabels: {
            enabled: false,
          },
          grid: {
            show: false,
          },
          xaxis: {
            type: 'datetime',
            labels: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
            axisTicks: {
              show: false,
            },
          },
          yaxis: {
            show: false,
            min: 0,
            max: maxPrice * 1.6,
          },
          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 0,
              opacityTo: 0.0,
              shade: '#e7e7ea',
              gradientToColors: ['#092f62'],
            },
          },
        }}
        series={[
          {
            name: 'Portfolio Value',
            data: filteredTrades.map((trade) => {
              return [parseFloat(trade.time) * 1000, Math.round(Number(trade.lastPrice) / 10 ** 16) / 100];
            }),
          },
        ]}
      />
      <div className="absolute bottom-2.5 w-full flex justify-center py-2">
        <div className="z-10 w-min bg-white/80 rounded-lg overflow-clip flex flex-row justify-center items-center">
          {Object.values(Timeframe).map((_timeframe) => (
            <SegmentedControlButton
              key={_timeframe}
              selected={_timeframe === timeframe}
              onClick={() => setTimeframe(_timeframe)}
            >
              {_timeframe}
            </SegmentedControlButton>
          ))}
        </div>
      </div>
    </>
  );
};

/**
 * ***********************************************
 *         SEGMENTCONTROL BUTTON COMPONENT
 * ***********************************************
 */
interface SegmentedControlButtonProps {
  selected?: boolean;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const SegmentedControlButton = ({ children, selected, size, onClick }: SegmentedControlButtonProps) => {
  const padding = size === 'sm' ? 'px-2.5 py-2' : size === 'lg' ? 'px-4 py-3' : 'px-3 py-2.5';
  return (
    <button
      className={`btn ${padding} leading-none ${
        selected
          ? 'bg-dfxBlue-800/15 text-dfxBlue-800'
          : 'bg-dfxBlue-800/5 text-dfxBlue-800/40  hover:text-dfxBlue-800 hover:bg-dfxBlue-800/15'
      } text-sm font-medium transition-all duration-300`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

/**
 * ***********************************************
 *                UTILITY FUNCTIONS
 * ***********************************************
 */
function generateValueChartData(): ValueChart[] {
  const data: ValueChart[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const numPoints = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const step = Math.floor(timeDiff / numPoints);
  let lastPrice = 100000000000000000;

  for (let i = 0; i <= numPoints; i++) {
    const time = new Date(startDate.getTime() + i * step).getTime() / 1000;
    lastPrice *= 1.01;
    data.push({ id: `${i}`, lastPrice: lastPrice.toString(), time: time.toString() });
  }

  return data;
}

function generateAssetData(): AssetData[] {
  return [
    {
      blockchain: Blockchain.ETHEREUM,
      name: 'dEURO',
      description: 'Decentralized EURO',
      uniqueName: 'Ethereum/dEURO',
      amount: 28030.56,
      value: {
        CHF: 0.89,
        EUR: 1.0,
        USD: 1.08,
      },
      icon: AssetIconVariant.dEURO,
      limits: {
        minVolume: 0.10619,
        maxVolume: 1061900000,
      },
    },
    {
      blockchain: Blockchain.ETHEREUM,
      name: 'ZCHF',
      description: '"Frankencoin"',
      uniqueName: 'Ethereum/ZCHF',
      amount: 13902.64,
      value: {
        CHF: 1,
        EUR: 1.06,
        USD: 1.13,
      },
      icon: AssetIconVariant.ZCHF,
      limits: {
        maxVolume: 1000000000,
        minVolume: 0.1,
      },
    },
  ];
}
