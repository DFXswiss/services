import { StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { Bank, BankBalanceSheet, DetailedBalanceSheet, useAccounting } from 'src/hooks/accounting.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

// Report type options
type ReportType = 'summary' | 'detailed';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'summary', label: 'Income/Expenses' },
  { value: 'detailed', label: 'Detailed' },
];

// Generate year options from 2021 to current year
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = 2021; year <= currentYear; year++) {
    years.push(year);
  }
  return years;
}

// Format number in Swiss format with apostrophe as thousands separator
function formatSwiss(value: number, currency?: string): string {
  const formatted = value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

export default function AccountingScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { isInitialized } = useWalletContext();
  const { getBanks, getBalanceSheet, getDetailedBalanceSheet } = useAccounting();
  const [searchParams] = useSearchParams();

  const [error, setError] = useState<string>();

  // Get URL params for preselection
  const yearParam = searchParams.get('year');
  const bankParam = searchParams.get('bank');
  const typeParam = searchParams.get('type') as ReportType | null;

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedBankIban, setSelectedBankIban] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ReportType>('summary');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBanksLoading, setIsBanksLoading] = useState(true);

  // Sync URL params to state on mount and when searchParams change
  useEffect(() => {
    if (yearParam) setSelectedYear(parseInt(yearParam, 10));
    if (bankParam) setSelectedBankIban(bankParam);
    if (typeParam && (typeParam === 'summary' || typeParam === 'detailed')) {
      setSelectedType(typeParam);
    }
  }, [yearParam, bankParam, typeParam]);

  // Balance sheet state
  const [balanceSheet, setBalanceSheet] = useState<BankBalanceSheet>();
  const [isBalanceSheetLoading, setIsBalanceSheetLoading] = useState(false);

  // Detailed balance sheet state
  const [detailedBalanceSheet, setDetailedBalanceSheet] = useState<DetailedBalanceSheet>();
  const [isDetailedLoading, setIsDetailedLoading] = useState(false);

  const yearOptions = getYearOptions();

  // Get selected bank
  const selectedBank = useMemo(() => banks.find((b) => b.iban === selectedBankIban), [banks, selectedBankIban]);

  // Load banks when auth is initialized
  useEffect(() => {
    if (!isInitialized) return;

    setIsBanksLoading(true);
    getBanks()
      .then((loadedBanks) => {
        setBanks(loadedBanks);
        // Auto-select first bank if no bank param provided
        if (!bankParam && loadedBanks.length > 0) {
          setSelectedBankIban(loadedBanks[0].iban);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsBanksLoading(false));
  }, [isInitialized]);

  // Load balance sheet when bank or year changes (only after auth is initialized)
  useEffect(() => {
    if (!isInitialized) return;

    if (selectedBankIban && selectedYear && selectedType === 'summary') {
      setIsBalanceSheetLoading(true);
      setBalanceSheet(undefined);
      getBalanceSheet(selectedBankIban, selectedYear)
        .then(setBalanceSheet)
        .catch((e) => setError(e.message))
        .finally(() => setIsBalanceSheetLoading(false));
    } else {
      setBalanceSheet(undefined);
    }
  }, [isInitialized, selectedBankIban, selectedYear, selectedType]);

  // Load detailed balance sheet when type is detailed
  useEffect(() => {
    if (!isInitialized) return;

    if (selectedBankIban && selectedYear && selectedType === 'detailed') {
      setIsDetailedLoading(true);
      setDetailedBalanceSheet(undefined);
      getDetailedBalanceSheet(selectedBankIban, selectedYear)
        .then(setDetailedBalanceSheet)
        .catch((e) => setError(e.message))
        .finally(() => setIsDetailedLoading(false));
    } else {
      setDetailedBalanceSheet(undefined);
    }
  }, [isInitialized, selectedBankIban, selectedYear, selectedType]);

  useLayoutOptions({ title: translate('screens/accounting', 'Accounting') });

  // Calculate totals for T-account
  const totalSoll = balanceSheet ? balanceSheet.totalExpenses : 0;
  const totalHaben = balanceSheet ? balanceSheet.openingBalance + balanceSheet.totalIncome : 0;

  return (
    <StyledVerticalStack gap={6} full center>
      {/* Title */}
      <h1 className="text-2xl font-bold text-dfxBlue-800">
        {translate('screens/accounting', 'DFX Accounting Report')}
      </h1>

      {/* Filter Section */}
      <div className="w-full">
        <div className="flex gap-4 flex-wrap">
          {/* Year Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-dfxGray-700 text-sm block mb-1">{translate('screens/accounting', 'Year')}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-dfxGray-400 rounded-md text-dfxBlue-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-dfxGray-700 text-sm block mb-1">{translate('screens/accounting', 'Bank')}</label>
            <select
              value={selectedBankIban}
              onChange={(e) => setSelectedBankIban(e.target.value)}
              disabled={isBanksLoading || banks.length === 0}
              className="w-full px-3 py-2 border border-dfxGray-400 rounded-md text-dfxBlue-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue disabled:bg-dfxGray-300"
            >
              {banks.map((bank) => (
                <option key={bank.iban} value={bank.iban}>
                  {bank.name} ({bank.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-dfxGray-700 text-sm block mb-1">{translate('screens/accounting', 'Type')}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-dfxGray-400 rounded-md text-dfxBlue-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {translate('screens/accounting', type.label)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* T-Account Balance Sheet (Summary View) */}
      {selectedType === 'summary' && (balanceSheet || isBalanceSheetLoading) && (
        <div className="w-full bg-dfxGray-300 rounded-lg p-4" data-testid="balance-sheet">
          {isBalanceSheetLoading ? (
            <div className="text-center text-dfxGray-700">Loading...</div>
          ) : (
            balanceSheet && (
              <>
                {/* Bank Info Header */}
                <div className="mb-4 border-b border-dfxGray-400 pb-3">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="text-dfxGray-700 py-1 w-32">IBAN:</td>
                        <td className="text-dfxBlue-800 font-medium font-mono">{balanceSheet.iban}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* T-Account Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-lg">
                    <thead>
                      <tr className="border-b-2 border-dfxBlue-800">
                        <th className="px-4 py-3 text-left text-sm font-bold text-dfxBlue-800 w-1/3"></th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/3 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Debit')}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/3 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Credit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2 text-sm text-dfxBlue-800" data-testid="row-opening">
                          {translate('screens/accounting', 'Opening Balance')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="opening-balance"
                        >
                          {formatSwiss(balanceSheet.openingBalance)}
                        </td>
                      </tr>

                      {/* Total Income */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2 text-sm text-dfxBlue-800" data-testid="row-income">
                          {translate('screens/accounting', 'Total Income')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="total-income"
                        >
                          {formatSwiss(balanceSheet.totalIncome)}
                        </td>
                      </tr>

                      {/* Total Expenses */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2 text-sm text-dfxBlue-800" data-testid="row-expenses">
                          {translate('screens/accounting', 'Total Expenses')}
                        </td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="total-expenses"
                        >
                          {formatSwiss(balanceSheet.totalExpenses)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                      </tr>

                      {/* Empty row for spacing */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                      </tr>

                      {/* Total Row */}
                      <tr className="border-b-2 border-dfxBlue-800 bg-dfxGray-300">
                        <td className="px-4 py-2 text-sm font-bold text-dfxBlue-800">
                          {translate('screens/accounting', 'Total')}
                        </td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="total-soll"
                        >
                          {formatSwiss(totalSoll)}
                        </td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="total-haben"
                        >
                          {formatSwiss(totalHaben)}
                        </td>
                      </tr>

                      {/* Balance (Closing Balance) */}
                      <tr className="bg-dfxGray-300">
                        <td className="px-4 py-2 text-sm font-bold text-dfxBlue-800">
                          {translate('screens/accounting', 'Balance')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td
                          className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400"
                          data-testid="closing-balance"
                        >
                          {formatSwiss(balanceSheet.calculatedClosingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Validation Message */}
                {balanceSheet.hasDefinedClosingBalance && (
                  <div
                    className="mt-4 p-3 rounded-lg"
                    style={{ backgroundColor: balanceSheet.balanceMatches ? '#d4edda' : '#f8d7da' }}
                    data-testid="validation-message"
                  >
                    {balanceSheet.balanceMatches ? (
                      <p className="text-sm font-medium" style={{ color: '#155724' }}>
                        ✓{' '}
                        {translate(
                          'screens/accounting',
                          'Calculation matches the defined closing balance',
                        )}{' '}
                        ({formatSwiss(balanceSheet.definedClosingBalance ?? 0, balanceSheet.currency)})
                      </p>
                    ) : (
                      <p className="text-sm font-medium" style={{ color: '#721c24' }}>
                        ✗{' '}
                        {translate(
                          'screens/accounting',
                          'Calculation does not match the defined closing balance',
                        )}{' '}
                        ({translate('screens/accounting', 'Expected')}: {formatSwiss(balanceSheet.definedClosingBalance ?? 0, balanceSheet.currency)},
                        {translate('screens/accounting', 'Calculated')}: {formatSwiss(balanceSheet.calculatedClosingBalance, balanceSheet.currency)})
                      </p>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* Detailed View */}
      {selectedType === 'detailed' && (detailedBalanceSheet || isDetailedLoading) && (
        <div className="w-full bg-dfxGray-300 rounded-lg p-4" data-testid="detailed-view">
          {isDetailedLoading ? (
            <div className="text-center text-dfxGray-700">Loading...</div>
          ) : (
            detailedBalanceSheet && (
              <>
                {/* Bank Info Header */}
                <div className="mb-4 border-b border-dfxGray-400 pb-3">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="text-dfxGray-700 py-1 w-32">IBAN:</td>
                        <td className="text-dfxBlue-800 font-medium font-mono">{detailedBalanceSheet.iban}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Detailed T-Account Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-lg">
                    <thead>
                      <tr className="border-b-2 border-dfxBlue-800">
                        <th className="px-4 py-3 text-left text-sm font-bold text-dfxBlue-800 w-1/3"></th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/6 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Count')}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/4 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Debit')}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/4 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Credit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance */}
                      <tr className="border-b border-dfxGray-300 bg-dfxGray-100">
                        <td className="px-4 py-2 text-sm font-medium text-dfxBlue-800">
                          {translate('screens/accounting', 'Opening Balance')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.openingBalance)}
                        </td>
                      </tr>

                      {/* Income Section Header */}
                      <tr className="border-b border-dfxGray-300 bg-green-50">
                        <td colSpan={4} className="px-4 py-2 text-sm font-bold text-green-800">
                          {translate('screens/accounting', 'Income by Type')}
                        </td>
                      </tr>

                      {/* Income by Type */}
                      {detailedBalanceSheet.incomeByType.map((item) => (
                        <tr key={`income-${item.type}`} className="border-b border-dfxGray-300">
                          <td className="px-4 py-2 text-sm text-dfxBlue-800 pl-8">{item.type}</td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-dfxGray-700 border-l border-dfxGray-400">
                            {item.count}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-green-700 border-l border-dfxGray-400">
                            {formatSwiss(item.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Income Subtotal */}
                      <tr className="border-b border-dfxGray-400 bg-green-50">
                        <td className="px-4 py-2 text-sm font-medium text-green-800">
                          {translate('screens/accounting', 'Total Income')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxGray-700 border-l border-dfxGray-400">
                          {detailedBalanceSheet.incomeByType.reduce((sum, t) => sum + t.count, 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-bold text-green-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.totalIncome)}
                        </td>
                      </tr>

                      {/* Expenses Section Header */}
                      <tr className="border-b border-dfxGray-300 bg-red-50">
                        <td colSpan={4} className="px-4 py-2 text-sm font-bold text-red-800">
                          {translate('screens/accounting', 'Expenses by Type')}
                        </td>
                      </tr>

                      {/* Expenses by Type */}
                      {detailedBalanceSheet.expensesByType.map((item) => (
                        <tr key={`expense-${item.type}`} className="border-b border-dfxGray-300">
                          <td className="px-4 py-2 text-sm text-dfxBlue-800 pl-8">{item.type}</td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-dfxGray-700 border-l border-dfxGray-400">
                            {item.count}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-red-700 border-l border-dfxGray-400">
                            {formatSwiss(item.amount)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        </tr>
                      ))}

                      {/* Expenses Subtotal */}
                      <tr className="border-b border-dfxGray-400 bg-red-50">
                        <td className="px-4 py-2 text-sm font-medium text-red-800">
                          {translate('screens/accounting', 'Total Expenses')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxGray-700 border-l border-dfxGray-400">
                          {detailedBalanceSheet.expensesByType.reduce((sum, t) => sum + t.count, 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-bold text-red-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.totalExpenses)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                      </tr>

                      {/* Empty row for spacing */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                      </tr>

                      {/* Total Row */}
                      <tr className="border-b-2 border-dfxBlue-800 bg-dfxGray-300">
                        <td className="px-4 py-2 text-sm font-bold text-dfxBlue-800">
                          {translate('screens/accounting', 'Total')}
                        </td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.totalExpenses)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.openingBalance + detailedBalanceSheet.totalIncome)}
                        </td>
                      </tr>

                      {/* Balance (Closing Balance) */}
                      <tr className="bg-dfxGray-300">
                        <td className="px-4 py-2 text-sm font-bold text-dfxBlue-800">
                          {translate('screens/accounting', 'Balance')}
                        </td>
                        <td className="px-4 py-2 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-dfxBlue-800 border-l border-dfxGray-400"></td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-bold text-dfxBlue-800 border-l border-dfxGray-400">
                          {formatSwiss(detailedBalanceSheet.calculatedClosingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Validation Message */}
                {detailedBalanceSheet.hasDefinedClosingBalance && (
                  <div
                    className="mt-4 p-3 rounded-lg"
                    style={{ backgroundColor: detailedBalanceSheet.balanceMatches ? '#d4edda' : '#f8d7da' }}
                    data-testid="validation-message"
                  >
                    {detailedBalanceSheet.balanceMatches ? (
                      <p className="text-sm font-medium" style={{ color: '#155724' }}>
                        ✓{' '}
                        {translate(
                          'screens/accounting',
                          'Calculation matches the defined closing balance',
                        )}{' '}
                        ({formatSwiss(detailedBalanceSheet.definedClosingBalance ?? 0, detailedBalanceSheet.currency)})
                      </p>
                    ) : (
                      <p className="text-sm font-medium" style={{ color: '#721c24' }}>
                        ✗{' '}
                        {translate(
                          'screens/accounting',
                          'Calculation does not match the defined closing balance',
                        )}{' '}
                        ({translate('screens/accounting', 'Expected')}: {formatSwiss(detailedBalanceSheet.definedClosingBalance ?? 0, detailedBalanceSheet.currency)},
                        {translate('screens/accounting', 'Calculated')}: {formatSwiss(detailedBalanceSheet.calculatedClosingBalance, detailedBalanceSheet.currency)})
                      </p>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}
