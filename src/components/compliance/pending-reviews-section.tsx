import { PendingReviewItem, PendingReviewStatus, PendingReviewSummaryEntry, PendingReviewType } from '@dfx.swiss/react';
import { Fragment, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { CollapsibleSection } from './collapsible-section';

interface Props {
  entries: PendingReviewSummaryEntry[];
}

type ExpandState = { state: 'loading' } | { state: 'loaded'; items: PendingReviewItem[] };

export function PendingReviewsSection({ entries }: Props): JSX.Element | null {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { getPendingReviewItems } = useCompliance();

  const [expanded, setExpanded] = useState<Record<string, ExpandState>>({});

  if (entries.length === 0) return null;

  const totalCount = entries.reduce((sum, r) => sum + r.manualReview + r.internalReview, 0);

  async function toggleExpansion(type: PendingReviewType, name: string, status: PendingReviewStatus) {
    const key = `${type}-${name}-${status}`;
    if (expanded[key]) {
      setExpanded(({ [key]: _removed, ...rest }) => rest);
      return;
    }
    setExpanded((prev) => ({ ...prev, [key]: { state: 'loading' } }));
    const queryName = type === PendingReviewType.KYC_STEP ? name : undefined;
    try {
      const items = await getPendingReviewItems(type, status, queryName);
      setExpanded((prev) => ({ ...prev, [key]: { state: 'loaded', items } }));
    } catch {
      setExpanded(({ [key]: _removed, ...rest }) => rest);
    }
  }

  return (
    <CollapsibleSection title={translate('screens/compliance', 'Pending Reviews')} count={totalCount}>
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
        <thead>
          <tr className="bg-dfxGray-300">
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Type')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/kyc', 'Name')}
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Manual Review')}
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Internal Review')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((r) => (
            <Fragment key={`${r.type}-${r.name}`}>
              {[PendingReviewStatus.MANUAL_REVIEW, PendingReviewStatus.INTERNAL_REVIEW].map((s) => {
                const isManual = s === PendingReviewStatus.MANUAL_REVIEW;
                const count = isManual ? r.manualReview : r.internalReview;
                if (count === 0) return null;
                const key = `${r.type}-${r.name}-${s}`;
                const expandState = expanded[key];
                const valueCell = 'px-4 py-3 text-right text-sm text-dfxBlue-800 font-semibold';
                const emptyCell = 'px-4 py-3 text-right text-sm text-dfxGray-600';
                return (
                  <Fragment key={s}>
                    <tr
                      className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                      onClick={() => toggleExpansion(r.type, r.name, s)}
                    >
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{r.type}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{r.name}</td>
                      <td className={isManual ? valueCell : emptyCell}>{isManual ? count : '-'}</td>
                      <td className={isManual ? emptyCell : valueCell}>{isManual ? '-' : count}</td>
                    </tr>
                    {expandState && (
                      <tr className="border-b border-dfxGray-300 bg-dfxGray-100">
                        <td colSpan={4} className="px-4 py-3">
                          {expandState.state === 'loading' ? (
                            <div className="text-sm text-dfxGray-700">{translate('general/actions', 'Loading')}…</div>
                          ) : expandState.items.length === 0 ? (
                            <div className="text-sm text-dfxGray-700">
                              {translate('screens/compliance', 'No entries found')}
                            </div>
                          ) : (
                            <ReviewItemsTable items={expandState.items} navigate={navigate} translate={translate} />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}

function ReviewItemsTable({
  items,
  navigate,
  translate,
}: {
  items: PendingReviewItem[];
  navigate: (to: string) => void;
  translate: (namespace: string, key: string) => string;
}): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-dfxGray-300">
          <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'ID')}
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">
            {translate('screens/kyc', 'Account Type')}
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">
            {translate('screens/kyc', 'Name')}
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Kyc Level')}
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Date')}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
            onClick={() => navigate(`compliance/user/${item.userDataId}/kyc`)}
          >
            <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{item.userDataId}</td>
            <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{item.accountType ?? '-'}</td>
            <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{item.userName ?? '-'}</td>
            <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{item.kycLevel ?? '-'}</td>
            <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">
              {new Date(item.date).toLocaleDateString('de-CH')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
