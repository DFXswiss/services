import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SafeOperationType } from 'src/dto/safe.dto';
import { OrderType } from 'src/hooks/order.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { OrderInterface } from '../order/order-interface';

export const SwapInterface = () => {
  const { translate } = useSettingsContext();
  const { swappableSourceAssets, swappableTargetAssets, fetchSwapInfo, confirmSwap } = useSafe();
  const { setCompletionType } = useOrderUIContext();

  async function onConfirmPayment(): Promise<void> {
    await confirmSwap();
    setCompletionType(SafeOperationType.SWAP);
  }

  return (
    <OrderInterface
      orderType={OrderType.SWAP}
      sourceInputLabel={translate('screens/swap', 'You pay')}
      targetInputLabel={translate('screens/swap', 'You receive')}
      sourceAssets={swappableSourceAssets}
      targetAssets={swappableTargetAssets}
      hideAddressSelection={true}
      confirmPayment={onConfirmPayment}
      onFetchPaymentInfo={fetchSwapInfo}
    />
  );
};
