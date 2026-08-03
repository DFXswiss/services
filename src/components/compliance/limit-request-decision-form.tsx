import { StyledButton, StyledButtonWidth } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { LimitRequestDecision, LimitRequestInfo, useCompliance } from 'src/hooks/compliance.hook';

interface Props {
  limitRequest: LimitRequestInfo;
  onDecided: () => void;
}

// Decides a pending limit request in the compliance tool. Until this existed the decision had to be
// made in the Google Sheet, because the API endpoint (PUT /limitRequest/:id) had no UI at all.
export function LimitRequestDecisionForm({ limitRequest, onDecided }: Props): JSX.Element {
  const { updateLimitRequest, getCallQueueClerks } = useCompliance();

  const [clerks, setClerks] = useState<string[]>([]);
  const [signature, setSignature] = useState('');
  const [decision, setDecision] = useState<LimitRequestDecision | ''>('');
  // Prefilled with the requested amount: accepting in full is the common case, and a partial accept is
  // an edit of that number rather than an entry from scratch.
  const [acceptedLimit, setAcceptedLimit] = useState<string>(String(limitRequest.limit));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Ids are derived from the request so the labels stay associated even if a screen ever renders more
  // than one of these forms.
  const signatureId = `limit-request-${limitRequest.id}-signature`;
  const decisionId = `limit-request-${limitRequest.id}-decision`;
  const acceptedLimitId = `limit-request-${limitRequest.id}-accepted-limit`;

  useEffect(() => {
    getCallQueueClerks()
      .then((list) => {
        setClerks(list);
        setSignature((prev) => prev || list[0] || '');
      })
      // The clerk list is a convenience; failing to load it must not block the decision, so the field
      // falls back to free text below.
      .catch(() => setClerks([]));
  }, []);

  const grantsLimit =
    decision === LimitRequestDecision.ACCEPTED || decision === LimitRequestDecision.PARTIALLY_ACCEPTED;
  const parsedLimit = Number(acceptedLimit);
  const isLimitValid = !grantsLimit || (acceptedLimit.trim() !== '' && Number.isFinite(parsedLimit) && parsedLimit > 0);
  const canSubmit = !!signature.trim() && !!decision && isLimitValid && !isSaving;

  async function handleSubmit(): Promise<void> {
    if (!decision || !signature.trim() || !isLimitValid) return;

    setIsSaving(true);
    setError(undefined);
    try {
      await updateLimitRequest(limitRequest.id, {
        decision,
        acceptedLimit: grantsLimit ? parsedLimit : undefined,
        clerk: signature.trim(),
      });
      onDecided();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t border-dfxGray-300 pt-4">
      <h3 className="text-sm font-semibold text-dfxBlue-800 mb-3">Decision</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={signatureId} className="block text-sm font-medium text-dfxBlue-800 mb-1">
            Signature
          </label>
          {clerks.length ? (
            <select
              id={signatureId}
              className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            >
              <option value="">—</option>
              {clerks.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={signatureId}
              className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Your sign"
            />
          )}
        </div>

        <div>
          <label htmlFor={decisionId} className="block text-sm font-medium text-dfxBlue-800 mb-1">
            Decision
          </label>
          <select
            id={decisionId}
            className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
            value={decision}
            onChange={(e) => setDecision(e.target.value as LimitRequestDecision | '')}
          >
            <option value="">—</option>
            <option value={LimitRequestDecision.ACCEPTED}>Accept</option>
            <option value={LimitRequestDecision.PARTIALLY_ACCEPTED}>Partially accept</option>
            <option value={LimitRequestDecision.REJECTED}>Reject</option>
          </select>
        </div>
      </div>

      {grantsLimit && (
        <div className="mt-4 max-w-xs">
          <label htmlFor={acceptedLimitId} className="block text-sm font-medium text-dfxBlue-800 mb-1">
            Accepted limit (CHF)
          </label>
          <input
            id={acceptedLimitId}
            type="number"
            min={1}
            className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
            value={acceptedLimit}
            onChange={(e) => setAcceptedLimit(e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorHint message={error} />
        </div>
      )}

      <div className="mt-4 max-w-xs">
        <StyledButton
          width={StyledButtonWidth.FULL}
          label={isSaving ? 'Saving...' : 'Save decision'}
          onClick={handleSubmit}
          disabled={!canSubmit}
        />
      </div>
    </div>
  );
}
