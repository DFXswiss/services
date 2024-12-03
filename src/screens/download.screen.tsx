import { useApi, Utils, Validations } from '@dfx.swiss/react';
import { Form, StyledButton, StyledButtonWidth, StyledInput, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';

interface FormData {
  userDataIds: string;
}

export default function DownloadScreen(): JSX.Element {
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

    try {
      const response = await call({
        url: `userData/download`,
        method: 'POST',
        data: { userDataIds: data.userDataIds.split(',').map((id) => Number(id)) },
        noJsonResponse: true,
      });

      const link = document.createElement('a');
      link.href = `data:application/zip;base64,${response}`;
      link.download = 'userData.zip';
      link.click();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  const rules = Utils.createRules({
    userDataIds: [
      Validations.Required,
      Validations.Custom((ids) => (ids.split(',').every((id: string) => !isNaN(Number(id))) ? true : 'pattern')),
    ],
  });

  return (
    <Layout title={translate('screens/kyc', 'File download')}>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
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
    </Layout>
  );
}
