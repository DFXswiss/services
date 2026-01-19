import { StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { Bank, BankBalanceSheet, useAccounting } from 'src/hooks/accounting.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

// Report type options
type ReportType = 'summary' | 'detailed';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'summary', label: 'Ein-Ausgaben' },
  { value: 'detailed', label: 'Detailliert' },
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
  const { getBanks, getBalanceSheet } = useAccounting();
  const [searchParams] = useSearchParams();

  const [error, setError] = useState<string>();

  // Get URL params for preselection
  const yearParam = searchParams.get('year');
  const bankParam = searchParams.get('bank');
  const typeParam = searchParams.get('type') as ReportType | null;

  // Filter state - use URL params if provided
  const [selectedYear, setSelectedYear] = useState<number>(
    yearParam ? parseInt(yearParam, 10) : new Date().getFullYear(),
  );
  const [selectedBankIban, setSelectedBankIban] = useState<string>(bankParam ?? '');
  const [selectedType, setSelectedType] = useState<ReportType>(typeParam ?? 'summary');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isBanksLoading, setIsBanksLoading] = useState(true);

  // Balance sheet state
  const [balanceSheet, setBalanceSheet] = useState<BankBalanceSheet>();
  const [isBalanceSheetLoading, setIsBalanceSheetLoading] = useState(false);

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

    if (selectedBankIban && selectedYear) {
      setIsBalanceSheetLoading(true);
      setBalanceSheet(undefined);
      getBalanceSheet(selectedBankIban, selectedYear)
        .then(setBalanceSheet)
        .catch((e) => setError(e.message))
        .finally(() => setIsBalanceSheetLoading(false));
    } else {
      setBalanceSheet(undefined);
    }
  }, [isInitialized, selectedBankIban, selectedYear]);

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
        <h2 className="text-dfxGray-700 mb-4">{translate('screens/accounting', 'Report Settings')}</h2>
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
                          {translate('screens/accounting', 'Soll')}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-dfxBlue-800 w-1/3 border-l border-dfxGray-400">
                          {translate('screens/accounting', 'Haben')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance */}
                      <tr className="border-b border-dfxGray-300">
                        <td className="px-4 py-2 text-sm text-dfxBlue-800" data-testid="row-opening">
                          {translate('screens/accounting', 'Anfangsbestand')}
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
                          {translate('screens/accounting', 'Alle Einnahmen')}
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
                          {translate('screens/accounting', 'Alle Ausgaben')}
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

                      {/* Saldo (Closing Balance) */}
                      <tr className="bg-dfxGray-300">
                        <td className="px-4 py-2 text-sm font-bold text-dfxBlue-800">
                          {translate('screens/accounting', 'Saldo')}
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
                          'Die Berechnung stimmt mit dem definierten Endbestand überein',
                        )}{' '}
                        ({formatSwiss(balanceSheet.definedClosingBalance ?? 0, balanceSheet.currency)})
                      </p>
                    ) : (
                      <p className="text-sm font-medium" style={{ color: '#721c24' }}>
                        ✗{' '}
                        {translate(
                          'screens/accounting',
                          'Die Berechnung stimmt nicht mit dem definierten Endbestand überein',
                        )}{' '}
                        (Erwartet: {formatSwiss(balanceSheet.definedClosingBalance ?? 0, balanceSheet.currency)},
                        Berechnet: {formatSwiss(balanceSheet.calculatedClosingBalance, balanceSheet.currency)})
                      </p>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* Detailed View Placeholder */}
      {selectedType === 'detailed' && (
        <div className="w-full bg-dfxGray-300 rounded-lg p-4" data-testid="detailed-view">
          <p className="text-center text-dfxGray-700">
            {translate('screens/accounting', 'Detaillierte Ansicht wird implementiert...')}
          </p>
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
