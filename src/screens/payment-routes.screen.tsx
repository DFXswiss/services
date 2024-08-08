import {
  ApiError,
  Blockchain,
  Fiat,
  useFiatContext,
  usePaymentRoutesContext,
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
import {
  CreatePaymentLink,
  CreatePaymentLinkPayment,
  PaymentLinkPaymentMode,
  PaymentLinkPaymentStatus,
  PaymentLinkStatus,
} from '@dfx.swiss/react/dist/definitions/route';
import copy from 'copy-to-clipboard';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { QrCopy } from 'src/components/payment/qr-copy';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useUserGuard } from 'src/hooks/guard.hook';
import { blankedAddress } from 'src/util/utils';
import { ErrorHint } from '../components/error-hint';

export default function PaymentRoutes(): JSX.Element {
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();
  const { paymentRoutes, paymentLinksLoading, paymentLinks, cancelPaymentLinkPayment, error } =
    usePaymentRoutesContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const paymentLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [showCreatePaymentLinkOverlay, setShowCreatePaymentLinkOverlay] = useState(false);
  const [showCreatePaymentOverlay, setShowCreatePaymentOverlay] = useState<string | undefined>(undefined);

  useUserGuard('/login');

  return (
    <Layout
      title={translate('screens/payment', showCreatePaymentLinkOverlay ? 'Create new route' : 'Payment routes')}
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
        <CreatePaymentLinkOverlay onDone={() => setShowCreatePaymentLinkOverlay(false)} />
      ) : showCreatePaymentOverlay !== undefined ? (
        <CreatePaymentOverlay id={showCreatePaymentOverlay} onDone={() => setShowCreatePaymentOverlay(undefined)} />
      ) : !paymentRoutes || paymentLinksLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={5}>
          {paymentRoutes?.buy.length ? (
            <StyledDataTable label={translate('screens/payment', 'Buy')}>
              {paymentRoutes?.buy.map<JSX.Element>((route) => (
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
          {paymentRoutes?.sell.length ? (
            <StyledDataTable label={translate('screens/payment', 'Sell')}>
              {paymentRoutes?.sell.map<JSX.Element>((route) => (
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
          {paymentRoutes?.swap.length ? (
            <StyledDataTable label={translate('screens/payment', 'Swap')}>
              {paymentRoutes?.swap.map<JSX.Element>((route) => (
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
          <h2 className="ml-3.5 text-dfxGray-700">{translate('screens/payment', 'Payment links')}</h2>
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
                              <p className="font-semibold">
                                {translate('screens/payment', link.payment.status).toUpperCase()}
                              </p>
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
                              label={translate('screens/payment', 'Create payment')}
                              onClick={() => setShowCreatePaymentOverlay(link.id)}
                              color={StyledButtonColor.STURDY_WHITE}
                            />
                          )}
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          link.payment?.status === PaymentLinkPaymentStatus.PENDING && (
                            <StyledButton
                              label={translate('screens/payment', 'Cancel payment')}
                              onClick={() => cancelPaymentLinkPayment(+link.id)}
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
            label={translate('screens/payment', 'Create payment link')}
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
  paymentExpiryDate: Date;
}

enum RouteType {
  WITH_PAYMENT = 'With payment',
  WITHOUT_PAYMENT = 'Without payment',
}

interface CreatePaymentLinkOverlayProps {
  onDone: () => void;
}

function CreatePaymentLinkOverlay({ onDone }: CreatePaymentLinkOverlayProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { createPaymentLink } = usePaymentRoutesContext();
  const { currencies } = useFiatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

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
          expiryDate: data.paymentExpiryDate,
        };
      }

      await createPaymentLink(request);
      onDone();
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

              <StyledInput
                name="paymentExpiryDate"
                label={translate('screens/payment', 'Date')}
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
    setValue,
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
      onDone();
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
