import { ApiError, Sell, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { addYears } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
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
}

const baseUrl = `${process.env.REACT_APP_API_URL}/v1/paymentLink/payment`;
const relativeBaseUrl = '/pl';

export default function InvoiceScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { navigate } = useNavigation();
  const { call } = useApi();

  const recipientInputRef = useRef<HTMLInputElement>(null);

  const [urlParams, setUrlParams] = useSearchParams();
  const [currency, setCurrency] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [callback, setCallback] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const {
    watch,
    control,
    setValue,
    resetField,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  const data = useDebounce(watch(), 1000);
  const selectedRecipient = watch('recipient');

  const formattedDate = useMemo(() => addYears(new Date(), 1).toISOString(), []);

  useEffect(() => {
    const recipient = urlParams.get('recipient');
    if (recipient) setValue('recipient', recipient);
    setUrlParams(new URLSearchParams());
    setTimeout(() => recipientInputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    setError(undefined);
    setCallback(undefined);
    setCurrency(undefined);
    resetField('invoiceId');
    resetField('amount');
  }, [selectedRecipient]);

  useEffect(() => {
    if (data?.recipient) {
      setIsLoadingRoute(true);
      call<Sell>({
        url: `paymentLink/recipient?id=${data.recipient}`,
        method: 'GET',
      })
        .then(({ currency }) => setCurrency(currency.name))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown Error'))
        .finally(() => setIsLoadingRoute(false));
    }
  }, [data?.recipient]);

  useEffect(() => {
    if (data?.recipient && data.invoiceId && data.amount) {
      validateParams(data);
    }
  }, [data?.recipient, data?.invoiceId, data?.amount]);

  async function validateParams(data: FormData) {
    setIsLoading(true);
    setError(undefined);
    setCallback(undefined);

    const searchParams = new URLSearchParams({
      [!isNaN(Number(data.recipient)) ? 'routeId' : 'route']: data.recipient,
      amount: data.amount?.toString(),
      message: data.invoiceId,
      expiryDate: formattedDate,
    });

    fetchJson(url(baseUrl, searchParams))
      .then((response) => {
        if (response.error) {
          setError(response.message ?? 'Unknown Error');
        } else {
          setCallback(url(relativeBaseUrl, searchParams));
        }
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown Error'))
      .finally(() => setIsLoading(false));
  }

  const rules = Utils.createRules({
    recipient: Validations.Required,
    invoiceId: Validations.Required,
    amount: Validations.Required,
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
              autocomplete="name"
              label={translate('screens/payment', 'Recipient')}
              placeholder={translate('screens/kyc', 'John Doe')}
              full
              smallLabel
              forceError={!!error}
              loading={isLoadingRoute}
              ref={recipientInputRef}
            />
            <StyledInput
              name="invoiceId"
              autocomplete="invoice-id"
              label={translate('screens/payment', 'Invoice ID')}
              placeholder={translate('screens/payment', 'Invoice ID')}
              full
              smallLabel
              disabled={!currency}
            />
            <StyledInput
              type="number"
              name="amount"
              label={translate('screens/payment', 'Amount')}
              placeholder={translate('screens/payment', 'Amount')}
              full
              smallLabel
              prefix={currency}
              disabled={!currency}
            />
            <StyledButton
              label={translate('general/actions', 'Open invoice')}
              onClick={() => callback && navigate(callback)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid || !callback}
              isLoading={isLoading}
            />
            {error && (
              <div>
                {error.toLowerCase().includes('route not found') ? (
                  <p className="text-dfxGray-800 text-sm">
                    <Trans
                      i18nKey="general/errors.invoice"
                      defaults="DFX does not recognize a recipient with the name <strong>{{recipient}}</strong>. This service can only be used for recipients who have an active account with DFX and are activated for the invoicing service. If you wish to register as a recipient with DFX, please contact support at <link>{{supportLink}}</link>."
                      values={{ recipient: selectedRecipient, supportLink: '' }}
                      components={{
                        strong: <strong />,
                        link: (
                          <StyledLink label={`app.dfx.swiss/support`} url={`${process.env.PUBLIC_URL}/support`} dark />
                        ),
                      }}
                    />
                  </p>
                ) : (
                  <ErrorHint message={error} />
                )}
              </div>
            )}
          </StyledVerticalStack>
        </Form>
      </StyledVerticalStack>
    </Layout>
  );
}
