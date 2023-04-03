import { Layout } from '../components/layout';
import { ServiceButton, ServiceButtonType } from '../components/service-button';
import { useLanguageContext } from '../contexts/language.context';
import { useSessionHelper } from '../hooks/session-helper.hook';
import { useEffect } from 'react';

export function HomeScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const { updateIfAvailable } = useSessionHelper();

  useEffect(() => {
    updateIfAvailable();
  }, [updateIfAvailable]);

  return (
    <Layout>
      <h2 className="text-dfxBlue-800">{translate('screens/main', 'DFX services')}</h2>
      <p className="text-dfxGray-700">
        {translate('screens/main', 'Buy and Sell cryptocurrencies with bank transfers.')}
      </p>
      <div className="flex flex-col gap-8 py-8">
        <ServiceButton type={ServiceButtonType.BUY} />
        <ServiceButton type={ServiceButtonType.SELL} />
        <ServiceButton type={ServiceButtonType.CONVERT} />
      </div>
    </Layout>
  );
}
