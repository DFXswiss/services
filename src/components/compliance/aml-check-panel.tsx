import { AmlReason, CallQueue, CheckStatus } from '@dfx.swiss/react';
import { useState } from 'react';
import { ComplianceUserData, TransactionInfo } from 'src/hooks/compliance.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { statusBadge } from 'src/util/compliance-helpers';

function callQueueForReason(reason: string | undefined): CallQueue | undefined {
  return reason && (Object.values(CallQueue) as string[]).includes(reason) ? (reason as CallQueue) : undefined;
}

interface AmlCheckPendingPanelProps {
  data: ComplianceUserData;
  onUpdateBuyCrypto: (
    id: number,
    data: { amlCheck?: string; amlReason?: string; comment?: string; priceDefinitionAllowedDate?: string },
  ) => Promise<void>;
  onUpdateBuyFiat: (
    id: number,
    data: { amlCheck?: string; amlReason?: string; comment?: string; priceDefinitionAllowedDate?: string },
  ) => Promise<void>;
  onResetBuyCryptoAml: (id: number) => Promise<void>;
  onResetBuyFiatAml: (id: number) => Promise<void>;
  isSaving: boolean;
  onReload: () => void;
}

const AML_CHECK_OPTIONS = [CheckStatus.PASS, CheckStatus.FAIL, CheckStatus.PENDING, 'Reset'] as const;

const AML_REASON_OPTIONS: AmlReason[] = [
  AmlReason.NA,
  ...(Object.values(AmlReason) as AmlReason[]).filter((r) => r !== AmlReason.NA).sort((a, b) => a.localeCompare(b)),
];

function isBuyCrypto(tx: TransactionInfo): boolean {
  return tx.buyCryptoId != null;
}

