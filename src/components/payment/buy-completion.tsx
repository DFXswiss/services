import { Buy } from '@dfx.swiss/react';
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
import { CloseType, useAppHandlingContext } from '../../contexts/app-handling.context';
import { useSettingsContext } from '../../contexts/settings.context';
import { MailEdit } from '../edit/mail.edit';

interface BuyCompletionProps {
  showsSimple: boolean;
  paymentInfo: Buy;
  navigateOnClose: boolean;
}

export function BuyCompletion({ showsSimple, paymentInfo, navigateOnClose }: BuyCompletionProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();

  const [isClosed, setIsClosed] = useState(false);

  function getHeader(): string {
    return showsSimple
      ? translate('screens/payment', 'Nice! You are all set! Give us a minute to handle your transaction')
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
  ) : (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
      </div>
      <p className="text-base font-bold text-center text-dfxBlue-800">{getHeader()}</p>
      {showsSimple ? (
        <>
          <p className="text-center text-dfxBlue-800">
            {translate(
              'screens/buy',
              'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet.',
            )}{' '}
            {translate('screens/payment', 'We will inform you about the progress of any purchase or sale via E-mail.')}
          </p>
          <StyledButton
            label={translate('general/actions', 'Close')}
            onClick={close}
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            caps
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
