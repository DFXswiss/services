import { TranslatedError } from '../util/translated-error';

describe('TranslatedError', () => {
  it('should be an instance of Error', () => {
    const error = new TranslatedError('screens/home.error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TranslatedError);
  });

  it('should store translation key as message', () => {
    const translationKey = 'screens/buy.insufficientFunds';
    const error = new TranslatedError(translationKey);
    expect(error.message).toBe(translationKey);
  });

  it('should be distinguishable from regular Error', () => {
    const translatedError = new TranslatedError('key');
    const regularError = new Error('message');

    expect(translatedError instanceof TranslatedError).toBe(true);
    expect(regularError instanceof TranslatedError).toBe(false);
  });

  it('should be catchable in try-catch', () => {
    const throwTranslated = () => {
      throw new TranslatedError('error.key');
    };

    expect(throwTranslated).toThrow(TranslatedError);
    expect(throwTranslated).toThrow('error.key');
  });

  it('should work with empty message', () => {
    const error = new TranslatedError('');
    expect(error.message).toBe('');
  });

  it('should preserve stack trace', () => {
    const error = new TranslatedError('test');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('test');
  });
});
