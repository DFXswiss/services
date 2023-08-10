import { Sell } from '@dfx.swiss/react';
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
import { CloseType, useAppHandlingContext } from '../../contexts/app-handling.context';
import { useSettingsContext } from '../../contexts/settings.context';

export function SellCompletion({ paymentInfo }: { paymentInfo: Sell }): JSX.Element {
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();

  function close() {
    closeServices({ type: CloseType.SELL, isComplete: true, sell: paymentInfo });
  }

  return (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
      </div>
      <p className="text-base font-bold text-center text-dfxBlue-800">
        {translate('screens/payment', 'Nice! You are all set! Give us a minute to handle your transaction')}
      </p>
      <p className="text-center text-dfxBlue-800">
        {translate(
          'screens/sell',
          'As soon as the transaction arrives in our wallet, we will transfer your money to your bank account.',
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
    </StyledVerticalStack>
  );
}
