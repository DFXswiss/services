import { BankAccount, useBankAccount, useBankAccountContext, Utils, Validations } from '@dfx.swiss/react';
import { StyledModalButton, StyledVerticalStack } from '@dfx.swiss/react-components';
import React, { useEffect, useState } from 'react';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { blankedAddress } from 'src/util/utils';
import ActionableList from '../actionable-list';
import { Modal } from '../modal';

interface BankAccountSelectorProps {
  value?: BankAccount;
  onChange: (account: BankAccount) => void;
  placeholder: string;
  isModalOpen: boolean;
  onModalToggle: (isOpen: boolean) => void;
  className?: string;
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({
  value,
  onChange,
  placeholder,
  isModalOpen = false,
  onModalToggle,
  className = '',
}) => {
  const { translate } = useSettingsContext();
  const { allowedCountries } = useSettingsContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { bankAccount } = useAppParams();
  const { width } = useWindowContext();

  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (bankAccounts) {
      const account = getAccount(bankAccounts, bankAccount) ?? bankAccounts.find((a) => a.default);
      if (account && !value) {
        onChange(account);
      } else if (
        bankAccount &&
        !isCreatingAccount &&
        Validations.Iban(allowedCountries).validate(bankAccount) === true
      ) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccount })
          .then((b) => onChange(b))
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [bankAccount, getAccount, bankAccounts, allowedCountries, value, onChange]);

  return (
    <>
      <StyledModalButton
        onClick={() => onModalToggle(true)}
        onBlur={() => undefined}
        placeholder={translate('screens/sell', placeholder)}
        value={Utils.formatIban(value?.iban) ?? undefined}
        description={value?.label}
      />

      <Modal isOpen={isModalOpen} onClose={() => onModalToggle(false)} className={className}>
        <StyledVerticalStack gap={6} center>
          <ActionableList
            items={bankAccounts?.map((account) => {
              return {
                key: account.id,
                label: account.label ?? `${account.iban.slice(0, 2)} ${account.iban.slice(-4)}`,
                subLabel: blankedAddress(Utils.formatIban(account.iban) ?? account.iban, { width }),
                tag: account.default ? translate('screens/settings', 'Default').toUpperCase() : undefined,
                onClick: () => {
                  onChange(account);
                  onModalToggle(false);
                },
              };
            })}
          />

          <AddBankAccount
            onSubmit={(account) => {
              onChange(account);
              onModalToggle(false);
            }}
          />
        </StyledVerticalStack>
      </Modal>
    </>
  );
};
