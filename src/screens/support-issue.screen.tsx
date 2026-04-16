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
  TransactionState,
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
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { LimitRequestFields } from 'src/components/support-issue/limit-request-fields';
import { DefaultFileTypes } from 'src/config/file-types';
import { useLayoutContext } from 'src/contexts/layout.context';
import { ErrorHint } from '../components/error-hint';
import { IssueReasonLabels, IssueTypeLabels } from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycLevelGuard, useUserGuard } from '../hooks/guard.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress, toBase64 } from '../util/utils';
import { TransactionList } from './transaction.screen';

const IssueReasons: { [t in SupportIssueType]: SupportIssueReason[] } = {
  [SupportIssueType.GENERIC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.TRANSACTION_ISSUE]: [
    SupportIssueReason.FUNDS_NOT_RECEIVED,
    SupportIssueReason.TRANSACTION_MISSING,
    SupportIssueReason.OTHER,
  ],
  [SupportIssueType.KYC_ISSUE]: [SupportIssueReason.OTHER],
  [SupportIssueType.LIMIT_REQUEST]: [SupportIssueReason.OTHER],
  [SupportIssueType.PARTNERSHIP_REQUEST]: [SupportIssueReason.OTHER],
  [SupportIssueType.NOTIFICATION_OF_CHANGES]: [SupportIssueReason.CIVIL_STATUS_CHANGED, SupportIssueReason.OTHER],
  [SupportIssueType.BUG_REPORT]: [SupportIssueReason.OTHER],
  [SupportIssueType.VERIFICATION_CALL]: [
    SupportIssueReason.REJECT_CALL,
    SupportIssueReason.REPEAT_CALL,
    SupportIssueReason.OTHER,
  ],
};

interface FormData {
  type: SupportIssueType;
  senderIban: string;
  receiverIban: string;
  date: string;
  name: string;
  transaction?: SelectTransactionFormData;
  reason: SupportIssueReason;
  message: string;
  limit: Limit;
  investmentDate: InvestmentDate;
  fundOrigin: FundOrigin;
  file?: File;
}

