import { useBankAccountContext } from '@dfx.swiss/react';
import { useCallback } from 'react';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SafeOperationType } from 'src/dto/safe.dto';
import { OrderFormData, OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { findBalanceString } from 'src/util/utils';
import { OrderInterface } from '../order/order-interface';

export const WithdrawInterface = () => {
  const { translate } = useSettingsContext();
  const { withdrawableAssets, withdrawableCurrencies, pairMap, fetchWithdrawInfo, confirmWithdraw, portfolio } =
    useSafe();
  const { setCompletionType } = useOrderUIContext();
  const { bankAccounts } = useBankAccountContext();

  async function onConfirmWithdraw(): Promise<void> {
    await confirmWithdraw();
    setCompletionType(SafeOperationType.WITHDRAW);
  }

  const handleFetchWithdrawInfo = useCallback(
    (data: OrderFormData) => {
      if (!data.bankAccount?.iban) {
        return Promise.reject(new Error(translate('screens/sell', 'Add or select your IBAN')));
      }
      return fetchWithdrawInfo(data);
    },
    [fetchWithdrawInfo, translate],
  );
  const defaultBankAccount = bankAccounts?.find((a) => a.default);

  return (
    <OrderInterface
      orderType={OrderType.SELL}
      header={translate('screens/safe', 'Withdraw')}
      sourceInputLabel={translate('screens/buy', 'You spend')}
      targetInputLabel={translate('screens/buy', 'You get about')}
      sourceAssets={withdrawableAssets}
      targetAssets={withdrawableCurrencies}
      pairMap={pairMap}
      confirmPayment={onConfirmWithdraw}
      onFetchPaymentInfo={handleFetchWithdrawInfo}
      balanceFunc={(asset) => findBalanceString(asset, portfolio.balances)}
      defaultValues={{ bankAccount: defaultBankAccount }}
    />
  );
};
