import { useBankAccountContext } from '@dfx.swiss/react';
import { useCallback } from 'react';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SafeOperationType } from 'src/dto/safe.dto';
import { OrderFormData, OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { findCustodyBalanceString } from 'src/util/utils';
import { OrderInterface } from '../order/order-interface';

export const WithdrawInterface = () => {
  const { translate } = useSettingsContext();
  const { withdrawableAssets, pairMap, fetchWithdrawInfo, confirmWithdraw, portfolio } = useSafe();
  const { setCompletionType } = useOrderUIContext();
  const { bankAccounts } = useBankAccountContext();

  async function onConfirmWithdraw(): Promise<void> {
    await confirmWithdraw();
    setCompletionType(SafeOperationType.WITHDRAW);
  }

  const handleFetchWithdrawInfo = useCallback(
    (data: OrderFormData) => {
      return fetchWithdrawInfo(data);
    },
    [fetchWithdrawInfo],
  );
  const defaultBankAccount = bankAccounts?.find((a) => a.default);

  return (
    <OrderInterface
      orderType={OrderType.SELL}
      header={translate('screens/safe', 'Withdraw')}
      sourceInputLabel={translate('screens/payment', 'Amount')}
      sourceAssets={withdrawableAssets}
      pairMap={pairMap}
      hideAddressSelection={true}
      confirmPayment={onConfirmWithdraw}
      confirmButtonLabel={translate('screens/safe', 'Click here to confirm the withdrawal')}
      onFetchPaymentInfo={handleFetchWithdrawInfo}
      balanceFunc={(asset) => findCustodyBalanceString(asset, portfolio.balances)}
      defaultValues={{ bankAccount: defaultBankAccount }}
    />
  );
};
