import { useEffect, useState } from 'react';
import { WalletInfo } from 'src/dto/payment-link.dto';
import { PaymentStandard } from 'src/dto/payment-link.dto';
import { fetchJson, url } from 'src/util/utils';

interface UseWalletAppsApi {
  walletApps: WalletInfo[];
  paymentStandards: Record<string, PaymentStandard>;
  isLoading: boolean;
  error: string | undefined;
}

export function useWalletAppsApi(): UseWalletAppsApi {
  const [walletApps, setWalletApps] = useState<WalletInfo[]>([]);
  const [paymentStandards, setPaymentStandards] = useState<Record<string, PaymentStandard>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [wallets, standards] = await Promise.all([
          fetchJson<WalletInfo[]>(
            url({
              base: process.env.REACT_APP_API_URL,
              path: '/v1/walletApps',
            }),
          ),
          fetchJson<PaymentStandard[]>(
            url({
              base: process.env.REACT_APP_API_URL,
              path: '/v1/paymentStandards',
            }),
          ),
        ]);

        setWalletApps(wallets);

        const standardsMap: Record<string, PaymentStandard> = {};
        standards.forEach((standard) => {
          standardsMap[standard.id] = standard;
        });
        setPaymentStandards(standardsMap);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load wallet apps');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    walletApps,
    paymentStandards,
    isLoading,
    error,
  };
}
