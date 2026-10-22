import { AbortError } from '../abort-error';

describe('AbortError', () => {
  it('stores its message and code and extends Error', () => {
    const error = new AbortError('User cancelled', 4001);

    expect(error).toBeInstanceOf(AbortError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('User cancelled');
    expect(error.code).toBe(4001);
  });

  it('leaves the code undefined when omitted', () => {
    expect(new AbortError().code).toBeUndefined();
  });
});
