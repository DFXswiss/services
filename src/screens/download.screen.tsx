import { Utils, Validations } from '@dfx.swiss/react';
import { Form, StyledButton, StyledButtonWidth, StyledInput, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';

interface FormData {
  userIds: string;
}

export default function DownloadScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    // const file = data.file[0];
  }

  const rules = Utils.createRules({
    userIds: [
      Validations.Required,
      Validations.Custom((ids) => ids.split(',').every((id: string) => !isNaN(Number(id)))),
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
              name="userIds"
              type="text"
              label={translate('screens/kyc', 'User IDs')}
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
