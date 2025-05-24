import { ApiError } from '@dfx.swiss/react';
import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { ErrorHint } from '../error-hint';

interface ConfirmationOverlayProps {
  message?: string;
  messageContent?: JSX.Element;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmationOverlay({
  message,
  messageContent,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmationOverlayProps): JSX.Element {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  function onSubmit() {
    setIsUpdating(true);
    setError(undefined);
    onConfirm()
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

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
        <StyledButton width={StyledButtonWidth.FULL} label={confirmLabel} onClick={onSubmit} isLoading={isUpdating} />
      </StyledHorizontalStack>

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}
