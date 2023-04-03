import { Layout } from '../components/layout';
import { useLanguageContext } from '../contexts/language.context';

export function Home(): JSX.Element {
  const { translate } = useLanguageContext();
  return (
    <Layout>
      <h2 className="text-dfxBlue-800">{translate('screens/main', 'DFX services')}</h2>
      <p className="text-dfxGray-700">
        {translate('screens/main', 'Buy and Sell cryptocurrencies with bank transfers.')}
      </p>
    </Layout>
  );
}
