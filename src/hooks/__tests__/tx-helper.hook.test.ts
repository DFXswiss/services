import { renderHook } from '@testing-library/react';
import BigNumber from 'bignumber.js';
import { Asset, Blockchain, Sell, Swap } from '@dfx.swiss/react';
import { WalletType } from '../../contexts/wallet.context';
import { useTxHelper } from '../tx-helper.hook';

const mockState = {
  activeWallet: undefined as WalletType | undefined,
  session: { address: '0xabc' } as { address?: string } | undefined,
  canClose: false,
  getParamBalances: jest.fn(),
  getAddressBalances: jest.fn(),
  createTransactionMetaMask: jest.fn(),
  requestChangeToBlockchainMetaMask: jest.fn(),
  createTransactionWalletConnect: jest.fn(),
  requestChangeToBlockchainWalletConnect: jest.fn(),
  sendPayment: jest.fn(),
  createTransactionPhantomSol: jest.fn(),
  createTransactionTrustSol: jest.fn(),
  createTransactionTrustTrx: jest.fn(),
  createTransactionTronLinkTrx: jest.fn(),
};

jest.mock('../../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => ({ canClose: mockState.canClose }),
}));
jest.mock('../../contexts/balance.context', () => ({
  useBalanceContext: () => ({ getBalances: mockState.getParamBalances }),
}));
jest.mock('../../contexts/wallet.context', () => ({
  WalletType: {
    META_MASK: 'MetaMask',
    ALBY: 'Alby',
    WALLET_CONNECT: 'WalletConnect',
    PHANTOM_SOL: 'PhantomSol',
    TRUST_SOL: 'TrustSol',
    TRUST_TRX: 'TrustTrx',
    TRONLINK_TRX: 'TronLinkTrx',
  },
  useWalletContext: () => ({ activeWallet: mockState.activeWallet }),
}));
jest.mock('@dfx.swiss/react', () => ({
  Blockchain: { ETHEREUM: 'Ethereum' },
  useAuthContext: () => ({ session: mockState.session }),
}));
jest.mock('../blockchain-balance.hook', () => ({
  useBlockchainBalance: () => ({ getAddressBalances: mockState.getAddressBalances }),
}));
jest.mock('../wallets/alby.hook', () => ({ useAlby: () => ({ sendPayment: mockState.sendPayment }) }));
jest.mock('../wallets/metamask.hook', () => ({
  useMetaMask: () => ({
    createTransaction: mockState.createTransactionMetaMask,
    requestChangeToBlockchain: mockState.requestChangeToBlockchainMetaMask,
  }),
}));
jest.mock('../wallets/phantom.hook', () => ({
  usePhantom: () => ({ createTransaction: mockState.createTransactionPhantomSol }),
}));
jest.mock('../wallets/trust-sol.hook', () => ({
  useTrustSol: () => ({ createTransaction: mockState.createTransactionTrustSol }),
}));
jest.mock('../wallets/trust-trx.hook', () => ({
  useTrustTrx: () => ({ createTransaction: mockState.createTransactionTrustTrx }),
}));
jest.mock('../wallets/tronlink-trx.hook', () => ({
  useTronLinkTrx: () => ({ createTransaction: mockState.createTransactionTronLinkTrx }),
}));
jest.mock('../wallets/wallet-connect.hook', () => ({
  useWalletConnect: () => ({
    createTransaction: mockState.createTransactionWalletConnect,
    requestChangeToBlockchain: mockState.requestChangeToBlockchainWalletConnect,
  }),
}));

const asset = { blockchain: Blockchain.ETHEREUM } as Asset;
const sell = { id: 1, amount: 2, asset, depositAddress: '0xdeposit' } as Sell;
const swap = { id: 2, amount: 3, sourceAsset: asset, depositAddress: '0xdeposit' } as Swap;

beforeEach(() => {
  mockState.activeWallet = WalletType.META_MASK;
  mockState.session = { address: '0xabc' };
  mockState.canClose = false;
  Object.values(mockState)
    .filter((value) => typeof value === 'function')
    .forEach((mock) => (mock as jest.Mock).mockReset());
  mockState.createTransactionMetaMask.mockResolvedValue('normal-hash');
  mockState.createTransactionWalletConnect.mockResolvedValue('walletconnect-hash');
  mockState.createTransactionPhantomSol.mockResolvedValue('phantom-hash');
  mockState.createTransactionTrustSol.mockResolvedValue('trust-sol-hash');
  mockState.createTransactionTrustTrx.mockResolvedValue('trust-trx-hash');
  mockState.createTransactionTronLinkTrx.mockResolvedValue('tronlink-hash');
  mockState.sendPayment.mockResolvedValue({ preimage: 'payment-preimage' });
  mockState.getParamBalances.mockResolvedValue([{ amount: 1 }]);
  mockState.getAddressBalances.mockResolvedValue([{ amount: 2 }]);
});

