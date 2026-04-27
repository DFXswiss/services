import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { MrosListEntry } from 'src/dto/mros.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { DetailRow, formatDateTime, mrosStatusBadge } from 'src/util/compliance-helpers';

export default function ComplianceMrosDetailScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate } = useSettingsContext();
  const { getMrosById } = useCompliance();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [mros, setMros] = useState<MrosListEntry>();

  useLayoutOptions({ title: translate('screens/compliance', 'MROS Report'), backButton: true });

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(undefined);
    getMrosById(+id)
      .then(setMros)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  if (error) return <ErrorHint message={error} />;
  if (!mros) return <ErrorHint message={translate('screens/compliance', 'MROS report not found')} />;

  return (
    <StyledVerticalStack gap={6} full>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <table className="text-sm text-dfxBlue-800 text-left">
          <tbody>
            <DetailRow label="ID" value={mros.id} />
            <DetailRow label="Created" value={formatDateTime(String(mros.created))} />
            <DetailRow label="Updated" value={formatDateTime(String(mros.updated))} />
            <DetailRow label="UserData ID" value={mros.userData.id} />
            <tr>
              <td className="pr-3 py-0.5 font-medium whitespace-nowrap">Status:</td>
              <td className="py-0.5">{mrosStatusBadge(mros.status)}</td>
            </tr>
            <DetailRow
              label="Submission Date"
              value={mros.submissionDate ? formatDateTime(String(mros.submissionDate)) : undefined}
            />
            <DetailRow label="MROS ID" value={mros.authorityReference} />
            <DetailRow label="Case Manager" value={mros.caseManager} />
          </tbody>
        </table>
      </div>
    </StyledVerticalStack>
  );
}
