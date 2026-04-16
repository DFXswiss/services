import { StyledButton, StyledButtonColor, StyledButtonWidth } from '@dfx.swiss/react-components';
import { Modal } from 'src/components/modal';
import { useSettingsContext } from 'src/contexts/settings.context';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto w-full">
        {title && <h2 className="text-lg font-semibold text-dfxBlue-800 mb-3 text-left">{title}</h2>}
        <p className="text-sm text-dfxBlue-800 mb-6 text-left">{message}</p>
        <div className="flex gap-2">
          <StyledButton
            label={cancelLabel ?? translate('general/actions', 'Cancel')}
            onClick={onCancel}
            width={StyledButtonWidth.FULL}
            color={StyledButtonColor.STURDY_WHITE}
            disabled={isLoading}
          />
          <StyledButton
            label={confirmLabel ?? translate('general/actions', 'Confirm')}
            onClick={onConfirm}
            width={StyledButtonWidth.FULL}
            color={destructive ? StyledButtonColor.RED : StyledButtonColor.BLUE}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
}