function TransactionEntry({
  tx,
  onUpdate,
  onReset,
  isSaving,
}: {
  tx: TransactionInfo;
  onUpdate: (data: {
    amlCheck?: string;
    amlReason?: string;
    comment?: string;
    priceDefinitionAllowedDate?: string;
  }) => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
}): JSX.Element {
  const [amlCheck, setAmlCheck] = useState(tx.amlCheck ?? '');
  const [amlReason, setAmlReason] = useState<AmlReason>((tx.amlReason as AmlReason) ?? AmlReason.NA);
  const [setPriceDate, setSetPriceDate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSave(): Promise<void> {
    if (!amlCheck) return;
    setIsProcessing(true);
    try {
      if (amlCheck === 'Reset') {
        await onReset();
      } else {
        await onUpdate({
          amlCheck,
          amlReason,
          priceDefinitionAllowedDate: setPriceDate ? new Date().toISOString() : undefined,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-dfxGray-700 font-medium">Status:</span>
        {statusBadge(tx.amlCheck ?? '-')}
        <span className="text-xs text-dfxGray-700">
          Eingangsdatum: {new Date(tx.created).toLocaleDateString('de-CH')}
        </span>
      </div>

      {/* Checks / Info */}
      <div>
        <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">Transaction Details</h3>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">ID</span>
            <span className="text-sm text-dfxBlue-800">{tx.id}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">UID</span>
            <span className="text-sm text-dfxBlue-800 font-mono">{tx.uid}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Type</span>
            <span className="text-sm text-dfxBlue-800">{tx.type ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Source</span>
            <span className="text-sm text-dfxBlue-800">{tx.sourceType}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Input</span>
            <span className="text-sm text-dfxBlue-800">
              {tx.inputAmount != null ? `${tx.inputAmount} ${tx.inputAsset ?? ''}` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Input Tx Id</span>
            <span className="text-sm text-dfxBlue-800 font-mono break-all">{tx.inputTxId ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">CHF</span>
            <span className="text-sm text-dfxBlue-800">
              {tx.amountInChf != null ? `${tx.amountInChf.toFixed(2)}` : '-'}
            </span>
          </div>
          <div className="flex items-start justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Comment</span>
            <span className="text-sm text-dfxBlue-800 text-right max-w-[60%] whitespace-pre-wrap">
              {tx.comment ?? '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">AML Reason</span>
            <span className="text-sm text-dfxBlue-800">{tx.amlReason ?? '-'}</span>
          </div>
        </div>
      </div>

      {/* AML Decision */}
      <div>
        <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">Entscheid</h3>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">AmlCheck</span>
            <select
              className="ml-4 shrink-0 px-2 py-1 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
              value={amlCheck}
              onChange={(e) => setAmlCheck(e.target.value)}
            >
              <option value="">—</option>
              {AML_CHECK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">AmlReason</span>
            <select
              className="ml-4 shrink-0 px-2 py-1 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 max-w-[250px]"
              value={amlReason}
              onChange={(e) => setAmlReason(e.target.value as AmlReason)}
            >
              {AML_REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300 last:border-0">
            <span className="text-sm text-dfxBlue-800">priceDefinitionAllowedDate setzen</span>
            <input
              type="checkbox"
              checked={setPriceDate}
              onChange={(e) => setSetPriceDate(e.target.checked)}
              className="rounded"
            />
          </div>
        </div>
      </div>

      <div>
        <button
          className="px-4 py-2 text-sm text-white bg-dfxBlue-800 hover:bg-dfxBlue-800/80 rounded-lg transition-colors disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving || isProcessing || !amlCheck}
        >
          {isProcessing ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

export function AmlCheckPendingPanel({
  data,
  onUpdateBuyCrypto,
  onUpdateBuyFiat,
  onResetBuyCryptoAml,
  onResetBuyFiatAml,
  isSaving,
  onReload,
}: AmlCheckPendingPanelProps): JSX.Element {
  const { navigate } = useNavigation();

  const pendingTxs = data.transactions.filter(
    (tx) => tx.type != null && tx.amlCheck === CheckStatus.PENDING && tx.amlReason === AmlReason.MANUAL_CHECK,
  );
  const callQueueTxs = data.transactions.filter(
    (tx) => tx.type != null && tx.amlCheck === CheckStatus.PENDING && callQueueForReason(tx.amlReason),
  );
  const ud = data.userData;

  const walletNames = Array.from(new Set(data.users.map((u) => u.walletName).filter((n): n is string => !!n)));
  const latestManualLogComment = (data.kycLogs ?? [])
    .filter((l) => l.type === 'ManualLog' && l.comment)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0]?.comment;

  // User context info
  const userInfo = (
    <div>
      <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">User Kontext</h3>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">Wallet</span>
          <span className="text-sm text-dfxBlue-800">{walletNames.length ? walletNames.join(', ') : '-'}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">UserDataId</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.id ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">KycLevel</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.kycLevel ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">KycStatus</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.kycStatus ?? '-')}</span>
        </div>
        <div className="flex items-start justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">KycLog Manual Comment</span>
          <span className="text-sm text-dfxBlue-800 text-right max-w-[60%] whitespace-pre-wrap">
            {latestManualLogComment ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">Status</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.status ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">RiskStatus</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.riskStatus ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">VerifiedName</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.verifiedName ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
          <span className="text-sm text-dfxBlue-800">Mail</span>
          <span className="text-sm text-dfxBlue-800">{String(ud.mail ?? '-')}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300 last:border-0">
          <span className="text-sm text-dfxBlue-800">Nationality</span>
          <span className="text-sm text-dfxBlue-800">
            {String(
              typeof ud.nationality === 'object' && ud.nationality
                ? ((ud.nationality as Record<string, unknown>).name ?? '-')
                : (ud.nationality ?? '-'),
            )}
          </span>
        </div>
      </div>
    </div>
  );

  const callQueueInfo =
    callQueueTxs.length > 0 ? (
      <div className="bg-white rounded-lg shadow-sm p-4 text-left">
        <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">Weitere AML-Prüfungen über Call-Queue</h3>
        <p className="text-xs text-dfxGray-700 mb-3">
          Diese pendenten Transaktionen werden über die Call-Queue bearbeitet.
        </p>
        <ul className="divide-y divide-dfxGray-300 border-t border-dfxGray-300">
          {callQueueTxs.map((tx) => {
            const queue = callQueueForReason(tx.amlReason);
            const canNavigate = queue != null && ud.id != null;
            return (
              <li key={tx.id} className="py-2 flex items-start justify-between gap-3">
                <div className="text-sm text-dfxBlue-800 flex flex-col items-start flex-1 min-w-0 text-left">
                  <span>
                    <span className="font-mono">{tx.id}</span> · {tx.type ?? '-'}
                  </span>
                  <span className="text-xs text-dfxGray-700 break-all">{tx.amlReason}</span>
                </div>
                {canNavigate && (
                  <button
                    className="px-2 py-1 text-xs font-medium text-white rounded transition-colors bg-dfxBlue-800 hover:bg-dfxBlue-800/80 shrink-0"
                    onClick={() =>
                      navigate(
                        {
                          pathname: `/compliance/call-queues/${queue}/${ud.id}`,
                          search: `?txId=${tx.id}`,
                        },
                        { clearParams: ['status', 'search'] },
                      )
                    }
                  >
                    Zur Call-Queue
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  if (pendingTxs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {userInfo}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-dfxGray-700">
          Keine pendenten AML-Prüfungen vorhanden.
        </div>
        {callQueueInfo}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {userInfo}
      {callQueueInfo}
      {pendingTxs.map((tx) => (
        <div key={tx.id} className="border-b border-dfxGray-300 pb-6 last:border-0">
          <TransactionEntry
            tx={tx}
            onUpdate={async (updateData) => {
              if (isBuyCrypto(tx) && tx.buyCryptoId != null) {
                await onUpdateBuyCrypto(tx.buyCryptoId, updateData);
              } else if (tx.buyFiatId != null) {
                await onUpdateBuyFiat(tx.buyFiatId, updateData);
              }
              onReload();
            }}
            onReset={async () => {
              if (isBuyCrypto(tx) && tx.buyCryptoId != null) {
                await onResetBuyCryptoAml(tx.buyCryptoId);
              } else if (tx.buyFiatId != null) {
                await onResetBuyFiatAml(tx.buyFiatId);
              }
              onReload();
            }}
            isSaving={isSaving}
          />
        </div>
      ))}
    </div>
  );
}
