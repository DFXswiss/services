// Mock @dfx.swiss/react to avoid ES module issues during screen import
jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: jest.fn(() => ({ isLoggedIn: false })),
  useApi: jest.fn(() => ({ call: jest.fn() })),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg' },
  StyledLoadingSpinner: () => null,
}));

jest.mock('src/components/dashboard/age-badge', () => ({ AgeBadge: () => null }));
jest.mock('src/components/dashboard/latest-balance-bar-chart', () => ({ BalanceBarChart: () => null }));
jest.mock('src/components/dashboard/summary-card', () => ({ SummaryCard: () => null }));
jest.mock('src/components/dashboard/total-balance-long-chart', () => ({ TotalBalanceLongChart: () => null }));
jest.mock('src/hooks/dashboard.hook', () => ({ useDashboard: jest.fn(() => ({})) }));
jest.mock('src/hooks/guard.hook', () => ({ useAdminGuard: jest.fn() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: jest.fn() }));

import { FinancialLogEntry, LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { sameLatestBalance, sameLogEntries } from '../screens/dashboard-financial-overview.screen';

function makeBalance(timestamp: string, byTypeCount = 0): LatestBalanceResponse {
  return {
    timestamp,
    byType: Array.from({ length: byTypeCount }, (_, i) => ({
      name: `t${i}`,
      plusBalanceChf: 0,
      minusBalanceChf: 0,
      netBalanceChf: 0,
    })),
    byBlockchain: [],
  };
}

function makeLogEntry(timestamp: string): FinancialLogEntry {
  return {
    timestamp,
    totalBalanceChf: 0,
    plusBalanceChf: 0,
    minusBalanceChf: 0,
    btcPriceChf: 0,
    balancesByType: {},
  };
}

describe('sameLatestBalance', () => {
  it('returns true for identical references', () => {
    const a = makeBalance('2026-05-19T10:00:00Z', 2);
    expect(sameLatestBalance(a, a)).toBe(true);
  });

  it('returns true when both are undefined', () => {
    expect(sameLatestBalance(undefined, undefined)).toBe(true);
  });

  it('returns false when only one side is undefined', () => {
    const a = makeBalance('2026-05-19T10:00:00Z');
    expect(sameLatestBalance(a, undefined)).toBe(false);
    expect(sameLatestBalance(undefined, a)).toBe(false);
  });

  it('returns true when timestamps and byType lengths match', () => {
    const a = makeBalance('2026-05-19T10:00:00Z', 3);
    const b = makeBalance('2026-05-19T10:00:00Z', 3);
    expect(sameLatestBalance(a, b)).toBe(true);
  });

  it('returns false when timestamps differ', () => {
    const a = makeBalance('2026-05-19T10:00:00Z', 3);
    const b = makeBalance('2026-05-19T10:01:00Z', 3);
    expect(sameLatestBalance(a, b)).toBe(false);
  });

  it('returns false when byType lengths differ', () => {
    const a = makeBalance('2026-05-19T10:00:00Z', 3);
    const b = makeBalance('2026-05-19T10:00:00Z', 4);
    expect(sameLatestBalance(a, b)).toBe(false);
  });
});

describe('sameLogEntries', () => {
  it('returns true for identical references', () => {
    const entries = [makeLogEntry('2026-05-19T10:00:00Z')];
    expect(sameLogEntries(entries, entries)).toBe(true);
  });

  it('returns true for two empty arrays', () => {
    expect(sameLogEntries([], [])).toBe(true);
  });

  it('returns false when lengths differ', () => {
    const a = [makeLogEntry('2026-05-19T10:00:00Z')];
    const b = [makeLogEntry('2026-05-19T10:00:00Z'), makeLogEntry('2026-05-19T11:00:00Z')];
    expect(sameLogEntries(a, b)).toBe(false);
  });

  it('returns true when last timestamps match', () => {
    const a = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:00:00Z')];
    const b = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:00:00Z')];
    expect(sameLogEntries(a, b)).toBe(true);
  });

  it('returns false when last timestamps differ', () => {
    const a = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:00:00Z')];
    const b = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:05:00Z')];
    expect(sameLogEntries(a, b)).toBe(false);
  });

  it('treats append-only update with new tail as different', () => {
    const a = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:00:00Z')];
    const b = [makeLogEntry('2026-05-19T09:00:00Z'), makeLogEntry('2026-05-19T10:00:00Z'), makeLogEntry('2026-05-19T11:00:00Z')];
    expect(sameLogEntries(a, b)).toBe(false);
  });
});
