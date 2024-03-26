import {
  CryptoPaymentMethod,
  FiatPaymentMethod,
  Transaction,
  TransactionState,
  TransactionType,
  useSessionContext,
  useTransaction,
} from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconVariant,
  DfxAssetIcon,
  SpinnerSize,
  StyledButton,
  StyledCollapsible,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { Layout } from '../components/layout';
import { PaymentFailureReasons, PaymentMethodLabels, PaymentStateLabels } from '../config/labels';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress } from '../util/utils';

export function TransactionScreen(): JSX.Element {
  useSessionGuard('/login');

  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { getTransactions } = useTransaction();
  const { isLoggedIn } = useSessionContext();

  const [transactions, setTransactions] = useState<Transaction[]>();

  useEffect(() => {
    if (isLoggedIn)
      getTransactions().then((tx) =>
        setTransactions(tx.sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1))),
      );
  }, [isLoggedIn]);

  return (
    <Layout title={translate('screens/payment', 'Transactions')}>
      {transactions ? (
        <>
          {transactions.length === 0 ? (
            <p className="text-dfxGray-700">{translate('screens/payment', 'No transactions found')}</p>
          ) : (
            transactions.map((tx) => {
              const paymentMethod = [tx.inputPaymentMethod, tx.outputPaymentMethod].find(
                (p) => p !== CryptoPaymentMethod.CRYPTO,
              ) as FiatPaymentMethod;

              const icon = (
                tx.type === TransactionType.SELL ? [tx.inputAsset, tx.outputAsset] : [tx.outputAsset, tx.inputAsset]
              ).find((a) => Object.values(AssetIconVariant).includes(a as AssetIconVariant));

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
                <StyledCollapsible
                  key={tx.id}
                  full
                  titleContent={
                    <div className="flex flex-row gap-2 items-center">
                      {icon && <DfxAssetIcon asset={icon as AssetIconVariant} />}

                      <div className="flex flex-col items-start">
                        <div className="font-bold leading-none">{translate('screens/payment', tx.type)}</div>
                        <div className="leading-none">{translate('screens/payment', PaymentStateLabels[tx.state])}</div>
                      </div>
                      <div className="ml-auto">
                        {tx.inputAmount} {tx.inputAsset}{' '}
                        {tx.outputAsset ? ` → ${tx.outputAmount} ${tx.outputAsset}` : ''}
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
                        <p>{translate('screens/payment', PaymentStateLabels[tx.state])}</p>
                      </StyledDataTableRow>
                      {tx.reason && (
                        <StyledDataTableRow label={translate('screens/payment', 'Failure reason')}>
                          <p>{translate('screens/payment', PaymentFailureReasons[tx.reason])}</p>
                        </StyledDataTableRow>
                      )}
                      {paymentMethod && (
                        <StyledDataTableRow label={translate('screens/payment', 'Payment method')}>
                          <p>{translate('screens/payment', PaymentMethodLabels[paymentMethod])}</p>
                        </StyledDataTableRow>
                      )}
                      {tx.inputAsset && (
                        <StyledDataTableRow label={translate('screens/payment', 'Input')}>
                          <p>
                            {tx.inputAmount} {tx.inputAsset}
                            {tx.inputBlockchain ? ` (${tx.inputBlockchain})` : ''}
                          </p>
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
                            {tx.outputBlockchain ? ` (${tx.outputBlockchain})` : ''}
                          </p>
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

                    {tx.outputTxUrl && (
                      <StyledButton
                        label={translate('screens/payment', 'Show on block explorer')}
                        onClick={() => window.open(tx.outputTxUrl, '_blank', 'noreferrer')}
                      />
                    )}

                    {tx.state === TransactionState.KYC_REQUIRED && (
                      <StyledButton label={translate('screens/kyc', 'Complete KYC')} onClick={() => navigate('/kyc')} />
                    )}
                  </StyledVerticalStack>
                </StyledCollapsible>
              );
            })
          )}
        </>
      ) : (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      )}
    </Layout>
  );
}
