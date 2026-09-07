// Reply drafts of the support ticket screens, kept per ticket in sessionStorage: a draft survives
// a detour to the customer profile (which unmounts the screen) but not the tab, and it is wiped
// with the rest of the session storage on login (src/index.tsx), so it never reaches another
// clerk. A draft older than DRAFT_TTL_MS is dropped on read, so a forgotten draft in a long-lived
// tab does not resurface days later. Storage failures (blocked or full storage) degrade to
// "no draft" instead of breaking the screen.

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const KEY_PREFIX = 'dfx.supportDraft.';

interface StoredDraft {
  text: string;
  savedAt: number;
}

export function draftKey(issueId: string): string {
  return `${KEY_PREFIX}${issueId}`;
}

function parse(raw: string | null): StoredDraft | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<StoredDraft>;
    return typeof value.text === 'string' && typeof value.savedAt === 'number' ? (value as StoredDraft) : undefined;
  } catch {
    return undefined;
  }
}

// The stored draft text, or '' when there is none, it is unreadable, it has expired, or the
// storage cannot be read. A stale or unreadable entry is removed on the way.
export function readDraft(issueId: string, now: number = Date.now()): string {
  const key = draftKey(issueId);
  try {
    const draft = parse(sessionStorage.getItem(key));
    if (draft && now - draft.savedAt < DRAFT_TTL_MS) return draft.text;
    sessionStorage.removeItem(key);
  } catch {
    // blocked storage: treated as no draft
  }
  return '';
}

// Stores the text with the current time; an empty text removes the entry instead.
export function writeDraft(issueId: string, text: string, now: number = Date.now()): void {
  const key = draftKey(issueId);
  try {
    if (text) {
      const draft: StoredDraft = { text, savedAt: now };
      sessionStorage.setItem(key, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // blocked or full storage: the draft simply does not survive leaving the screen
  }
}
