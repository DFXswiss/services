import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useSettingsContext } from 'src/contexts/settings.context';
import { HistoricalBalance, PriceHistoryEntry } from 'src/dto/realunit.dto';

export enum BalanceMetric {
  REALU = 'realu',
  CHF = 'chf',
}

interface BalanceChartProps {
  historicalBalances: HistoricalBalance[];
  metric: BalanceMetric;
  isLoading: boolean;
  priceHistory: PriceHistoryEntry[];
}

export const BalanceChart = ({ isLoading, historicalBalances, metric, priceHistory }: BalanceChartProps) => {
  const { translate, locale } = useSettingsContext();
  const currentPriceChf = priceHistory?.[0]?.chf ?? 0;

  const maxBalance = useMemo(() => {
    const values = historicalBalances.map((e) =>
      metric === BalanceMetric.CHF ? Number(e.balance) * currentPriceChf : Number(e.balance),
    );
    return Math.max(...values, 0);
  }, [historicalBalances, metric, currentPriceChf]);

  const chartOptions = useMemo((): ApexOptions => {
    const translatedMonths = Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i, 1).toLocaleString(locale, { month: 'short' }),
    );

    return {
      theme: {
        monochrome: {
          color: '#092f62',
          enabled: true,
        },
      },
      chart: {
        type: 'area' as const,
        dropShadow: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
        background: '0',
        locales: [
          {
            name: locale,
            options: {
              months: translatedMonths,
              shortMonths: translatedMonths,
            },
          },
        ],
        defaultLocale: locale,
      },
      stroke: { width: 3 },
      dataLabels: { enabled: false },
      grid: { show: false },
      xaxis: {
        type: 'datetime',
        labels: {
          show: false,
          datetimeUTC: false,
          format: 'dd MMM',
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: false,
        min: 0,
        max: maxBalance * 1.5,
      },
      fill: {
        colors: ['#5A81BB'],
        type: 'gradient',
        gradient: {
          type: 'vertical',
          opacityFrom: 1,
          opacityTo: 0.0,
        },
      },
      tooltip: {
        x: { format: 'dd MMM yyyy' },
      },
    };
  }, [maxBalance, locale]);

  const chartSeries = useMemo(() => {
    return [
      {
        name: translate('screens/realunit', 'Balance'),
        data: historicalBalances.map((entry: HistoricalBalance) => {
          const value = metric === BalanceMetric.CHF ? Number(entry.balance) * currentPriceChf : Number(entry.balance);
          return [new Date(entry.timestamp).getTime(), Number(value.toFixed(2))];
        }),
      },
    ];
  }, [historicalBalances, metric, translate, currentPriceChf]);

  return isLoading ? (
    <div className="flex justify-center items-center w-full h-full">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : (
    <div id="chart-timeline" className="text-dfxBlue-500">
      <Chart type="area" height={300} options={chartOptions} series={chartSeries} />
    </div>
  );
};
