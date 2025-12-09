import { ApiError, useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ComplianceUserData, KycFile, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function ComplianceUserScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getUserData } = useCompliance();
  const { getFile } = useKyc();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();
  const [preview, setPreview] = useState<{ url: string; contentType: string; name: string }>();

  async function openFile(file: KycFile): Promise<void> {
    try {
      const { content, contentType } = await getFile(file.uid);
      if (!content || content.type !== 'Buffer' || !Array.isArray(content.data)) {
        setError('Invalid file type');
        return;
      }

      const blob = new Blob([new Uint8Array(content.data)], { type: contentType });
      const url = URL.createObjectURL(blob);

      setPreview({ url, contentType, name: file.name });
    } catch (e: any) {
      setError(e.message ?? 'Error loading file');
    }
  }

  function closePreview(): void {
    setPreview(undefined);
  }

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

  useEffect(() => {
    return () => preview && URL.revokeObjectURL(preview.url);
  }, [preview]);

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
                        className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer`}
                        onClick={() => openFile(file)}
                      >
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{file.id}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 underline">{file.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview && (
              <div className="flex-1 min-w-[600px]">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-dfxGray-700">{preview.name}</h2>
                  <button
                    onClick={closePreview}
                    className="text-dfxGray-700 hover:text-dfxBlue-800 text-2xl font-bold px-2"
                  >
                    ×
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-2 h-[80vh]">
                  {preview.contentType.includes('pdf') ? (
                    <embed src={`${preview.url}#navpanes=0`} type="application/pdf" className="w-full h-full" />
                  ) : (
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="max-w-full max-h-full object-contain mx-auto"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
