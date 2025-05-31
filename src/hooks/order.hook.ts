import { Asset, Blockchain, Fiat, FiatPaymentMethod, useAuthContext, useBuy, useUserContext } from '@dfx.swiss/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addressLabel } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { AssetBalance } from 'src/contexts/balance.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from './app-params.hook';
import { useBlockchain } from './blockchain.hook';
import { useTxHelper } from './tx-helper.hook';

const EMBEDDED_WALLET = 'CakeWallet';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
}

// TODO: Add Address to packages?
interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

export interface UseOrderResult {
  isBuy: boolean;
  isSell?: boolean;
  isSwap?: boolean;
  addressItems: Address[];
  cryptoBalances: AssetBalance[];
  setSelectedAddress: (address?: Address) => void;
  getAvailableCurrencies: (paymentMethod?: FiatPaymentMethod) => Fiat[];
  getAvailablePaymentMethods: (targetAsset?: Asset) => FiatPaymentMethod[];
}

export interface UseOrderOptions {
  orderType: OrderType;
  fromAssets?: Asset[] | Fiat[];
  toAssets?: Asset[] | Fiat[];
}

export function useOrder({ orderType, fromAssets, toAssets }: UseOrderOptions): UseOrderResult {
  const { currencies } = useBuy();
  const { user } = useUserContext();
  const { session } = useAuthContext();
  const { getBalances } = useTxHelper();
  const { translate } = useSettingsContext();
  const { toString: blockchainToString } = useBlockchain();
  const { isEmbedded, isDfxHosted } = useAppHandlingContext();
  const { wallet, availableBlockchains } = useAppParams();

  const [selectedAddress, setSelectedAddress] = useState<Address>();
  const [cryptoBalances, setCryptoBalances] = useState<AssetBalance[]>([]);

  const isBuy = useMemo(() => orderType === OrderType.BUY, [orderType]);
  const isSell = useMemo(() => orderType === OrderType.SELL, [orderType]);
  const isSwap = useMemo(() => orderType === OrderType.SWAP, [orderType]);

  useEffect(() => {
    let cryptoAssets = isBuy ? toAssets ?? [] : isSell ? fromAssets ?? [] : [];
    cryptoAssets ??= isSwap ? (fromAssets ?? []).concat(toAssets ?? []) : [];

    if (cryptoAssets && selectedAddress?.address) {
      getBalances(cryptoAssets as Asset[], selectedAddress.address, selectedAddress.chain).then((balances) =>
        setCryptoBalances(balances ?? []),
      );
    }
  }, [isBuy, isSell, isSwap, toAssets, fromAssets, getBalances, selectedAddress]);

  const getAvailablePaymentMethods = useCallback(
    (targetAsset?: Asset): FiatPaymentMethod[] => {
      if (!isBuy) return [];

      const pushCardPayment =
        (isDfxHosted || !isEmbedded) &&
        wallet !== EMBEDDED_WALLET &&
        user?.activeAddress?.wallet !== EMBEDDED_WALLET &&
        (!targetAsset || targetAsset.cardBuyable);

      return [FiatPaymentMethod.BANK, ...(pushCardPayment ? [FiatPaymentMethod.CARD] : [])];
    },
    [isBuy, isDfxHosted, isEmbedded, wallet, user],
  );

  const getAvailableCurrencies = useCallback(
    (paymentMethod?: FiatPaymentMethod): Fiat[] =>
      currencies?.filter((c) =>
        paymentMethod === FiatPaymentMethod.CARD
          ? c.cardSellable
          : paymentMethod === FiatPaymentMethod.INSTANT
          ? c.instantSellable
          : c.sellable,
      ) ?? [],
    [currencies],
  );

  const addressItems: Address[] = useMemo(() => {
    const cryptoAssets = (isBuy ? toAssets ?? [] : fromAssets ?? []) as Asset[];
    const blockchains = availableBlockchains?.filter((b) => cryptoAssets?.some((a) => a.blockchain === b));

    return session?.address && blockchains?.length
      ? [
          ...blockchains.map((b) => ({
            address: addressLabel(session),
            label: blockchainToString(b),
            chain: b,
          })),
          {
            address: translate('screens/buy', 'Switch address'),
            label: translate('screens/buy', 'Login with a different address'),
          },
        ]
      : [];
  }, [session, toAssets, fromAssets, orderType, availableBlockchains, translate]);

  return useMemo(
    () => ({
      isBuy, // TODO: Refactor - do we really need isBuy, isSell, isSwap, can we simplify this?
      isSell,
      isSwap,
      addressItems,
      cryptoBalances,
      setSelectedAddress,
      getAvailableCurrencies,
      getAvailablePaymentMethods,
    }),
    [orderType, addressItems, cryptoBalances, setSelectedAddress, getAvailableCurrencies, getAvailablePaymentMethods],
  );
}
