import { Blockchain, useApi, useAssetContext, useBuy } from '@dfx.swiss/react';
import { useCallback, useMemo, useRef } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import { OrderFormData, OrderType } from 'src/hooks/order.hook';
import { OrderInterface } from './order-interface';

const PAIRS: Record<string, string> = {
  EUR: 'dEURO',
  CHF: 'ZCHF',
};

interface SafeDepositInterfaceProps {
  showPaymentNameForm: () => void;
  bankAccountSelection: boolean;
  setBankAccountSelection: (isOpen: boolean) => void;
}

export const SafeDepositInterface = ({
  showPaymentNameForm,
  bankAccountSelection,
  setBankAccountSelection,
}: SafeDepositInterfaceProps) => {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { getAssets } = useAssetContext();
  const { translate } = useSettingsContext();

  const currentOrderId = useRef<number>();

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => Object.keys(PAIRS).includes(c.name)) || [];
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      Object.values(PAIRS).includes(a.name),
    );
  }, [getAssets]);

  async function onFetchPaymentInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.DEPOSIT,
        sourceAsset: data.sourceAsset.name,
        targetAsset: PAIRS[data.sourceAsset.name],
        sourceAmount: Number(data.sourceAmount),
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

  const pairMap = useCallback(
    (asset: string) => {
      return availableAssets.find((a) => a.name === PAIRS[asset]);
    },
    [availableAssets],
  );

  return (
    <OrderInterface
      orderType={OrderType.BUY}
      header={translate('screens/safe', 'Deposit')}
      sourceAssets={availableCurrencies}
      fromInputLabel={translate('screens/payment', 'Amount')}
      toInputLabel={translate('screens/safe', 'Receive Amount')}
      pairMap={pairMap}
      onFetchPaymentInfo={onFetchPaymentInfo}
      showPaymentNameForm={showPaymentNameForm}
      confirmPayment={confirmPayment}
      bankAccountSelection={bankAccountSelection}
      setBankAccountSelection={setBankAccountSelection}
    />
  );
};
