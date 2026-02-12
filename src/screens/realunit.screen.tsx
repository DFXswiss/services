import {
  CopyButton,
  IconColor,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { PriceHistoryChart } from 'src/components/realunit/price-history-chart';
import { useRealunitContext } from 'src/contexts/realunit.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress } from 'src/util/utils';
export default function RealunitScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { copy } = useClipboard();

  const { holders, totalCount, tokenInfo, isLoading, priceHistory, timeframe, fetchHolders, fetchPriceHistory, fetchTokenInfo } =
    useRealunitContext();

  useLayoutOptions({ backButton: true });

  useEffect(() => {
    if (!holders.length) fetchHolders();
    if (!tokenInfo) fetchTokenInfo();
    if (!priceHistory.length) fetchPriceHistory();
  }, [fetchHolders, fetchTokenInfo]);

  const topHolders = holders.slice(0, 3);

  const handleAddressClick = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    navigate(`/realunit/user/${encodedAddress}`);
  };

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
            <PriceHistoryChart
              timeframe={timeframe}
              priceHistory={priceHistory}
              onTimeframeChange={fetchPriceHistory}
            />
          </div>

          <div className="w-full overflow-x-auto mt-8 mb-4">
            <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'Top Holders')}</h2>
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
                {topHolders.map((holder) => (
                  <tr
                    key={holder.address}
                    className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                  >
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-left text-sm text-dfxBlue-800 cursor-pointer hover:text-dfxBlue-600 hover:underline break-all bg-transparent border-0 p-0"
                          onClick={() => handleAddressClick(holder.address)}
                        >
                          {blankedAddress(holder.address, { displayLength: 18 })}
                        </button>
                        <CopyButton color={IconColor.GRAY} onCopy={() => copy(holder.address)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{holder.balance}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{holder.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {holders.length > 3 && (
            <div className="flex justify-center mt-4">
              <StyledButton
                label={translate('general/actions', 'More')}
                onClick={() => navigate('/realunit/holders')}
                width={StyledButtonWidth.MIN}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
