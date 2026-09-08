// Unit tests for the per-ticket reply-draft storage: read/write/clear, expiry and storage failures.

import { DRAFT_TTL_MS, draftKey, readDraft, writeDraft } from 'src/util/support-draft';

const NOW = 1_700_000_000_000;

describe('support-draft storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('round-trips a draft per ticket and defaults to the current time', () => {
    writeDraft('42', 'Hallo Kunde');
    expect(readDraft('42')).toBe('Hallo Kunde');
    expect(readDraft('43')).toBe('');
    expect(JSON.parse(sessionStorage.getItem(draftKey('42')) as string).savedAt).toBeGreaterThan(0);
  });

  it('removes the entry when an empty text is written', () => {
    writeDraft('42', 'Entwurf', NOW);
    writeDraft('42', '', NOW);
    expect(sessionStorage.getItem(draftKey('42'))).toBeNull();
  });

  it('keeps a draft until the TTL and drops it afterwards on read', () => {
    writeDraft('42', 'Entwurf', NOW);
    expect(readDraft('42', NOW + DRAFT_TTL_MS - 1)).toBe('Entwurf');
    expect(readDraft('42', NOW + DRAFT_TTL_MS)).toBe('');
    expect(sessionStorage.getItem(draftKey('42'))).toBeNull();
  });

  it('treats unreadable entries as no draft and removes them', () => {
    sessionStorage.setItem(draftKey('1'), 'not json');
    sessionStorage.setItem(draftKey('2'), JSON.stringify({ text: 5, savedAt: NOW }));
    sessionStorage.setItem(draftKey('3'), JSON.stringify({ text: 'ok' }));

    expect(readDraft('1', NOW)).toBe('');
    expect(readDraft('2', NOW)).toBe('');
    expect(readDraft('3', NOW)).toBe('');
    expect(sessionStorage.length).toBe(0);
  });

  it('degrades to no draft when the storage cannot be read or written', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readDraft('42', NOW)).toBe('');

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeDraft('42', 'Entwurf', NOW)).not.toThrow();
  });
});
