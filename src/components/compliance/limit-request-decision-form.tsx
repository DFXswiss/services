import { useEffect, useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  LimitRequestDecision,
  LimitRequestDecisionStep,
  LimitRequestGrantingDecisions,
  useCompliance,
} from 'src/hooks/compliance.hook';
import { toBase64 } from 'src/util/utils';

interface Props {
  limitRequestId: number;
  userDataId: number;
  requestedLimit: number;
  fundOrigin?: string;
  investmentDate?: string;
  /** The account's annual limit as it stands today — what a rejection leaves in force. */
  currentDepositLimit?: number;
  /**
   * The decision already on the request, if it is final. The API refuses to change one, so the form
   * then drops to filing a note and a document: that is the only way to complete a decision whose
   * report or note failed halfway, and it is how a document arriving later gets into the file.
   */
  decidedAs?: string;
  clerks: string[];
  defaultClerk?: string;
  onDecided: () => void;
}

// Collects the decision and hands it to `useCompliance().decideLimitRequest`, which performs the same
// steps in the same order as the Google Sheet (raise the annual limit, record the decision, file the
// report document, file the note) and reports how far it got. The customer message stays where it
// already lives on this screen.
export function LimitRequestDecisionForm({
  limitRequestId,
  userDataId,
  requestedLimit,
  fundOrigin,
  investmentDate,
  currentDepositLimit,
  decidedAs,
  clerks,
  defaultClerk,
  onDecided,
}: Props): JSX.Element {
  const { translate } = useSettingsContext();
  const { decideLimitRequest, fileLimitRequestNote } = useCompliance();

  // A decision recorded by this very attempt whose later step failed: the request is final from then
  // on, so the form must stop offering a decision before the clerk retries and re-writes the deposit
  // limit with whatever is in the amount field. The screen only learns this on its next reload.
  const [recordedDecision, setRecordedDecision] = useState<string>();
  const isDecided = !!decidedAs || !!recordedDecision;
  const effectiveDecision = decidedAs ?? recordedDecision;

  const [clerk, setClerk] = useState(defaultClerk ?? '');
  // The clerk list arrives after the first render. A name typed into the free-text fallback before it
  // does would survive in state while the select shows "-", signing the decision with a name the clerk
  // can no longer see.
  useEffect(() => {
    if (clerks.length && !clerks.includes(clerk))
      setClerk(defaultClerk && clerks.includes(defaultClerk) ? defaultClerk : (clerks[0] ?? ''));
  }, [clerks]);

  const [decision, setDecision] = useState<LimitRequestDecision | ''>('');
  // Prefilled with the requested amount: accepting in full is the common case, and a partial accept is
  // an edit of that number rather than an entry from scratch.
  const [acceptedLimit, setAcceptedLimit] = useState<string>(String(requestedLimit));
  const [comment, setComment] = useState('');
  // The customer's proof of funds, filed with the note in the same step — in the sheet the clerk had to
  // pull it out of the message thread and file it by hand.
  const [document, setDocument] = useState<File>();
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [doneSteps, setDoneSteps] = useState<LimitRequestDecisionStep[]>([]);

  const clerkId = `limit-request-${limitRequestId}-clerk`;
  const decisionId = `limit-request-${limitRequestId}-decision`;
  const acceptedLimitId = `limit-request-${limitRequestId}-accepted-limit`;
  const commentId = `limit-request-${limitRequestId}-comment`;
  const documentId = `limit-request-${limitRequestId}-document`;

  const grantsLimit = !isDecided && !!decision && LimitRequestGrantingDecisions.includes(decision);
  const parsedLimit = Number(acceptedLimit);
  // Both target columns are integers (`user_data.depositLimit`, `limit_request.acceptedLimit`) and both
  // DTOs validate with @IsInt, so a decimal would be refused by the API rather than rounded silently.
  const isLimitValid =
    !grantsLimit || (acceptedLimit.trim() !== '' && Number.isInteger(parsedLimit) && parsedLimit > 0);
  const canSubmit = isDecided
    ? !!clerk.trim() && (!!comment.trim() || !!document) && !isSaving
    : !!clerk.trim() && !!decision && isLimitValid && !isSaving;

  function resetDocument(): void {
    setDocument(undefined);
    if (documentInputRef.current) documentInputRef.current.value = '';
  }

  async function readDocument(): Promise<{ data: string; name: string } | undefined | 'failed'> {
    if (!document) return undefined;
    try {
      // `toBase64` rejects on a FileReader error and resolves undefined on an empty result — both mean
      // the same thing here, and neither may escape and leave the form stuck on "Saving...".
      const data = await toBase64(document);
      return data ? { data, name: document.name } : 'failed';
    } catch {
      return 'failed';
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;

    // Revert needed but target unknown: fail closed rather than store a rejection while the raised limit stays.
    if (
      !isDecided &&
      doneSteps.includes('depositLimit') &&
      decision &&
      !LimitRequestGrantingDecisions.includes(decision) &&
      currentDepositLimit == null
    ) {
      setError(
        translate(
          'screens/compliance',
          'The previous annual limit is unknown, so it cannot be restored. Reload the issue before rejecting.',
        ),
      );
      return;
    }

    setIsSaving(true);
    setError(undefined);

    const attachment = await readDocument();
    if (attachment === 'failed') {
      setIsSaving(false);
      setError(translate('screens/compliance', 'The selected document could not be read'));
      return;
    }

    const result = isDecided
      ? await fileLimitRequestNote(
          { limitRequestId, userDataId },
          { clerk, decision: effectiveDecision as string, comment: comment.trim() || undefined, attachment },
        )
      : await decideLimitRequest({ limitRequestId, userDataId }, decision as LimitRequestDecision, {
          clerk,
          requestedLimit,
          grantedLimit: grantsLimit ? parsedLimit : undefined,
          currentDepositLimit,
          // A prior attempt already raised the limit; a non-granting decision must restore the original.
          ...(doneSteps.includes('depositLimit') && decision && !LimitRequestGrantingDecisions.includes(decision)
            ? { revertDepositLimitTo: currentDepositLimit }
            : {}),
          comment: comment.trim() || undefined,
          fundOrigin,
          investmentDate,
          attachment,
        });

    setIsSaving(false);
    if (result.success) {
      // Cleared only here: resetting at the start of a submit would lose the record of an already
      // raised limit on any early return (e.g. an unreadable document) — the revert path depends on it.
      setDoneSteps([]);
      setComment('');
      resetDocument();
      onDecided();
    } else {
      // Once a step has landed it stays landed; a later attempt that fails before its first step must
      // not erase knowledge of an already raised limit — the revert path above depends on it.
      setDoneSteps(Array.from(new Set([...doneSteps, ...result.completedSteps])));
      setError(result.message ?? translate('screens/compliance', 'Unknown error'));
      if (result.completedSteps.includes('limitRequest') && decision) setRecordedDecision(decision);
    }
  }

  return (
    <div className="mt-4 border-t border-dfxGray-300 pt-4">
      <h3 className="text-sm font-semibold text-dfxBlue-800 mb-3">
        {isDecided
          ? translate('screens/compliance', 'File note for this limit request')
          : translate('screens/compliance', 'Decide Limit Request')}
      </h3>

      <div className="flex gap-3 flex-wrap items-end">
        {!isDecided && (
          <div className="flex flex-col gap-1">
            <label htmlFor={decisionId} className="text-xs text-dfxGray-700">
              {translate('screens/compliance', 'Decision')}
            </label>
            <select
              id={decisionId}
              className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[150px]"
              value={decision}
              onChange={(e) => setDecision(e.target.value as LimitRequestDecision | '')}
            >
              <option value="">-</option>
              <option value={LimitRequestDecision.ACCEPTED}>Accepted</option>
              <option value={LimitRequestDecision.PARTIALLY_ACCEPTED}>PartiallyAccepted</option>
              <option value={LimitRequestDecision.REJECTED}>Rejected</option>
            </select>
          </div>
        )}

        {grantsLimit && (
          <div className="flex flex-col gap-1">
            <label htmlFor={acceptedLimitId} className="text-xs text-dfxGray-700">
              {translate('screens/compliance', 'Accepted limit (CHF)')}
            </label>
            <input
              id={acceptedLimitId}
              type="number"
              min={1}
              step={1}
              className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
              value={acceptedLimit}
              onChange={(e) => setAcceptedLimit(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={clerkId} className="text-xs text-dfxGray-700">
            {translate('screens/compliance', 'Clerk')}
          </label>
          {clerks.length ? (
            <select
              id={clerkId}
              className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
              value={clerk}
              onChange={(e) => setClerk(e.target.value)}
            >
              <option value="">-</option>
              {clerks.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={clerkId}
              className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
              value={clerk}
              onChange={(e) => setClerk(e.target.value)}
              placeholder={translate('screens/compliance', 'Sign')}
            />
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor={commentId} className="text-xs text-dfxGray-700">
            {translate('screens/compliance', 'Internal file note')}
          </label>
          <input
            id={commentId}
            className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 w-full"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={documentId} className="text-xs text-dfxGray-700">
            {translate('screens/compliance', 'Customer document (optional)')}
          </label>
          <input
            id={documentId}
            ref={documentInputRef}
            type="file"
            className="px-2 py-1 text-xs text-dfxBlue-800"
            onChange={(e) => setDocument(e.target.files?.[0])}
          />
        </div>

        <button
          className="px-4 py-1.5 bg-dfxBlue-400 text-white rounded text-xs hover:bg-dfxBlue-800 transition-colors disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSaving
            ? translate('screens/compliance', 'Saving...')
            : isDecided
              ? translate('screens/compliance', 'Save file note')
              : translate('screens/compliance', 'Save decision')}
        </button>
      </div>

      {document && (
        <p className="mt-2 text-xs text-dfxGray-700">
          {translate('screens/compliance', '"{{name}}" is filed with the note under the customer\'s documents.', {
            name: document.name,
          })}
        </p>
      )}

      <p className="mt-2 text-xs text-dfxGray-700">
        {isDecided
          ? translate(
              'screens/compliance',
              'This request is already decided ({{decision}}) and cannot be changed. A note or a document can still be filed.',
              { decision: effectiveDecision as string },
            )
          : grantsLimit
            ? translate(
                'screens/compliance',
                'Sets the annual limit to {{amount}} CHF, records the decision and files the report. The customer is mailed automatically within a few minutes.',
                { amount: isLimitValid ? parsedLimit.toLocaleString() : '-' },
              )
            : decision
              ? currentDepositLimit != null
                ? translate(
                    'screens/compliance',
                    'Keeps the current annual limit of {{amount}} CHF and records the decision.',
                    { amount: currentDepositLimit.toLocaleString() },
                  )
                : translate('screens/compliance', 'Keeps the current annual limit and records the decision.')
              : translate(
                  'screens/compliance',
                  'An accepted request also mails the customer automatically within a few minutes.',
                )}
      </p>

      {error && (
        <div className="mt-3">
          <ErrorHint
            message={`${error}${
              doneSteps.length
                ? ` ${translate('screens/compliance', '(already applied: {{steps}})', {
                    steps: doneSteps.join(', '),
                  })}`
                : ''
            }`}
          />
        </div>
      )}

      {doneSteps.includes('depositLimit') &&
        !!decision &&
        !LimitRequestGrantingDecisions.includes(decision) &&
        currentDepositLimit != null && (
          <p className="mt-2 text-xs text-dfxGray-700">
            {translate(
              'screens/compliance',
              'The annual limit was already raised by the failed attempt. Saving a rejection will restore the previous limit of {{amount}} CHF.',
              { amount: currentDepositLimit.toLocaleString() },
            )}
          </p>
        )}
    </div>
  );
}
