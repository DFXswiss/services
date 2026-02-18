import {
  CopyButton,
  IconColor,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useRealunitContext } from 'src/contexts/realunit.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { PaginationDirection } from 'src/dto/realunit.dto';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useRealunitGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress } from 'src/util/utils';

export default function RealunitHoldersScreen(): JSX.Element {
  useRealunitGuard();

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { copy } = useClipboard();

  const { holders, totalCount, pageInfo, isLoading, fetchHolders } = useRealunitContext();

  useLayoutOptions({ title: translate('screens/realunit', 'All Holders'), backButton: true });

  useEffect(() => {
    if (!holders.length) fetchHolders();
  }, [fetchHolders]);

  const handleAddressClick = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    navigate(`/realunit/user/${encodedAddress}`);
  };

  const changePage = (dir: PaginationDirection) =>
    fetchHolders(dir === PaginationDirection.NEXT ? pageInfo.endCursor : pageInfo.startCursor, dir);

  return (
    <>
      {isLoading && !holders.length ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full">
          <div className="w-full overflow-x-auto mb-4">
            <h2 className="text-dfxGray-700 mb-4">
              {translate('screens/realunit', 'All Holders')} ({totalCount?.toLocaleString() ?? '0'})
            </h2>
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
