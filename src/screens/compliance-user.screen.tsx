import { ApiError } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ComplianceUserData, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function ComplianceUserScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getUserData } = useCompliance();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();

  useEffect(() => {
    if (userDataId) {
      setIsLoading(true);
      getUserData(+userDataId)
        .then(setData)
        .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    } else {
      setError('No ID provided');
    }
  }, [userDataId]);

  useLayoutOptions({ title: translate('screens/compliance', 'User Data'), backButton: true, noMaxWidth: true });

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading || !data ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="flex justify-center gap-2">
            <div>
              <h2 className="text-dfxGray-700">{translate('screens/compliance', 'User Data')}</h2>
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Key')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Value')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.userData).map(([key, value]) => {
                    let keyString = key;
                    let valueString = value?.toString() || '-';

                    if (Array.isArray(value)) {
                      keyString = key.replace(/s+$/, 'Ids');
                      valueString = value.map((i) => i.id).join(', ') || '-';
                    } else if (value && typeof value === 'object') {
                      keyString += 'Id';
                      valueString = value.id;
                    }

                    return (
                      <tr key={key} className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300`}>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{keyString}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{valueString}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.kycFiles.length !== 0 && (
              <div>
                <h2 className="text-dfxGray-700">{translate('screens/compliance', 'KYC Files')}</h2>
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-dfxGray-300">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'ID')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'Name')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kycFiles.map((file) => (
                      <tr
                        key={file.id}
                        className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300`}
                      >
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{file.id}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{file.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
