import {
  ApiError,
  Blockchain,
  Fiat,
  PaymentRoute,
  PaymentRoutesDto,
  useApi,
  useFiatContext,
  usePaymentRoutes,
  useUserContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  AlignContent,
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
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { QrCopy } from 'src/components/payment/qr-copy';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { blankedAddress } from 'src/util/utils';
import { ErrorHint } from '../components/error-hint';

enum PaymentLinkStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

enum PaymentLinkPaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired',
}

interface PaymentLink {
  id: string;
  routeId: string;
  externalId?: string;
  status: PaymentLinkStatus;
  url: string;
  lnurl: string;
  payment?: PaymentLinkPaymentDto;
}

interface PaymentLinkPaymentDto {
  id: string;
  externalId?: string;
  status: PaymentLinkPaymentStatus;
  amount: number;
  currency: Fiat;
  mode: PaymentLinkPaymentMode;
  expiryDate: Date;
  url: string;
  lnurl: string;
}

export default function PaymentRoutes(): JSX.Element {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { toString } = useBlockchain();
  const { getPaymentRoutes } = usePaymentRoutes();
  const { call } = useApi();
  const { width } = useWindowContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const paymentLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [routes, setRoutes] = useState<PaymentRoutesDto>();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>();
  const [error, setError] = useState<string>();
  const [showCreatePaymentLinkOverlay, setShowCreatePaymentLinkOverlay] = useState(false);
  const [showCreatePaymentOverlay, setShowCreatePaymentOverlay] = useState<string | undefined>(undefined);

  function sortRoutes(a: PaymentRoute, b: PaymentRoute): number {
    if ('asset' in a && 'asset' in b) {
      return a.asset.blockchain.localeCompare(b.asset.blockchain);
    } else if ('currency' in a && 'currency' in b) {
      return a.currency.name.localeCompare(b.currency.name);
    } else {
      return 0;
    }
  }

  useEffect(() => {
    if (!user) return;
    getPaymentRoutes()
      .then((routes: PaymentRoutesDto) => {
        routes.buy = routes.buy.filter((route) => route.active).sort(sortRoutes);
        routes.sell = routes.sell.filter((route) => route.active).sort(sortRoutes);
        routes.swap = routes.swap.filter((route) => route.active).sort(sortRoutes);
        setRoutes(routes);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));

    getPaymentLinks()
      .then(setPaymentLinks)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [user]);

  async function getPaymentLinks(): Promise<PaymentLink[]> {
    const links = await call<PaymentLink | PaymentLink[]>({
      url: '/paymentLink',
      method: 'GET',
    });

    return Array.isArray(links) ? links : [links];
  }

  async function cancelPayment(id: number, externalId?: number): Promise<void> {
    await call({
      url: `/paymentLink/payment?id=${id}`, // &externalId=${externalId}`,
      method: 'DELETE',
    });
  }

  return (
    <Layout
      title={translate('screens/payment', showCreatePaymentLinkOverlay ? 'Create new route' : 'Payments')}
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
      ) : !routes ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : showCreatePaymentLinkOverlay ? (
        <CreatePaymentLink onDone={() => setShowCreatePaymentLinkOverlay(false)} />
      ) : showCreatePaymentOverlay !== undefined ? (
        <CreatePaymentOverlay id={showCreatePaymentOverlay} onDone={() => setShowCreatePaymentOverlay(undefined)} />
      ) : (
        <StyledVerticalStack full gap={5}>
          <h2 className="ml-3.5 text-dfxGray-700">Payment Routes</h2>
          {routes?.buy.length ? (
            <StyledDataTable label={translate('screens/payment', 'Buy')}>
              {routes.buy.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
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
          {routes?.sell.length ? (
            <StyledDataTable label={translate('screens/payment', 'Sell')}>
              {routes.sell.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
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
          {routes?.swap.length ? (
            <StyledDataTable label={translate('screens/payment', 'Swap')}>
              {routes.swap.map<JSX.Element>((route) => (
                <StyledDataTableExpandableRow
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
          <h2 className="ml-3.5 text-dfxGray-700">Payment Links</h2>
          {paymentLinks?.length ? (
            <StyledVerticalStack gap={2} full>
              {paymentLinks.map((link) => {
                return (
                  <div key={link.id} ref={(el) => paymentLinkRefs.current && (paymentLinkRefs.current[link.id] = el)}>
                    <StyledCollapsible
                      full
                      titleContent={
                        <div className="flex flex-row justify-between gap-2 items-center">
                          <div className="flex flex-col items-start text-left">
                            <div className="font-bold leading-none">
                              {`${translate('screens/payment', 'Payment link')} ${link.id}`}
                            </div>
                            <div className="leading-none mt-1 text-dfxGray-700">
                              {`${translate('screens/payment', 'Route')} ${link.routeId}`}
                            </div>
                          </div>
                          <div>{link.status}</div>
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
                          <StyledDataTableRow label={translate('screens/payment', 'Route ID')}>
                            <p>{link.routeId}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'Status')}>
                            <p>{link.status}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'LNURL')}>
                            <p>{blankedAddress(link.lnurl, { width })}</p>
                          </StyledDataTableRow>
                          <StyledDataTableRow label={translate('screens/payment', 'URL')}>
                            <StyledLink label={blankedAddress(link.url, { width })} url={link.url} dark />
                          </StyledDataTableRow>
                          {link.payment != null && (
                            <StyledDataTableExpandableRow
                              label={translate('screens/payment', 'Payment')}
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
                                  text: link.payment.mode,
                                },
                                {
                                  label: translate('screens/payment', 'Amount'),
                                  text: `${link.payment.amount.toString()} ${link.payment.currency.name}`,
                                },
                                {
                                  label: translate('screens/payment', 'Status'),
                                  text: link.payment.status,
                                },
                                {
                                  label: translate('screens/payment', 'Expiry Date'),
                                  text: new Date(link.payment.expiryDate).toLocaleString(),
                                },
                                {
                                  label: translate('screens/payment', 'LNURL'),
                                  text: blankedAddress(link.payment.lnurl, { width }),
                                  icon: IconVariant.COPY,
                                  onClick: () => copy(link.lnurl),
                                },
                                {
                                  label: translate('screens/payment', 'URL'),
                                  text: link.payment.url.split('dfx.swiss')[1],
                                  icon: IconVariant.OPEN_IN_NEW,
                                  onClick: () => window.open(link.url, '_blank'),
                                },
                              ]}
                            >
                              <p className="font-semibold">{link.payment.status.toUpperCase()}</p>
                            </StyledDataTableExpandableRow>
                          )}
                        </StyledDataTable>
                        {link.payment?.status === PaymentLinkPaymentStatus.PENDING && (
                          <div className="flex w-full items-center justify-center">
                            <div className="w-48 py-3">
                              <QrCopy data={link.payment.lnurl} />
                            </div>
                          </div>
                        )}
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          (!link.payment ||
                            [PaymentLinkPaymentStatus.CANCELLED, PaymentLinkPaymentStatus.EXPIRED].includes(
                              link.payment.status,
                            )) && (
                            <StyledButton
                              label={translate('screens/payment', 'CREATE PAYMENT')}
                              onClick={() => setShowCreatePaymentOverlay(link.id)}
                              color={StyledButtonColor.STURDY_WHITE}
                            />
                          )}
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          link.payment?.status === PaymentLinkPaymentStatus.PENDING && (
                            <StyledButton
                              label={translate('screens/payment', 'CANCEL PAYMENT')}
                              onClick={() => cancelPayment(+link.id)}
                              color={StyledButtonColor.STURDY_WHITE}
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
          <StyledButton
            label={translate('screens/payment', 'Create new payment link')}
            width={StyledButtonWidth.FULL}
            onClick={() => setShowCreatePaymentLinkOverlay(true)}
          />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface FormData {
  routeId: number;
  externalId: string;
  paymentType: RouteType;
  paymentMode: PaymentLinkPaymentMode;
  paymentAmount: string;
  paymentExternalId: string;
  paymentCurrency: Fiat;
  paymentexpiryDate: Date;
}

enum RouteType {
  WITH_PAYMENT = 'With payment',
  WITHOUT_PAYMENT = 'Without payment',
}

enum PaymentLinkPaymentMode {
  SINGLE = 'Single',
  MULTIPLE = 'Multiple',
}

interface CreatePaymentLinkPayment {
  mode: PaymentLinkPaymentMode;
  amount: number;
  externalId: string;
  currency: Fiat;
  expiryDate: Date;
}

interface CreatePaymentLink {
  routeId?: number;
  externalId?: string;
  payment?: CreatePaymentLinkPayment;
}

interface CreatePaymentLinkOverlayProps {
  onDone: () => void;
}

function CreatePaymentLink({ onDone }: CreatePaymentLinkOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { currencies } = useFiatContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: {
      paymentType: RouteType.WITHOUT_PAYMENT,
    },
  });
  const selectedType = useWatch({ control, name: 'paymentType' });

  async function createPaymentLink(request: CreatePaymentLink) {
    await call({
      url: '/paymentLink',
      method: 'POST',
      data: request,
    });
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreatePaymentLink = {
        routeId: data.routeId,
        externalId: data.externalId,
      };

      if (data.paymentType === RouteType.WITH_PAYMENT) {
        request.payment = {
          mode: data.paymentMode,
          amount: +data.paymentAmount,
          externalId: data.paymentExternalId,
          currency: data.paymentCurrency,
          expiryDate: data.paymentexpiryDate,
        };
      }

      await createPaymentLink(request);
      setIssueCreated(true);
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
      {issueCreated ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">{translate('screens/support', 'Payment creation successful.')}</p>

          <StyledButton
            label={translate('general/actions', 'Ok')}
            onClick={onDone}
            width={StyledButtonWidth.FULL}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <StyledInput
              name="routeId"
              autocomplete="routeId"
              label={translate('screens/payment', 'Route ID')}
              placeholder={translate('screens/payment', 'Route ID')}
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
              label={translate('screens/payment', 'Payment Type')}
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

                <StyledInput
                  name="paymentData"
                  label={translate('screens/support', 'Date')}
                  placeholder={new Date().toISOString().split('T')[0]}
                  full
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
              label={translate('general/actions', 'Next')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              isLoading={isLoading}
            />
          </StyledVerticalStack>
        </Form>
      )}
    </>
  );
}

interface CreatePaymentOverlayProps extends CreatePaymentLinkOverlayProps {
  id: string;
}

function CreatePaymentOverlay({ id, onDone }: CreatePaymentOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { currencies } = useFiatContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [issueCreated, setIssueCreated] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({
    mode: 'onTouched',
  });

  async function createPayment(request: CreatePaymentLinkPayment) {
    await call({
      url: `/paymentLink/payment?id=${id}`,
      method: 'POST',
      data: request,
    });
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: CreatePaymentLinkPayment = {
        mode: data.paymentMode,
        amount: +data.paymentAmount,
        externalId: data.paymentExternalId,
        currency: data.paymentCurrency,
        expiryDate: data.paymentexpiryDate,
      };

      await createPayment(request);
      setIssueCreated(true);
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
      {issueCreated ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate('screens/support', 'The issue has been successfully submitted. You will be contacted by email.')}
          </p>

          <StyledButton
            label={translate('general/actions', 'Ok')}
            onClick={onDone}
            width={StyledButtonWidth.FULL}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      ) : (
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
              name="paymentData"
              label={translate('screens/support', 'Date')}
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
              label={translate('general/actions', 'Next')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              isLoading={isLoading}
            />
          </StyledVerticalStack>
        </Form>
      )}
    </>
  );
}
