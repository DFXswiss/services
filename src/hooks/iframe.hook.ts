interface IframeInterface {
  isUsedByIframe: boolean;
  sendMessage: (messageData: any) => void;
}

export function useIframe(): IframeInterface {
  const isUsedByIframe = checkIfUsedByIframe();

  function checkIfUsedByIframe() {
    const win: Window = window;
    const windowLocation = win.location;
    const parentLocation = win.parent.location;

    return windowLocation !== parentLocation;
  }

  function sendMessage(messageData: any) {
    const win: Window = window;

    messageData.path = messageData.path ?? win.location.pathname;

    win.parent.postMessage(JSON.stringify(messageData), '*');
  }

  return { isUsedByIframe, sendMessage };
}
