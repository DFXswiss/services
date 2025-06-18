import { ResponseType, useApi, Utils, Validations } from '@dfx.swiss/react';
import { Form, StyledButton, StyledButtonWidth, StyledInput, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { downloadFile, filenameDateFormat } from 'src/util/utils';

interface FormData {
  userDataIds: string;
}

export default function DownloadScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(undefined);

    call<{ data: Blob; headers: Record<string, string> }>({
      url: 'userData/download',
      method: 'POST',
      data: { userDataIds: data.userDataIds.split(',').map((id) => Number(id)) },
      responseType: ResponseType.BLOB,
    })
      .then(({ data, headers }) => {
        downloadFile(data, headers, `DFX_export_${filenameDateFormat()}.zip`);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  const rules = Utils.createRules({
    userDataIds: [
      Validations.Required,
      Validations.Custom((ids) => (ids.split(',').every((id: string) => !isNaN(Number(id))) ? true : 'pattern')),
    ],
  });

  useLayoutOptions({ title: translate('screens/kyc', 'File download') });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full>
          <StyledInput
            name="userDataIds"
            type="text"
            label={translate('screens/kyc', 'UserData IDs')}
            placeholder={translate('screens/kyc', '1234, 5678, 9012')}
          />
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Download')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isLoading}
        />
      </StyledVerticalStack>
    </Form>
  );
}
