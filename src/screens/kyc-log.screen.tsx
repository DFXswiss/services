import { useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { DefaultFileTypes } from 'src/config/file-types';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { toBase64 } from 'src/util/utils';

interface FormData {
  userDataId: string;
  eventDate?: string;
  comment: string;
  file?: File;
}

export default function KycLogScreen(): JSX.Element {
  useAdminGuard();

  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(undefined);

    const payload = {
      userData: { id: +data.userDataId },
      eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      comment: data.comment,
      file: data.file && (await toBase64(data.file)),
      fileName: data.file?.name,
    };

    call({
      url: 'kyc/admin/log',
      method: 'POST',
      data: payload,
    })
      .then(() => toggleNotification())
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  const toggleNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const rules = Utils.createRules({
    userDataId: [Validations.Required, Validations.Custom((id) => (!isNaN(Number(id)) ? true : 'pattern'))],
    eventDate: Validations.Custom((date) => !date || (/\d{4}-\d{2}-\d{2}/g.test(date) ? true : 'pattern')),
    comment: Validations.Required,
    file: Validations.Custom((file) => (!file || DefaultFileTypes.includes(file.type) ? true : 'file_type')),
  });

  return (
    <Layout title={translate('screens/kyc', 'Data upload')}>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          <StyledInput
            name="userDataId"
            type="text"
            label={translate('screens/kyc', 'UserData ID')}
            placeholder={translate('screens/kyc', '1234')}
            full
          />

          <StyledInput
            name="eventDate"
            label={translate('screens/kyc', 'Event date')}
            placeholder={new Date().toISOString().split('T')[0]}
            full
          />

          <StyledInput name="comment" label={translate('screens/kyc', 'Comment')} full />

          <StyledFileUpload
            name="file"
            label={translate('screens/support', 'File')}
            placeholder={translate('general/actions', 'Drop files here')}
            buttonLabel={translate('general/actions', 'Browse')}
            full
          />

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          {showNotification ? (
            <p
              className={` flex flex-row gap-1 items-center text-dfxRed-100 font-normal transition-opacity duration-200`}
            >
              <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
              {translate('screens/payment', 'Saved')}
            </p>
          ) : (
            <StyledButton
              type="submit"
              label={translate('general/actions', 'Save')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              isLoading={isLoading}
            />
          )}
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
