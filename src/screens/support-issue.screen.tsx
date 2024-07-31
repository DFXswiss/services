import { ApiError, KycLevel, Utils, Validations, useSupport } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { CreateSupportIssue, SupportIssueReason, SupportIssueType } from '@dfx.swiss/react/dist/definitions/support';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { IssueReasonLabels, IssueTypeLabels } from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycLevelGuard, useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { toBase64 } from '../util/utils';
import { TransactionList } from './transaction.screen';

const IssueReasons: { [t in SupportIssueType]: SupportIssueReason[] } = {
  [SupportIssueType.GENERIC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.TRANSACTION_ISSUE]: [SupportIssueReason.OTHER, SupportIssueReason.FUNDS_NOT_RECEIVED],
  [SupportIssueType.KYC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.LIMIT_REQUEST]: [SupportIssueReason.OTHER],
  [SupportIssueType.PARTNERSHIP_REQUEST]: [SupportIssueReason.OTHER],
};

interface FormData {
  type: SupportIssueType;
  name: string;
  transaction: number;
  reason: SupportIssueReason;
  message: string;
  file?: File;
}

export default function SupportIssueScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { createIssue } = useSupport();
  const { translate, translateError } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);
  const [selectTransaction, setSelectTransaction] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({ mode: 'onTouched' });
  const selectedType = useWatch({ control, name: 'type' });

  const types = Object.values(SupportIssueType).filter((t) => t !== SupportIssueType.LIMIT_REQUEST);
  const reasons = IssueReasons[selectedType] ?? [];

  useEffect(() => {
    reasons.length === 1 && setValue('reason', reasons[0]);
  }, [reasons]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreateSupportIssue = {
        type: data.type,
        name: data.name,
        reason: data.reason,
        message: data.message,
        file: data.file && (await toBase64(data.file)),
        fileName: data.file?.name,
      };

      if (data.type === SupportIssueType.TRANSACTION_ISSUE && data.transaction) {
        request.transaction = { id: +data.transaction };
      }

      await createIssue(request);

      setIssueCreated(true);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onSelectTransaction(id: number) {
    setValue('transaction', id);
    setSelectTransaction(false);
  }

  function onDone() {
    navigate('/account');
  }

  const rules = Utils.createRules({
    type: Validations.Required,
    name: Validations.Required,
    transaction: Validations.Required,
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
      ) : selectTransaction ? (
        <>
          <p className="text-dfxGray-700">
            {translate(
              'screens/support',
              'For which transaction would you like to create an issue? Select the relevant transaction or click on "{{text}}".',
              { text: translate('screens/payment', 'My transaction is missing') },
            )}
          </p>
          <TransactionList isSupport={true} onSelectTransaction={onSelectTransaction} setError={setError} />
        </>
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <StyledDropdown<SupportIssueType>
              rootRef={rootRef}
              label={translate('screens/support', 'Issue type')}
              items={types}
              labelFunc={(item) => item && translate('screens/support', IssueTypeLabels[item])}
              name="type"
              placeholder={translate('general/actions', 'Select...')}
              full
            />

            {selectedType === SupportIssueType.TRANSACTION_ISSUE && (
              <StyledVerticalStack gap={3.5} full center>
                <StyledDropdown<string>
                  rootRef={rootRef}
                  label={translate('screens/payment', 'Transaction')}
                  items={[]}
                  labelFunc={(item) => `${translate('screens/payment', 'Transaction')} ${item}`}
                  name="transaction"
                  placeholder={translate('general/actions', 'Select...')}
                  full
                />
                <StyledButton
                  label={translate('general/actions', 'Select transaction')}
                  onClick={() => setSelectTransaction(true)}
                  width={StyledButtonWidth.FULL}
                  color={StyledButtonColor.STURDY_WHITE}
                />
              </StyledVerticalStack>
            )}

            {reasons.length > 1 && (
              <StyledDropdown<SupportIssueReason>
                rootRef={rootRef}
                label={translate('screens/support', 'Reason')}
                items={reasons}
                labelFunc={(item) => translate('screens/support', IssueReasonLabels[item])}
                name="reason"
                placeholder={translate('general/actions', 'Select...')}
                full
              />
            )}

            <StyledInput
              name="name"
              autocomplete="name"
              label={translate('screens/support', 'Name')}
              placeholder={`${translate('screens/kyc', 'John')} ${translate('screens/kyc', 'Doe')}`}
              full
            />

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
