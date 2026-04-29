import { PendingOnboardingInfo } from 'src/hooks/compliance.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CollapsibleSection } from './collapsible-section';

interface Props {
  entries: PendingOnboardingInfo[];
}

export function PendingOnboardingsSection({ entries }: Props): JSX.Element | null {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();

  if (entries.length === 0) return null;

  return (
    <CollapsibleSection title={translate('screens/compliance', 'Pending Onboardings')} count={entries.length}>
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
        <thead>
          <tr className="bg-dfxGray-300">
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'ID')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/kyc', 'Account Type')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/kyc', 'Name')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Date')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800" />
          </tr>
        </thead>
        <tbody>
          {entries.map((o) => (
            <tr
              key={o.id}
              className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
              onClick={() => navigate(`compliance/user/${o.id}/kyc`)}
            >
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.id}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.accountType ?? '-'}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.name ?? '-'}</td>
              <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                {new Date(o.date).toLocaleDateString('de-CH')}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded">
                  {translate('screens/compliance', 'Open')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}
