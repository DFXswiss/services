import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { ApexOptions } from 'apexcharts';
import { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useSettingsContext } from 'src/contexts/settings.context';
import { HistoricalBalance } from 'src/hooks/realunit.hook';
import { getFromDateByTimeframe, Timeframe } from 'src/util/chart';
import { ButtonGroup } from '../safe/button-group';

export enum BalanceMetric {
  REALU = 'realu',
  CHF = 'chf',
}

interface BalanceChartProps {
  historicalBalances: HistoricalBalance[];
  metric: BalanceMetric;
  isLoading: boolean;
}

export const BalanceChart = ({ isLoading, historicalBalances, metric }: BalanceChartProps) => {
  const { translate, locale } = useSettingsContext();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);

  const timeframedHistory = useMemo(() => {
    const fromDate = getFromDateByTimeframe(timeframe);
    const filtered = historicalBalances.filter((entry) => new Date(entry.timestamp).getTime() > fromDate);
    if (filtered.length === 1 && historicalBalances.length > 1) {
      filtered.unshift(historicalBalances[historicalBalances.length - 2]);
    }
    return filtered;
  }, [historicalBalances, timeframe]);

  const maxBalance = useMemo(() => {
    const values = timeframedHistory.map((e) =>
      metric === BalanceMetric.CHF ? e.valueChf ?? 0 : Number(e.balance) / 100,
    );
    return Math.max(...values, 0);
  }, [timeframedHistory, metric]);

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
        data: timeframedHistory.map((entry: HistoricalBalance) => {
          const value = metric === BalanceMetric.CHF ? entry.valueChf ?? 0 : Number(entry.balance) / 100;
          return [new Date(entry.timestamp).getTime(), value];
        }),
      },
    ];
  }, [timeframedHistory, metric, translate]);

  return isLoading ? (
    <div className="flex justify-center items-center w-full h-full">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : (
    <div id="chart-timeline" className="text-dfxBlue-500">
      <Chart type="area" height={300} options={chartOptions} series={chartSeries} />
      <div className="mt-1 w-full flex justify-center py-2">
        <ButtonGroup<Timeframe>
          items={Object.values(Timeframe)}
          selected={timeframe}
          onClick={(t) => setTimeframe(t)}
          buttonLabel={(t) => t}
        />
      </div>
    </div>
  );
};
