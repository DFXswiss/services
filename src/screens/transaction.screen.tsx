import {
  ApiError,
  CryptoPaymentMethod,
  DetailTransaction,
  ExportFormat,
  FiatPaymentMethod,
  PdfDocument,
  SupportIssueReason,
  SupportIssueType,
  Transaction,
  TransactionFailureReason,
  TransactionRefundData,
  TransactionState,
  TransactionTarget,
  TransactionType,
  UserAddress,
  Utils,
  Validations,
  useBankAccountContext,
  useSessionContext,
  useTransaction,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconVariant,
  CopyButton,
  DfxAssetIcon,
  DfxIcon,
  Form,
  IconSize,
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
  StyledIconButton,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useParams } from 'react-router-dom';
import CoinTracking from 'src/components/cointracking';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useWindowContext } from 'src/contexts/window.context';
import { ErrorHint } from '../components/error-hint';
import { PaymentFailureReasons, PaymentMethodLabels, toPaymentStateLabel } from '../config/labels';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useBlockchain } from '../hooks/blockchain.hook';
import { useUserGuard } from '../hooks/guard.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress, openPdfFromString } from '../util/utils';

export enum ExportType {
  COMPACT = 'Compact',
  COIN_TRACKING = 'CoinTracking',
  CHAIN_REPORT = 'ChainReport',
}

export default function TransactionScreen(): JSX.Element {
  const { id } = useParams();
  const { user } = useUserContext();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { getTransactionCsv, getTransactionHistory } = useTransaction();
  const rootRef = useRef<HTMLDivElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCoinTracking, setShowCoinTracking] = useState(false);
  const [isCsvLoading, setIsCsvLoading] = useState<ExportType>();
  const [error, setError] = useState<string>();

  const isTransaction = id && id.startsWith('T');
  const isRefund = isTransaction && pathname.includes('/refund');

  async function exportCsv(type: ExportType) {
    if (!user) return;

    try {
      setIsCsvLoading(type);
      switch (type) {
        case ExportType.COMPACT:
          await getTransactionCsv().then((url) => window.open(url, '_blank'));
          break;
        case ExportType.COIN_TRACKING:
        case ExportType.CHAIN_REPORT:
          await getTransactionHistory(type, {
            userAddress: user.activeAddress?.address,
            format: ExportFormat.CSV,
          }).then((response) => {
            const blob = new Blob([response], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            window.open(url, '_blank');
          });
      }
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsCsvLoading(undefined);
      setShowExportMenu(false);
    }
  }

  const title = isRefund
    ? translate('screens/payment', 'Transaction refund')
    : isTransaction
    ? translate('screens/payment', 'Transaction status')
    : showCoinTracking
    ? translate('screens/payment', 'Cointracking Link (read rights)')
    : translate('screens/payment', 'Transactions');

  const onBack =
    isTransaction || isRefund || error
      ? () => {
          setError(undefined);
          navigate('/tx');
        }
      : showCoinTracking
      ? () => setShowCoinTracking(false)
      : undefined;

  useLayoutOptions({ title, onBack });

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isRefund ? (
        <TransactionRefund setError={setError} />
      ) : isTransaction ? (
        <TransactionStatus setError={setError} />
      ) : showCoinTracking ? (
        <CoinTracking rootRef={rootRef} />
      ) : (
        <>
          <StyledButton
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            label={translate('screens/payment', 'Cointracking')}
            onClick={() => setShowCoinTracking(!showCoinTracking)}
          />
          <StyledButton
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            label={translate('screens/payment', 'Export CSV')}
            icon={showExportMenu ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE}
            iconAfterLabel
            onClick={() => setShowExportMenu((prev) => !prev)}
          />
          {!!showExportMenu && (
            <StyledVerticalStack full gap={2} className="border-2 rounded-md border-dfxGray-300 p-2">
              <StyledButton
                color={StyledButtonColor.WHITE}
                width={StyledButtonWidth.FULL}
                label={translate('screens/payment', 'Compact')}
                isLoading={isCsvLoading === ExportType.COMPACT}
                onClick={() => exportCsv(ExportType.COMPACT)}
              />
              <StyledButton
                color={StyledButtonColor.WHITE}
                width={StyledButtonWidth.FULL}
                label={translate('screens/payment', 'CoinTracking')}
                isLoading={isCsvLoading === ExportType.COIN_TRACKING}
                onClick={() => exportCsv(ExportType.COIN_TRACKING)}
                hidden={!user?.activeAddress}
              />
              <StyledButton
                color={StyledButtonColor.WHITE}
                width={StyledButtonWidth.FULL}
                label={translate('screens/payment', 'Chain-Report')}
                isLoading={isCsvLoading === ExportType.CHAIN_REPORT}
                onClick={() => exportCsv(ExportType.CHAIN_REPORT)}
                hidden={!user?.activeAddress}
              />
            </StyledVerticalStack>
          )}

          <TransactionList isSupport={false} setError={setError} />
        </>
      )}
    </>
  );
}

