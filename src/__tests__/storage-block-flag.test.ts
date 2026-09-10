import { getStorageBlockedFlag, setStorageBlockedFlag } from '../util/storage-block-flag';

describe('storage-block-flag', () => {
  afterEach(() => {
    setStorageBlockedFlag(false);
  });

  it('defaults to false and round-trips', () => {
    expect(getStorageBlockedFlag()).toBe(false);
    setStorageBlockedFlag(true);
    expect(getStorageBlockedFlag()).toBe(true);
    setStorageBlockedFlag(false);
    expect(getStorageBlockedFlag()).toBe(false);
  });
});
