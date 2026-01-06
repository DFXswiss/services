// Mock @dfx.swiss/react to avoid ES module issues
jest.mock('@dfx.swiss/react', () => ({
  Asset: {},
  Fiat: {},
  KycFile: {},
  UserAddress: {},
  Utils: {
    formatAmount: jest.fn((amount: number) => amount.toFixed(2)),
    formatAmountCrypto: jest.fn((amount: number) => amount.toString()),
  },
}));

// Mock src/dto/safe.dto
jest.mock('src/dto/safe.dto', () => ({
  CustodyAsset: {},
  CustodyAssetBalance: {},
}));

import {
  isDefined,
  partition,
  isEmpty,
  removeNullFields,
  delay,
  isAbsoluteUrl,
  blankedAddress,
  formatBytes,
  formatUnits,
  filenameDateFormat,
  extractFilename,
  formatCurrency,
  FormatType,
  deepEqual,
  equalsIgnoreCase,
  formatLocationAddress,
} from '../util/utils';

describe('utils', () => {
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('should return false for undefined and null', () => {
      expect(isDefined(undefined)).toBe(false);
      expect(isDefined(null)).toBe(false);
    });
  });

  describe('partition', () => {
    it('should partition array based on predicate', () => {
      const [even, odd] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
      expect(even).toEqual([2, 4]);
      expect(odd).toEqual([1, 3, 5]);
    });

    it('should handle empty array', () => {
      const [truthy, falsy] = partition([], () => true);
      expect(truthy).toEqual([]);
      expect(falsy).toEqual([]);
    });

    it('should handle undefined array', () => {
      const [truthy, falsy] = partition(undefined, () => true);
      expect(truthy).toEqual([]);
      expect(falsy).toEqual([]);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty('text')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('removeNullFields', () => {
    it('should remove null and undefined fields', () => {
      const obj = { a: 1, b: null, c: undefined, d: 'test' };
      const result = removeNullFields(obj);
      expect(result).toEqual({ a: 1, d: 'test' });
    });

    it('should return undefined for undefined input', () => {
      expect(removeNullFields(undefined)).toBeUndefined();
    });

    it('should keep falsy but defined values', () => {
      const obj = { a: 0, b: '', c: false, d: null };
      const result = removeNullFields(obj);
      expect(result).toEqual({ a: 0, b: '', c: false });
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(0.1);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('isAbsoluteUrl', () => {
    it('should return true for absolute URLs', () => {
      expect(isAbsoluteUrl('http://example.com')).toBe(true);
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
      expect(isAbsoluteUrl('//example.com')).toBe(true);
    });

    it('should return false for relative URLs', () => {
      expect(isAbsoluteUrl('/path/to/page')).toBe(false);
      expect(isAbsoluteUrl('path/to/page')).toBe(false);
    });
  });

  describe('blankedAddress', () => {
    it('should truncate long addresses', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const result = blankedAddress(address, { displayLength: 16 });
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(address.length);
    });

    it('should not truncate short addresses', () => {
      const address = '0x1234';
      const result = blankedAddress(address, { displayLength: 20 });
      expect(result).toBe(address);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });
  });

  describe('formatUnits', () => {
    it('should format units with decimals', () => {
      expect(formatUnits('1000000000000000000', 18)).toBe('1');
      expect(formatUnits('1500000000000000000', 18)).toBe('1.5');
    });

    it('should handle zero', () => {
      expect(formatUnits('0', 18)).toBe('0');
    });
  });

  describe('filenameDateFormat', () => {
    it('should return formatted date string', () => {
      const result = filenameDateFormat();
      expect(result).toMatch(/^\d{8}_\d{6}$/);
    });
  });

  describe('extractFilename', () => {
    it('should extract filename from content-disposition', () => {
      expect(extractFilename('attachment; filename="test.pdf"')).toBe('test.pdf');
    });

    it('should return undefined for missing header', () => {
      expect(extractFilename(undefined)).toBeUndefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in Swiss format', () => {
      const result = formatCurrency(1234.56, 2, 2, FormatType.SWISS);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
    });

    it('should format currency in US format', () => {
      expect(formatCurrency(1234.56, 2, 2, FormatType.US)).toBe('1,234.56');
    });

    it('should return null for invalid values', () => {
      expect(formatCurrency(NaN)).toBeNull();
    });
  });

  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
    });

    it('should compare objects deeply', () => {
      expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });
  });

  describe('equalsIgnoreCase', () => {
    it('should compare strings case-insensitively', () => {
      expect(equalsIgnoreCase('ABC', 'abc')).toBe(true);
      expect(equalsIgnoreCase('test', 'TEST')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(equalsIgnoreCase('abc', 'def')).toBe(false);
    });
  });

  describe('formatLocationAddress', () => {
    it('should format full address', () => {
      const result = formatLocationAddress({
        street: 'Main St',
        houseNumber: '123',
        zip: '12345',
        city: 'City',
        country: 'Country',
      });
      expect(result).toBe('Main St 123, 12345 City, Country');
    });

    it('should return undefined for empty address', () => {
      expect(formatLocationAddress({})).toBeUndefined();
    });
  });
});
