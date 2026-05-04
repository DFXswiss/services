import { ReactNode, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { BankTxInfo, ComplianceUserData, CryptoInputInfo, TransactionInfo } from 'src/hooks/compliance.hook';
import { formatDateTime } from 'src/util/compliance-helpers';

interface Props {
  data: ComplianceUserData;
}

interface CardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
}

function StatsCard({ label, value, hint, onClick }: Readonly<CardProps>): JSX.Element {
  const interactive = !!onClick;
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 flex flex-col gap-1 min-w-0 ${
        interactive ? 'cursor-pointer hover:bg-dfxGray-300 transition-colors' : ''
      }`}
      onClick={onClick}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="text-xs text-dfxGray-700 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-dfxBlue-800 break-words">
        {value === null || value === undefined || value === '' ? '-' : value}
      </div>
      {hint && <div className="text-xs text-dfxGray-700 break-words">{hint}</div>}
    </div>
  );
}

function mostRecent(
  transactions: TransactionInfo[],
  pred: (t: TransactionInfo) => boolean,
): TransactionInfo | undefined {
  return transactions.filter(pred).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function findTransaction(transactions: TransactionInfo[], query: string): TransactionInfo | undefined {
  const q = query.trim();
  if (!q) return undefined;

  const asNum = Number(q);
  if (!Number.isNaN(asNum)) {
    const byNum = transactions.find((t) => t.id === asNum || t.buyCryptoId === asNum || t.buyFiatId === asNum);
    if (byNum) return byNum;
  }
  return transactions.find((t) => t.uid === q);
}

function DetailRow({ label, value, wide }: Readonly<{ label: string; value: ReactNode; wide?: boolean }>): JSX.Element {
  return (
    <div className={`flex gap-2 py-1 border-b border-dfxGray-300 min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-xs text-dfxGray-700 w-32 shrink-0 pt-0.5">{label}</div>
      <div className="text-sm text-dfxBlue-800 break-all min-w-0 flex-1">{value || '-'}</div>
    </div>
  );
}

