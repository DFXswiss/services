import { BankAccount, Fiat, useBankAccountContext, useFiatContext, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import ActionableList from 'src/components/actionable-list';
import { ErrorHint } from 'src/components/error-hint';
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
  const { bankAccounts, updateAccount, isAccountLoading } = useBankAccountContext();

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
          {isAccountLoading ? (
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
                    subLabel: blankedAddress(Utils.formatIban(account.iban)!, { width }),
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
          <AddBankAccount
            onSubmit={(bankAccount) => goBack({ state: { newIban: bankAccount.iban } })}
            confirmationText={translate(
              'screens/iban',
              isMissingTxIssue.current
                ? 'The bank account has been added, all transactions from this IBAN will now be associated with your account. Please check the transaction overview to see if your missing transaction is now visible.'
                : 'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
            )}
          />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface FormData {
  label: string;
  preferredCurrency: Fiat;
}

interface EditBankAccountProps {
  bankAccount: BankAccount;
  onClose: () => void;
}

export function EditBankAccount({ bankAccount, onClose }: EditBankAccountProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { updateAccount } = useBankAccountContext();
  const { currencies } = useFiatContext();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    watch,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      label: bankAccount.label,
      preferredCurrency: bankAccount.preferredCurrency,
    },
  });

  const data = watch();

  function onSubmit() {
    setIsUpdating(true);
    setError(undefined);

    const changedAccount = {
      label: data.label,
      preferredCurrency: data.preferredCurrency,
    };

    updateAccount(bankAccount.id, changedAccount)
      .then(() => onClose())
      .catch((e) => setError(e.message))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    label: [Validations.Custom((value) => bankAccount.label || value.length > 0 || 'Label is required')],
  });

  return (
    <StyledVerticalStack gap={6} full>
      <Form control={control} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
        <StyledVerticalStack gap={6} full>
          <StyledInput
            name="label"
            autocomplete="label"
            label={translate('screens/settings', 'Label')}
            placeholder={translate('screens/settings', 'Label')}
            full
            smallLabel
          />
          <StyledDropdown<Fiat>
            name="preferredCurrency"
            label={translate('screens/settings', 'Currency')}
            smallLabel={true}
            placeholder={translate('general/actions', 'Select') + '...'}
            items={currencies ?? []}
            labelFunc={(item) => item?.name}
          />
          <StyledHorizontalStack gap={6} spanAcross>
            <StyledButton
              color={StyledButtonColor.STURDY_WHITE}
              width={StyledButtonWidth.FULL}
              label={translate('general/actions', 'Cancel')}
              onClick={onClose}
            />
            <StyledButton
              type="submit"
              label={translate('general/actions', 'Save')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={data.label === bankAccount.label && data.preferredCurrency === bankAccount.preferredCurrency}
              isLoading={isUpdating}
            />
          </StyledHorizontalStack>
        </StyledVerticalStack>
      </Form>

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}
