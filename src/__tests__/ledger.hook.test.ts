// Mock @dfx.swiss/react (ES module, no real API in unit tests)
// useMemo must be the real implementation so the hook's memoization works with renderHook.
jest.mock('@dfx.swiss/react', () => ({
  useApi: jest.fn(),
}));
jest.mock('src/dto/safe.dto', () => ({}));

import { renderHook } from '@testing-library/react';
import { useApi } from '@dfx.swiss/react';
import { useLedger } from '../hooks/ledger.hook';

const mockUseApi = useApi as jest.Mock;

// A factory to build a typed `call` spy that resolves to whatever value we preset.
function makeCallMock(resolved: unknown = {}) {
  const spy = jest.fn().mockResolvedValue(resolved);
  mockUseApi.mockReturnValue({ call: spy });
  return spy;
}

describe('useLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getAccounts ──────────────────────────────────────────────────────────

  describe('getAccounts', () => {
    it('calls the correct endpoint with no params', async () => {
      const callSpy = makeCallMock({ period: { from: 'a', to: 'b' }, accounts: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccounts();

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/accounts',
        method: 'GET',
      });
    });

    it('appends from query param when provided', async () => {
      const callSpy = makeCallMock({ period: { from: '2024-01-01', to: 'b' }, accounts: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccounts('2024-01-01');

      expect(callSpy).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'dashboard/accounting/ledger/accounts?from=2024-01-01' }),
      );
    });

    it('appends both from and to query params', async () => {
      const callSpy = makeCallMock({ period: { from: '2024-01-01', to: '2024-12-31' }, accounts: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccounts('2024-01-01', '2024-12-31');

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('from=2024-01-01');
      expect(url).toContain('to=2024-12-31');
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = { period: { from: '2024-01-01', to: '2024-12-31' }, accounts: [{ accountId: 7 }] };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getAccounts();

      expect(response).toEqual(expected);
    });
  });

  // ─── getAccountDetail ─────────────────────────────────────────────────────

  describe('getAccountDetail', () => {
    it('calls the correct endpoint for a given accountId', async () => {
      const callSpy = makeCallMock({ accountId: 42, legs: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccountDetail(42);

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/accounts/42/legs',
        method: 'GET',
      });
    });

    it('appends from, to, and page query params when all provided', async () => {
      const callSpy = makeCallMock({ accountId: 5, legs: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccountDetail(5, '2024-01-01', '2024-06-30', 2);

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('dashboard/accounting/ledger/accounts/5/legs');
      expect(url).toContain('from=2024-01-01');
      expect(url).toContain('to=2024-06-30');
      expect(url).toContain('page=2');
    });

    it('appends only page when from/to are omitted', async () => {
      const callSpy = makeCallMock({ accountId: 3, legs: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getAccountDetail(3, undefined, undefined, 0);

      const { url } = callSpy.mock.calls[0][0];
      // page=0 must be serialized (page !== undefined check)
      expect(url).toContain('page=0');
      expect(url).not.toContain('from=');
      expect(url).not.toContain('to=');
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = { accountId: 99, accountName: 'Test', currency: 'CHF', legs: [], total: 0 };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getAccountDetail(99);

      expect(response).toEqual(expected);
    });
  });

  // ─── getReconStatus ───────────────────────────────────────────────────────

  describe('getReconStatus', () => {
    it('calls the reconciliation endpoint without query params', async () => {
      const callSpy = makeCallMock({ runAt: '2024-01-01T00:00:00Z', accounts: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getReconStatus();

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/reconciliation',
        method: 'GET',
      });
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = { runAt: '2024-03-01T12:00:00Z', accounts: [{ accountId: 1 }] };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getReconStatus();

      expect(response).toEqual(expected);
    });
  });

  // ─── getSuspense ──────────────────────────────────────────────────────────

  describe('getSuspense', () => {
    it('calls the suspense endpoint without query params', async () => {
      const callSpy = makeCallMock({ totalChf: 0, legs: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getSuspense();

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/suspense',
        method: 'GET',
      });
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = { totalChf: 1234.56, legs: [{ legId: 1, amountNative: 0.5 }] };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getSuspense();

      expect(response).toEqual(expected);
    });
  });

  // ─── getMargin ────────────────────────────────────────────────────────────

  describe('getMargin', () => {
    it('calls the margin endpoint with no params', async () => {
      const callSpy = makeCallMock({ periods: [], totalFeeIncome: 0 });
      const { result } = renderHook(() => useLedger());

      await result.current.getMargin();

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/margin',
        method: 'GET',
      });
    });

    it('appends from and to params', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getMargin('2024-01-01', '2024-12-31');

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('from=2024-01-01');
      expect(url).toContain('to=2024-12-31');
    });

    it('appends dailySample=true when set', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getMargin(undefined, undefined, true);

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('dailySample=true');
    });

    it('appends dailySample=false when explicitly set to false', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getMargin(undefined, undefined, false);

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('dailySample=false');
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = { periods: [{ date: '2024-01-01', feeIncome: 100 }], totalFeeIncome: 100 };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getMargin('2024-01-01');

      expect(response).toEqual(expected);
    });
  });

  // ─── getEquityComparison ──────────────────────────────────────────────────

  describe('getEquityComparison', () => {
    it('calls the equity-comparison endpoint with no params', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getEquityComparison();

      expect(callSpy).toHaveBeenCalledWith({
        url: 'dashboard/accounting/ledger/equity-comparison',
        method: 'GET',
      });
    });

    it('appends from param when provided', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getEquityComparison('2024-01-01');

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('from=2024-01-01');
    });

    it('appends dailySample=true when set', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getEquityComparison(undefined, true);

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('dailySample=true');
    });

    it('appends both from and dailySample when both provided', async () => {
      const callSpy = makeCallMock({ periods: [] });
      const { result } = renderHook(() => useLedger());

      await result.current.getEquityComparison('2024-06-01', false);

      const { url } = callSpy.mock.calls[0][0];
      expect(url).toContain('from=2024-06-01');
      expect(url).toContain('dailySample=false');
    });

    it('returns the resolved DTO from call()', async () => {
      const expected = {
        periods: [{ date: '2024-01-01', journalEquity: 50000, financialDataLogTotal: 49900, difference: 100 }],
      };
      makeCallMock(expected);
      const { result } = renderHook(() => useLedger());

      const response = await result.current.getEquityComparison('2024-01-01');

      expect(response).toEqual(expected);
    });
  });

  // ─── hook shape ───────────────────────────────────────────────────────────

  describe('hook shape', () => {
    it('exposes exactly the six ledger functions', () => {
      makeCallMock();
      const { result } = renderHook(() => useLedger());

      expect(typeof result.current.getAccounts).toBe('function');
      expect(typeof result.current.getAccountDetail).toBe('function');
      expect(typeof result.current.getReconStatus).toBe('function');
      expect(typeof result.current.getSuspense).toBe('function');
      expect(typeof result.current.getMargin).toBe('function');
      expect(typeof result.current.getEquityComparison).toBe('function');
    });
  });
});
