import { LedgerAccountBalanceDto } from 'src/dto/ledger.dto';
import {
  decimalsFor,
  formatChf2,
  formatChf2OrDash,
  formatNative,
  formatNative8,
  formatNativeOrDash,
  isFiat,
  reconAmpel,
  reconStatusAmpel,
  stalenessAmpel,
  summarizeLedger,
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

  describe('summarizeLedger', () => {
    // The API serializes balanceChf as a signed SUM(leg.amountChf) (Dr +, Cr −): Liability/Suspense
    // accounts carry a NEGATIVE balanceChf. Net equity is the signed sum (assets + liabilities),
    // matching the API authority journalEquityAt (signed Σ over balance-account types, design §7.6).
    const account = (type: LedgerAccountBalanceDto['type'], balanceChf: number): LedgerAccountBalanceDto => ({
      accountId: 1,
      name: `${type}/x`,
      type,
      currency: 'CHF',
      balanceNative: balanceChf,
      balanceChf,
    });

    it('sums assets, signed liabilities, and net equity (design §7.6 worked example)', () => {
      const summary = summarizeLedger([account('Asset', 100_000), account('Liability', -32_000)]);
      expect(summary.totalAssets).toBe(100_000);
      // signed credit balance stays negative; the screen displays its magnitude (-totalLiabilities)
      expect(summary.totalLiabilities).toBe(-32_000);
      // equity = assets + liabilities = 100'000 + (−32'000) = 68'000, NOT assets − liabilities (132'000)
      expect(summary.netEquity).toBe(68_000);
    });

    it('groups Transit into assets and Suspense into liabilities', () => {
      const summary = summarizeLedger([
        account('Asset', 80_000),
        account('Transit', 20_000),
        account('Liability', -25_000),
        account('Suspense', -7_000),
      ]);
      expect(summary.totalAssets).toBe(100_000);
      expect(summary.totalLiabilities).toBe(-32_000);
      expect(summary.netEquity).toBe(68_000);
    });

    it('ignores income/expense/equity/rounding accounts in the asset/liability split', () => {
      const summary = summarizeLedger([
        account('Asset', 100_000),
        account('Liability', -32_000),
        account('Income', -50_000),
        account('Expense', 10_000),
        account('Equity', -68_000),
        account('Rounding', 1),
      ]);
      expect(summary.totalAssets).toBe(100_000);
      expect(summary.totalLiabilities).toBe(-32_000);
      expect(summary.netEquity).toBe(68_000);
    });

    it('returns zeros for an empty account list', () => {
      expect(summarizeLedger([])).toEqual({ totalAssets: 0, totalLiabilities: 0, netEquity: 0 });
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
