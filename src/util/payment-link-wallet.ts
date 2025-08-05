import { Blockchain } from '@dfx.swiss/react';
import { C2BPaymentMethod, TransferInfo, TransferMethod, WalletCategory, WalletInfo } from 'src/dto/payment-link.dto';
import { Evm } from 'src/util/evm';

const compatibleMethods: Record<WalletCategory, TransferMethod[]> = {
  [WalletCategory.LIGHTNING]: [Blockchain.LIGHTNING],
  [WalletCategory.BITCOIN]: [Blockchain.BITCOIN, Blockchain.LIGHTNING],
  [WalletCategory.EVM]: Object.values(Blockchain).filter((b) => Evm.isEvm(b)),
  [WalletCategory.BINANCE_PAY]: [C2BPaymentMethod.BINANCE_PAY],
  [WalletCategory.MULTI_CHAIN]: [...Object.values(Blockchain).filter((b) => b !== Blockchain.LIGHTNING)],
};

export class Wallet {
  static filterTransferInfoByWallet(wallet: WalletInfo, transferInfoList: TransferInfo[]): TransferInfo[] {
    return transferInfoList.map((ta) => this.filterCompatible(wallet, ta)).filter(Boolean) as TransferInfo[];
  }

  static qualifiesForPayment(wallet: WalletInfo, transferInfoList: TransferInfo[]): boolean {
    return transferInfoList.some((ta) => this.filterCompatible(wallet, ta));
  }

  private static filterCompatible(
    wallet: WalletInfo,
    transferInfo: TransferInfo,
    isAvailable = true,
  ): TransferInfo | undefined {
    const { method, assets, available } = transferInfo;
    if (isAvailable && available === false) return undefined;

    if (!compatibleMethods[wallet.category].includes(method)) {
      return undefined;
    }

    if (wallet.supportedTokens) {
      const filteredAssets = assets.filter(({ asset }) =>
        wallet.supportedTokens?.some((token) => token === asset || token === `${method}:${asset}`),
      );
      return filteredAssets.length > 0 ? { ...transferInfo, assets: filteredAssets } : undefined;
    }

    return transferInfo;
  }
}
