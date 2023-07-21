import { Asset, Fiat, Utils, Validations, useAssetContext, useBuy, useFiat, useSessionContext } from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useQuery } from '../hooks/query.hook';

interface FormData {
  currency: Fiat;
  asset: Asset;
}

export function BuyScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const navigate = useNavigate();
  const { blockchain, availableBlockchains } = useSessionContext();
  const { currencies } = useBuy();
  const { assets, getAsset } = useAssetContext();
  const { assetId, currencyId } = useQuery();
  const { toDescription, getDefaultCurrency } = useFiat();
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<FormData>();

  useEffect(() => {
    const asset = getAsset(Number(assetId), { buyable: true });
    if (asset) setValue('asset', asset, { shouldValidate: true });
  }, [assetId, assets, getAsset]);

  useEffect(() => {
    const currency = currencies?.find((currency) => currency.id === Number(currencyId));
    if (currency) setValue('currency', currency, { shouldValidate: true });
  }, [currencyId, currencies]);

  useEffect(() => {
    if (assets) {
      const blockchainAssets = availableBlockchains
        ?.filter((b) => (blockchain ? blockchain === b : true))
        .map((blockchain) => assets.get(blockchain))
        .reduce((prev, curr) => prev?.concat(curr ?? []), [])
        ?.filter((asset) => asset.buyable);
      blockchainAssets?.length === 1 && setValue('asset', blockchainAssets[0], { shouldValidate: true });
      setAvailableAssets(blockchainAssets ?? []);
    }
  }, [assets]);

  useEffect(() => {
    if (currencies) {
      const defaultValue = getDefaultCurrency(currencies ?? []);
      if (getValues().currency === undefined && defaultValue) {
        setValue('currency', defaultValue, { shouldValidate: true });
      }
    }
  }, [currencies]);

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function handleNext() {
    const data = getValues();
    navigate(`/buy/payment?assetId=${data.asset.id}&currencyId=${data.currency.id}`);
  }

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
  });

  return (
    <Layout title={translate('general/services', 'Buy')}>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack gap={8} full>
          {currencies && assets && (
            <>
              <StyledDropdown<Asset>
                name="asset"
                label={translate('screens/buy', 'I want to buy')}
                placeholder={translate('general/actions', 'Please select...')}
                items={availableAssets}
                labelFunc={(item) => item.name}
                assetIconFunc={(item) => item.name as AssetIconVariant}
                descriptionFunc={(item) => item.blockchain}
                full
              />
              <StyledDropdown<Fiat>
                name="currency"
                label={translate('screens/buy', 'with')}
                placeholder={translate('general/actions', 'Please select...')}
                items={currencies}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => toDescription(item)}
                full
              />
            </>
          )}

          <StyledButton
            onClick={() => handleNext()}
            width={StyledButtonWidth.FULL}
            label={translate('general/actions', 'Next')}
            disabled={!isValid}
            caps={true}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
