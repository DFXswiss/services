// Keyboard handling of the staff message composer in the ticket screens.

// The composer sends on Cmd+Enter (macOS) or Ctrl+Enter; a plain Enter only adds a line, so a
// half-written reply cannot leave by accident. Shift, key-repeat, and IME composition never send.
export function isSendShortcut(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}): boolean {
  return (
    e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.repeat && !e.isComposing
  );
}
