import { render, screen } from '@testing-library/react';
import { ApexOptions } from 'apexcharts';

// Capture props passed to the chart for assertions
let lastChartProps: { options: ApexOptions; series: { name: string; data: number[] }[] } | undefined;

jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: (props: { options: ApexOptions; series: { name: string; data: number[] }[] }) => {
    lastChartProps = { options: props.options, series: props.series };
    return <div data-testid="apex-chart" />;
  },
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_scope: string, key: string) => key,
  }),
}));

import { KpiFunnelChart } from '../components/realunit/kpi-funnel-chart';
import { realunitStatsFixture } from '../test-fixtures/realunit-stats.fixture';

describe('KpiFunnelChart', () => {
  beforeEach(() => {
    lastChartProps = undefined;
  });

  it('should render the chart container with the title', () => {
    render(<KpiFunnelChart stats={realunitStatsFixture} />);

    expect(screen.getByTestId('apex-chart')).toBeInTheDocument();
    expect(screen.getByText('KYC funnel')).toBeInTheDocument();
  });

  it('should map funnel reached totals to the series data', () => {
    render(<KpiFunnelChart stats={realunitStatsFixture} />);

    expect(lastChartProps?.series[0].data).toEqual([1000, 800, 600]);
  });

  it('should map funnel steps to the x-axis categories', () => {
    render(<KpiFunnelChart stats={realunitStatsFixture} />);

    expect(lastChartProps?.options.xaxis?.categories).toEqual(['ContactData', 'PersonalData', 'Ident']);
  });

  it('should format tooltip y values with thousands separators', () => {
    render(<KpiFunnelChart stats={realunitStatsFixture} />);

    const tooltip = lastChartProps?.options.tooltip;
    const formatter = (tooltip?.y as { formatter: (value: number) => string }).formatter;
    expect(formatter(1000)).toBe((1000).toLocaleString());
  });

  it('should fall back to a y-axis max of 1 when the funnel is empty', () => {
    const emptyStats = { ...realunitStatsFixture, kycFunnel: [] };
    render(<KpiFunnelChart stats={emptyStats} />);

    expect(lastChartProps?.options.yaxis).toMatchObject({ max: 1 });
    expect(lastChartProps?.series[0].data).toEqual([]);
  });
});
