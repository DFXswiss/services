import { Blockchain } from '@dfx.swiss/react';
import { useCallback, useMemo } from 'react';
import { PaymentLinkWallets } from 'src/config/payment-link-wallets';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { C2BPaymentMethod, WalletAppId, WalletInfo } from 'src/dto/payment-link.dto';
import { fetchJson } from 'src/util/utils';

interface WalletInfoOptions {
  recommendedWallets: WalletInfo[];
  otherWallets: WalletInfo[];
  semiCompatibleWallets: WalletInfo[];
  getWalletByName: (id: WalletAppId) => WalletInfo | undefined;
  getDeeplinkByWalletId: (id: WalletAppId) => Promise<string | undefined>;
}

export const useWalletInfoOptions = (): WalletInfoOptions => {
  const { paymentIdentifier, payRequest, paymentHasQuote } = usePaymentLinkContext();

  const recommendedWallets = useMemo(() => {
    return PaymentLinkWallets.filter((wallet) => wallet.recommended === true);
  }, []);

  const otherWallets = useMemo(() => {
    return PaymentLinkWallets.filter((wallet) => !wallet.recommended && !wallet.semiCompatible);
  }, []);

  const transferMethods = paymentHasQuote(payRequest)
    ? payRequest.transferAmounts.filter((ta) => ta.available).map((ta) => ta.method)
    : [];

  const isC2BPaymentMethod = (method: Blockchain | C2BPaymentMethod | undefined): method is C2BPaymentMethod => {
    if (!method) return false;
    return Object.values(C2BPaymentMethod).includes(method as C2BPaymentMethod);
  };

  const isDisabled = (wallet: WalletInfo) => {
    return isC2BPaymentMethod(wallet.transferMethod)
      ? !transferMethods.includes(wallet.transferMethod)
      : wallet.disabled;
  };

  const semiCompatibleWallets = useMemo(() => {
    return PaymentLinkWallets.filter((wallet) => wallet.semiCompatible)
      .map((wallet) => ({ ...wallet, disabled: isDisabled(wallet) }))
      .sort((a, b) => (a.disabled ? 1 : b.disabled ? -1 : 0));
  }, [isDisabled]);

  const getWalletByName = useCallback(
    (id: string): WalletInfo | undefined => {
      return [...recommendedWallets, ...otherWallets, ...semiCompatibleWallets].find((wallet) => wallet.id === id);
    },
    [recommendedWallets, otherWallets, semiCompatibleWallets],
  );

  const fetchCallbackUrlForTransferMethod = async <T = any>(
    method: Blockchain | C2BPaymentMethod,
  ): Promise<T | undefined> => {
    if (!paymentHasQuote(payRequest)) return undefined;
    const transferAmount = payRequest.transferAmounts.find((ta) => ta.method === method);
    const asset = transferAmount?.assets[0].asset;
    const url = `${payRequest.callback}?quote=${payRequest.quote.id}&method=${method}&asset=${asset}`;
    return await fetchJson<T>(url);
  };

  const getDeeplinkByTransferMethod = async (wallet: WalletInfo) => {
    if (!paymentIdentifier) return undefined;
    switch (wallet.transferMethod) {
      case Blockchain.LIGHTNING:
        const lightning = new URL(paymentIdentifier).searchParams.get('lightning');
        const suffix = 'lightning:';
        const prefix = wallet.deepLink !== suffix ? `${wallet.deepLink}` : '';
        return `${prefix}${suffix}${lightning}`;
    }
  };

  const getDeeplinkByWalletId = async (id: WalletAppId) => {
    const wallet = getWalletByName(id);
    if (!wallet || !paymentIdentifier) return undefined;

    switch (wallet.id) {
      case WalletAppId.MUUN:
        const { pr } = (await fetchCallbackUrlForTransferMethod<{ pr: string }>(Blockchain.LIGHTNING)) ?? {};
        return `${wallet.deepLink}${pr}`;

      case WalletAppId.BINANCEPAY:
        const { uri } = (await fetchCallbackUrlForTransferMethod<{ uri: string }>(C2BPaymentMethod.BINANCE_PAY)) ?? {};
        return uri;

      default:
        return getDeeplinkByTransferMethod(wallet) ?? wallet.deepLink;
    }
  };

  return {
    recommendedWallets,
    otherWallets,
    semiCompatibleWallets,
    getWalletByName,
    getDeeplinkByWalletId,
  };
};
