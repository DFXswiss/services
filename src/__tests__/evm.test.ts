// Mock @dfx.swiss/react
jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {
    ETHEREUM: 'Ethereum',
    ARBITRUM: 'Arbitrum',
    OPTIMISM: 'Optimism',
    POLYGON: 'Polygon',
    BASE: 'Base',
    GNOSIS: 'Gnosis',
    BINANCE_SMART_CHAIN: 'BinanceSmartChain',
    HAQQ: 'Haqq',
    BITCOIN: 'Bitcoin',
    LIGHTNING: 'Lightning',
    SOLANA: 'Solana',
  },
}));

import { Evm } from '../util/evm';
import { Blockchain } from '@dfx.swiss/react';

describe('Evm', () => {
  describe('decodeUri', () => {
    it('should decode basic ethereum URI', () => {
      const uri = 'ethereum:0x1234567890abcdef@1';
      const result = Evm.decodeUri(uri);
      
      expect(result).toEqual({
        address: '0x1234567890abcdef',
        chainId: '1',
        amount: undefined,
      });
    });

    it('should decode URI with value', () => {
      const uri = 'ethereum:0x1234567890abcdef@1?value=1000000000000000000';
      const result = Evm.decodeUri(uri);
      
      expect(result).toEqual({
        address: '0x1234567890abcdef',
        chainId: '1',
        amount: '1000000000000000000',
      });
    });

    it('should decode token transfer URI', () => {
      const uri = 'ethereum:0xTokenContract@1/transfer?address=0xRecipient&uint256=1000';
      const result = Evm.decodeUri(uri);
      
      expect(result).toEqual({
        tokenContractAddress: '0xTokenContract',
        chainId: '1',
        method: 'transfer',
        address: '0xRecipient',
        amount: '1000',
      });
    });

    it('should return null for invalid URI', () => {
      expect(Evm.decodeUri('invalid')).toBeNull();
      expect(Evm.decodeUri('')).toBeNull();
      expect(Evm.decodeUri('http://example.com')).toBeNull();
    });

    it('should handle different chain IDs', () => {
      const chains = ['1', '137', '42161', '10', '8453'];
      
      chains.forEach(chainId => {
        const uri = `ethereum:0xAddress@${chainId}`;
        const result = Evm.decodeUri(uri);
        expect(result?.chainId).toBe(chainId);
      });
    });
  });

  describe('isEvm', () => {
    it('should return true for EVM blockchains', () => {
      const evmChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.OPTIMISM,
        Blockchain.POLYGON,
        Blockchain.BASE,
        Blockchain.GNOSIS,
        Blockchain.BINANCE_SMART_CHAIN,
        Blockchain.HAQQ,
      ];
      
      evmChains.forEach(chain => {
        expect(Evm.isEvm(chain)).toBe(true);
      });
    });

    it('should return false for non-EVM blockchains', () => {
      const nonEvmChains = [
        Blockchain.BITCOIN,
        Blockchain.LIGHTNING,
        Blockchain.SOLANA,
      ];
      
      nonEvmChains.forEach(chain => {
        expect(Evm.isEvm(chain)).toBe(false);
      });
    });
  });
});
