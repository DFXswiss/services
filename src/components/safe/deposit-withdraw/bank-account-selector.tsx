import { useBankAccount, useBankAccountContext, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  StyledBankAccountListItem,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { StyledModalButton } from './styled-modal-button';

interface BankAccountSelectorProps {
  name: string;
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({ name }) => {
  const { translate } = useSettingsContext();
  const { allowedCountries } = useSettingsContext();
  const { bankAccounts, createAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { bankAccount } = useAppParams();
  const { control, setValue } = useFormContext();

  const [bankAccountSelection, setBankAccountSelection] = React.useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (bankAccount && bankAccounts) {
      const account = getAccount(bankAccounts, bankAccount);
      if (account) {
        setValue(name, account);
      } else if (!isCreatingAccount && Validations.Iban(allowedCountries).validate(bankAccount) === true) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccount })
          .then((b) => setValue(name, b))
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [bankAccount, getAccount, bankAccounts, allowedCountries, isCreatingAccount, setIsCreatingAccount, createAccount]);

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
            <div className="absolute h-full w-full z-10 top-0 left-0 bg-white p-4">
              <div className="flex flex-row items-center mb-4">
                <button className="p-2 mr-2" onClick={() => setBankAccountSelection(false)}>
                  <DfxIcon icon={IconVariant.ARROW_LEFT} size={IconSize.MD} color={IconColor.BLACK} />
                </button>
                <h2 className="text-lg font-medium">{translate('screens/sell', 'Select payment account')}</h2>
              </div>

              {bankAccounts?.length && (
                <>
                  <StyledVerticalStack gap={4}>
                    {bankAccounts.map((account, i) => (
                      <button
                        key={i}
                        className="text-start"
                        onClick={() => {
                          onChange(account);
                          setBankAccountSelection(false);
                        }}
                      >
                        <StyledBankAccountListItem bankAccount={account} />
                      </button>
                    ))}
                  </StyledVerticalStack>

                  <div className={`h-[1px] bg-dfxGray-400 w-full my-6`} />
                </>
              )}

              <AddBankAccount
                onSubmit={(account) => {
                  onChange(account);
                  setBankAccountSelection(false);
                }}
              />
            </div>
          )}
        </>
      )}
    />
  );
};
