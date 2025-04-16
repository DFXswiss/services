import { ApiError, KycFile, useKyc } from '@dfx.swiss/react';
import {
  AlignContent,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { FileTypeLabels } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { handleOpenFile } from 'src/util/utils';

export default function KycFileScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { id: kycFileId } = useParams();
  const { getFile } = useKyc();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [file, setFile] = useState<KycFile>();

  const show = new URLSearchParams(window.location.search).has('show');

  useEffect(() => {
    if (kycFileId) {
      setIsLoading(true);
      getFile(kycFileId)
        .then((fetchedFile) => {
          setFile(fetchedFile);
          if (show) {
            handleOpenFile(fetchedFile, setError, false);
          }
        })
        .catch((e: ApiError) => {
          setError(e.message ?? 'Unknown error');
        })
        .finally(() => setIsLoading(false));
    } else {
      setError('No key provided');
    }
  }, [kycFileId, show]);

  return (
    <Layout title={translate('screens/kyc', 'KYC file')}>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading || !file ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <FilePreview file={file} setErrorMessage={setError} />
      )}
    </Layout>
  );
}

interface FilePreviewProps {
  file: KycFile;
  setErrorMessage: (message: string) => void;
}

function FilePreview({ file, setErrorMessage }: FilePreviewProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack full center gap={2}>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'ID')}>
          <p>{file.uid}</p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Name')}>
          <p>{file.name}</p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Type')}>
          <p>{translate('screens/kyc', FileTypeLabels[file.type])}</p>
        </StyledDataTableRow>
      </StyledDataTable>
      <StyledButton
        width={StyledButtonWidth.FULL}
        onClick={() => handleOpenFile(file, setErrorMessage)}
        label={translate('general/actions', 'View file')}
      ></StyledButton>
    </StyledVerticalStack>
  );
}
