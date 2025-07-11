import { Blockchain } from '@dfx.swiss/react';
import { useCallback, useMemo } from 'react';
import { PaymentLinkWallets } from 'src/config/payment-link-wallets';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { C2BPaymentMethod, WalletAppId, WalletInfo } from 'src/dto/payment-link.dto';
import { fetchJson, url } from 'src/util/utils';

interface PaymentLinkWalletsProps {
  recommendedWallets: WalletInfo[];
  otherWallets: WalletInfo[];
  semiCompatibleWallets: WalletInfo[];
  getWalletByName: (id: WalletAppId) => WalletInfo | undefined;
  getDeeplinkByWalletId: (id: WalletAppId) => Promise<string | undefined>;
}

export const usePaymentLinkWallets = (): PaymentLinkWalletsProps => {
  const { paymentIdentifier, payRequest, paymentHasQuote } = usePaymentLinkContext();


  const transferMethods = paymentHasQuote(payRequest)
    ? payRequest.transferAmounts.filter((ta) => ta.available).map((ta) => ta.method)
    : [];

  const PaymentLinkWalletsWithAvailability = useMemo(
    () =>
      PaymentLinkWallets.map((wallet) => ({
        ...wallet,
        disabled: wallet.transferMethod ? !transferMethods.includes(wallet.transferMethod) : wallet.disabled,
      })),
    [transferMethods],
  );

  const recommendedWallets = useMemo(() => {
    return PaymentLinkWalletsWithAvailability.filter((wallet) => wallet.recommended === true);
  }, [PaymentLinkWalletsWithAvailability]);

  const otherWallets = useMemo(() => {
    return PaymentLinkWalletsWithAvailability.filter((wallet) => !wallet.recommended && !wallet.semiCompatible);
  }, [PaymentLinkWalletsWithAvailability]);

  const semiCompatibleWallets = useMemo(() => {
    return PaymentLinkWalletsWithAvailability.filter((wallet) => wallet.semiCompatible);
  }, [PaymentLinkWalletsWithAvailability]);

  const getWalletByName = useCallback(
    (id: WalletAppId): WalletInfo | undefined => {
      return [...recommendedWallets, ...otherWallets, ...semiCompatibleWallets].find((wallet) => wallet.id === id);
    },
    [recommendedWallets, otherWallets, semiCompatibleWallets],
  );

  const fetchCallbackUrlForTransferMethod = async <T = any>(
    method: Blockchain | C2BPaymentMethod,
  ): Promise<T | undefined> => {
    if (!paymentHasQuote(payRequest)) return undefined;
    const transferAmount = payRequest.transferAmounts.find((ta) => ta.method === method);
    const asset = transferAmount?.assets[0].asset ?? '';
    const callbackUrl = url({
      base: payRequest.callback,
      params: new URLSearchParams({ quote: payRequest.quote.id, method: method.toString(), asset }),
    });
    return await fetchJson<T>(callbackUrl);
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

  const getDeeplinkByWalletId = async (id: WalletAppId): Promise<string | undefined> => {
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
