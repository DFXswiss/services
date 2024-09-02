import { ApiError, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
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

interface FormDataFile {
  file: File;
}

export default function SepaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    resetField,
    formState: { isValid, errors },
  } = useForm<FormDataFile>({ mode: 'onTouched' });

  async function onSubmit(data: FormDataFile) {
    if (!data.file) {
      setError('No file selected');
      return;
    }

    const fileData = new FormData();
    fileData.append('files', data.file);

    setIsUpdating(true);
    setError(undefined);
    call({
      url: `bankTx`,
      method: 'POST',
      data: fileData,
      noJson: true,
    })
      .then(() => {
        setIsUpdating(false);
        resetField('file');
      })
      .catch((e: ApiError) => {
        setIsUpdating(false);
        setError(e.message);
      });
  }

  const rules = Utils.createRules({
    file: Validations.Required,
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
            <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
              {translate('screens/kyc', 'Upload your SEPA file here')}
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
            isLoading={isUpdating}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
