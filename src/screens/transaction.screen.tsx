import {
  ApiError,
  Asset,
  CryptoPaymentMethod,
  DetailTransaction,
  Fiat,
  FiatPaymentMethod,
  Iban,
  Transaction,
  TransactionState,
  TransactionTarget,
  TransactionType,
  UserAddress,
  Utils,
  Validations,
  useAuthContext,
  useBankAccount,
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
import { UserRole } from '@dfx.swiss/react/dist/definitions/jwt';
import { SupportIssueReason, SupportIssueType } from '@dfx.swiss/react/dist/definitions/support';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useParams } from 'react-router-dom';
import CoinTracking from 'src/components/cointracking';
import { useWindowContext } from 'src/contexts/window.context';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { PaymentFailureReasons, PaymentMethodLabels, toPaymentStateLabel } from '../config/labels';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useBlockchain } from '../hooks/blockchain.hook';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress } from '../util/utils';

export default function TransactionScreen(): JSX.Element {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const { session } = useAuthContext();
  const { translate } = useSettingsContext();
  const { getTransactionCsv } = useTransaction();
  const rootRef = useRef<HTMLDivElement>(null);

  const [showCoinTracking, setShowCoinTracking] = useState(false);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [error, setError] = useState<string>();

  const isTransaction = id && id.startsWith('T');
  const isRefund = isTransaction && pathname.includes('/refund');

  function exportCsv() {
    setIsCsvLoading(true);
    getTransactionCsv()
      .then((url) => window.open(url, '_blank'))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCsvLoading(false));
  }

  const title = isRefund
    ? translate('screens/payment', 'Transaction refund')
    : isTransaction
    ? translate('screens/payment', 'Transaction status')
    : showCoinTracking
    ? translate('screens/payment', 'Cointracking Link (read rights)')
    : translate('screens/payment', 'Transactions');

  const onBack =
    isTransaction || isRefund
      ? () => {
          setError(undefined);
          navigate('/tx');
        }
      : showCoinTracking
      ? () => setShowCoinTracking(false)
      : undefined;

  return (
    <Layout rootRef={rootRef} title={title} onBack={onBack}>
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
            hidden={session?.role === UserRole.ACCOUNT}
          />
          <StyledButton
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            label={translate('screens/payment', 'Export CSV')}
            isLoading={isCsvLoading}
            onClick={exportCsv}
          />
          <TransactionList isSupport={false} setError={setError} />
        </>
      )}
    </Layout>
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
      <TxInfo tx={transaction} />

      {transaction.state === TransactionState.UNASSIGNED && (
        <StyledButton
          label={translate('screens/payment', 'Assign transaction')}
          onClick={() => handleTransactionNavigation(`/tx/${transaction.id}/assign`)}
          width={StyledButtonWidth.FULL}
        />
      )}
      <StyledButton
        label={translate(
          'general/actions',
          transaction.state === TransactionState.FAILED ? 'Confirm refund' : 'Request refund',
        )}
        onClick={() => handleTransactionNavigation(`/tx/${transaction.uid}/refund`)}
        hidden={
          ![TransactionState.FAILED, TransactionState.AML_PENDING, TransactionState.KYC_REQUIRED].includes(
            transaction.state,
          ) || !!transaction.chargebackAmount
        }
      />
    </StyledVerticalStack>
  ) : (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  );
}

interface RefundDetails {
  expiryDate: Date;
  feeAmount: number;
  refundAmount: number;
  refundAsset: Asset | Fiat;
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
  const { user } = useUserContext();
  const { getIbans } = useBankAccount();
  const { isLoggedIn } = useSessionContext();
  const { getTransactionByUid, getTransactionRefund, setTransactionRefundTarget } = useTransaction();

