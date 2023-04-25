import { KycData, KycUrl } from '../definitions/kyc';
import { useApi } from './api.hook';

interface KycInterface {
  setKycData: (data: KycData) => Promise<void>;
}

export function useKyc(): KycInterface {
  const { call } = useApi();

  async function setKycData(data: KycData): Promise<void> {
    return call({
      url: KycUrl.setData,
      method: 'POST',
      data,
    });
  }

  return { setKycData };
}
