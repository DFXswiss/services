import {
  ApiError,
  Bank,
  CreateSupportIssue,
  Iban,
  KycLevel,
  Utils,
  Validations,
  useBank,
  useBankAccount,
  useSessionContext,
  useSupport,
} from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { SupportIssueReason, SupportIssueType } from '@dfx.swiss/react/dist/definitions/support';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress, toBase64 } from 'src/util/utils';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycLevelGuard, useUserGuard } from '../hooks/guard.hook';

interface FormData {
  senderIban: string;
  receiverIban: string;
  date: string;
  name: string;
  message: string;
  file?: File;
}

const AddAccount = 'Add bank account';

export function TransactionMissingScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { translate, translateError } = useSettingsContext();
  const { navigate } = useNavigation();
  const { createIssue } = useSupport();
  const { getIbans } = useBankAccount();
  const { getBanks } = useBank();
  const { isLoggedIn } = useSessionContext();
  const { width } = useAppHandlingContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);
  const [accounts, setAccounts] = useState<Iban[]>();
  const [banks, setBanks] = useState<Bank[]>();

  const rootRef = useRef<HTMLDivElement>(null);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onTouched' });
  const selectedSender = useWatch({ control, name: 'senderIban' });

  const rules = Utils.createRules({
    senderIban: Validations.Required,
    receiverIban: Validations.Required,
    date: [Validations.Required, Validations.Custom((date) => (/\d{4}-\d{2}-\d{2}/g.test(date) ? true : 'pattern'))],
    name: Validations.Required,
    message: Validations.Required,
  });

  useEffect(() => {
    if (selectedSender === AddAccount) navigate('/bank-accounts');
  }, [selectedSender]);

  useEffect(() => {
    if (isLoggedIn)
      Promise.all([getIbans().then(setAccounts), getBanks().then(setBanks)]).catch((error: ApiError) =>
        setError(error.message ?? 'Unknown error'),
      );
  }, [isLoggedIn]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreateSupportIssue = {
        type: SupportIssueType.TRANSACTION_ISSUE,
        name: data.name,
        reason: SupportIssueReason.TRANSACTION_MISSING,
        message: data.message,
        file: data.file && (await toBase64(data.file)),
        fileName: data.file?.name,
        transaction: {
          senderIban: data.senderIban,
          receiverIban: data.receiverIban,
          date: new Date(data.date),
        },
      };

      await createIssue(request);

      setIssueCreated(true);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onDone() {
    navigate('/account');
  }

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
            <p className="text-dfxGray-700">
              {translate(
                'screens/support',
                'Please provide us with all relevant information about the transaction you are missing.',
              )}
            </p>

            {accounts && banks ? (
              <>
                <StyledDropdown<string>
                  rootRef={rootRef}
                  label={translate('screens/support', 'Sender IBAN')}
                  items={[
                    ...accounts.map((a) => Utils.formatIban(a.iban) ?? ''),
                    'No IBAN, only account number',
                    AddAccount,
                  ]}
                  labelFunc={(item) => translate('screens/iban', item)}
                  name="senderIban"
                  placeholder={translate('general/actions', 'Select...')}
                  full
                />

                <StyledDropdown<string>
                  rootRef={rootRef}
                  label={translate('screens/support', 'Receiver IBAN')}
                  items={banks.map((b) => blankedAddress(Utils.formatIban(b.iban) ?? '', { displayLength: 18 }))}
                  labelFunc={(item) => item}
                  name="receiverIban"
                  placeholder={translate('general/actions', 'Select...')}
                  full
                />

                <StyledInput
                  name="date"
                  label={translate('screens/support', 'Date of the transaction')}
                  placeholder={new Date().toISOString().split('T')[0]}
                  full
                />

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
              </>
            ) : error ? (
              <div>
                <ErrorHint message={error} />
              </div>
            ) : (
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            )}
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
