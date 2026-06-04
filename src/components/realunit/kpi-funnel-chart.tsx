import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RealunitStats } from 'src/dto/realunit.dto';

interface KpiFunnelChartProps {
  stats: RealunitStats;
}

export const KpiFunnelChart = ({ stats }: KpiFunnelChartProps): JSX.Element => {
  const { translate } = useSettingsContext();

  const maxReached = useMemo(
    () => Math.max(...stats.kycFunnel.map((entry) => entry.reached.total), 0),
    [stats.kycFunnel],
  );

  const chartOptions = useMemo((): ApexOptions => {
    return {
      theme: {
        monochrome: {
          color: '#092f62',
          enabled: true,
        },
      },
      chart: {
        type: 'bar' as const,
        dropShadow: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
        background: '0',
      },
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4,
          columnWidth: '55%',
          distributed: true,
        },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      grid: { show: false },
      fill: {
        colors: ['#5A81BB'],
      },
      xaxis: {
        categories: stats.kycFunnel.map((entry) => translate('screens/realunit', entry.step)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#092f62' },
        },
      },
      yaxis: {
        show: false,
        min: 0,
        max: maxReached * 1.2 || 1,
      },
      tooltip: {
        y: {
          formatter: (value: number) => value.toLocaleString(),
        },
      },
    };
  }, [stats.kycFunnel, maxReached, translate]);

  const chartSeries = useMemo(() => {
    return [
      {
        name: translate('screens/realunit', 'KYC funnel'),
        data: stats.kycFunnel.map((entry) => entry.reached.total),
      },
    ];
  }, [stats.kycFunnel, translate]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-dfxBlue-800 mb-2">{translate('screens/realunit', 'KYC funnel')}</h3>
      <Chart type="bar" height={300} options={chartOptions} series={chartSeries} />
    </div>
  );
};
