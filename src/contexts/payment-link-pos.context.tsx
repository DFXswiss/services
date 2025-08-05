import { ApiError, PaymentLink, PaymentLinkPaymentStatus, useApi } from '@dfx.swiss/react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExtendedPaymentLinkStatus,
  NoPaymentLinkPaymentStatus,
  PaymentLinkHistoryPayment,
  PaymentLinkHistoryResponse,
  PaymentLinkPayRequest,
} from 'src/dto/payment-link.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useSessionStore } from 'src/hooks/session-store.hook';
import { Lnurl } from 'src/util/lnurl';
import { fetchJson } from 'src/util/utils';

interface PaymentPosContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  paymentStatus: ExtendedPaymentLinkStatus | undefined;
  payRequest: PaymentLinkPayRequest | undefined;
  paymentLinkApiUrl: string | undefined;
  error: string | undefined;
  fetchTransactionHistory: () => Promise<PaymentLinkHistoryPayment[] | undefined>;
  createPayment: (data: { amount: number }) => Promise<void>;
  cancelPayment: () => Promise<unknown>;
  checkAuthentication: (key: string) => Promise<any>;
}

export const PaymentPosContext = createContext<PaymentPosContextType>(undefined as any);

export function usePaymentPosContext() {
  return useContext(PaymentPosContext);
}

export default function PaymentLinkPosContext({ children }: { children: React.ReactNode }): JSX.Element {
  const { lightning, isInitialized: isParamsInitialized } = useAppParams();
  const { posAuthKey } = useSessionStore();
  const { call } = useApi();

  const [payRequest, setPayRequest] = useState<PaymentLinkPayRequest>();
  const [paymentStatus, setPaymentStatus] = useState<ExtendedPaymentLinkStatus>();
  const [apiUrl, setApiUrl] = useState<string>();
  const [urlParams, setUrlParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const [key, setKey] = useState<string>(urlParams.get('key') ?? posAuthKey.get() ?? '');
  const setAuthKey = (newKey?: string) => {
    newKey ? posAuthKey.set(newKey) : posAuthKey.remove();
    setKey(newKey ?? '');
  };

  const fetchPayRequest = async (url: string) => {
    const api = new URL(url);
    api.searchParams.set('timeout', '0');
    const response = await fetchJson(api.toString());
    setPayRequest(response);

    const newStatus =
      response.statusCode === 404 ? NoPaymentLinkPaymentStatus.NO_PAYMENT : PaymentLinkPaymentStatus.PENDING;
    setPaymentStatus(newStatus);
  };

  const unauthorizedResponse = (e: ApiError) => {
    if (e.statusCode === 401) setIsAuthenticated(false);
    throw e;
  };

  const checkIsPendingPayment = async () => {
    if (!key || !payRequest) return;

    const params = new URLSearchParams({
      externalLinkId: payRequest.externalId as string,
      status: PaymentLinkPaymentStatus.PENDING,
      key: key,
    });

    const history = await call<PaymentLinkHistoryResponse[]>({
      url: `paymentLink/history?${params.toString()}`,
      method: 'GET',
    }).catch(unauthorizedResponse);

    return history?.[0]?.payments?.[0]?.externalId;
  };

  const fetchWait = async (): Promise<void> => {
    const externalPaymentId = await checkIsPendingPayment();
    if (!externalPaymentId) return setPaymentStatus(NoPaymentLinkPaymentStatus.NO_PAYMENT);

    const params = new URLSearchParams({
      externalPaymentId,
      key,
    });

    return call<{ payment: { status: PaymentLinkPaymentStatus } }>({
      url: `paymentLink/payment/wait?${params.toString()}`,
      method: 'GET',
    })
      .then(({ payment }) => setPaymentStatus(payment.status))
      .catch(unauthorizedResponse)
      .catch(fetchWait);
  };

  const createPayment = useCallback(
    async (data: { amount: number }) => {
      if (!key || !payRequest) return;

      const params = new URLSearchParams({
        externalLinkId: payRequest.externalId as string,
        key: key,
      });

      return call<PaymentLink>({
        url: `paymentLink/payment?${params.toString()}`,
        method: 'POST',
        data: {
          amount: +data.amount,
          externalId: Math.random().toString(36).substring(2, 15),
        },
      })
        .then(() => {
          fetchPayRequest(apiUrl as string);
          fetchWait();
        })
        .catch(unauthorizedResponse);
    },
    [apiUrl, key, payRequest, call, fetchPayRequest, fetchWait],
  );

  const cancelPayment = async () => {
    if (!key || !payRequest) return;

    const params = new URLSearchParams({
      externalLinkId: payRequest.externalId as string,
      key: key,
    });

    return call({
      url: `paymentLink/payment?${params.toString()}`,
      method: 'DELETE',
    })
      .then(() => fetchPayRequest(apiUrl as string))
      .catch(unauthorizedResponse);
  };

  const fetchTransactionHistory = useCallback(async () => {
    if (!key || !payRequest) return;

    const params = new URLSearchParams({
      externalLinkId: payRequest.externalId as string,
      status: [
        PaymentLinkPaymentStatus.PENDING,
        PaymentLinkPaymentStatus.COMPLETED,
        PaymentLinkPaymentStatus.CANCELLED,
        PaymentLinkPaymentStatus.EXPIRED,
      ].join(','),
      key: key,
    });

    return call<PaymentLinkHistoryResponse[]>({
      url: `paymentLink/history?${params.toString()}`,
      method: 'GET',
    })
      .then((response) => {
        return response.length
          ? response[0].payments?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          : [];
      })
      .catch(unauthorizedResponse);
  }, [key, payRequest, call]);

  const checkAuthentication = useCallback(
    async (key: string) => {
      const params = new URLSearchParams({
        externalLinkId: payRequest?.externalId as string,
        key: key,
      });

      return call<PaymentLinkHistoryResponse[]>({
        url: `paymentLink/history?${params.toString()}`,
        method: 'GET',
      }).then(() => {
        setAuthKey(key);
        setIsAuthenticated(true);
      });
    },
    [payRequest],
  );

  // Initialization
  useEffect(() => {
    if (!isParamsInitialized || !lightning) return;
    const decodedUrl = Lnurl.decode(lightning) as string;

    fetchPayRequest(decodedUrl).catch((e) => setError(e.message ?? 'Unknown Error'));
    setApiUrl(decodedUrl);

    return () => setAuthKey();
  }, [isParamsInitialized, lightning]);

  useEffect(() => {
    if (key && urlParams.get('key')) {
      setUrlParams(new URLSearchParams());
    }
  }, [key, urlParams]);

  // To track authentication status
  useEffect(() => {
    if (isAuthenticated || !payRequest || !apiUrl) return;

    if (!key) {
      setIsLoading(false);
      return;
    }

    checkAuthentication(key)
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, [checkAuthentication]);

  // To track payment status
  useEffect(() => {
    if (isAuthenticated) fetchWait();
  }, [isAuthenticated]);

  return (
    <PaymentPosContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        paymentStatus,
        payRequest: payRequest as PaymentLinkPayRequest,
        paymentLinkApiUrl: apiUrl,
        error,
        fetchTransactionHistory,
        createPayment,
        cancelPayment,
        checkAuthentication,
      }}
    >
      {children}
    </PaymentPosContext.Provider>
  );
}