  const rootRef = useRef<HTMLDivElement>(null);
  const refetchTimeout = useRef<NodeJS.Timeout | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [refundDetails, setRefundDetails] = useState<RefundDetails>();
  const [transaction, setTransaction] = useState<Transaction>();
  const [ibans, setIbans] = useState<Iban[]>();
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
    if (isLoggedIn)
      Promise.all([getIbans().then(setIbans)]).catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [isLoggedIn]);

  useEffect(() => {
    async function fetchRefund(txId: number) {
      getTransactionRefund(txId)
        .then((response) => {
          setRefundDetails(response);
          if (transaction?.id && response.expiryDate) {
            const timeout = new Date(response.expiryDate).getTime() - Date.now();
            if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
            refetchTimeout.current = setTimeout(() => fetchRefund(transaction.id), timeout > 0 ? timeout : 0);
          }
        })
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
    }

    if (transaction?.id) fetchRefund(transaction.id);

    return () => refetchTimeout.current && clearTimeout(refetchTimeout.current);
  }, [transaction]);

  useEffect(() => {
    if (selectedIban === AddAccount) navigate('/bank-accounts', { setRedirect: true, state: { refundTxUid: id } });
  }, [selectedIban]);

  useEffect(() => {
    if (transaction && user) {
      const allowedAddresses = user.addresses.filter(
        (a) => transaction?.inputBlockchain && a.blockchains.includes(transaction?.inputBlockchain),
      );
      setAddresses(allowedAddresses);
      if (allowedAddresses?.length === 1) setValue('address', allowedAddresses[0]);
    }
  }, [transaction, user]);

  async function onSubmit(data: FormData) {
    if (!transaction) return;
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

  return refundDetails && transaction ? (
    <StyledVerticalStack gap={6} full>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'Transaction amount')}>
          <p>
            {transaction.inputAmount} {transaction.inputAsset}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Fee')}>
          <p>
            {refundDetails.feeAmount} {refundDetails.refundAsset.name}
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
              rootRef={rootRef}
              name="address"
              label={translate('screens/payment', 'Chargeback address')}
              items={addresses}
              labelFunc={(item) => blankedAddress(item.address, { width })}
              descriptionFunc={(_item) => transaction.inputBlockchain?.toString() ?? ''}
              full
            />
          )}
          {!refundDetails.refundTarget && ibans && isBuy && (
            <StyledDropdown<string>
              rootRef={rootRef}
              name="iban"
              label={translate('screens/payment', 'Chargeback IBAN')}
              items={[...ibans.map((b) => b.iban), AddAccount]}
              labelFunc={(item) =>
                item === AddAccount ? translate('screens/iban', item) : Utils.formatIban(item) ?? ''
              }
              placeholder={translate('general/actions', 'Select...')}
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
  onSelectTransaction?: (txId: number) => void;
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

  const { width } = useWindowContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const txRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [transactions, setTransactions] = useState<Record<string, DetailTransaction[]>>();
  const [transactionTargets, setTransactionTargets] = useState<TransactionTarget[]>();
  const [isTargetsLoading, setIsTargetsLoading] = useState(false);
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [editTransaction, setEditTransaction] = useState<number>();

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

  async function onSubmit({ target }: { target: TransactionTarget }) {
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

                    const icon =
                      !isUnassigned &&
                      (tx.type === TransactionType.SELL
                        ? [tx.inputAsset, tx.outputAsset]
                        : [tx.outputAsset, tx.inputAsset]
                      )
                        .map((a) => a?.replace(/^d/, '') as AssetIconVariant)
                        .find((a) => Object.values(AssetIconVariant).includes(a));

                    return (
                      <div key={tx.id} ref={(el) => txRefs.current && (txRefs.current[tx.id] = el)}>
                        <StyledCollapsible
                          full
                          isExpanded={id ? +id === tx.id : undefined}
                          titleContent={
                            <div className="flex flex-row gap-2 items-center">
                              {icon ? (
                                <DfxAssetIcon asset={icon as AssetIconVariant} />
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
                            <TxInfo tx={tx} />

                            {isUnassigned &&
                              (editTransaction === tx.id ? (
                                <Form control={control} errors={errors} rules={rules} onSubmit={handleSubmit(onSubmit)}>
                                  <StyledVerticalStack gap={3} full>
                                    <p className="text-dfxGray-700 mt-4">{translate('screens/payment', 'Reference')}</p>
                                    <StyledDropdown<TransactionTarget>
                                      rootRef={rootRef}
                                      items={transactionTargets ?? []}
                                      labelFunc={(item) => `${item.bankUsage}`}
                                      placeholder={translate('general/actions', 'Select...')}
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
                                      onClick={handleSubmit(onSubmit)}
                                    />
                                  </StyledVerticalStack>
                                </Form>
                              ) : (
                                <StyledButton
                                  isLoading={isTargetsLoading}
                                  label={translate('screens/payment', 'Assign transaction')}
                                  onClick={() => assignTransaction(tx.id)}
                                />
                              ))}
                            <StyledButton
                              label={translate('screens/payment', 'Show on block explorer')}
                              onClick={() => window.open(tx.outputTxUrl, '_blank', 'noreferrer')}
                              hidden={!tx.outputTxUrl}
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
                                  TransactionState.AML_PENDING,
                                  TransactionState.KYC_REQUIRED,
                                ].includes(tx.state) || !!tx.chargebackAmount
                              }
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
                                onClick={() => onSelectTransaction && onSelectTransaction(tx.id)}
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
}

export function TxInfo({ tx }: TxInfoProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();

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
  tx?.fees?.networkStart &&
    rateItems.push({
      label: translate('screens/payment', 'Network start fee'),
      text: `${tx?.fees?.networkStart} ${tx.inputAsset}`,
    });

  return (
    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
      <StyledDataTableRow label={translate('screens/payment', 'ID')}>
        <p>{tx.id}</p>
      </StyledDataTableRow>
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
          <p className="text-right">{translate('screens/payment', PaymentFailureReasons[tx.reason])}</p>
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
      {tx.outputAsset && (
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
            {tx.chargebackAmount} {tx.inputAsset}
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
