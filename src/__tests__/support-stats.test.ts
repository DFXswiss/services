import type { SupportIssueListItem } from '../hooks/support-dashboard.hook';
import { computeStatistics, customerWaitingHours, granularityFor, trendLabel, waitTier } from '../util/support-stats';

const NOW = new Date('2026-06-18T12:00:00Z');

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

function issue(partial: Partial<SupportIssueListItem>): SupportIssueListItem {
  return {
    id: 1,
    uid: 'u1',
    type: 'TransactionIssue',
    reason: 'Other',
    state: 'Pending',
    name: 'Test',
    created: NOW.toISOString(),
    messageCount: 1,
    ...partial,
  };
}

describe('support-helpers customer waiting', () => {
  it('reports the waiting time only while the customer is awaiting a reply', () => {
    expect(
      customerWaitingHours(issue({ lastMessageAuthor: 'Customer', lastMessageDate: hoursAgo(25) }), NOW),
    ).toBeCloseTo(25);
    expect(
      customerWaitingHours(issue({ lastMessageAuthor: 'Customer', lastMessageDate: hoursAgo(5) }), NOW),
    ).toBeCloseTo(5);
  });

  it('returns null when we replied last (timer resets on author flip) or there are no messages', () => {
    expect(customerWaitingHours(issue({ lastMessageAuthor: 'Josh', lastMessageDate: hoursAgo(40) }), NOW)).toBeNull();
    expect(customerWaitingHours(issue({ messageCount: 0 }), NOW)).toBeNull();
  });

  it('maps waiting time to rising-severity tiers (1h/12h/24h; 24h = escalated)', () => {
    expect(waitTier(0.5)).toBe(0);
    expect(waitTier(5)).toBe(1);
    expect(waitTier(13)).toBe(2);
    expect(waitTier(25)).toBe(3);
  });
});

describe('support-helpers statistics', () => {
  it('chooses daily granularity for short periods and monthly for long ones', () => {
    expect(granularityFor(7)).toBe('day');
    expect(granularityFor(30)).toBe('day');
    expect(granularityFor(183)).toBe('month');
    expect(granularityFor(365)).toBe('month');
  });

  it('counts only tickets within the selected period and averages their messages', () => {
    const issues = [
      issue({ id: 1, created: daysAgo(2), messageCount: 4 }),
      issue({ id: 2, created: daysAgo(10), messageCount: 2 }),
      issue({ id: 3, created: daysAgo(40), messageCount: 10 }), // outside 30d
    ];

    const stats = computeStatistics(issues, 30, NOW);
    expect(stats.total).toBe(2);
    expect(stats.avgMessages).toBeCloseTo(3); // (4 + 2) / 2
    expect(stats.perDay).toBeCloseTo(2 / 30);
  });

  it('builds one daily bucket per day for a 7-day period, oldest first', () => {
    const stats = computeStatistics([issue({ created: hoursAgo(1) })], 7, NOW);
    expect(stats.granularity).toBe('day');
    expect(stats.trend).toHaveLength(7);
    expect(stats.trend[stats.trend.length - 1].count).toBe(1); // today
    expect(stats.trend.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it('builds twelve monthly buckets for a yearly period', () => {
    const stats = computeStatistics([], 365, NOW);
    expect(stats.granularity).toBe('month');
    expect(stats.trend).toHaveLength(12);
  });

  it('returns zeroed values for an empty input', () => {
    const stats = computeStatistics([], 30, NOW);
    expect(stats.total).toBe(0);
    expect(stats.avgMessages).toBe(0);
    expect(stats.perDay).toBe(0);
  });
});

describe('support-helpers trendLabel', () => {
  it('formats day and month keys (locale-independent assertions)', () => {
    // day label contains both the day and month numbers, regardless of locale order/separator
    const dayLabel = trendLabel('2026-06-18', 'day');
    expect(dayLabel).toMatch(/18/);
    expect(dayLabel).toMatch(/06/);
    // month label is a non-empty localized string
    expect(trendLabel('2026-06', 'month').length).toBeGreaterThan(0);
  });
});
