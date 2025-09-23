import { TransferInfo, WalletInfo } from 'src/dto/payment-link.dto';

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

    if (!wallet.supportedMethods.includes(method)) {
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