interface TransactionStatusProps {
  setError: (error: string) => void;
}

function TransactionStatus({ setError }: TransactionStatusProps): JSX.Element {
  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { id } = useParams();
  const { getTransactionByUid } = useTransaction();
  const { isLoggedIn } = useSessionContext();
  const { setRedirectPath } = useAppHandlingContext();

  const [transaction, setTransaction] = useState<Transaction>();

  useEffect(() => {
    const fetchTransaction = () => {
      if (id && transaction?.state !== TransactionState.COMPLETED && transaction?.state !== TransactionState.RETURNED) {
        getTransactionByUid(id)
          .then(setTransaction)
          .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
      }
    };

    fetchTransaction();
    const interval = setInterval(fetchTransaction, 10000);

    return () => clearInterval(interval);
  }, [id, transaction?.state]);

  function handleTransactionNavigation(path: string) {
    if (!transaction) return;

    if (isLoggedIn) {
      navigate(path);
    } else {
      setRedirectPath(path);
      navigate('/login');
    }
  }

  return transaction ? (
    <StyledVerticalStack gap={6} full>
      <TxInfo tx={transaction} showUserDetails={false} />

      <StyledVerticalStack gap={4} full>
        {transaction.state === TransactionState.UNASSIGNED && (
          <StyledButton
            label={translate('screens/payment', 'Assign transaction')}
            onClick={() => handleTransactionNavigation(`/tx/${transaction.id}/assign`)}
            width={StyledButtonWidth.FULL}
          />
        )}
        {[
          TransactionState.FAILED,
          TransactionState.CHECK_PENDING,
          TransactionState.KYC_REQUIRED,
          TransactionState.LIMIT_EXCEEDED,
          TransactionState.UNASSIGNED,
        ].includes(transaction.state) &&
          ![TransactionFailureReason.BANK_RELEASE_PENDING].includes(transaction.reason) &&
          !transaction.chargebackAmount && (
            <>
              <StyledButton
                label={translate(
                  'general/actions',
                  transaction.state === TransactionState.FAILED ? 'Confirm refund' : 'Request refund',
                )}
                onClick={() => handleTransactionNavigation(`/tx/${transaction.uid}/refund`)}
              />
              <StyledButton
                label={translate('general/actions', 'Create support ticket')}
                onClick={() => handleTransactionNavigation('/support/issue?issue-type=TransactionIssue')}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </>
          )}
      </StyledVerticalStack>
    </StyledVerticalStack>
  ) : (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  );
}

interface RefundDetails extends TransactionRefundData {
  refundTarget?: string;
}

interface FormData {
  address: UserAddress;
  iban: string;
}

interface TransactionRefundProps {
  setError: (error: string) => void;
}

const AddAccount = 'Add bank account';

