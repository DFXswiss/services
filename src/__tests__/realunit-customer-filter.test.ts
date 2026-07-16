import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';
import { isEmptyAccount } from 'src/util/realunit-customer-filter';

const customer = (overrides: Partial<RealUnitCustomerListDto>): RealUnitCustomerListDto => ({
  id: 1,
  kycStatus: 'NA',
  ...overrides,
});

describe('isEmptyAccount', () => {
  it('is true for a wallet-only account (no name, no mail, KYC 0, resolved zero balance)', () => {
    expect(isEmptyAccount(customer({ kycLevel: '0', balance: 0 }))).toBe(true);
  });

  it('is true when kycLevel is missing entirely but the balance is a resolved zero', () => {
    expect(isEmptyAccount(customer({ balance: 0 }))).toBe(true);
  });

  it('is false when the balance is unresolved (undefined) — an outage must never hide a holder', () => {
    expect(isEmptyAccount(customer({ kycLevel: '0' }))).toBe(false);
  });

  it('is false when a mail is present', () => {
    expect(isEmptyAccount(customer({ mail: 'a@b.ch', balance: 0 }))).toBe(false);
  });

  it('is false when a name is present', () => {
    expect(isEmptyAccount(customer({ name: 'Alice Muster', balance: 0 }))).toBe(false);
  });

  it('is false when KYC has progressed', () => {
    expect(isEmptyAccount(customer({ kycLevel: '10', balance: 0 }))).toBe(false);
  });

  it('is false for a terminated/rejected account (negative level is not "no progress")', () => {
    expect(isEmptyAccount(customer({ kycLevel: '-10', balance: 0 }))).toBe(false);
  });

  it('is false when the account holds REALU', () => {
    expect(isEmptyAccount(customer({ balance: 3 }))).toBe(false);
  });
});
