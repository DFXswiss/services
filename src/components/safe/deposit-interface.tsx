import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SafeOperationType } from 'src/dto/safe.dto';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from '../order/order-interface';
import { ReceiveInterface } from './receive-interface';
import { TransactionType } from './transaction.types';

type DepositInterfaceProps = {
  transactionType: TransactionType;
};

export const DepositInterface = ({ transactionType }: DepositInterfaceProps) => {
  const { translate } = useSettingsContext();
  const { availableCurrencies, fetchPaymentInfo, confirmPayment, pairMap } = useSafe();
  const { setCompletionType } = useOrderUIContext();

  if (transactionType === TransactionType.CRYPTO) {
    return <ReceiveInterface />;
  }

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
