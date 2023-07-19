export enum IframeMessageType {
  NAVIGATION = 'Navigation',
  CLOSE = 'Close',
}

interface IframeInterface {
  checkIfUsedByIframe: () => boolean;
  sendMessage: (messageType: IframeMessageType) => void;
}

export function useIframe(): IframeInterface {
  function checkIfUsedByIframe() {
    const win: Window = window;
    const windowLocation = win.location;
    const parentLocation = win.parent.location;

    return windowLocation !== parentLocation;
  }

  function sendMessage(messageType: IframeMessageType) {
    const win: Window = window;

    const messageData = {
      type: messageType,
      data: {
        path: win.location.pathname,
      },
    };

    win.parent.postMessage(JSON.stringify(messageData), '*');
  }

  return { checkIfUsedByIframe, sendMessage };
}
