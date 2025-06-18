import { WalletType } from 'src/contexts/wallet.context';

export class WalletSwitchError extends Error {
  constructor(
    readonly wallet: WalletType,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
