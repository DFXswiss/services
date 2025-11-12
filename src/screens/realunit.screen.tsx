import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface Holder {
  id?: number | string;
  address?: string;
  balance?: number | string;
  amount?: number | string;
  tokenId?: number | string;
  [key: string]: any;
}

interface TotalShares {
  total: string;
  timestamp: string;
  txHash: string;
}

interface TotalSupply {
  value: string;
  timestamp: string;
}

interface PaginationInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface HoldersResponse {
  data?: Holder[];
  holders?: Holder[];
  content?: Holder[];
  items?: Holder[];
  totalShares?: TotalShares;
  totalSupply?: TotalSupply;
  totalCount?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
  [key: string]: any;
}

export default function RealunitScreen(): JSX.Element {
  const { translate } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [holders, setHolders] = useState<Holder[]>([]);
  const [totalShares, setTotalShares] = useState<TotalShares | undefined>();
  const [totalSupply, setTotalSupply] = useState<TotalSupply | undefined>();
  const [totalCount, setTotalCount] = useState<number | undefined>();
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const fetchHolders = async (cursor?: string, direction: 'next' | 'prev' | 'initial' = 'initial') => {
    setIsLoading(true);
    setError(undefined);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://dev.api.dfx.swiss';
      const apiVersion = process.env.REACT_APP_API_VERSION || 'v1';
      const url = new URL(`${apiBaseUrl}/${apiVersion}/realunit/holders`);

      if (cursor) {
        if (direction === 'next') {
          url.searchParams.set('after', cursor);
        } else if (direction === 'prev') {
          url.searchParams.set('startCursor', cursor);
        }
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch holders: ${response.status} ${response.statusText}`);
      }

      const data: HoldersResponse | Holder[] = await response.json();

      console.log('Raw API Response:', data);
      console.log('Response type:', Array.isArray(data) ? 'Array' : 'Object');
      console.log('Response keys:', Array.isArray(data) ? 'N/A' : Object.keys(data));

      let holdersData: Holder[] = [];
      let paginationData: PaginationInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
      };

      if (Array.isArray(data)) {
        holdersData = data;
      } else {
        if (data.data && Array.isArray(data.data)) {
          holdersData = data.data;
        } else if (data.holders && Array.isArray(data.holders)) {
          holdersData = data.holders;
        } else if (data.content && Array.isArray(data.content)) {
          holdersData = data.content;
        } else if (data.items && Array.isArray(data.items)) {
          holdersData = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          holdersData = data.results;
        } else if (data.edges && Array.isArray(data.edges)) {
          holdersData = data.edges.map((edge: any) => edge.node || edge);
        }

        const paginationObj = (data as any).pagination;
        const pageInfo = (data as any).pageInfo;

        const hasNextPageValue = pageInfo?.hasNextPage ?? paginationObj?.hasNextPage ?? data.hasNextPage;
        const hasPreviousPageValue =
          pageInfo?.hasPreviousPage ?? paginationObj?.hasPreviousPage ?? data.hasPreviousPage;

        paginationData = {
          hasNextPage: hasNextPageValue === true || hasNextPageValue === 'true' || hasNextPageValue === 1,
          hasPreviousPage:
            hasPreviousPageValue === true || hasPreviousPageValue === 'true' || hasPreviousPageValue === 1,
          startCursor: pageInfo?.startCursor ?? paginationObj?.startCursor ?? data.startCursor,
          endCursor: pageInfo?.endCursor ?? paginationObj?.endCursor ?? data.endCursor,
        };

        if (direction === 'initial') {
          if (data.totalShares) {
            setTotalShares(data.totalShares);
          }
          if (data.totalSupply) {
            setTotalSupply(data.totalSupply);
          }
          const totalCountValue = (data as any).totalCount ?? (data as any).total ?? (data as any).count;
          if (totalCountValue !== undefined && totalCountValue !== null) {
            setTotalCount(typeof totalCountValue === 'number' ? totalCountValue : parseInt(totalCountValue, 10));
          }
        }
      }

      if (direction === 'prev') {
        setCursorHistory((prev) => prev.slice(0, -1));
      }

      setPagination(paginationData);
      setHolders(holdersData);

      console.log('Extracted Data:', {
        holdersCount: holdersData.length,
        pagination: paginationData,
        hasNextPage: paginationData.hasNextPage,
        hasPreviousPage: paginationData.hasPreviousPage,
        endCursor: paginationData.endCursor,
        startCursor: paginationData.startCursor,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load holders data');
      console.error('Error fetching holders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolders(undefined, 'initial');
  }, []);

  const currentHolders = holders;

  const tableColumns = useMemo(() => {
    if (holders.length === 0) return [];
    const allKeys = new Set<string>();
    holders.forEach((holder) => {
      Object.keys(holder).forEach((key) => allKeys.add(key));
    });
    return Array.from(allKeys).sort();
  }, [holders]);

  useLayoutOptions({ title: undefined, backButton: true });

  const handlePreviousPage = () => {
    const cursorToUse = cursorHistory.length > 0 ? cursorHistory[cursorHistory.length - 1] : null;

    if (cursorToUse !== null && cursorToUse !== undefined) {
      console.log('Going back with cursor:', cursorToUse, 'History:', cursorHistory);
      fetchHolders(cursorToUse, 'prev');
    } else if (cursorHistory.length > 0) {
      console.log('Going back to first page (no cursor)');
      fetchHolders(undefined, 'initial');
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage && pagination.endCursor) {
      const currentStartCursor = pagination.startCursor;
      setCursorHistory((prev) => {
        const cursorToSave = currentStartCursor || null;
        if (prev.length === 0 || prev[prev.length - 1] !== cursorToSave) {
          return [...prev, cursorToSave];
        }
        return prev;
      });

      console.log('Going forward, saving cursor to history:', currentStartCursor, 'History:', cursorHistory);
      fetchHolders(pagination.endCursor, 'next');
    }
  };

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-dfxGray-700 text-xl font-semibold mb-2">
              {translate('screens/compliance', 'RealUnit Holders')}
            </h2>

            {(totalShares || totalSupply || totalCount !== undefined) && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-dfxGray-300 mb-6">
                <h3 className="text-dfxBlue-800 font-semibold text-base mb-3">
                  {translate('screens/compliance', 'RealUnit Information')}
                </h3>
                <div className="space-y-2">
                  {totalCount !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">
                        {translate('screens/compliance', 'Total holders')}:
                      </span>
                      <span className="text-dfxBlue-800 font-medium">{totalCount}</span>
                    </div>
                  )}
                  {totalShares && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">
                        {translate('screens/compliance', 'Total Shares')}:
                      </span>
                      <span className="text-dfxBlue-800 font-medium">{totalShares.total}</span>
                    </div>
                  )}
                  {totalSupply && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">
                        {translate('screens/compliance', 'Total Supply')}:
                      </span>
                      <span className="text-dfxBlue-800 font-medium">{totalSupply.value}</span>
                    </div>
                  )}
                  {totalSupply && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">{translate('screens/compliance', 'Timestamp')}:</span>
                      <span className="text-dfxBlue-800 text-sm">
                        {new Date(totalSupply.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {holders.length === 0 ? (
            <p className="text-dfxGray-700">{translate('screens/compliance', 'No holders found')}</p>
          ) : (
            <>
              <div className="w-full overflow-x-auto mb-4">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-dfxGray-300">
                      {tableColumns.map((column) => (
                        <th key={column} className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentHolders.map((holder, index) => (
                      <tr
                        key={holder.id || index}
                        className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                      >
                        {tableColumns.map((column) => {
                          const value = holder[column];
                          let displayValue = '-';

                          if (value !== null && value !== undefined) {
                            if (typeof value === 'object') {
                              displayValue = JSON.stringify(value);
                            } else {
                              displayValue = String(value);
                            }
                          }

                          return (
                            <td key={column} className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <StyledButton
                    label={translate('general/actions', 'Previous')}
                    onClick={handlePreviousPage}
                    disabled={!pagination.hasPreviousPage}
                    width={StyledButtonWidth.MIN}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <StyledButton
                    label={translate('general/actions', 'Next')}
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                    width={StyledButtonWidth.MIN}
                  />
                </div>
              </div>

              <div className="mt-2 text-sm text-dfxGray-600 text-center">
                {translate('screens/compliance', 'Showing {{count}} entries', {
                  count: holders.length,
                })}
                {totalCount !== undefined && ` / ${totalCount} ${translate('screens/compliance', 'total')}`}
                {pagination.hasNextPage && ' • ' + translate('screens/compliance', 'More available')}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
