// Keyboard handling of the staff message composer in the ticket screens.

// The composer sends on Cmd+Enter (macOS) or Ctrl+Enter; a plain Enter only adds a line, so a
// half-written reply cannot leave by accident.
export function isSendShortcut(e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.key === 'Enter' && (e.metaKey || e.ctrlKey);
}
