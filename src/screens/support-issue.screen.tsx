import {
  ApiError,
  FundOrigin,
  InvestmentDate,
  KycLevel,
  Limit,
  Utils,
  Validations,
  useSupport,
  useUserContext,
} from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { CreateSupportIssue, SupportIssueReason, SupportIssueType } from '@dfx.swiss/react/dist/definitions/support';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useParams } from 'react-router-dom';
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
import { toBase64 } from '../util/utils';

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
  transaction: string;
  reason: SupportIssueReason;
  message: string;
  limit: Limit;
  investmentDate: InvestmentDate;
  fundOrigin: FundOrigin;
  fundOriginText?: string;
  file?: File;
}

export default function SupportIssueScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { id } = useParams();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { createIssue } = useSupport();
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { search } = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);

  const params = new URLSearchParams(search);
  const paramKycCode = params.get('code');
  const kycCode = paramKycCode ?? user?.kyc.hash;

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: {
      type: pathname.includes('/tx') ? SupportIssueType.TRANSACTION_ISSUE : undefined,
    },
  });
  const selectedType = useWatch({ control, name: 'type' });
  const investmentDate = useWatch({ control, name: 'investmentDate' });

  const types = Object.values(SupportIssueType);
  const reasons = IssueReasons[selectedType] ?? [];

  useEffect(() => {
    id && setValue('transaction', id);
  }, [id]);

  useEffect(() => {
    reasons.length === 1 && setValue('reason', reasons[0]);
  }, [reasons]);

  useEffect(() => {
    if (selectedType === SupportIssueType.TRANSACTION_ISSUE) {
      if (!id) navigate('/support/issue/tx');
    } else if (selectedType === SupportIssueType.LIMIT_REQUEST) {
      if (!kycCode) navigate('/kyc');
    }
  }, [selectedType]);

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

      if (data.type === SupportIssueType.TRANSACTION_ISSUE && id) {
        request.transaction = { id: +id };
      }

      if (data.type === SupportIssueType.LIMIT_REQUEST && data.limit) {
        request.limitRequest = {
          limit: data.limit,
          investmentDate: data.investmentDate,
          fundOrigin: data.fundOrigin,
          fundOriginText: data.fundOriginText ?? '',
        };
      }

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

  const rules = Utils.createRules({
    type: Validations.Required,
    name: Validations.Required,
    reason: Validations.Required,
    message: Validations.Required,
    limit: Validations.Required,
    investmentDate: Validations.Required,
    fundOrigin: Validations.Required,
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

            {selectedType === SupportIssueType.LIMIT_REQUEST && (
              <>
                <StyledDropdown<Limit>
                  rootRef={rootRef}
                  label={translate('screens/limit', 'Investment volume')}
                  items={Object.values(Limit).filter((i) => typeof i !== 'string') as number[]}
                  labelFunc={(item) => LimitLabels[item]}
                  name="limit"
                  placeholder={translate('general/actions', 'Select...')}
                  full
                />

                <StyledDropdown<InvestmentDate>
                  rootRef={rootRef}
                  label={translate('screens/limit', 'Investment date')}
                  items={Object.values(InvestmentDate)}
                  labelFunc={(item) => translate('screens/limit', DateLabels[item])}
                  name="investmentDate"
                  placeholder={translate('general/actions', 'Select...')}
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
                  placeholder={translate('general/actions', 'Select...')}
                  full
                />

                <StyledInput
                  name="fundOriginText"
                  label={`${translate('screens/limit', 'Origin of funds')} (${translate(
                    'screens/limit',
                    'free text',
                  )})`}
                  multiLine
                  full
                />
              </>
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
