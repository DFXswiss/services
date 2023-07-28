import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';

export function BankAccountsScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  return (
    <Layout>
      <h2 className="text-dfxBlue-800">{translate('screens/bank-accounts', 'DFX bank accounts')}</h2>
      <p className="text-dfxGray-700">{translate('screens/bank-accounts', 'Todo list of bank accounts')}</p>
    </Layout>
  );
}
