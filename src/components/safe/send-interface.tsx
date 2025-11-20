import { ApiError, Asset, UserAddress, Utils, Validations, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { OrderPaymentInfo } from 'src/dto/order.dto';
import { SafeOperationType } from 'src/dto/safe.dto';
import useDebounce from 'src/hooks/debounce.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { blankedAddress, findBalanceString } from 'src/util/utils';
import { AssetInput } from '../order/asset-input';

interface SendFormData {
  sendAsset?: Asset;
  sendAmount?: string;
  address?: UserAddress;
}

export const SendInterface = () => {
  const { translate, translateError } = useSettingsContext();
  const { width } = useWindowContext();
  const { sendableAssets, fetchSendInfo, confirmSend, portfolio } = useSafe();
  const { setCompletionType } = useOrderUIContext();

  const [quote, setQuote] = useState<OrderPaymentInfo>();
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState<string>();
  const { user } = useUserContext();
  const { rootRef } = useLayoutContext();

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SendFormData>({ mode: 'onChange' });

  const data = watch();
  const debouncedData = useDebounce(data, 500);
  const addressItems = useMemo(() => {
    const walletAddresses = user?.addresses?.filter((a) => !a.isCustody) ?? [];
    return [
      ...walletAddresses,
      {
        address: translate('screens/buy', 'Switch address'),
        label: translate('screens/buy', 'Login with a different address'),
        blockchains: [],
      } as any,
    ];
  }, [user?.addresses, translate]);

  useEffect(() => {
    if (sendableAssets?.length && !data.sendAsset) {
      setValue('sendAsset', sendableAssets[0]);
    }
  }, [data.sendAsset, sendableAssets, setValue]);

  useEffect(() => {
    if (addressItems.length && !data.address) {
      setValue('address', addressItems[0]);
    }
  }, [addressItems, data.address, setValue]);

  useEffect(() => {
    if (data.address || data.sendAsset) {
      setQuote(undefined);
    }
  }, [data.address, data.sendAsset]);

  useEffect(() => {
    if (!debouncedData?.sendAsset || !debouncedData.sendAmount || !debouncedData.address?.address) return;
    if (!debouncedData.address.blockchains?.length) return;

    setIsFetchingQuote(true);
    setError(undefined);

    fetchSendInfo({
      asset: debouncedData.sendAsset,
      amount: debouncedData.sendAmount,
      address: debouncedData.address.address,
    })
      .then((response) => setQuote(response))
      .catch((err: ApiError | Error) => setError(err.message ?? 'Unknown error'))
      .finally(() => setIsFetchingQuote(false));
  }, [debouncedData, fetchSendInfo]);

  const rules = useMemo(
    () =>
      Utils.createRules({
        sendAsset: Validations.Required,
        sendAmount: Validations.Required,
        address: Validations.Required,
      }),
    [],
  );

  async function onConfirmSend(): Promise<void> {
    await confirmSend();
    setCompletionType(SafeOperationType.SEND);
    setQuote(undefined);
  }

  return (
    <Form control={control} rules={rules} errors={errors} hasFormElement={false} translate={translateError}>
      <StyledVerticalStack gap={4} full className="pt-2">
        <AssetInput
          control={control}
          name="sendAsset"
          label={translate('screens/payment', 'Asset')}
          placeholder="0.00"
          availableItems={sendableAssets ?? []}
          selectedItem={data.sendAsset}
          assetRules={rules.sendAsset}
          amountRules={rules.sendAmount}
          balanceFunc={(asset) => findBalanceString(asset, portfolio.balances)}
          onMaxButtonClick={(value) => setValue('sendAmount', value.toString(), { shouldTouch: true })}
          onAmountChange={() => setQuote(undefined)}
        />

        <StyledDropdown
          control={control}
          rootRef={rootRef}
          name="address"
          label={translate('screens/sell', 'Destination address')}
          items={addressItems}
          labelFunc={(item) => (item.blockchains?.length ? blankedAddress(item.address, { width }) : item.address)}
          descriptionFunc={(item) => (item.blockchains?.length ? item.blockchains[0] : item.label)}
          full
          forceEnable
        />

        {error && <div className="text-sm text-center text-dfxRed-100">{error}</div>}

        {quote?.paymentInfo && (
          <StyledVerticalStack gap={3} full>
            <StyledInfoText>
              {translate('screens/safe', 'Please verify the address and confirm to send your assets.')}
            </StyledInfoText>

            <StyledDataTable showBorder>
              <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
                {quote.paymentInfo.amount} {quote.paymentInfo.sourceAsset}
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/payment', 'Estimated amount')}>
                {quote.paymentInfo.estimatedAmount} {quote.paymentInfo.targetAsset}
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/safe', 'Network fee')}>
                {quote.paymentInfo.fees.network} {quote.paymentInfo.sourceAsset}
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/safe', 'Destination address')}>
                {blankedAddress(debouncedData?.address?.address ?? '', { width })}
              </StyledDataTableRow>
            </StyledDataTable>
          </StyledVerticalStack>
        )}

        <StyledButton
          type="button"
          label={translate('screens/safe', 'Send {{asset}}', { asset: data.sendAsset?.name ?? '' })}
          width={StyledButtonWidth.FULL}
          disabled={!quote?.paymentInfo || isFetchingQuote}
          isLoading={isFetchingQuote}
          onClick={onConfirmSend}
        />
      </StyledVerticalStack>
    </Form>
  );
};
