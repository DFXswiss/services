import { useSettingsContext } from 'src/contexts/settings.context';
import { PendingTransactionInfo } from 'src/hooks/compliance.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { CollapsibleSection } from './collapsible-section';

interface Props {
  entries: PendingTransactionInfo[];
}

export function PendingTransactionsSection({ entries }: Props): JSX.Element | null {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();

  if (entries.length === 0) return null;

  return (
    <CollapsibleSection title={translate('screens/compliance', 'Pending Transactions')} count={entries.length}>
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
        <thead>
          <tr className="bg-dfxGray-300">
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Transaction')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Source')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'User')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/kyc', 'Account Type')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'KYC Level')}
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Amount')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Date')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((tx) => (
            <tr
              key={`${tx.sourceType}-${tx.txId}`}
              className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
              onClick={() => navigate(`compliance/user/${tx.userDataId}/kyc?tab=amlPending`)}
            >
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{tx.txId}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{tx.sourceType}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                {tx.userName ?? '-'} <span className="text-dfxGray-700">#{tx.userDataId}</span>
              </td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{tx.accountType ?? '-'}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{tx.kycLevel ?? '-'}</td>
              <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">
                {tx.inputAmount != null ? `${tx.inputAmount} ${tx.inputAsset ?? ''}`.trim() : '-'}
              </td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                {new Date(tx.date).toLocaleDateString('de-CH')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}