function DetailGrid({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-0">{children}</div>;
}

function TransactionDetail({
  tx,
  bankTx,
  cryptoInput,
}: Readonly<{ tx: TransactionInfo; bankTx?: BankTxInfo; cryptoInput?: CryptoInputInfo }>): JSX.Element {
  const { translate } = useSettingsContext();
  const inOut =
    [
      tx.inputAmount != null ? `${tx.inputAmount} ${tx.inputAsset ?? ''}`.trim() : undefined,
      tx.outputAmount != null ? `${tx.outputAmount} ${tx.outputAsset ?? ''}`.trim() : undefined,
    ]
      .filter(Boolean)
      .join(' → ') || undefined;

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <div className="text-xs text-dfxGray-700 uppercase tracking-wide mb-2">
        {translate('screens/compliance', 'Transaction')} #{tx.id}
        {tx.buyCryptoId && ` · BuyCrypto #${tx.buyCryptoId}`}
        {tx.buyFiatId && ` · BuyFiat #${tx.buyFiatId}`}
      </div>
      <DetailGrid>
        <DetailRow label="UID" value={<span className="font-mono text-xs">{tx.uid}</span>} />
        <DetailRow label={translate('screens/compliance', 'Type')} value={tx.type} />
        <DetailRow label={translate('screens/compliance', 'Source')} value={tx.sourceType} />
        <DetailRow
          label={translate('screens/compliance', 'Status')}
          value={
            tx.isCompleted
              ? translate('screens/compliance', 'Completed')
              : translate('screens/compliance', 'Processing')
          }
        />
        <DetailRow label={translate('screens/compliance', 'Created')} value={formatDateTime(tx.created)} />
        <DetailRow label={translate('screens/compliance', 'Amount')} value={inOut} />
        <DetailRow
          label={translate('screens/compliance', 'Volume')}
          value={tx.amountInChf != null ? `${tx.amountInChf} CHF` : undefined}
        />
        <DetailRow label="EUR" value={tx.amountInEur != null ? `${tx.amountInEur} EUR` : undefined} />
        <DetailRow label={translate('screens/compliance', 'AML Check')} value={tx.amlCheck} />
        {tx.amlReason && <DetailRow label={translate('screens/compliance', 'AML Reason')} value={tx.amlReason} />}
        {tx.chargebackDate && (
          <DetailRow label={translate('screens/compliance', 'Chargeback')} value={formatDateTime(tx.chargebackDate)} />
        )}
        {tx.comment && <DetailRow label={translate('screens/compliance', 'Comment')} value={tx.comment} wide />}
      </DetailGrid>

      {bankTx && (
        <>
          <div className="text-xs text-dfxGray-700 uppercase tracking-wide mt-3 mb-2">Bank-TX #{bankTx.id}</div>
          <DetailGrid>
            <DetailRow label="Account-Service-Ref" value={bankTx.accountServiceRef} />
            <DetailRow label={translate('screens/compliance', 'Type')} value={bankTx.type} />
            <DetailRow
              label={translate('screens/compliance', 'Amount')}
              value={`${bankTx.amount} ${bankTx.currency}`}
            />
            <DetailRow label={translate('screens/compliance', 'Name')} value={bankTx.name} />
            <DetailRow label="IBAN" value={bankTx.iban} />
            {bankTx.remittanceInfo && (
              <DetailRow label={translate('screens/compliance', 'Remittance Info')} value={bankTx.remittanceInfo} />
            )}
            {bankTx.recall && (
              <DetailRow
                label={translate('screens/compliance', 'Recall')}
                value={`#${bankTx.recall.id} · Seq ${bankTx.recall.sequence} · ${bankTx.recall.reason ?? '-'}`}
              />
            )}
          </DetailGrid>
        </>
      )}

      {cryptoInput && (
        <>
          <div className="text-xs text-dfxGray-700 uppercase tracking-wide mt-3 mb-2">
            Crypto-Input #{cryptoInput.id}
          </div>
          <DetailGrid>
            <DetailRow label="In-TX-ID" value={<span className="font-mono text-xs">{cryptoInput.inTxId}</span>} />
            <DetailRow label={translate('screens/compliance', 'Status')} value={cryptoInput.status} />
            <DetailRow
              label={translate('screens/compliance', 'Amount')}
              value={`${cryptoInput.amount} ${cryptoInput.assetName ?? ''}`.trim()}
            />
            <DetailRow label={translate('screens/compliance', 'Blockchain')} value={cryptoInput.blockchain} />
            {cryptoInput.senderAddresses && (
              <DetailRow
                label={translate('screens/compliance', 'Sender')}
                value={<span className="font-mono text-xs">{cryptoInput.senderAddresses}</span>}
              />
            )}
            {cryptoInput.returnTxId && (
              <DetailRow
                label={translate('screens/compliance', 'Return-TX')}
                value={<span className="font-mono text-xs">{cryptoInput.returnTxId}</span>}
              />
            )}
            {cryptoInput.purpose && (
              <DetailRow label={translate('screens/compliance', 'Purpose')} value={cryptoInput.purpose} />
            )}
          </DetailGrid>
        </>
      )}
    </div>
  );
}

interface LookupProps {
  data: ComplianceUserData;
  query: string;
  setQuery: (q: string) => void;
  submittedQuery: string;
  setSubmittedQuery: (q: string) => void;
}

function TransactionLookup({
  data,
  query,
  setQuery,
  submittedQuery,
  setSubmittedQuery,
}: Readonly<LookupProps>): JSX.Element {
  const { translate } = useSettingsContext();
  const tx = submittedQuery ? findTransaction(data.transactions, submittedQuery) : undefined;
  const bankTx = tx ? data.bankTxs.find((b) => b.transactionId === tx.id) : undefined;
  const cryptoInput = tx ? data.cryptoInputs.find((c) => c.transactionId === tx.id) : undefined;

  function submit(): void {
    setSubmittedQuery(query.trim());
  }

  function reset(): void {
    setQuery('');
    setSubmittedQuery('');
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs text-dfxGray-700 uppercase tracking-wide">
        {translate('screens/compliance', 'Transaction Search')}
      </h3>
      <div className="flex gap-2">
        <input
          className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={translate('screens/compliance', 'TX-ID, UID, BuyCrypto-ID or BuyFiat-ID')}
        />
        <button
          className="px-3 py-1.5 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-400 transition-colors disabled:opacity-50"
          onClick={submit}
          disabled={!query.trim()}
        >
          {translate('general/actions', 'Search')}
        </button>
        {submittedQuery && (
          <button
            className="px-3 py-1.5 text-xs font-medium bg-dfxGray-300 text-dfxBlue-800 rounded hover:bg-dfxGray-400 transition-colors"
            onClick={reset}
          >
            {translate('general/actions', 'Back')}
          </button>
        )}
      </div>
      {submittedQuery && !tx && (
        <p className="text-sm text-dfxRed-100">
          {translate('screens/compliance', 'No transaction found for {{query}}', { query: submittedQuery })}
        </p>
      )}
      {tx && <TransactionDetail tx={tx} bankTx={bankTx} cryptoInput={cryptoInput} />}
    </div>
  );
}

