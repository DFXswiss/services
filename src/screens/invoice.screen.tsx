import { Fiat, useFiatContext, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useForm } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { url } from 'src/util/utils';

interface FormData {
  recipient: string;
  invoiceId: string;
  amount: number;
  currency: Fiat;
}

export default function InvoiceScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { navigate } = useNavigation();
  const { currencies } = useFiatContext();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  async function onSubmit(data: FormData) {
    const baseUrl = '/pl';

    const nowPlusOneYear = new Date();
    nowPlusOneYear.setFullYear(nowPlusOneYear.getFullYear() + 1);
    const formattedDate = new Intl.DateTimeFormat('de-DE').format(nowPlusOneYear);
    const invoiceIdIsNumber = !isNaN(Number(data.invoiceId));

    const callback = url(
      baseUrl,
      new URLSearchParams({
        [invoiceIdIsNumber ? 'routeId' : 'route']: data.invoiceId,
        amount: data.amount.toString(),
        currency: data.currency.name,
        message: data.recipient,
        date: formattedDate,
      }),
    );

    navigate(callback);
  }

  const rules = Utils.createRules({
    recipient: Validations.Required,
    invoiceId: Validations.Required,
    amount: Validations.Required,
    currency: Validations.Required,
  });

  return (
    <Layout title={translate('screens/payment', 'Create Invoice')}>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          <StyledInput
            name="recipient"
            autocomplete="recipient"
            label={translate('screens/payment', 'Recipient')}
            placeholder={translate('screens/kyc', 'John Doe')}
            full
            smallLabel
          />
          <StyledInput
            name="invoiceId"
            autocomplete="invoiceId"
            label={translate('screens/payment', 'Invoice ID')}
            placeholder={translate('screens/payment', 'Invoice ID')}
            full
            smallLabel
          />
          <StyledInput
            name="amount"
            autocomplete="amount"
            label={translate('screens/payment', 'Amount')}
            placeholder={translate('screens/payment', 'Amount')}
            full
            smallLabel
          />
          <StyledDropdown
            name="currency"
            label={translate('screens/settings', 'Currency')}
            full
            smallLabel={true}
            placeholder={translate('general/actions', 'Select...')}
            items={currencies ?? []}
            labelFunc={(item) => item.name}
          />
          <StyledButton
            type="submit"
            label={translate('general/actions', 'Create')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
