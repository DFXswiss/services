import {
  ApiError,
  Country,
  CreatePaymentLink,
  CreatePaymentLinkPayment,
  Fiat,
  PaymentLinkPaymentMode,
  PaymentLinkPaymentStatus,
  PaymentLinkStatus,
  PaymentRouteType,
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
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { ControlProps } from '@dfx.swiss/react-components/dist/stories/form/Form';
import copy from 'copy-to-clipboard';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { Layout } from 'src/components/layout';
import { ConfirmationOverlay } from 'src/components/overlays';
import { QrBasic } from 'src/components/payment/qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useUserGuard } from 'src/hooks/guard.hook';
import { Lnurl } from 'src/util/lnurl';
import { blankedAddress, formatLocationAddress } from 'src/util/utils';
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

interface DeletePaymentRoute {
  id: number;
  type: PaymentRouteType;
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
    deletePaymentRoute,
    error,
  } = usePaymentRoutesContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const paymentLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [showCreatePaymentLinkOverlay, setShowCreatePaymentLinkOverlay] = useState(false);
  const [showCreatePaymentOverlay, setShowCreatePaymentOverlay] = useState<string>();
  const [isUpdatingPaymentLink, setIsUpdatingPaymentLink] = useState<string[]>([]);
  const [isDeletingRoute, setIsDeletingRoute] = useState<string[]>([]);
  const [expandedRef, setExpandedRef] = useState<string>();
  const [deleteRoute, setDeleteRoute] = useState<DeletePaymentRoute>();
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

  async function onDeleteRoute(result: boolean) {
    if (result && deleteRoute) {
      const { id, type } = deleteRoute;
      setIsDeletingRoute((prev) => [...prev, routeKey(id, type)]);
      deletePaymentRoute(id, type).finally(() => {
        setIsDeletingRoute((prev) => prev.filter((i) => i !== routeKey(id, type)));
      });
    }

    setDeleteRoute(undefined);
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

  function routeKey(id: number, type: PaymentRouteType): string {
    return `${type}/${id}`;
  }

  const hasRoutes =
    paymentRoutes && Boolean(paymentRoutes?.buy.length || paymentRoutes?.sell.length || paymentRoutes?.swap.length);

  const title =
    showCreatePaymentLinkOverlay && createPaymentLinkStep !== undefined
      ? `Payment Link: ${translate('screens/payment', createPaymentLinkStepToTitleMap[createPaymentLinkStep])}`
      : showCreatePaymentOverlay
      ? 'Create payment'
      : deleteRoute
      ? 'Delete payment route?'
      : 'Payment routes';

  const onBack =
    showCreatePaymentLinkOverlay && createPaymentLinkStep !== undefined
      ? () =>
          createPaymentLinkStep !== CreatePaymentLinkStep.ROUTE
            ? setCreatePaymentLinkStep(createPaymentLinkStep - 1)
            : setShowCreatePaymentLinkOverlay(false)
      : showCreatePaymentOverlay !== undefined
      ? () => setShowCreatePaymentOverlay(undefined)
      : deleteRoute
      ? () => onDeleteRoute(false)
      : undefined;

  return (
    <Layout title={translate('screens/payment', title)} onBack={onBack} textStart rootRef={rootRef}>
      {error ? (
        <ErrorHint message={error} />
      ) : showCreatePaymentLinkOverlay ? (
        <CreatePaymentLinkOverlay step={createPaymentLinkStep} setStep={setCreatePaymentLinkStep} onDone={onDone} />
      ) : showCreatePaymentOverlay !== undefined ? (
        <CreatePaymentOverlay id={showCreatePaymentOverlay} onDone={onDone} />
      ) : deleteRoute ? (
        <ConfirmationOverlay
          messageContent={
            <p className="text-dfxBlue-800 mb-2 text-center">
              <Trans
                i18nKey="screens/payment.delete"
                values={{ type: deleteRoute.type.toUpperCase(), id: deleteRoute.id }}
              >
                Are you sure you want to delete your <strong>{deleteRoute.type.toUpperCase()} route</strong> with{' '}
                <strong>ID {deleteRoute.id.toString()}</strong>?
              </Trans>
            </p>
          }
          cancelLabel={translate('general/actions', 'Cancel')}
          confirmLabel={translate('general/actions', 'Delete')}
          onCancel={() => onDeleteRoute(false)}
          onConfirm={() => onDeleteRoute(true)}
        />
      ) : (paymentRoutesLoading || paymentLinksLoading) && !(isUpdatingPaymentLink.length || isDeletingRoute.length) ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : hasRoutes === false ? (
        <p className="text-dfxGray-700">{translate('screens/payment', 'You have no payment routes yet')}</p>
      ) : (
        <StyledVerticalStack full gap={5}>
          {paymentRoutes?.buy.length ? (
            <StyledVerticalStack gap={2} full>
              <h2 className="ml-3.5 mb-1.5 text-dfxGray-700">{translate('screens/payment', 'Buy')}</h2>
              {paymentRoutes?.buy.map<JSX.Element>((route) => (
                <div key={route.id}>
                  <RouteComponent
                    title={`${translate('screens/payment', 'Route')} ${route.id}`}
                    subTitle={`${route.asset.blockchain} / ${route.asset.name}`}
                    adjacentText={translate('screens/payment', route.bankUsage)}
                    items={[
                      { label: translate('screens/payment', 'ID'), text: route.id.toString() },
                      { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                      { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                      { label: translate('screens/payment', 'Purpose of payment'), text: route.bankUsage, copy: true },
                      { label: translate('screens/home', 'Volume'), text: `${route.volume} CHF` },
                      { label: translate('screens/payment', 'Annual volume'), text: `${route.annualVolume} CHF` },
                    ]}
                    deleteRoute={() => setDeleteRoute({ id: route.id, type: 'buy' })}
                    isDeletingRoute={isDeletingRoute.includes(routeKey(route.id, 'buy'))}
                  />
                </div>
              ))}
            </StyledVerticalStack>
          ) : (
            <></>
          )}
          {paymentRoutes?.sell.length ? (
            <StyledVerticalStack gap={2} full>
              <h2 className="ml-3.5 mb-1.5 text-dfxGray-700">{translate('screens/payment', 'Sell')}</h2>
              {paymentRoutes?.sell.map<JSX.Element>((route) => (
                <div key={route.id}>
                  <RouteComponent
                    title={`${translate('screens/payment', 'Route')} ${route.id}`}
                    subTitle={`${route.currency.name} / ${route.iban}`}
                    adjacentText={route.deposit.blockchains.map(toString).join(', ')}
                    items={[
                      { label: translate('screens/payment', 'ID'), text: route.id.toString() },
                      { label: translate('screens/payment', 'Currency'), text: route.currency.name },
                      { label: translate('screens/payment', 'IBAN'), text: route.iban },
                      {
                        label: translate('screens/payment', 'Deposit address'),
                        text: blankedAddress(route.deposit.address, { width: width && width * 0.8 }),
                      },
                      {
                        label: translate('screens/payment', 'Deposit blockchains'),
                        text: route.deposit.blockchains.map(toString).join(', '),
                      },
                      { label: translate('screens/home', 'Volume'), text: `${route.volume} CHF` },
                      { label: translate('screens/payment', 'Annual volume'), text: `${route.annualVolume} CHF` },
                    ]}
                    deleteRoute={() => setDeleteRoute({ id: route.id, type: 'sell' })}
                    isDeletingRoute={isDeletingRoute.includes(routeKey(route.id, 'sell'))}
                  />
                </div>
              ))}
            </StyledVerticalStack>
          ) : (
            <></>
          )}
          {paymentRoutes?.swap.length ? (
            <StyledVerticalStack gap={2} full>
              <h2 className="ml-3.5 mb-1.5 text-dfxGray-700">{translate('screens/payment', 'Swap')}</h2>
              {paymentRoutes?.swap.map<JSX.Element>((route) => (
                <div key={route.id}>
                  <RouteComponent
                    title={`${translate('screens/payment', 'Route')} ${route.id}`}
                    subTitle={`${route.asset.blockchain} / ${route.asset.name}`}
                    adjacentText={route.deposit.blockchains.map(toString).join(', ')}
                    items={[
                      { label: translate('screens/payment', 'ID'), text: route.id.toString() },
                      { label: translate('screens/payment', 'Asset'), text: route.asset.name },
                      { label: translate('screens/home', 'Blockchain'), text: route.asset.blockchain },
                      {
                        label: translate('screens/payment', 'Deposit address'),
                        text: blankedAddress(route.deposit.address, { width: width && width * 0.8 }),
                      },
                      {
                        label: translate('screens/payment', 'Deposit blockchains'),
                        text: route.deposit.blockchains.map(toString).join(', '),
                      },
                      { label: translate('screens/home', 'Volume'), text: `${route.volume} CHF` },
                      { label: translate('screens/payment', 'Annual volume'), text: `${route.annualVolume} CHF` },
                    ]}
                    deleteRoute={() => setDeleteRoute({ id: route.id, type: 'swap' })}
                    isDeletingRoute={isDeletingRoute.includes(routeKey(route.id, 'swap'))}
                  />
                </div>
              ))}
            </StyledVerticalStack>
          ) : (
            <></>
          )}
          {paymentLinks?.length ? (
            <StyledVerticalStack gap={2} full>
              <h2 className="ml-3.5 mb-1.5 text-dfxGray-700">{translate('screens/payment', 'Payment Links')}</h2>
              {paymentLinks.map((link: any) => {
                {
                  /** TODO: add new fields to packages, remove `: any`*/
                }
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
                          <StyledDataTableExpandableRow
                            label="LNURL"
                            expansionItems={[
                              {
                                label: translate('screens/payment', 'Link'),
                                text: blankedAddress(Lnurl.prependLnurl(link.lnurl), { width }),
                                icon: IconVariant.COPY,
                                onClick: () => copy(Lnurl.prependLnurl(link.lnurl)),
                              },
                              {
                                label: 'LNURL',
                                text: blankedAddress(link.lnurl, { width, scale: 0.8 }),
                                icon: IconVariant.COPY,
                                onClick: () => copy(link.lnurl),
                              },
                              {
                                label: translate('screens/payment', 'LNURL decoded'),
                                text: blankedAddress(link.url, { width }),
                                icon: IconVariant.COPY,
                                onClick: () => copy(link.url),
                              },
                            ]}
                          >
                            <p className="text-right overflow-ellipsis">
                              {blankedAddress(link.lnurl, { width, scale: 0.8 })}
                            </p>
                          </StyledDataTableExpandableRow>
                          {link.recipient && (
                            <StyledDataTableExpandableRow
                              label={translate('screens/payment', 'Recipient')}
                              expansionItems={[
                                { label: translate('screens/support', 'Name'), text: link.recipient.name },
                                {
                                  label: translate('screens/home', 'Address'),
                                  text: formatLocationAddress({ ...link.recipient.address }),
                                },
                                {
                                  label: translate('screens/kyc', 'Phone number'),
                                  text: link.recipient.phone,
                                },
                                {
                                  label: translate('screens/kyc', 'Email address'),
                                  text: link.recipient.mail,
                                },
                                {
                                  label: translate('screens/kyc', 'Website'),
                                  text: link.recipient.website,
                                  // open absolute URL in new tab
                                  onClick: () => {
                                    const url =
                                      link.recipient.website.startsWith('http://') ||
                                      link.recipient.website.startsWith('https://')
                                        ? link.recipient.website
                                        : `https://${link.recipient.website}`;

                                    window.open(url, '_blank');
                                  },
                                },
                              ].filter((item) => item.text)}
                            >
                              {link.recipient.name && <p>{link.recipient.name}</p>}
                            </StyledDataTableExpandableRow>
                          )}
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
                                  text: `${link.payment.amount.toString()} ${link.payment.currency}`,
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
                              <p>{translate('screens/payment', link.payment.status)}</p>
                            </StyledDataTableExpandableRow>
                          )}
                        </StyledDataTable>
                        <div className="flex w-full items-center justify-center">
                          <div className="w-48 py-3">
                            <QrBasic data={Lnurl.prependLnurl(link.lnurl)} />
                          </div>
                        </div>
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

interface RouteComponentProps {
  title: string;
  subTitle: string;
  adjacentText: string;
  items: {
    label: string;
    text: string;
    copy?: boolean;
  }[];
  deleteRoute: () => void;
  isDeletingRoute: boolean;
}

function RouteComponent({
  title,
  subTitle,
  adjacentText,
  items,
  deleteRoute,
  isDeletingRoute,
}: RouteComponentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { width } = useWindowContext();

  return (
    <StyledCollapsible
      full
      titleContent={
        <div className="flex flex-row justify-between gap-2 items-center">
          <div className="flex flex-col items-start text-left">
            <div className="font-bold leading-none">{title}</div>
            <div className="leading-none mt-1 text-dfxGray-700">{subTitle}</div>
          </div>
          <p className="overflow-ellipsis">{blankedAddress(adjacentText, { width })}</p>
        </div>
      }
    >
      <StyledVerticalStack full gap={4}>
        <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
          {items.map((item) => (
            <StyledDataTableRow key={item.label} label={item.label}>
              <p>{item.text}</p>
              {item.copy && <CopyButton onCopy={() => copy(item.text)} />}
            </StyledDataTableRow>
          ))}
        </StyledDataTable>
        <StyledButton
          label={translate('general/actions', 'Delete')}
          onClick={deleteRoute}
          color={StyledButtonColor.STURDY_WHITE}
          isLoading={isDeletingRoute}
        />
      </StyledVerticalStack>
    </StyledCollapsible>
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const {
    watch,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
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
          mail: data.recipientEmail,
          website: data.recipientWebsite,
        },
      } as CreatePaymentLink;

      if (data.paymentMode) {
        request.payment = {
          mode: data.paymentMode,
          amount: +data.paymentAmount,
          externalId: data.paymentExternalId,
          currency: data.paymentCurrency.name,
          expiryDate: data.paymentExpiryDate,
        } as any;
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
  const hasPaymentData = Boolean(
    data.paymentMode &&
      data.paymentAmount !== undefined &&
      data.paymentExternalId !== undefined &&
      data.paymentCurrency &&
      data.paymentExpiryDate,
  );

  const skipRecipientData = Boolean(!hasRecipientData && step === CreatePaymentLinkStep.RECIPIENT);
  const skipPaymentData = Boolean(!hasPaymentData && step === CreatePaymentLinkStep.PAYMENT);

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

              <DateAndTimePicker
                name="paymentExpiryDate"
                label={translate('screens/payment', 'Expires at')}
                smallLabel
              />
            </>
          )}
          {step === CreatePaymentLinkStep.DONE && (
            <StyledVerticalStack center full gap={2}>
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableRow label={translate('screens/payment', 'Route ID')}>
                  <p className="font-semibold">{data.routeId?.id ?? naString}</p>
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
                      label: translate('screens/home', 'Address'),
                      text:
                        formatLocationAddress({
                          street: data.recipientStreet,
                          houseNumber: data.recipientHouseNumber,
                          zip: data.recipientZip,
                          city: data.recipientCity,
                          country: data.recipientCountry?.name,
                        }) ?? naString,
                    },
                    { label: translate('screens/kyc', 'Phone number'), text: data.recipientPhone ?? naString },
                    { label: translate('screens/kyc', 'Email address'), text: data.recipientEmail ?? naString },
                    { label: translate('screens/kyc', 'Website'), text: data.recipientWebsite ?? naString },
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
              {(skipPaymentData || skipRecipientData) && (
                <StyledButton
                  label={translate('general/actions', 'Skip')}
                  onClick={() => {
                    reset({
                      ...getValues(),
                      ...(!hasPaymentData && {
                        paymentMode: undefined,
                        paymentAmount: undefined,
                        paymentExternalId: undefined,
                        paymentCurrency: undefined,
                        paymentExpiryDate: undefined,
                      }),
                      ...(!hasRecipientData && {
                        recipientName: undefined,
                        recipientStreet: undefined,
                        recipientHouseNumber: undefined,
                        recipientZip: undefined,
                        recipientCity: undefined,
                        recipientCountry: undefined,
                        recipientPhone: undefined,
                        recipientEmail: undefined,
                        recipientWebsite: undefined,
                      }),
                    });
                    setStep(step + 1);
                  }}
                  width={StyledButtonWidth.FULL}
                  color={StyledButtonColor.STURDY_WHITE}
                />
              )}
              <StyledButton
                label={translate('general/actions', 'Next')}
                onClick={() => setStep(step + 1)}
                width={StyledButtonWidth.FULL}
                disabled={skipPaymentData || skipRecipientData}
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
        currency: data.paymentCurrency.name,
        expiryDate: data.paymentExpiryDate,
      } as any;

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
      disabled,
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
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, -5);
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
              background-color: #f5516c; /* text-dfxRed-100 */
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
            color: ${error ? '#f5516c' : '#2a4365'}; /* text-dfxRed-100 or text-dfxBlue-800 */
          }

          .custom-date-input::placeholder,
          .custom-time-input::placeholder {
            color: #a0aec0; /* text-dfxGray-600 */
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
                disabled={disabled}
                className={`custom-date-input text-base font-normal rounded-md p-4 w-full bg-white border border-dfxGray-500 focus:outline-dfxBlue-800 ${
                  disabled ? 'opacity-50 cursor-not-allowed focus:outline-none' : ''
                }`}
              />
            </div>
          </div>
        </div>
        {error && <p className="text-start text-sm text-dfxRed-100 pl-3">{error?.message}</p>}
      </>
    );
  },
);
