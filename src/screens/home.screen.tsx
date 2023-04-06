import { useSessionContext } from '../api/contexts/session.context';
import { Layout } from '../components/layout';
import { ServiceButton, ServiceButtonType } from '../components/service-button';
import { useLanguageContext } from '../contexts/language.context';

export function HomeScreen(): JSX.Element {
  const { isLoggedIn } = useSessionContext();
  const { translate } = useLanguageContext();

  return (
    <Layout>
      <h2 className="text-dfxBlue-800">{translate('screens/home', 'DFX services')}</h2>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Buy and Sell cryptocurrencies with bank transfers.')}
      </p>
      {isLoggedIn ? (
        <div className="flex flex-col gap-8 py-8">
          <ServiceButton type={ServiceButtonType.BUY} url="/buy" />
          {/* <ServiceButton type={ServiceButtonType.SELL} url="/sell" />
          <ServiceButton type={ServiceButtonType.CONVERT} url="/convert" /> */}
        </div>
      ) : (
        <p className="text-dfxGray-700 py-8">
          {translate('screens/home', 'Please login via an application to use our services')}
        </p>
      )}
    </Layout>
  );
}
