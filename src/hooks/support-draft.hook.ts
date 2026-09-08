import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft } from 'src/util/support-draft';

// Reply-draft state of a ticket screen, persisted per ticket (see util/support-draft) so the text
// is back whenever the clerk returns to the ticket, from the customer profile, the list or another
// ticket. Drop-in for `useState('')`: the setter accepts functional updates and writes every
// change through to the storage; merely opening a ticket never writes. `clear` empties the
// composer and drops the stored draft.
export function useSupportDraft(
  issueId: string | undefined,
): [text: string, setText: Dispatch<SetStateAction<string>>, clear: () => void] {
  const [text, setText] = useState<string>(() => (issueId ? readDraft(issueId) : ''));
  // Latest text, so a functional update is resolved here and the storage write stays a plain
  // side effect of the setter call instead of living inside React's state updater.
  const latest = useRef(text);

  // A ticket switch in place (the id in the URL changes) shows that ticket's own draft.
  useEffect(() => {
    const restored = issueId ? readDraft(issueId) : '';
    latest.current = restored;
    setText(restored);
  }, [issueId]);

  const setDraft = useCallback(
    (update: SetStateAction<string>): void => {
      const next = typeof update === 'function' ? update(latest.current) : update;
      latest.current = next;
      setText(next);
      if (issueId) writeDraft(issueId, next);
    },
    [issueId],
  );

  const clear = useCallback((): void => setDraft(''), [setDraft]);

  return [text, setDraft, clear];
}
