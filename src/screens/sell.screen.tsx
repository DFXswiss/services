import { Layout } from '../components/layout';
import { useLanguageContext } from '../contexts/language.context';

export function SellScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  // TODO: (Krysh) add handling for sell screen to replace to profile is user.kycDataIsComplete is false
  return <Layout backTitle={translate('screens/sell', 'Sell')}></Layout>;
}
