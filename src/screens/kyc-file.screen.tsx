import { ApiError, useApi } from '@dfx.swiss/react';
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
import { FileType, FileTypeLabels } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { openImageFromString, openPdfFromString } from 'src/util/utils';

// TODO: Add to packages
interface KycFileData {
  uid: string;
  name: string;
  type: FileType;
  contentType: string;
  content: any;
}

export default function KycFileScreen(): JSX.Element {
  const { call } = useApi();
  const { translate } = useSettingsContext();
  const { id: kycFileId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [file, setFile] = useState<KycFileData>();

  useEffect(() => {
    if (kycFileId) {
      setIsLoading(true);
      call<KycFileData>({
        url: `kyc/file/${kycFileId}`,
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
  }, [kycFileId]);

  return (
    <Layout title={translate('screens/kyc', 'KYC file')}>
      {isLoading || !file ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : error ? (
        <ErrorHint message={error} />
      ) : (
        <FilePreview file={file} setErrorMessage={setError} />
      )}
    </Layout>
  );
}

interface FilePreviewProps {
  file: KycFileData;
  setErrorMessage: (message: string) => void;
}

function FilePreview({ file, setErrorMessage }: FilePreviewProps): JSX.Element {
  const { translate } = useSettingsContext();

  const { content, contentType } = file;
  const [fileType] = contentType.split('/');

  if (!content || content.type !== 'Buffer' || !Array.isArray(content.data)) {
    setErrorMessage('Invalid file content');
    return <></>;
  }

  const base64Data = Buffer.from(content.data).toString('base64');

  const handleOpenFile = () => {
    if (fileType === 'application') {
      openPdfFromString(base64Data);
    } else if (fileType === 'image') {
      openImageFromString(base64Data, contentType);
    }
  };

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
      <StyledButton width={StyledButtonWidth.FULL} onClick={handleOpenFile} label="View File"></StyledButton>
    </StyledVerticalStack>
  );
}
