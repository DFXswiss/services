import { HolderUserData } from 'src/dto/realunit.dto';
import { holderUserDataLines } from 'src/util/holder-user-data';

function userData(overrides: Partial<HolderUserData> & Pick<HolderUserData, 'id'>): HolderUserData {
  return overrides;
}

describe('holderUserDataLines', () => {
  it('shows an em dash and no secondary when userData is null', () => {
    expect(holderUserDataLines(null)).toEqual({ primary: '\u2014' });
  });

  it('prefers verifiedName over firstname and surname', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 1,
          verifiedName: 'Verified Ada',
          firstname: 'Ada',
          surname: 'Lovelace',
          organizationName: 'Acme AG',
        }),
      ),
    ).toEqual({ primary: 'Verified Ada' });
  });

  it('falls through a blank verifiedName to firstname and surname', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 2,
          verifiedName: '   ',
          firstname: 'Ada',
          surname: 'Lovelace',
          organizationName: 'Acme AG',
        }),
      ),
    ).toEqual({ primary: 'Ada Lovelace' });
  });

  it('uses organizationName when no person name is present', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 3,
          verifiedName: null,
          firstname: ' ',
          surname: null,
          organizationName: 'Acme AG',
        }),
      ),
    ).toEqual({ primary: 'Acme AG' });
  });

  it('shows trimmed mail as secondary when a name is present', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 4,
          verifiedName: 'Ada',
          mail: '  ada@example.com  ',
        }),
      ),
    ).toEqual({ primary: 'Ada', secondary: 'ada@example.com' });
  });

  it('ignores whitespace-only mail', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 5,
          verifiedName: 'Ada',
          mail: '   ',
        }),
      ),
    ).toEqual({ primary: 'Ada' });
  });

  it('shows #id and no secondary when every name and the mail are blank', () => {
    expect(
      holderUserDataLines(
        userData({
          id: 42,
          verifiedName: ' ',
          firstname: null,
          surname: undefined,
          organizationName: '',
          mail: ' \t ',
        }),
      ),
    ).toEqual({ primary: '#42' });
  });
});
