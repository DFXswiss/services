import {
  CryptoPaymentMethod,
  DetailTransaction,
  FiatPaymentMethod,
  TransactionState,
  TransactionTarget,
  TransactionType,
  Utils,
  Validations,
  useSessionContext,
  useTransaction,
} from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconVariant,
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
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout';
import { PaymentFailureReasons, PaymentMethodLabels, PaymentStateLabels } from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress } from '../util/utils';

export function TransactionScreen(): JSX.Element {
  useSessionGuard('/login');

  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const {
    getDetailTransactions,
    getUnassignedTransactions,
    getTransactionCsv,
    getTransactionTargets,
    setTransactionTarget,
  } = useTransaction();
  const { isLoggedIn } = useSessionContext();
  const { id } = useParams();
  const { toString } = useBlockchain();
  const { flags } = useAppParams();

  const rootRef = useRef<HTMLDivElement>(null);
  const txRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [transactions, setTransactions] = useState<Record<string, DetailTransaction[]>>();
  const [transactionTargets, setTransactionTargets] = useState<TransactionTarget[]>();
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [isTargetsLoading, setIsTargetsLoading] = useState(false);
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [editTransaction, setEditTransaction] = useState<number>();

  useEffect(() => {
    if (id) setTimeout(() => txRefs.current[id]?.scrollIntoView());
  }, [id, transactions]);

  useEffect(() => {
    if (isLoggedIn) loadTransactions();
  }, [isLoggedIn]);

  function loadTransactions() {
    setTransactions(undefined);
    Promise.all([getDetailTransactions(), getUnassignedTransactions()]).then((tx) => {
      const list = tx.flat().sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1)) as DetailTransaction[];
      const map = list.reduce((map, tx) => {
        const date = new Date(tx.date);
        const key = `${date.getFullYear()} - ${date.getMonth() + 1}`;
        map[key] = (map[key] ?? []).concat(tx);
        return map;
      }, {} as Record<string, DetailTransaction[]>);
      setTransactions(map);
    });
  }

  // form
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

  function exportCsv() {
    setIsCsvLoading(true);
    getTransactionCsv()
      .then((url) => window.open(url, '_blank'))
      .finally(() => setIsCsvLoading(false));
  }

  async function assignTransaction(tx: DetailTransaction) {
    if (!transactionTargets) {
      setIsTargetsLoading(true);
      await getTransactionTargets()
        .then((targets) => {
          setTransactionTargets(targets);
          if (targets.length === 1) setValue('target', targets[0]);
        })
        .finally(() => setIsTargetsLoading(false));
    }

    setEditTransaction(tx.id);
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
      .finally(() => setIsTransactionLoading(false));
  }

  const transactionList = transactions && Object.entries(transactions);

  return (
    <Layout rootRef={rootRef} title={translate('screens/payment', 'Transactions')}>
      <StyledVerticalStack gap={6} full center>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.FULL}
          label={translate('screens/payment', 'Export CSV')}
          isLoading={isCsvLoading}
          onClick={exportCsv}
        />
        {flags?.includes('iban') && (
          <StyledButton
            color={StyledButtonColor.BLUE}
            width={StyledButtonWidth.FULL}
            label={translate('screens/payment', 'My transaction is missing')}
            onClick={() => navigate('/bank-accounts')}
          />
        )}
        <StyledVerticalStack full center>
          <h2 className="text-dfxGray-700 mb-2">{translate('screens/payment', 'Your Transactions')}</h2>
          {transactionList ? (
            transactionList.length === 0 ? (
              <p className="text-dfxGray-700">{translate('screens/payment', 'No transactions found')}</p>
            ) : (
              transactionList.map(([date, list]) => (
                <div key={date} className="w-full mb-2">
                  <p className="text-dfxGray-700">{date}</p>
                  <StyledVerticalStack gap={2} full>
                    {list.map((tx) => {
                      const state = PaymentStateLabels[tx.state] ?? 'Unassigned';
                      const isUnassigned = state === 'Unassigned';
                      const paymentMethod = [tx.inputPaymentMethod, tx.outputPaymentMethod].find(
                        (p) => p !== CryptoPaymentMethod.CRYPTO,
                      ) as FiatPaymentMethod;
                      const icon =
                        !isUnassigned &&
                        (tx.type === TransactionType.SELL
                          ? [tx.inputAsset, tx.outputAsset]
                          : [tx.outputAsset, tx.inputAsset]
                        )
                          .map((a) => a?.replace(/^d/, '') as AssetIconVariant)
                          .find((a) => Object.values(AssetIconVariant).includes(a));
                      const rateItems = [];
                      tx.exchangeRate != null &&
                        rateItems.push({
                          label: translate('screens/payment', 'Base rate'),
                          text: `${tx.exchangeRate} ${tx.inputAsset}/${tx.outputAsset}`,
                        });
                      tx.feeAmount != null &&
                        rateItems.push({
                          label: translate('screens/payment', 'DFX fee'),
                          text: `${tx.feeAmount} ${tx.inputAsset}`,
                        });
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
                                    {translate('screens/payment', state)}
                                  </div>
                                </div>
                                <div className="ml-auto">
                                  {tx.inputAsset ? `${tx.inputAmount} ${tx.inputAsset}` : ''}
                                  {tx.inputAsset && tx.outputAsset ? ' → ' : ''}
                                  {tx.outputAsset ? `${tx.outputAmount} ${tx.outputAsset}` : ''}
                                </div>
                              </div>
                            }
                          >
                            <StyledVerticalStack full gap={4}>
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
                                  <p>{translate('screens/payment', state)}</p>
                                </StyledDataTableRow>
                                {tx.reason && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Failure reason')}>
                                    <p>{translate('screens/payment', PaymentFailureReasons[tx.reason])}</p>
                                  </StyledDataTableRow>
                                )}
                                {paymentMethod && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Payment method')}>
                                    <p className="text-right">
                                      {translate('screens/payment', PaymentMethodLabels[paymentMethod])}
                                    </p>
                                  </StyledDataTableRow>
                                )}
                                {tx.inputAsset && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Input')}>
                                    <p>
                                      {tx.inputAmount} {tx.inputAsset}
                                      {tx.inputBlockchain ? ` (${toString(tx.inputBlockchain)})` : ''}
                                    </p>
                                  </StyledDataTableRow>
                                )}
                                {tx.sourceAccount && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Input Account')}>
                                    <p>{blankedAddress(tx.sourceAccount)}</p>
                                  </StyledDataTableRow>
                                )}
                                {tx.inputTxId && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Input TX')}>
                                    {tx.inputTxUrl ? (
                                      <StyledLink label={blankedAddress(tx.inputTxId)} url={tx.inputTxUrl} dark />
                                    ) : (
                                      <p>{blankedAddress(tx.inputTxId)}</p>
                                    )}
                                  </StyledDataTableRow>
                                )}
                                {tx.outputAsset && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Output')}>
                                    <p>
                                      {tx.outputAmount} {tx.outputAsset}
                                      {tx.outputBlockchain ? ` (${toString(tx.outputBlockchain)})` : ''}
                                    </p>
                                  </StyledDataTableRow>
                                )}
                                {tx.targetAccount && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Output Account')}>
                                    <p>{blankedAddress(tx.targetAccount)}</p>
                                  </StyledDataTableRow>
                                )}
                                {tx.outputTxId && (
                                  <StyledDataTableRow label={translate('screens/payment', 'Output TX')}>
                                    {tx.outputTxUrl ? (
                                      <StyledLink label={blankedAddress(tx.outputTxId)} url={tx.outputTxUrl} dark />
                                    ) : (
                                      <p>{blankedAddress(tx.outputTxId)}</p>
                                    )}
                                  </StyledDataTableRow>
                                )}
                                {tx.rate != null && (
                                  <StyledDataTableExpandableRow
                                    label={translate('screens/payment', 'Exchange rate')}
                                    expansionItems={rateItems}
                                  >
                                    <p>
                                      {tx.rate} {tx.inputAsset}/{tx.outputAsset}
                                    </p>
                                  </StyledDataTableExpandableRow>
                                )}
                              </StyledDataTable>
                              {isUnassigned &&
                                (editTransaction === tx.id ? (
                                  <Form
                                    control={control}
                                    errors={errors}
                                    rules={rules}
                                    onSubmit={handleSubmit(onSubmit)}
                                  >
                                    <StyledVerticalStack gap={3} full>
                                      <p className="text-dfxGray-700 mt-4">
                                        {translate('screens/payment', 'Reference')}
                                      </p>
                                      <StyledDropdown<TransactionTarget>
                                        rootRef={rootRef}
                                        items={transactionTargets ?? []}
                                        labelFunc={(item) => `${item.bankUsage}`}
                                        placeholder={translate('general/actions', 'Select...')}
                                        descriptionFunc={(item) =>
                                          `${toString(item.asset.blockchain)}/${item.asset.name} ${blankedAddress(
                                            item.address,
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
                                    onClick={() => assignTransaction(tx)}
                                  />
                                ))}
                              {tx.outputTxUrl && (
                                <StyledButton
                                  label={translate('screens/payment', 'Show on block explorer')}
                                  onClick={() => window.open(tx.outputTxUrl, '_blank', 'noreferrer')}
                                />
                              )}
                              {tx.state === TransactionState.KYC_REQUIRED && (
                                <StyledButton
                                  label={translate('screens/kyc', 'Complete KYC')}
                                  onClick={() => navigate('/kyc')}
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
    </Layout>
  );
}
