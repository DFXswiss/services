import { Fiat, useFiatContext, Utils, Validations } from '@dfx.swiss/react';
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
import copy from 'copy-to-clipboard';
import { addYears, format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { QrBasic } from 'src/components/payment/qr-code';
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

  const [callback, setCallback] = useState<string>();

  const {
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  const data = watch();

  useEffect(() => {
    const baseUrl = '/pl';

    const nextYearDate = addYears(new Date(), 1);
    const formattedDate = format(nextYearDate, 'yyyy-MM-dd');
    const recipientIsNumber = !isNaN(Number(data.recipient));

    const callback = url(
      baseUrl,
      new URLSearchParams({
        [recipientIsNumber ? 'routeId' : 'route']: data.recipient,
        amount: data.amount?.toString(),
        currency: data.currency?.name,
        message: data.invoiceId,
        expiryDate: formattedDate,
      }),
    );

    setCallback(callback);
  }, [data]);

  const rules = Utils.createRules({
    recipient: Validations.Required,
    invoiceId: Validations.Required,
    amount: Validations.Required,
    currency: Validations.Required,
  });

  return (
    <Layout title={translate('screens/payment', 'Create Invoice')}>
      <StyledVerticalStack gap={6} full center>
        <div className="flex flex-col gap-2 w-48 my-3">
          <QrBasic data={`${process.env.PUBLIC_URL}${callback}`} />
          {isValid && callback && (
            <StyledButton
              label={translate('general/actions', 'Copy Link')}
              onClick={() => callback && copy(`${process.env.PUBLIC_URL}${callback}`)}
              color={StyledButtonColor.STURDY_WHITE}
              width={StyledButtonWidth.FULL}
            />
          )}
        </div>
        <Form control={control} rules={rules} errors={errors} translate={translateError}>
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
            <StyledVerticalStack gap={2} full>
              <StyledHorizontalStack gap={1}>
                <div className="flex-[3_1_9rem]">
                  <p className="text-dfxBlue-800 text-start text-sm font-semibold pl-3 pb-1">
                    {translate('screens/payment', 'Amount')}
                  </p>
                  <StyledInput
                    type="number"
                    name="amount"
                    autocomplete="amount"
                    placeholder={translate('screens/payment', 'Amount')}
                    full
                    smallLabel
                  />
                </div>
                <div className="flex-[1_0_9rem]">
                  <p className="text-dfxBlue-800 text-start text-sm font-semibold pl-3 pb-1">
                    {translate('screens/settings', 'Currency')}
                  </p>
                  <StyledDropdown
                    name="currency"
                    full
                    smallLabel={true}
                    placeholder={translate('general/actions', 'Select...')}
                    items={currencies ?? []}
                    labelFunc={(item) => item.name}
                  />
                </div>
              </StyledHorizontalStack>
            </StyledVerticalStack>
            <StyledButton
              label={translate('general/actions', 'Open invoice')}
              onClick={() => callback && navigate(callback)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid || !callback}
            />
          </StyledVerticalStack>
        </Form>
      </StyledVerticalStack>
    </Layout>
  );
}
