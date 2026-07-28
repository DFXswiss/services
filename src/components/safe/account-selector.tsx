import { Form, StyledDropdown } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyAccount } from 'src/dto/safe.dto';

interface AccountSelectorFormData {
  account: CustodyAccount;
}

interface AccountSelectorProps {
  accounts: CustodyAccount[];
  selected: CustodyAccount;
  onSelect: (accountId: number) => void;
}

export function AccountSelector({ accounts, selected, onSelect }: AccountSelectorProps): JSX.Element | null {
  const { translate } = useSettingsContext();
  const {
    control,
    setValue,
    formState: { errors },
  } = useForm<AccountSelectorFormData>({ defaultValues: { account: selected } });
  const selectedValue = useWatch({ control, name: 'account' });

  useEffect(() => {
    setValue('account', selected);
  }, [selected, setValue]);

  useEffect(() => {
    if (selectedValue && selectedValue.id !== selected.id) onSelect(selectedValue.id);
  }, [selectedValue, selected, onSelect]);

  if (accounts.length <= 1) return null;

  return (
    <Form control={control} errors={errors}>
      <StyledDropdown<CustodyAccount>
        name="account"
        label={translate('screens/safe', 'Account')}
        smallLabel
        items={accounts}
        labelFunc={(account) => account.title}
        descriptionFunc={(account) => (account.accessLevel === 'Read' ? translate('screens/safe', 'View only') : '')}
      />
    </Form>
  );
}
