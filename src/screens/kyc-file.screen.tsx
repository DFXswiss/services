import { ApiError, useApi } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';

export default function KycFileScreen(): JSX.Element {
  const { call } = useApi();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [file, setFile] = useState<any>();

  useEffect(() => {
    const kycFileKey = searchParams.get('id');
    if (kycFileKey) {
      setIsLoading(true);
      call({
        url: `kyc/file/${kycFileKey}`,
        version: 'v2',
        method: 'GET',
      })
        .then(setFile)
        .catch((e: ApiError) => {
          setError(e.message ?? 'Unknown error');
        })
        .finally(() => setIsLoading(false));
    } else {
      setError('No key provided');
    }
  }, []);

  return (
    <Layout>
      {isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : error ? (
        <ErrorHint message={error} />
      ) : (
        <div>File: {file?.name}</div>
      )}
    </Layout>
  );
}
