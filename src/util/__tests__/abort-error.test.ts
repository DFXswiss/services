import { AbortError } from '../abort-error';

describe('AbortError', () => {
  it('stores the cancellation code used by MetaMask error handling', () => {
    const error = new AbortError('User cancelled', 4001);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('User cancelled');
    expect(error.code).toBe(4001);
  });

  it('leaves an omitted cancellation code undefined', () => {
    expect(new AbortError().code).toBeUndefined();
  });
});