function TransactionRefund({ setError }: TransactionRefundProps): JSX.Element {
  useUserGuard('/login');

  const { id } = useParams();
  const { state } = useLocation();
  const { width } = useWindowContext();
  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { user, userAddresses } = useUserContext();
  const { rootRef } = useLayoutContext();
  const { bankAccounts } = useBankAccountContext();
  const { isLoggedIn } = useSessionContext();
  const { getTransactionByUid, getTransactionRefund, setTransactionRefundTarget } = useTransaction();
  const refetchTimeout = useRef<NodeJS.Timeout | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [refundDetails, setRefundDetails] = useState<RefundDetails>();
  const [transaction, setTransaction] = useState<Transaction>();
  const [addresses, setAddresses] = useState<UserAddress[]>();

  const isBuy = transaction?.type === TransactionType.BUY;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({ mode: 'onTouched', defaultValues: { iban: state?.newIban } });

  const selectedIban = useWatch({ control, name: 'iban' });

  useEffect(() => {
    if (id && !transaction && isLoggedIn) {
      getTransactionByUid(id)
        .then(setTransaction)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
    }
  }, [id, transaction, isLoggedIn]);

  useEffect(() => {
    async function fetchRefund(txId: number) {
      getTransactionRefund(txId)
        .then((response) => {
          setRefundDetails(response);
          if (transaction?.id && response.expiryDate) {
            const timeout = new Date(response.expiryDate).getTime() - Date.now();
            if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
            refetchTimeout.current = setTimeout(() => fetchRefund(txId), timeout > 0 ? timeout : 0);
          }
        })
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
    }

    if (transaction?.id) fetchRefund(transaction.id);

    return () => refetchTimeout.current && clearTimeout(refetchTimeout.current);
  }, [transaction]);

  useEffect(() => {
    if (transaction && user) {
      const allowedAddresses = userAddresses.filter(
        (a) => transaction?.inputBlockchain && a.blockchains.includes(transaction?.inputBlockchain),
      );
      setAddresses(allowedAddresses);
      if (allowedAddresses?.length === 1) setValue('address', allowedAddresses[0]);
    }
  }, [transaction, user]);

  async function onSubmit(data: FormData) {
    if (!transaction?.id) return;
    setIsLoading(true);

    try {
      await setTransactionRefundTarget(transaction.id, {
        refundTarget: refundDetails?.refundTarget ?? data.address?.address ?? data.iban,
      });
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
      navigate('/tx');
    }
  }

  const rules = Utils.createRules({
    address: Validations.Required,
    iban: Validations.Required,
  });

  return selectedIban === AddAccount ? (
    <AddBankAccount
      onSubmit={(account) => setValue('iban', account.iban)}
      confirmationText={translate(
        'screens/iban',
        'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
      )}
    />
  ) : refundDetails && transaction ? (
    <StyledVerticalStack gap={6} full>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'Transaction amount')}>
          <p>
            {refundDetails.inputAmount} {refundDetails.inputAsset.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Bank fee')}>
          <p>
            {refundDetails.fee.bank} {refundDetails.refundAsset.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Network fee')}>
          <p>
            {refundDetails.fee.network} {refundDetails.refundAsset.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow
          label={translate('screens/payment', 'Refund amount')}
          infoText={translate('screens/payment', 'Refund amount is the transaction amount minus the fee.')}
        >
          <p>
            {refundDetails.refundAmount} {refundDetails.refundAsset.name}
          </p>
        </StyledDataTableRow>
        {refundDetails.refundTarget && (
          <StyledDataTableRow label={translate('screens/payment', 'Recipient')}>
            <p>{blankedAddress(refundDetails.refundTarget, { width })}</p>
          </StyledDataTableRow>
        )}
      </StyledDataTable>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack gap={6} full>
          {!refundDetails.refundTarget && addresses && !isBuy && (
            <StyledDropdown<UserAddress>
              name="address"
              rootRef={rootRef}
              label={translate('screens/payment', 'Chargeback address')}
              items={addresses}
              labelFunc={(item) => blankedAddress(item.address, { width })}
              descriptionFunc={(_item) => transaction.inputBlockchain?.toString() ?? ''}
              full
            />
          )}
          {!refundDetails.refundTarget &&
            transaction.inputPaymentMethod !== FiatPaymentMethod.CARD &&
            bankAccounts &&
            isBuy && (
              <StyledDropdown<string>
                rootRef={rootRef}
                name="iban"
                label={translate('screens/payment', 'Chargeback IBAN')}
                items={[...bankAccounts.map((b) => b.iban), AddAccount]}
                labelFunc={(item) =>
                  item === AddAccount ? translate('general/actions', item) : Utils.formatIban(item) ?? ''
                }
                descriptionFunc={(item) => bankAccounts.find((b) => b.iban === item)?.label ?? ''}
                placeholder={translate('general/actions', 'Select') + '...'}
                forceEnable
                full
              />
            )}
          <StyledButton
            type="submit"
            label={translate(
              'general/actions',
              transaction.state === TransactionState.FAILED ? 'Confirm refund' : 'Request refund',
            )}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      </Form>
    </StyledVerticalStack>
  ) : (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  );
}

interface TransactionListProps extends TransactionStatusProps {
  isSupport: boolean;
  onSelectTransaction?: (txUid: string) => void;
}

export function TransactionList({ isSupport, setError, onSelectTransaction }: TransactionListProps): JSX.Element {
  useUserGuard('/login');

  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { getDetailTransactions, getUnassignedTransactions, getTransactionTargets, setTransactionTarget } =
    useTransaction();
  const { isLoggedIn } = useSessionContext();
  const { id } = useParams();
  const { toString } = useBlockchain();
  const { pathname } = useLocation();
  const { rootRef } = useLayoutContext();
  const { getTransactionInvoice, getTransactionReceipt } = useTransaction();

  const { width } = useWindowContext();
  const txRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [transactions, setTransactions] = useState<Record<string, DetailTransaction[]>>();
  const [transactionTargets, setTransactionTargets] = useState<TransactionTarget[]>();
  const [isTargetsLoading, setIsTargetsLoading] = useState(false);
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [editTransaction, setEditTransaction] = useState<number>();
  const [isInvoiceLoading, setIsInvoiceLoading] = useState<number>();
  const [isReceiptLoading, setIsReceiptLoading] = useState<number>();

  useEffect(() => {
    if (id) setTimeout(() => txRefs.current[id]?.scrollIntoView());
  }, [id, transactions]);

  useEffect(() => {
    if (isLoggedIn)
      loadTransactions().then(() => {
        if (id && pathname.includes('/assign')) assignTransaction(+id);
      });
  }, [isLoggedIn]);

  function loadTransactions(): Promise<void> {
    setTransactions(undefined);

    return Promise.all([getDetailTransactions(), getUnassignedTransactions()])
      .then((tx) => {
        const list = tx.flat().sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1)) as DetailTransaction[];
        const map = list.reduce((map, tx) => {
          const date = new Date(tx.date);
          const key = `${date.getFullYear()} - ${date.getMonth() + 1}`;
          map[key] = (map[key] ?? []).concat(tx);
          return map;
        }, {} as Record<string, DetailTransaction[]>);
        setTransactions(map);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid, errors },
  } = useForm<{ target: TransactionTarget }>();

  const rules = Utils.createRules({
    target: Validations.Required,
  });

  async function assignTransaction(txId: number) {
    if (!transactionTargets) {
      setIsTargetsLoading(true);
      await getTransactionTargets()
        .then((targets) => {
          setTransactionTargets(targets);
          if (targets.length === 1) setValue('target', targets[0]);
        })
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsTargetsLoading(false));
    }

    setEditTransaction(txId);
  }

  async function submitAssignment({ target }: { target: TransactionTarget }) {
    if (!editTransaction) return;

    setIsTransactionLoading(true);
    setTransactionTarget(editTransaction, target.id)
      .then(() => {
        loadTransactions();
        setEditTransaction(undefined);
        reset();
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsTransactionLoading(false));
  }

  const transactionList = transactions && Object.entries(transactions);

  return (
    <StyledVerticalStack gap={4} full center>
      <StyledButton
        label={translate('screens/payment', 'My transaction is missing')}
        onClick={() =>
          navigate(
            `/support/issue?issue-type=${SupportIssueType.TRANSACTION_ISSUE}&reason=${SupportIssueReason.TRANSACTION_MISSING}`,
          )
        }
        width={StyledButtonWidth.FULL}
        color={StyledButtonColor.BLUE}
      />
      <StyledVerticalStack full center className="pt-2.5">
        <div className="relative w-full">
          <h2 className="text-dfxGray-700 mb-2 flex-1">{translate('screens/payment', 'Your Transactions')}</h2>

          {transactions && (
            <div className="absolute right-0 top-1">
              <StyledIconButton onClick={loadTransactions} icon={IconVariant.RELOAD} />
            </div>
          )}
        </div>

        {transactionList ? (
          transactionList.length === 0 ? (
            <p className="text-dfxGray-700">{translate('screens/payment', 'No transactions found')}</p>
          ) : (
            transactionList.map(([date, list]) => (
              <div key={date} className="w-full mb-2">
                <p className="text-dfxGray-700">{date}</p>
                <StyledVerticalStack gap={2} full>
                  {list.map((tx) => {
                    const isUnassigned = tx.state === TransactionState.UNASSIGNED;

                    const icon = isUnassigned
                      ? undefined
                      : ((tx.type === TransactionType.SELL
                          ? [tx.inputAsset, tx.outputAsset]
                          : [tx.outputAsset, tx.inputAsset]
                        ).find((a) =>
                          Object.values(AssetIconVariant).find((icon) => a === icon || a?.replace(/^d/, '') === icon),
                        ) as AssetIconVariant | undefined);

                    return (
                      <div
                        key={tx.uid}
                        ref={(el) => {
                          if (txRefs.current) {
                            tx.id && (txRefs.current[tx.id] = el);
                            txRefs.current[tx.uid] = el;
                          }
                        }}
                      >
                        <StyledCollapsible
                          full
                          isExpanded={id ? [`${tx.id}`, tx.uid].includes(id) : undefined}
                          titleContent={
                            <div className="flex flex-row gap-2 items-center">
                              {icon ? (
                                <DfxAssetIcon asset={icon} />
                              ) : (
                                <DfxIcon icon={IconVariant.HELP} size={IconSize.LG} />
                              )}
                              <div className="flex flex-col items-start text-left">
                                <div className="font-bold leading-none">{translate('screens/payment', tx.type)}</div>
                                <div className={`leading-none ${isUnassigned && 'text-dfxRed-100'}`}>
                                  {translate('screens/payment', toPaymentStateLabel(tx.state))}
                                </div>
                              </div>
                              <div className="ml-auto">
                                {tx.inputAsset ? `${tx.inputAmount ?? ''} ${tx.inputAsset}` : ''}
                                {tx.inputAsset && tx.outputAsset ? ' → ' : ''}
                                {tx.outputAsset ? `${tx.outputAmount ?? ''} ${tx.outputAsset}` : ''}
                              </div>
                            </div>
                          }
                        >
                          <StyledVerticalStack full gap={4}>
                            <TxInfo tx={tx} showUserDetails={true} />

                            {isUnassigned &&
                              (editTransaction === tx.id ? (
                                <Form
                                  control={control}
                                  errors={errors}
                                  rules={rules}
                                  onSubmit={handleSubmit(submitAssignment)}
                                >
                                  <StyledVerticalStack gap={3} full>
                                    <p className="text-dfxGray-700 mt-4">{translate('screens/payment', 'Reference')}</p>
                                    <StyledDropdown<TransactionTarget>
                                      rootRef={rootRef}
                                      items={transactionTargets ?? []}
                                      labelFunc={(item) => `${item.bankUsage}`}
                                      placeholder={translate('general/actions', 'Select') + '...'}
                                      descriptionFunc={(item) =>
                                        `${toString(item.asset.blockchain)}/${item.asset.name} ${blankedAddress(
                                          item.address,
                                          { width },
                                        )}`
                                      }
                                      full
                                      name="target"
                                    />
                                    <StyledButton
                                      type="submit"
                                      isLoading={isTransactionLoading}
                                      disabled={!isValid}
                                      label={translate('screens/payment', 'Assign transaction')}
                                      onClick={handleSubmit(submitAssignment)}
                                    />
                                  </StyledVerticalStack>
                                </Form>
                              ) : (
                                <StyledButton
                                  isLoading={isTargetsLoading}
                                  label={translate('screens/payment', 'Assign transaction')}
                                  onClick={() => tx.id && assignTransaction(tx.id)}
                                />
                              ))}
                            <StyledButton
                              label={translate('screens/payment', 'Show on block explorer')}
                              onClick={() => window.open(tx.outputTxUrl, '_blank', 'noreferrer')}
                              hidden={!tx.outputTxUrl}
                            />
                            <StyledButton
                              label={translate('general/actions', 'Open invoice')}
                              onClick={() => {
                                if (!tx.id) return;

                                setIsInvoiceLoading(tx.id);
                                getTransactionInvoice(tx.id)
                                  .then((response: PdfDocument) => {
                                    openPdfFromString(response.pdfData);
                                  })
                                  .finally(() => setIsInvoiceLoading(undefined));
                              }}
                              hidden={tx.state !== TransactionState.COMPLETED}
                              isLoading={isInvoiceLoading === tx.id}
                              color={StyledButtonColor.STURDY_WHITE}
                            />
                            <StyledButton
                              label={translate('general/actions', 'Open receipt')}
                              onClick={() => {
                                if (!tx.id) return;

                                setIsReceiptLoading(tx.id);
                                getTransactionReceipt(tx.id)
                                  .then((response: PdfDocument) => {
                                    openPdfFromString(response.pdfData);
                                  })
                                  .finally(() => setIsReceiptLoading(undefined));
                              }}
                              hidden={tx.state !== TransactionState.COMPLETED}
                              isLoading={isReceiptLoading === tx.id}
                              color={StyledButtonColor.STURDY_WHITE}
                            />
                            <StyledButton
                              label={translate(
                                'general/actions',
                                tx.state === TransactionState.FAILED ? 'Confirm refund' : 'Request refund',
                              )}
                              color={StyledButtonColor.STURDY_WHITE}
                              onClick={() => navigate(`/tx/${tx.uid}/refund`)}
                              hidden={
                                ![
                                  TransactionState.FAILED,
                                  TransactionState.CHECK_PENDING,
                                  TransactionState.KYC_REQUIRED,
                                  TransactionState.LIMIT_EXCEEDED,
                                  TransactionState.UNASSIGNED,
                                ].includes(tx.state) ||
                                [TransactionFailureReason.BANK_RELEASE_PENDING].includes(tx.reason) ||
                                !!tx.chargebackAmount
                              }
                            />
                            <StyledButton
                              label={translate('screens/kyc', 'Increase limit')}
                              color={StyledButtonColor.STURDY_WHITE}
                              onClick={() => navigate(`/support/issue?issue-type=LimitRequest`)}
                              hidden={tx.state !== TransactionState.LIMIT_EXCEEDED || isSupport}
                            />
                            {tx.state === TransactionState.KYC_REQUIRED && (
                              <StyledButton
                                label={translate('screens/kyc', 'Complete KYC')}
                                onClick={() => navigate('/kyc')}
                              />
                            )}
                            {isSupport && (
                              <StyledButton
                                color={StyledButtonColor.STURDY_WHITE}
                                label={translate('general/actions', 'Select')}
                                onClick={() => onSelectTransaction && onSelectTransaction(tx.uid)}
                              />
                            )}
                          </StyledVerticalStack>
                        </StyledCollapsible>
                      </div>
                    );
                  })}
                </StyledVerticalStack>
              </div>
            ))
          )
        ) : (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        )}
      </StyledVerticalStack>
    </StyledVerticalStack>
  );
}

