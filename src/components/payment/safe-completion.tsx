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
import { useSettingsContext } from '../../contexts/settings.context';

interface SafeCompletionProps {
  onClose: () => void;
}

export function SafeCompletion({ onClose }: SafeCompletionProps): JSX.Element {
  const { translate } = useSettingsContext();

  const [isClosed, setIsClosed] = useState(false);

  function close() {
    onClose();
    setIsClosed(true);
  }

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

      <p className="text-center text-dfxBlue-800">
        {translate(
          'screens/safe',
          'Your deposit will be processed and added to your Safe portfolio. We will inform you by email about the progress of your transactions.',
        )}
      </p>

      <StyledButton
        label={translate('general/actions', 'Close')}
        onClick={close}
        color={StyledButtonColor.STURDY_WHITE}
        width={StyledButtonWidth.FULL}
      />
    </StyledVerticalStack>
  );
}
