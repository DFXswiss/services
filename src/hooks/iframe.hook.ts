export enum IframeMessageType {
  NAVIGATION = 'Navigation',
  CLOSE = 'Close',
}

export interface IframeMessageData {
  type: IframeMessageType;
  path?: string;
  buy?: {
    iban: string;
    bic: string;
    purpose: string;
    estimatedAmount: string;
  };
  sell?: {
    depositAddress: string;
    blockchain: string;
    estimatedAmount: number;
    paymentRequest?: string;
  };
}

interface IframeInterface {
  isUsedByIframe: boolean;
  sendMessage: (messageData: IframeMessageData) => void;
}

export function useIframe(): IframeInterface {
  const isUsedByIframe = checkIfUsedByIframe();

  function checkIfUsedByIframe() {
    const win: Window = window;
    const windowLocation = win.location;
    const parentLocation = win.parent.location;

    return windowLocation !== parentLocation;
  }

  function sendMessage(messageData: IframeMessageData) {
    const win: Window = window;

    messageData.path = messageData.path ?? win.location.pathname;

    win.parent.postMessage(JSON.stringify(messageData), '*');
  }

  return { isUsedByIframe, sendMessage };
}
