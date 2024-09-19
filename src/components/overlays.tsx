import { ApiError, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../contexts/settings.context';
import { ErrorHint } from './error-hint';

interface ConfirmationOverlayProps {
  message?: string;
  messageContent?: JSX.Element;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationOverlay({
  message,
  messageContent,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmationOverlayProps): JSX.Element {
  return (
    <StyledVerticalStack gap={6} full>
      {message && <p className="text-dfxBlue-800 mb-2 text-center">{message}</p>}
      {messageContent}
      <StyledHorizontalStack gap={4} spanAcross>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.FULL}
          label={cancelLabel}
          onClick={onCancel}
        />
        <StyledButton width={StyledButtonWidth.FULL} label={confirmLabel} onClick={onConfirm} />
      </StyledHorizontalStack>
    </StyledVerticalStack>
  );
}

interface FormData {
  label: string;
}

interface RenameAddressOverlayProps {
  placeholder?: string;
  onClose: (label?: string) => Promise<void>;
}

export function RenameAddressOverlay({ placeholder, onClose }: RenameAddressOverlayProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onTouched' });

  function onSubmit(data: FormData) {
    setIsUpdating(true);
    setError(undefined);
    onClose(data.label)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    label: Validations.Required,
  });

  return (
    <StyledVerticalStack gap={6} full>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledInput
          name="label"
          autocomplete="label"
          label={translate('screens/settings', 'Label')}
          placeholder={placeholder ?? translate('screens/settings', 'Label')}
          full
          smallLabel
        />
      </Form>

      <StyledHorizontalStack gap={6} spanAcross>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.FULL}
          label={translate('general/actions', 'Cancel')}
          onClick={() => onClose()}
        />
        <StyledButton
          type="submit"
          label={translate('general/actions', 'Save')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating}
        />
      </StyledHorizontalStack>

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}
