import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export default function BankAccountsScreen(): JSX.Element {
  useUserGuard('/login');

  const { state } = useLocation();
  const { goBack } = useNavigation();
  const { translate } = useSettingsContext();

  const isMissingTxIssue = useRef<boolean>(state?.isMissingTxIssue);

  useEffect(() => {
    isMissingTxIssue.current = state?.isMissingTxIssue;
  }, []);

  return (
    <Layout title={translate('screens/iban', 'Bank Accounts')}>
      <AddBankAccount
        onSubmit={(bankAccount) => goBack({ state: { newIban: bankAccount.iban } })}
        confirmationText={translate(
          'screens/iban',
          isMissingTxIssue.current
            ? 'The bank account has been added, all transactions from this IBAN will now be associated with your account. Please check the transaction overview to see if your missing transaction is now visible.'
            : 'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
        )}
      />
    </Layout>
  );
}
