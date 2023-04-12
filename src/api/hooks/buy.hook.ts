import { Buy, BuyUrl, BuyPaymentInfo } from '../definitions/buy';
import { useApi } from './api.hook';

export interface BuyInterface {
  receiveFor: (info: BuyPaymentInfo) => Promise<Buy>;
}

export function useBuy(): BuyInterface {
  const { call } = useApi();

  async function receiveFor(info: BuyPaymentInfo): Promise<Buy> {
    return call<Buy>({ url: BuyUrl.receive, method: 'PUT', data: info });
  }

  return { receiveFor };
}
