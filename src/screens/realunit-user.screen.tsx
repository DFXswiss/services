import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { ApexOptions } from 'apexcharts';
import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { ButtonGroup } from 'src/components/safe/button-group';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface HistoricalBalance {
  balance?: string | number;
  timestamp?: string;
  valueChf?: string | number;
  [key: string]: any;
}

interface AccountSummary {
  address?: string;
  addressType?: number;
  balance?: string | number;
  lastUpdated?: string;
  historicalBalances?: HistoricalBalance[];
  [key: string]: any;
}

export default function RealunitUserScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { address } = useParams<{ address: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<AccountSummary>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMetric, setSelectedMetric] = useState<'balance' | 'valueChf'>('balance');
  const itemsPerPage = 20;

  useEffect(() => {
    if (address) {
      setIsLoading(true);
      setError(undefined);

      const fetchAccountSummary = async () => {
        try {
          if (!address || address.trim() === '') {
            throw new Error('Address is empty or invalid');
          }

          const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://dev.api.dfx.swiss';
          const apiVersion = process.env.REACT_APP_API_VERSION || 'v1';
          const url = `${apiBaseUrl}/${apiVersion}/realunit/account/${address}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Failed to fetch account summary: ${response.status} ${response.statusText}`);
          }

          const accountData: AccountSummary = await response.json();
          setData(accountData);
        } catch (e: any) {
          setError(e.message || 'Failed to load account summary');
          console.error('Error fetching account summary:', e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAccountSummary();
    } else {
      setError('No address provided');
    }
  }, [address]);

  useLayoutOptions({ title: translate('screens/compliance', 'Account Summary'), backButton: true });

  const paginatedHistoricalBalances = useMemo(() => {
    if (!data?.historicalBalances) return [];
    const sorted = [...data.historicalBalances].sort((a, b) => {
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timestampB - timestampA;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  }, [data?.historicalBalances, currentPage]);

  const totalPages = useMemo(() => {
    if (!data?.historicalBalances) return 0;
    return Math.ceil(data.historicalBalances.length / itemsPerPage);
  }, [data?.historicalBalances]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  useEffect(() => {
    if (data?.historicalBalances) {
      setCurrentPage(1);
    }
  }, [data?.historicalBalances]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const sortedHistoricalBalances = useMemo(() => {
    if (!data?.historicalBalances) return [];
    return [...data.historicalBalances]
      .filter((entry) => entry.timestamp && (entry.balance !== undefined || entry.valueChf !== undefined))
      .sort((a, b) => {
        const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timestampA - timestampB;
      });
  }, [data?.historicalBalances]);

  const mostRecentValueChf = useMemo(() => {
    if (!data?.historicalBalances) return undefined;
    const entriesWithValueChf = data.historicalBalances
      .filter((entry) => entry.timestamp && entry.valueChf !== undefined && entry.valueChf !== null)
      .sort((a, b) => {
        const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timestampB - timestampA;
      });
    return entriesWithValueChf.length > 0 ? entriesWithValueChf[0].valueChf : undefined;
  }, [data?.historicalBalances]);

  const chartOptions = useMemo((): ApexOptions => {
    if (sortedHistoricalBalances.length === 0) {
      return {
        chart: { type: 'area' as const },
        yaxis: { show: true },
      };
    }

    const values = sortedHistoricalBalances
      .map((e) => {
        const val = selectedMetric === 'balance' ? e.balance : e.valueChf;
        return typeof val === 'string' ? parseFloat(val) : (val as number);
      })
      .filter((v) => !isNaN(v));

    if (values.length === 0) {
      return {
        chart: { type: 'area' as const },
        yaxis: { show: true },
      };
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    const getDecimalPlaces = (value: number): number => {
      if (Math.floor(value) === value) return 0;
      const str = value.toString();
      if (str.includes('e')) {
        const match = str.match(/e-(\d+)/);
        return match ? parseInt(match[1], 10) + 2 : 2;
      }
      const decimalPart = str.split('.')[1];
      return decimalPart ? decimalPart.length : 0;
    };

    const allDecimalPlaces = values.map((v) => getDecimalPlaces(v));
    const maxDecimals = Math.max(...allDecimalPlaces, 2);
    const displayDecimals = Math.min(maxDecimals, 6);

    let padding: number;
    let yAxisMin: number;
    let yAxisMax: number;

    if (valueRange < 0.01) {
      padding = 0.005;
      yAxisMin = minValue - padding;
      yAxisMax = maxValue + padding;
    } else if (valueRange < 0.1) {
      padding = valueRange * 0.2;
      yAxisMin = minValue - padding;
      yAxisMax = maxValue + padding;
    } else {
      padding = valueRange * 0.1;
      yAxisMin = Math.max(0, minValue - padding);
      yAxisMax = maxValue + padding;
    }

    const timestamps = sortedHistoricalBalances
      .map((e) => (e.timestamp ? new Date(e.timestamp).getTime() : 0))
      .filter((t) => t > 0);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const timeRange = maxTimestamp - minTimestamp;
    const timePadding = timeRange * 0.05;

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
      stroke: { width: 3, curve: 'smooth' as const },
      dataLabels: { enabled: false },
      grid: { show: false },
      xaxis: {
        type: 'datetime',
        min: minTimestamp - timePadding,
        max: maxTimestamp,
        labels: {
          show: true,
          datetimeUTC: false,
          format: 'dd MMM',
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: true,
        min: yAxisMin,
        max: yAxisMax,
        forceNiceScale: true,
        labels: {
          formatter: (value: number) => {
            const getDecimalPlaces = (val: number): number => {
              if (Math.floor(val) === val) return 0;
              const str = val.toString();
              if (str.includes('e')) {
                const match = str.match(/e-(\d+)/);
                return match ? parseInt(match[1], 10) + 2 : 2;
              }
              const decimalPart = str.split('.')[1];
              return decimalPart ? decimalPart.length : 0;
            };
            const decimals = Math.min(Math.max(getDecimalPlaces(value), 2), 6);
            return value.toFixed(decimals);
          },
        },
        decimalsInFloat: displayDecimals,
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
        x: { format: 'dd MMM yyyy HH:mm' },
        y: {
          formatter: (value: number) => {
            const getDecimalPlaces = (val: number): number => {
              if (Math.floor(val) === val) return 0;
              const str = val.toString();
              if (str.includes('e')) {
                const match = str.match(/e-(\d+)/);
                return match ? parseInt(match[1], 10) + 2 : 2;
              }
              const decimalPart = str.split('.')[1];
              return decimalPart ? decimalPart.length : 0;
            };
            const decimals = Math.min(Math.max(getDecimalPlaces(value), 2), 6);
            const label = selectedMetric === 'balance' ? 'Balance' : 'Value CHF';
            return `${value.toFixed(decimals)} ${label}`;
          },
        },
      },
    };
  }, [sortedHistoricalBalances, selectedMetric]);

  const chartSeries = useMemo(() => {
    if (sortedHistoricalBalances.length === 0) return [];

    const data = sortedHistoricalBalances
      .map((entry) => {
        const timestamp = entry.timestamp ? new Date(entry.timestamp).getTime() : null;
        const val = selectedMetric === 'balance' ? entry.balance : entry.valueChf;
        const numValue = typeof val === 'string' ? parseFloat(val) : (val as number);

        if (timestamp && !isNaN(numValue)) {
          return [timestamp, numValue];
        }
        return null;
      })
      .filter((point): point is [number, number] => point !== null);

    const label = selectedMetric === 'balance' ? 'Balance' : 'Value CHF';

    return [
      {
        name: translate('screens/compliance', label),
        data,
      },
    ];
  }, [sortedHistoricalBalances, selectedMetric, translate]);

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading || !data ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-dfxGray-700 mb-4">{translate('screens/compliance', 'Account Details')}</h2>
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Key')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Value')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.address && (
                    <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {translate('screens/compliance', 'Address')}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 break-all">{data.address}</td>
                    </tr>
                  )}
                  {data.addressType !== undefined && (
                    <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {translate('screens/compliance', 'Address Type')}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{String(data.addressType)}</td>
                    </tr>
                  )}
                  {data.balance !== undefined && data.balance !== null && (
                    <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {translate('screens/compliance', 'Balance')}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatValue(data.balance)}</td>
                    </tr>
                  )}
                  {data.lastUpdated && (
                    <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {translate('screens/compliance', 'Last Updated')}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatValue(data.lastUpdated)}</td>
                    </tr>
                  )}
                  {mostRecentValueChf !== undefined && mostRecentValueChf !== null && (
                    <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {translate('screens/compliance', 'Value CHF')}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {formatValue(mostRecentValueChf)}
                      </td>
                    </tr>
                  )}
                  {Object.entries(data)
                    .filter(
                      ([key]) =>
                        !['address', 'addressType', 'balance', 'lastUpdated', 'historicalBalances'].includes(key),
                    )
                    .map(([key, value]) => (
                      <tr key={key} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatValue(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {data.historicalBalances && data.historicalBalances.length > 0 && (
              <>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-dfxGray-300">
                  <h3 className="text-dfxBlue-800 font-semibold text-base mb-3">
                    {translate('screens/compliance', 'Balance History')}
                  </h3>
                  {sortedHistoricalBalances.length > 0 ? (
                    <div className="text-dfxBlue-500">
                      <div className="mb-4 flex justify-center gap-2">
                        <ButtonGroup<'balance' | 'valueChf'>
                          items={['balance', 'valueChf']}
                          selected={selectedMetric}
                          onClick={(metric) => setSelectedMetric(metric)}
                          buttonLabel={(metric) =>
                            metric === 'balance'
                              ? translate('screens/compliance', 'Balance')
                              : translate('screens/compliance', 'Value CHF')
                          }
                        />
                      </div>
                      <Chart type="area" height={300} options={chartOptions} series={chartSeries} />
                    </div>
                  ) : (
                    <p className="text-dfxGray-700 text-center py-4">
                      {translate('screens/compliance', 'No historical data available')}
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="text-dfxGray-700 mb-4">{translate('screens/compliance', 'Historical Data')}</h2>
                  <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-dfxGray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {translate('screens/compliance', 'Timestamp')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {translate('screens/compliance', 'Balance')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {translate('screens/compliance', 'Value CHF')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistoricalBalances.map((entry, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index;
                        return (
                          <tr
                            key={globalIndex}
                            className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                          >
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {entry.timestamp ? formatValue(entry.timestamp) : '-'}
                            </td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {entry.balance !== undefined && entry.balance !== null ? formatValue(entry.balance) : '-'}
                            </td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {entry.valueChf !== undefined && entry.valueChf !== null
                                ? formatValue(entry.valueChf)
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <>
                      <div className="flex items-center justify-between gap-2 mt-4">
                        <div className="flex items-center gap-2">
                          <StyledButton
                            label={translate('general/actions', 'Previous')}
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            width={StyledButtonWidth.MIN}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <StyledButton
                            label={translate('general/actions', 'Next')}
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            width={StyledButtonWidth.MIN}
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-dfxGray-600 text-center">
                        {translate('screens/compliance', 'Showing {{start}} to {{end}} of {{total}} entries', {
                          start: (currentPage - 1) * itemsPerPage + 1,
                          end: Math.min(currentPage * itemsPerPage, data.historicalBalances.length),
                          total: data.historicalBalances.length,
                        })}
                        {totalPages > 1 &&
                          ` (${translate('screens/compliance', 'Page {{current}} of {{total}}', {
                            current: currentPage,
                            total: totalPages,
                          })})`}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
