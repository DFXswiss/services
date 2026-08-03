import { useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
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
  const { decideLimitRequest, fileLimitRequestNote } = useCompliance();

  const isDecided = !!decidedAs;

  const [clerk, setClerk] = useState(defaultClerk ?? '');
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
    const data = await toBase64(document);
    if (!data) return 'failed';
    return { data, name: document.name };
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;

    setIsSaving(true);
    setError(undefined);
    setDoneSteps([]);

    const attachment = await readDocument();
    if (attachment === 'failed') {
      setIsSaving(false);
      setError('The selected document could not be read');
      return;
    }

    const result = isDecided
      ? await fileLimitRequestNote(
          { limitRequestId, userDataId },
          { clerk, decision: decidedAs as string, comment: comment.trim() || undefined, attachment },
        )
      : await decideLimitRequest({ limitRequestId, userDataId }, decision as LimitRequestDecision, {
          clerk,
          requestedLimit,
          grantedLimit: grantsLimit ? parsedLimit : undefined,
          currentDepositLimit,
          comment: comment.trim() || undefined,
          fundOrigin,
          investmentDate,
          attachment,
        });

    setIsSaving(false);
    if (result.success) {
      setComment('');
      resetDocument();
      onDecided();
    } else {
      // Naming the steps that did land matters: after a failure in between, the operator has to know
      // whether the limit was already raised before retrying.
      setDoneSteps(result.completedSteps);
      setError(result.message ?? 'Unknown error');
    }
  }

  return (
    <div className="mt-4 border-t border-dfxGray-300 pt-4">
      <h3 className="text-sm font-semibold text-dfxBlue-800 mb-3">
        {isDecided ? 'File note for this limit request' : 'Decide Limit Request'}
      </h3>

      <div className="flex gap-3 flex-wrap items-end">
        {!isDecided && (
          <div className="flex flex-col gap-1">
            <label htmlFor={decisionId} className="text-xs text-dfxGray-700">
              Decision
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
              Accepted limit (CHF)
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
            Clerk
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
              placeholder="Sign"
            />
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor={commentId} className="text-xs text-dfxGray-700">
            Internal file note
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
            Customer document (optional)
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
          {isSaving ? 'Saving...' : isDecided ? 'Save file note' : 'Save decision'}
        </button>
      </div>

      {document && (
        <p className="mt-2 text-xs text-dfxGray-700">
          {`"${document.name}" is filed with the note under the customer's documents.`}
        </p>
      )}

      <p className="mt-2 text-xs text-dfxGray-700">
        {isDecided
          ? `This request is already decided (${decidedAs}) and cannot be changed. A note or a document can still be filed.`
          : grantsLimit
            ? `Sets the annual limit to ${
                isLimitValid ? parsedLimit.toLocaleString() : '-'
              } CHF and records the decision.`
            : decision
              ? `Keeps the current annual limit${
                  currentDepositLimit != null ? ` of ${currentDepositLimit.toLocaleString()} CHF` : ''
                } and records the decision.`
              : 'The customer message is sent separately below, as before.'}
      </p>

      {error && (
        <div className="mt-3">
          <ErrorHint message={`${error}${doneSteps.length ? ` (already applied: ${doneSteps.join(', ')})` : ''}`} />
        </div>
      )}
    </div>
  );
}
