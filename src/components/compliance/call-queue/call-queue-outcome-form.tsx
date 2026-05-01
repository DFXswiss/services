import { StyledButton, StyledButtonWidth } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CallOutcome, CallOutcomeContext, CallOutcomeResult, useCompliance } from 'src/hooks/compliance.hook';

interface Props {
  context: CallOutcomeContext;
  availableOutcomes: CallOutcome[];
  clerks: string[];
  onSaved: () => void;
  title: string;
}

export function CallQueueOutcomeForm({ context, availableOutcomes, clerks, onSaved, title }: Props): JSX.Element {
  const { translate } = useSettingsContext();
  const { saveCallOutcome } = useCompliance();

  const [signature, setSignature] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<CallOutcomeResult>();

  useEffect(() => {
    setSignature((prev) => prev || clerks[0] || '');
  }, [clerks]);

  const canSubmit = !!signature && !!outcome && !isSaving;

  async function handleSubmit() {
    if (!outcome || !signature) return;
    setIsSaving(true);
    setResult(undefined);
    const res = await saveCallOutcome(context, outcome, { signature, comment });
    setIsSaving(false);
    setResult(res);
    if (res.success) onSaved();
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dfxBlue-800 mb-1">Signature</label>
          <select
            className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          >
            <option value="">—</option>
            {clerks.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dfxBlue-800 mb-1">Outcome</label>
          <select
            className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CallOutcome | '')}
          >
            <option value="">—</option>
            {availableOutcomes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-dfxBlue-800 mb-1">{translate('screens/kyc', 'Comment')}</label>
        <textarea
          className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
          rows={4}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional: Notes from the call"
        />
      </div>
      {result && !result.success && (
        <div className="mt-3">
          <ErrorHint message={renderFailureMessage(result)} />
        </div>
      )}
      <div className="mt-4">
        <StyledButton
          label="Save Outcome"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSaving}
          width={StyledButtonWidth.FULL}
        />
      </div>
    </div>
  );
}

function renderFailureMessage(result: CallOutcomeResult): string {
  const reason = `Failed at step '${result.failedStep ?? 'unknown'}': ${result.message ?? 'Unknown error'}`;
  if (result.completedSteps.length === 0) return reason;
  const done = result.completedSteps.join(', ');
  return `${reason}. Previously completed: ${done}. Please verify state manually before retry.`;
}
