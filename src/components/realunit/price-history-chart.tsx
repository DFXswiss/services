import { ApexOptions } from 'apexcharts';
import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useSettingsContext } from 'src/contexts/settings.context';
import { PriceHistoryEntry } from 'src/dto/realunit.dto';
import { FiatCurrency } from 'src/dto/safe.dto';
import { Timeframe } from 'src/util/chart';
import { ButtonGroup } from '../safe/button-group';

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryEntry[];
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export const PriceHistoryChart = ({ priceHistory, onTimeframeChange }: PriceHistoryChartProps) => {
  const { translate } = useSettingsContext();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  useEffect(() => {
    onTimeframeChange(timeframe);
  }, [timeframe, onTimeframeChange]);

  const maxPrice = useMemo(() => Math.max(...priceHistory.map((e) => e[currency]), 0), [priceHistory, currency]);

  const chartOptions = useMemo((): ApexOptions => {
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
      tooltip: {
        x: { format: 'dd MMM yyyy' },
      },
    };
  }, [maxPrice]);

  const chartSeries = useMemo(() => {
    return [
      {
        name: translate('screens/realunit', 'Price'),
        data: priceHistory.map((entry: PriceHistoryEntry) => [new Date(entry.timestamp).getTime(), entry[currency]]),
      },
    ];
  }, [priceHistory, currency, translate]);

  return (
    priceHistory && (
      <div className="text-dfxBlue-500">
        <div className="mb-4 flex justify-center gap-2">
          <ButtonGroup<FiatCurrency>
            items={Object.values(FiatCurrency)}
            selected={currency}
            onClick={(c) => setCurrency(c)}
            buttonLabel={(c) => c.toUpperCase()}
          />
        </div>
        <Chart type="area" height={300} options={chartOptions} series={chartSeries} />
        <div className="mt-4 flex justify-center">
          <ButtonGroup<Timeframe>
            items={Object.values(Timeframe)}
            selected={timeframe}
            onClick={(tf) => setTimeframe(tf)}
            buttonLabel={(tf) => tf}
          />
        </div>
      </div>
    )
  );
};
