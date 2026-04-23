import { Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RecallReason } from 'src/dto/recall.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

interface FormData {
  reason: RecallReason;
  comment: string;
  fee: string;
}

export default function ComplianceBankTxRecallScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate, translateError } = useSettingsContext();
  const { createRecall } = useCompliance();
  const { navigate } = useNavigation();
  const { rootRef } = useLayoutContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { fee: '500', comment: 'n.a.' },
  });

  useLayoutOptions({ title: 'Recall erfassen', backButton: true });

  async function onSubmit(formData: FormData) {
    if (!id) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      await createRecall({
        bankTxId: +id,
        sequence: 1,
        reason: formData.reason,
        comment: formData.comment,
        fee: Number(formData.fee),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const rules = Utils.createRules({
    reason: Validations.Required,
    comment: Validations.Required,
    fee: [Validations.Required, Validations.Custom((v) => (isNaN(Number(v)) ? 'pattern' : true))],
  });

  if (success) {
    return (
      <StyledVerticalStack gap={6} full center>
        <div className="text-center">
          <h2 className="text-dfxBlue-800 text-xl font-semibold mb-4">
            {translate('screens/compliance', 'Recall created successfully')}
          </h2>
          <StyledButton label={translate('general/actions', 'Back')} onClick={() => navigate(-1)} width={StyledButtonWidth.MD} />
        </div>
      </StyledVerticalStack>
    );
  }

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full>
        <StyledDropdown<RecallReason>
          rootRef={rootRef}
          name="reason"
          label="Reason"
          placeholder={translate('general/actions', 'Select') + '...'}
          items={Object.values(RecallReason).filter((r) => r !== RecallReason.UNKNOWN)}
          labelFunc={(item) => item}
          full
          smallLabel
        />

        <StyledInput
          name="fee"
          type="number"
          label="Fee"
          placeholder="0"
          full
          smallLabel
        />

        <StyledInput name="comment" label="Comment" full smallLabel />

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Create recall')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
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
