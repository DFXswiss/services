import { AbortError } from '../util/abort-error';

describe('AbortError', () => {
  it('should be an instance of Error', () => {
    const error = new AbortError('Operation aborted');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AbortError);
  });

  it('should have the correct message', () => {
    const message = 'User cancelled the operation';
    const error = new AbortError(message);
    expect(error.message).toBe(message);
  });

  it('should have the correct name', () => {
    const error = new AbortError();
    expect(error.name).toBe('Error');
  });

  it('should work without a message', () => {
    const error = new AbortError();
    expect(error.message).toBe('');
  });

  it('should be catchable as AbortError', () => {
    const throwAbort = () => {
      throw new AbortError('Aborted');
    };

    expect(throwAbort).toThrow(AbortError);
  });

  it('should be distinguishable from regular Error', () => {
    const abortError = new AbortError('abort');
    const regularError = new Error('regular');

    expect(abortError instanceof AbortError).toBe(true);
    expect(regularError instanceof AbortError).toBe(false);
  });
});
