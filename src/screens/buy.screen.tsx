import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAssetContext } from '../api/contexts/asset.context';
import { useBuyContext } from '../api/contexts/buy.context';
import { Asset } from '../api/definitions/asset';
import { Blockchain } from '../api/definitions/blockchain';
import { Fiat } from '../api/definitions/fiat';
import { useFiat } from '../api/hooks/fiat.hook';
import { Navigation } from '../components/navigation';
import { NavigationBack } from '../components/navigation-back';
import { useLanguageContext } from '../contexts/language.context';
import { AssetIconVariant } from '../stories/DfxAssetIcon';
import Form from '../stories/form/Form';
import StyledDropdown from '../stories/form/StyledDropdown';
import StyledButton, { StyledButtonWidths } from '../stories/StyledButton';
import { Utils } from '../utils';
import Validations from '../validations';

interface FormData {
  currency: Fiat;
  asset: Asset;
}

export function BuyScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const navigate = useNavigate();
  const { currencies } = useBuyContext();
  const { assets } = useAssetContext();
  const { toDescription } = useFiat();
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<FormData>();

  useEffect(() => {
    if (assets) {
      const blockchainAssets = assets.get(Blockchain.BITCOIN);
      blockchainAssets?.length === 1 && setValue('asset', blockchainAssets[0]);
    }
  }, [assets]);

  function onSubmit(_data: FormData) {
    // TODO (Krysh): fix broken form validation and onSubmit
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
    <>
      <Navigation />
      <NavigationBack title={translate('screens/buy', 'Buy')} />
      <div className="flex flex-col w-full items-center text-center px-8 mt-6 gap-8">
        <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
          {currencies && assets && (
            <>
              <StyledDropdown<Fiat>
                name="currency"
                label={translate('screens/buy', 'Your Currency')}
                placeholder={translate('screens/buy', 'Please select...')}
                items={currencies}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => toDescription(item)}
                full
              />

              <StyledDropdown<Asset>
                name="asset"
                label={translate('screens/buy', 'I want to buy')}
                placeholder={translate('screens/buy', 'Please select...')}
                items={assets.get(Blockchain.BITCOIN) ?? []}
                labelFunc={(item) => item.name}
                assetIconFunc={(item) => item.name as AssetIconVariant}
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
        </Form>
      </div>
    </>
  );
}
