import {
  ApiError,
  Blockchain,
  Country,
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
  StyledDateAndTimePicker,
  StyledDropdown,
  StyledDropdownMultiChoice,
  StyledHorizontalStack,
  StyledInput,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { PaymentQuoteStatus, PaymentStandardType } from '@dfx.swiss/react/dist/definitions/route';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { Layout } from 'src/components/layout';
import { ConfirmationOverlay } from 'src/components/overlays';
import { QrBasic } from 'src/components/payment/qr-code';
import { PaymentQuoteStatusLabels } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useAddressGuard } from 'src/hooks/guard.hook';
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
  configStandards: ConfigStandard[];
  configMinCompletionStatus: PaymentQuoteStatus;
  configDisplayQr: boolean;
  configPaymentTimeout: number;
  configFee: number;
  configTimeout: number;
  paymentMode: PaymentLinkPaymentMode;
  paymentAmount: string;
  paymentExternalId: string;
  paymentCurrency: Fiat;
  paymentExpiryDate: Date;
}

type ConfigStandard = PaymentStandardType | Blockchain;

interface RouteIdSelectData {
  id: string;
  description: string;
}

interface DeletePaymentRoute {
  id: number;
  type: PaymentRouteType;
}

export default function PaymentRoutesScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();
  const { user, updatePaymentLinksConfig: updateUserConfig } = useUserContext();
  const {
    paymentRoutes,
    paymentLinks,
    paymentRoutesLoading,
    paymentLinksLoading,
    updatePaymentLink,
    cancelPaymentLinkPayment,
    deletePaymentRoute,
    error: apiError,
  } = usePaymentRoutesContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const paymentLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [error, setError] = useState<string>();
  const [deleteRoute, setDeleteRoute] = useState<DeletePaymentRoute>();
  const [isDeletingRoute, setIsDeletingRoute] = useState<string[]>([]);
  const [isUpdatingPaymentLink, setIsUpdatingPaymentLink] = useState<string[]>([]);
  const [expandedPaymentLinkId, setExpandedPaymentLinkId] = useState<string>();
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState<PaymentLinkFormState>();
  const [updateGlobalConfig, setUpdateGlobalConfig] = useState<boolean>(false);

  useAddressGuard('/login');

  async function togglePaymentLinkStatus(id: string, status: PaymentLinkStatus) {
    setIsUpdatingPaymentLink((prev) => [...prev, id]);
    updatePaymentLink({ status }, id).finally(() => {
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
    cancelPaymentLinkPayment(id).finally(() => {
      setIsUpdatingPaymentLink((prev) => prev.filter((i) => i !== id));
    });
  }

  async function updatePaymentLinksConfig(data: any) {
    await updateUserConfig(data.config).catch((e: ApiError) => setError(e.message ?? 'Unknown error'));
  }

  function onCloseForm(id?: string) {
    setShowPaymentLinkForm(undefined);

    if (id) {
      setTimeout(() => paymentLinkRefs.current[id]?.scrollIntoView());
      setExpandedPaymentLinkId(id);
    }
  }

  function routeKey(id: number, type: PaymentRouteType): string {
    return `${type}/${id}`;
  }

  const hasRoutes =
    paymentRoutes && Boolean(paymentRoutes?.buy.length || paymentRoutes?.sell.length || paymentRoutes?.swap.length);

  const title = updateGlobalConfig
    ? 'Default configuration'
    : showPaymentLinkForm
    ? `Payment Link: ${translate('screens/payment', PaymentLinkFormStepToTitle[showPaymentLinkForm.step])}`
    : deleteRoute
    ? 'Delete payment route?'
    : 'Payment routes';

  const onBack = updateGlobalConfig
    ? () => setUpdateGlobalConfig(false)
    : showPaymentLinkForm
    ? () =>
        setShowPaymentLinkForm((prev) =>
          prev && prev.step > 0 && !prev.paymentLinkId ? { ...prev, step: prev.step - 1 } : undefined,
        )
    : deleteRoute
    ? () => setDeleteRoute(undefined)
    : undefined;

  return (
    <Layout title={translate('screens/payment', title)} onBack={onBack} textStart rootRef={rootRef}>
      {apiError || error ? (
        <ErrorHint message={apiError ?? error ?? ''} />
      ) : updateGlobalConfig ? (
        <PaymentLinkForm
          state={{
            step: PaymentLinkFormStep.CONFIG,
            paymentLinkId: undefined,
            prefilledData: {
              configStandards: toConfigStandards(
                user?.paymentLink?.config?.standards,
                user?.paymentLink?.config?.blockchains,
              ),
              configMinCompletionStatus: user?.paymentLink?.config?.minCompletionStatus,
              configDisplayQr: user?.paymentLink?.config?.displayQr,
              configFee: user?.paymentLink?.config?.fee,
              configPaymentTimeout: user?.paymentLink?.config?.paymentTimeout,
            },
          }}
          setStep={(step) => setShowPaymentLinkForm((prev) => ({ ...prev, step }))}
          onClose={() => setUpdateGlobalConfig(false)}
          onSubmit={async (data) => {
            await updatePaymentLinksConfig(data);
            setUpdateGlobalConfig(false);
          }}
        />
      ) : showPaymentLinkForm ? (
        <PaymentLinkForm
          state={showPaymentLinkForm}
          setStep={(step) => setShowPaymentLinkForm((prev) => ({ ...prev, step }))}
          onClose={onCloseForm}
        />
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
              <StyledDataTable>
                <StyledDataTableExpandableRow
                  label={translate('screens/payment', 'Default configuration')}
                  expansionItems={
                    [
                      {
                        label: translate('screens/payment', 'Payment standards'),
                        text: toConfigStandards(
                          user?.paymentLink?.config?.standards,
                          user?.paymentLink?.config?.blockchains,
                        )?.join('\n'),
                      },
                      {
                        label: translate('screens/payment', 'Min. completion status'),
                        text:
                          user?.paymentLink?.config?.minCompletionStatus &&
                          translate(
                            'screens/payment',
                            PaymentQuoteStatusLabels[user.paymentLink.config.minCompletionStatus],
                          ),
                      },
                      {
                        label: translate('screens/payment', 'Display QR code'),
                        text: user?.paymentLink?.config?.displayQr?.toString(),
                      },
                      {
                        label: translate('screens/payment', 'Fee'),
                        text: user?.paymentLink?.config?.fee?.toString(),
                      },
                      {
                        label: translate('screens/payment', 'Payment timeout (seconds)'),
                        text: user?.paymentLink?.config?.paymentTimeout?.toString(),
                      },
                    ].filter((item) => item.text) as any
                  }
                  expansionContent={
                    <StyledButton
                      label={translate('screens/payment', 'Edit configuration')}
                      onClick={() => setUpdateGlobalConfig(true)}
                      color={StyledButtonColor.STURDY_WHITE}
                      width={StyledButtonWidth.FULL}
                    />
                  }
                />
              </StyledDataTable>
              {paymentLinks.map((link) => {
                return (
                  <div key={link.id} ref={(el) => paymentLinkRefs.current && (paymentLinkRefs.current[link.id] = el)}>
                    <StyledCollapsible
                      full
                      isExpanded={expandedPaymentLinkId ? expandedPaymentLinkId === link.id : undefined}
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
                              expansionItems={
                                [
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
                                        link.recipient?.website?.startsWith('http://') ||
                                        link.recipient?.website?.startsWith('https://')
                                          ? link.recipient?.website
                                          : `https://${link.recipient?.website}`;

                                      window.open(url, '_blank');
                                    },
                                  },
                                ].filter((item) => item.text) as any
                              }
                              expansionContent={
                                <StyledButton
                                  label={translate('screens/payment', 'Edit recipient')}
                                  onClick={() =>
                                    setShowPaymentLinkForm({
                                      step: PaymentLinkFormStep.RECIPIENT,
                                      paymentLinkId: link.id,
                                    })
                                  }
                                  color={StyledButtonColor.STURDY_WHITE}
                                  width={StyledButtonWidth.FULL}
                                />
                              }
                            >
                              {link.recipient.name && <p>{link.recipient.name}</p>}
                            </StyledDataTableExpandableRow>
                          )}
                          {link.payment != null && (
                            <StyledDataTableExpandableRow
                              label={translate('screens/payment', 'Payment')}
                              isExpanded={expandedPaymentLinkId ? expandedPaymentLinkId === link.id : undefined}
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
                          {link.config != null && (
                            <StyledDataTableExpandableRow
                              label={translate('screens/payment', 'Configuration')}
                              expansionItems={
                                [
                                  {
                                    label: translate('screens/payment', 'Payment standards'),
                                    text: toConfigStandards(link.config.standards, link.config.blockchains).join('\n'),
                                  },
                                  {
                                    label: translate('screens/payment', 'Min. completion status'),
                                    text:
                                      link.config.minCompletionStatus &&
                                      translate(
                                        'screens/payment',
                                        PaymentQuoteStatusLabels[link.config.minCompletionStatus],
                                      ),
                                  },
                                  {
                                    label: translate('screens/payment', 'Display QR code'),
                                    text: link.config.displayQr?.toString(),
                                  },
                                  {
                                    label: translate('screens/payment', 'Fee'),
                                    text: link.config.fee?.toString(),
                                  },
                                  {
                                    label: translate('screens/payment', 'Payment timeout (seconds)'),
                                    text: link.config.paymentTimeout?.toString(),
                                  },
                                ].filter((item) => item.text) as any
                              }
                              expansionContent={
                                <StyledButton
                                  label={translate('screens/payment', 'Edit configuration')}
                                  onClick={() =>
                                    setShowPaymentLinkForm({
                                      step: PaymentLinkFormStep.CONFIG,
                                      paymentLinkId: link.id,
                                    })
                                  }
                                  color={StyledButtonColor.STURDY_WHITE}
                                  width={StyledButtonWidth.FULL}
                                />
                              }
                            />
                          )}
                        </StyledDataTable>
                        <div className="flex w-full items-center justify-center">
                          <div className="w-48 py-3">
                            <QrBasic data={Lnurl.prependLnurl(link.lnurl)} />
                          </div>
                        </div>
                        {link.status === PaymentLinkStatus.ACTIVE &&
                          (!link.payment || link.payment.status !== PaymentLinkPaymentStatus.PENDING) && (
                            <StyledButton
                              label={translate('screens/payment', 'Create payment')}
                              onClick={() =>
                                setShowPaymentLinkForm({ step: PaymentLinkFormStep.PAYMENT, paymentLinkId: link.id })
                              }
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
              onClick={() => setShowPaymentLinkForm({ step: PaymentLinkFormStep.ROUTE })}
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

enum PaymentLinkFormStep {
  ROUTE,
  RECIPIENT,
  PAYMENT,
  CONFIG,
  DONE,
}

interface PaymentLinkFormState {
  step: PaymentLinkFormStep;
  paymentLinkId?: string;
  prefilledData?: any;
}

interface PaymentLinkFormProps {
  state: PaymentLinkFormState;
  setStep: (title: PaymentLinkFormStep) => void;
  onClose: (id?: string) => void;
  onSubmit?: (data: any) => Promise<void>;
}

const PaymentLinkFormStepToTitle = {
  [PaymentLinkFormStep.ROUTE]: 'Route',
  [PaymentLinkFormStep.RECIPIENT]: 'Recipient',
  [PaymentLinkFormStep.PAYMENT]: 'Payment',
  [PaymentLinkFormStep.CONFIG]: 'Configuration',
  [PaymentLinkFormStep.DONE]: 'Summary',
};

const filterPaymentStandards = (standards?: any) =>
  standards?.filter(
    (item: PaymentStandardType) =>
      Object.values(PaymentStandardType).includes(item) && item !== PaymentStandardType.PAY_TO_ADDRESS,
  );

const filterBlockchains = (blockchains?: any) =>
  blockchains?.filter((item: Blockchain) => Object.values(Blockchain).includes(item) && item !== Blockchain.LIGHTNING);

const fromConfigStandards = (configStandards: ConfigStandard[]) => {
  const standards = filterPaymentStandards(configStandards);
  const blockchains = filterBlockchains(configStandards);
  if (blockchains.length > 0) standards.push(PaymentStandardType.PAY_TO_ADDRESS);

  return { standards, blockchains };
};

const toConfigStandards = (standards?: PaymentStandardType[], blockchains?: Blockchain[]) => {
  return filterPaymentStandards(standards)?.concat(filterBlockchains(blockchains));
};

function PaymentLinkForm({
  state: { step, paymentLinkId, prefilledData },
  setStep,
  onClose,
  onSubmit: onSubmitForm,
}: PaymentLinkFormProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const { translate, translateError } = useSettingsContext();
  const { createPaymentLink, createPaymentLinkPayment, updatePaymentLink } = usePaymentRoutesContext();
  const { currencies } = useFiatContext();
  const { getCountries } = useCountry();
  const { paymentRoutes, paymentLinks } = usePaymentRoutesContext();

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
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: {
      paymentExpiryDate: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const data = watch();

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCountryLoading(false));
  }, []);

  useEffect(() => {
    if (paymentLinkId) {
      const paymentLink = paymentLinks?.find((link) => link.id === paymentLinkId);

      const prefilledRecipientData = paymentLink?.recipient;
      if (prefilledRecipientData && countries) {
        const prefilledCountry = countries.find(
          (country) => country.symbol === prefilledRecipientData.address?.country,
        );
        reset({
          recipientName: prefilledRecipientData.name,
          recipientStreet: prefilledRecipientData.address?.street,
          recipientHouseNumber: prefilledRecipientData.address?.houseNumber,
          recipientZip: prefilledRecipientData.address?.zip,
          recipientCity: prefilledRecipientData.address?.city,
          recipientCountry: prefilledCountry,
          recipientPhone: prefilledRecipientData.phone,
          recipientEmail: prefilledRecipientData.mail,
          recipientWebsite: prefilledRecipientData.website,
        });
      }

      const prefilledPaymentConfig = paymentLink?.config;
      if (prefilledPaymentConfig) {
        reset({
          configStandards: toConfigStandards(prefilledPaymentConfig.standards, prefilledPaymentConfig.blockchains),
          configMinCompletionStatus: prefilledPaymentConfig.minCompletionStatus,
          configDisplayQr: prefilledPaymentConfig.displayQr,
          configFee: prefilledPaymentConfig.fee,
          configPaymentTimeout: prefilledPaymentConfig.paymentTimeout,
        });
      }
    } else if (prefilledData) {
      reset(prefilledData);
    }
  }, [paymentLinks, countries]);

  useEffect(() => {
    const maxIdRoute = paymentRoutes?.sell.reduce((prev, current) => (prev.id < current.id ? prev : current));
    if (maxIdRoute) setValue('routeId', routeToRouteIdSelectData(maxIdRoute));
  }, [paymentRoutes]);

  useEffect(() => {
    setError(undefined);
  }, [step]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      const request: any = {};

      if (data.routeId || data.externalId) {
        request.routeId = data.routeId ? +data.routeId.id : undefined;
        request.externalId = data.externalId ? data.externalId : undefined;
      }

      if (hasRecipientData) {
        request.config = {};
        request.config.recipient = {
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
        };
      }

      if (hasPaymentData) {
        request.payment = {
          mode: data.paymentMode,
          amount: +data.paymentAmount,
          externalId: data.paymentExternalId,
          currency: data.paymentCurrency.name,
          expiryDate: data.paymentExpiryDate,
        };
      }

      if (hasConfigData) {
        const { standards, blockchains } = fromConfigStandards(data.configStandards);

        request.config = {
          ...request.config,
          standards: standards,
          blockchains: blockchains,
          minCompletionStatus: data.configMinCompletionStatus,
          displayQr: data.configDisplayQr,
          fee: data.configFee,
          paymentTimeout: data.configPaymentTimeout,
        };
      }

      if (onSubmitForm) {
        await onSubmitForm(request);
        setIsLoading(false);
        onClose();
        reset();
        return;
      }

      switch (step) {
        case PaymentLinkFormStep.RECIPIENT:
        case PaymentLinkFormStep.CONFIG:
          if (!paymentLinkId) break;
          await updatePaymentLink(request, paymentLinkId);
          break;
        case PaymentLinkFormStep.PAYMENT:
          if (!paymentLinkId) break;
          await createPaymentLinkPayment(request.payment, paymentLinkId);
          break;
        default:
          const newPaymentLink = await createPaymentLink(request);
          paymentLinkId = newPaymentLink?.id;
          break;
      }

      onClose(paymentLinkId);
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
  const hasConfigData = Boolean(
    data.configStandards?.length ||
      data.configMinCompletionStatus ||
      data.configDisplayQr !== undefined ||
      data.configFee !== undefined ||
      data.configPaymentTimeout !== undefined,
  );

  const skipRecipientData = Boolean(!hasRecipientData && step === PaymentLinkFormStep.RECIPIENT);
  const skipPaymentData = Boolean(!hasPaymentData && step === PaymentLinkFormStep.PAYMENT);
  const skipConfigData = Boolean(!hasConfigData && step === PaymentLinkFormStep.CONFIG);

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
          {step === PaymentLinkFormStep.ROUTE && (
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
          {step === PaymentLinkFormStep.RECIPIENT && (
            <StyledVerticalStack gap={2} full>
              <StyledInput
                name="recipientName"
                autocomplete="name"
                label={translate('screens/kyc', 'Name')}
                placeholder={translate('screens/kyc', 'John Doe')}
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
                placeholder={
                  isCountryLoading
                    ? translate('screens/payment', 'Loading countries...')
                    : translate('general/actions', 'Select...')
                }
                items={countries ?? []}
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
          )}
          {step === PaymentLinkFormStep.PAYMENT && (
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

              <StyledDateAndTimePicker
                name="paymentExpiryDate"
                label={translate('screens/payment', 'Expires at')}
                smallLabel
              />
            </>
          )}
          {step === PaymentLinkFormStep.CONFIG && (
            <>
              <StyledDropdownMultiChoice<ConfigStandard>
                rootRef={rootRef}
                name="configStandards"
                label={translate('screens/payment', 'Payment standards')}
                smallLabel
                full
                placeholder={translate('general/actions', 'Select...')}
                items={[
                  ...filterPaymentStandards(Object.values(PaymentStandardType)),
                  ...filterBlockchains(Object.values(Blockchain)),
                ]}
                labelFunc={(item) => item}
              />

              <StyledDropdown
                rootRef={rootRef}
                name="configMinCompletionStatus"
                label={translate('screens/payment', 'Min. completion status')}
                smallLabel
                full
                placeholder={translate('general/actions', 'Select...')}
                items={Object.values(PaymentQuoteStatus)}
                labelFunc={(item) => translate('screens/payment', PaymentQuoteStatusLabels[item])}
              />

              <StyledInput
                type="number"
                name="configFee"
                label={translate('screens/payment', 'Fee')}
                smallLabel
                placeholder={'0.002'}
                full
              />

              <StyledInput
                type="number"
                name="configPaymentTimeout"
                label={translate('screens/payment', 'Payment timeout (seconds)')}
                smallLabel
                placeholder={'60'}
                full
              />

              <StyledDropdown
                rootRef={rootRef}
                name="configDisplayQr"
                label={translate('screens/payment', 'Display QR code')}
                smallLabel
                full
                placeholder={translate('general/actions', 'Select...')}
                items={[true, false]}
                labelFunc={(item) => translate('general/actions', item ? 'Yes' : 'No')}
              />
            </>
          )}
          {step === PaymentLinkFormStep.DONE && (
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
                  label={translate('screens/payment', 'Configuration')}
                  isExpanded={hasConfigData}
                  discreet={!hasConfigData}
                  expansionItems={[
                    {
                      label: translate('screens/payment', 'Payment standards'),
                      text: data.configStandards?.toString() ?? naString,
                    },
                    {
                      label: translate('screens/payment', 'Min. completion status'),
                      text: data.configMinCompletionStatus
                        ? translate('screens/payment', PaymentQuoteStatusLabels[data.configMinCompletionStatus])
                        : naString,
                    },
                    {
                      label: translate('screens/payment', 'Display QR code'),
                      text:
                        data.configDisplayQr !== undefined
                          ? translate('general/actions', data.configDisplayQr ? 'Yes' : 'No')
                          : naString,
                    },
                    { label: translate('screens/payment', 'Fee'), text: data.configFee?.toString() ?? naString },
                    {
                      label: translate('screens/payment', 'Payment timeout (seconds)'),
                      text: data.configPaymentTimeout?.toString() ?? naString,
                    },
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

          {step === PaymentLinkFormStep.DONE || paymentLinkId || prefilledData ? (
            <div className="flex flex-col w-full gap-4">
              {(paymentLinkId || prefilledData) && (
                <StyledButton
                  type="submit"
                  label={translate('general/actions', 'Cancel')}
                  onClick={() => onClose()}
                  width={StyledButtonWidth.FULL}
                  color={StyledButtonColor.STURDY_WHITE}
                />
              )}
              <StyledButton
                label={translate('general/actions', paymentLinkId || prefilledData ? 'Save' : 'Create')}
                onClick={handleSubmit(onSubmit)}
                width={StyledButtonWidth.FULL}
                isLoading={isLoading}
                disabled={!isValid}
              />
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              {(skipPaymentData || skipRecipientData || skipConfigData) && (
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
                      ...(!hasConfigData && {
                        configStandards: undefined,
                        configMinCompletionStatus: undefined,
                        configDisplayQr: undefined,
                        configFee: undefined,
                        configPaymentTimeout: undefined,
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
                disabled={skipPaymentData || skipRecipientData || skipConfigData}
              />
            </div>
          )}
        </StyledVerticalStack>
      </Form>
    </>
  );
}
