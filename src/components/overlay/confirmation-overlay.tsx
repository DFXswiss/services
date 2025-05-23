import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';

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
