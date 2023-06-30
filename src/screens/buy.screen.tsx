import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '../contexts/language.context';
import { AssetIconVariant } from '../stories/DfxAssetIcon';
import Form from '../stories/form/Form';
import StyledDropdown from '../stories/form/StyledDropdown';
import StyledButton, { StyledButtonWidths } from '../stories/StyledButton';
import { Utils } from '../utils';
import Validations from '../validations';
import { Layout } from '../components/layout';
import StyledVerticalStack from '../stories/layout-helpers/StyledVerticalStack';
import { Asset, Fiat, useAssetContext, useBuyContext, useFiat, useSessionContext } from '@dfx.swiss/react';

interface FormData {
  currency: Fiat;
  asset: Asset;
}

export function BuyScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const navigate = useNavigate();
  const { blockchain, availableBlockchains } = useSessionContext();
  const { currencies } = useBuyContext();
  const { assets } = useAssetContext();
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
    <Layout backTitle={translate('screens/buy', 'Buy')}>
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
            width={StyledButtonWidths.FULL}
            label={translate('general/actions', 'Next')}
            disabled={!isValid}
            caps={true}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
