import {
  ApiError,
  Bank,
  CreateSupportIssue,
  FundOrigin,
  InvestmentDate,
  KycLevel,
  Limit,
  SupportIssueReason,
  SupportIssueType,
  Utils,
  Validations,
  useBank,
  useBankAccountContext,
  useSessionContext,
  useSupportChatContext,
  useUserContext,
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
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import {
  DateLabels,
  IssueReasonLabels,
  IssueTypeLabels,
  LimitLabels,
  OriginFutureLabels,
  OriginNowLabels,
} from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycLevelGuard, useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress, toBase64 } from '../util/utils';
import { TransactionList } from './transaction.screen';

const IssueReasons: { [t in SupportIssueType]: SupportIssueReason[] } = {
  [SupportIssueType.GENERIC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.TRANSACTION_ISSUE]: [
    SupportIssueReason.OTHER,
    SupportIssueReason.FUNDS_NOT_RECEIVED,
    SupportIssueReason.TRANSACTION_MISSING,
  ],
  [SupportIssueType.KYC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.LIMIT_REQUEST]: [SupportIssueReason.OTHER],
  [SupportIssueType.PARTNERSHIP_REQUEST]: [SupportIssueReason.OTHER],
  [SupportIssueType.NOTIFICATION_OF_CHANGES]: [SupportIssueReason.OTHER],
  [SupportIssueType.BUG_REPORT]: [SupportIssueReason.OTHER],
};

interface FormData {
  type: SupportIssueType;
  senderIban: string;
  receiverIban: string;
  date: string;
  name: string;
  transaction: SelectTransactionFormData;
  reason: SupportIssueReason;
  message: string;
  limit: Limit;
  investmentDate: InvestmentDate;
  fundOrigin: FundOrigin;
  file?: File;
}

interface SelectTransactionFormData {
  id: string;
  description: string;
}

const NoIban = 'No IBAN, only account number';
const AddAccount = 'Add bank account';
const selectTxButtonLabel = 'Select transaction';

const formDefaultValues = {
  type: undefined,
  senderIban: undefined,
  receiverIban: undefined,
  date: undefined,
  name: undefined,
  transaction: undefined,
  reason: undefined,
  message: undefined,
  limit: undefined,
  investmentDate: undefined,
  fundOrigin: undefined,
  file: undefined,
};

