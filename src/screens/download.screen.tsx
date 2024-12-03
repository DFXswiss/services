import { useAuthContext, Utils, Validations } from '@dfx.swiss/react';
import { Form, StyledButton, StyledButtonWidth, StyledInput, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';

interface FormData {
  userDataIds: string;
}

export default function DownloadScreen(): JSX.Element {
  useAdminGuard();

  const { translate, translateError } = useSettingsContext();
  const { authenticationToken } = useAuthContext();

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
      fetch(`${process.env.REACT_APP_API_URL}/v1/userData/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authenticationToken ? `Bearer ${authenticationToken}` : '',
        },
        body: JSON.stringify({ userDataIds: data.userDataIds.split(',').map((id) => Number(id)) }),
      })
        .then((response) => response.text())
        .then((response) => {
          const link = document.createElement('a');
          link.href = `data:application/zip;base64,${response}`;
          link.download = 'userData.zip';
          link.click();
        })
        .catch((e) => {
          setError(e.message);
        });
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
