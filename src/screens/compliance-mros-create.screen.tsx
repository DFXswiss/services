import { Utils, Validations, useUser } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { MrosStatus } from 'src/dto/mros.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { todayAsString } from 'src/util/compliance-helpers';

interface FormData {
  userDataId: string;
  status: MrosStatus;
  submissionDate: string;
  authorityReference: string;
}

export default function ComplianceMrosCreateScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { createMros } = useCompliance();
  const { getProfile } = useUser();
  const { navigate } = useNavigation();
  const { rootRef } = useLayoutContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [caseManager, setCaseManager] = useState<string>();

  useEffect(() => {
    getProfile()
      .then((p) => setCaseManager([p?.firstName, p?.lastName].filter(Boolean).join(' ')))
      .catch(() => setCaseManager(''));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { status: MrosStatus.DRAFT, submissionDate: todayAsString() },
  });

  useLayoutOptions({ title: translate('screens/compliance', 'MROS erfassen'), backButton: true });

  async function onSubmit(formData: FormData): Promise<void> {
    if (!caseManager) return;
    setIsSubmitting(true);
    setError(undefined);

    try {
      await createMros({
        userDataId: Number(formData.userDataId),
        status: formData.status,
        submissionDate: formData.submissionDate || undefined,
        authorityReference: formData.authorityReference || undefined,
        caseManager,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const rules = Utils.createRules({
    userDataId: [Validations.Required, Validations.Custom((v) => (isNaN(Number(v)) ? 'pattern' : true))],
    status: Validations.Required,
  });

  if (success) {
    return (
      <StyledVerticalStack gap={6} full center>
        <div className="text-center">
          <h2 className="text-dfxBlue-800 text-xl font-semibold mb-4">
            {translate('screens/compliance', 'MROS created successfully')}
          </h2>
          <StyledButton
            label={translate('general/actions', 'Back')}
            onClick={() => navigate(-1)}
            width={StyledButtonWidth.MD}
          />
        </div>
      </StyledVerticalStack>
    );
  }

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full>
        <StyledInput
          name="userDataId"
          type="number"
          label={translate('screens/compliance', 'User Data ID')}
          placeholder="12345"
          full
          smallLabel
        />

        <StyledDropdown<MrosStatus>
          rootRef={rootRef}
          name="status"
          label={translate('screens/compliance', 'Status')}
          placeholder={translate('general/actions', 'Select') + '...'}
          items={Object.values(MrosStatus)}
          labelFunc={(item) => item}
          full
          smallLabel
        />

        <StyledInput
          name="submissionDate"
          type="date"
          label={translate('screens/compliance', 'Submission Date')}
          full
          smallLabel
        />

        <StyledInput
          name="authorityReference"
          label={translate('screens/compliance', 'MROS ID')}
          full
          smallLabel
        />

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Create MROS')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid || !caseManager}
          isLoading={isSubmitting}
        />

        <StyledButton
          label={translate('general/actions', 'Cancel')}
          onClick={() => navigate(-1)}
          width={StyledButtonWidth.FULL}
          color={StyledButtonColor.WHITE}
        />
      </StyledVerticalStack>
    </Form>
  );
}
