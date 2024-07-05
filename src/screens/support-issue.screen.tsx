import { ApiError, KycLevel, Utils, Validations, useSupport } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconColor,
  IconVariant,
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
import { FaTelegram } from 'react-icons/fa';
import { IoMdHelpCircle } from 'react-icons/io';
import { useLocation, useParams } from 'react-router-dom';
import { Warning } from 'src/components/warning';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { IssueReasonLabels, IssueTypeLabels } from '../config/labels';
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
  file?: File;
}

export function SupportIssueScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(KycLevel.Link, '/contact');

  const { id } = useParams();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { createIssue } = useSupport();
  const { translate, translateError } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

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

  const types = Object.values(SupportIssueType).filter((t) => t !== SupportIssueType.LIMIT_REQUEST);
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
    } else {
      navigate('/support/issue');
    }
  }, [selectedType]);

  function onCloseWarning(confirm: boolean) {
    setShowWarning(false);
    if (confirm) window.open('https://t.me/DFXswiss_en', '_blank');
  }

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
  });

  const title = showWarning
    ? translate('screens/support', 'Telegram support')
    : translate('screens/support', 'Support issue');

  return (
    <Layout title={title} rootRef={rootRef} onBack={showWarning ? () => setShowWarning(false) : undefined}>
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
      ) : showWarning ? (
        <Warning onClose={onCloseWarning} />
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <div className="flex flex-row w-full gap-4 text-left text-sm mt-2">
              <StyledButtonTile
                title={translate('screens/support', 'FAQ')}
                description={translate(
                  'screens/support',
                  'We have summarized the most common questions for you in our FAQ.',
                )}
                onClick={() => window.open('https://docs.dfx.swiss/en/faq.html', '_blank')}
                buttonLabel={translate('screens/support', 'Search for it')}
                icon={<IoMdHelpCircle className="h-auto w-7" />}
              />
              <StyledButtonTile
                title={translate('screens/support', 'Telegram Community')}
                description={translate(
                  'screens/support',
                  'Join the DFX Community. Our moderators are happy to assist you in the group.',
                )}
                onClick={() => setShowWarning(true)}
                buttonLabel={translate('screens/support', 'Join now')}
                icon={<FaTelegram className="h-auto w-6" />}
              />
            </div>
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

function StyledButtonTile({
  title,
  description,
  onClick,
  buttonLabel,
  icon,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  buttonLabel: string;
  icon: JSX.Element;
}) {
  return (
    <div
      onClick={onClick}
      className="flex flex-1 flex-col gap-1.5 w-full p-4 border rounded-md text-dfxBlue-800 border-dfxGray-400 cursor-pointer hover:bg-link"
    >
      <div className="flex flex-row items-center gap-2 text-dfxBlue-800">
        {icon}
        <div className="text-base font-bold">{title}</div>
      </div>
      <p>{description}</p>
      <button className="flex h-full items-end flex-row gap-2 mt-1 text-dfxGray-800">
        <p>{buttonLabel}</p>
        <DfxIcon icon={IconVariant.ARROW_RIGHT} color={IconColor.RED} />
      </button>
    </div>
  );
}
