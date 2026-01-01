// Mock dependencies
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

// Set environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    REACT_APP_API_URL: 'https://api.dfx.swiss',
    REACT_APP_API_VERSION: 'v1',
    REACT_APP_PUBLIC_URL: 'http://localhost:3001',
  };
});
afterAll(() => {
  process.env = originalEnv;
});

import { OpenCryptoPayUtils } from '../util/open-crypto-pay';
import { Lnurl } from '../util/lnurl';

describe('OpenCryptoPayUtils', () => {
  describe('getOcpUrlByUniqueId', () => {
    it('should generate valid LNURL for unique ID', () => {
      const uniqueId = 'abc123';
      const result = OpenCryptoPayUtils.getOcpUrlByUniqueId(uniqueId);
      
      // Should start with LNURL (after prepending)
      expect(result).toContain('lightning=LNURL');
    });

    it('should include the API path in encoded URL', () => {
      const uniqueId = 'test-id-456';
      const result = OpenCryptoPayUtils.getOcpUrlByUniqueId(uniqueId);
      
      // Extract the LNURL from the result
      const lnurlMatch = result.match(/lightning=(LNURL[A-Z0-9]+)/i);
      expect(lnurlMatch).toBeTruthy();
      
      if (lnurlMatch) {
        const decoded = Lnurl.decode(lnurlMatch[1]);
        expect(decoded).toContain('lnurlp/test-id-456');
        expect(decoded).toContain('api.dfx.swiss');
      }
    });

    it('should use correct API URL from environment', () => {
      const uniqueId = 'env-test';
      const result = OpenCryptoPayUtils.getOcpUrlByUniqueId(uniqueId);
      
      const lnurlMatch = result.match(/lightning=(LNURL[A-Z0-9]+)/i);
      if (lnurlMatch) {
        const decoded = Lnurl.decode(lnurlMatch[1]);
        expect(decoded).toContain('https://api.dfx.swiss/v1');
      }
    });

    it('should handle different unique IDs', () => {
      const id1 = 'user-123';
      const id2 = 'user-456';
      
      const result1 = OpenCryptoPayUtils.getOcpUrlByUniqueId(id1);
      const result2 = OpenCryptoPayUtils.getOcpUrlByUniqueId(id2);
      
      // Different IDs should produce different URLs
      expect(result1).not.toBe(result2);
    });

    it('should return URL containing pl path', () => {
      const result = OpenCryptoPayUtils.getOcpUrlByUniqueId('test');
      expect(result).toContain('pl');
    });
  });
});