export function SupportUserOverviewPanel({ data }: Readonly<Props>): JSX.Element {
  const { translate } = useSettingsContext();
  const { userData, transactions, users, supportIssues } = data;

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const lastDeposit = mostRecent(transactions, (t) => t.buyCryptoId != null);
  const lastWithdrawal = mostRecent(transactions, (t) => t.buyFiatId != null);

  const onrampCount = transactions.filter((t) => t.buyCryptoId != null && t.isCompleted).length;
  const offrampCount = transactions.filter((t) => t.buyFiatId != null && t.isCompleted).length;

  const issuesTotal = supportIssues?.length ?? 0;
  const issuesOpen = supportIssues?.filter((i) => i.state !== 'Completed').length ?? 0;

  function selectTransaction(id: number): void {
    const idStr = String(id);
    setQuery(idStr);
    setSubmittedQuery(idStr);
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      <h2 className="text-dfxGray-700 text-center">{translate('screens/compliance', 'Support Overview')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          label={translate('screens/compliance', 'User')}
          value={`#${userData.id}`}
          hint={
            <>
              {userData.country?.name ?? '-'} · {translate('screens/compliance', 'KYC Level')}{' '}
              {userData.kycLevel ?? '-'}
            </>
          }
        />
        <StatsCard
          label={translate('screens/compliance', 'Status')}
          value={userData.status ?? '-'}
          hint={`${translate('screens/compliance', 'Risk')}: ${userData.riskStatus ?? '-'}`}
        />
        <StatsCard
          label={translate('screens/compliance', 'Last Deposit')}
          value={lastDeposit ? formatDateTime(lastDeposit.created) : '-'}
          hint={
            lastDeposit
              ? `${lastDeposit.inputAmount ?? '-'} ${lastDeposit.inputAsset ?? ''} → ${lastDeposit.outputAsset ?? ''}`
              : undefined
          }
          onClick={lastDeposit ? () => selectTransaction(lastDeposit.id) : undefined}
        />
        <StatsCard
          label={translate('screens/compliance', 'Last Withdrawal')}
          value={lastWithdrawal ? formatDateTime(lastWithdrawal.created) : '-'}
          hint={
            lastWithdrawal
              ? `${lastWithdrawal.outputAsset ?? '-'} · ${
                  lastWithdrawal.isCompleted
                    ? translate('screens/compliance', 'Completed')
                    : translate('screens/compliance', 'Processing')
                }`
              : undefined
          }
          onClick={lastWithdrawal ? () => selectTransaction(lastWithdrawal.id) : undefined}
        />
        <StatsCard label={translate('screens/compliance', 'Onramp (Buy)')} value={onrampCount} />
        <StatsCard label={translate('screens/compliance', 'Offramp (Sell)')} value={offrampCount} />
        <StatsCard label={translate('screens/compliance', 'Wallets / Addresses')} value={users.length} />
        <StatsCard
          label={translate('screens/compliance', 'Support Issues')}
          value={issuesTotal}
          hint={translate('screens/compliance', 'open: {{count}}', { count: issuesOpen })}
        />
      </div>

      <TransactionLookup
        data={data}
        query={query}
        setQuery={setQuery}
        submittedQuery={submittedQuery}
        setSubmittedQuery={setSubmittedQuery}
      />
    </div>
  );
}
