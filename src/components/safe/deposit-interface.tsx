import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from '../order/order-interface';

export const DepositInterface = () => {
  const { translate } = useSettingsContext();
  const { availableCurrencies, fetchPaymentInfo, confirmPayment, pairMap } = useSafe();
  const { setCompletion } = useOrderUIContext();

  async function onConfirmPayment(): Promise<void> {
    await confirmPayment();
    setCompletion(true);
  }

  return (
    <OrderInterface
      orderType={OrderType.DEPOSIT}
      header={translate('screens/safe', 'Deposit')}
      sourceInputLabel={translate('screens/payment', 'Amount')}
      sourceAssets={availableCurrencies}
      pairMap={pairMap}
      confirmPayment={onConfirmPayment}
      onFetchPaymentInfo={fetchPaymentInfo}
    />
  );
};
