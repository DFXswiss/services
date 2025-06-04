import { useSettingsContext } from 'src/contexts/settings.context';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from '../order/order-interface';

interface DepositInterfaceProps {
  bankAccountSelection: boolean;
  showCompletion: () => void;
  showPaymentNameForm: () => void;
  setBankAccountSelection: (isOpen: boolean) => void;
}

export const DepositInterface = ({
  bankAccountSelection,
  showCompletion,
  showPaymentNameForm,
  setBankAccountSelection,
}: DepositInterfaceProps) => {
  const { translate } = useSettingsContext();
  const { availableCurrencies, fetchPaymentInfo, confirmPayment, pairMap } = useSafe();

  async function onConfirmPayment(): Promise<void> {
    await confirmPayment();
    showCompletion();
  }

  return (
    <OrderInterface
      orderType={OrderType.DEPOSIT}
      header={translate('screens/safe', 'Deposit')}
      sourceInputLabel={translate('screens/payment', 'Amount')}
      sourceAssets={availableCurrencies}
      pairMap={pairMap}
      bankAccountSelection={bankAccountSelection}
      confirmPayment={onConfirmPayment}
      onFetchPaymentInfo={fetchPaymentInfo}
      showPaymentNameForm={showPaymentNameForm}
      setBankAccountSelection={setBankAccountSelection}
    />
  );
};
