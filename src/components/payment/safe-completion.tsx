import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { SafeOperationType } from 'src/dto/safe.dto';
import { useSettingsContext } from '../../contexts/settings.context';

// TODO (later): Refactor completion components into a common component
// See buy-completion.tsx, sell-completion.tsx & swap-completion.tsx

interface SafeCompletionProps {
  type: SafeOperationType;
  onClose: () => void;
}

export function SafeCompletion({ type, onClose }: SafeCompletionProps): JSX.Element {
  const { translate } = useSettingsContext();

  const [isClosed, setIsClosed] = useState(false);

  function close() {
    onClose();
    setIsClosed(true);
  }

  const getCompletionMessage = () => {
    switch (type) {
      case SafeOperationType.DEPOSIT:
        return translate(
          'screens/safe',
          'Your deposit will be processed and added to your Safe portfolio. We will inform you by email about the progress of your transactions.',
        );
      case SafeOperationType.RECEIVE:
        return translate(
          'screens/safe',
          'Your incoming transaction will be processed and added to your Safe portfolio. We will inform you by email about the progress of your transactions.',
        );
      case SafeOperationType.SWAP:
        return translate(
          'screens/safe',
          'Your swap will be processed and reflected in your Safe portfolio. We will inform you by email about the progress of your transactions.',
        );
    }
  };

  return isClosed ? (
    <></>
  ) : (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
      </div>

      <p className="text-base font-bold text-center text-dfxBlue-800">
        {translate('screens/payment', 'Nice! You are all set! Give us a minute to handle your transaction.')}
      </p>

      <p className="text-center text-dfxBlue-800">{getCompletionMessage()}</p>

      <StyledButton
        label={translate('general/actions', 'Close')}
        onClick={close}
        color={StyledButtonColor.STURDY_WHITE}
        width={StyledButtonWidth.FULL}
      />
    </StyledVerticalStack>
  );
}
