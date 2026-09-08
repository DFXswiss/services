// Unit tests for the composer send shortcut: only Cmd+Enter / Ctrl+Enter sends.

import { isSendShortcut } from 'src/util/message-composer';

function key(
  name: string,
  mods: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    repeat: boolean;
    isComposing: boolean;
  }> = {},
) {
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

  it('treats Shift+Enter and Shift+Cmd/Ctrl+Enter as a newline', () => {
    expect(isSendShortcut(key('Enter', { shiftKey: true }))).toBe(false);
    expect(isSendShortcut(key('Enter', { metaKey: true, shiftKey: true }))).toBe(false);
    expect(isSendShortcut(key('Enter', { ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('ignores a held (repeated) Cmd/Ctrl+Enter', () => {
    expect(isSendShortcut(key('Enter', { metaKey: true, repeat: true }))).toBe(false);
    expect(isSendShortcut(key('Enter', { ctrlKey: true, repeat: true }))).toBe(false);
  });

  it('ignores Cmd/Ctrl+Enter while an IME composition is active', () => {
    expect(isSendShortcut(key('Enter', { metaKey: true, isComposing: true }))).toBe(false);
    expect(isSendShortcut(key('Enter', { ctrlKey: true, isComposing: true }))).toBe(false);
  });

  it('ignores Alt+Cmd/Ctrl+Enter and Ctrl+Alt+Enter (AltGraph)', () => {
    expect(isSendShortcut(key('Enter', { metaKey: true, altKey: true }))).toBe(false);
    expect(isSendShortcut(key('Enter', { ctrlKey: true, altKey: true }))).toBe(false);
  });

  it('still sends when optional flags are explicitly false', () => {
    expect(
      isSendShortcut(key('Enter', { metaKey: true, shiftKey: false, repeat: false, isComposing: false })),
    ).toBe(true);
    expect(
      isSendShortcut(key('Enter', { ctrlKey: true, shiftKey: false, repeat: false, isComposing: false })),
    ).toBe(true);
  });
});
