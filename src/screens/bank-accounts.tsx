import { Navigation } from '../components/navigation';
import { useLanguageContext } from '../contexts/language.context';

export function BankAccounts(): JSX.Element {
  const { translate } = useLanguageContext();
  return (
    <>
      <Navigation />
      <div className="flex flex-col items-center text-center px-8 mt-6">
        <h2 className="text-dfxBlue-800">{translate('screens/bank-accounts', 'DFX bank accounts')}</h2>
        <p className="text-dfxGray-700">{translate('screens/bank-accounts', 'Todo list of bank accounts')}</p>
      </div>
    </>
  );
}
