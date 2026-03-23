import { Transaction, useTransaction } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Fragment, useState } from 'react';
import { BankTxInfo, CryptoInputInfo, TransactionInfo } from 'src/hooks/compliance.hook';
import { DetailRow, TransactionDetailRows, formatDate, statusBadge } from 'src/util/compliance-helpers';

interface TransactionsTableProps {
  transactions: TransactionInfo[];
  bankTxs: BankTxInfo[];
  cryptoInputs: CryptoInputInfo[];
  expandedBankTxId?: number;
  expandedCryptoInputId?: number;
  expandedTxUid?: string;
  onExpandBankTx: (id: number | undefined) => void;
  onExpandCryptoInput: (id: number | undefined) => void;
  onExpandTxUid: (uid: string | undefined) => void;
}

export function TransactionsTable({
  transactions,
  bankTxs,
  cryptoInputs,
  expandedBankTxId,
  expandedCryptoInputId,
  expandedTxUid,
  onExpandBankTx,
  onExpandCryptoInput,
  onExpandTxUid,
}: TransactionsTableProps): JSX.Element {
  const { getTransactionByUid } = useTransaction();
  const [txDetailCache, setTxDetailCache] = useState<Map<string, Transaction>>(new Map());
  const [txDetailLoading, setTxDetailLoading] = useState<string>();
  const [txDetailError, setTxDetailError] = useState<string>();

  function handleUidClick(uid: string): void {
    if (expandedTxUid === uid) {
      onExpandTxUid(undefined);
      return;
    }

    onExpandTxUid(uid);
    setTxDetailError(undefined);

    if (txDetailCache.has(uid)) return;

    setTxDetailLoading(uid);
    getTransactionByUid(uid)
      .then((detail) => {
        setTxDetailCache((prev) => new Map(prev).set(uid, detail));
      })
      .catch((e: unknown) => {
        setTxDetailError(e instanceof Error ? e.message : 'Failed to load transaction details');
      })
      .finally(() => setTxDetailLoading(undefined));
  }
  const bankTxByTxId = new Map(
    bankTxs
      ?.filter((b): b is BankTxInfo & { transactionId: number } => b.transactionId != null)
      .map((b) => [b.transactionId, b]),
  );
  const cryptoInputByTxId = new Map(
    cryptoInputs
      ?.filter((c): c is CryptoInputInfo & { transactionId: number } => c.transactionId != null)
      .map((c) => [c.transactionId, c]),
  );

  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">UID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Source</th>
          <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Amount (CHF)</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">AML Check</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Chargeback</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Bank TX</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Crypto In</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {transactions?.length > 0 ? (
          transactions.map((tx) => {
            const bankTx = bankTxByTxId.get(tx.id);
            const cryptoInput = cryptoInputByTxId.get(tx.id);
            const isBankTxExpanded = expandedBankTxId === bankTx?.id;
            const isCryptoExpanded = expandedCryptoInputId === cryptoInput?.id;

            return (
              <Fragment key={tx.id}>
                <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                  <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.id}</td>
                  <td
                    className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-xs cursor-pointer text-dfxBlue-300 underline hover:text-dfxBlue-800"
                    onClick={() => handleUidClick(tx.uid)}
                  >
                    {tx.uid}
                  </td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{tx.type || '-'}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{tx.sourceType}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">{tx.amountInChf?.toFixed(2) || '-'}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.amlCheck ? statusBadge(tx.amlCheck) : '-'}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center">
                    {tx.chargebackDate ? (
                      <span className="text-primary-red">
                        {formatDate(tx.chargebackDate)}
                        {tx.amlReason && (
                          <>
                            <br />
                            <span className="text-xs">{tx.amlReason}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center">
                    {bankTx ? (
                      <button
                        className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
                        onClick={() => onExpandBankTx(isBankTxExpanded ? undefined : bankTx.id)}
                      >
                        {bankTx.id}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center">
                    {cryptoInput ? (
                      <button
                        className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
                        onClick={() => onExpandCryptoInput(isCryptoExpanded ? undefined : cryptoInput.id)}
                      >
                        {cryptoInput.id}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(tx.created)}</td>
                </tr>

                {isBankTxExpanded && bankTx && (
                  <tr key={`bankTx-${bankTx.id}`} className="bg-dfxGray-300/50">
                    <td colSpan={10} className="px-6 py-3">
                      <table className="text-sm text-dfxBlue-800 text-left">
                        <tbody>
                          <DetailRow label="Account Service Ref" value={bankTx.accountServiceRef} />
                          <DetailRow label="Name" value={bankTx.name} />
                          <DetailRow label="IBAN" value={bankTx.iban} mono />
                          <DetailRow label="Remittance Info" value={bankTx.remittanceInfo} />
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}

                {isCryptoExpanded && cryptoInput && (
                  <tr key={`ci-${cryptoInput.id}`} className="bg-dfxGray-300/50">
                    <td colSpan={10} className="px-6 py-3">
                      <table className="text-sm text-dfxBlue-800 text-left">
                        <tbody>
                          <DetailRow label="TX ID" value={cryptoInput.inTxId} url={cryptoInput.inTxExplorerUrl} mono />
                          <DetailRow
                            label="Asset"
                            value={
                              cryptoInput.assetName
                                ? `${cryptoInput.assetName} (${cryptoInput.blockchain})`
                                : cryptoInput.blockchain
                            }
                          />
                          <DetailRow label="Amount" value={cryptoInput.amount} />
                          <DetailRow label="Status" value={cryptoInput.status} />
                          <DetailRow label="Sender" value={cryptoInput.senderAddresses} mono />
                          <DetailRow
                            label="Return TX"
                            value={cryptoInput.returnTxId}
                            url={cryptoInput.returnTxExplorerUrl}
                            mono
                          />
                          <DetailRow label="Purpose" value={cryptoInput.purpose} />
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}

                {expandedTxUid === tx.uid && (
                  <tr key={`txDetail-${tx.uid}`} className="bg-dfxGray-300/50">
                    <td colSpan={10} className="px-6 py-3">
                      {txDetailLoading === tx.uid ? (
                        <StyledLoadingSpinner size={SpinnerSize.SM} />
                      ) : txDetailError && !txDetailCache.has(tx.uid) ? (
                        <p className="text-primary-red text-sm">{txDetailError}</p>
                      ) : txDetailCache.has(tx.uid) ? (
                        <TransactionDetailRows tx={txDetailCache.get(tx.uid) as Transaction} />
                      ) : null}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })
        ) : (
          <tr>
            <td colSpan={10} className="px-3 py-4 text-center text-dfxGray-700">
              No transactions
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
