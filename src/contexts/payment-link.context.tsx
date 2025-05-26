import {
  AssetType,
  Blockchain,
  PaymentLinkPaymentStatus,
  PaymentStandardType,
  TransferMethod,
  useApi,
  useAssetContext,
} from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { addMinutes } from 'date-fns';
import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaymentLinkWallets, PaymentStandards } from 'src/config/payment-link-wallets';
import { CloseType, useAppHandlingContext } from 'src/contexts/app-handling.context';
import { AssetBalance } from 'src/contexts/balance.context';
import {
  Amount,
  C2BPaymentMethod,
  ExtendedPaymentLinkStatus,
  MetaMaskInfo,
  NoPaymentLinkPaymentStatus,
  PaymentLinkPayRequest,
  PaymentLinkPayTerminal,
  PaymentStandard,
  PaymentStatus,
  WalletInfo,
} from 'src/dto/payment-link.dto';
import { EvmUri } from 'src/util/evm-uri';
import { Lnurl } from 'src/util/lnurl';
import { fetchJson, url } from 'src/util/utils';
import { useAppParams } from '../hooks/app-params.hook';
import { Timer, useCountdown } from '../hooks/countdown.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useSessionStore } from '../hooks/session-store.hook';
import { useMetaMask, WalletType } from '../hooks/wallets/metamask.hook';

interface PaymentLinkInterface {
  error: string | undefined;
  merchant: string | undefined;
  payRequest: PaymentLinkPayRequest | PaymentLinkPayTerminal | undefined;
  timer: Timer;
  paymentLinkApiUrl: MutableRefObject<string>;
  callbackUrl: MutableRefObject<string | undefined>;
  paymentStandards: PaymentStandard[] | undefined;
  paymentIdentifier: string | undefined;
  isLoadingPaymentIdentifier: boolean;
  paymentStatus: ExtendedPaymentLinkStatus;
  isLoadingMetaMask: boolean;
  metaMaskInfo: MetaMaskInfo | undefined;
  metaMaskError: string | undefined;
  isMetaMaskPaying: boolean;
  recommendedWallets: WalletInfo[];
  otherWallets: WalletInfo[];
  semiCompatibleWallets: WalletInfo[];
  getWalletByName: (id: string) => WalletInfo | undefined;
  paymentHasQuote: (request?: PaymentLinkPayTerminal | PaymentLinkPayRequest) => request is PaymentLinkPayRequest;
  setPaymentIdentifier: (id: string | undefined) => void;
  setSessionApiUrl: (url: string) => void;
  fetchPayRequest: (url: string, isRefetch?: boolean) => Promise<number | undefined>;
  fetchPaymentIdentifier: (
    payRequest: PaymentLinkPayTerminal | PaymentLinkPayRequest,
    selectedPaymentMethod?: Blockchain,
    selectedAsset?: string,
  ) => Promise<void>;
  payWithMetaMask: () => Promise<void>;
  getDeeplinkByWalletId: (id: string) => Promise<string | undefined>;
}

const PaymentLinkContext = createContext<PaymentLinkInterface>(undefined as any);

export function usePaymentLinkContext(): PaymentLinkInterface {
  return useContext(PaymentLinkContext);
}

