import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { BalanceChart, BalanceMetric } from 'src/components/realunit/balance-chart';
import { ButtonGroup, ButtonGroupSize } from 'src/components/safe/button-group';
import { useSettingsContext } from 'src/contexts/settings.context';
import { PaginationDirection } from 'src/dto/realunit.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useRealunit } from 'src/hooks/realunit.hook';
import { formatCurrency } from 'src/util/utils';

export default function RealunitUserScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { address } = useParams<{ address: string }>();
  const { data, history, isLoading, isLoadingHistory, error, fetchAccountSummary, fetchAccountHistory } = useRealunit();

  const [metric, setMetric] = useState<BalanceMetric>(BalanceMetric.REALU);

  useEffect(() => {
    if (address) {
      fetchAccountSummary(address);
      fetchAccountHistory(address);
    }
  }, [address, fetchAccountSummary, fetchAccountHistory]);

  useLayoutOptions({ title: translate('screens/realunit', 'Account Summary'), backButton: true });

  const changePage = (dir: PaginationDirection) =>
    address &&
    fetchAccountHistory(
      address,
      dir === PaginationDirection.NEXT ? history?.pageInfo.endCursor : history?.pageInfo.startCursor,
      dir,
    );

  const currentBalance = useMemo(
    () =>
      data &&
      (metric === BalanceMetric.CHF
        ? formatCurrency(data.historicalBalances?.[0]?.valueChf ?? 0, 2, 2)
        : (Number(data.balance) / 100).toFixed(2)),
    [data, metric],
  );

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : !data ? (
        <p className="text-dfxGray-700">{translate('screens/realunit', 'No data available')}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'Account Details')}</h2>
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/realunit', 'Key')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/realunit', 'Value')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {translate('screens/realunit', 'Address')}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 break-all">{data.address}</td>
                  </tr>
                  <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {translate('screens/realunit', 'Address Type')}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{data.addressType}</td>
                  </tr>
                  <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {translate('screens/realunit', 'Balance')}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {(Number(data.balance) / 100).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {translate('screens/realunit', 'Last Updated')}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                      {new Date(data.lastUpdated).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.historicalBalances && (
              <div className="shadow-card rounded-xl">
                <div id="chart-timeline" className="relative">
                  <div className="p-2 gap-2 flex flex-col items-start">
                    <div className="relative w-full" style={{ height: '350px' }}>
                      <div className="w-full flex flex-col gap-3 text-left leading-none z-10">
                        <h2 className="text-dfxBlue-800">{translate('screens/realunit', 'Balance History')}</h2>
                        <p className="text-dfxGray-700">{translate('screens/realunit', 'Current balance')}</p>
                        <div className="flex flex-row items-center gap-3 z-10">
                          <ButtonGroup<BalanceMetric>
                            items={Object.values(BalanceMetric)}
                            selected={metric}
                            onClick={setMetric}
                            buttonLabel={(m: BalanceMetric) => (m === BalanceMetric.CHF ? 'CHF' : 'REALU')}
                            size={ButtonGroupSize.SM}
                          />
                          <div className="text-dfxBlue-800">
                            <span className="text-lg font-bold">{currentBalance}</span>{' '}
                            <span className="text-base">{metric === BalanceMetric.CHF ? 'CHF' : 'REALU'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0">
                        <BalanceChart historicalBalances={data.historicalBalances} metric={metric} isLoading={false} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {history && (
              <div>
                <h2 className="text-dfxGray-700 mb-4">
                  {translate('screens/realunit', 'Transaction History')} ({history.totalCount ?? 0})
                </h2>
                {isLoadingHistory ? (
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                ) : history.history.length > 0 ? (
                  <>
                    <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                      <thead>
                        <tr className="bg-dfxGray-300">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                            {translate('screens/realunit', 'Timestamp')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                            {translate('screens/realunit', 'Event Type')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                            {translate('screens/realunit', 'Details')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                            {translate('screens/realunit', 'Tx Hash')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.history.map((event, index) => (
                          <tr
                            key={index}
                            className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                          >
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {new Date(event.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{event.eventType}</td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                              {event.transfer && (
                                <div className="flex flex-col gap-1">
                                  <div>From: {event.transfer.from}</div>
                                  <div>To: {event.transfer.to}</div>
                                  <div>Value: {(Number(event.transfer.value) / 100).toFixed(2)}</div>
                                </div>
                              )}
                              {event.approval && (
                                <div className="flex flex-col gap-1">
                                  <div>Spender: {event.approval.spender}</div>
                                  <div>Value: {(Number(event.approval.value) / 100).toFixed(2)}</div>
                                </div>
                              )}
                              {event.tokensDeclaredInvalid && `Amount: ${event.tokensDeclaredInvalid.amount}`}
                              {event.addressTypeUpdate && `Type: ${event.addressTypeUpdate.addressType}`}
                            </td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 break-all">
                              {event.txHash ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex items-center justify-between gap-2 mt-4">
                      <StyledButton
                        label={translate('general/actions', 'Previous')}
                        onClick={() => changePage(PaginationDirection.PREV)}
                        disabled={!history.pageInfo.hasPreviousPage}
                        width={StyledButtonWidth.MIN}
                      />
                      <StyledButton
                        label={translate('general/actions', 'Next')}
                        onClick={() => changePage(PaginationDirection.NEXT)}
                        disabled={!history.pageInfo.hasNextPage}
                        width={StyledButtonWidth.MIN}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-dfxGray-700">{translate('screens/realunit', 'No transactions found')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
