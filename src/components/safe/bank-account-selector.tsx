import { useBankAccount, useBankAccountContext, Utils, Validations } from '@dfx.swiss/react';
import { StyledModalButton, StyledVerticalStack } from '@dfx.swiss/react-components';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { blankedAddress } from 'src/util/utils';
import ActionableList from '../actionable-list';

interface BankAccountSelectorProps {
  name: string;
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({ name }) => {
  const { translate } = useSettingsContext();
  const { allowedCountries } = useSettingsContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { bankAccount } = useAppParams();
  const { width } = useWindowContext();
  const { control, setValue } = useFormContext();

  const [bankAccountSelection, setBankAccountSelection] = React.useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (bankAccounts) {
      const account = getAccount(bankAccounts, bankAccount) ?? bankAccounts.find((a) => a.default);
      if (account) {
        setValue('bankAccount', account);
      } else if (
        bankAccount &&
        !isCreatingAccount &&
        Validations.Iban(allowedCountries).validate(bankAccount) === true
      ) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccount })
          .then((b) => setValue('bankAccount', b))
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [bankAccount, getAccount, bankAccounts, allowedCountries]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <>
          <StyledModalButton
            onClick={() => setBankAccountSelection(true)}
            onBlur={onBlur}
            placeholder={translate('screens/sell', 'Add or select your IBAN')}
            value={Utils.formatIban(value?.iban) ?? undefined}
            description={value?.label}
          />

          {bankAccountSelection && (
            <StyledVerticalStack gap={6} center className="absolute h-full w-full z-10 top-8 bg-white">
              <ActionableList
                items={bankAccounts?.map((account) => {
                  return {
                    key: account.id,
                    label: account.label ?? `${account.iban.slice(0, 2)} ${account.iban.slice(-4)}`,
                    subLabel: blankedAddress(Utils.formatIban(account.iban) ?? account.iban, { width }),
                    tag: account.default ? translate('screens/settings', 'Default').toUpperCase() : undefined,
                    onClick: () => {
                      onChange(account);
                      setBankAccountSelection(false);
                    },
                  };
                })}
              />

              <AddBankAccount
                onSubmit={(account) => {
                  onChange(account);
                  setBankAccountSelection(false);
                }}
              />
            </StyledVerticalStack>
          )}
        </>
      )}
    />
  );
};
