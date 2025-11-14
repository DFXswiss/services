import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { PriceHistoryChart } from 'src/components/realunit/price-history-chart';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useRealunit } from 'src/hooks/realunit.hook';

enum Direction {
  INITIAL = 'initial',
  NEXT = 'next',
  PREV = 'prev',
}

export default function RealunitScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();

  const {
    holders,
    totalShares,
    totalSupply,
    totalCount,
    pageInfo,
    priceHistory,
    isLoadingHolders,
    isLoadingPriceHistory,
    holdersError,
    priceHistoryError,
    fetchHolders,
    fetchPriceHistory,
  } = useRealunit();

  useEffect(() => {
    fetchHolders();
  }, [fetchHolders]);

  const hasRealunitInfo = Boolean(totalShares || totalSupply || totalCount);

  useLayoutOptions({ backButton: true });

  const handleAddressClick = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    navigate(`/realunit/user/${encodedAddress}`);
  };

  const handlePreviousPage = () => {
    if (pageInfo.hasPreviousPage && pageInfo.startCursor) {
      fetchHolders(pageInfo.startCursor, Direction.PREV);
    }
  };

  const handleNextPage = () => {
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      fetchHolders(pageInfo.endCursor, Direction.NEXT);
    }
  };

  return (
    <>
      {holdersError ? (
        <ErrorHint message={holdersError} />
      ) : isLoadingHolders ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-dfxGray-700 text-xl font-semibold mb-2">
              {translate('screens/realunit', 'RealUnit Holders')}
            </h2>

            {hasRealunitInfo && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-dfxGray-300 mb-6">
                <h3 className="text-dfxBlue-800 font-semibold text-base mb-3">
                  {translate('screens/realunit', 'RealUnit Information')}
                </h3>
                <div className="space-y-2">
                  {totalCount && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">
                        {translate('screens/realunit', 'Total holders')}:
                      </span>
                      <span className="text-dfxBlue-800 font-medium">{totalCount}</span>
                    </div>
                  )}
                  {totalShares && (
                    <div className="flex justify-between items-center">
                      <span className="text-dfxGray-600 text-sm">{translate('screens/realunit', 'Total Shares')}:</span>
                      <span className="text-dfxBlue-800 font-medium">{totalShares.total}</span>
                    </div>
                  )}
                  {totalSupply && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-dfxGray-600 text-sm">
                          {translate('screens/realunit', 'Total Supply')}:
                        </span>
                        <span className="text-dfxBlue-800 font-medium">{totalSupply.value}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-dfxGray-600 text-sm">{translate('screens/realunit', 'Timestamp')}:</span>
                        <span className="text-dfxBlue-800 text-sm">
                          {new Date(totalSupply.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-4 border border-dfxGray-300 mb-6">
              <h3 className="text-dfxBlue-800 font-semibold text-base mb-3">
                {translate('screens/realunit', 'Price History')}
              </h3>
              {priceHistoryError ? (
                <ErrorHint message={priceHistoryError} />
              ) : (
                <PriceHistoryChart
                  priceHistory={priceHistory}
                  isLoading={isLoadingPriceHistory}
                  onTimeframeChange={fetchPriceHistory}
                />
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto mb-4">
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-dfxGray-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Address')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Balance')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Percentage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {holders.map((holder) => (
                  <tr
                    key={holder.address}
                    className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                  >
                    <td
                      className="px-4 py-3 text-left text-sm text-dfxBlue-800 cursor-pointer hover:text-dfxBlue-600 hover:underline break-all"
                      onClick={() => handleAddressClick(holder.address)}
                    >
                      {holder.address}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {(Number(holder.balance) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{holder.percentage.toFixed(2)}%</td>
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
                disabled={!pageInfo.hasPreviousPage}
                width={StyledButtonWidth.MIN}
              />
            </div>

            <div className="flex items-center gap-2">
              <StyledButton
                label={translate('general/actions', 'Next')}
                onClick={handleNextPage}
                disabled={!pageInfo.hasNextPage}
                width={StyledButtonWidth.MIN}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
