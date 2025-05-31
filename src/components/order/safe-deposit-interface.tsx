import { Blockchain, useApi, useAssetContext, useBuy } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { OrderType } from 'src/hooks/order.hook';
import { OrderFormData, OrderInterface } from './order-interface';

const AVAILABLE_CURRENCIES = ['EUR', 'CHF'];
const AVAILABLE_ASSETS = ['dEURO', 'ZCHF', 'ETH'];

export enum CustodyOrderType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',

  RECEIVE = 'Receive',
  SEND = 'Send',

  SWAP = 'Swap',

  SAVING_DEPOSIT = 'SavingDeposit',
  SAVING_WITHDRAWAL = 'SavingWithdrawal',
}

export const SafeDepositInterface = () => {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { getAssets } = useAssetContext();
  const { translate } = useSettingsContext();

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => AVAILABLE_CURRENCIES.includes(c.name)) || [];
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      AVAILABLE_ASSETS.includes(a.name),
    );
  }, [getAssets]);

  async function onFetchPaymentInfo<T>(data: OrderFormData): Promise<T> {
    return call<T>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.DEPOSIT,
        sourceAsset: data.fromAsset.name,
        targetAsset: data.toAsset.name,
        sourceAmount: data.fromAssetAmount ? Number(data.fromAssetAmount) : undefined,
        targetAmount: data.toAssetAmount ? Number(data.toAssetAmount) : undefined,
        paymentMethod: data.paymentMethod,
      },
    });
  }

  async function onConfirm<CustodyOrderPaymentInfo>(data: CustodyOrderPaymentInfo): Promise<void> {
    console.log('Confirming deposit with data:', data);
  }

  return (
    <OrderInterface
      orderType={OrderType.BUY}
      header={translate('screens/safe', 'Deposit')}
      fromAssets={availableCurrencies}
      toAssets={availableAssets}
      fromInputLabel={translate('screens/safe', 'Deposit Amount')}
      toInputLabel={translate('screens/safe', 'Receive Amount')}
      onConfirm={onConfirm}
      onFetchPaymentInfo={onFetchPaymentInfo}
    />
  );
};
