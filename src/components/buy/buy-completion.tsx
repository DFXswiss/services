import { useUserContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';
import { MailEdit } from '../edit/mail.edit';

interface BuyCompletionProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export function BuyCompletion({ onCancel, onSubmit }: BuyCompletionProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();

  const showsSimple = user?.mail != null;

  function getHeader(): string {
    return showsSimple
      ? translate('screens/buy', 'Nice! You are all set! Give us a minute to handle your transaction')
      : translate(
          'screens/buy',
          'As soon as the transfer arrives in our bank account, we will transfer your asset in your wallet',
        );
  }

  return (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XL} icon={IconVariant.PROCESS_DONE} />
      </div>
      <p className="text-lg font-bold text-center">{getHeader()}</p>
      {showsSimple ? (
        <>
          <p className="text-center">
            {translate(
              'screens/buy',
              'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet. We will inform you about the progress of any purchase or sale via E-mail.',
            )}
          </p>
          <StyledButton
            label="close"
            onClick={onSubmit}
            color={StyledButtonColor.PALE_WHITE}
            width={StyledButtonWidth.FULL}
            caps
          />
        </>
      ) : (
        <MailEdit
          onSubmit={onSubmit}
          onCancel={onCancel}
          infoText={translate(
            'screens/buy',
            'Enter your email address if you want to be informed about the progress of any purchase or sale',
          )}
          showCancelButton
          hideLabels
          isOptional
        />
      )}
    </StyledVerticalStack>
  );
}
