import { Transaction, TransactionState, useTransaction } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Fragment, useState } from 'react';
import { ChargebackModal } from 'src/components/compliance/chargeback-modal';
import { RecallModal } from 'src/components/compliance/recall-modal';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { BankTxInfo, CryptoInputInfo, TransactionInfo, useCompliance } from 'src/hooks/compliance.hook';
import { DetailRow, TransactionDetailRows, formatDate, statusBadge } from 'src/util/compliance-helpers';

interface TransactionsTableProps {
  transactions: TransactionInfo[];
  bankTxs: BankTxInfo[];
  cryptoInputs: CryptoInputInfo[];
  userDataId: number;
  expandedBankTxId?: number;
  expandedCryptoInputId?: number;
  expandedTxUid?: string;
  onExpandBankTx: (id: number | undefined) => void;
  onExpandCryptoInput: (id: number | undefined) => void;
  onExpandTxUid: (uid: string | undefined) => void;
  onStopped?: () => void;
}

export function TransactionsTable({
  transactions,
  bankTxs,
  cryptoInputs,
  userDataId,
  expandedBankTxId,
  expandedCryptoInputId,
  expandedTxUid,
  onExpandBankTx,
  onExpandCryptoInput,
  onExpandTxUid,
  onStopped,
}: TransactionsTableProps): JSX.Element {
  const { getTransactionByUid } = useTransaction();
  const { downloadTransactionPdf, stopTransaction } = useCompliance();
  const [txDetailCache, setTxDetailCache] = useState<Map<string, Transaction>>(new Map());
  const [txDetailLoading, setTxDetailLoading] = useState<string>();
  const [txDetailError, setTxDetailError] = useState<string>();
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string>();
  const [stoppingTxId, setStoppingTxId] = useState<number>();
  const [stopConfirmTxId, setStopConfirmTxId] = useState<number>();
  const [stopError, setStopError] = useState<string>();
  const [chargebackTxId, setChargebackTxId] = useState<number>();
  const [recallBankTxId, setRecallBankTxId] = useState<number>();

  async function confirmStop(): Promise<void> {
    const txId = stopConfirmTxId;
    if (!txId) return;
    const tx = transactions.find((t) => t.id === txId);
    setStoppingTxId(txId);
    setStopError(undefined);
    try {
      await stopTransaction(txId);
      if (tx) {
        const updatedDetail = await getTransactionByUid(tx.uid);
        setTxDetailCache((prev) => new Map(prev).set(tx.uid, updatedDetail));
      }
      onStopped?.();
      setStopConfirmTxId(undefined);
    } catch (e) {
      setStopError(e instanceof Error ? e.message : 'Stop failed');
    } finally {
      setStoppingTxId(undefined);
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    setIsPdfDownloading(true);
    setPdfError(undefined);
    try {
      await downloadTransactionPdf(userDataId);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'PDF download failed');
    } finally {
      setIsPdfDownloading(false);
    }
  }

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
    <div>
      <div className="flex justify-end mb-1">
        {transactions?.length > 0 && (
          <button
            className="text-xs text-dfxBlue-300 underline hover:text-dfxBlue-800 disabled:opacity-50 disabled:no-underline"
            onClick={handleDownloadPdf}
            disabled={isPdfDownloading}
          >
            {isPdfDownloading ? 'Downloading...' : 'PDF'}
          </button>
        )}
      </div>
      {pdfError && <p className="text-xs text-primary-red mb-1">{pdfError}</p>}
      {stopError && <p className="text-xs text-primary-red mb-1">{stopError}</p>}
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-dfxGray-300">
          <tr>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">UID</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Source</th>
            <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Input</th>
            <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Amount (CHF)</th>
            <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Amount (EUR)</th>
            <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Output</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">AML Check</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Chargeback</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Bank TX</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Crypto In</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
            <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Completed</th>
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
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">
                      {tx.inputAmount != null ? `${tx.inputAmount.toFixed(2)} ${tx.inputAsset ?? ''}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">
                      {tx.amountInChf?.toFixed(2) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">
                      {tx.amountInEur?.toFixed(2) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">
                      {tx.outputAmount != null && tx.outputAsset
                        ? `${tx.outputAmount} ${tx.outputAsset}`
                        : (tx.outputAsset ?? '-')}
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800">
                      {tx.amlCheck ? statusBadge(tx.amlCheck) : '-'}
                    </td>
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
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center">
                      {tx.isCompleted ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        <span className="text-yellow-500">No</span>
                      )}
                    </td>
                  </tr>

                  {isBankTxExpanded && bankTx && (
                    <tr key={`bankTx-${bankTx.id}`} className="bg-dfxGray-300/50">
                      <td colSpan={14} className="px-6 py-3">
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
                      <td colSpan={14} className="px-6 py-3">
                        <table className="text-sm text-dfxBlue-800 text-left">
                          <tbody>
                            <DetailRow
                              label="TX ID"
                              value={cryptoInput.inTxId}
                              url={cryptoInput.inTxExplorerUrl}
                              mono
                            />
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
                      <td colSpan={14} className="px-6 py-3">
                        {txDetailLoading === tx.uid ? (
                          <StyledLoadingSpinner size={SpinnerSize.SM} />
                        ) : txDetailError && !txDetailCache.has(tx.uid) ? (
                          <p className="text-primary-red text-sm">{txDetailError}</p>
                        ) : txDetailCache.has(tx.uid) ? (
                          (() => {
                            const detail = txDetailCache.get(tx.uid) as Transaction;
                            const isStopped = (detail.state as string) === 'Stopped';
                            return (
                              <>
                                <TransactionDetailRows tx={detail} />
                                {(() => {
                                  const canStop = tx.type === 'BuyCrypto' && !tx.isCompleted;
                                  const canChargeback =
                                    [
                                      TransactionState.FAILED,
                                      TransactionState.CHECK_PENDING,
                                      TransactionState.KYC_REQUIRED,
                                      TransactionState.LIMIT_EXCEEDED,
                                      TransactionState.UNASSIGNED,
                                    ].includes(detail.state) && !detail.chargebackAmount;
                                  const canRecall = bankTx != null;
                                  if (!canStop && !canChargeback && !canRecall) return null;
                                  return (
                                    <div className="mt-3 pt-3 border-t border-dfxGray-400/50 flex gap-2">
                                      {canStop && (
                                        <button
                                          className="px-3 py-1 text-xs text-white bg-dfxRed-100 hover:bg-dfxRed-100/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => setStopConfirmTxId(tx.id)}
                                          disabled={stoppingTxId === tx.id || isStopped}
                                        >
                                          {stoppingTxId === tx.id ? 'Stopping...' : isStopped ? 'Stopped' : 'Stop'}
                                        </button>
                                      )}
                                      {canChargeback && (
                                        <button
                                          className="px-3 py-1 text-xs text-white bg-dfxRed-100 hover:bg-dfxRed-100/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => setChargebackTxId(tx.id)}
                                        >
                                          Chargeback
                                        </button>
                                      )}
                                      {canRecall && (
                                        <button
                                          className="px-3 py-1 text-xs text-white bg-dfxRed-100 hover:bg-dfxRed-100/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => setRecallBankTxId(bankTx.id)}
                                        >
                                          Recall
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </>
                            );
                          })()
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={14} className="px-3 py-4 text-center text-dfxGray-700">
                No transactions
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ConfirmDialog
        isOpen={stopConfirmTxId != null}
        title="Transaktion stoppen"
        message="Möchtest du diese Transaktion wirklich stoppen? Nach dem Stopp muss sie manuell weiterbearbeitet werden."
        confirmLabel="Stop"
        destructive
        isLoading={stoppingTxId != null}
        onConfirm={confirmStop}
        onCancel={() => setStopConfirmTxId(undefined)}
      />
      <ChargebackModal
        isOpen={chargebackTxId != null}
        transactionId={chargebackTxId}
        transactionType={transactions.find((t) => t.id === chargebackTxId)?.type}
        sourceType={transactions.find((t) => t.id === chargebackTxId)?.sourceType}
        onClose={() => setChargebackTxId(undefined)}
        onSuccess={() => {
          if (chargebackTxId) {
            const tx = transactions.find((t) => t.id === chargebackTxId);
            if (tx) {
              getTransactionByUid(tx.uid).then((detail) => {
                setTxDetailCache((prev) => new Map(prev).set(tx.uid, detail));
              });
            }
          }
          setChargebackTxId(undefined);
          onStopped?.();
        }}
      />
      <RecallModal
        isOpen={recallBankTxId != null}
        bankTxId={recallBankTxId}
        onClose={() => setRecallBankTxId(undefined)}
        onSuccess={() => setRecallBankTxId(undefined)}
      />
    </div>
  );
}