interface TxInfoProps {
  tx: DetailTransaction;
  showUserDetails: boolean;
}

export function TxInfo({ tx, showUserDetails }: TxInfoProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();
  const { user } = useUserContext();

  const paymentMethod = [tx.inputPaymentMethod, tx.outputPaymentMethod].find(
    (p) => p !== CryptoPaymentMethod.CRYPTO,
  ) as FiatPaymentMethod;

  const type = tx.type === TransactionType.SELL ? 'sell' : 'buy';
  const exchangeRateInfo = translate(
    `screens/${type}`,
    type === 'buy'
      ? 'Output amount = (Input amount - DFX fee - Network fee) ÷ Base rate.'
      : 'Output amount = Input amount × Base rate - DFX fee - Network fee.',
  );
  const baseRateInfo = tx.priceSteps
    ?.map((step) =>
      translate('screens/payment', '{{from}} to {{to}} at {{price}} {{from}}/{{to}} ({{source}}, {{timestamp}})', {
        source: step.source,
        from: step.from,
        to: step.to,
        price: step.price,
        timestamp: step.timestamp.toLocaleString(),
      }),
    )
    .join('\n');
  const chargebackTarget =
    tx.type === TransactionType.BUY ? Utils.formatIban(tx.chargebackTarget) : tx.chargebackTarget;

  const rateItems = [];
  tx.exchangeRate != null &&
    rateItems.push({
      label: translate('screens/payment', 'Base rate'),
      text: `${tx.exchangeRate} ${tx.inputAsset}/${tx.outputAsset}`,
      infoText: baseRateInfo,
    });
  tx.fees?.dfx != null &&
    rateItems.push({
      label: translate('screens/payment', 'DFX fee'),
      text: `${tx.fees.dfx} ${tx.inputAsset} (${(tx.fees.rate * 100).toFixed(2)}%)`,
    });
  tx.fees?.network != null &&
    rateItems.push({
      label: translate('screens/payment', 'Network fee'),
      text: `${tx.fees.network} ${tx.inputAsset}`,
    });
  tx.fees?.bank != null &&
    rateItems.push({
      label: translate('screens/payment', 'Bank fee'),
      text: `${tx.fees.bank} ${tx.inputAsset}`,
    });
  tx?.fees?.networkStart &&
    rateItems.push({
      label: translate('screens/payment', 'Network start fee'),
      text: `${tx?.fees?.networkStart} ${tx.inputAsset}`,
    });

  return (
    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
      {tx.id && (
        <StyledDataTableRow label={translate('screens/payment', 'ID')}>
          <p>{tx.id}</p>
        </StyledDataTableRow>
      )}
      <StyledDataTableRow label={translate('screens/payment', 'Date')}>
        <p>{new Date(tx.date).toLocaleString()}</p>
      </StyledDataTableRow>
      <StyledDataTableRow label={translate('screens/payment', 'Type')}>
        <p>{translate('screens/payment', tx.type)}</p>
      </StyledDataTableRow>
      <StyledDataTableRow label={translate('screens/payment', 'State')}>
        <p>{translate('screens/payment', toPaymentStateLabel(tx.state))}</p>
      </StyledDataTableRow>
      {tx.reason && (
        <StyledDataTableRow label={translate('screens/payment', 'Failure reason')}>
          <p className="text-right">
            {translate('screens/payment', PaymentFailureReasons[tx.reason])}
            {showUserDetails && tx.reason === TransactionFailureReason.PHONE_VERIFICATION_NEEDED && user?.phone && (
              <>
                <br />({translate('screens/payment', 'we will call you at {{phone}}', { phone: user.phone })})
              </>
            )}
          </p>
        </StyledDataTableRow>
      )}
      {paymentMethod && (
        <StyledDataTableRow label={translate('screens/payment', 'Payment method')}>
          <p className="text-right">{translate('screens/payment', PaymentMethodLabels[paymentMethod])}</p>
        </StyledDataTableRow>
      )}
      {tx.inputAsset && (
        <StyledDataTableRow label={translate('screens/payment', 'Input')}>
          <p>
            {tx.inputAmount ?? ''} {tx.inputAsset}
            {tx.inputBlockchain ? ` (${toString(tx.inputBlockchain)})` : ''}
          </p>
        </StyledDataTableRow>
      )}
      {tx.sourceAccount && (
        <StyledDataTableRow label={translate('screens/payment', 'Input Account')}>
          <p>{blankedAddress(tx.sourceAccount, { width })}</p>
        </StyledDataTableRow>
      )}
      {tx.inputTxId && (
        <StyledDataTableRow label={translate('screens/payment', 'Input TX')}>
          {tx.inputTxUrl ? (
            <StyledLink label={blankedAddress(tx.inputTxId, { width })} url={tx.inputTxUrl} dark />
          ) : (
            <p>{blankedAddress(tx.inputTxId, { width })}</p>
          )}
        </StyledDataTableRow>
      )}
      {tx.outputAsset && ![TransactionState.RETURN_PENDING, TransactionState.RETURNED].includes(tx.state) && (
        <StyledDataTableRow label={translate('screens/payment', 'Output')}>
          <p>
            {tx.outputAmount ?? ''} {tx.outputAsset}
            {tx.outputBlockchain ? ` (${toString(tx.outputBlockchain)})` : ''}
          </p>
        </StyledDataTableRow>
      )}
      {tx.targetAccount && (
        <StyledDataTableRow label={translate('screens/payment', 'Output Account')}>
          <p>{blankedAddress(tx.targetAccount, { width })}</p>
        </StyledDataTableRow>
      )}
      {tx.outputTxId && (
        <StyledDataTableRow label={translate('screens/payment', 'Output TX')}>
          {tx.outputTxUrl ? (
            <StyledLink label={blankedAddress(tx.outputTxId, { width })} url={tx.outputTxUrl} dark />
          ) : (
            <p>{blankedAddress(tx.outputTxId, { width })}</p>
          )}
        </StyledDataTableRow>
      )}
      {tx.rate != null && (
        <StyledDataTableExpandableRow
          label={translate('screens/payment', 'Exchange rate')}
          expansionItems={rateItems}
          infoText={exchangeRateInfo}
          discreet
        >
          <p>
            {tx.rate} {tx.inputAsset}/{tx.outputAsset}
          </p>
        </StyledDataTableExpandableRow>
      )}
      {tx.chargebackAmount && (
        <StyledDataTableRow label={translate('screens/payment', 'Chargeback amount')}>
          <p>
            {tx.chargebackAmount} {tx.chargebackAsset}
          </p>
        </StyledDataTableRow>
      )}
      {chargebackTarget && (
        <StyledDataTableRow
          label={
            tx.type === TransactionType.BUY
              ? translate('screens/payment', 'Chargeback IBAN')
              : translate('screens/payment', 'Chargeback address')
          }
        >
          <p>{blankedAddress(chargebackTarget, { width, scale: 0.65 })}</p>
          <CopyButton onCopy={() => copy(chargebackTarget)} />
        </StyledDataTableRow>
      )}
      {tx.chargeBackTxId && (
        <StyledDataTableRow label={translate('screens/payment', 'Chargeback TX')}>
          {tx.chargeBackTxUrl ? (
            <StyledLink label={blankedAddress(tx.chargeBackTxId, { width })} url={tx.chargeBackTxUrl} dark />
          ) : (
            <p>{blankedAddress(tx.chargeBackTxId, { width })}</p>
          )}
        </StyledDataTableRow>
      )}
      {tx.chargebackDate && (
        <StyledDataTableRow label={translate('screens/payment', 'Chargeback date')}>
          <p>{new Date(tx.chargebackDate).toLocaleString()}</p>
        </StyledDataTableRow>
      )}
    </StyledDataTable>
  );
}
