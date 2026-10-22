/**
 * Tests for useMetaMask hook - Basic functionality
 *
 * These tests cover wallet detection and EIP-5792 paymaster calls.
 */
import { renderHook } from '@testing-library/react';
import BigNumber from 'bignumber.js';
import { AbortError } from 'src/util/abort-error';

const mockWeb3Instances: any[] = [];
const mockTimeout = jest.fn();
const mockToChainHex = jest.fn((chain?: string) => (chain ? '0x1' : undefined));
const mockToChainObject = jest.fn(() => ({ chainId: '0x1', chainName: 'Ethereum' }));
const mockDevice = { isMobile: false };

function mockCreateWeb3Instance() {
  const instance = {
    eth: {
      getAccounts: jest.fn((callback?: (error: unknown, accounts: string[]) => void) => {
        if (callback) callback(null, []);
        return Promise.resolve([]);
      }),
      getChainId: jest.fn((callback?: (error: unknown, chainId: number) => void) => {
        if (callback) callback(null, 1);
        return Promise.resolve(1);
      }),
      requestAccounts: jest.fn().mockResolvedValue([]),
      getBalance: jest.fn().mockResolvedValue('0'),
      personal: { sign: jest.fn().mockResolvedValue('signature') },
      sendTransaction: jest.fn().mockResolvedValue({ transactionHash: 'coin-hash' }),
      Contract: jest.fn().mockReturnValue({ methods: {} }),
    },
    utils: {
      toChecksumAddress: (addr: string) => addr,
      toHex: (val: number) => `0x${val.toString(16)}`,
      toWei: (val: string) => val,
    },
  };
  mockWeb3Instances.push(instance);
  return instance;
}

// Mock @dfx.swiss/react
jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {
    ETHEREUM: 'Ethereum',
    OPTIMISM: 'Optimism',
    POLYGON: 'Polygon',
    ARBITRUM: 'Arbitrum',
    BASE: 'Base',
    BINANCE_SMART_CHAIN: 'BinanceSmartChain',
  },
  AssetType: {
    COIN: 'Coin',
    TOKEN: 'Token',
  },
}));

// Mock useWeb3 hook
jest.mock('../../web3.hook', () => ({
  useWeb3: () => ({
    toBlockchain: () => 'Ethereum',
    toChainHex: (chain?: string) => mockToChainHex(chain),
    toChainObject: (chain: string) => mockToChainObject(chain),
  }),
}));

jest.mock('../../../util/utils', () => ({ timeout: (...args: unknown[]) => mockTimeout(...args) }));

// Mock Web3
jest.mock('web3', () => {
  const MockWeb3: any = jest.fn();
  MockWeb3.givenProvider = {};
  MockWeb3.utils = {
    toChecksumAddress: (addr: string) => addr,
    toHex: (val: number) => `0x${val.toString(16)}`,
    toWei: (val: string) => val,
  };
  return MockWeb3;
});

// Mock react-device-detect
jest.mock('react-device-detect', () => ({
  get isMobile() {
    return mockDevice.isMobile;
  },
}));

import Web3 from 'web3';
import { useMetaMask } from '../metamask.hook';

const account = '0x1234567890123456789012345678901234567890';

function renderMetaMask(provider: Record<string, unknown> = {}) {
  (window as any).ethereum = provider;
  const hook = renderHook(() => useMetaMask());
  setHookAccount();
  return { ...hook, web3: mockWeb3Instances[mockWeb3Instances.length - 1] };
}

function setHookAccount() {
  const latestWeb3 = mockWeb3Instances[mockWeb3Instances.length - 1];
  if (!latestWeb3) throw new Error('useMetaMask did not construct a Web3 instance');
  latestWeb3.eth.getAccounts.mockImplementation((callback?: (error: unknown, accounts: string[]) => void) => {
    if (callback) callback(null, [account]);
    return Promise.resolve([account]);
  });
}

