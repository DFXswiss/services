import { useState } from 'react';
import { BankDataInfo, UserDataDetail } from 'src/hooks/compliance.hook';
import { statusBadge } from 'src/util/compliance-helpers';

interface BankDataReviewPanelProps {
  bankDatas: BankDataInfo[];
  userData: UserDataDetail;
  onApprove: (bankDataId: number) => Promise<void>;
  onReject: (bankDataId: number) => Promise<void>;
  isSaving: boolean;
}

type DecisionValue = '' | 'Akzeptiert' | 'Abgelehnt';

function BankDataEntry({
  entry,
  verifiedName,
  onApprove,
  onReject,
  isSaving,
}: {
  entry: BankDataInfo;
  verifiedName: string;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
  isSaving: boolean;
}): JSX.Element {
  const [decision, setDecision] = useState<DecisionValue>(
    entry.status === 'Completed' ? 'Akzeptiert' : entry.status === 'Failed' ? 'Abgelehnt' : '',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const nameMismatch = verifiedName && entry.name && verifiedName.toLowerCase() !== entry.name.toLowerCase();

  async function handleSave(): Promise<void> {
    if (!decision) return;
    setIsProcessing(true);
    try {
      if (decision === 'Akzeptiert') {
        await onApprove(entry.id);
      } else {
        await onReject(entry.id);
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
        {statusBadge(entry.status ?? '-')}
        <span className="text-xs text-dfxGray-700">
          Eingangsdatum: {new Date(entry.created).toLocaleDateString('de-CH')}
        </span>
      </div>

      {/* Checks */}
      <div>
        <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">Checks</h3>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">IBAN</span>
            <span className="text-sm text-dfxBlue-800 font-mono">{entry.iban}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">Type</span>
            <span className="text-sm text-dfxBlue-800">{entry.type ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">userData verifiedName</span>
            <span className="text-sm text-dfxBlue-800">{verifiedName || '-'}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300">
            <span className="text-sm text-dfxBlue-800">bankData name</span>
            <span className={`text-sm ${nameMismatch ? 'text-red-600 font-semibold' : 'text-dfxBlue-800'}`}>
              {entry.name || '-'}
            </span>
          </div>
          {nameMismatch && (
            <div className="px-3 py-2 border-b border-dfxGray-300 last:border-0">
              <span className="text-sm text-yellow-700">
                Handelt es sich bei &quot;{verifiedName}&quot; und &quot;{entry.name}&quot; um die selbe Person oder ist
                es ein gemeinschaftliches Ehekonto?
              </span>
            </div>
          )}
          {entry.comment && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-dfxGray-300 last:border-0">
              <span className="text-sm text-dfxBlue-800">Comment</span>
              <span className="text-sm text-dfxBlue-800">{entry.comment}</span>
            </div>
          )}
        </div>
      </div>

      {/* Decision */}
      <div className="bg-white rounded-lg shadow-sm px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dfxBlue-800 font-medium">Die Bank-Daten werden:</span>
          <select
            className={`ml-4 shrink-0 px-2 py-1 text-sm border border-dfxGray-400 rounded ${
              decision === 'Akzeptiert'
                ? 'bg-dfxGreen-100/20 text-dfxGreen-100'
                : decision === 'Abgelehnt'
                  ? 'bg-dfxRed-100/20 text-dfxRed-100'
                  : 'bg-white text-dfxBlue-800'
            }`}
            value={decision}
            onChange={(e) => setDecision(e.target.value as DecisionValue)}
          >
            <option value="">—</option>
            <option value="Akzeptiert">Akzeptiert</option>
            <option value="Abgelehnt">Abgelehnt</option>
          </select>
        </div>
      </div>

      {/* Save */}
      <div>
        <button
          className="px-4 py-2 text-sm text-white bg-dfxBlue-800 hover:bg-dfxBlue-800/80 rounded-lg transition-colors disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving || isProcessing || !decision}
        >
          {isProcessing ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

export function BankDataReviewPanel({
  bankDatas,
  userData,
  onApprove,
  onReject,
  isSaving,
}: BankDataReviewPanelProps): JSX.Element {
  const pendingEntries = bankDatas.filter((b) => !b.approved || b.status === 'ManualReview');
  const verifiedName = String(userData.verifiedName ?? '');

  if (pendingEntries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-dfxGray-700">
        Keine Bank-Daten zur Prüfung vorhanden.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingEntries.map((entry) => (
        <div key={entry.id} className="border-b border-dfxGray-300 pb-6 last:border-0">
          <BankDataEntry
            entry={entry}
            verifiedName={verifiedName}
            onApprove={onApprove}
            onReject={onReject}
            isSaving={isSaving}
          />
        </div>
      ))}
    </div>
  );
}
