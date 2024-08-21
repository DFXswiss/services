import {
  ApiError,
  Blockchain,
  Country,
  CreatePaymentLink,
  CreatePaymentLinkPayment,
  Fiat,
  PaymentLinkPaymentMode,
  PaymentLinkPaymentStatus,
  PaymentLinkStatus,
  SellRoute,
  useCountry,
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
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  recipientName: string;
  recipientStreet: string;
  recipientHouseNumber: string;
  recipientZip: string;
  recipientCity: string;
  recipientCountry: Country;
  recipientPhone: string;
  recipientEmail: string;
  recipientWebsite: string;
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
  const [createPaymentLinkStep, setCreatePaymentLinkStep] = useState<CreatePaymentLinkStep>(
    CreatePaymentLinkStep.ROUTE,
  );

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

  const title =
    showCreatePaymentLinkOverlay && createPaymentLinkStep !== undefined
      ? `Payment Link: ${translate('screens/payment', createPaymentLinkStepToTitleMap[createPaymentLinkStep])}`
      : showCreatePaymentOverlay
      ? 'Create payment'
      : 'Payment routes';

  return (
    <Layout
      title={translate('screens/payment', title)}
      onBack={
        showCreatePaymentLinkOverlay && createPaymentLinkStep !== undefined
          ? () =>
              createPaymentLinkStep !== CreatePaymentLinkStep.ROUTE
                ? setCreatePaymentLinkStep(createPaymentLinkStep - 1)
                : setShowCreatePaymentLinkOverlay(false)
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
        <CreatePaymentLinkOverlay step={createPaymentLinkStep} setStep={setCreatePaymentLinkStep} onDone={onDone} />
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

enum CreatePaymentLinkStep {
  ROUTE,
  RECIPIENT,
  PAYMENT,
  DONE,
}

interface CreatePaymentLinkOverlayProps {
  step: CreatePaymentLinkStep;
  setStep: (title: CreatePaymentLinkStep) => void;
  onDone: (id?: string) => void;
}

const createPaymentLinkStepToTitleMap = {
  [CreatePaymentLinkStep.ROUTE]: 'Route',
  [CreatePaymentLinkStep.RECIPIENT]: 'Recipient',
  [CreatePaymentLinkStep.PAYMENT]: 'Payment',
  [CreatePaymentLinkStep.DONE]: 'Summary',
};

function CreatePaymentLinkOverlay({ step, setStep, onDone }: CreatePaymentLinkOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { createPaymentLink } = usePaymentRoutesContext();
  const { currencies } = useFiatContext();
  const { getCountries } = useCountry();
  const { paymentRoutes } = usePaymentRoutesContext();

  const [countries, setCountries] = useState<Country[]>([]);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  // const [step, setStep] = useState(CreatePaymentLinkStep.ROUTE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    watch,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  const data = watch();

  useEffect(() => {
    const maxIdRoute = paymentRoutes?.sell.reduce((prev, current) => (prev.id < current.id ? prev : current));
    if (maxIdRoute) setValue('routeId', routeToRouteIdSelectData(maxIdRoute));
  }, [paymentRoutes]);

  useEffect(() => {
    setError(undefined);
  }, [step]);

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCountryLoading(false));
  }, []);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreatePaymentLink = {
        routeId: data.routeId ? +data.routeId.id : undefined,
        externalId: data.externalId ? data.externalId : undefined,
        recipient: {
          name: data.recipientName,
          address: {
            street: data.recipientStreet,
            houseNumber: data.recipientHouseNumber,
            zip: data.recipientZip,
            city: data.recipientCity,
            country: data.recipientCountry?.symbol,
          },
          phone: data.recipientPhone,
          email: data.recipientEmail,
          website: data.recipientWebsite,
        },
      } as CreatePaymentLink;

      if (data.paymentMode) {
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
      setStep(CreatePaymentLinkStep.ROUTE);
      reset();
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

  const naString = translate('screens/payment', 'N/A');
  const hasRecipientData = Boolean(
    data.recipientName ||
      data.recipientStreet ||
      data.recipientHouseNumber ||
      data.recipientZip ||
      data.recipientCity ||
      data.recipientCountry ||
      data.recipientPhone ||
      data.recipientEmail ||
      data.recipientWebsite,
  );

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
          {step === CreatePaymentLinkStep.ROUTE && (
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
            </StyledVerticalStack>
          )}
          {step === CreatePaymentLinkStep.RECIPIENT &&
            (isCountryLoading ? (
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            ) : (
              <StyledVerticalStack gap={2} full>
                <StyledInput
                  name="recipientName"
                  autocomplete="name"
                  label={translate('screens/kyc', 'Name')}
                  placeholder={translate('screens/kyc', 'John Smith')}
                  full
                  smallLabel
                />
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="recipientStreet"
                    autocomplete="street"
                    label={translate('screens/kyc', 'Street')}
                    placeholder={translate('screens/kyc', 'Street')}
                    full
                    smallLabel
                  />
                  <StyledInput
                    name="recipientHouseNumber"
                    autocomplete="house-number"
                    label={translate('screens/kyc', 'House nr.')}
                    placeholder="xx"
                    small
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="recipientZip"
                    autocomplete="zip"
                    label={translate('screens/kyc', 'ZIP code')}
                    placeholder="12345"
                    small
                    smallLabel
                  />
                  <StyledInput
                    name="recipientCity"
                    autocomplete="city"
                    label={translate('screens/kyc', 'City')}
                    placeholder="Berlin"
                    full
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledSearchDropdown
                  rootRef={rootRef}
                  name="recipientCountry"
                  autocomplete="country"
                  label={translate('screens/kyc', 'Country')}
                  placeholder={translate('general/actions', 'Select...')}
                  items={countries}
                  labelFunc={(item) => item.name}
                  filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
                  matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
                  smallLabel
                />
                <StyledInput
                  name="recipientPhone"
                  autocomplete="phone"
                  type="tel"
                  label={translate('screens/kyc', 'Phone number')}
                  placeholder="+49 12345678"
                  smallLabel
                />
                <StyledInput
                  name="recipientEmail"
                  autocomplete="email"
                  type="email"
                  label={translate('screens/kyc', 'Email address')}
                  placeholder={translate('screens/kyc', 'example@mail.com')}
                  smallLabel
                  full
                />
                <StyledInput
                  name="recipientWebsite"
                  autocomplete="website"
                  type="url"
                  label={translate('screens/kyc', 'Website')}
                  placeholder={translate('screens/kyc', 'https://example.com')}
                  smallLabel
                  full
                />
              </StyledVerticalStack>
            ))}
          {step === CreatePaymentLinkStep.PAYMENT && (
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

              <StyledInput
                name="paymentExpiryDate"
                label={translate('screens/payment', 'Date')}
                placeholder={new Date().toISOString().split('T')[0]}
                full
              />
            </>
          )}
          {/** Summary of the submitted data */}
          {step === CreatePaymentLinkStep.DONE && (
            <StyledVerticalStack center full gap={2}>
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableRow label={translate('screens/payment', 'Route ID')}>
                  <DataField value={data.routeId?.id} />
                </StyledDataTableRow>
                <StyledDataTableRow label={translate('screens/payment', 'External ID')}>
                  <p className="text-dfxBlue-600">{data.externalId ?? naString}</p>
                </StyledDataTableRow>
                <StyledDataTableExpandableRow
                  label={translate('screens/payment', 'Recipient')}
                  isExpanded={hasRecipientData}
                  discreet={!hasRecipientData}
                  expansionItems={[
                    { label: translate('screens/support', 'Name'), text: data.recipientName ?? naString },
                    {
                      label: translate('screens/kyc', 'Street address'),
                      text: data.recipientStreet
                        ? `${data.recipientStreet} ${data.recipientHouseNumber ?? ''}`
                        : naString,
                    },
                    { label: translate('screens/kyc', 'ZIP code'), text: data.recipientZip ?? naString },
                    { label: translate('screens/kyc', 'City'), text: data.recipientCity ?? naString },
                    { label: translate('screens/kyc', 'Country'), text: data.recipientCountry?.symbol ?? naString },
                    { label: translate('screens/kyc', 'Phone number'), text: data.recipientPhone ?? naString },
                    { label: translate('screens/kyc', 'Email address'), text: data.recipientEmail ?? naString },
                    { label: translate('screens/payment', 'Website'), text: data.recipientWebsite ?? naString },
                  ]}
                />
                <StyledDataTableExpandableRow
                  label={translate('screens/payment', 'Payment')}
                  isExpanded={data.paymentMode ? true : false}
                  discreet={!data.paymentMode}
                  expansionItems={[
                    { label: translate('screens/payment', 'Mode'), text: data.paymentMode ?? naString },
                    { label: translate('screens/payment', 'External ID'), text: data.paymentExternalId ?? naString },
                    {
                      label: translate('screens/payment', 'Amount'),
                      text: data.paymentAmount ? `${data.paymentAmount} ${data.paymentCurrency?.name}` : naString,
                    },
                    {
                      label: translate('screens/payment', 'Expiry date'),
                      text: data.paymentExpiryDate?.toLocaleString() ?? naString,
                    },
                  ]}
                />
              </StyledDataTable>
            </StyledVerticalStack>
          )}

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          {step === CreatePaymentLinkStep.DONE ? (
            <StyledButton
              type="submit"
              label={translate('general/actions', 'Create')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex flex-col w-full gap-4">
              {!isValid && (
                <StyledButton
                  label={translate('general/actions', 'Skip')}
                  onClick={() => {
                    setStep(step + 1);
                    reset({
                      ...getValues(),
                      paymentMode: undefined,
                      paymentAmount: undefined,
                      paymentExternalId: undefined,
                      paymentCurrency: undefined,
                      paymentExpiryDate: undefined,
                    });
                  }}
                  width={StyledButtonWidth.FULL}
                  color={StyledButtonColor.STURDY_WHITE}
                />
              )}
              <StyledButton
                label={translate('general/actions', 'Next')}
                onClick={() => setStep(step + 1)}
                width={StyledButtonWidth.FULL}
                disabled={!isValid}
              />
            </div>
          )}
        </StyledVerticalStack>
      </Form>
    </>
  );
}

interface CreatePaymentOverlayProps {
  id: string;
  onDone: (id?: string) => void;
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

          <StyledInput
            name="paymentExpiryDate"
            label={translate('screens/payment', 'Date')}
            placeholder={new Date().toISOString().split('T')[0]}
            full
          />

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

interface DataFieldProps {
  value?: string;
}

const DataField: React.FC<DataFieldProps> = ({ value }) => {
  const { translate } = useSettingsContext();

  return (
    <p className="font-semibold">
      {value ? value : <span className="text-dfxGray-600">{translate('screens/payment', 'N/A')}</span>}
    </p>
  );
};
