import { Blockchain, useApi, useAssetContext, useBuy } from '@dfx.swiss/react';
import { useMemo, useRef } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import { OrderFormData, OrderType } from 'src/hooks/order.hook';
import { OrderInterface } from './order-interface';

const AVAILABLE_CURRENCIES = ['EUR', 'CHF'];
const AVAILABLE_ASSETS = ['dEURO', 'ZCHF', 'ETH'];

interface SafeDepositInterfaceProps {
  showPaymentNameForm: () => void;
}

export const SafeDepositInterface = ({ showPaymentNameForm }: SafeDepositInterfaceProps) => {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { getAssets } = useAssetContext();
  const { translate } = useSettingsContext();

  const currentOrderId = useRef<number>();

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => AVAILABLE_CURRENCIES.includes(c.name)) || [];
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      AVAILABLE_ASSETS.includes(a.name),
    );
  }, [getAssets]);

  async function onFetchPaymentInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.DEPOSIT,
        sourceAsset: data.sourceAsset.name,
        targetAsset: data.targetAsset.name,
        sourceAmount: data.sourceAmount ? Number(data.sourceAmount) : undefined,
        targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
        paymentMethod: data.paymentMethod,
      },
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function confirmPayment(): Promise<void> {
    return call({
      url: `custody/order/${currentOrderId.current}/confirm`,
      method: 'POST',
    });

    // TODO: Implement
    // setShowsCompletion(true);
    // scrollRef.current?.scrollTo(0, 0);
  }

  return (
    <OrderInterface
      orderType={OrderType.BUY}
      header={translate('screens/safe', 'Deposit')}
      sourceAssets={availableCurrencies}
      targetAssets={availableAssets}
      fromInputLabel={translate('screens/safe', 'Deposit Amount')}
      toInputLabel={translate('screens/safe', 'Receive Amount')}
      onFetchPaymentInfo={onFetchPaymentInfo}
      showPaymentNameForm={showPaymentNameForm}
      confirmPayment={confirmPayment}
    />
  );
};
