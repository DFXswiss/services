import { Buy, User } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { CloseType, useAppHandlingContext } from '../../contexts/app-handling.context';
import { useSettingsContext } from '../../contexts/settings.context';
import { MailEdit } from '../edit/mail.edit';

interface BuyCompletionProps {
  user?: User;
  paymentInfo?: Buy;
  navigateOnClose: boolean;
}

export function BuyCompletion({ user, paymentInfo, navigateOnClose }: BuyCompletionProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();

  const [isClosed, setIsClosed] = useState(false);

  const isLoading = !user;
  const hasMail = user?.mail != null;

  function getHeader(): string {
    return hasMail
      ? translate('screens/payment', 'Nice! You are all set! Give us a minute to handle your transaction.')
      : translate(
          'screens/buy',
          'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet.',
        );
  }

  function close() {
    closeServices({ type: CloseType.BUY, isComplete: true, buy: paymentInfo }, navigateOnClose);
    setIsClosed(true);
  }

  return isClosed ? (
    <></>
  ) : isLoading ? (
    <div className="mt-4">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
      </div>
      <p className="text-base font-bold text-center text-dfxBlue-800">{getHeader()}</p>

      {hasMail ? (
        <>
          <p className="text-center text-dfxBlue-800">
            {translate(
              'screens/buy',
              'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet.',
            )}{' '}
            {translate('screens/payment', 'We will inform you by email about the progress of your transactions.')}
          </p>
          <StyledButton
            label={translate('general/actions', 'Close')}
            onClick={close}
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
          />
        </>
      ) : (
        <MailEdit
          onSubmit={(email) => (!email || email.length === 0) && close()}
          infoText={translate(
            'screens/payment',
            'Enter your email address if you want to be informed about the progress of any purchase or sale',
          )}
          hideLabels
          isOptional
        />
      )}
    </StyledVerticalStack>
  );
}