describe('useTxHelper', () => {
  it.each<[string, Sell | Swap]>([
    ['sell', { ...sell, depositTx: { eip5792: { calls: [], paymasterUrl: 'https://old', chainId: 1 } } } as Sell],
    ['swap', { ...swap, depositTx: { eip5792: { calls: [], paymasterUrl: 'https://old', chainId: 1 } } } as Swap],
  ])('sends old EIP-5792 %s payment data through the regular MetaMask transfer', async (_kind, tx) => {
    const { result } = renderHook(() => useTxHelper());

    await expect(result.current.sendTransaction(tx)).resolves.toBe('normal-hash');
    expect(mockState.createTransactionMetaMask).toHaveBeenCalledWith(
      new BigNumber(tx.amount),
      asset,
      '0xabc',
      '0xdeposit',
    );
  });

  it('uses backend balances only for supported wallets with a full address context', async () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    const assets = [asset];

    await expect(result.current.getBalances(assets, '0xabc', Blockchain.ETHEREUM)).resolves.toEqual([{ amount: 2 }]);
    expect(mockState.getAddressBalances).toHaveBeenCalledWith(assets, '0xabc', Blockchain.ETHEREUM);

    mockState.getAddressBalances.mockRejectedValueOnce(new Error('RPC failed'));
    await expect(result.current.getBalances(assets, '0xabc', Blockchain.ETHEREUM)).resolves.toBeUndefined();

    mockState.activeWallet = 'unsupported' as WalletType;
    rerender();
    await expect(result.current.getBalances(assets, '0xabc', Blockchain.ETHEREUM)).resolves.toBeUndefined();
  });

  it('falls back to parameter balances when wallet context is incomplete', async () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    await expect(result.current.getBalances([asset], undefined, Blockchain.ETHEREUM)).resolves.toEqual([{ amount: 1 }]);
    await expect(result.current.getBalances([asset], '0xabc', undefined)).resolves.toEqual([{ amount: 1 }]);
    mockState.activeWallet = undefined;
    rerender();
    await expect(result.current.getBalances([asset], '0xabc', Blockchain.ETHEREUM)).resolves.toEqual([{ amount: 1 }]);
  });

  it('supports and rejects sending according to the active wallet', () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    expect(result.current.canSendTransaction()).toBe(true);
    mockState.activeWallet = 'unsupported' as WalletType;
    rerender();
    expect(result.current.canSendTransaction()).toBe(false);
    mockState.activeWallet = undefined;
    mockState.canClose = true;
    rerender();
    expect(result.current.canSendTransaction()).toBe(true);
  });

  it('supports the remaining wallet transaction branches', async () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    const scenarios: Array<[WalletType, string, jest.Mock]> = [
      [WalletType.ALBY, 'payment-preimage', mockState.sendPayment],
      [WalletType.WALLET_CONNECT, 'walletconnect-hash', mockState.createTransactionWalletConnect],
      [WalletType.PHANTOM_SOL, 'phantom-hash', mockState.createTransactionPhantomSol],
      [WalletType.TRUST_SOL, 'trust-sol-hash', mockState.createTransactionTrustSol],
      [WalletType.TRUST_TRX, 'trust-trx-hash', mockState.createTransactionTrustTrx],
      [WalletType.TRONLINK_TRX, 'tronlink-hash', mockState.createTransactionTronLinkTrx],
    ];

    for (const [wallet, expected, called] of scenarios) {
      mockState.activeWallet = wallet;
      rerender();
      const tx = wallet === WalletType.ALBY ? { ...sell, paymentRequest: 'lnbc' } : sell;
      await expect(result.current.sendTransaction(tx)).resolves.toBe(expected);
      expect(called).toHaveBeenCalled();
    }
  });

  it('rejects invalid session, payment request, and unsupported wallet cases', async () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    mockState.activeWallet = undefined;
    rerender();
    await expect(result.current.sendTransaction(sell)).rejects.toThrow('No wallet connected');

    mockState.activeWallet = WalletType.META_MASK;
    mockState.session = undefined;
    rerender();
    await expect(result.current.sendTransaction(sell)).rejects.toThrow('Address is not defined');

    mockState.activeWallet = WalletType.ALBY;
    rerender();
    await expect(result.current.sendTransaction(sell)).rejects.toThrow('Payment request not defined');

    mockState.activeWallet = 'unsupported' as WalletType;
    rerender();
    await expect(result.current.sendTransaction(sell)).rejects.toThrow('Not supported yet');
  });

  it('requires an address for WalletConnect, Phantom, Trust, and TronLink paths', async () => {
    const { result, rerender } = renderHook(() => useTxHelper());
    mockState.session = undefined;

    for (const wallet of [
      WalletType.WALLET_CONNECT,
      WalletType.PHANTOM_SOL,
      WalletType.TRUST_SOL,
      WalletType.TRUST_TRX,
      WalletType.TRONLINK_TRX,
    ]) {
      mockState.activeWallet = wallet;
      rerender();
      await expect(result.current.sendTransaction(sell)).rejects.toThrow('Address is not defined');
    }
  });
});
