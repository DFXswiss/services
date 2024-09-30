import { ApiError, Fiat, useFiatContext, Utils, Validations } from '@dfx.swiss/react';
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
import { addYears } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { QrBasic } from 'src/components/payment/qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';
import useDebounce from 'src/hooks/debounce.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { fetchJson, url } from 'src/util/utils';

interface FormData {
  recipient: string;
  invoiceId: string;
  amount: number;
  currency: Fiat;
}

const baseUrl = `${process.env.REACT_APP_API_URL}/v1/paymentLink/payment`;
const relativeBaseUrl = '/pl';

export default function InvoiceScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { navigate } = useNavigation();
  const { currencies } = useFiatContext();

  const [urlParams, setUrlParams] = useSearchParams();
  const [validatedParams, setValidatedParams] = useState<URLSearchParams>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [callback, setCallback] = useState<string>();
  const [error, setError] = useState<string>();

  const {
    watch,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  const data = useDebounce(watch(), 500);

  const nextYearDate = useMemo(() => addYears(new Date(), 1), []);
  const formattedDate = useMemo(() => nextYearDate.toISOString(), [nextYearDate]);

  useEffect(() => {
    const recipient = urlParams.get('recipient');
    if (recipient) setValue('recipient', recipient);
    setUrlParams(new URLSearchParams());
  }, []);

  useEffect(() => {
    data && validateParams(data);
  }, [data?.recipient, data?.invoiceId, data?.amount, data?.currency]);

  useEffect(() => {
    validatedParams && setCallback(url(relativeBaseUrl, validatedParams));
  }, [validatedParams]);

  async function validateParams(data: FormData) {
    setIsLoading(true);
    setError(undefined);
    setCallback(undefined);
    setValidatedParams(undefined);

    if (!data.recipient || !data.invoiceId || !data.amount || !data.currency) {
      setIsLoading(false);
      return;
    }

    const searchParams = new URLSearchParams({
      [!isNaN(Number(data.recipient)) ? 'routeId' : 'route']: data.recipient,
      amount: data.amount?.toString(),
      currency: data.currency?.name,
      message: data.invoiceId,
      expiryDate: formattedDate,
    });

    fetchJson(url(baseUrl, searchParams))
      .then(({ error, message }) => {
        if (error) {
          setError(message ?? 'Unknown Error');
        } else {
          setValidatedParams(searchParams);
        }
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown Error'))
      .finally(() => setIsLoading(false));
  }

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
          <QrBasic data={`${process.env.PUBLIC_URL}${callback}`} isLoading={!callback} />
          <StyledButton
            label={translate('general/actions', 'Copy Link')}
            onClick={() => callback && copy(`${process.env.PUBLIC_URL}${callback}`)}
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            disabled={!callback}
          />
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
              isLoading={isLoading}
            />

            {error && (
              <div>
                <ErrorHint message={error} />
              </div>
            )}
          </StyledVerticalStack>
        </Form>
      </StyledVerticalStack>
    </Layout>
  );
}
