import { ApiError, PaymentLinkPaymentStatus, useApi } from '@dfx.swiss/react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import {
  ExtendedPaymentLinkStatus,
  PaymentLinkHistoryPayment,
  PaymentLinkHistoryResponse,
  PaymentLinkPayRequest,
} from 'src/dto/payment-link.dto';

interface PaymentPosContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  paymentStatus: ExtendedPaymentLinkStatus;
  payRequest: PaymentLinkPayRequest | undefined;
  paymentLinkApiUrl: string;
  error: string | undefined;
  fetchTransactionHistory: () => Promise<PaymentLinkHistoryPayment[] | undefined>;
  createPayment: (data: { amount: number }) => Promise<number | undefined>;
  cancelPayment: () => Promise<unknown>;
  checkAuthentication: (key: string) => Promise<any>;
}

export const PaymentPosContext = createContext<PaymentPosContextType>(undefined as any);

export function usePaymentPosContext() {
  return useContext(PaymentPosContext);
}

export default function PaymentLinkPosContext({ children }: { children: React.ReactNode }): JSX.Element {
  const { error, payRequest, paymentLinkApiUrl, paymentStatus, fetchPayRequest } = usePaymentLinkContext();
  const { call } = useApi();
  const [urlParams, setUrlParams] = useSearchParams();

  const [key, setKey] = useState<string>(urlParams.get('key') ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const createPayment = useCallback(
    async (data: { amount: number }) => {
      if (!key || !payRequest) return;

      const params = new URLSearchParams({
        externalLinkId: payRequest.externalId as string,
        key: key,
      });

      return call({
        url: `paymentLink/payment?${params.toString()}`,
        method: 'POST',
        data: {
          amount: +data.amount,
          externalId: Math.random().toString(36).substring(2, 15),
          expiryDate: new Date(Date.now() + 180 * 1000).toISOString(),
        },
      })
        .then(() => fetchPayRequest(paymentLinkApiUrl.current, true))
        .catch((error: ApiError) => {
          if (error.statusCode === 401) setIsAuthenticated(false);
          throw error;
        });
    },
    [key, payRequest, call, fetchPayRequest, paymentLinkApiUrl],
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
    }).catch((error: ApiError) => {
      if (error.statusCode === 401) setIsAuthenticated(false);
      throw error;
    });
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
      .catch((error: ApiError) => {
        if (error.statusCode === 401) setIsAuthenticated(false);
        throw error;
      });
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
        setKey(key);
        setIsAuthenticated(true);
      });
    },
    [payRequest],
  );

  useEffect(() => {
    checkAuthentication(key ?? '')
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, [checkAuthentication]);

  useEffect(() => {
    setUrlParams();
  }, [key]);

  return (
    <PaymentPosContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        paymentStatus,
        payRequest: payRequest as PaymentLinkPayRequest,
        paymentLinkApiUrl: paymentLinkApiUrl.current,
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
