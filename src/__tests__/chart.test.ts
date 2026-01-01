import { Timeframe, getFromDateByTimeframe } from '../util/chart';

describe('chart utils', () => {
  const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timeframe enum', () => {
    it('should have correct values', () => {
      expect(Timeframe.WEEK).toBe('1W');
      expect(Timeframe.MONTH).toBe('1M');
      expect(Timeframe.QUARTER).toBe('1Q');
      expect(Timeframe.YEAR).toBe('1Y');
      expect(Timeframe.ALL).toBe('All');
    });
  });

  describe('getFromDateByTimeframe', () => {
    it('should return 0 for ALL timeframe', () => {
      expect(getFromDateByTimeframe(Timeframe.ALL)).toBe(0);
    });

    it('should return date 7 days ago for WEEK', () => {
      const result = getFromDateByTimeframe(Timeframe.WEEK);
      const expected = Date.now() - 7 * MILLISECONDS_PER_DAY;
      expect(result).toBe(expected);
    });

    it('should return date 30 days ago for MONTH', () => {
      const result = getFromDateByTimeframe(Timeframe.MONTH);
      const expected = Date.now() - 30 * MILLISECONDS_PER_DAY;
      expect(result).toBe(expected);
    });

    it('should return date 90 days ago for QUARTER', () => {
      const result = getFromDateByTimeframe(Timeframe.QUARTER);
      const expected = Date.now() - 90 * MILLISECONDS_PER_DAY;
      expect(result).toBe(expected);
    });

    it('should return date 365 days ago for YEAR', () => {
      const result = getFromDateByTimeframe(Timeframe.YEAR);
      const expected = Date.now() - 365 * MILLISECONDS_PER_DAY;
      expect(result).toBe(expected);
    });

    it('should return 0 for unknown timeframe', () => {
      expect(getFromDateByTimeframe('unknown' as Timeframe)).toBe(0);
    });

    it('should return increasing values for longer timeframes', () => {
      const week = getFromDateByTimeframe(Timeframe.WEEK);
      const month = getFromDateByTimeframe(Timeframe.MONTH);
      const quarter = getFromDateByTimeframe(Timeframe.QUARTER);
      const year = getFromDateByTimeframe(Timeframe.YEAR);
      
      // Longer timeframes should have smaller (earlier) timestamps
      expect(week).toBeGreaterThan(month);
      expect(month).toBeGreaterThan(quarter);
      expect(quarter).toBeGreaterThan(year);
    });
  });
});
