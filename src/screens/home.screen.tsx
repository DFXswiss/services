import { Layout } from '../components/layout';
import { useLanguageContext } from '../contexts/language.context';

export function HomeScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const navigate = useNavigate();
  return (
    <Layout>
      <h2 className="text-dfxBlue-800">{translate('screens/main', 'DFX services')}</h2>
      <p className="text-dfxGray-700">
        {translate('screens/main', 'Buy and Sell cryptocurrencies with bank transfers.')}
      </p>
        <div className="flex flex-col gap-8">
          <button className="text-black" type="button" onClick={() => navigate('/buy')}>
            Buy
          </button>
        </div>
      </div>
    </Layout>
  );
}
