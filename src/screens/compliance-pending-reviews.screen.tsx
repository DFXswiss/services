import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { PendingReviewItem, PendingReviewStatus, PendingReviewType, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function CompliancePendingReviewsScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getPendingReviewItems } = useCompliance();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { type, name } = useParams<{ type: PendingReviewType; name: string }>();
  const { search } = useLocation();

  const status =
    (new URLSearchParams(search).get('status') as PendingReviewStatus) ?? PendingReviewStatus.MANUAL_REVIEW;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [items, setItems] = useState<PendingReviewItem[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !type) return;

    const queryName = type === PendingReviewType.KYC_STEP ? name : undefined;
    getPendingReviewItems(type, status, queryName)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, type, name, status]);

  const title =
    type === PendingReviewType.BANK_DATA
      ? `${translate('screens/compliance', 'BankData')} – ${status}`
      : `${name} – ${status}`;

  useLayoutOptions({ title });

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (error) {
    return <ErrorHint message={error} />;
  }

  return (
    <StyledVerticalStack gap={6} full>
      <div className="w-full overflow-x-auto">
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
                {translate('screens/compliance', 'Kyc Level')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Date')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800" />
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                  onClick={() => navigate(`compliance/user/${item.userDataId}/kyc`)}
                >
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{item.userDataId}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{item.accountType ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{item.userName ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{item.kycLevel ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {new Date(item.date).toLocaleDateString('de-CH')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="px-2 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
                      onClick={() => navigate(`compliance/user/${item.userDataId}/kyc`)}
                    >
                      {translate('screens/compliance', 'Open')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center text-dfxGray-700">
                  {translate('screens/compliance', 'No entries found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StyledVerticalStack>
  );
}
