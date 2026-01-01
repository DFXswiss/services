// Mock wallet context
jest.mock('src/contexts/wallet.context', () => ({
  WalletType: {
    META_MASK: 'MetaMask',
    WALLET_CONNECT: 'WalletConnect',
    LEDGER: 'Ledger',
  },
}));

import { WalletSwitchError } from '../util/wallet-switch-error';
import { WalletType } from 'src/contexts/wallet.context';

describe('WalletSwitchError', () => {
  it('should be an instance of Error', () => {
    const error = new WalletSwitchError(WalletType.META_MASK);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WalletSwitchError);
  });

  it('should store the wallet type', () => {
    const error = new WalletSwitchError(WalletType.META_MASK);
    expect(error.wallet).toBe(WalletType.META_MASK);
  });

  it('should store the message', () => {
    const message = 'Failed to switch wallet';
    const error = new WalletSwitchError(WalletType.LEDGER, message);
    expect(error.message).toBe(message);
  });

  it('should work without a message', () => {
    const error = new WalletSwitchError(WalletType.WALLET_CONNECT);
    expect(error.message).toBe('');
    expect(error.wallet).toBe(WalletType.WALLET_CONNECT);
  });

  it('should support error options with cause', () => {
    const cause = new Error('Original error');
    const error = new WalletSwitchError(WalletType.META_MASK, 'Switch failed', { cause });
    expect(error.cause).toBe(cause);
  });

  it('should be catchable and provide wallet info', () => {
    try {
      throw new WalletSwitchError(WalletType.LEDGER, 'Connection lost');
    } catch (e) {
      if (e instanceof WalletSwitchError) {
        expect(e.wallet).toBe(WalletType.LEDGER);
        expect(e.message).toBe('Connection lost');
      } else {
        fail('Should have caught WalletSwitchError');
      }
    }
  });

  it('should be distinguishable from regular Error', () => {
    const walletError = new WalletSwitchError(WalletType.META_MASK);
    const regularError = new Error('regular');

    expect(walletError instanceof WalletSwitchError).toBe(true);
    expect(regularError instanceof WalletSwitchError).toBe(false);
  });
});
