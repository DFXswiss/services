import { readFileSync } from 'fs';
import { resolve } from 'path';

const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

describe('personal-IBAN team documentation', () => {
  it('documents the in-memory lifetime and occurrence behavior without durable binding claims', () => {
    expect(readme).toContain(
      'The answer is kept only in memory for the running app instance',
    );
    expect(readme).toContain(
      'A decline applies only to the current selector occurrence',
    );
    expect(readme).not.toContain('persistently bound');
    expect(readme).not.toContain('the choice is then persisted');
  });

  it('plainly identifies both production authentication guarantees as manual checks', () => {
    expect(readme).toContain(
      'an expired production SDK token preserves `personal-iban` through the real login redirect',
    );
    expect(readme).toContain(
      'the real logout → browser Back → reload initialization chain cannot carry a confirmation into the next customer',
    );
    expect(readme).toContain('Check both flows manually.');
    expect(readme).toContain(
      'Meaningful automated coverage is achievable only with a browser test against the real app plus controllable authentication',
    );
  });
});
