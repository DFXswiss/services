import {
  decimalsFor,
  formatChf2,
  formatChf2OrDash,
  formatNative,
  formatNative8,
  formatNativeOrDash,
  isBlockchainReference,
  isFiat,
  reconAmpel,
  reconStatusAmpel,
  stalenessAmpel,
} from 'src/util/ledger';

describe('ledger util', () => {
  describe('isFiat / decimalsFor', () => {
    it('treats known fiat currencies as fiat', () => {
      expect(isFiat('CHF')).toBe(true);
      expect(isFiat('eur')).toBe(true);
      expect(isFiat('USD')).toBe(true);
    });

    it('treats crypto as non-fiat', () => {
      expect(isFiat('BTC')).toBe(false);
      expect(isFiat('ETH')).toBe(false);
    });

    it('uses 2 decimals for fiat and 8 for crypto', () => {
      expect(decimalsFor('CHF')).toBe(2);
      expect(decimalsFor('BTC')).toBe(8);
    });
  });

  describe('formatNative', () => {
    it('formats fiat with 2 decimals and de-CH grouping', () => {
      // de-CH uses a thin/typographic group separator; assert structure rather than a literal separator char.
      const formatted = formatNative(15000, 'CHF');
      expect(formatted).toMatch(/^15.000\.00$/);
      expect(formatted.endsWith('.00')).toBe(true);
    });

    it('formats crypto with 8 decimals', () => {
      expect(formatNative(1.23456789, 'BTC')).toBe('1.23456789');
    });

    it('renders dash for undefined values', () => {
      expect(formatNativeOrDash(undefined, 'BTC')).toBe('-');
      expect(formatNativeOrDash(0, 'BTC')).toBe('0.00000000');
    });
  });

  describe('formatNative8', () => {
    it('always uses 8 decimals (unit-neutral, no truncation of sub-cent diffs)', () => {
      expect(formatNative8(1.23456789)).toBe('1.23456789');
      // a diff that only lives in decimals 3-8 must NOT collapse to 0 (the reconciliation-screen bug)
      expect(formatNative8(0.00000123)).toBe('0.00000123');
      expect(formatNative8(0)).toBe('0.00000000');
    });

    it('keeps de-CH grouping for large native balances', () => {
      expect(formatNative8(15000)).toMatch(/^15.000\.00000000$/);
    });
  });

  describe('formatChf2', () => {
    it('always uses 2 decimals with de-CH grouping', () => {
      const formatted = formatChf2(1234.5);
      expect(formatted).toMatch(/^1.234\.50$/);
      expect(formatted.endsWith('.50')).toBe(true);
    });

    it('renders dash for undefined', () => {
      expect(formatChf2OrDash(undefined)).toBe('-');
      expect(formatChf2OrDash(0)).toBe('0.00');
    });
  });

  describe('isBlockchainReference', () => {
    it('detects a 64-char hex string', () => {
      expect(isBlockchainReference('a'.repeat(64))).toBe(true);
      expect(isBlockchainReference('0123456789abcdef'.repeat(4))).toBe(true);
    });

    it('rejects non-64-hex strings', () => {
      expect(isBlockchainReference('a'.repeat(63))).toBe(false);
      expect(isBlockchainReference('z'.repeat(64))).toBe(false);
      expect(isBlockchainReference('123')).toBe(false);
    });
  });

  describe('traffic lights', () => {
    it('maps recon status to ampel color', () => {
      expect(reconAmpel('ok')).toBe('green');
      expect(reconAmpel('diff')).toBe('red');
      expect(reconAmpel('stale')).toBe('orange');
      expect(reconAmpel('placeholder')).toBe('gray');
      expect(reconAmpel('unverified')).toBe('gray');
      expect(reconAmpel(undefined)).toBe('gray');
    });

    it('maps account recon status (incl. suspense_alarm) to ampel color', () => {
      expect(reconStatusAmpel('ok')).toBe('green');
      expect(reconStatusAmpel('diff')).toBe('red');
      expect(reconStatusAmpel('suspense_alarm')).toBe('red');
      expect(reconStatusAmpel('stale')).toBe('orange');
      expect(reconStatusAmpel('unverified')).toBe('gray');
    });

    it('maps staleness to ampel color', () => {
      expect(stalenessAmpel('fresh')).toBe('green');
      expect(stalenessAmpel('stale')).toBe('orange');
      expect(stalenessAmpel('missing')).toBe('red');
      expect(stalenessAmpel('placeholder')).toBe('gray');
    });
  });
});
