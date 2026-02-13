import {
  CopyButton,
  IconColor,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
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

  const {
    holders,
    totalCount,
    tokenInfo,
    isLoading,
    priceHistory,
    timeframe,
    quotes,
    transactions,
    quotesLoading,
    transactionsLoading,
    fetchHolders,
    fetchPriceHistory,
    fetchTokenInfo,
    fetchQuotes,
    fetchTransactions,
  } = useRealunitContext();

  useLayoutOptions({ backButton: true });

  useEffect(() => {
    if (!holders.length) fetchHolders();
    if (!tokenInfo) fetchTokenInfo();
    if (!priceHistory.length) fetchPriceHistory();
    if (!quotes.length) fetchQuotes();
    if (!transactions.length) fetchTransactions();
  }, [fetchHolders, fetchTokenInfo, fetchQuotes, fetchTransactions]);

  const topHolders = holders.slice(0, 3);
  const topQuotes = quotes.slice(0, 3);
  const topTransactions = transactions.slice(0, 3);

  const displayType = (type: string): string => {
    switch (type) {
      case 'BuyFiat':
        return 'Sell';
      case 'BuyCrypto':
        return 'Buy';
      default:
        return type;
    }
  };

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
            <h2 className="text-dfxGray-700 justify-center  mb-2">{translate('screens/realunit', 'Price History')}</h2>
            <PriceHistoryChart
              timeframe={timeframe}
              priceHistory={priceHistory}
              onTimeframeChange={fetchPriceHistory}
            />
          </div>

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
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </div>
          )}

          <div className="w-full overflow-x-auto mt-8 mb-4">
            <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'Pending Transactions')}</h2>
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-dfxGray-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Type')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Amount')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'User')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Created')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                    onClick={() => navigate(`/realunit/quotes/${quote.id}`)}
                  >
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{displayType(quote.type)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{quote.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {quote.userAddress ? blankedAddress(quote.userAddress, { displayLength: 12 }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {new Date(quote.created).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!quotes.length && !quotesLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-sm text-dfxGray-700">
                      {translate('screens/realunit', 'No pending transactions found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {quotesLoading && !quotes.length && (
              <div className="flex justify-center mt-4">
                <StyledLoadingSpinner size={SpinnerSize.SM} />
              </div>
            )}
          </div>

          {quotes.length > 3 && (
            <div className="flex justify-center mt-4">
              <StyledButton
                label={translate('general/actions', 'More')}
                onClick={() => navigate('/realunit/quotes')}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </div>
          )}

          <div className="w-full overflow-x-auto mt-8 mb-4">
            <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'Received Transactions')}</h2>
            <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-dfxGray-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Type')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Amount CHF')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'User')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                    {translate('screens/realunit', 'Date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                    onClick={() => navigate(`/realunit/transactions/${tx.id}`)}
                  >
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{displayType(tx.type)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {tx.amountInChf?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {tx.userAddress ? blankedAddress(tx.userAddress, { displayLength: 12 }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {new Date(tx.outputDate ?? tx.created).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!transactions.length && !transactionsLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-sm text-dfxGray-700">
                      {translate('screens/realunit', 'No received transactions found')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {transactionsLoading && !transactions.length && (
              <div className="flex justify-center mt-4">
                <StyledLoadingSpinner size={SpinnerSize.SM} />
              </div>
            )}
          </div>

          {transactions.length > 3 && (
            <div className="flex justify-center mt-4">
              <StyledButton
                label={translate('general/actions', 'More')}
                onClick={() => navigate('/realunit/transactions')}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
