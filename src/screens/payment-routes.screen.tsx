import {
  ApiError,
  Blockchain,
  CreatePaymentLink,
  CreatePaymentLinkPayment,
  Fiat,
  PaymentLinkPaymentMode,
  PaymentLinkPaymentStatus,
  PaymentLinkStatus,
  SellRoute,
  useFiatContext,
  usePaymentRoutesContext,
  useUserContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCollapsible,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledDropdown,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { ControlProps } from '@dfx.swiss/react-components/dist/stories/form/Form';
import copy from 'copy-to-clipboard';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { QrBasic } from 'src/components/payment/qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useUserGuard } from 'src/hooks/guard.hook';
import { Lnurl } from 'src/util/lnurl';
import { blankedAddress } from 'src/util/utils';
import { ErrorHint } from '../components/error-hint';

interface FormData {
  routeId: RouteIdSelectData;
  externalId: string;
  paymentType: RouteType;
  paymentMode: PaymentLinkPaymentMode;
  paymentAmount: string;
  paymentExternalId: string;
  paymentCurrency: Fiat;
  paymentExpiryDate: Date;
}

interface RouteIdSelectData {
  id: string;
  description: string;
}

export default function PaymentRoutes(): JSX.Element {
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();
  const { user } = useUserContext();
  const {
    paymentRoutes,
    paymentLinks,
    paymentRoutesLoading,
    paymentLinksLoading,
    updatePaymentLink,
    cancelPaymentLinkPayment,
    error,
  } = usePaymentRoutesContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const paymentLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [showCreatePaymentLinkOverlay, setShowCreatePaymentLinkOverlay] = useState(false);
  const [showCreatePaymentOverlay, setShowCreatePaymentOverlay] = useState<string>();
  const [isUpdatingPaymentLink, setIsUpdatingPaymentLink] = useState<string[]>([]);
  const [expandedRef, setExpandedRef] = useState<string>();

  useUserGuard('/login');

  async function togglePaymentLinkStatus(id: string, status: PaymentLinkStatus) {
    setIsUpdatingPaymentLink((prev) => [...prev, id]);
    updatePaymentLink({ status }, +id).finally(() => {
      setIsUpdatingPaymentLink((prev) => prev.filter((i) => i !== id));
    });
  }

  async function cancelPayment(id: string) {
    setIsUpdatingPaymentLink((prev) => [...prev, id]);
    cancelPaymentLinkPayment(+id).finally(() => {
      setIsUpdatingPaymentLink((prev) => prev.filter((i) => i !== id));
    });
  }

  function onDone(id?: string) {
    setShowCreatePaymentLinkOverlay(false);
    setShowCreatePaymentOverlay(undefined);

    if (id) {
      setTimeout(() => paymentLinkRefs.current[id]?.scrollIntoView());
      setExpandedRef(id);
    }
  }

  function formatURL(url: string): string {
    return url.split('dfx.swiss')[1];
  }

  const hasRoutes =
    paymentRoutes && Boolean(paymentRoutes?.buy.length || paymentRoutes?.sell.length || paymentRoutes?.swap.length);

  const title = showCreatePaymentLinkOverlay
    ? 'Create Payment Link'
    : showCreatePaymentOverlay
    ? 'Create payment'
    : 'Payment routes';

  return (
    <Layout
      title={translate('screens/payment', title)}
      onBack={
        showCreatePaymentLinkOverlay
          ? () => setShowCreatePaymentLinkOverlay(false)
          : showCreatePaymentOverlay !== undefined
          ? () => setShowCreatePaymentOverlay(undefined)
          : undefined
      }
      textStart
      rootRef={rootRef}
    >
      {error ? (
        <ErrorHint message={error} />
      ) : showCreatePaymentLinkOverlay ? (
        <CreatePaymentLinkOverlay onDone={onDone} />
      ) : showCreatePaymentOverlay !== undefined ? (
        <CreatePaymentOverlay id={showCreatePaymentOverlay} onDone={onDone} />
      ) : paymentRoutesLoading || (paymentLinksLoading && !isUpdatingPaymentLink.length) ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : hasRoutes === false ? (
        <p className="text-dfxGray-700">{translate('screens/payment', 'You have no payment routes yet')}</p>
      ) : (
        <StyledVerticalStack full gap={5}>
          {paymentRoutes?.buy.length ? (
            <StyledDataTable label={translate('screens/payment', 'Buy')}>
              {paymentRoutes?.buy.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  key={route.id}
                  label={`${route.asset.blockchain} / ${route.asset.name}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                    {
                      label: translate('screens/payment', 'Purpose of payment'),
                      text: route.bankUsage,
                      icon: IconVariant.COPY,
                      onClick: () => copy(route.bankUsage),
                    },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  {route.bankUsage}
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          ) : (
            <></>
          )}
          {paymentRoutes?.sell.length ? (
            <StyledDataTable label={translate('screens/payment', 'Sell')}>
              {paymentRoutes?.sell.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  key={route.id}
                  label={`${route.currency.name} / ${route.iban}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'ID'), text: route.id.toString() },
                    { label: translate('screens/payment', 'Currency'), text: route.currency.name },
                    { label: translate('screens/payment', 'IBAN'), text: route.iban },
                    {
                      label: translate('screens/payment', 'Deposit address'),
                      text: blankedAddress(route.deposit.address, { width }),
                    },
                    {
                      label: translate('screens/payment', 'Deposit blockchains'),
                      text: route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', '),
                    },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  <p className="text-right overflow-ellipsis">
                    {route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', ')}
                  </p>
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          ) : (
            <></>
          )}
          {paymentRoutes?.swap.length ? (
            <StyledDataTable label={translate('screens/payment', 'Swap')}>
              {paymentRoutes?.swap.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
                  key={route.id}
                  label={`${route.asset.blockchain} / ${route.asset.name}`}
                  expansionItems={[
                    { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                    { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                    {
                      label: translate('screens/payment', 'Deposit address'),
                      text: blankedAddress(route.deposit.address, { width }),
                    },
                    {
                      label: translate('screens/payment', 'Deposit blockchains'),
                      text: route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', '),
                    },
                    {
                      label: translate('screens/home', 'Volume'),
                      text: `${route.volume} CHF`,
                    },
                    {
                      label: translate('screens/payment', 'Annual volume'),
                      text: `${route.annualVolume} CHF`,
                    },
                  ]}
                >
                  <p className="text-right overflow-ellipsis">
                    {route.deposit.blockchains.map((blockchain: Blockchain) => toString(blockchain)).join(', ')}
                  </p>
                </StyledDataTableExpandableRow>
              ))}
            </StyledDataTable>
          ) : (
            <></>
          )}
          {paymentLinks?.length ? (
            <StyledVerticalStack gap={2} full>
              <h2 className="ml-3.5 mb-1.5 text-dfxGray-700">{translate('screens/payment', 'Payment Links')}</h2>
              {paymentLinks.map((link) => {
                return (
                  <div key={link.id} ref={(el) => paymentLinkRefs.current && (paymentLinkRefs.current[link.id] = el)}>
                    <StyledCollapsible
                      full
                      isExpanded={expandedRef ? expandedRef === link.id : undefined}
                      titleContent={
                        <div className="flex flex-row justify-between gap-2 items-center">
                          <div className="flex flex-col items-start text-left">
                            <div className="font-bold leading-none">
                              {link.externalId ?? `${translate('screens/payment', 'Payment Link')} ${link.id}`}
                            </div>
                            <div className="leading-none mt-1 text-dfxGray-700">
                              {`${translate('screens/payment', 'Payment route')} ${link.routeId}`}
                            </div>
                          </div>
                          <div>{translate('screens/payment', link.status)}</div>
                        </div>
                      }
                    >
                      <StyledVerticalStack full gap={4}>
                        <div className="flex w-full items-center justify-center">
                          <div className="w-48 py-3">
                            <QrBasic data={Lnurl.prependLnurl(link.lnurl)} />
                          </div>
                        </div>
                        <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                          <StyledDataTableRow label={translate('screens/payment', 'ID')}>
                            <p>{link.id}</p>
                          </StyledDataTableRow>
                          {link.externalId && (
                            <StyledDataTableRow label={translate('screens/payment', 'External ID')}>
                              <p>{link.externalId}</p>
                            </StyledDataTableRow>
                          )}
                          <StyledDataTableRow label={translate('screens/payment', 'Payment route')}>
                            <p>{link.routeId}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'State')}>
                            <p>{translate('screens/payment', link.status)}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'Link')}>
                            <p>{blankedAddress(Lnurl.prependLnurl(link.lnurl), { width })}</p>
                            <CopyButton onCopy={() => copy(Lnurl.prependLnurl(link.lnurl))} />
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'LNURL')}>
                            <p>{blankedAddress(link.lnurl, { width })}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'URL')}>
                            <StyledLink label={formatURL(link.url)} url={link.url} dark />
                          </StyledDataTableRow>
                          {link.payment != null && (
                            <StyledDataTableExpandableRow
                              label={translate('screens/payment', 'Payment')}
                              isExpanded={expandedRef ? expandedRef === link.id : undefined}
                              expansionItems={[
                                {
                                  label: translate('screens/payment', 'ID'),
                                  text: link.payment.id.toString(),
                                },
                                {
                                  label: translate('screens/payment', 'External ID'),
                                  text: (link.payment.externalId ?? '-').toString(),
                                },
                                {
                                  label: translate('screens/payment', 'Mode'),
                                  text: translate('screens/payment', link.payment.mode),
                                },
                                {
                                  label: translate('screens/payment', 'Amount'),
                                  text: `${link.payment.amount.toString()} ${link.payment.currency.name}`,
                                },
                                {
                                  label: translate('screens/payment', 'State'),
                                  text: translate('screens/payment', link.payment.status),
                                },
                                {
                                  label: translate('screens/payment', 'Expiry date'),
                                  text: new Date(link.payment.expiryDate).toLocaleString(),
                                },
                              ]}
                            >
                              <p className="font-semibold">
                                {translate('screens/payment', link.payment.status).toUpperCase()}
                              </p>
                            </StyledDataTableExpandableRow>
                          )}
                        </StyledDataTable>
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          (!link.payment ||
                            [PaymentLinkPaymentStatus.CANCELLED, PaymentLinkPaymentStatus.EXPIRED].includes(
                              link.payment.status,
                            )) && (
                            <StyledButton
                              label={translate('screens/payment', 'Create payment')}
                              onClick={() => setShowCreatePaymentOverlay(link.id)}
                              color={StyledButtonColor.STURDY_WHITE}
                            />
                          )}
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          link.payment?.status === PaymentLinkPaymentStatus.PENDING && (
                            <StyledButton
                              label={translate('screens/payment', 'Cancel payment')}
                              onClick={() => cancelPayment(link.id)}
                              color={StyledButtonColor.STURDY_WHITE}
                              isLoading={isUpdatingPaymentLink.includes(link.id)}
                            />
                          )}
                        {link.payment?.status !== PaymentLinkPaymentStatus.PENDING &&
                          link.status === PaymentLinkStatus.ACTIVE && (
                            <StyledButton
                              label={translate('screens/payment', 'Deactivate')}
                              onClick={() => togglePaymentLinkStatus(link.id, PaymentLinkStatus.INACTIVE)}
                              color={StyledButtonColor.STURDY_WHITE}
                              isLoading={isUpdatingPaymentLink.includes(link.id)}
                            />
                          )}

                        {link.status === PaymentLinkStatus.INACTIVE && (
                          <StyledButton
                            label={translate('screens/payment', 'Activate')}
                            onClick={() => togglePaymentLinkStatus(link.id, PaymentLinkStatus.ACTIVE)}
                            color={StyledButtonColor.STURDY_WHITE}
                            isLoading={isUpdatingPaymentLink.includes(link.id)}
                          />
                        )}
                      </StyledVerticalStack>
                    </StyledCollapsible>
                  </div>
                );
              })}
            </StyledVerticalStack>
          ) : (
            <></>
          )}
          {paymentRoutes?.sell.length && user?.paymentLink.active ? (
            <StyledButton
              label={translate('screens/payment', 'Create Payment Link')}
              width={StyledButtonWidth.FULL}
              onClick={() => setShowCreatePaymentLinkOverlay(true)}
            />
          ) : (
            <></>
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

enum RouteType {
  WITH_PAYMENT = 'With payment',
  WITHOUT_PAYMENT = 'Without payment',
}

interface CreatePaymentLinkOverlayProps {
  onDone: (id?: string) => void;
}

function CreatePaymentLinkOverlay({ onDone }: CreatePaymentLinkOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { createPaymentLink } = usePaymentRoutesContext();
  const { currencies } = useFiatContext();
  const { paymentRoutes } = usePaymentRoutesContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: {
      paymentType: RouteType.WITHOUT_PAYMENT,
    },
  });

  const selectedType = useWatch({ control, name: 'paymentType' });

  useEffect(() => {
    if (paymentRoutes?.sell.length === 1) setValue('routeId', routeToRouteIdSelectData(paymentRoutes.sell[0]));
  }, [paymentRoutes]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreatePaymentLink = {
        routeId: data.routeId ? +data.routeId.id : undefined,
        externalId: data.externalId ? data.externalId : undefined,
      };

      if (data.paymentType === RouteType.WITH_PAYMENT) {
        request.payment = {
          mode: data.paymentMode,
          amount: +data.paymentAmount,
          externalId: data.paymentExternalId,
          currency: data.paymentCurrency,
          expiryDate: data.paymentExpiryDate,
        };
      }

      const paymentLink = await createPaymentLink(request);
      onDone(paymentLink?.id);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function routeToRouteIdSelectData(route: SellRoute): RouteIdSelectData {
    return {
      id: route.id.toString(),
      description: `${route.currency.name} / ${route.iban}`,
    };
  }

  const rules = Utils.createRules({
    paymentMode: Validations.Required,
    paymentAmount: Validations.Required,
    paymentExternalId: Validations.Required,
    paymentCurrency: Validations.Required,
    paymentExpiryDate: Validations.Required,
  });

  const availablePaymentRoutes: RouteIdSelectData[] = paymentRoutes?.sell?.map(routeToRouteIdSelectData) ?? [];

  return (
    <>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          <StyledDropdown<RouteIdSelectData>
            name="routeId"
            label={translate('screens/payment', 'Route ID')}
            placeholder={translate('screens/payment', 'Route ID')}
            items={availablePaymentRoutes}
            labelFunc={(item) => item.id}
            descriptionFunc={(item) => item.description}
            full
            smallLabel
          />

          <StyledInput
            name="externalId"
            autocomplete="externalId"
            label={translate('screens/payment', 'External ID')}
            placeholder={translate('screens/payment', 'External ID')}
            full
            smallLabel
          />

          <StyledDropdown
            name="paymentType"
            label={translate('screens/payment', 'Payment type')}
            full
            smallLabel
            items={Object.values(RouteType)}
            labelFunc={(item) => translate('screens/payment', item)}
          />

          {selectedType === RouteType.WITH_PAYMENT && (
            <>
              <StyledDropdown
                rootRef={rootRef}
                name="paymentMode"
                label={translate('screens/payment', 'Mode')}
                smallLabel
                full
                placeholder={translate('general/actions', 'Select...')}
                items={Object.values(PaymentLinkPaymentMode)}
                labelFunc={(item) => translate('screens/payment', item)}
              />

              <StyledInput
                name="paymentAmount"
                autocomplete="paymentAmount"
                label={translate('screens/payment', 'Amount')}
                smallLabel
                placeholder={'0.00'}
                full
              />

              <StyledInput
                name="paymentExternalId"
                autocomplete="paymentExternalId"
                label={translate('screens/payment', 'Payment ID')}
                placeholder={translate('screens/payment', 'Payment ID')}
                full
                smallLabel
              />

              <StyledDropdown
                name="paymentCurrency"
                label={translate('screens/settings', 'Currency')}
                full
                smallLabel={true}
                placeholder={translate('general/actions', 'Select...')}
                items={currencies ?? []}
                labelFunc={(item) => item.name}
              />

              <DateAndTimePicker
                name="paymentExpiryDate"
                label={translate('screens/payment', 'Expires at')}
                smallLabel
              />
            </>
          )}

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Create')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      </Form>
    </>
  );
}

interface CreatePaymentOverlayProps extends CreatePaymentLinkOverlayProps {
  id: string;
}

function CreatePaymentOverlay({ id, onDone }: CreatePaymentOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { createPaymentLinkPayment } = usePaymentRoutesContext();
  const { currencies } = useFiatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreatePaymentLinkPayment = {
        mode: data.paymentMode,
        amount: +data.paymentAmount,
        externalId: data.paymentExternalId,
        currency: data.paymentCurrency,
        expiryDate: data.paymentExpiryDate,
      };

      await createPaymentLinkPayment(request, +id);
      onDone(id);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  const rules = Utils.createRules({
    paymentMode: Validations.Required,
    paymentAmount: Validations.Required,
    paymentExternalId: Validations.Required,
    paymentCurrency: Validations.Required,
    paymentExpiryDate: Validations.Required,
  });

  return (
    <>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          <StyledDropdown
            rootRef={rootRef}
            name="paymentMode"
            label={translate('screens/payment', 'Mode')}
            smallLabel
            full
            placeholder={translate('general/actions', 'Select...')}
            items={Object.values(PaymentLinkPaymentMode)}
            labelFunc={(item) => translate('screens/payment', item)}
          />

          <StyledInput
            name="paymentAmount"
            autocomplete="paymentAmount"
            label={translate('screens/payment', 'Amount')}
            smallLabel
            placeholder={'0.00'}
            full
          />

          <StyledInput
            name="paymentExternalId"
            autocomplete="paymentExternalId"
            label={translate('screens/payment', 'Payment ID')}
            placeholder={translate('screens/payment', 'Payment ID')}
            full
            smallLabel
          />

          <StyledDropdown
            name="paymentCurrency"
            label={translate('screens/settings', 'Currency')}
            full
            smallLabel={true}
            placeholder={translate('general/actions', 'Select...')}
            items={currencies ?? []}
            labelFunc={(item) => item.name}
          />

          <DateAndTimePicker name="paymentExpiryDate" label={translate('screens/payment', 'Expires at')} smallLabel />

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Create')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      </Form>
    </>
  );
}

interface DateAndTimePickerProps extends ControlProps {
  label?: string;
  hideLabel?: boolean;
  smallLabel?: boolean;
}

interface DateAndTimePickerContentProps extends DateAndTimePickerProps {
  onChange: (date: Date) => void;
  value: Date | null;
}

const DateAndTimePicker = forwardRef<HTMLDivElement, DateAndTimePickerProps>((props: DateAndTimePickerProps, ref) => {
  return (
    <Controller
      control={props.control}
      render={({ field: { onChange, value } }) => <Content {...props} onChange={onChange} value={value} />}
      name={props.name}
      rules={props.rules}
    />
  );
});

const Content = forwardRef<HTMLInputElement, DateAndTimePickerContentProps>(
  (
    {
      control,
      name,
      label,
      rules,
      disabled = false,
      error,
      hideLabel,
      smallLabel,
      onChange,
      value,
      ...props
    }: DateAndTimePickerContentProps,
    ref,
  ) => {
    const [selectedDateTime, setSelectedDateTime] = useState<string>('');

    useEffect(() => {
      const toLocalISOString = (date: Date) => {
        const tzoffset = date.getTimezoneOffset() * 60000; // Offset in milliseconds
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 19); // Remove the 'Z' at the end
      };

      if (value) {
        const localISOTime = toLocalISOString(value);
        setSelectedDateTime(localISOTime);
      } else {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(now.getMinutes() + 1);
        now.setSeconds(0);

        const defaultDateTime = toLocalISOString(now);
        setSelectedDateTime(defaultDateTime);
        onChange(now);
      }
    }, [value, onChange]);

    const handleDateTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const dateTime = event.target.value;
      setSelectedDateTime(dateTime);

      const newDate = new Date(dateTime);
      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    };

    return (
      <>
        <style>
          {`
          input::-webkit-datetime-edit-day-field:focus,
          input::-webkit-datetime-edit-month-field:focus,
          input::-webkit-datetime-edit-year-field:focus {
              background-color: #f5516c;
              color: white;
              outline: none;
          }

          input::-webkit-datetime-edit-hour-field:focus,
          input::-webkit-datetime-edit-minute-field:focus,
          input::-webkit-datetime-edit-second-field:focus {
              background-color: #f5516c;
              color: white;
              outline: none;
          }

          .custom-date-input,
          .custom-time-input {
            color: #2a4365; /* text-dfxBlue-800 color */
          }

          .custom-date-input::placeholder,
          .custom-time-input::placeholder {
            color: #a0aec0; /* text-dfxGray-600 color */
          }
        `}
        </style>
        <div {...props} className="flex flex-col gap-4 w-full">
          <div className="flex flex-row gap-4">
            <div className="flex-1">
              {label && (
                <label
                  hidden={hideLabel}
                  className={`text-start ${smallLabel ? 'text-sm' : 'text-base'} font-semibold pl-3 text-dfxBlue-800`}
                >
                  {label}
                </label>
              )}
              <div className="h-1" />
              <input
                ref={ref}
                type="datetime-local"
                value={selectedDateTime}
                onChange={handleDateTimeChange}
                step="1"
                className="custom-date-input text-base font-normal rounded-md p-4 w-full bg-white border border-dfxGray-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </>
    );
  },
);
