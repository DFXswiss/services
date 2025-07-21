import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SafeOperationType } from 'src/dto/safe.dto';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from '../order/order-interface';

export const DepositInterface = () => {
  const { translate } = useSettingsContext();
  const { availableCurrencies, fetchPaymentInfo, confirmPayment, pairMap } = useSafe();
  const { setCompletionType } = useOrderUIContext();

  async function onConfirmPayment(): Promise<void> {
    await confirmPayment();
    setCompletionType(SafeOperationType.DEPOSIT);
  }

  return (
    <OrderInterface
      orderType={OrderType.DEPOSIT}
      sourceInputLabel={translate('screens/payment', 'Amount')}
      sourceAssets={availableCurrencies}
      pairMap={pairMap}
      hideAddressSelection={true}
      confirmPayment={onConfirmPayment}
      onFetchPaymentInfo={fetchPaymentInfo}
    />
  );
};
