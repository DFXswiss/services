import { Blockchain, PaymentLinkMode } from '@dfx.swiss/react';
import { useCallback, useMemo } from 'react';
import { PaymentLinkWallets } from 'src/config/payment-link-wallets';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { C2BPaymentMethod, TransferMethod, WalletAppId, WalletCategory, WalletInfo } from 'src/dto/payment-link.dto';
import { Wallet } from 'src/util/payment-link-wallet';
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

  const getDeeplinkByCategory = async (wallet: WalletInfo) => {
    if (!paymentIdentifier) return undefined;

    if (wallet.category === WalletCategory.LIGHTNING) {
      const lightning = new URL(paymentIdentifier).searchParams.get('lightning');
      const suffix = 'lightning:';
      const prefix = wallet.deepLink !== suffix ? `${wallet.deepLink}` : '';
      return `${prefix}${suffix}${lightning}`;
    }

    return wallet.deepLink;
  };

  const hasActionDeepLink = (wallet: WalletInfo): boolean => {
    return wallet.category === WalletCategory.LIGHTNING;
  };

  const filteredPaymentLinkWallets = useMemo(() => {
    const hasQuote = paymentHasQuote(payRequest);
    const isPublicPayment = payRequest?.mode === PaymentLinkMode.PUBLIC;
    return PaymentLinkWallets.map((wallet) => {
      return {
        ...wallet,
        disabled: hasQuote && !Wallet.qualifiesForPayment(wallet, payRequest.transferAmounts),
        hasActionDeepLink: hasActionDeepLink(wallet),
      };
    }).filter((wallet) => (isPublicPayment ? wallet.deepLink : true));
  }, [payRequest]);

  const recommendedWallets = useMemo(() => {
    return filteredPaymentLinkWallets.filter((wallet) => wallet.recommended === true);
  }, [filteredPaymentLinkWallets]);

  const otherWallets = useMemo(() => {
    return filteredPaymentLinkWallets.filter((wallet) => !wallet.recommended && !wallet.semiCompatible);
  }, [filteredPaymentLinkWallets]);

  const semiCompatibleWallets = useMemo(() => {
    return filteredPaymentLinkWallets.filter((wallet) => wallet.semiCompatible);
  }, [filteredPaymentLinkWallets]);

  const getWalletByName = useCallback(
    (id: WalletAppId): WalletInfo | undefined => {
      return [...recommendedWallets, ...otherWallets, ...semiCompatibleWallets].find((wallet) => wallet.id === id);
    },
    [recommendedWallets, otherWallets, semiCompatibleWallets],
  );

  const fetchCallbackUrlForTransferMethod = async <T = any>(method: TransferMethod): Promise<T | undefined> => {
    if (!paymentHasQuote(payRequest)) return undefined;
    const transferAmount = payRequest.transferAmounts.find((ta) => ta.method === method);
    const asset = transferAmount?.assets[0].asset ?? '';
    const callbackUrl = url({
      base: payRequest.callback,
      params: new URLSearchParams({ quote: payRequest.quote.id, method: method.toString(), asset }),
    });
    return await fetchJson<T>(callbackUrl);
  };

  const getDeeplinkByWalletId = async (id: WalletAppId): Promise<string | undefined> => {
    const wallet = getWalletByName(id);
    if (!wallet || !paymentIdentifier) return undefined;

    switch (wallet.id) {
      case WalletAppId.MUUN:
        const { pr } = (await fetchCallbackUrlForTransferMethod<{ pr: string }>(Blockchain.LIGHTNING)) ?? {};
        return `${wallet.deepLink}${pr}`;

      case WalletAppId.BINANCE:
        const { uri } = (await fetchCallbackUrlForTransferMethod<{ uri: string }>(C2BPaymentMethod.BINANCE_PAY)) ?? {};
        return uri;

      default:
        return getDeeplinkByCategory(wallet);
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
