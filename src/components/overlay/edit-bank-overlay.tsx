import { BankAccount, Fiat, useBankAccountContext, useFiatContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';

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

  const rootRef = useRef<HTMLDivElement>(null);

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
            rootRef={rootRef}
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
