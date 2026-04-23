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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Modal } from 'src/components/modal';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RecallReason } from 'src/dto/recall.dto';
import { useCompliance } from 'src/hooks/compliance.hook';

interface RecallModalProps {
  readonly isOpen: boolean;
  readonly bankTxId: number | undefined;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

interface RecallFormData {
  reason: RecallReason;
  comment: string;
  fee: string;
}

export function RecallModal({ isOpen, bankTxId, onClose, onSuccess }: RecallModalProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { createRecall } = useCompliance();
  const { rootRef } = useLayoutContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    reset,
  } = useForm<RecallFormData>({
    mode: 'onTouched',
    defaultValues: { fee: '500', comment: 'n.a.' },
  });

  useEffect(() => {
    if (!isOpen) {
      setError(undefined);
      reset();
    }
  }, [isOpen]);

  async function onSubmit(formData: RecallFormData): Promise<void> {
    if (!bankTxId) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      await createRecall({
        bankTxId,
        sequence: 1,
        reason: formData.reason,
        comment: formData.comment,
        fee: Number(formData.fee),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(): void {
    reset();
    setError(undefined);
    onClose();
  }

  const rules = Utils.createRules({
    reason: Validations.Required,
    comment: Validations.Required,
    fee: [Validations.Required, Validations.Custom((v) => (isNaN(Number(v)) ? 'pattern' : true))],
  });

  if (!isOpen) return <></>;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-semibold text-dfxBlue-800 mb-4 text-left">
          {translate('screens/compliance', 'Recall erfassen')}
        </h2>

        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={4} full>
            <StyledDropdown<RecallReason>
              rootRef={rootRef}
              name="reason"
              label={translate('screens/compliance', 'Reason')}
              placeholder={translate('general/actions', 'Select') + '...'}
              items={Object.values(RecallReason).filter((r) => r !== RecallReason.UNKNOWN)}
              labelFunc={(item) => item}
              full
              smallLabel
            />

            <StyledInput
              name="fee"
              type="number"
              label={translate('screens/compliance', 'Fee')}
              placeholder="0"
              full
              smallLabel
            />

            <StyledInput name="comment" label={translate('screens/compliance', 'Comment')} full smallLabel />

            {error && <ErrorHint message={error} />}

            <div className="flex gap-2 w-full">
              <StyledButton
                label={translate('general/actions', 'Cancel')}
                onClick={handleClose}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
                disabled={isSubmitting}
              />
              <StyledButton
                type="submit"
                label={translate('general/actions', 'Create recall')}
                onClick={handleSubmit(onSubmit)}
                width={StyledButtonWidth.FULL}
                disabled={!isValid}
                isLoading={isSubmitting}
              />
            </div>
          </StyledVerticalStack>
        </Form>
      </div>
    </Modal>
  );
}
