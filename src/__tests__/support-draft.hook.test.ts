// Unit tests for useSupportDraft: restore on mount, write-through on change, reload on ticket
// switch, clear, and that merely opening a ticket never writes.

import { act, renderHook } from '@testing-library/react';
import { useSupportDraft } from 'src/hooks/support-draft.hook';
import { draftKey, readDraft, writeDraft } from 'src/util/support-draft';

interface Props {
  id?: string;
}

describe('useSupportDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts empty without a ticket id and never writes', () => {
    const { result } = renderHook(() => useSupportDraft(undefined));
    expect(result.current[0]).toBe('');

    act(() => result.current[1]('text'));
    expect(result.current[0]).toBe('text');
    expect(sessionStorage.length).toBe(0);

    act(() => result.current[2]());
    expect(result.current[0]).toBe('');
  });

  it('restores the stored draft on mount and writes every change through', () => {
    writeDraft('7', 'gespeichert');
    const { result } = renderHook(() => useSupportDraft('7'));
    expect(result.current[0]).toBe('gespeichert');

    act(() => result.current[1]('neu'));
    expect(readDraft('7')).toBe('neu');

    act(() => result.current[1]((prev) => `${prev}\nZeile 2`));
    expect(result.current[0]).toBe('neu\nZeile 2');
    expect(readDraft('7')).toBe('neu\nZeile 2');
  });

  it('resolves consecutive functional updates against the latest text', () => {
    const { result } = renderHook(() => useSupportDraft('7'));
    act(() => {
      result.current[1]((prev) => `${prev}a`);
      result.current[1]((prev) => `${prev}b`);
    });
    expect(result.current[0]).toBe('ab');
    expect(readDraft('7')).toBe('ab');
  });

  it('does not touch the storage when a ticket is merely opened', () => {
    const savedAt = Date.now() - 60_000;
    writeDraft('7', 'gespeichert', savedAt);
    renderHook(() => useSupportDraft('7'));
    expect(JSON.parse(sessionStorage.getItem(draftKey('7')) as string).savedAt).toBe(savedAt);

    renderHook(() => useSupportDraft('9'));
    expect(sessionStorage.getItem(draftKey('9'))).toBeNull();
  });

  it('survives a remount, which is what leaving the ticket and coming back does', () => {
    const first = renderHook(() => useSupportDraft('7'));
    act(() => first.result.current[1]('halb fertig'));
    first.unmount();

    const second = renderHook(() => useSupportDraft('7'));
    expect(second.result.current[0]).toBe('halb fertig');
  });

  it('clears the composer and the stored draft', () => {
    const { result } = renderHook(() => useSupportDraft('7'));
    act(() => result.current[1]('gesendet'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('');
    expect(sessionStorage.getItem(draftKey('7'))).toBeNull();
  });

  it('reloads the draft of the new ticket on a ticket switch instead of carrying the text over', () => {
    writeDraft('8', 'Entwurf acht');
    const { result, rerender } = renderHook((props: Props) => useSupportDraft(props.id), {
      initialProps: { id: '7' } as Props,
    });
    act(() => result.current[1]('Entwurf sieben'));

    rerender({ id: '8' });
    expect(result.current[0]).toBe('Entwurf acht');
    expect(readDraft('7')).toBe('Entwurf sieben');
    expect(readDraft('8')).toBe('Entwurf acht');

    act(() => result.current[1]((prev) => `${prev}!`));
    expect(readDraft('8')).toBe('Entwurf acht!');
    expect(readDraft('7')).toBe('Entwurf sieben');

    rerender({ id: undefined });
    expect(result.current[0]).toBe('');
  });
});
