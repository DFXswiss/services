export enum Timeframe {
  WEEK = '1W',
  MONTH = '1M',
  QUARTER = '1Q',
  YEAR = '1Y',
  ALL = 'All',
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getFromDateByTimeframe(timeframe: Timeframe): number {
  switch (timeframe) {
    case Timeframe.ALL:
      return 0;
    case Timeframe.WEEK:
      return Date.now() - 7 * MILLISECONDS_PER_DAY;
    case Timeframe.MONTH:
      return Date.now() - 30 * MILLISECONDS_PER_DAY;
    case Timeframe.QUARTER:
      return Date.now() - 90 * MILLISECONDS_PER_DAY;
    case Timeframe.YEAR:
      return Date.now() - 365 * MILLISECONDS_PER_DAY;
    default:
      return 0;
  }
}

