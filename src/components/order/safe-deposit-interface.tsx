import { useSettingsContext } from 'src/contexts/settings.context';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from './order-interface';

interface SafeDepositInterfaceProps {
  showPaymentNameForm: () => void;
  bankAccountSelection: boolean;
  setBankAccountSelection: (isOpen: boolean) => void;
  showCompletion: () => void;
}

export const SafeDepositInterface = ({
  showPaymentNameForm,
  bankAccountSelection,
  setBankAccountSelection,
  showCompletion,
}: SafeDepositInterfaceProps) => {
  const { translate } = useSettingsContext();
  const { availableCurrencies, onFetchPaymentInfo, confirmPayment, pairMap } = useSafe();

  async function obConfirmPayment(): Promise<void> {
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
      onFetchPaymentInfo={onFetchPaymentInfo}
      showPaymentNameForm={showPaymentNameForm}
      confirmPayment={obConfirmPayment}
      bankAccountSelection={bankAccountSelection}
      setBankAccountSelection={setBankAccountSelection}
    />
  );
};
