import { BankAccount, useBankAccountContext, Utils } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ActionableList from 'src/components/actionable-list';
import { EditBankAccount } from 'src/components/overlay/edit-bank-overlay';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress } from 'src/util/utils';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export default function BankAccountsScreen(): JSX.Element {
  useUserGuard('/login');

  const { state } = useLocation();
  const { goBack } = useNavigation();
  const { width } = useWindowContext();
  const { translate } = useSettingsContext();
  const { bankAccounts, updateAccount, isLoading } = useBankAccountContext();

  const isMissingTxIssue = useRef<boolean>(state?.isMissingTxIssue);
  const [editAccount, setEditAccount] = useState<BankAccount>();

  useEffect(() => {
    isMissingTxIssue.current = state?.isMissingTxIssue;
  }, []);

  return (
    <Layout title={translate('screens/iban', 'Bank Accounts')}>
      {editAccount ? (
        <EditBankAccount bankAccount={editAccount} onClose={() => setEditAccount(undefined)} />
      ) : (
        <StyledVerticalStack full gap={6} center>
          {isLoading ? (
            <div className="mt-4">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            bankAccounts && (
              <ActionableList
                items={bankAccounts.map((account) => {
                  return {
                    key: account.id,
                    label: account.label ?? `${account.iban.slice(0, 2)} ${account.iban.slice(-4)}`,
                    subLabel: blankedAddress(Utils.formatIban(account.iban) ?? account.iban, { width }),
                    tag: account.default ? translate('screens/settings', 'Default').toUpperCase() : undefined,
                    menuItems: [
                      {
                        label: translate('general/actions', 'Copy'),
                        onClick: () => copy(account.iban),
                        closeOnClick: true,
                      },
                      {
                        label: translate('general/actions', 'Edit'),
                        onClick: () => setEditAccount(account),
                      },
                      {
                        label: translate('general/actions', 'Delete'),
                        onClick: () => updateAccount(account.id, { active: false }),
                        closeOnClick: true,
                      },
                    ].concat(
                      !account.default
                        ? {
                            label: translate('general/actions', 'Set default'),
                            onClick: () => updateAccount(account.id, { default: true }),
                            closeOnClick: true,
                          }
                        : [],
                    ),
                  };
                })}
              />
            )
          )}
          {!isLoading && (
            <AddBankAccount
              onSubmit={(bankAccount) => goBack({ state: { newIban: bankAccount.iban } })}
              confirmationText={translate(
                'screens/iban',
                isMissingTxIssue.current
                  ? 'The bank account has been added, all transactions from this IBAN will now be associated with your account. Please check the transaction overview to see if your missing transaction is now visible.'
                  : 'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
              )}
            />
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
