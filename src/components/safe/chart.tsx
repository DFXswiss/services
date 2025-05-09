import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { ApexOptions } from 'apexcharts';
import { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyHistoryEntry, FiatCurrency } from 'src/hooks/safe.hook';
import { ButtonGroup } from './button-group';

enum Timeframe {
  WEEK = '1W',
  MONTH = '1M',
  QUARTER = '1Q',
  YEAR = '1Y',
  ALL = 'All',
}

const getFromDateByTimeframe = (timeframe: Timeframe) => {
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

interface PriceChartProps {
  history: CustodyHistoryEntry[];
  currency: FiatCurrency;
  isLoading: boolean;
}

export const PriceChart = ({ isLoading, history, currency }: PriceChartProps) => {
  const { translate } = useSettingsContext();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);

  const filteredHistory = useMemo(
    () => history.filter((entry) => new Date(entry.date).getTime() > getFromDateByTimeframe(timeframe)),
    [history, timeframe],
  );

  const maxPrice = useMemo(
    () => filteredHistory.reduce((max, entry) => Math.max(max, entry.value[currency]), 0),
    [filteredHistory, currency],
  );

  const chartOptions = useMemo(
    (): ApexOptions => ({
      theme: {
        monochrome: {
          color: '#092f62',
          enabled: true,
        },
      },
      chart: {
        type: 'area' as const,
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
        max: maxPrice * 1.5,
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
    }),
    [maxPrice],
  );

  const chartSeries = useMemo(() => {
    return [
      {
        name: translate('screens/safe', 'Portfolio value'),
        data: filteredHistory.map((entry: CustodyHistoryEntry) => {
          return [new Date(entry.date).getTime(), entry.value[currency]];
        }),
      },
    ];
  }, [filteredHistory, currency, translate]);

  return isLoading ? (
    <div className="flex justify-center items-center w-full h-full">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : (
    <div id="chart-timeline" className="relative text-dfxBlue-500">
      <Chart type="area" height={300} options={chartOptions} series={chartSeries} />
      <div className="absolute bottom-1 w-full flex justify-center py-2">
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
