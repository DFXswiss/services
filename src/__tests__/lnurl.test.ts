// Mock dependencies before importing
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

// Mock process.env
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    REACT_APP_PUBLIC_URL: 'http://localhost:3001',
  };
});
afterAll(() => {
  process.env = originalEnv;
});

import { displayWalletAddress, Lnurl } from '../util/lnurl';

describe('Lnurl', () => {
  describe('encode', () => {
    it('should encode string to LNURL format', () => {
      const input = 'https://example.com/lnurl';
      const result = Lnurl.encode(input);

      expect(result).toMatch(/^LNURL/);
      expect(result).toBe(result.toUpperCase());
    });

    it('should create valid bech32 encoded string', () => {
      const input = 'https://test.com';
      const encoded = Lnurl.encode(input);
      const decoded = Lnurl.decode(encoded);

      expect(decoded).toBe(input);
    });
  });

  describe('decode', () => {
    it('should decode valid LNURL', () => {
      const original = 'https://example.com/api';
      const encoded = Lnurl.encode(original);
      const decoded = Lnurl.decode(encoded);

      expect(decoded).toBe(original);
    });

    it('should return undefined for invalid LNURL', () => {
      expect(Lnurl.decode('invalid')).toBeUndefined();
      expect(Lnurl.decode('')).toBeUndefined();
    });

    it('should handle lowercase input', () => {
      const original = 'https://test.com';
      const encoded = Lnurl.encode(original).toLowerCase();
      const decoded = Lnurl.decode(encoded);

      expect(decoded).toBe(original);
    });
  });

  describe('addressToLnurl', () => {
    it('should convert lightning address to LNURL', () => {
      const address = 'user@domain.com';
      const result = Lnurl.addressToLnurl(address);

      expect(result).toMatch(/^LNURL/);

      const decoded = Lnurl.decode(result);
      expect(decoded).toBe('https://domain.com/.well-known/lnurlp/user');
    });
  });

  describe('toLightningAddress', () => {
    it('round-trips a lightning address through addressToLnurl', () => {
      const address = '2233jjjferf@lightning.space';

      expect(Lnurl.toLightningAddress(Lnurl.addressToLnurl(address))).toBe(address);
    });

    it('returns an already-email value unchanged', () => {
      expect(Lnurl.toLightningAddress('user@domain.com')).toBe('user@domain.com');
    });

    it('returns undefined for a DFX lnurlp endpoint', () => {
      const encoded = Lnurl.encode('https://api.dfx.swiss/v0.1/lnurlp/ABC123');

      expect(Lnurl.toLightningAddress(encoded)).toBeUndefined();
    });

    it('returns undefined for an http well-known lnurlp URL', () => {
      const encoded = Lnurl.encode('http://lightning.space/.well-known/lnurlp/abc');

      expect(Lnurl.toLightningAddress(encoded)).toBeUndefined();
    });

    it('returns undefined for a query or an extra path segment', () => {
      const withQuery = Lnurl.encode('https://lightning.space/.well-known/lnurlp/abc?amount=1');
      const withExtraSegment = Lnurl.encode('https://lightning.space/.well-known/lnurlp/abc/extra');

      expect(Lnurl.toLightningAddress(withQuery)).toBeUndefined();
      expect(Lnurl.toLightningAddress(withExtraSegment)).toBeUndefined();
    });
  });

  describe('prependLnurl', () => {
    it('should create URL with lightning param', () => {
      const lnurl = 'LNURL1234';
      const result = Lnurl.prependLnurl(lnurl);

      expect(result).toContain('lightning=LNURL1234');
      expect(result).toContain('pl');
    });
  });
});

describe('displayWalletAddress', () => {
  it('shows a lightning.space LNURL in full even when displayLength is short', () => {
    const lnurl = Lnurl.addressToLnurl('2233jjjferf@lightning.space');

    expect(displayWalletAddress(lnurl, { displayLength: 8 })).toBe('2233jjjferf@lightning.space');
  });

  it('blanks a long 0x address', () => {
    const address = `0x${'a'.repeat(40)}`;

    expect(displayWalletAddress(address, { displayLength: 16 })).toContain('...');
  });
});
