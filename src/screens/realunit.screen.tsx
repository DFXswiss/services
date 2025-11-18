import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { PriceHistoryChart } from 'src/components/realunit/price-history-chart';
import { useSettingsContext } from 'src/contexts/settings.context';
import { PaginationDirection } from 'src/dto/realunit.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useRealunit } from 'src/hooks/realunit.hook';
export default function RealunitScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();

  const {
    holders,
    totalCount,
    pageInfo,
    tokenInfo,
    isLoading,
    priceHistory,
    fetchHolders,
    fetchPriceHistory,
    fetchTokenInfo,
    lastTimeframe,
  } = useRealunit();

  useLayoutOptions({ backButton: true });

  useEffect(() => {
    fetchHolders();
    fetchTokenInfo();
  }, [fetchHolders, fetchTokenInfo]);

  const handleAddressClick = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    navigate(`/realunit/user/${encodedAddress}`);
  };

  const changePage = (dir: PaginationDirection) =>
    fetchHolders(dir === PaginationDirection.NEXT ? pageInfo.endCursor : pageInfo.startCursor, dir);

  return (
    <>
      {!holders.length && !tokenInfo ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full">
          <div className="mb-4">
            {isLoading ? (
              <div className="shadow-card rounded-xl p-6 flex justify-center mb-6">
                <StyledLoadingSpinner size={SpinnerSize.MD} />
              </div>
            ) : (
              tokenInfo && (
                <div className="mb-6">
                  <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'RealUnit ')}</h2>
                  <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-dfxGray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {translate('screens/realunit', 'Overview')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {translate('screens/realunit', '')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                          {translate('screens/realunit', 'Holders')}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 font-semibold">
                          {totalCount?.toLocaleString() ?? '0'}
                        </td>
                      </tr>
                      <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                          {translate('screens/realunit', 'Shares')}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 font-semibold">
                          {Number(tokenInfo.totalShares.total).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                          {translate('screens/realunit', 'Total Supply')}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 font-semibold">
                          {Number(tokenInfo.totalSupply.value).toLocaleString()} REALU
                        </td>
                      </tr>

                      <tr className="transition-colors hover:bg-dfxGray-300">
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                          {translate('screens/realunit', 'Timestamp')}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 font-semibold">
                          {new Date(tokenInfo.totalSupply.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            )}

            <h2 className="text-dfxGray-700 justify-center  mb-2">{translate('screens/realunit', 'Price History')}</h2>
            <PriceHistoryChart priceHistory={priceHistory} onTimeframeChange={fetchPriceHistory} />
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
                onClick={() => changePage(PaginationDirection.PREV)}
                disabled={!pageInfo.hasPreviousPage}
                width={StyledButtonWidth.MIN}
              />
            </div>

            <div className="flex items-center gap-2">
              <StyledButton
                label={translate('general/actions', 'Next')}
                onClick={() => changePage(PaginationDirection.NEXT)}
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
