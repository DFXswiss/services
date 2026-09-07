// Unit tests for the composer send shortcut: only Cmd+Enter / Ctrl+Enter sends.

import { isSendShortcut } from 'src/util/message-composer';

function key(name: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean }> = {}) {
  return { key: name, metaKey: false, ctrlKey: false, ...mods };
}

describe('isSendShortcut', () => {
  it('sends on Enter with Cmd or Ctrl held', () => {
    expect(isSendShortcut(key('Enter', { metaKey: true }))).toBe(true);
    expect(isSendShortcut(key('Enter', { ctrlKey: true }))).toBe(true);
  });

  it('treats a plain Enter and modified other keys as typing', () => {
    expect(isSendShortcut(key('Enter'))).toBe(false);
    expect(isSendShortcut(key('a', { metaKey: true }))).toBe(false);
    expect(isSendShortcut(key('a', { ctrlKey: true }))).toBe(false);
  });
});
