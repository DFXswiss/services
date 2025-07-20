import { Asset, Utils, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  IconColor,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { blankedAddress } from 'src/util/utils';
import { AssetInput } from '../order/asset-input';
import { QrBasic } from '../payment/qr-code';

interface ReceiveFormData {
  receiveAsset: Asset;
  receiveAmount?: string;
}

export const ReceiveInterface = () => {
  const { width } = useWindowContext();
  const { toString } = useBlockchain();
  const { translate } = useSettingsContext();
  const { setCompletion } = useOrderUIContext();
  const { receiveableAssets, fetchReceiveInfo, confirmReceive, custodyAddress } = useSafe();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    watch,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<ReceiveFormData>({ mode: 'onChange' });

  const data = watch();

  useEffect(() => {
    if (receiveableAssets?.length && !data.receiveAsset) {
      setValue('receiveAsset', receiveableAssets[0]);
    }
  }, [receiveableAssets, data.receiveAsset, setValue]);

  async function onCreateReceiveOrder(): Promise<void> {
    if (!data.receiveAsset || !data.receiveAmount) return;

    setError(undefined);
    setIsLoading(true);
    fetchReceiveInfo({
      sourceAsset: data.receiveAsset,
      targetAsset: data.receiveAsset,
      sourceAmount: data.receiveAmount,
      targetAmount: undefined,
      paymentMethod: undefined,
      bankAccount: undefined,
      address: undefined,
    })
      .then(() => confirmReceive())
      .then(() => setCompletion(true))
      .catch((err: any) => setError(err.message || 'Failed to create receive order'))
      .finally(() => setIsLoading(false));
  }

  const receiveAddress = custodyAddress || '';

  const rules = Utils.createRules({
    receiveAsset: Validations.Required,
    receiveAmount: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
      <StyledVerticalStack gap={4} full className="pt-2">
        <AssetInput
          control={control}
          name="receiveAsset"
          label={translate('screens/payment', 'Asset')}
          placeholder="0.00"
          availableItems={receiveableAssets ?? []}
          selectedItem={data.receiveAsset}
          assetRules={rules.receiveAsset}
          amountRules={rules.receiveAmount}
          balanceFunc={() => ''}
        />

        {data.receiveAsset && data.receiveAmount && receiveAddress && (
          <StyledVerticalStack gap={3} full>
            <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>

            <StyledInfoText iconColor={IconColor.BLUE}>
              {translate('screens/safe', 'Send your {{asset}} to the address below to deposit into your DFX Safe', {
                asset: data.receiveAsset.name,
              })}
            </StyledInfoText>

            <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
              <StyledDataTableExpandableRow
                label={translate('screens/safe', 'Receive Address')}
                expansionContent={
                  <div className="flex w-full items-center justify-center">
                    <div className="w-48 my-3">
                      <QrBasic data={receiveAddress} />
                    </div>
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <span>{blankedAddress(receiveAddress, { width })}</span>
                  <CopyButton onCopy={() => copy(receiveAddress)} />
                </div>
              </StyledDataTableExpandableRow>

              <StyledDataTableRow label={translate('screens/sell', 'Blockchain')}>
                <p>{toString(data.receiveAsset.blockchain)}</p>
              </StyledDataTableRow>
            </StyledDataTable>
          </StyledVerticalStack>
        )}

        {error && <div className="text-red-500 text-sm text-center">{error}</div>}

        <div className="w-full">
          <StyledButton
            type="button"
            isLoading={isLoading}
            label={translate('screens/sell', 'Click here once you have issued the transaction')}
            width={StyledButtonWidth.FULL}
            disabled={!isValid || isLoading}
            onClick={onCreateReceiveOrder}
          />
        </div>
      </StyledVerticalStack>
    </Form>
  );
};