describe('useMetaMask', () => {
  beforeEach(() => {
    mockWeb3Instances.length = 0;
    (Web3 as unknown as jest.Mock).mockImplementation(mockCreateWeb3Instance);
    mockTimeout.mockImplementation((promise: Promise<unknown>) => promise);
    mockToChainHex.mockImplementation((chain?: string) => (chain ? '0x1' : undefined));
    mockToChainObject.mockImplementation(() => ({ chainId: '0x1', chainName: 'Ethereum' }));
    mockDevice.isMobile = false;
  });

  afterEach(() => {
    delete (window as any).ethereum;
    mockTimeout.mockReset();
    mockTimeout.mockImplementation((promise: Promise<unknown>) => promise);
  });

  describe('isInstalled', () => {
    it('should return true when MetaMask is installed', () => {
      (window as any).ethereum = { isMetaMask: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.isInstalled()).toBe(true);
    });

    it('should return false when ethereum is not available', () => {
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.isInstalled()).toBe(false);
    });

    it('should return true for Rabby wallet', () => {
      (window as any).ethereum = { isRabby: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.isInstalled()).toBe(true);
    });

    it('should return true for CoinbaseWallet', () => {
      (window as any).ethereum = { isCoinbaseWallet: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.isInstalled()).toBe(true);
    });

    it('should return true for Trust wallet', () => {
      (window as any).ethereum = { isTrust: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.isInstalled()).toBe(true);
    });
  });

  describe('getWalletType', () => {
    it('should return META_MASK for MetaMask wallet', () => {
      (window as any).ethereum = { isMetaMask: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.getWalletType()).toBe('MetaMask');
    });

    it('should return RABBY for Rabby wallet', () => {
      (window as any).ethereum = { isRabby: true };
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.getWalletType()).toBe('Rabby');
    });

    it('should return undefined when no wallet is detected', () => {
      const { result } = renderHook(() => useMetaMask());
      expect(result.current.getWalletType()).toBeUndefined();
    });
  });

  describe('conflicting injected provider', () => {
    it('should not throw when the injected provider breaks the Web3 constructor', () => {
      (window as any).ethereum = { isMetaMask: true };
      (Web3 as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new TypeError(
          "'get' on proxy: property 'on' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value",
        );
      });

      const { result } = renderHook(() => useMetaMask());

      expect(result.current.isInstalled()).toBe(true);
      expect(result.current.getWalletType()).toBe('MetaMask');
      expect(Web3).toHaveBeenLastCalledWith();
    });
  });

  describe('hook interface', () => {
    it('should expose all required functions', () => {
      (window as any).ethereum = { isMetaMask: true, request: jest.fn(), on: jest.fn() };
      const { result } = renderHook(() => useMetaMask());

      expect(typeof result.current.isInstalled).toBe('function');
      expect(typeof result.current.getWalletType).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.getAccount).toBe('function');
      expect(typeof result.current.requestAccount).toBe('function');
      expect(typeof result.current.requestBlockchain).toBe('function');
      expect(typeof result.current.requestChangeToBlockchain).toBe('function');
      expect(typeof result.current.requestBalance).toBe('function');
      expect(typeof result.current.sign).toBe('function');
      expect(typeof result.current.addContract).toBe('function');
      expect(typeof result.current.readBalance).toBe('function');
      expect(typeof result.current.createTransaction).toBe('function');
      expect(typeof result.current.sendCallsWithPaymaster).toBe('function');
      expect(typeof result.current.supportsEip5792Paymaster).toBe('function');
    });
  });

  describe('EIP-5792 paymaster support', () => {
    it('returns true when the active chain advertises paymaster support', async () => {
      const request = jest.fn().mockResolvedValue({ '0x1': { paymasterService: { supported: true } } });
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(true);
      expect(request).toHaveBeenCalledWith({ method: 'wallet_getCapabilities', params: [account] });
    });

    it('returns false when the wallet does not advertise paymaster support', async () => {
      const request = jest.fn().mockResolvedValue({ '0x1': { paymasterService: { supported: false } } });
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(false);
    });

    it('returns false when the wallet capability request fails', async () => {
      const request = jest.fn().mockRejectedValue(new Error('RPC unavailable'));
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(false);
    });

    it('returns false when capability data omits the chain or paymaster service', async () => {
      const request = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({ '0x1': {} });
      const { result } = renderMetaMask({ request });

      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(false);
      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(false);
    });

    it('sends v2.0.0 atomic paymaster calls and returns the confirmed transaction hash', async () => {
      const calls = [
        { to: '0xto', data: '0xdata', value: '0x0' },
        { to: '0xsecond', data: '0xseconddata', value: '0x1' },
      ];
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return { id: 'calls-id' };
        if (method === 'wallet_getCallsStatus') return { status: 200, receipts: [{ transactionHash: '0xhash' }] };
        throw new Error(`Unexpected method ${method}`);
      });
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      await expect(result.current.sendCallsWithPaymaster(calls, 'https://paymaster', 1)).resolves.toBe('0xhash');
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'wallet_sendCalls',
          params: [
            expect.objectContaining({
              version: '2.0.0',
              chainId: '0x1',
              from: account,
              atomicRequired: true,
              calls,
              capabilities: { paymasterService: { url: 'https://paymaster' } },
            }),
          ],
        }),
      );
    });

    it('rejects when the wallet lacks paymaster support', async () => {
      const request = jest.fn().mockResolvedValue({ '0x1': { paymasterService: { supported: false } } });
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toThrow(
        'Your wallet does not support sponsored (gasless) transactions.',
      );
    });

    it('maps wallet rejection while sending paymaster calls to AbortError', async () => {
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        throw { code: 4001, message: 'Rejected' };
      });
      (window as any).ethereum = { request };
      const { result } = renderHook(() => useMetaMask());
      setHookAccount();

      const resultPromise = result.current.sendCallsWithPaymaster([], 'https://paymaster', 1);
      await expect(resultPromise).rejects.toEqual(expect.any(AbortError));
      await expect(resultPromise).rejects.toMatchObject({ message: 'User cancelled', code: 4001 });
    });

    it('returns false when no account is connected', async () => {
      const request = jest.fn();
      const { result, web3 } = renderMetaMask({ request });
      web3.eth.getAccounts.mockResolvedValue([]);

      await expect(result.current.supportsEip5792Paymaster(1)).resolves.toBe(false);
      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toThrow(
        'No account connected',
      );
      expect(request).not.toHaveBeenCalled();
    });

    it.each([400, 500, 600])('rejects calls when wallet_getCallsStatus returns %i', async (status) => {
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return { id: 'failed-id' };
        return { status };
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('polls after status 100 and returns the hash for status 200 with a string calls ID', async () => {
      let statusCalls = 0;
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return 'string-id';
        statusCalls += 1;
        return statusCalls === 1
          ? { status: 100 }
          : { status: 200, receipts: [{ transactionHash: 'hash-after-pending' }] };
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).resolves.toBe(
        'hash-after-pending',
      );
      expect(request).toHaveBeenCalledWith({ method: 'wallet_getCallsStatus', params: ['string-id'] });
      expect(statusCalls).toBe(2);
    });

    it('polls after unknown status 300 and returns a hash for status 200', async () => {
      let statusCalls = 0;
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return { id: 'unknown-status-id' };
        statusCalls += 1;
        return statusCalls === 1
          ? { status: 300 }
          : { status: 200, receipts: [{ transactionHash: 'hash-after-unknown-status' }] };
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).resolves.toBe(
        'hash-after-unknown-status',
      );
      expect(statusCalls).toBe(2);
    });

    it.each([
      { name: 'missing receipts', response: { status: 200 } },
      { name: 'empty receipts', response: { status: 200, receipts: [] } },
      { name: 'missing transaction hash', response: { status: 200, receipts: [{}] } },
    ])('throws for status 200 with $name', async ({ response }) => {
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return { id: 'missing-receipt-id' };
        return response;
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('passes through unrecognized wallet RPC errors', async () => {
      const error = { code: -32603, message: 'RPC error' };
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        throw error;
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toBe(error);
    });

    it('times out after the wallet leaves every call pending', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation(((callback: TimerHandler) => {
        if (typeof callback === 'function') callback();
        return 0 as any;
      }) as typeof setTimeout);
      const request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_getCapabilities') return { '0x1': { paymasterService: { supported: true } } };
        if (method === 'wallet_sendCalls') return { id: 'pending-id' };
        return { status: 100 };
      });
      const { result } = renderMetaMask({ request });

      await expect(result.current.sendCallsWithPaymaster([], 'https://paymaster', 1)).rejects.toThrow(
        'Transaction timeout',
      );
      expect(request.mock.calls.filter(([call]) => call.method === 'wallet_getCallsStatus')).toHaveLength(120);
      jest.restoreAllMocks();
    });
  });

  describe('wallet connection and transaction methods', () => {
    it('detects in-app user agents, Rabby, MetaMask, and unknown providers', () => {
      const originalAgent = window.navigator.userAgent;
      Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Rainbow Wallet' });
      const inApp = renderMetaMask({ isMetaMask: true });
      expect(inApp.result.current.getWalletType()).toBe('InAppBrowser');
      inApp.unmount();

      Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Desktop browser' });
      const rabby = renderMetaMask({ isRabby: true });
      expect(rabby.result.current.getWalletType()).toBe('Rabby');
      rabby.unmount();
      const metamask = renderMetaMask({ isMetaMask: true });
      expect(metamask.result.current.getWalletType()).toBe('MetaMask');
      metamask.unmount();
      const unknown = renderMetaMask({ request: jest.fn() });
      expect(unknown.result.current.getWalletType()).toBeUndefined();
      unknown.unmount();
      mockDevice.isMobile = true;
      const inAppTrust = renderMetaMask({ isTrust: true });
      expect(inAppTrust.result.current.getWalletType()).toBe('InAppBrowser');
      inAppTrust.unmount();
      const inAppCoinbase = renderMetaMask({ isCoinbaseWallet: true });
      expect(inAppCoinbase.result.current.getWalletType()).toBe('InAppBrowser');
      inAppCoinbase.unmount();
      Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalAgent });
    });

    it('registers initial account and chain state and forwards provider events', () => {
      const listeners: Record<string, (value: any) => void> = {};
      const provider = {
        on: jest.fn((event: string, callback: (value: any) => void) => {
          listeners[event] = callback;
        }),
      };
      const { result, web3 } = renderMetaMask(provider);
      const onAccount = jest.fn();
      const onBlockchain = jest.fn();
      web3.eth.getAccounts.mockImplementation((callback: (error: unknown, accounts: string[]) => void) =>
        callback(null, [account]),
      );
      web3.eth.getChainId.mockImplementation((callback: (error: unknown, chainId: number) => void) =>
        callback(null, 1),
      );

      result.current.register(onAccount, onBlockchain);
      listeners.accountsChanged([]);
      listeners.accountsChanged([account]);
      listeners.chainChanged('0x1');

      expect(onAccount).toHaveBeenNthCalledWith(1, account);
      expect(onAccount).toHaveBeenNthCalledWith(2, undefined);
      expect(onAccount).toHaveBeenNthCalledWith(3, account);
      expect(onBlockchain).toHaveBeenCalledWith('Ethereum');
      expect(provider.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    });

    it('allows registration before an injected provider is available', () => {
      delete (window as any).ethereum;
      const { result } = renderHook(() => useMetaMask());
      const onAccount = jest.fn();
      const onBlockchain = jest.fn();

      expect(() => result.current.register(onAccount, onBlockchain)).not.toThrow();
    });

    it('gets account, chain, and native balance values', async () => {
      const { result, web3 } = renderMetaMask({});
      web3.eth.getAccounts.mockResolvedValue([account]);
      web3.eth.requestAccounts.mockResolvedValue([account]);
      web3.eth.getChainId.mockResolvedValue(1);
      web3.eth.getBalance.mockResolvedValue('42');

      await expect(result.current.getAccount()).resolves.toBe(account);
      await expect(result.current.requestAccount()).resolves.toBe(account);
      await expect(result.current.requestBlockchain()).resolves.toBe('Ethereum');
      await expect(result.current.requestBalance(account)).resolves.toBe('42');
      web3.eth.getAccounts.mockResolvedValue(undefined as any);
      await expect(result.current.getAccount()).resolves.toBeUndefined();
    });

    it('maps account request cancellation and pending errors', async () => {
      const { result, web3 } = renderMetaMask({});
      web3.eth.requestAccounts.mockRejectedValueOnce({ code: 4001, message: 'User rejected' });
      await expect(result.current.requestAccount()).rejects.toMatchObject({ message: 'User cancelled', code: 4001 });
      web3.eth.requestAccounts.mockRejectedValueOnce({ code: -32002, message: 'Pending' });
      await expect(result.current.requestAccount()).rejects.toThrow('There is already a request pending');
      const error = { code: -32603, message: 'Unexpected wallet error' };
      web3.eth.requestAccounts.mockRejectedValueOnce(error);
      await expect(result.current.requestAccount()).rejects.toBe(error);
    });

    it('reloads on connection timeout and returns no account when accounts are empty', async () => {
      const { result, web3 } = renderMetaMask({});
      const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      const reload = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: { ...window.location, reload },
      });
      mockTimeout.mockRejectedValueOnce(new Error('Timeout while connecting'));
      try {
        await expect(result.current.requestAccount()).resolves.toBeUndefined();
        expect(reload).toHaveBeenCalledTimes(1);
        web3.eth.getAccounts.mockResolvedValue([]);
        await expect(result.current.getAccount()).resolves.toBeUndefined();
      } finally {
        if (locationDescriptor) Object.defineProperty(window, 'location', locationDescriptor);
      }
    });

    it('continues after a non-timeout connection check error', async () => {
      const { result, web3 } = renderMetaMask({});
      web3.eth.requestAccounts.mockResolvedValue([account]);
      mockTimeout.mockRejectedValueOnce(new Error('Provider unavailable'));

      await expect(result.current.requestAccount()).resolves.toBe(account);
    });

    it('skips absent chain values, switches chains, and adds a chain after error 4902', async () => {
      const chain = { chainId: '0x1', chainName: 'Ethereum' };
      mockToChainObject.mockReturnValue(chain);
      const provider = { request: jest.fn().mockResolvedValue(undefined) };
      const { result } = renderMetaMask(provider);

      mockToChainHex.mockReturnValueOnce(undefined);
      await result.current.requestChangeToBlockchain('Ethereum' as any);
      await result.current.requestChangeToBlockchain(undefined as any);
      expect(provider.request).not.toHaveBeenCalled();

      await result.current.requestChangeToBlockchain('Ethereum' as any);
      expect(provider.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      });

      provider.request.mockRejectedValueOnce({ code: 4902, message: 'Unknown chain' });
      await result.current.requestChangeToBlockchain('Ethereum' as any);
      expect(provider.request).toHaveBeenLastCalledWith({ method: 'wallet_addEthereumChain', params: [chain] });
    });

    it('maps chain switch rejections and propagates other provider errors', async () => {
      const provider = { request: jest.fn().mockRejectedValue({ code: 4001, message: 'Rejected' }) };
      const { result } = renderMetaMask(provider);
      await expect(result.current.requestChangeToBlockchain('Ethereum' as any)).rejects.toMatchObject({
        message: 'User cancelled',
        code: 4001,
      });
      const error = { code: -32603, message: 'RPC error' };
      provider.request.mockRejectedValueOnce(error);
      await expect(result.current.requestChangeToBlockchain('Ethereum' as any)).rejects.toBe(error);
    });

    it('signs messages and maps wallet signing errors', async () => {
      const { result, web3 } = renderMetaMask({});
      web3.eth.personal.sign.mockResolvedValueOnce('signed-message');
      await expect(result.current.sign(account, 'hello')).resolves.toBe('signed-message');
      web3.eth.personal.sign.mockRejectedValueOnce({ code: 4001, message: 'Rejected' });
      await expect(result.current.sign(account, 'hello')).rejects.toMatchObject({
        message: 'User cancelled',
        code: 4001,
      });
      web3.eth.personal.sign.mockRejectedValueOnce({ code: -32002, message: 'Pending' });
      await expect(result.current.sign(account, 'hello')).rejects.toThrow('There is already a request pending');
    });

    it('switches to the token chain, then requests wallet_watchAsset with token metadata', async () => {
      const tokenContract = {
        methods: {
          symbol: () => ({ call: jest.fn().mockResolvedValue('TOK') }),
          decimals: () => ({ call: jest.fn().mockResolvedValue(6) }),
        },
      };
      const request = jest.fn().mockResolvedValue(true);
      const { result, web3 } = renderMetaMask({ request });
      web3.eth.Contract.mockReturnValue(tokenContract);
      const asset = { blockchain: 'Ethereum', chainId: '0xtoken' };

      await expect(result.current.addContract(asset as any, '<svg/>', undefined)).resolves.toBe(false);
      expect(request).toHaveBeenCalledWith({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
      await expect(result.current.addContract(asset as any, '<svg/>', 'Ethereum' as any)).resolves.toBe(true);
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'wallet_watchAsset',
          params: expect.objectContaining({
            options: expect.objectContaining({
              address: '0xtoken',
              symbol: 'TOK',
              decimals: 6,
              image: expect.stringContaining('data:image/svg+xml;base64,'),
            }),
          }),
        }),
      );
    });

    it('reads coin and token balances, returns zero on handled failures, and rethrows requested failures', async () => {
      const { result, web3 } = renderMetaMask({});
      const coin = { type: 'Coin' };
      const token = { type: 'Token', chainId: '0xtoken' };
      web3.eth.getBalance.mockResolvedValue('1000000000000000000');
      await expect(result.current.readBalance(coin as any, account)).resolves.toEqual({ asset: coin, amount: 1 });
      await expect(result.current.readBalance(undefined as any, account)).resolves.toEqual({
        asset: undefined,
        amount: 0,
      });
      await expect(result.current.readBalance(token as any)).resolves.toEqual({ asset: token, amount: 0 });
      await expect(result.current.readBalance(token as any, undefined, true)).rejects.toThrow(
        'No address or asset provided',
      );

      const tokenContract = {
        methods: {
          decimals: () => ({ call: jest.fn().mockResolvedValue(6) }),
          balanceOf: () => ({ call: jest.fn().mockResolvedValue('2500000') }),
        },
      };
      web3.eth.Contract.mockReturnValue(tokenContract);
      await expect(result.current.readBalance(token as any, account)).resolves.toEqual({ asset: token, amount: 2.5 });

      web3.eth.getBalance.mockRejectedValueOnce(new Error('RPC failed'));
      await expect(result.current.readBalance(coin as any, account)).resolves.toEqual({ asset: coin, amount: 0 });
      web3.eth.getBalance.mockRejectedValueOnce(new Error('RPC failed'));
      await expect(result.current.readBalance(coin as any, account, true)).rejects.toThrow('RPC failed');

      const brokenTokenContract = {
        methods: { decimals: () => ({ call: jest.fn().mockRejectedValue(new Error('Token RPC failed')) }) },
      };
      web3.eth.Contract.mockReturnValue(brokenTokenContract);
      await expect(result.current.readBalance(token as any, account)).resolves.toEqual({ asset: token, amount: 0 });
      await expect(result.current.readBalance(token as any, account, true)).rejects.toThrow('Token RPC failed');
    });

    it('sends native and token transactions in display units or wei', async () => {
      const { result, web3 } = renderMetaMask({});
      const coin = { type: 'Coin' };
      const token = { type: 'Token', chainId: '0xtoken' };
      await expect(result.current.createTransaction(new BigNumber('0.5'), coin as any, account, '0xto')).resolves.toBe(
        'coin-hash',
      );
      expect(web3.eth.sendTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ value: '0.5' }));
      await result.current.createTransaction(new BigNumber('500'), coin as any, account, '0xto', {
        isWeiAmount: true,
        gasPrice: 7,
      });
      expect(web3.eth.sendTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ value: '500', gasPrice: 7 }));

      const transfer = jest
        .fn()
        .mockReturnValue({ send: jest.fn().mockResolvedValue({ transactionHash: 'token-hash' }) });
      const tokenContract = {
        methods: {
          decimals: () => ({ call: jest.fn().mockResolvedValue(6) }),
          transfer,
        },
      };
      web3.eth.Contract.mockReturnValue(tokenContract);
      await expect(
        result.current.createTransaction(new BigNumber('1.25'), token as any, account, '0xto'),
      ).resolves.toBe('token-hash');
      expect(transfer).toHaveBeenLastCalledWith('0xto', '1250000');
      await result.current.createTransaction(new BigNumber('125'), token as any, account, '0xto', {
        isWeiAmount: true,
      });
      expect(transfer).toHaveBeenLastCalledWith('0xto', '125');
    });

    it('preserves the rejection code for a cancelled native transaction', async () => {
      const { result, web3 } = renderMetaMask({});
      web3.eth.sendTransaction.mockRejectedValue({ code: 4001, message: 'User rejected' });

      await expect(
        result.current.createTransaction(new BigNumber('0.5'), { type: 'Coin' } as any, account, '0xto'),
      ).rejects.toMatchObject({ code: 4001 });
    });
  });
});
