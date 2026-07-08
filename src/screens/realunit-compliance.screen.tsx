import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';
import { useRealunitGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useRealunitCompliance } from 'src/hooks/realunit-compliance.hook';

export default function RealunitComplianceScreen(): JSX.Element {
  useRealunitGuard();

  const { translate } = useSettingsContext();
  const { searchCustomers } = useRealunitCompliance();
  const { navigate } = useNavigation();

  const [searchKey, setSearchKey] = useState('');
  const [results, setResults] = useState<RealUnitCustomerListDto[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useLayoutOptions({
    title: translate('screens/compliance', 'RealUnit Compliance'),
    backButton: true,
    noMaxWidth: true,
  });

  // Load the complete customer list upfront; a search key narrows it down, an empty search shows all again.
  useEffect(() => loadCustomers(), []);

  function loadCustomers(key?: string): void {
    setIsLoading(true);
    setError(undefined);
    setResults(undefined);
    searchCustomers(key)
      .then((res) => setResults(res))
      .catch((e: Error) => setError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  function handleSearch(): void {
    loadCustomers(searchKey.trim() || undefined);
  }

  return (
    <div className="w-full max-w-screen-xl mx-auto flex flex-col gap-3 p-4 md:p-6 text-left">
      <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 flex-1"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder={translate('screens/compliance', 'Search by ID, email, phone or name...')}
          />
          <button
            className="px-4 py-1.5 bg-dfxBlue-400 text-white rounded text-sm hover:bg-dfxBlue-800 transition-colors disabled:opacity-50"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? '…' : translate('general/actions', 'Search')}
          </button>
        </div>
        {error && <ErrorHint message={error} />}
      </div>

      {isLoading && <StyledLoadingSpinner size={SpinnerSize.LG} />}

      {results && !isLoading && (
        <div className="bg-white rounded-lg shadow-sm overflow-auto scroll-shadow">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-dfxGray-700">{translate('screens/compliance', 'No entries found')}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-dfxGray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                    {translate('screens/kyc', 'Account Type')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                    {translate('screens/kyc', 'Name')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800 break-all">
                    {translate('screens/compliance', 'Email')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                    {translate('screens/kyc', 'KYC Status')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                    {translate('screens/kyc', 'KYC Level')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group"
                    onClick={() => navigate(`/realunit/compliance/user/${u.id}`)}
                  >
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white">{u.id}</td>
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white">{u.accountType ?? '-'}</td>
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white">{u.name ?? '-'}</td>
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white break-all">{u.mail ?? '-'}</td>
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white">{u.kycStatus}</td>
                    <td className="px-3 py-2 text-dfxBlue-800 group-hover:text-white">{u.kycLevel ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
