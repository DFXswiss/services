import { Sell, SellPaymentInfo, SellUrl } from '../definitions/sell';
import { useApi } from './api.hook';

export interface SellInterface {
  receiveFor: (info: SellPaymentInfo) => Promise<Sell>;
}

export function useSell(): SellInterface {
  const { call } = useApi();

  async function receiveFor(info: SellPaymentInfo): Promise<Sell> {
    return call<Sell>({ url: SellUrl.receive, method: 'PUT', data: info });
  }

  return { receiveFor };
}