interface SelectTransactionFormData {
  uid: string;
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
  const { navigate, clearParams } = useNavigation();
  const { rootRef } = useLayoutContext();
  const { translate, translateError, allowedCountries } = useSettingsContext();
  const { user } = useUserContext();
  const { isLoggedIn, logout } = useSessionContext();
  const { getBanks } = useBank();
  const { bankAccounts } = useBankAccountContext();
  const [urlParams] = useSearchParams();
  const {
    createSupportIssue,
    loadSupportIssue,
    isLoading: isIssueLoading,
    supportIssue: existingIssue,
  } = useSupportChatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectTransaction, setSelectTransaction] = useState(false);
  const [isKycComplete, setIsKycComplete] = useState<boolean>();
  const [banks, setBanks] = useState<Bank[]>();
  const [selectedTxState, setSelectedTxState] = useState<TransactionState>();

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
  const isRequestOnly = selectedTxState === TransactionState.WAITING_FOR_PAYMENT;

  const orderParam = urlParams.get('quote') ?? urlParams.get('order');
  const issueTypeParam = urlParams.get('issue-type');
  const reasonParam = urlParams.get('reason');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (orderParam || issueTypeParam || reasonParam) {
        clearParams([...Array.from(urlParams.keys())]);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const issueType = issueTypeParam && issues.find((t) => t === issueTypeParam);
    if (issueType) {
      setValue('type', issueType);
    }

    const reasonEnum = issueType && reasonParam && IssueReasons[issueType].find((r) => r === reasonParam);
    if (reasonEnum) {
      setValue('reason', reasonEnum);
    }
  }, [issueTypeParam, reasonParam]);

  useUserGuard('/login', !orderParam);
  useKycLevelGuard(KycLevel.Link, '/contact');

  function startChat(issueUid: string) {
    navigate({ pathname: `/support/chat/${issueUid}` });
  }

  useEffect(() => {
    const kycCompleted = user && user.kyc.level >= KycLevel.Completed;

    if (kycCompleted === false && selectedType === SupportIssueType.LIMIT_REQUEST) {
      navigate('/kyc');
      return;
    }

    setIsKycComplete(kycCompleted);
  }, [user, selectedType]);

  useEffect(() => {
    if (orderParam) {
      const issueType = SupportIssueType.TRANSACTION_ISSUE;
      setValue('type', issueType);

      loadSupportIssue(orderParam).catch(() => undefined); // ignore error
    }
  }, [orderParam]);

  useEffect(() => {
    if (orderParam && isLoggedIn) logout();
  }, [orderParam, isLoggedIn]);

  useEffect(() => {
    if (orderParam && !isLoading && existingIssue) {
      startChat(existingIssue.uid);
    }
  }, [isIssueLoading, existingIssue]);

  useEffect(() => {
    if (selectedTransaction?.uid === selectTxButtonLabel) {
      setSelectTransaction(true);
    }
  }, [selectedTransaction?.uid]);

  useEffect(() => {
    if (selectTransaction && selectedReason === SupportIssueReason.TRANSACTION_MISSING) {
      setSelectTransaction(false);
    }
  }, [selectedReason, selectTransaction]);

  useEffect(() => {
    setSelectedTxState(undefined);
    setValue('transaction', undefined);
  }, [selectedReason]);

  useEffect(() => {
    getBanks()
      .then(setBanks)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, []);

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
        if (data.reason === SupportIssueReason.TRANSACTION_MISSING) {
          request.transaction = {
            senderIban: data.senderIban,
            receiverIban: data.receiverIban,
            date: new Date(data.date),
          };
        } else if (data.reason === SupportIssueReason.FUNDS_NOT_RECEIVED && isRequestOnly) {
          request.transaction = {
            uid: data.transaction?.uid,
            senderIban: data.senderIban,
            date: new Date(data.date),
          };
        } else {
          request.transaction = { uid: data.transaction?.uid };
        }
        orderParam && (request.transaction.orderUid = orderParam);
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
        .then((response) => startChat(response))
        .catch((e: ApiError) => setError(e.message ?? 'Unknown error'));
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onSelectTransaction(uid: string, state: TransactionState) {
    setValue('transaction', { uid, description: 'Transaction ID' });
    setSelectedTxState(state);
    setSelectTransaction(false);
  }

  const isFundsNotReceivedRequest = selectedReason === SupportIssueReason.FUNDS_NOT_RECEIVED && isRequestOnly === true;

  const rules = Utils.createRules({
    type: Validations.Required,
    senderIban: [
      (selectedReason === SupportIssueReason.TRANSACTION_MISSING || isFundsNotReceivedRequest) && Validations.Required,
      !!orderParam && Validations.Iban(allowedCountries),
    ],
    receiverIban: selectedReason === SupportIssueReason.TRANSACTION_MISSING && Validations.Required,
    date: [
      (selectedReason === SupportIssueReason.TRANSACTION_MISSING || isFundsNotReceivedRequest) && Validations.Required,
      Validations.Custom((date) => (!date || /\d{4}-\d{2}-\d{2}/g.test(date) ? true : 'pattern')),
    ],
    name: Validations.Required,
    transaction: Validations.Required,
    reason: Validations.Required,
    message: [Validations.Required, Validations.Custom((message) => message.length <= 4000 || 'message_length')],
    limit: Validations.Required,
    investmentDate: Validations.Required,
    fundOrigin: Validations.Required,
    file: [
      selectedType === SupportIssueType.NOTIFICATION_OF_CHANGES && Validations.Required,
      Validations.Custom((file) => (!file || DefaultFileTypes.includes(file.type) ? true : 'file_type')),
    ],
  });

  useLayoutOptions({
    title: translate('screens/support', 'Support issue'),
    onBack: selectTransaction
      ? () => {
          setSelectTransaction(false);
          reset({ ...formDefaultValues, type: selectedType, reason: selectedReason });
        }
      : undefined,
  });

  return (
    <>
      {(selectedType === SupportIssueType.LIMIT_REQUEST && isKycComplete === undefined) || isIssueLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : selectTransaction ? (
        <>
          <p className="text-dfxGray-700">
            {translate('screens/support', 'Select the transaction for which you would like to create an issue.')}
          </p>
          <TransactionList isSupport={true} onSelectTransaction={onSelectTransaction} setError={setError} />
        </>
      ) : selectedSender === AddAccount ? (
        <AddBankAccount
          onSubmit={(account) => {
            setValue('senderIban', account.iban);
          }}
          confirmationText={translate(
            'screens/iban',
            'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
          )}
        />
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
              disabled={!!orderParam}
              full
            />

            {reasons.length > 1 && (
              <StyledVerticalStack gap={2} full center>
                <StyledDropdown<SupportIssueReason>
                  rootRef={rootRef}
                  label={translate('screens/support', 'Reason')}
                  items={reasons.filter((r) => r !== SupportIssueReason.FUNDS_NOT_RECEIVED || !orderParam)}
                  labelFunc={(item) => translate('screens/support', IssueReasonLabels[item])}
                  name="reason"
                  placeholder={translate('general/actions', 'Select') + '...'}
                  full
                />
                {selectedType === SupportIssueType.NOTIFICATION_OF_CHANGES && (
                  <p className="text-dfxGray-700 text-sm">
                    <Trans i18nKey="screens/support.contactDataChangeHint">
                      Name, address, phone number and email address can be changed directly in your{' '}
                      <StyledLink label={translate('screens/home', 'Account')} url="/account" target="_self" dark />.
                    </Trans>
                  </p>
                )}
              </StyledVerticalStack>
            )}

            {selectedType === SupportIssueType.TRANSACTION_ISSUE && selectedReason && (
              <>
                {selectedReason !== SupportIssueReason.TRANSACTION_MISSING && !orderParam && (
                  <StyledVerticalStack gap={3.5} full center>
                    <p className="w-full text-left text-dfxBlue-800 text-base font-semibold pl-3.5 -mb-1">
                      {translate('screens/payment', 'Transaction')}
                    </p>
                    <StyledDropdown<SelectTransactionFormData>
                      rootRef={rootRef}
                      name="transaction"
                      items={[{ uid: selectTxButtonLabel, description: 'Select a transaction to proceed with' }]}
                      labelFunc={(item) => translate('general/actions', item.uid)}
                      descriptionFunc={(item) => translate('screens/support', item.description)}
                      full
                      forceEnable
                    />
                  </StyledVerticalStack>
                )}

                {(selectedReason === SupportIssueReason.TRANSACTION_MISSING || isFundsNotReceivedRequest) && (
                  <>
                    {bankAccounts && isLoggedIn ? (
                      <StyledDropdown<string>
                        rootRef={rootRef}
                        label={translate('screens/support', 'Sender IBAN')}
                        items={[...bankAccounts.map((a) => a.iban), AddAccount, NoIban]}
                        labelFunc={(item) =>
                          blankedAddress(
                            item === AddAccount
                              ? translate('general/actions', item)
                              : item === NoIban
                                ? translate('screens/iban', item)
                                : (Utils.formatIban(item) ?? ''),
                            { displayLength: 30 },
                          )
                        }
                        descriptionFunc={(item) => bankAccounts.find((a) => a.iban === item)?.label ?? ''}
                        name="senderIban"
                        placeholder={translate('general/actions', 'Select') + '...'}
                        full
                      />
                    ) : (
                      <StyledInput
                        name="senderIban"
                        autocomplete="iban"
                        label={translate('screens/support', 'Sender IBAN')}
                        placeholder="XX XXXX XXXX XXXX XXXX X"
                        full
                      />
                    )}

                    {selectedReason === SupportIssueReason.TRANSACTION_MISSING && banks && (
                      <StyledDropdown<string>
                        rootRef={rootRef}
                        label={translate('screens/support', 'Receiver IBAN')}
                        items={banks.map((b) => b.iban)}
                        labelFunc={(item) => blankedAddress(Utils.formatIban(item) ?? '', { displayLength: 30 })}
                        name="receiverIban"
                        placeholder={translate('general/actions', 'Select') + '...'}
                        full
                      />
                    )}

                    <StyledInput
                      name="date"
                      label={translate('screens/support', 'Date of the transaction')}
                      placeholder={new Date().toISOString().split('T')[0]}
                      full
                    />
                  </>
                )}
              </>
            )}

            {selectedType === SupportIssueType.LIMIT_REQUEST ? (
              <LimitRequestFields
                rootRef={rootRef}
                control={control}
                rules={rules}
                errors={errors}
                investmentDate={investmentDate}
              />
            ) : (
              <>
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
              </>
            )}

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
    </>
  );
}
