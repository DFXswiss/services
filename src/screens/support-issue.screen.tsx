import { ApiError, KycLevel, Utils, Validations, useSupport } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { CreateSupportIssue, SupportIssueReason } from '@dfx.swiss/react/dist/definitions/support';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useParams } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { ReasonLabels } from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycLevelGuard, useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { toBase64 } from '../util/utils';

enum IssueType {
  GENERAL = 'General',
  TRANSACTION = 'Transaction',
}

const IssueReasons: { [t in IssueType]: SupportIssueReason[] } = {
  [IssueType.GENERAL]: [SupportIssueReason.OTHER],
  [IssueType.TRANSACTION]: [SupportIssueReason.OTHER, SupportIssueReason.FUNDS_NOT_RECEIVED],
};

interface FormData {
  name: string;
  transaction: string;
  reason: SupportIssueReason;
  message: string;
  file?: File;
}

export function SupportIssueScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { id } = useParams();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { createGeneralIssue, createTransactionIssue } = useSupport();
  const { translate, translateError } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);

  const type = pathname.includes('tx') ? IssueType.TRANSACTION : IssueType.GENERAL;
  const reasons = IssueReasons[type];

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({ mode: 'onTouched' });

  useEffect(() => {
    id && setValue('transaction', id);
  }, [id]);

  useEffect(() => {
    reasons.length === 1 && setValue('reason', reasons[0]);
  }, [reasons]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreateSupportIssue = {
        name: data.name,
        reason: data.reason,
        message: data.message,
        file: data.file && (await toBase64(data.file)),
        fileName: data.file?.name,
      };

      switch (type) {
        case IssueType.GENERAL:
          await createGeneralIssue(request);
          break;

        case IssueType.TRANSACTION:
          if (!id) throw new Error('Missing transaction ID');
          await createTransactionIssue(+id, request);
          break;
      }

      setIssueCreated(true);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onDone() {
    switch (type) {
      case IssueType.GENERAL:
        navigate('/');
        break;

      case IssueType.TRANSACTION:
        navigate('/tx');
        break;
    }
  }

  const rules = Utils.createRules({
    name: Validations.Required,
    reason: Validations.Required,
    message: Validations.Required,
  });

  return (
    <Layout title={translate('screens/support', 'Support issue')} rootRef={rootRef}>
      {issueCreated ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate('screens/support', 'The issue has been successfully submitted. You will be contacted by email.')}
          </p>

          <StyledButton
            label={translate('general/actions', 'Ok')}
            onClick={onDone}
            width={StyledButtonWidth.FULL}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <StyledInput
              name="name"
              autocomplete="name"
              label={translate('screens/support', 'Name')}
              placeholder={`${translate('screens/kyc', 'John')} ${translate('screens/kyc', 'Doe')}`}
              full
            />

            {type === IssueType.TRANSACTION && (
              <StyledDropdown<string>
                rootRef={rootRef}
                label={translate('screens/payment', 'Transaction')}
                items={[]}
                labelFunc={(item) => `${translate('screens/payment', 'Transaction')} ${item}`}
                name="transaction"
                placeholder={translate('general/actions', 'Select...')}
                full
              />
            )}

            {reasons.length > 1 && (
              <StyledDropdown<SupportIssueReason>
                rootRef={rootRef}
                label={translate('screens/support', 'Reason')}
                items={reasons}
                labelFunc={(item) => translate('screens/support', ReasonLabels[item])}
                name="reason"
                placeholder={translate('general/actions', 'Select...')}
                full
              />
            )}

            <StyledInput name="message" label={translate('screens/support', 'Description')} multiLine full />

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

            <StyledButton
              type="submit"
              label={translate('general/actions', 'Next')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              isLoading={isLoading}
            />
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
