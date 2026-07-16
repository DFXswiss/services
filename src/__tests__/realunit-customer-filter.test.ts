import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';
import { isEmptyAccount, isTestAccount, partitionCustomers } from 'src/util/realunit-customer-filter';

const customer = (overrides: Partial<RealUnitCustomerListDto>): RealUnitCustomerListDto => ({
  id: 1,
  kycStatus: 'NA',
  ...overrides,
});

describe('realunit-customer-filter', () => {
  describe('isEmptyAccount', () => {
    it('is true for a wallet-only account (no name, no mail, KYC 0, no balance)', () => {
      expect(isEmptyAccount(customer({ kycLevel: '0', balance: 0 }))).toBe(true);
    });

    it('is true when kycLevel and balance are missing entirely', () => {
      expect(isEmptyAccount(customer({}))).toBe(true);
    });

    it('is false when a mail is present', () => {
      expect(isEmptyAccount(customer({ mail: 'a@b.ch' }))).toBe(false);
    });

    it('is false when a name is present', () => {
      expect(isEmptyAccount(customer({ name: 'Alice Muster' }))).toBe(false);
    });

    it('is false when KYC has progressed', () => {
      expect(isEmptyAccount(customer({ kycLevel: '10' }))).toBe(false);
    });

    it('is false when the account holds REALU', () => {
      expect(isEmptyAccount(customer({ balance: 3 }))).toBe(false);
    });
  });

  describe('isTestAccount', () => {
    it('matches the known internal test mail with plus-addressing', () => {
      expect(isTestAccount(customer({ mail: 'cyrill15+wrewwe@gmail.com' }))).toBe(true);
    });

    it('matches the base test mail and ignores case', () => {
      expect(isTestAccount(customer({ mail: 'Cyrill15@GMAIL.com' }))).toBe(true);
    });

    it('does not match a regular customer mail containing a plus', () => {
      expect(isTestAccount(customer({ mail: 'jane+dfx@example.com' }))).toBe(false);
    });

    it('does not match an account without mail', () => {
      expect(isTestAccount(customer({}))).toBe(false);
    });
  });

  describe('partitionCustomers', () => {
    it('puts every customer in exactly one bucket, test wins over empty', () => {
      const regular = customer({ id: 1, name: 'Alice Muster', mail: 'alice@example.com', kycLevel: '30' });
      const empty = customer({ id: 2 });
      const test = customer({ id: 3, mail: 'cyrill15+x@gmail.com', kycLevel: '20' });

      const partition = partitionCustomers([regular, empty, test]);

      expect(partition.regular.map((c) => c.id)).toEqual([1]);
      expect(partition.empty.map((c) => c.id)).toEqual([2]);
      expect(partition.test.map((c) => c.id)).toEqual([3]);
      expect(partition.regular.length + partition.empty.length + partition.test.length).toBe(3);
    });

    it('keeps the original order within each bucket', () => {
      const list = [customer({ id: 5 }), customer({ id: 4 }), customer({ id: 9, name: 'X', mail: 'x@y.ch' })];
      const partition = partitionCustomers(list);
      expect(partition.empty.map((c) => c.id)).toEqual([5, 4]);
      expect(partition.regular.map((c) => c.id)).toEqual([9]);
    });
  });
});
