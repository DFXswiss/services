import fs from 'fs';
import path from 'path';

describe('documented widget personal-IBAN contract', () => {
  const readme = fs.readFileSync(path.resolve(process.cwd(), 'README.md'), 'utf8');

  it('documents local invalid-selector handling and explicit standard-details fallback (A3)', () => {
    expect(readme).toContain(
      'invalid or unknown provider values are blocked locally and are not sent to the API',
    );
    expect(readme).toContain(
      'the customer must explicitly confirm before the widget requests and displays ordinary bank details without the selector',
    );
    expect(readme).not.toContain(
      'the API rejects them and there is no fallback to the default bank',
    );
  });

  it('documents session, address, and signature as initialization-only (A1/B3)', () => {
    expect(readme).toContain(
      'including `session`, `address`, and `signature` credentials — remain initialization-only',
    );
    expect(readme).toContain(
      'changing them on an already-mounted React integration or connected Web Component does not reauthenticate the instance; remount it to change customers',
    );
  });
});
