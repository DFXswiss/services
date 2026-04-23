import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { Modal } from 'src/components/modal';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RecallInfo } from 'src/hooks/compliance.hook';
import { RecallDetails } from './recall-details';

interface RecallDetailsModalProps {
  readonly isOpen: boolean;
  readonly recall: RecallInfo | undefined;
  readonly onClose: () => void;
}

export function RecallDetailsModal({ isOpen, recall, onClose }: RecallDetailsModalProps): JSX.Element {
  const { translate } = useSettingsContext();

  if (!isOpen || !recall) return <></>;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-semibold text-dfxBlue-800 mb-4 text-left">
          {translate('screens/compliance', 'Recall')}
        </h2>

        <StyledVerticalStack gap={4} full>
          <RecallDetails recall={recall} />
          <StyledButton
            label={translate('general/actions', 'Close')}
            onClick={onClose}
            width={StyledButtonWidth.FULL}
            color={StyledButtonColor.STURDY_WHITE}
          />
        </StyledVerticalStack>
      </div>
    </Modal>
  );
}