export function PaymentLinkProvider(props: PropsWithChildren): JSX.Element {
  const { call } = useApi();
  const { navigate } = useNavigation();
  const { assets } = useAssetContext();
  const { timer, startTimer } = useCountdown();
  const { closeServices } = useAppHandlingContext();
  const { paymentLinkApiUrlStore } = useSessionStore();
  const { lightning, redirectUri, setParams } = useAppParams();

  const { isInstalled, getWalletType, requestAccount, requestBlockchain, createTransaction, readBalance } =
    useMetaMask();

  const [error, setError] = useState<string>();
  const [merchant, setMerchant] = useState<string>();
  const [urlParams, setUrlParams] = useSearchParams();
  const [paymentStandards, setPaymentStandards] = useState<PaymentStandard[]>();
  const [payRequest, setPayRequest] = useState<PaymentLinkPayTerminal | PaymentLinkPayRequest>();
  const [paymentStatus, setPaymentStatus] = useState<ExtendedPaymentLinkStatus>(PaymentLinkPaymentStatus.PENDING);

  const [paymentIdentifier, setPaymentIdentifier] = useState<string>();
  const [isLoadingPaymentIdentifier, setIsLoadingPaymentIdentifier] = useState(false);

  const [isLoadingMetaMask, setIsLoadingMetaMask] = useState(false);
  const [metaMaskInfo, setMetaMaskInfo] = useState<MetaMaskInfo>();
  const [isMetaMaskPaying, setIsMetaMaskPaying] = useState(false);
  const [metaMaskError, setMetaMaskError] = useState<string>();

  const refetchTimeout = useRef<NodeJS.Timeout>();
  const sessionApiUrl = useRef<string>(paymentLinkApiUrlStore.get() ?? '');

  const callbackUrl = useRef<string>();

  const setSessionApiUrl = (newUrl: string) => {
    sessionApiUrl.current = newUrl;
    paymentLinkApiUrlStore.set(newUrl);
  };

  // Handle URL parameters
  useEffect(() => {
    const lightningUrlParam = lightning;
    const merchantUrlParam = urlParams.get('merchant');

    if (merchantUrlParam) {
      setMerchant(merchantUrlParam);
      return;
    }

    let apiUrl: string | undefined;
    if (lightningUrlParam) {
      apiUrl = Lnurl.decode(lightningUrlParam);
      setParams({ lightning: undefined });
    } else if (urlParams.size) {
      apiUrl = `${process.env.REACT_APP_API_URL}/v1/paymentLink/payment?${urlParams.toString()}`;
      setUrlParams(new URLSearchParams());
    }

    if (apiUrl) {
      setSessionApiUrl(apiUrl);
    } else if (!sessionApiUrl.current) {
      navigate('/', { replace: true });
    }

    fetchPayRequest(sessionApiUrl.current);

    return () => {
      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
    };
  }, []);

  // MetaMask in-app browser
  useEffect(() => {
    if (hasQuote(payRequest) && isInstalled() && getWalletType() === WalletType.IN_APP_BROWSER) {
      loadMetaMaskInfo();
    } else {
      setMetaMaskInfo(undefined);
    }
  }, [payRequest, isInstalled, getWalletType]);

  async function fetchPayRequest(url: string, isRefetch = false): Promise<number | undefined> {
    setError(undefined);
    let refetchDelay: number | undefined;

    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('timeout', isRefetch ? '10' : '0');

      const payRequest = await fetchJson(urlObj);
      if (sessionApiUrl.current !== url) return undefined;

      setPayRequest(payRequest);

      if (hasQuote(payRequest)) {
        setPaymentStatus(PaymentLinkPaymentStatus.PENDING);

        setPaymentStandardSelection(payRequest);
        awaitPayment(payRequest.quote.payment)
          .then((response) => {
            if (response.status !== PaymentLinkPaymentStatus.PENDING) {
              setPaymentStatus(response.status);
              if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
              if (response.status === PaymentLinkPaymentStatus.COMPLETED && redirectUri) {
                closeServices({ type: CloseType.PAYMENT }, false);
              }
            }
          })
          .catch(() => {
            fetchPayRequest(url);
          });
        refetchDelay = new Date(payRequest.quote.expiration).getTime() - Date.now();
        startTimer(new Date(payRequest.quote.expiration));
      } else if (payRequest.message.toLowerCase().includes('payment complete')) {
        setPaymentStatus(PaymentLinkPaymentStatus.COMPLETED);
        return;
      } else {
        setPaymentStatus(NoPaymentLinkPaymentStatus.NO_PAYMENT);
        refetchDelay = 100;
      }

      if (refetchTimeout.current) clearTimeout(refetchTimeout.current);
      refetchTimeout.current = setTimeout(() => fetchPayRequest(url, true), refetchDelay);
    } catch (error: any) {
      setError(error.message ?? 'Unknown Error');
    }
  }

  function setPaymentStandardSelection(data: PaymentLinkPayRequest | PaymentLinkPayTerminal) {
    if (!hasQuote(data) || paymentStandards) return;

    const possibleStandards: PaymentStandard[] = data.possibleStandards.flatMap((type: PaymentStandardType) => {
      const paymentStandard = PaymentStandards[type];

      if (type !== PaymentStandardType.PAY_TO_ADDRESS) {
        return paymentStandard;
      } else {
        return data.transferAmounts
          .filter((ta) => ta.method !== 'Lightning')
          .filter((ta) => ta.available !== false)
          .map((ta) => {
            return { ...paymentStandard, blockchain: ta.method };
          });
      }
    });

    setPaymentStandards(possibleStandards);
  }

  async function awaitPayment(id: string): Promise<PaymentStatus> {
    return call<PaymentStatus>({
      url: `lnurlp/wait/${id}`,
      method: 'GET',
    });
  }

  function hasQuote(request?: PaymentLinkPayTerminal | PaymentLinkPayRequest): request is PaymentLinkPayRequest {
    return !!request && 'quote' in request;
  }

  async function invokeCallback(_callbackUrl: string): Promise<string | undefined> {
    if (callbackUrl.current === _callbackUrl) return;
    callbackUrl.current = _callbackUrl;

    setIsLoadingPaymentIdentifier(true);
    setPaymentIdentifier(undefined);
    return fetchJson(_callbackUrl)
      .then((response) => {
        if (response && response.statusCode !== 409 && _callbackUrl === callbackUrl.current) {
          const identifier = response.uri ?? response.pr;
          setPaymentIdentifier(identifier);
          return identifier;
        }
      })
      .catch((error) => {
        setError(error.message);
        setPaymentIdentifier(undefined);
      })
      .finally(() => setIsLoadingPaymentIdentifier(false));
  }

  async function fetchPaymentIdentifier(
    payRequest: PaymentLinkPayTerminal | PaymentLinkPayRequest,
    selectedPaymentMethod?: Blockchain,
    selectedAsset?: string,
  ): Promise<void> {
    if (
      !hasQuote(payRequest) ||
      (payRequest.standard === PaymentStandardType.PAY_TO_ADDRESS && !(selectedPaymentMethod && selectedAsset))
    ) {
      return;
    }

    switch (payRequest.standard) {
      case PaymentStandardType.OPEN_CRYPTO_PAY:
        callbackUrl.current = payRequest.callback;
        setPaymentIdentifier(Lnurl.prependLnurl(Lnurl.encode(simplifyPaymentLinkUrl(sessionApiUrl.current))));
        break;
      case PaymentStandardType.LIGHTNING_BOLT11:
        invokeCallback(
          url({
            base: payRequest.callback,
            params: new URLSearchParams({ quote: payRequest.quote.id, amount: payRequest.minSendable.toString() }),
          }),
        );
        break;
      case PaymentStandardType.PAY_TO_ADDRESS:
        invokeCallback(
          url({
            base: payRequest.callback,
            params: new URLSearchParams({
              quote: payRequest.quote.id,
              method: selectedPaymentMethod ?? '',
              asset: selectedAsset ?? '',
            }),
          }),
        );
        break;
    }
  }

  function simplifyPaymentLinkUrl(url: string): string {
    const replacementMap: { [key: string]: string } = {
      '/v1/paymentLink/payment': '/v1/plp',
      routeId: 'r',
      externalId: 'e',
      message: 'm',
      amount: 'a',
      currency: 'c',
      expiryDate: 'd',
    };

    const urlObj = new URL(url);
    const newPath = replacementMap[urlObj.pathname] || urlObj.pathname;
    const newParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      const shortKey = replacementMap[key] || key;
      newParams.append(shortKey, value);
    });

    return `${urlObj.origin}${newPath}?${newParams.toString()}`;
  }

  // --- META MASK IN-APP BROWSER --- //
  async function loadMetaMaskInfo() {
    if (!hasQuote(payRequest)) return;

    setIsLoadingMetaMask(true);

    try {
      const address = await requestAccount();
      const blockchain = await requestBlockchain();
      if (!address || !blockchain) throw new Error('Failed to get account');

      const hasShortExpiration = new Date(payRequest.quote.expiration) < addMinutes(new Date(), 1);

      const matchingTransferAmount = payRequest.transferAmounts.find((item) => item.method === blockchain);
      if (!matchingTransferAmount || (hasShortExpiration && blockchain === Blockchain.ETHEREUM))
        throw new Error('Selected blockchain is not supported');

      const transferAsset = await findAssetWithBalance(
        address,
        blockchain as Blockchain,
        matchingTransferAmount.assets,
      );
      if (!transferAsset)
        throw new Error('InApp Browser Payment is not yet activated. This function is still under development.');

      setMetaMaskInfo({
        accountAddress: address,
        transferAsset: transferAsset.asset,
        transferAmount: transferAsset.amount,
        minFee: matchingTransferAmount.minFee,
      });
    } catch (e) {
      const error = e as Error;
      setMetaMaskError(error.message);
    } finally {
      setIsLoadingMetaMask(false);
    }
  }

  async function findAssetWithBalance(
    address: string,
    blockchain: Blockchain,
    transferAmounts: Amount[],
  ): Promise<AssetBalance | undefined> {
    transferAmounts.sort((a, b) => (a.asset === 'dEURO' ? -1 : b.asset === 'dEURO' ? 1 : 0));

    for (const transferAmount of transferAmounts) {
      const asset = assets.get(blockchain)?.find((a) => a.name === transferAmount.asset);
      if (!asset) continue;

      const balance = await readBalance(asset, address, true);
      if (balance.amount >= transferAmount.amount) return { asset: asset, amount: transferAmount.amount };
    }
  }

  async function payWithMetaMask() {
    if (!hasQuote(payRequest) || !metaMaskInfo) return;

    setIsMetaMaskPaying(true);

    try {
      const asset = metaMaskInfo.transferAsset;

      const paymentUri = await invokeCallback(
        url({
          base: payRequest.callback,
          params: new URLSearchParams({
            quote: payRequest.quote.id,
            method: asset.blockchain,
            asset: asset.name,
          }),
        }),
      );
      if (!paymentUri) throw new Error('Failed to get payment information');

      const paymentData = EvmUri.decode(paymentUri);

      const address = asset.type === AssetType.COIN ? paymentData?.address : paymentData?.tokenContractAddress;
      const amount = paymentData?.amount;
      if (!address || !amount) throw new Error('Failed to get payment information');

      const tx = await createTransaction(new BigNumber(amount), asset, metaMaskInfo.accountAddress, address, {
        isWeiAmount: true,
        gasPrice: metaMaskInfo.minFee,
      });
      await fetchJson(
        url({
          base: payRequest.callback.replace('/cb', '/tx'),
          params: new URLSearchParams({ quote: payRequest.quote.id, method: asset.blockchain, tx }),
        }),
      );
    } catch (e) {
      const error = e as Error;
      setMetaMaskError(error.message);
    } finally {
      setIsMetaMaskPaying(false);
    }
  }

  const recommendedWallets = useMemo(() => {
    return PaymentLinkWallets.filter((wallet) => wallet.recommended === true);
  }, []);

  const otherWallets = useMemo(() => {
    return PaymentLinkWallets.filter((wallet) => !wallet.recommended && !wallet.semiCompatible);
  }, []);

  const semiCompatibleWallets = useMemo(() => {
    const allSemiCompatibles = PaymentLinkWallets.filter((wallet) => wallet.semiCompatible);
    const transferMethods = hasQuote(payRequest)
      ? payRequest.transferAmounts.filter((ta) => ta.available).map((ta) => ta.method)
      : [];

    return allSemiCompatibles.map((wallet) => ({
      ...wallet,
      disabled: !transferMethods.includes(wallet.transferMethod as TransferMethod),
    }));
  }, [payRequest]);

  const getWalletByName = useCallback(
    (id: string): WalletInfo | undefined => {
      return [...recommendedWallets, ...otherWallets, ...semiCompatibleWallets].find((wallet) => wallet.id === id);
    },
    [recommendedWallets, otherWallets, semiCompatibleWallets],
  );

  const fetchCallbackUrlForWallet = async (method: Blockchain | C2BPaymentMethod) => {
    if (!hasQuote(payRequest)) return undefined;
    const transferAmount = payRequest.transferAmounts.find((ta) => ta.method === method);
    const asset = transferAmount?.assets[0].asset;
    const url = `${payRequest.callback}?quote=${payRequest.quote.id}&method=${method}&asset=${asset}`;
    return await fetchJson<{ uri: string }>(url);
  };

  const getDeeplinkByWalletId = async (id: string) => {
    if (!paymentIdentifier) return undefined;
    const wallet = getWalletByName(id);
    if (!wallet) return undefined;

    switch (wallet.transferMethod) {
      case C2BPaymentMethod.BINANCE_PAY:
        const { uri } = (await fetchCallbackUrlForWallet(C2BPaymentMethod.BINANCE_PAY)) ?? {};
        return uri;

      case Blockchain.LIGHTNING:
        const lightning = new URL(paymentIdentifier).searchParams.get('lightning');
        const suffix = 'lightning:';
        const prefix = wallet.deepLink !== suffix ? `${wallet.deepLink}` : '';
        return `${prefix}${suffix}${lightning}`;

      default:
        return wallet.deepLink;
    }
  };

  const context = useMemo(
    () => ({
      error,
      merchant,
      payRequest,
      timer,
      paymentLinkApiUrl: sessionApiUrl,
      callbackUrl,
      paymentStandards,
      paymentIdentifier,
      isLoadingPaymentIdentifier,
      paymentStatus,
      isLoadingMetaMask,
      metaMaskInfo,
      metaMaskError,
      isMetaMaskPaying,
      recommendedWallets,
      otherWallets,
      semiCompatibleWallets,
      getWalletByName,
      paymentHasQuote: hasQuote,
      setPaymentIdentifier,
      setSessionApiUrl,
      fetchPayRequest,
      fetchPaymentIdentifier,
      payWithMetaMask,
      getDeeplinkByWalletId,
    }),
    [
      error,
      merchant,
      payRequest,
      timer,
      paymentStandards,
      paymentIdentifier,
      isLoadingPaymentIdentifier,
      paymentStatus,
      isLoadingMetaMask,
      metaMaskInfo,
      metaMaskError,
      isMetaMaskPaying,
      recommendedWallets,
      otherWallets,
      semiCompatibleWallets,
      getWalletByName,
    ],
  );

  return <PaymentLinkContext.Provider value={context}>{props.children}</PaymentLinkContext.Provider>;
}
