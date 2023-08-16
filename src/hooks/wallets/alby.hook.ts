import { useState } from 'react';
import { GetInfoResponse, SendPaymentResponse, WebLNProvider } from 'webln';

export interface AlbyInterface {
  isInstalled: () => boolean;
  isEnabled: boolean;
  enable: () => Promise<GetInfoResponse | undefined>;
  signMessage: (msg: string) => Promise<string>;
  sendPayment: (request: string) => Promise<SendPaymentResponse>;
}

export function useAlby(): AlbyInterface {
  const [isEnabled, setIsEnabled] = useState(false);

  function webln(): WebLNProvider {
    return (window as any).webln;
  }

  function isInstalled() {
    return Boolean(webln());
  }

  function enable(): Promise<GetInfoResponse | undefined> {
    return webln()
      .enable()
      .then(() => webln().getInfo())
      .catch(() => undefined)
      .then((r) => {
        setIsEnabled(r != null);
        return r;
      });
  }

  function signMessage(msg: string): Promise<string> {
    return webln()
      .signMessage(msg)
      .then((r) => r.signature);
  }

  function sendPayment(request: string): Promise<SendPaymentResponse> {
    return webln().sendPayment(request);
  }

  return {
    isInstalled,
    isEnabled,
    enable,
    signMessage,
    sendPayment,
  };
}