export default function SupportIssueScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { navigate } = useNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { getBanks } = useBank();
  const { bankAccounts } = useBankAccountContext();
  const [urlParams, setUrlParams] = useSearchParams();
  const { createSupportIssue } = useSupportChatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectTransaction, setSelectTransaction] = useState(false);
  const [isKycComplete, setIsKycComplete] = useState<boolean>();
  const [banks, setBanks] = useState<Bank[]>();
  const [supportIssue, setSupportIssue] = useState<Partial<CreateSupportIssue>>();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<FormData>({ mode: 'all', defaultValues: formDefaultValues });
  const selectedType = useWatch({ control, name: 'type' });
  const investmentDate = useWatch({ control, name: 'investmentDate' });
  const selectedReason = useWatch({ control, name: 'reason' });
  const selectedTransaction = useWatch({ control, name: 'transaction' });
  const selectedSender = useWatch({ control, name: 'senderIban' });

  const issues = Object.values(SupportIssueType);
  const reasons = IssueReasons[selectedType] ?? [];

  useEffect(() => {
    const kycCompleted = user && user.kyc.level >= KycLevel.Completed;

    if (kycCompleted === false && selectedType === SupportIssueType.LIMIT_REQUEST) {
      navigate('/kyc');
      return;
    }

    setIsKycComplete(kycCompleted);
  }, [user, selectedType]);

  useEffect(() => {
    setSelectTransaction(false);

    const issueTypeParam = urlParams.get('issue-type');
    const issueType = issueTypeParam && issues.find((t) => t === issueTypeParam);
    if (issueType) {
      setSupportIssue((prev) => ({ ...prev, type: issueType }));
      setValue('type', issueType);
    }

    const reasonParam = urlParams.get('reason');
    const reasonEnum = issueType && reasonParam && IssueReasons[issueType].find((r) => r === reasonParam);
    if (reasonEnum) {
      setSupportIssue((prev) => ({ ...prev, reason: reasonEnum }));
      setValue('reason', reasonEnum);
    }

    if (issueTypeParam || reasonParam) {
      issueTypeParam && urlParams.delete('issue-type');
      reasonParam && urlParams.delete('reason');
      setUrlParams(urlParams);
    }
  }, [urlParams]);

  useEffect(() => {
    if (selectedSender === AddAccount)
      navigate('/bank-accounts', { setRedirect: true, redirectPath: '/tx', state: { isMissingTxIssue: true } });
  }, [selectedSender]);

  useEffect(() => {
    if (selectedTransaction?.id === selectTxButtonLabel) setSelectTransaction(true);
  }, [selectedTransaction]);

  useEffect(() => {
    if (selectedReason && selectedReason !== supportIssue?.reason) {
      setSupportIssue((prev) => ({ ...prev, reason: selectedReason }));
      reset({ ...formDefaultValues, type: selectedType, reason: selectedReason });
    }
  }, [selectedReason, supportIssue]);

  useEffect(() => {
    if (selectedType && selectedType !== supportIssue?.type) {
      setSupportIssue((prev) => ({ ...prev, type: selectedType }));
      reset({ ...formDefaultValues, type: selectedType });
    }
  }, [selectedType, supportIssue]);

  useEffect(() => {
    if (isLoggedIn)
      getBanks()
        .then(setBanks)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [isLoggedIn]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreateSupportIssue = {
        type: data.type,
        name: data.name,
        reason: data.reason ?? SupportIssueReason.OTHER,
        message: data.message,
        file: data.file && (await toBase64(data.file)),
        fileName: data.file?.name,
      };

      if (data.type === SupportIssueType.TRANSACTION_ISSUE) {
        if (data.reason !== SupportIssueReason.TRANSACTION_MISSING) {
          request.transaction = { id: +data.transaction.id };
        } else {
          request.transaction = {
            senderIban: data.senderIban,
            receiverIban: data.receiverIban,
            date: new Date(data.date),
          };
        }
      }

      if (data.type === SupportIssueType.LIMIT_REQUEST && data.limit) {
        request.limitRequest = {
          limit: data.limit,
          investmentDate: data.investmentDate,
          fundOrigin: data.fundOrigin,
          fundOriginText: data.message,
        };
      }

      await createSupportIssue(request, data.file)
        .then((response) => navigate(`/support/chat/${response}`))
        .catch((e: ApiError) => setError(e.message ?? 'Unknown error'));
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onSelectTransaction(id: number) {
    setValue('transaction', { id: id.toString(), description: 'Transaction ID' });
    setSelectTransaction(false);
  }

  const rules = Utils.createRules({
    type: Validations.Required,
    senderIban: Validations.Required,
    receiverIban: Validations.Required,
    date: [Validations.Required, Validations.Custom((date) => (/\d{4}-\d{2}-\d{2}/g.test(date) ? true : 'pattern'))],
    name: Validations.Required,
    transaction: Validations.Required,
    reason: Validations.Required,
    message: [Validations.Required, Validations.Custom((message) => message.length <= 4000 || 'message_length')],
    limit: Validations.Required,
    investmentDate: Validations.Required,
    fundOrigin: Validations.Required,
    file: Validations.Custom((file) =>
      !file ||
      file.type === 'application/pdf' ||
      file.type === 'image/png' ||
      file.type === 'image/jpg' ||
      file.type === 'image/jpeg'
        ? true
        : 'file_type',
    ),
  });

  return (
    <Layout
      title={translate('screens/support', 'Support issue')}
      rootRef={rootRef}
      onBack={
        selectTransaction
          ? () => {
              setSelectTransaction(false);
              reset({ ...formDefaultValues, type: selectedType, reason: selectedReason });
            }
          : undefined
      }
    >
      {selectedType === SupportIssueType.LIMIT_REQUEST && isKycComplete === undefined ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : selectTransaction ? (
        <>
          <p className="text-dfxGray-700">
            {translate('screens/support', 'Select the transaction for which you would like to create an issue.')}
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
              items={issues.filter((t) => t !== SupportIssueType.LIMIT_REQUEST || isKycComplete)}
              labelFunc={(item) => item && translate('screens/support', IssueTypeLabels[item])}
              name="type"
              placeholder={translate('general/actions', 'Select') + '...'}
              full
            />

            {reasons.length > 1 && (
              <StyledDropdown<SupportIssueReason>
                rootRef={rootRef}
                label={translate('screens/support', 'Reason')}
                items={reasons}
                labelFunc={(item) => translate('screens/support', IssueReasonLabels[item])}
                name="reason"
                placeholder={translate('general/actions', 'Select') + '...'}
                full
              />
            )}

            {selectedType === SupportIssueType.TRANSACTION_ISSUE &&
              selectedReason &&
              (selectedReason !== SupportIssueReason.TRANSACTION_MISSING ? (
                <StyledVerticalStack gap={3.5} full center>
                  <p className="w-full text-left text-dfxBlue-800 text-base font-semibold pl-3.5 -mb-1">
                    {translate('screens/payment', 'Transaction')}
                  </p>
                  <StyledDropdown<SelectTransactionFormData>
                    rootRef={rootRef}
                    name="transaction"
                    items={[{ id: selectTxButtonLabel, description: 'Select a transaction to proceed with' }]}
                    labelFunc={(item) => translate('general/actions', item.id)}
                    descriptionFunc={(item) => translate('screens/support', item.description)}
                    full
                    forceEnable
                  />
                </StyledVerticalStack>
              ) : bankAccounts && banks ? (
                <>
                  <StyledDropdown<string>
                    rootRef={rootRef}
                    label={translate('screens/support', 'Sender IBAN')}
                    items={[...bankAccounts.map((a) => a.iban), NoIban, AddAccount]}
                    labelFunc={(item) =>
                      blankedAddress(
                        [NoIban, AddAccount].includes(item)
                          ? translate('screens/iban', item)
                          : Utils.formatIban(item) ?? '',
                        { displayLength: 30 },
                      )
                    }
                    descriptionFunc={(item) => bankAccounts.find((a) => a.iban === item)?.label ?? ''}
                    name="senderIban"
                    placeholder={translate('general/actions', 'Select') + '...'}
                    full
                  />

                  <StyledDropdown<string>
                    rootRef={rootRef}
                    label={translate('screens/support', 'Receiver IBAN')}
                    items={banks.map((b) => b.iban)}
                    labelFunc={(item) => blankedAddress(Utils.formatIban(item) ?? '', { displayLength: 30 })}
                    name="receiverIban"
                    placeholder={translate('general/actions', 'Select') + '...'}
                    full
                  />

                  <StyledInput
                    name="date"
                    label={translate('screens/support', 'Date of the transaction')}
                    placeholder={new Date().toISOString().split('T')[0]}
                    full
                  />
                </>
              ) : (
                <></>
              ))}

            <StyledInput
              name="name"
              autocomplete="name"
              label={translate('screens/support', 'Name')}
              placeholder={`${translate('screens/kyc', 'John')} ${translate('screens/kyc', 'Doe')}`}
              full
            />

            {selectedType === SupportIssueType.LIMIT_REQUEST && (
              <>
                <StyledDropdown<Limit>
                  rootRef={rootRef}
                  label={translate('screens/limit', 'Investment volume')}
                  items={Object.values(Limit).filter((i) => typeof i !== 'string') as number[]}
                  labelFunc={(item) => LimitLabels[item]}
                  name="limit"
                  placeholder={translate('general/actions', 'Select') + '...'}
                  full
                />

                <StyledDropdown<InvestmentDate>
                  rootRef={rootRef}
                  label={translate('screens/limit', 'Investment date')}
                  items={Object.values(InvestmentDate)}
                  labelFunc={(item) => translate('screens/limit', DateLabels[item])}
                  name="investmentDate"
                  placeholder={translate('general/actions', 'Select') + '...'}
                  full
                />

                <StyledDropdown<FundOrigin>
                  rootRef={rootRef}
                  label={translate('screens/limit', 'Origin of funds')}
                  items={Object.values(FundOrigin)}
                  labelFunc={(item) =>
                    translate(
                      'screens/limit',
                      investmentDate === InvestmentDate.FUTURE ? OriginFutureLabels[item] : OriginNowLabels[item],
                    )
                  }
                  name="fundOrigin"
                  placeholder={translate('general/actions', 'Select') + '...'}
                  full
                />
              </>
            )}

            <StyledInput
              name="message"
              label={
                selectedType === SupportIssueType.LIMIT_REQUEST
                  ? `${translate('screens/limit', 'Origin of funds')} (${translate('screens/limit', 'free text')})`
                  : translate('screens/support', 'Description')
              }
              multiLine
              full
            />

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
