import { ApiError, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledFileUpload,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useAdminGuard } from '../hooks/guard.hook';

interface FormDataFile {
  file: File;
}

export default function SepaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isUploading, setIsUploading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState<string>();

  useAdminGuard();

  const {
    control,
    handleSubmit,
    resetField,
    formState: { isValid, errors },
  } = useForm<FormDataFile>({ mode: 'onChange' });

  async function onSubmit(data: FormDataFile) {
    if (!data.file) {
      setError('No file selected');
      return;
    }

    const fileData = new FormData();
    fileData.append('files', data.file);

    setIsUploading(true);
    setError(undefined);
    call({
      url: `bankTx`,
      method: 'POST',
      data: fileData,
      noJson: true,
    })
      .then(() => {
        setIsUploading(false);
        toggleNotification();
        resetField('file');
      })
      .catch((e: ApiError) => {
        setIsUploading(false);
        setError(e.message);
      });
  }

  const toggleNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const rules = Utils.createRules({
    file: [Validations.Required, Validations.Custom((file) => (file.type !== 'text/xml' ? 'xml_file' : true))],
  });

  return (
    <Layout title={translate('screens/kyc', 'SEPA XML')}>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          <StyledVerticalStack gap={2} full>
            <p className="flex flex-row justify-between w-full text-dfxGray-700 text-xs font-semibold uppercase text-start px-3">
              <span>{translate('screens/kyc', 'Upload your SEPA file here')}</span>
              <span
                className={` flex flex-row gap-1 items-center text-dfxRed-100 font-normal transition-opacity duration-200 ${
                  showNotification ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
                {translate('screens/kyc', 'Uploaded')}
              </span>
            </p>
            <StyledFileUpload
              name="file"
              label=""
              placeholder={translate('general/actions', 'Drop files here')}
              buttonLabel={translate('general/actions', 'Browse')}
              full
            />
          </StyledVerticalStack>

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Next')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isUploading}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
