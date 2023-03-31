import { useMemo } from 'react';
import { useAssetContext } from '../../api/contexts/asset.context';
import { Navigation } from '../../components/navigation';
import { NavigationBack } from '../../components/navigation-back';
import { useLanguageContext } from '../../contexts/language.context';
import { useQuery } from '../../hooks/query.hook';

export function BuyPaymentScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const { assets, getAsset } = useAssetContext();
  const { assetId, currencyId } = useQuery();

  const asset = useMemo(() => getAsset(Number(assetId)), [assetId, assets, getAsset]);
  //   const currency = useMemo(() => {}, [currencyId]);

  return (
    <>
      <Navigation />
      <NavigationBack title={translate('screens/buy', 'Buy')} />
      <div className="text-black">want to buy {asset?.name}</div>
    </>
  );
}
